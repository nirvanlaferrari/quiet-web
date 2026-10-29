const CACHE="quiet-web-shell-v4";
const FILES=["./","index.html","styles.css","theme.css","entry.css","reader-tools.css","theme.js","app.js","entry.js","glyph-swell.js","reader-tools.js","speech-reader.js","screen-time.js","feed-sync.js","node_modules/gsap/dist/gsap.min.js","node_modules/gsap/dist/ScrollTrigger.min.js"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
FILES.push("demo-bootstrap.js","samples/seed-blogs.json","reader-storage.js","reader-extraction.js","node_modules/@mozilla/readability/Readability.js","node_modules/dompurify/dist/purify.min.js");
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("quiet-web-shell-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);if(event.request.method!=="GET"||url.origin!==self.location.origin||url.pathname.startsWith("/api/"))return;
  if(event.request.mode==="navigate")event.respondWith(fetch(event.request).catch(()=>caches.match("./index.html")));
  else event.respondWith(fetch(event.request).catch(()=>caches.match(event.request,{ignoreSearch:true})));
});
