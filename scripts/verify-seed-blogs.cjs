const fs=require("node:fs"),{JSDOM}=require("jsdom"),{fetchSafely}=require("../server.js");
const candidates=[
 ["Squiggle Line Cafe","https://thesquigglelinecafe.wordpress.com/feed/"],
 ["Seth's Blog","https://seths.blog/feed/"],
 ["Schneier on Security","https://www.schneier.com/feed/atom/"],
 ["Pluralistic","https://pluralistic.net/feed/"],
 ["WordPress News","https://wordpress.org/news/feed/"],
 ["WP Tavern","https://wptavern.com/feed/"],
 ["Matt Mullenweg","https://ma.tt/feed/"],
 ["WordPress.com Blog","https://wordpress.com/blog/feed/"],
 ["Longreads","https://longreads.com/feed/"],
 ["The Marginalian","https://www.themarginalian.org/feed/"],
 ["Austin Kleon","https://austinkleon.com/feed/"],
 ["CSS-Tricks","https://css-tricks.com/feed/"],
 ["Mozilla Blog","https://blog.mozilla.org/en/feed/"],
 ["WebKit Blog","https://webkit.org/blog/feed/"],
 ["Simon Willison","https://simonwillison.net/atom/entries/"]
];
const dom=new JSDOM("",{runScripts:"outside-only",url:"https://reader.example"});
const source=fs.readFileSync("app.js","utf8");dom.window.eval(source.slice(source.indexOf("function cleanText("),source.indexOf("function canonicalFeedUrl(")));
const results=[];let next=0;
async function worker(){while(next<candidates.length){const [name,url]=candidates[next++];try{const response=await fetchSafely(url);const parsed=dom.window.parseFeed(response.body,response.url);if(!parsed?.entries?.length)throw Error("Not a readable RSS/Atom feed");const item={name,url:response.url,posts:parsed.entries.length,wordpress:parsed.entries.some(entry=>entry.platform==="WordPress"),category:"Independent writing",color:["#d6ff58","#b9c8ff","#f9b89e","#e9c4ff"][results.length%4],description:`Recent writing from ${name}.`,reason:"Curated starter blog",status:"pass"};results.push(item);console.log("PASS "+name+" ("+item.posts+" posts)");}catch(error){results.push({name,url,status:"fail",error:error.message});console.log("FAIL "+name+": "+error.message);}}}
(async()=>{await Promise.all([worker(),worker(),worker()]);fs.mkdirSync("samples",{recursive:true});fs.mkdirSync("outputs",{recursive:true});const seeds=results.filter(item=>item.status==="pass").sort((a,b)=>Number(b.wordpress)-Number(a.wordpress)).slice(0,12);fs.writeFileSync("samples/seed-blogs.json",JSON.stringify(seeds,null,2));fs.writeFileSync("outputs/SEED_VERIFICATION.json",JSON.stringify({checkedAt:new Date().toISOString(),results,seedCount:seeds.length},null,2));dom.window.close();if(seeds.length<10)throw Error("Fewer than 10 verified feeds; add candidates before packaging");console.log("Seed list: "+seeds.length+" verified feeds");})().catch(error=>{console.error(error);process.exitCode=1;});
