const assert=require("node:assert/strict"),fs=require("node:fs"),{JSDOM}=require("jsdom"),robots=require("../lib/robots-policy.cjs"),guards=require("../recommendation-guards.cjs");
const dom=new JSDOM(fs.readFileSync("index.html","utf8"),{runScripts:"outside-only",url:"https://reader.example"}),w=dom.window;
w.eval('var stories=[{feed:"Fixture",feedUrl:"https://fixture.example/feed"}],subscriptionUrls=["https://fixture.example/feed"],isOffline=false,discoveryOptIn=false;function canonicalFeedUrl(value){return new URL(value).href}function render(){}function renderStories(){}');
w.eval(fs.readFileSync("feed-tools.js","utf8"));
(async()=>{
 const items=w.QuietFeedTools.parseOPML('<opml version="2.0"><body><outline text="Tech"><outline text="One" xmlUrl="https://one.example/feed"/><outline text="Duplicate" xmlUrl="https://one.example/feed"/></outline></body></opml>');
 assert.equal(items.length,1);assert.equal(items[0].tags[0],"Tech");
 assert.throws(()=>w.QuietFeedTools.parseOPML('<opml><body><outline text="Bad" xmlUrl="javascript:alert(1)"/></body></opml>'));
 assert.throws(()=>w.QuietFeedTools.parseOPML('<!DOCTYPE opml><opml/>'));
 let exported="";w.Blob=class{constructor(parts){exported=parts.join("");}};w.URL.createObjectURL=()=>"blob:test";w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
 w.document.querySelector("#export-opml").click();assert.equal(w.QuietFeedTools.parseOPML(exported).length,1);
 w.document.querySelector("#feed-tags").value="Technology, Essays";w.document.querySelector("#save-feed-tags").click();w.renderFeedTools();const filter=w.document.querySelector('select[aria-label="Filter timeline by tag"]');filter.value="Technology";filter.dispatchEvent(new w.Event("change"));assert(w.feedMatchesTags({feedUrl:"https://fixture.example/feed"}));assert(!w.feedMatchesTags({feedUrl:"https://other.example/feed"}));
 w.proxyFetch=async()=>({url:"https://fixture.example/",body:'<html><body><nav><a href="https://ignored.example/">Menu</a></nav><div class="blogroll"><a href="https://target.example/">Target</a></div></body></html>'});
 await w.detectQuietBlogroll({title:"Fixture",siteUrl:"https://fixture.example/"},"https://fixture.example/feed");assert.equal(w.blogrollChoices({feedUrl:"https://fixture.example/feed"}).length,1);
 const url=new URL("https://fixture.example/private/post");const deny=async()=>new Response("User-agent: *\nDisallow: /private/\nAllow: /private/public\n");
 await assert.rejects(()=>robots.check(url,async()=>{},deny),/disallows/);await robots.check(new URL("https://fixture.example/private/public"),async()=>{},deny);
 await robots.check(url,async()=>{},async()=>new Response("Not found",{status:404}));await assert.rejects(()=>robots.check(url,async()=>{},async()=>new Response("Down",{status:503})),/unavailable/);
 const data={popularity:{"https://target.example/":{count:4,weight:4}},links:{"https://fixture.example/":["https://target.example/"]}};
 const withLink=guards.ranked(data,"pair",["https://fixture.example/"],[])[0];assert.equal(withLink.blogrollSource,"https://fixture.example/");
 const originalFetch=global.fetch;let conditional=false;global.fetch=async(url,options)=>{if(String(url).endsWith("robots.txt"))return new Response("User-agent: *\nAllow: /\n");conditional=options.headers["If-None-Match"]==='"v1"'&&!!options.headers["If-Modified-Since"];return new Response(null,{status:304,headers:{etag:'"v1"'}});};
 const dns=require("node:dns/promises"),lookup=dns.lookup;dns.lookup=async()=>[{address:"93.184.216.34",family:4}];
 try{const result=await require("../server.js").fetchSafely("https://example.com/feed",3,{etag:'"v1"',modified:"Wed, 28 Oct 2026 12:00:00 GMT"});assert(result.notModified);assert(conditional);}finally{global.fetch=originalFetch;dns.lookup=lookup;}
 console.log("PASS: OPML preview parser/dedup/folders/export/safety, tags/filtering, blogroll detection/ranking, robots allow/disallow/errors, conditional headers and 304");dom.window.close();
})().catch(error=>{console.error(error);dom.window.close();process.exitCode=1;});
