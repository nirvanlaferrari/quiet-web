const crypto=require("node:crypto");
const {fetchSafely,normalizeFeedUrl}=require("../server.js");
const guards=require("../recommendation-guards.cjs");
const {createStore}=require("../lib/supabase-state.cjs");
const store=createStore();const limits=new Map();
function feed(value){const result=normalizeFeedUrl(value);const url=new URL(result);if(!/^https?:$/.test(url.protocol)||url.username||url.password||result.length>2048)throw Error("Enter a public feed URL.");return result;}
async function body(req){if(req.body){const data=typeof req.body==="string"?JSON.parse(req.body):req.body;if(JSON.stringify(data).length>20000)throw Error("Request too large.");return data;}let text="";for await(const part of req){text+=part;if(text.length>20000)throw Error("Request too large.");}return JSON.parse(text||"{}");}
module.exports=async(req,res)=>{
  const send=(status,data)=>{res.statusCode=status;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(data));};
  try{
    const host=req.headers.host;const url=new URL(req.url,"https://"+host);const route=(url.searchParams.get("route")||url.pathname.replace(/^\/api\//,"")).replace(/^\//,"");
    if(!["GET","POST"].includes(req.method))return send(405,{error:"Method not allowed."});
    if(req.method==="POST"&&req.headers.origin&&new URL(req.headers.origin).host!==host)return send(403,{error:"Cross-site changes are not allowed."});
    const now=Date.now();for(const [key,row]of limits)if(now-row.start>60000)limits.delete(key);
    const ip=String(req.headers["x-forwarded-for"]||req.socket?.remoteAddress||"unknown");const row=limits.get(ip)||{start:now,count:0};row.count++;limits.set(ip,row);if(row.count>100)return send(429,{error:"Too many requests. Please wait a minute."});
    if(route==="fetch"){if(req.method!=="GET")return send(405,{error:"Method not allowed."});return send(200,await fetchSafely(url.searchParams.get("url")||""));}
    const data=req.method==="POST"?await body(req):{};
    if(route==="views"){
      const name=feed(req.method==="POST"?data.feed:url.searchParams.get("feed"));const key="views:"+crypto.createHash("sha256").update(name).digest("hex");
      const count=req.method==="POST"?await store.update(key,state=>{state.count=(state.count||0)+1;return state.count;}):(await store.read(key)).body.count||0;
      return send(200,{feed:name,count});
    }
    if(route==="read-next"){
      if(req.method==="POST"){
        const token=guards.contributor(data.contributor),from=feed(data.from),to=feed(data.to);
        if(from!==to)await store.update("read-next",state=>{guards.budget(state,token);guards.record(state,"next",from,to,token);});
        return send(200,{ok:true});
      }
      const from=feed(url.searchParams.get("from"));const state=(await store.read("read-next")).body;
      return send(200,{suggestions:guards.ranked(state,"next",[from],[from]).map(row=>({url:row.url,name:new URL(row.url).hostname}))});
    }
    if(route==="discovery/submit"){
      if(req.method!=="POST")return send(405,{error:"Method not allowed."});
      if(!Array.isArray(data.feeds)||!data.feeds.length||data.feeds.length>30)throw Error("Submit 1–30 feeds.");
      const token=guards.contributor(data.contributor),feeds=[...new Set(data.feeds.map(feed))],weight=guards.batchWeight(data.feeds,feeds);
      const rows=await store.update("discovery",state=>{guards.budget(state,token);for(const a of feeds)for(const b of feeds)guards.record(state,"pair",a,b,token,weight);return guards.ranked(state,"pair",feeds,feeds);});
      return send(200,{recommendations:rows.map((row,index)=>({url:row.url,name:new URL(row.url).hostname,category:"Independent web",provenance:"aggregate",reason:`Supported by ${row.distinct} distinct browser contributions for a shared-feed pairing.`,description:"Suggested from deduplicated shared subscriptions.",color:["#d6ff58","#b9c8ff","#f9b89e","#e9c4ff"][index%4]}))});
    }
    return send(404,{error:"Unknown endpoint."});
  }catch(error){return send(400,{error:error.message||"Request failed."});}
};
