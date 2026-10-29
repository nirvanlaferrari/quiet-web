const fs=require("node:fs"),{JSDOM}=require("jsdom"),{Readability}=require("@mozilla/readability"),{fetchSafely}=require("../server.js");
const dom=new JSDOM("",{runScripts:"outside-only",url:"https://reader.example"}),w=dom.window;
w.Readability=Readability;w.DOMPurify=require("dompurify")(w);w.eval(fs.readFileSync("reader-extraction.js","utf8"));
const source=fs.readFileSync("app.js","utf8");w.eval(source.slice(source.indexOf("function cleanText("),source.indexOf("function canonicalFeedUrl(")));
(async()=>{
 const reports=[];for(const item of JSON.parse(fs.readFileSync("samples/seed-blogs.json")).slice(0,3)){
   try{const feed=await fetchSafely(item.url),parsed=w.parseFeed(feed.body,feed.url),post=parsed.entries[0];const response=await fetchSafely(post.url),article=w.ReaderContent.extract(response.body,response.url);reports.push({blog:item.name,feed:item.url,article:post.url,extraction:article?"pass":"summary fallback needed",paragraphs:article?.paragraphs.length||0});console.log(item.name+": "+(article?"article extracted and sanitized":"feed fallback required"));}
   catch(error){reports.push({blog:item.name,error:error.message});console.log(item.name+": "+error.message);}
 }
 for(const endpoint of ["/api/views?feed=https%3A%2F%2Fexample.com%2Ffeed","/api/discovery/popular"]){try{const response=await fetch("https://quiet-web-sigma.vercel.app"+endpoint,{signal:AbortSignal.timeout(12000)});const payload=await response.json();reports.push({endpoint,status:response.status,keys:Object.keys(payload)});console.log("Live "+endpoint+": "+response.status);}catch(error){reports.push({endpoint,error:error.message});console.log("Live endpoint: "+error.message);}}
 fs.writeFileSync("outputs/LIVE_VERIFICATION.json",JSON.stringify({checkedAt:new Date().toISOString(),reports},null,2));dom.window.close();
})().catch(error=>{console.error(error);dom.window.close();process.exitCode=1;});
