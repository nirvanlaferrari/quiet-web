const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),out=path.join(root,"public");fs.mkdirSync(out,{recursive:true});
const files=["index.html","styles.css","theme.css","entry.css","reader-tools.css","app.js","theme.js","entry.js","glyph-swell.js","reader-tools.js","speech-reader.js","screen-time.js","feed-sync.js","sw.js","reader-extraction.js"];
for(const name of files){let text=fs.readFileSync(path.join(root,name),"utf8");text=text.replaceAll("node_modules/gsap/dist/","vendor/").replaceAll("node_modules/@mozilla/readability/Readability.js","vendor/Readability.js").replaceAll("node_modules/dompurify/dist/purify.min.js","vendor/purify.min.js");fs.writeFileSync(path.join(out,name),text);}
fs.mkdirSync(path.join(out,"vendor"),{recursive:true});for(const name of ["gsap.min.js","ScrollTrigger.min.js"])fs.copyFileSync(path.join(root,"node_modules/gsap/dist",name),path.join(out,"vendor",name));
console.log("Built allowlisted Quiet Web frontend in public/");
fs.copyFileSync(path.join(root,"node_modules/@mozilla/readability/Readability.js"),path.join(out,"vendor/Readability.js"));
fs.copyFileSync(path.join(root,"node_modules/dompurify/dist/purify.min.js"),path.join(out,"vendor/purify.min.js"));
