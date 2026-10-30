const assert=require("node:assert/strict"),s=require("../lib/discovery-security.cjs"),g=require("../recommendation-guards.cjs");
(async()=>{
 const token=s.issue();assert(s.verify(token).expires>Date.now());assert.throws(()=>s.verify(token.slice(0,-1)+(token.endsWith("a")?"b":"a")));
 const state={};await s.consume(token,async fn=>fn(state));await assert.rejects(()=>s.consume(token,async fn=>fn(state)),/already used/);
 const a="https://one.example/",b="https://two.example/",c="https://three.example/";
 const data={popularity:{[b]:{count:5,weight:5},[c]:{count:3,weight:3}}};
 for(let i=0;i<3;i++)g.record(data,"pair",a,b,String(i).repeat(64));
 assert.equal(g.ranked(data,"pair",[a],[a])[0].url,b);assert.equal(g.ranked(data,"pair",[],[]).length,2);
 assert(!g.ranked(data,"pair",[a],[a,b]).some(row=>row.url===b));
 assert.equal(s.ipKey("127.0.0.1").length,64);
 console.log("PASS: signed tokens, tamper rejection, single-use replay rejection, popularity/co-subscription ranking, followed-feed exclusion");
})().catch(e=>{console.error(e);process.exitCode=1;});
