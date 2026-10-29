const crypto=require("node:crypto");
const {fetchSafely,normalizeFeedUrl,validateRemoteUrl}=require("../server.js");
const security=require("../lib/discovery-security.cjs");
const guards=require("../recommendation-guards.cjs");
const demo=require("../lib/sample-discovery.cjs");
const {createStore}=require("../lib/supabase-state.cjs");
const store=createStore();const limits=new Map();
function feed(value){const result=normalizeFeedUrl(value);const url=new URL(result);if(!/^https?:$/.test(url.protocol)||url.username||url.password||result.length>2048||(url.port&&!['80','443'].includes(url.port)))throw Error("Enter a public feed URL.");url.protocol="https:";url.port="";if(/^\/(feed(?:\/atom)?|rss(?:\.xml)?|atom\.xml|feed\.xml|index\.xml)\/?$/i.test(url.pathname))url.pathname="/";url.searchParams.sort();return url.toString();}
async function validFeed(value){const canonical=feed(value);await validateRemoteUrl(canonical);return canonical;}
const consume=token=>security.consume(token,fn=>store.update("single-use-tokens",fn));
async function recommendationsFor(state,followed=[]){const ranked=guards.ranked(state,"pair",followed,followed);if(ranked.length)return cards(ranked);const sample=(await store.read("discovery-demo-v1")).body;return demo.cards(guards.ranked(sample,"pair",followed,followed));}
function cards(rows){return rows.map((row,index)=>({url:row.url,name:new URL(row.url).hostname,category:"Independent web",provenance:"aggregate",reason:`Supported by ${row.distinct} accepted anonymous batches; ranked using popularity and shared subscriptions.`,description:"Suggested from anonymous subscription batches.",color:["#d6ff58","#b9c8ff","#f9b89e","#e9c4ff"][index%4]}));}
async function body(req){if(req.body){const data=typeof req.body==="string"?JSON.parse(req.body):req.body;if(JSON.stringify(data).length>20000)throw Error("Request too large.");return data;}let text="";for await(const part of req){text+=part;if(text.length>20000)throw Error("Request too large.");}return JSON.parse(text||"{}");}
module.exports=async(req,res)=>{
  const send=(status,data)=>{res.statusCode=status;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(data));};
  try{
    const host=req.headers.host;const url=new URL(req.url,"https://"+host);const route=(url.searchParams.get("route")||url.pathname.replace(/^\/api\//,"")).replace(/^\//,"");
    if(!["GET","POST"].includes(req.method))return send(405,{error:"Method not allowed."});
    if(req.method==="POST"&&req.headers.origin&&new URL(req.headers.origin).host!==host)return send(403,{error:"Cross-site changes are not allowed."});
    const now=Date.now();for(const [key,row]of limits)if(now-row.start>60000)limits.delete(key);
    const ip=security.ipKey(String(req.headers["x-forwarded-for"]||req.socket?.remoteAddress||"unknown"));const row=limits.get(ip)||{start:now,count:0};row.count++;limits.set(ip,row);if(row.count>100)return send(429,{error:"Too many requests. Please wait a minute."});
    if(route==="discovery/token"){if(req.method!=="GET")return send(405,{error:"Method not allowed."});return send(200,{token:security.issue(),expiresIn:300});}
    if(route==="discovery/popular"){if(req.method!=="GET")return send(405,{error:"Method not allowed."});const state=(await store.read("discovery-v2")).body;return send(200,{feeds:await recommendationsFor(state)});}
    if(route==="fetch"){
      if(req.method!=="GET")return send(405,{error:"Method not allowed."});
      const result=await fetchSafely(url.searchParams.get("url")||"");
      if(url.searchParams.get("raw")==="1"){
        res.statusCode=200;res.setHeader("Content-Type","text/plain; charset=utf-8");res.setHeader("Cache-Control","no-store");res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("X-Quiet-Web-URL",encodeURIComponent(result.url));res.setHeader("X-Quiet-Web-Type",encodeURIComponent(result.contentType));return res.end(result.body);
      }
      return send(200,result);
    }
    const data=req.method==="POST"?await body(req):{};
    if(route==="views"){
      const name=feed(req.method==="POST"?data.feed:url.searchParams.get("feed"));const key="views:"+crypto.createHash("sha256").update(name).digest("hex");
      const count=req.method==="POST"?await store.update(key,state=>{state.count=(state.count||0)+1;return state.count;}):(await store.read(key)).body.count||0;
      return send(200,{feed:name,count});
    }
    if(route==="read-next"){
      if(req.method==="POST"){
        const from=await validFeed(data.from),to=await validFeed(data.to),token=await consume(data.token);
        if(from!==to)await store.update("read-next-v2",state=>{guards.record(state,"next",from,to,token);});
        return send(200,{ok:true});
      }
      const from=await validFeed(url.searchParams.get("from"));const state=(await store.read("read-next-v2")).body;
      return send(200,{suggestions:guards.ranked(state,"next",[from],[from]).map(row=>({url:row.url,name:new URL(row.url).hostname}))});
    }
    if(route==="discovery/submit"||route==="discovery/recommendations"){
      if(req.method!=="POST")return send(405,{error:"Method not allowed."});
      if(!Array.isArray(data.feeds)||!data.feeds.length||data.feeds.length>30)throw Error("Submit 1–30 feeds.");
      const feeds=[...new Set(await Promise.all(data.feeds.map(validFeed)))],weight=guards.batchWeight(data.feeds,feeds);
      if(route==="discovery/recommendations")return send(200,{recommendations:await recommendationsFor((await store.read("discovery-v2")).body,feeds)});
      const token=await consume(data.token);
      const rows=await store.update("discovery-v2",state=>{state.popularity||={};for(const a of feeds){const item=state.popularity[a]||={count:0,weight:0};item.count++;item.weight+=weight;for(const b of feeds)guards.record(state,"pair",a,b,token,weight);}return guards.ranked(state,"pair",feeds,feeds);});
      return send(200,{recommendations:rows.length?cards(rows):await recommendationsFor({},feeds)});
    }
    return send(404,{error:"Unknown endpoint."});
  }catch(error){return send(400,{error:error.message||"Request failed."});}
};
