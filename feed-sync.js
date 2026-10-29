// Refresh existing subscriptions, never auto-follow new blogs or submit reading data.
(() => {
  const INTERVAL=15*60*1000; let running=false, abort=null;
  let metadata={}; try { metadata=JSON.parse(localStorage.getItem("quiet-web-feed-sync"))||{}; } catch {}
  const online=()=>navigator.onLine && !isOffline && !document.hidden;
  const save=()=>{try{localStorage.setItem("quiet-web-feed-sync",JSON.stringify(metadata));}catch{}};
  async function refresh() {
    if(running || !window.quietReaderReady || !online())return;
    running=true;
    try {
      for(const feed of [...subscriptionUrls].filter(url=>/^https?:/i.test(url))) {
        if(!online())break;
        const state=metadata[feed]||{};
        if(Date.now()-(state.at||0)<Math.min(6*3600000,INTERVAL*2**(state.failures||0)))continue;
        abort=new AbortController(); const timeout=setTimeout(()=>abort?.abort(),20000);
        try {
          const response=await proxyFetch(feed,{signal:abort.signal});
          const parsed=parseFeed(response.body,response.url);
          if(!parsed || parsed.malformed)throw Error("Feed is not readable.");
          if(!online() || !subscriptionUrls.includes(feed))continue;
          const existing=stories.filter(story=>story.feedUrl===feed);
          const name=existing[0]?.feed||parsed.title; const added=[];
          for(const incoming of parsed.entries) {
            const previous=existing.find(story=>(story.sourceId && story.sourceId===incoming.sourceId)||story.url===incoming.url||story.id===incoming.id);
            if(previous) {
              const preserved={id:previous.id,saved:previous.saved,unread:previous.unread,highlights:previous.highlights};
              if(previous.fullText || previous.highlights?.length){preserved.body=previous.body;preserved.fullText=previous.fullText;}
              Object.assign(previous,incoming,preserved,{feed:name,feedUrl:feed});
            } else if(!added.some(story=>story.url===incoming.url)) added.push({...incoming,feed:name,feedUrl:feed});
          }
          stories=[...added,...stories]; if(!feeds.includes(name))feeds.push(name);
          metadata[feed]={at:Date.now(),failures:0}; persist(); render();
        } catch(error) {
          if(online())metadata[feed]={at:Date.now(),failures:Math.min(5,(state.failures||0)+1),error:error.message};
        } finally {clearTimeout(timeout);abort=null;save();}
      }
    } finally {running=false;}
  }
  setInterval(refresh,INTERVAL);
  window.addEventListener("quiet-reader-ready",()=>setTimeout(refresh,4000));
  if(window.quietReaderReady)setTimeout(refresh,4000);
  window.addEventListener("online",refresh);
  window.addEventListener("offline",()=>abort?.abort());
  document.addEventListener("visibilitychange",()=>{if(document.hidden)abort?.abort();else refresh();});
  document.getElementById("offline-button").addEventListener("click",()=>{if(isOffline)abort?.abort();else refresh();});
  window.addEventListener("load",()=>{if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});});
  const dialog=document.getElementById("article-dialog");
  dialog.addEventListener("click",async event=>{
    if(event.target.id!=="save-offline-article")return;
    const story=stories.find(item=>item.id===activeArticleId); if(!story)return;
    const button=event.target; button.disabled=true; button.textContent="Saving…";
    try {
      if(!story.fullText){if(!online())throw Error("Connect once to download this article.");const response=await proxyFetch(story.url);const article=window.ReaderContent.extract(response.body,response.url);if(!article)throw Error("This publisher did not expose readable article text.");story.body=article.paragraphs;story.articleHtml=article.html;story.fullText=true;}
      story.offlineSaved=true; persist(); await readerCache.save({stories,feeds,subscriptionUrls});
      if(dialog.open && activeArticleId===story.id)renderArticle(story);
    } catch(error){button.disabled=false;button.textContent="Retry offline save";document.getElementById("offline-article-status").textContent=error.message;}
  });
})();
