const fs=require("node:fs"),{JSDOM,VirtualConsole}=require("jsdom"),{IDBFactory}=require("fake-indexeddb"),assert=require("node:assert/strict");
const errors=[];const virtual=new VirtualConsole();virtual.on("jsdomError",error=>errors.push(error.message));
const dom=new JSDOM(fs.readFileSync("index.html","utf8"),{url:"https://reader.example/?reader",runScripts:"dangerously",pretendToBeVisual:true,virtualConsole:virtual});const w=dom.window;
w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.indexedDB=new IDBFactory();w.HTMLCanvasElement.prototype.getContext=()=>null;
w.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};w.ResizeObserver=class{observe(){}disconnect(){}};w.fetch=async()=>({ok:false,json:async()=>({error:"Offline test"})});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event("close"));};
w.addEventListener("error",event=>errors.push(event.message));
for(const node of [...w.document.querySelectorAll("script[src]")]){const file=node.getAttribute("src").split("?")[0];if(file.startsWith("node_modules/"))continue;const script=w.document.createElement("script");script.textContent=fs.readFileSync(file,"utf8");w.document.body.append(script);}
(async()=>{
 await new Promise(resolve=>setTimeout(resolve,60));assert.equal(errors.length,0,errors.join("\n"));assert(w.quietReaderReady);assert(w.document.querySelector(".feed-tools"));
 w.document.querySelector(".archive-story").click();assert(w.document.querySelector("#article-dialog").open);assert(w.document.querySelector(".highlight-toolbar"));
 const finish=[...w.document.querySelectorAll(".reading-finish button")][0];finish.click();assert(!w.document.querySelector(".similar-blogs").hidden);assert.equal(w.document.querySelectorAll(".graph-choice").length,4);
 const paragraph=w.document.querySelector(".article-copy p"),selection=w.getSelection(),range=w.document.createRange();range.selectNodeContents(paragraph);selection.removeAllRanges();selection.addRange(range);paragraph.dispatchEvent(new w.Event("pointerup",{bubbles:true}));
 await new Promise(resolve=>setTimeout(resolve,30));assert(w.document.querySelector("mark.highlight-green"));assert.equal(errors.length,0,errors.join("\n"));
 console.log("PASS: complete script boot/hydration, Library feed tools, article controls, deferred graph and auto-highlight interaction in DOM harness");dom.window.close();
})().catch(error=>{console.error(error);dom.window.close();process.exitCode=1;});
