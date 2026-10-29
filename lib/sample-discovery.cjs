const crypto=require("node:crypto"),guards=require("../recommendation-guards.cjs"),seeds=require("../samples/seed-blogs.json");
function identity(value){const url=new URL(value);url.protocol="https:";url.hostname=url.hostname.replace(/^www\./,"");url.hash="";if(/^\/(feed(?:\/atom)?|rss(?:\.xml)?|atom\.xml|feed\.xml|index\.xml)\/?$/i.test(url.pathname))url.pathname="/";else url.pathname=url.pathname.replace(/\/+$/,"")||"/";url.searchParams.sort();return url.href;}
function state(){const result={fixture:true,popularity:{},evidence:{}};for(let n=0;n<seeds.length;n++){
 const feeds=[0,1,2,3].map(offset=>identity(seeds[(n+offset)%seeds.length].url));
 const token=crypto.createHash("sha256").update("synthetic-demo-batch:"+n).digest("hex");
 for(const a of feeds){const pop=result.popularity[a]||={count:0,weight:0};pop.count++;pop.weight++;for(const b of feeds)guards.record(result,"pair",a,b,token);}
}return result;}
function cards(rows){return rows.map((row,index)=>{const original=seeds.find(seed=>identity(seed.url)===row.url);return {...original,url:original?.url||row.url,name:original?.name||new URL(row.url).hostname,provenance:"editorial",reason:"Curated from the prepared demo dataset; not measured reader feedback.",color:["#d6ff58","#b9c8ff","#f9b89e","#e9c4ff"][index%4]};});}
module.exports={state,identity,cards};
