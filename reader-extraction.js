// Content processing is browser-only. The server only transports the raw response.
window.ReaderContent = (() => {
  function sanitize(html) {
    if (!window.DOMPurify?.isSupported) return "";
    return window.DOMPurify.sanitize(html, {
      USE_PROFILES:{html:true}, RETURN_TRUSTED_TYPE:false,
      FORBID_TAGS:["script","style","iframe","object","embed","form","input","button","textarea","select","video","audio"],
      FORBID_ATTR:["style","srcset","id","name","target"]
    });
  }
  function extract(html, url) {
    if (!window.Readability || !window.DOMPurify?.isSupported) throw Error("The reading libraries are unavailable.");
    const doc = new DOMParser().parseFromString(html,"text/html");
    doc.querySelectorAll("base").forEach(node=>node.remove());
    const base=doc.createElement("base");base.href=url;doc.head.prepend(base);
    const article=new window.Readability(doc,{charThreshold:120,maxElemsToParse:50000}).parse();
    if (!article?.content) return null;
    const clean=sanitize(article.content);
    const parsed=new DOMParser().parseFromString(clean,"text/html");
    const text=(parsed.body.textContent||"").replace(/\s+/g," ").trim();
    if (!text) return null;
    const paragraphs=[...parsed.querySelectorAll("p,li,pre")].filter(node=>!node.parentElement.closest("p,li,pre")).map(node=>node.textContent.replace(/\s+/g," ").trim()).filter(Boolean);
    return {html:clean,paragraphs:paragraphs.length?paragraphs:[text]};
  }
  return {sanitize,extract};
})();
