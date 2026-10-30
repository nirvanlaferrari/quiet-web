const assert=require("node:assert/strict"),fs=require("node:fs"),{JSDOM}=require("jsdom");
const dom=new JSDOM("",{runScripts:"outside-only",url:"https://reader.example"}),w=dom.window;
const source=fs.readFileSync("app.js","utf8");w.eval(source.slice(source.indexOf("function cleanText("),source.indexOf("function switchView(")));
const rss='<rss version="2.0"><channel><title>Fixture blog</title><item><guid>one</guid><title>First</title><link>https://fixture.example/post</link><pubDate>Thu, 29 Oct 2026 12:00:00 GMT</pubDate><description>A summary</description></item></channel></rss>';
const atom='<feed xmlns="http://www.w3.org/2005/Atom"><title>Atom fixture</title><entry><id>tag:fixture,one</id><title>Atom post</title><published>2026-10-30T12:00:00Z</published><link href="https://fixture.example/atom-post"/><content type="html">&lt;p&gt;Full article content.&lt;/p&gt;</content></entry></feed>';
(async()=>{
 assert.equal(w.parseFeed(rss,"https://fixture.example/feed").entries.length,1);
 assert.equal(w.parseFeed(atom,"https://fixture.example/atom.xml").entries[0].fullText,true);
 assert.equal(w.parseFeed("<rss><bad>","https://fixture.example/feed").malformed,true);
 const linked='<html><head><link rel="alternate" type="application/rss+xml" href="/custom-feed.xml"></head></html>';
 w.proxyFetch=async url=>({url,body:url.endsWith("custom-feed.xml")?rss:linked,contentType:url.endsWith("xml")?"application/xml":"text/html"});
 assert.equal((await w.discoverAndImport("https://fixture.example/")).feedUrl,"https://fixture.example/custom-feed.xml");
 w.proxyFetch=async url=>{if(url.endsWith("rss.xml"))return{url,body:rss,contentType:"application/xml"};if(new URL(url).pathname==="/")return{url,body:"<html><body>Home</body></html>",contentType:"text/html"};throw Error("404");};
 assert.equal((await w.discoverAndImport("https://fixture.example/")).feedUrl,"https://fixture.example/rss.xml");
 w.proxyFetch=async()=>{throw Error("Website took too long");};await assert.rejects(()=>w.discoverAndImport("https://fixture.example/"),/too long/);
 console.log("PASS: RSS, Atom full content, malformed XML, alternate-link discovery, common-path fallback, failed-server isolation");
 dom.window.close();
})().catch(error=>{console.error(error);dom.window.close();process.exitCode=1;});
