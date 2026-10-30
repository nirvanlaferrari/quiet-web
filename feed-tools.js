// OPML, tags and blogroll extraction run entirely in the browser.
(() => {
 const load=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}};
 const tags=load("quiet-web-feed-tags",{}),edges=load("quiet-web-blogroll",{});let activeTag="";
 const save=()=>{localStorage.setItem("quiet-web-feed-tags",JSON.stringify(tags));localStorage.setItem("quiet-web-blogroll",JSON.stringify(edges));};
 const url=value=>{const parsed=new URL(value);if(!/^https?:$/.test(parsed.protocol)||parsed.username||parsed.password)throw Error("Only public http(s) feed links are allowed.");return canonicalFeedUrl(parsed.href);};
 function parseOPML(text){
  if(text.length>2*1024*1024||/<!DOCTYPE|<!ENTITY/i.test(text))throw Error("OPML must be under 2 MB and contain no document/entity declarations.");
  const doc=new DOMParser().parseFromString(text,"application/xml");if(doc.querySelector("parsererror")||doc.documentElement.localName!=="opml")throw Error("Choose a valid OPML file.");
  const result=new Map();for(const node of doc.querySelectorAll("outline[xmlUrl]")){
   const address=url(node.getAttribute("xmlUrl"));const folders=[];let parent=node.parentElement;
   while(parent?.localName==="outline"){if(parent.getAttribute("text"))folders.unshift(parent.getAttribute("text"));parent=parent.parentElement;}
   const assigned=[...folders,...(node.getAttribute("category")||"").split(",")].map(value=>value.trim()).filter(Boolean);
   const previous=result.get(address);result.set(address,{url:address,name:node.getAttribute("text")||address,tags:[...new Set([...(previous?.tags||[]),...assigned])].slice(0,10)});
  }
  if(result.size>100)throw Error("Import at most 100 feeds at once.");if(!result.size)throw Error("No feed addresses found in this OPML file.");return [...result.values()];
 }
 window.QuietFeedTools={parseOPML};
 window.feedMatchesTags=story=>!activeTag||(tags[story.feedUrl]||[]).includes(activeTag);
 window.blogrollChoices=story=>(edges[story.feedUrl]||[]).map(link=>({...link,provenance:"blogroll",category:"Detected blogroll",reason:`Detected in ${story.feed}’s blogroll.`}));
 const panel=document.createElement("section");panel.className="feed-tools";panel.innerHTML='<h3>Subscriptions &amp; organisation</h3><div class="feed-tool-actions"><label>Import OPML <input type="file" accept=".opml,.xml" id="opml-file"></label><button type="button" class="theme-toggle" id="export-opml">Export OPML</button></div><p class="helper-text" id="feed-tools-status" role="status"></p><label>Blog <select id="tag-feed"></select></label><label>Tags (comma separated) <input id="feed-tags" placeholder="Technology, Reading"></label><button type="button" class="theme-toggle" id="save-feed-tags">Save tags</button><label class="privacy-choice"><input type="checkbox" id="blogroll-sharing"><span>Allow submission of detected “A links to B” blogroll edges.</span></label><button type="button" class="theme-toggle" id="submit-blogroll">Submit detected links</button>';
 document.getElementById("favourite-blogs-heading").before(panel);
 const status=panel.querySelector("#feed-tools-status"),feedSelect=panel.querySelector("#tag-feed"),tagInput=panel.querySelector("#feed-tags");
 const filter=document.createElement("select");filter.className="motion-preference";filter.setAttribute("aria-label","Filter timeline by tag");document.querySelector(".filter-row").append(filter);
 window.renderFeedTools=()=>{
  const previous=feedSelect.value;feedSelect.replaceChildren();
  subscriptionUrls.filter(value=>/^https?:/i.test(value)).forEach(address=>{const option=document.createElement("option");option.value=address;option.textContent=stories.find(story=>story.feedUrl===address)?.feed||new URL(address).hostname;feedSelect.append(option);});
  if([...feedSelect.options].some(option=>option.value===previous))feedSelect.value=previous;
  tagInput.value=(tags[feedSelect.value]||[]).join(", ");
  const all=[...new Set(subscriptionUrls.flatMap(address=>tags[address]||[]))].sort();filter.replaceChildren();
  const any=document.createElement("option");any.value="";any.textContent="All tags";filter.append(any);
  all.forEach(tag=>{const option=document.createElement("option");option.value=tag;option.textContent=tag;filter.append(option);});if(activeTag&&!all.includes(activeTag)){activeTag="";renderStories();}filter.value=activeTag;
 };
 filter.onchange=()=>{activeTag=filter.value;renderStories();};feedSelect.onchange=()=>{tagInput.value=(tags[feedSelect.value]||[]).join(", ");};
 panel.querySelector("#save-feed-tags").onclick=()=>{if(!feedSelect.value)return;tags[feedSelect.value]=[...new Set(tagInput.value.split(",").map(value=>value.trim().slice(0,50)).filter(Boolean))].slice(0,10);save();render();status.textContent="Tags saved on this device.";};
 panel.querySelector("#export-opml").onclick=()=>{
  const doc=document.implementation.createDocument("","opml",null);doc.documentElement.setAttribute("version","2.0");const head=doc.createElement("head"),title=doc.createElement("title");title.textContent="Quiet Web subscriptions";head.append(title);const body=doc.createElement("body");
  subscriptionUrls.filter(value=>/^https?:/i.test(value)).forEach(address=>{const node=doc.createElement("outline");node.setAttribute("type","rss");node.setAttribute("text",stories.find(story=>story.feedUrl===address)?.feed||address);node.setAttribute("xmlUrl",address);if(tags[address]?.length)node.setAttribute("category",tags[address].join(","));body.append(node);});
  doc.documentElement.append(head,body);const objectUrl=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(doc)],{type:"text/x-opml"}));const link=document.createElement("a");link.href=objectUrl;link.download="quiet-web-subscriptions.opml";link.click();setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);status.textContent="Exported subscriptions and tags. Article contents/highlights are not part of OPML.";
 };
 panel.querySelector("#opml-file").onchange=async event=>{try{
  const file=event.target.files[0];if(!file)return;if(file.size>2*1024*1024)throw Error("Choose a file under 2 MB.");const items=parseOPML(await file.text());
  const dialog=document.createElement("dialog");dialog.className="opml-preview";const heading=document.createElement("h2");heading.textContent="Import subscriptions";dialog.append(heading);const choices=[];
  items.forEach(item=>{const label=document.createElement("label"),input=document.createElement("input");input.type="checkbox";input.checked=!subscriptionUrls.includes(item.url);input.disabled=subscriptionUrls.includes(item.url);label.append(input,document.createTextNode(item.name+(input.disabled?" (already followed)":"")));dialog.append(label);choices.push({input,item});});
  const importButton=document.createElement("button");importButton.className="primary-button";importButton.textContent="Import selected";const cancel=document.createElement("button");cancel.textContent="Cancel";cancel.onclick=()=>dialog.close();dialog.append(importButton,cancel);dialog.addEventListener("close",()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
  importButton.onclick=async()=>{importButton.disabled=true;cancel.disabled=true;window.quietBulkImport=true;let count=0;const failures=[];try{for(const {input,item}of choices){if(!input.checked||input.disabled)continue;try{const imported=await importFeed(item.url);const canonical=canonicalFeedUrl(imported.feedUrl);tags[canonical]=item.tags;count++;status.textContent=`Imported ${count}…`;}catch(error){failures.push(item.name+": "+error.message);}}save();render();}finally{window.quietBulkImport=false;dialog.close();event.target.value="";}status.textContent=`Imported ${count} blogs. ${failures.length} failed.`+(failures.length?" "+failures.join("; "):"");if(discoveryOptIn)submitAnonymousSubscriptions().catch(()=>{});};
 }catch(error){status.textContent=error.message;event.target.value="";}};
 const sharing=panel.querySelector("#blogroll-sharing");sharing.checked=load("quiet-web-blogroll-sharing",false)===true;sharing.onchange=()=>localStorage.setItem("quiet-web-blogroll-sharing",JSON.stringify(sharing.checked));
 window.detectQuietBlogroll=async(imported,source)=>{try{
  if(!navigator.onLine||isOffline)return;const home=imported.siteUrl||new URL(imported.feedUrl).origin;const response=await proxyFetch(home);const doc=new DOMParser().parseFromString(response.body,"text/html"),found=new Map();
  for(const anchor of doc.querySelectorAll('.blogroll a[href],.linkcat a[href],#blogroll a[href],a[rel~="friend"],a[rel~="colleague"]')){try{const target=url(new URL(anchor.getAttribute("href"),response.url).href);if(new URL(target).origin===new URL(home).origin)continue;found.set(target,{url:target,name:anchor.textContent.trim().slice(0,100)||new URL(target).hostname});}catch{}if(found.size>=20)break;}
  edges[source]=[...found.values()];save();if(found.size)status.textContent=`Detected ${found.size} blogroll links from ${imported.title}. Sharing requires opt-in and Submit.`;
 }catch{/* Blogroll failure never breaks a successful follow. */}};
 panel.querySelector("#submit-blogroll").onclick=async()=>{if(!sharing.checked){status.textContent="Enable blogroll sharing first.";return;}const from=feedSelect.value,links=(edges[from]||[]).map(item=>item.url);if(!links.length){status.textContent="No blogroll links detected for this feed. Re-scan first.";return;}try{const token=await anonymousSubmissionToken();if(!sharing.checked)return;const response=await fetch("/api/discovery/blogroll",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({from,links,token})});const result=await response.json();if(!response.ok)throw Error(result.error);status.textContent=`Submitted ${result.edges} blogroll edges.`;}catch(error){status.textContent=error.message;}};
 const scan=document.createElement("button");scan.className="theme-toggle";scan.textContent="Re-scan blogroll";scan.onclick=()=>{if(feedSelect.value)window.detectQuietBlogroll({title:feedSelect.selectedOptions[0].textContent,feedUrl:feedSelect.value},feedSelect.value);};panel.append(scan);
 window.renderFeedTools();
})();
