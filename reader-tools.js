// Editorial discovery explanations and device-local article annotations.
(() => {
  window.recommendationWhy = (item, index = 0, source) => {
    if (item.provenance === "aggregate") return `Why this? ${item.reason}`;
    const reference = source || selectedFeed || feeds.find(name => name !== item.name);
    const topic = item.category || "independent writing";
    if (source) return `Why this? After ${source}, explore ${topic.toLowerCase()}. An editorial discovery pick.`;
    return reference ? `Why this? Your reading list includes ${reference}. Explore ${topic.toLowerCase()} with this editorial pick.` : `Why this? An editorial starting point for ${topic.toLowerCase()}.`;
  };
  let selectionRange = null, context = null;
  let highlightColor = "green";
  try { const saved = localStorage.getItem("quiet-web-highlight-colour"); if (["green","orange","off"].includes(saved)) highlightColor = saved; } catch {}
  function autoHighlight() {
    const current = context;
    if (!current || highlightColor === "off") return;
    requestAnimationFrame(() => {
      if (context !== current || !document.getElementById("article-dialog").open) return;
      const selected = window.getSelection();
      if (!selected?.rangeCount || selected.isCollapsed) return;
      const range = selected.getRangeAt(0);
      if (!current.copy.contains(range.startContainer) || !current.copy.contains(range.endContainer)) return;
      selectionRange = range.cloneRange(); highlight(highlightColor, current.status);
    });
  }
  document.addEventListener("pointerup", event => { if (context?.copy.contains(event.target)) autoHighlight(); });
  document.addEventListener("keyup", event => { if (event.key === "Shift") autoHighlight(); });
  document.addEventListener("selectionchange", () => {
    if (!context || !document.getElementById("article-dialog").open) return;
    const selected = window.getSelection();
    if (!selected?.rangeCount || selected.isCollapsed) return;
    const range = selected.getRangeAt(0);
    selectionRange = context.copy.contains(range.startContainer) && context.copy.contains(range.endContainer) ? range.cloneRange() : null;
  });
  function element(tag, className, text) {
    const node = document.createElement(tag); if (className) node.className = className;
    if (text !== undefined) node.textContent = text; return node;
  }
  function applyHighlights(story, copy) {
    [...copy.querySelectorAll("p")].forEach((paragraph, index) => {
      const text = paragraph.textContent;
      const marks = (story.highlights || []).filter(mark => mark.paragraph === index && mark.text === text && mark.start >= 0 && mark.end <= text.length && mark.start < mark.end && ["green", "orange"].includes(mark.color)).sort((a,b) => a.start-b.start);
      if (!marks.length) return;
      const fragment = document.createDocumentFragment(); let cursor = 0;
      marks.forEach(mark => {
        if (mark.start < cursor) return;
        fragment.append(document.createTextNode(text.slice(cursor, mark.start)));
        fragment.append(element("mark", `reader-highlight highlight-${mark.color}`, text.slice(mark.start, mark.end)));
        cursor = mark.end;
      });
      fragment.append(document.createTextNode(text.slice(cursor))); paragraph.replaceChildren(fragment);
    });
  }
  function highlight(color, status) {
    const range = selectionRange;
    if (!range || !context.copy.contains(range.startContainer) || !context.copy.contains(range.endContainer)) {
      status.textContent = "Select some article text first, then choose a colour."; return;
    }
    const { story, copy } = context; let added = 0;
    [...copy.querySelectorAll("p")].forEach((paragraph, index) => {
      if (!range.intersectsNode(paragraph)) return;
      const text = paragraph.textContent;
      const prefix = document.createRange(); prefix.selectNodeContents(paragraph);
      let start = 0, end = text.length;
      if (paragraph.contains(range.startContainer)) { prefix.setEnd(range.startContainer, range.startOffset); start = prefix.toString().length; }
      if (paragraph.contains(range.endContainer)) { prefix.selectNodeContents(paragraph); prefix.setEnd(range.endContainer, range.endOffset); end = prefix.toString().length; }
      if (start >= end) return;
      story.highlights = (story.highlights || []).filter(mark => !(mark.paragraph === index && mark.start < end && mark.end > start));
      story.highlights.push({ paragraph:index, text, start, end, color }); added++;
    });
    if (!added) { status.textContent = "Select text inside an article paragraph."; return; }
    selectionRange = null; window.getSelection()?.removeAllRanges();
    // Repaint from plain text so changing colours never creates nested marks.
    copy.querySelectorAll("p").forEach(p => { p.textContent = p.textContent; });
    applyHighlights(story, copy); persist(); status.textContent = "Highlight saved on this device.";
  }
  const fallback = [
    { name:"Simon Willison",category:"AI & programming",url:"https://simonwillison.net/atom/entries/" },
    { name:"Martin Fowler",category:"Software engineering",url:"https://martinfowler.com/feed.atom" },
    { name:"Mozilla Blog",category:"Open web & privacy",url:"https://blog.mozilla.org/en/feed/" },
    { name:"Schneier on Security",category:"Security",url:"https://www.schneier.com/feed/atom/" }
  ];
  function createGraph(story) {
    const section = element("section", "similar-blogs"); section.hidden = true;
    section.append(element("p", "eyebrow", "Your next reading trail"), element("h2", "", "Blogs like this"), element("p", "helper-text", "Explore editorial picks around this read. Choose a blog to see why it is included."));
    const choices = [...recommendations, ...fallback].filter((item, i, all) => item.name !== story.feed && item.url !== story.feedUrl && all.findIndex(other => other.url === item.url) === i).slice(0,4);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 640 320"); svg.setAttribute("aria-hidden", "true"); svg.classList.add("blog-graph");
    function shape(tag, attributes, text) {
      const node = document.createElementNS(svg.namespaceURI, tag);
      Object.entries(attributes).forEach(([key,value]) => node.setAttribute(key,String(value)));
      if (text) node.textContent = text; svg.append(node); return node;
    }
    const positions = [[120,65],[520,65],[120,255],[520,255]];
    choices.forEach((item,i) => { const [x,y] = positions[i]; shape("path", { d:`M320 160 Q${x} 160 ${x} ${y}`,class:"graph-edge" }); });
    shape("circle", {cx:320,cy:160,r:43,class:"graph-center"});
    shape("text", {x:320,y:164,"text-anchor":"middle",class:"graph-center-label"}, "You read");
    shape("text", {x:320,y:223,"text-anchor":"middle",class:"graph-label"}, story.feed.length > 30 ? story.feed.slice(0,27)+"…" : story.feed);
    const circles = choices.map((item,i) => {
      const [x,y] = positions[i]; const circle = shape("circle",{cx:x,cy:y,r:22,class:"graph-node"});
      shape("text",{x,y:y+4,"text-anchor":"middle",class:"graph-node-index"},String(i+1));
      shape("text",{x,y:y+(i<2 ? -34 : 42),"text-anchor":"middle",class:"graph-label"},item.name.length>24 ? item.name.slice(0,21)+"…" : item.name);
      return circle;
    });
    section.append(svg);
    const buttons = element("div", "graph-options");
    const reason = element("p", "graph-reason"); reason.setAttribute("role", "status");
    const follow = element("button", "primary-button", "Follow blog +"); follow.type = "button";
    const actions = choices.map((item,i) => {
      const button = element("button", "graph-choice", `${i+1}. ${item.name}`); button.type = "button";
      button.onclick = () => {
        actions.forEach((action,j) => { action.setAttribute("aria-pressed",String(j===i)); circles[j].classList.toggle("selected",i===j); });
        reason.textContent = window.recommendationWhy(item,i,story.feed);
        const followed = subscriptionUrls.includes(canonicalFeedUrl(item.url)); follow.disabled = followed; follow.textContent = followed ? "Following ✓" : `Follow ${item.name} +`;
        follow.onclick = async () => {
          follow.disabled = true; follow.textContent = "Adding…";
          try { await importFeed(item.url); follow.textContent = "Following ✓"; }
          catch(error) { follow.disabled = false; follow.textContent = "Retry follow"; reason.textContent = error.message; }
        };
      };
      buttons.append(button); return button;
    });
    section.append(buttons, reason, follow); actions[0]?.click();
    return section;
  }
  window.setupReaderTools = (story, loading) => {
    window.stopSpeechReader?.();
    context = null; selectionRange = null;
    if (loading) return;
    const host = document.getElementById("article-content"), copy = host.querySelector(".article-copy");
    context = { story, copy }; applyHighlights(story,copy);
    const toolbar = element("div", "highlight-toolbar"); toolbar.setAttribute("role", "group"); toolbar.setAttribute("aria-label", "Article highlighting");
    toolbar.append(element("span", "", "Highlight"));
    const status = element("p", "highlight-status"); status.setAttribute("role", "status"); context.status = status;
    const swatches = [];
    const updateColour = () => {
      swatches.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.colour === highlightColor)));
      status.textContent = highlightColor === "off" ? "Highlighting is off. Select text to copy normally." : `Select article text to highlight it ${highlightColor === "green" ? "neon green" : "orange"}. Saved on this device.`;
    };
    ["green","orange","off"].forEach(color => {
      const button = element("button", `highlight-swatch swatch-${color}`,color === "green" ? "Neon green" : color === "orange" ? "Orange" : "Off"); button.type = "button"; button.dataset.colour = color;
      button.onpointerdown = event => event.preventDefault();
      button.onclick = () => {
        highlightColor = color; try { localStorage.setItem("quiet-web-highlight-colour",color); } catch {}
        updateColour(); if (selectionRange && color !== "off") highlight(color,status);
      };
      swatches.push(button); toolbar.append(button);
    });
    updateColour();
    const clear = element("button", "clear-highlights", "Clear highlights"); clear.type = "button";
    clear.onclick = () => { story.highlights = []; selectionRange = null; copy.querySelectorAll("p").forEach(p => { p.textContent = p.textContent; }); persist(); status.textContent = "Highlights cleared."; };
    toolbar.append(clear); copy.before(toolbar,status);
    window.setupSpeechReader?.(story, host, toolbar);
    const offline = element("div","offline-article-tools");
    const download = element("button","theme-toggle",story.offlineSaved ? "Saved offline ✓" : "Save article offline");
    download.id="save-offline-article"; download.type="button"; download.disabled=!!story.offlineSaved;
    const offlineStatus=element("p","helper-text",story.offlineSaved ? "This article’s downloaded text is saved on this device." : "Download the readable article text before going offline. Publisher access restrictions still apply.");
    offlineStatus.id="offline-article-status";offlineStatus.setAttribute("role","status");offline.append(download,offlineStatus);copy.before(offline);
    const footer = element("div", "reading-finish");
    footer.append(element("p", "eyebrow", "A little further down the rabbit hole"));
    const finished = element("button", "primary-button", "Finished reading · Blogs like this ↗"); finished.type = "button"; finished.setAttribute("aria-expanded","false");
    const graph = createGraph(story);
    finished.onclick = () => {
      graph.hidden = !graph.hidden; finished.setAttribute("aria-expanded",String(!graph.hidden));
      if (!graph.hidden) { graph.scrollIntoView({behavior:motionEnabled()?"smooth":"auto",block:"start"}); animateEntrance(graph); }
    };
    footer.append(finished); host.append(footer,graph);
  };
})();
