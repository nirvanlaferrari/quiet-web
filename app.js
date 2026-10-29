const seedStories = [
  { id: 1, feed: "The Marginalian", color: "#ff7b58", date: "2h ago", title: "On attention as an act of generosity", summary: "The things we choose to notice slowly become the texture of our inner lives.", body: ["Attention is often treated as a scarce commodity, something to be captured and converted. But there is another way to understand it: as a form of generosity.", "To read a difficult paragraph twice, to notice the small change in a friend's voice, or to sit with a question before rushing toward an answer - these are quiet refusals of a world that rewards speed.", "A good reading life makes room for this kind of attention. It is less a queue to clear than a place to return to."], unread: true, saved: false },
  { id: 2, feed: "Dense Discovery", color: "#6c8bf4", date: "5h ago", title: "The web's smallest useful tools", summary: "Five tiny, independent projects that solve one job beautifully and then get out of the way.", body: ["The best tools have a little bit of humility. They solve a narrow problem, respect your time, and do not ask to become the center of your day.", "This week: a type specimen archive, a weather page with no tracking, a map of public fountains, and two small utilities made by people who clearly cared about details."], unread: true, saved: false },
  { id: 3, feed: "Works in Progress", color: "#d2ac43", date: "Yesterday", title: "Keeping a garden journal without turning it into content", summary: "Notes from a season of resisting dashboards, streaks, and the temptation to optimize every habit.", body: ["The notebook began as a place for rain dates and the names of seeds. It became more useful when I stopped trying to make it useful.", "Some entries are only a sentence long. Some are smudged with soil. The point is that they belong to the garden rather than the internet."], unread: false, saved: true },
  { id: 4, feed: "The Browser Company", color: "#76b68b", date: "Yesterday", title: "A case for more personal software", summary: "Software should fit the contours of a life, not require a life to reorganize around it.", body: ["Personal software can be small, local, and opinionated. It can remember only what we ask it to remember.", "The most interesting future is not one giant assistant. It is a constellation of tools that remain legible to the people who use them."], unread: true, saved: false },
  { id: 5, feed: "The Marginalian", color: "#ff7b58", date: "Oct 27", title: "What a library protects", summary: "Libraries preserve more than books: they preserve the possibility of unhurried thought.", body: ["A library is an argument for abundance without urgency. Its shelves say that no single trend needs to decide what deserves a future.", "The slow work of preservation is one of the most hopeful things people do for one another."], unread: true, saved: false },
  { id: 6, feed: "Dense Discovery", color: "#6c8bf4", date: "Oct 26", title: "The delight of a well-made error message", summary: "Error states are where a product reveals whether it respects its users.", body: ["A useful error message does not make the person feel like an error. It explains what happened, protects their work, and offers a next step.", "This is a small standard, but it changes how software feels."], unread: false, saved: false },
  { id: 7, feed: "Works in Progress", color: "#d2ac43", date: "Oct 25", title: "The ordinary pleasure of mailing a letter", summary: "An envelope carries a different kind of time than a notification.", body: ["A letter takes the scenic route. It gives a thought enough time to become considered, and an answer enough time to become real.", "The delay is not an obstacle. It is part of the medium."], unread: true, saved: false }
];

const starterRecommendations = [
  { name: "Mozilla Blog", category: "Open web & privacy", reason: "A starter feed for privacy-minded readers", color: "#d6ff58", description: "News and writing from the open-web community.", url: "https://blog.mozilla.org/en/feed/" },
  { name: "Chrome for Developers", category: "Technology", reason: "A starter feed for web builders", color: "#b9c8ff", description: "Practical updates and explainers for modern web development.", url: "https://developer.chrome.com/static/blog/feed.xml" },
  { name: "Schneier on Security", category: "Security", reason: "A starter feed for thoughtful security analysis", color: "#f9b89e", description: "Independent writing about security, privacy, and public policy.", url: "https://www.schneier.com/feed/atom/" },
  { name: "NASA Safety & Mission Assurance", category: "Science & engineering", reason: "A starter feed for engineering stories", color: "#e9c4ff", description: "Safety, systems, and mission reliability from NASA.", url: "https://sma.nasa.gov/feeds/News" }
];

let recommendations = [...starterRecommendations];
let stories = JSON.parse(localStorage.getItem("small-web-stories")) || [];
let feeds = JSON.parse(localStorage.getItem("small-web-feeds")) || [];
let demoArchive = JSON.parse(localStorage.getItem("quiet-web-demo-archive")) || [];
function archiveDemoStories() {
  const isDemo = story => !story.url && !story.feedUrl && seedStories.some(seed => seed.id === story.id && seed.title === story.title);
  const demos = stories.filter(isDemo);
  const archive = new Map(demoArchive.map(story => [story.id, story]));
  // Preserve the original examples even on a fresh installation, outside the live reader.
  seedStories.forEach(story => { if (!archive.has(story.id)) archive.set(story.id, { ...story }); });
  demos.forEach(story => archive.set(story.id, story));
  demoArchive = [...archive.values()];
  localStorage.setItem("quiet-web-demo-archive", JSON.stringify(demoArchive));
  stories = stories.filter(story => !isDemo(story));
  const demoFeeds = new Set(seedStories.map(story => story.feed));
  feeds = feeds.filter(feed => !demoFeeds.has(feed) || stories.some(story => story.feed === feed));
  persist();
}
let currentFilter = "all";
let selectedFeed = null;
let favouriteFeeds = JSON.parse(localStorage.getItem("quiet-web-favourite-feeds")) || [];
function saveFavourites() { localStorage.setItem("quiet-web-favourite-feeds", JSON.stringify(favouriteFeeds)); }
let isOffline = false;
let subscriptionUrls = JSON.parse(localStorage.getItem("small-web-subscriptions")) || [];
let discoveryOptIn = localStorage.getItem("small-web-discovery-opt-in") === "true";
let readNextOptIn = localStorage.getItem("quiet-web-read-next") === "true";
let lastReadFeed = null;
let readNextRequest = 0;
function anonymousContributor() {
  let token = localStorage.getItem("quiet-web-contributor");
  if (!/^[a-f0-9]{64}$/.test(token || "")) { token = [...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,"0")).join(""); localStorage.setItem("quiet-web-contributor",token); }
  return token;
}
const blogViewCounts = new Map();
const articleDemoViews = new Map();
const usedDemoViews = new Set();
function demoViewLabel(articleKey) {
  // Distinct per article, stable during this visit; never alters real traffic data.
  if (!articleDemoViews.has(articleKey)) {
    let count = 200 + Math.floor(Math.random() * 700);
    if (usedDemoViews.size >= 700) count = 900 + Math.floor(Math.random() * 9000);
    while (usedDemoViews.has(count)) count++;
    usedDemoViews.add(count); articleDemoViews.set(articleKey, count);
  }
  return `${articleDemoViews.get(articleKey).toLocaleString()} demo views`;
}
function setViewLabel(label, feed) {
  const actual = blogViewCounts.get(feed);
  label.textContent = demoViewLabel(label.dataset.articleKey);
  label.title = `Illustrative presentation count, not measured traffic. Actual anonymous blog opens: ${actual === undefined ? "unavailable" : actual.toLocaleString()}. Opens are not unique readers.`;
}
const viewRequests = new Map();
function paintBlogViews(feed) {
  document.querySelectorAll(".blog-view-count").forEach(label => {
    if (label.dataset.feed !== feed) return;
    setViewLabel(label, feed);
  });
}
async function loadBlogViews(feed, increment = false) {
  if (isOffline || !/^https?:/i.test(feed || "")) return;
  if (!increment && (blogViewCounts.has(feed) || viewRequests.has(feed))) return;
  const request = (async () => {
    try {
      const response = await fetch(increment ? "/api/views" : `/api/views?feed=${encodeURIComponent(feed)}`, increment ? {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ feed })
      } : undefined);
      if (!response.ok) throw new Error("View count unavailable");
      const payload = await response.json();
      if (!Number.isSafeInteger(payload.count) || payload.count < 0) throw new Error("Invalid count");
      blogViewCounts.set(feed, Math.max(blogViewCounts.get(feed) || 0, payload.count));
    } catch { /* Reading remains available when counting is unavailable. */ }
    finally { paintBlogViews(feed); }
  })();
  if (!increment) { viewRequests.set(feed, request); await request; viewRequests.delete(feed); }
  else await request;
}
async function updateReadNext(story) {
  const requestId = ++readNextRequest;
  const from = lastReadFeed;
  const current = story.feedUrl;
  lastReadFeed = readNextOptIn && /^https?:/i.test(current || "") ? current : null;
  const panel = $("#read-next-panel");
  if (!/^https?:/i.test(current || "")) return;
  try {
    if (readNextOptIn && from && from !== current && !isOffline) {
      const result = await fetch("/api/read-next", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ from, to: current, contributor:anonymousContributor() }) });
      if (!result.ok) throw new Error("Activity could not be shared.");
    }
    if (isOffline) return;
    const response = await fetch(`/api/read-next?from=${encodeURIComponent(current)}`);
    if (!response.ok) throw new Error("Suggestions are unavailable. Restart the updated server.");
    const payload = await response.json();
    if (requestId !== readNextRequest) return;
    panel.replaceChildren();
    const title = document.createElement("h3"); title.textContent = `Read next after ${story.feed}`; panel.append(title);
    const description = document.createElement("p"); description.className = "helper-text";
    description.textContent = payload.suggestions.length ? "Based on aggregate blog-to-blog activity, not unique people." : "Not enough supported activity yet. Local rankings require three distinct browser contributions and sufficient weighted support.";
    panel.append(description);
    payload.suggestions.filter(item => !subscriptionUrls.includes(canonicalFeedUrl(item.url))).forEach(item => {
      const button = document.createElement("button"); button.className = "offline-pill"; button.textContent = `Follow ${item.name} +`;
      button.onclick = async () => { button.disabled = true; try { await importFeed(item.url); button.textContent = "Following ✓"; } catch(error) { button.disabled = false; $("#read-next-status").textContent = error.message; } };
      panel.append(button);
    });
  } catch(error) { if (requestId === readNextRequest) $("#read-next-status").textContent = error.message; }
}

const $ = (selector) => document.querySelector(selector);
const storyList = $("#story-list");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let motionPreference = localStorage.getItem("small-web-motion") || "system";
function motionEnabled() { return motionPreference === "on" || (motionPreference !== "off" && !reducedMotion.matches); }
let titleTyping;
function typePageTitle(text) {
  titleTyping?.kill();
  const heading = $("#page-title");
  heading.textContent = text;
  if (!window.gsap || !motionEnabled()) return;
  // Reserve the complete heading's space so typing never shifts the story list.
  const measure = document.createElement("span");
  measure.className = "title-measure"; measure.textContent = text;
  const typed = document.createElement("span");
  typed.className = "title-typed"; typed.setAttribute("aria-hidden", "true");
  heading.replaceChildren(measure, typed);
  const progress = { characters: 0 };
  titleTyping = gsap.to(progress, {
    characters: text.length, duration: Math.min(1.1, text.length * .025), ease: "none",
    onUpdate: () => { typed.textContent = text.slice(0, Math.floor(progress.characters)); },
    onComplete: () => { heading.textContent = text; }
  });
}
const motionSelect = $("#motion-preference");
motionSelect.value = motionPreference;
function updateMotionLabel() {
  motionSelect.options[0].textContent = `Motion: auto (${reducedMotion.matches ? "off" : "on"})`;
}
updateMotionLabel();
motionSelect.addEventListener("change", () => {
  motionPreference = motionSelect.value;
  localStorage.setItem("small-web-motion", motionPreference);
  applyMotionPreference();
  if (motionEnabled()) animateEntrance($("#page-title"));
});
function animateEntrance(targets, stagger = 0) {
  if (!window.gsap || !motionEnabled()) return;
  const elements = typeof targets === "string" ? document.querySelectorAll(targets) : targets;
  gsap.killTweensOf(elements);
  gsap.fromTo(elements, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .42, stagger, ease: "power2.out", clearProps: "opacity,transform" });
}

function animateFeedback(target) {
  if (!target || !window.gsap || !motionEnabled()) return;
  gsap.fromTo(target, { scale: .88 }, {
    scale: 1, duration: .32, ease: "back.out(1.4)", overwrite: true, clearProps: "transform"
  });
}

// Animate the contents, so hover never fights a card's scroll entrance.
function setCardHover(card, active) {
  if (!window.gsap || !motionEnabled()) return;
  const content = card.querySelector(".story-body");
  if (content) gsap.to(content, {
    x: active ? 3 : 0, duration: .25, ease: "power2.out", overwrite: "auto",
    ...(active ? {} : { clearProps: "transform" })
  });
}
// Use translate independently from the transform used by scroll reveals.
document.addEventListener("click", event => {
  const card = event.target.closest(".discover-card");
  if (!card || !window.gsap || !motionEnabled()) return;
  gsap.killTweensOf(card, "translate,boxShadow");
  gsap.timeline()
    .to(card, { translate: "0 -9px", boxShadow: "0 16px 28px rgba(0,0,0,.2)", duration: .22, ease: "power2.out" })
    .to(card, { translate: "0 0", boxShadow: "0 0 0 rgba(0,0,0,0)", duration: .5, ease: "power2.inOut", clearProps: "translate,boxShadow" });
});
document.addEventListener("pointerover", event => {
  if (event.pointerType === "touch") return;
  const card = event.target.closest(".story-card, .discover-card");
  if (card && !card.contains(event.relatedTarget)) setCardHover(card, true);
});
document.addEventListener("pointerout", event => {
  const card = event.target.closest(".story-card, .discover-card");
  if (card && !card.contains(event.relatedTarget)) setCardHover(card, false);
});

// Reveal each story once per view, without replaying the list after saves or reads.
const revealedCards = new Set();
const scrollReveal = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
  const arriving = entries.filter(entry => entry.isIntersecting);
  arriving.forEach(entry => {
    scrollReveal.unobserve(entry.target);
    revealedCards.add(entry.target.dataset.motionKey);
  });
  if (!arriving.length) return;
  const cards = arriving.map(entry => entry.target);
  if (!window.gsap) return;
  if (!motionEnabled()) { gsap.set(cards, { clearProps: "opacity,transform" }); return; }
  gsap.to(cards, { opacity: 1, y: 0, duration: .65, stagger: .065, ease: "power2.out", overwrite: "auto", clearProps: "opacity,transform" });
}, { threshold: 0, rootMargin: "0px 0px -24px 0px" }) : null;

function refreshScrollMotion() {
  scrollReveal?.disconnect();
  if (!window.gsap || !motionEnabled() || !scrollReveal) return;
  document.querySelectorAll(".view.active .story-card, .view.active .discover-card").forEach(card => {
    const key = `${card.closest('.view').id}:${card.dataset.id || card.querySelector('h3')?.textContent}`;
    card.dataset.motionKey = key;
    if (!revealedCards.has(key)) {
      gsap.set(card, { opacity: 0, y: 24 });
      scrollReveal.observe(card);
    }
  });
}
// Keyboard users should never focus a story that is still waiting to reveal.
document.addEventListener("focusin", event => {
  const card = event.target.closest(".story-card, .discover-card");
  if (!card || !window.gsap) return;
  scrollReveal?.unobserve(card);
  revealedCards.add(card.dataset.motionKey);
  gsap.killTweensOf(card);
  gsap.set(card, { clearProps: "opacity,transform" });
});

const articleDialog = $("#article-dialog");
let articleMotion;
let articleClosing = false;
let activeArticleId = null;
function updateReadingProgress() {
  const distance = articleDialog.scrollHeight - articleDialog.clientHeight;
  articleDialog.style.setProperty("--reading-progress", distance > 0 ? Math.min(1, articleDialog.scrollTop / distance) : 1);
}
articleDialog.addEventListener("scroll", updateReadingProgress, { passive: true });
window.addEventListener("resize", updateReadingProgress);
function closeArticle() {
  if (articleClosing || !articleDialog.open) return;
  articleMotion?.kill();
  if (!window.gsap || !motionEnabled()) { articleDialog.close(); return; }
  articleClosing = true;
  articleMotion = gsap.to($("#article-content"), {
    opacity: 0, y: 8, duration: .16, ease: "power1.in",
    onComplete: () => articleDialog.close()
  });
}
articleDialog.addEventListener("cancel", event => { event.preventDefault(); closeArticle(); });
articleDialog.addEventListener("close", () => {
  articleMotion?.kill();
  articleClosing = false;
  activeArticleId = null;
  if (window.gsap) gsap.set($("#article-content"), { clearProps: "opacity,transform" });
});
function applyMotionPreference() {
  updateMotionLabel();
  if (!motionEnabled() && window.gsap) {
    titleTyping?.progress(1).kill();
    articleMotion?.kill();
    const targets = document.querySelectorAll(".story-card, .story-body, .save-button, .filter, .nav-link, .discover-card, .discover-card h3, .discover-intro, .library-intro, #article-content, #article-content > *, .view, #story-list, #page-title, #feed-dialog, #feed-form > *, .brand, .top-actions, .sidebar-footer");
    feedMotion?.kill();
    gsap.killTweensOf(targets);
    gsap.set(targets, { clearProps: "opacity,transform,translate,boxShadow" });
    if (articleClosing) articleDialog.close();
    if (feedClosing) $("#feed-dialog").close();
  }
  refreshScrollMotion();
}
reducedMotion.addEventListener("change", applyMotionPreference);

const readerCache = {
  open() { return new Promise((resolve, reject) => { const request = indexedDB.open("small-web-reader", 1); request.onupgradeneeded = () => request.result.createObjectStore("state"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); },
  async save(state) { const db = await this.open(); return new Promise((resolve, reject) => { const transaction = db.transaction("state", "readwrite"); transaction.objectStore("state").put(state, "reader"); transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); }); },
  async load() { const db = await this.open(); return new Promise((resolve, reject) => { const request = db.transaction("state").objectStore("state").get("reader"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
};

function persist() { localStorage.setItem("small-web-stories", JSON.stringify(stories)); localStorage.setItem("small-web-feeds", JSON.stringify(feeds)); localStorage.setItem("small-web-subscriptions", JSON.stringify(subscriptionUrls)); readerCache.save({ stories, feeds, subscriptionUrls }).catch(() => {}); }
function counts() { return { unread: stories.filter(s => s.unread).length, saved: stories.filter(s => s.saved).length }; }
function feedDisplayName(feed, story = null) {
  const entries = story ? [story] : stories.filter(item => item.feed === feed);
  const wordpress = entries.some(item => {
    if (item.platform === "WordPress") return true;
    try { return /(^|\.)wordpress\.com$/i.test(new URL(item.feedUrl || item.url).hostname); } catch { return false; }
  });
  return wordpress ? `${feed} by WordPress` : feed;
}
const feedMenu = document.createElement("div");
feedMenu.className = "feed-context-menu"; feedMenu.hidden = true; feedMenu.setAttribute("role", "menu");
feedMenu.setAttribute("aria-label", "Blog actions"); document.body.append(feedMenu);
const feedNotice = document.createElement("div"); feedNotice.className = "feed-notice"; feedNotice.hidden = true;
feedNotice.setAttribute("role", "status"); document.body.append(feedNotice);
let menuFeed = null;
function focusFeed(feed) {
  const button = [...document.querySelectorAll("#feed-list .feed-item")].find(item => item.dataset.feed === feed);
  (button || $("#add-feed-small")).focus({ preventScroll: true });
}
function closeFeedMenu(restore = false) {
  feedMenu.hidden = true;
  if (restore && menuFeed) focusFeed(menuFeed);
}
function removeFeed(feed) {
  const removed = stories.filter(story => story.feed === feed);
  const urls = new Set(removed.map(story => story.feedUrl).filter(Boolean));
  const wasFavourite = favouriteFeeds.includes(feed);
  stories = stories.filter(story => story.feed !== feed);
  feeds = feeds.filter(name => name !== feed);
  const removedUrls = subscriptionUrls.filter(url => urls.has(url) && !stories.some(story => story.feedUrl === url));
  subscriptionUrls = subscriptionUrls.filter(url => !removedUrls.includes(url));
  favouriteFeeds = favouriteFeeds.filter(name => name !== feed); saveFavourites();
  if (selectedFeed === feed) { selectedFeed = null; typePageTitle("Your quiet corner of the web."); }
  persist(); render(); renderDiscover(); focusFeed(null);
  feedNotice.replaceChildren(document.createTextNode(`Removed ${feed} and its stories from this device. `));
  const undo = document.createElement("button"); undo.textContent = "Undo";
  undo.onclick = () => {
    if (!feeds.includes(feed)) feeds.push(feed);
    const ids = new Set(stories.map(story => story.id));
    stories.push(...removed.filter(story => !ids.has(story.id)));
    subscriptionUrls = [...new Set([...subscriptionUrls, ...removedUrls])];
    if (wasFavourite && !favouriteFeeds.includes(feed)) favouriteFeeds.push(feed);
    saveFavourites(); persist(); render(); renderDiscover(); feedNotice.hidden = true; focusFeed(feed);
  };
  const dismiss = document.createElement("button"); dismiss.textContent = "Dismiss";
  dismiss.onclick = () => { feedNotice.hidden = true; focusFeed(null); };
  feedNotice.append(undo, dismiss); feedNotice.hidden = false;
}
function openFeedMenu(feed, x, y) {
  menuFeed = feed; feedMenu.replaceChildren();
  const favourite = document.createElement("button"); favourite.setAttribute("role", "menuitem");
  favourite.textContent = favouriteFeeds.includes(feed) ? "☆ Remove from favourites" : "★ Add to favourites";
  favourite.onclick = () => {
    favouriteFeeds = favouriteFeeds.includes(feed) ? favouriteFeeds.filter(name => name !== feed) : [...favouriteFeeds, feed];
    saveFavourites(); closeFeedMenu(); render(); focusFeed(feed);
  };
  const remove = document.createElement("button"); remove.setAttribute("role", "menuitem"); remove.className = "remove-feed";
  remove.textContent = "Remove blog"; remove.onclick = () => { closeFeedMenu(); removeFeed(feed); };
  feedMenu.append(favourite, remove); feedMenu.hidden = false;
  feedMenu.style.left = `${Math.max(8, Math.min(x, innerWidth - feedMenu.offsetWidth - 8))}px`;
  feedMenu.style.top = `${Math.max(8, Math.min(y, innerHeight - feedMenu.offsetHeight - 8))}px`;
  favourite.focus({ preventScroll: true });
}
feedMenu.addEventListener("keydown", event => {
  if (event.key === "Escape") { event.preventDefault(); closeFeedMenu(true); }
  if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    event.preventDefault(); const buttons = [...feedMenu.querySelectorAll("button")];
    const index = buttons.indexOf(document.activeElement);
    buttons[event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowUp" ? -1 : 1) + buttons.length) % buttons.length].focus();
  }
  if (event.key === "Tab") closeFeedMenu();
});
document.addEventListener("pointerdown", event => { if (!feedMenu.contains(event.target)) closeFeedMenu(); });
document.addEventListener("scroll", () => closeFeedMenu(), true);
window.addEventListener("resize", () => closeFeedMenu());
function renderFeeds() {
  const target = $("#feed-list"); target.innerHTML = "";
  feeds.forEach((feed, i) => {
    const button = document.createElement("button"); const dot = document.createElement("span");
    button.className = "feed-item"; button.classList.toggle("active", selectedFeed === feed);
    button.dataset.feed = feed; button.title = "Right-click for favourites and removal";
    button.setAttribute("aria-haspopup", "menu");
    button.addEventListener("contextmenu", event => { event.preventDefault(); const rect = button.getBoundingClientRect(); openFeedMenu(feed, event.clientX || rect.left, event.clientY || rect.bottom); });
    button.addEventListener("keydown", event => { if ((event.shiftKey && event.key === "F10") || event.key === "ContextMenu") { event.preventDefault(); const rect = button.getBoundingClientRect(); openFeedMenu(feed, rect.left, rect.bottom); } });
    button.setAttribute("aria-pressed", String(selectedFeed === feed));
    dot.className = "feed-dot"; dot.style.setProperty("--dot", ["#ff7b58", "#6c8bf4", "#d2ac43", "#76b68b", "#8067d7"][i % 5]);
    button.append(dot, document.createTextNode(feedDisplayName(feed)));
    if (favouriteFeeds.includes(feed)) { const star = document.createElement("span"); star.className = "feed-favourite-star"; star.textContent = "★"; star.setAttribute("aria-label", "Favourite"); button.append(star); }
    button.addEventListener("click", () => {
      selectedFeed = selectedFeed === feed ? null : feed;
      switchView("home", true); render();
      typePageTitle(selectedFeed || "Your quiet corner of the web.");
    });
    target.append(button);
  });
}
function cardFor(story) {
  const tpl = $("#story-template").content.cloneNode(true);
  const card = tpl.querySelector(".story-card");
  card.dataset.id = story.id;
  tpl.querySelector(".feed-dot").style.setProperty("--dot", story.color);
  tpl.querySelector(".feed-name").textContent = feedDisplayName(story.feed, story);
  tpl.querySelector("time").textContent = story.date;
  if (/^https?:/i.test(story.feedUrl || "") && !story.localOnly) {
    const label = document.createElement("span"); label.className = "blog-view-count"; label.dataset.feed = story.feedUrl;
    label.dataset.articleKey = `${story.feedUrl}|${story.url || story.id}`;
    setViewLabel(label, story.feedUrl);
    tpl.querySelector(".story-meta").append(label);
  }
  tpl.querySelector("h2").textContent = story.title;
  tpl.querySelector("p").textContent = story.summary;
  const save = tpl.querySelector(".save-button");
  save.textContent = story.saved ? "♥" : "♡";
  save.classList.toggle("saved", story.saved);
  save.setAttribute("aria-pressed", String(story.saved));
  save.addEventListener("click", () => {
    const viewId = card.closest(".view").id;
    story.saved = !story.saved; persist(); render();
    const replacement = [...document.querySelectorAll(`#${viewId} .story-card`)].find(item => item.dataset.id === String(story.id));
    const replacementButton = replacement?.querySelector(".save-button");
    if (replacementButton) { replacementButton.focus({ preventScroll: true }); animateFeedback(replacementButton); }
    else document.querySelector(`#${viewId} .save-button, #${viewId} .filter.active, .nav-link.active`)?.focus({ preventScroll: true });
  });
  tpl.querySelector(".read-story").addEventListener("click", () => openArticle(story));
  card.addEventListener("click", event => { if (!event.target.closest("button")) openArticle(story); });
  return tpl;
}
function renderStories() {
  const visible = stories.filter(s => (!selectedFeed || s.feed === selectedFeed) && (currentFilter === "all" || (currentFilter === "unread" ? s.unread : s.saved)));
  storyList.innerHTML = "";
  if (!visible.length) {
    const empty = document.createElement("div"); empty.className = "empty";
    empty.textContent = stories.length ? "No stories match this filter." : "Your reader is ready for real blogs. Paste a blog or feed link to get started.";
    if (!stories.length) { const add = document.createElement("button"); add.className = "primary-button"; add.textContent = "Add your first blog +"; add.onclick = showFeedDialog; empty.append(document.createElement("br"), document.createElement("br"), add); }
    storyList.append(empty);
  }
  visible.forEach(s => storyList.append(cardFor(s)));
  refreshScrollMotion();
  const c = counts();
  $("#story-count").textContent = stories.length;
  $("#unread-count").textContent = c.unread;
}
function renderDiscover() {
  $("#discover-list").innerHTML = recommendations.map((item, index) => `<article class="discover-card" style="--card:${/^#[0-9a-f]{6}$/i.test(item.color) ? item.color : '#d6ff58'}"><small>${escapeHtml(item.category)}</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><p><small>Why this? ${escapeHtml(item.reason)}</small></p><button data-index="${index}" ${subscriptionUrls.includes(canonicalFeedUrl(item.url)) ? 'disabled' : ''}>${subscriptionUrls.includes(canonicalFeedUrl(item.url)) ? 'Following ✓' : 'Follow blog +'}</button><p class="follow-status" role="status"></p></article>`).join("");
  $$(".discover-card").forEach((card, index) => {
    card.querySelector("p small").textContent = window.recommendationWhy(recommendations[index], index);
  });
  $$(".discover-card button").forEach(button => button.addEventListener("click", async () => {
    const item = recommendations[button.dataset.index]; button.disabled = true; button.textContent = "Adding…";
    try { await importFeed(item.url); button.textContent = "Following ✓"; }
    catch (error) { button.disabled = false; button.textContent = "Retry follow"; button.parentElement.querySelector(".follow-status").textContent = error.message; }
  }));
  refreshScrollMotion();
}
function renderSaved() {
  const favourites = $("#favourite-blogs"); favourites.replaceChildren();
  const available = favouriteFeeds.filter(feed => feeds.includes(feed));
  if (!available.length) { const hint = document.createElement("p"); hint.className = "helper-text"; hint.textContent = "Right-click a blog in Your feeds to add it here."; favourites.append(hint); }
  available.forEach(feed => {
    const row = document.createElement("div"); row.className = "favourite-blog";
    const open = document.createElement("button"); open.className = "favourite-blog-open"; open.textContent = `★ ${feed}`;
    open.onclick = () => { selectedFeed = feed; switchView("home", true); render(); typePageTitle(feed); };
    const remove = document.createElement("button"); remove.textContent = "☆"; remove.setAttribute("aria-label", `Remove ${feed} from favourites`);
    remove.onclick = () => { favouriteFeeds = favouriteFeeds.filter(name => name !== feed); saveFavourites(); render(); $("#favourite-blogs-heading").focus(); };
    row.append(open, remove); favourites.append(row);
  });
  const target = $("#saved-list"); target.innerHTML = "";
  const saved = stories.filter(s => s.saved);
  if (!saved.length) target.innerHTML = `<div class="empty">Your saved stories will live here.</div>`;
  saved.forEach(s => target.append(cardFor(s)));
  const archived = $("#demo-archive-list"); archived.replaceChildren();
  $("#demo-archive-count").textContent = demoArchive.length;
  demoArchive.forEach(story => {
    const button = document.createElement("button"); button.className = "archive-story";
    button.textContent = story.title;
    button.onclick = () => openArticle({ ...story, feed: "Archived demo · fictional sample", localOnly: true });
    archived.append(button);
  });
  refreshScrollMotion();
}
function render() { renderStories(); renderSaved(); renderFeeds(); new Set(stories.map(story => story.feedUrl).filter(Boolean)).forEach(feed => loadBlogViews(feed)); }
function $$(selector) { return [...document.querySelectorAll(selector)]; }
function escapeHtml(value) { const element = document.createElement("div"); element.textContent = value; return element.innerHTML; }
function renderArticle(story, loading = false) {
  if (activeArticleId !== story.id || articleClosing) return;
  $("#article-content").innerHTML = `<button class="article-close" aria-label="Close article">×</button><p class="eyebrow">${escapeHtml(story.feed)} · ${escapeHtml(story.date)}</p><h1>${escapeHtml(story.title)}</h1><div class="article-copy">${loading ? "<p>Opening the clean reading view…</p>" : story.body.map(p => `<p>${escapeHtml(p)}</p>`).join("")}</div>`;
  $(".article-close").textContent = "← Back to your reader";
  $("#article-content .eyebrow").textContent = `${feedDisplayName(story.feed, story)} · ${story.date}`;
  if (!story.localOnly && /^https?:/i.test(story.feedUrl || "")) {
    const label = document.createElement("span"); label.className = "blog-view-count";
    label.dataset.feed = story.feedUrl; label.dataset.articleKey = `${story.feedUrl}|${story.url || story.id}`;
    setViewLabel(label, story.feedUrl); $("#article-content .eyebrow").append(label);
  }
  $(".article-close").onclick = closeArticle;
  window.setupReaderTools?.(story, loading);
  if (articleDialog.open && !loading) animateEntrance($(".article-copy"));
  requestAnimationFrame(updateReadingProgress);
}
function extractArticleText(html) {
  const document = new DOMParser().parseFromString(html, "text/html");
  document.querySelectorAll("script, style, nav, footer, header, aside, form, iframe, noscript").forEach(node => node.remove());
  const root = document.querySelector("article") || document.querySelector("main") || document.body;
  return [...root.querySelectorAll("p")].map(node => cleanText(node.textContent)).filter(Boolean);
}
async function openArticle(story) {
  if (!story.localOnly && /^https?:/i.test(story.feedUrl || "") && !(articleDialog.open && activeArticleId === story.id)) {
    const key = `${story.feedUrl}|${story.url || story.id}`;
    demoViewLabel(key);
    const next = articleDemoViews.get(key) + 1;
    articleDemoViews.set(key, next); usedDemoViews.add(next);
    loadBlogViews(story.feedUrl, true);
  }
  updateReadNext(story);
  activeArticleId = story.id;
  articleClosing = false;
  articleMotion?.kill();
  story.unread = false; persist(); render();
  renderArticle(story, Boolean(story.url && !story.fullText && !story.localOnly && !isOffline)); $("#article-dialog").showModal();
  articleDialog.scrollTop = 0;
  if (window.gsap && motionEnabled()) {
    gsap.set($("#article-content"), { clearProps: "opacity,transform" });
    articleMotion = gsap.fromTo($("#article-content"),
      { opacity: 0, y: 26 },
      { opacity: 1, y: 0, duration: .65, ease: "power2.out", clearProps: "opacity,transform" });
  }
  if (!story.url || story.fullText || isOffline || story.localOnly) return;
  try {
    const response = await proxyFetch(story.url); const paragraphs = extractArticleText(response.body);
    if (paragraphs.length) { story.body = paragraphs; story.fullText = true; persist(); renderArticle(story); }
    else { story.body = [story.summary, "The original page did not expose enough article text, so this reader kept the feed summary."]; renderArticle(story); }
  } catch { story.body = [story.summary, "This article could not be refreshed right now. The feed summary remains available offline."]; renderArticle(story); }
}
function cleanText(value) { return (value || "").replace(/\s+/g, " ").trim(); }
function firstText(element, selectors) { for (const selector of selectors) { const found = element.querySelector(selector); if (found?.textContent) return cleanText(found.textContent); } return ""; }
function formatStoryDate(value) { const date = new Date(value); if (Number.isNaN(date.getTime())) return "Recently"; const delta = Date.now() - date.getTime(); if (delta < 86400000) return `${Math.max(1, Math.round(delta / 3600000))}h ago`; return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function feedColor(name) { const palette = ["#ff7b58", "#6c8bf4", "#d2ac43", "#76b68b", "#8067d7"]; return palette[[...name].reduce((total, character) => total + character.charCodeAt(0), 0) % palette.length]; }
async function proxyFetch(url, options = {}) {
  const response = await fetch(`/api/fetch?raw=1&url=${encodeURIComponent(url)}`,{signal:options.signal});
  if(response.ok && response.headers.has("x-quiet-web-url")) return {url:decodeURIComponent(response.headers.get("x-quiet-web-url")),contentType:decodeURIComponent(response.headers.get("x-quiet-web-type")||""),body:await response.text()};
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Could not fetch this website.");
  return payload;
}
function parseFeed(body, sourceUrl) {
  const xml = new DOMParser().parseFromString(body, "application/xml");
  if (xml.querySelector("parsererror")) return { malformed: true };
  const root = xml.documentElement.localName.toLowerCase();
  if (!["rss", "feed", "rdf"].includes(root)) return null;
  const isAtom = root === "feed";
  const title = firstText(xml, isAtom ? ["feed > title"] : ["channel > title"]) || new URL(sourceUrl).hostname.replace(/^www\./, "");
  const entries = [...xml.querySelectorAll(isAtom ? "entry" : "item")].slice(0, 25).map((entry, index) => {
    const link = isAtom ? [...entry.querySelectorAll("link")].find(item => item.getAttribute("href") && (!item.getAttribute("rel") || item.getAttribute("rel") === "alternate"))?.getAttribute("href") : firstText(entry, ["link"]);
    const fullContent = firstText(entry,isAtom ? ["content"] : ["content\\:encoded"]);
    const rawSummary = firstText(entry, isAtom ? ["summary", "content"] : ["description", "content\\:encoded"]);
    const summary = cleanText(new DOMParser().parseFromString(rawSummary || "", "text/html").body.textContent) || "Open this story to read more.";
    const contentDoc = fullContent ? new DOMParser().parseFromString(fullContent,"text/html") : null;
    const paragraphs = contentDoc ? [...contentDoc.querySelectorAll("p")].map(p=>cleanText(p.textContent)).filter(Boolean) : [];
    if(contentDoc && !paragraphs.length && cleanText(contentDoc.body.textContent)) paragraphs.push(cleanText(contentDoc.body.textContent));
    return { id: `${sourceUrl}#${firstText(entry, isAtom ? ["id", "link"] : ["guid", "link"])}-${index}`, sourceId:firstText(entry,isAtom ? ["id"] : ["guid"]), feed: title, color: feedColor(title), date: formatStoryDate(firstText(entry, isAtom ? ["updated", "published"] : ["pubDate", "dc\\:date"])), title: firstText(entry, ["title"]) || "Untitled story", summary: summary.slice(0, 230), body: paragraphs.length ? paragraphs : [summary], fullText:paragraphs.length>0, url: link ? new URL(link, sourceUrl).toString() : sourceUrl, unread: true, saved: false };
  }).filter(item => item.title !== "Untitled story");
  if (/wordpress/i.test(firstText(xml, ["generator"]))) entries.forEach(entry => { entry.platform = "WordPress"; });
  return entries.length ? { title, entries } : null;
}
function canonicalFeedUrl(value) {
  const url = new URL(value); url.hash = "";
  [...url.searchParams.keys()].filter(key => /^utm_/i.test(key)).forEach(key => url.searchParams.delete(key));
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString();
}
async function importFeed(rawUrl) {
  const imported = await discoverAndImport(rawUrl);
  const canonicalUrl = canonicalFeedUrl(imported.feedUrl);
  return saveImportedFeed(imported, canonicalUrl);
}
async function saveImportedFeed(imported, canonicalUrl) {
  if (subscriptionUrls.includes(canonicalUrl)) throw new Error("This blog is already in your reader.");
  if (!feeds.includes(imported.title)) feeds.push(imported.title);
  const previousById = new Map(stories.map(story => [story.id, story]));
  imported.entries.forEach(entry => { const previous = previousById.get(entry.id); if (previous) { entry.saved = previous.saved; entry.unread = previous.unread; entry.body = previous.body; entry.fullText = previous.fullText; } entry.feedUrl = canonicalUrl; });
  stories = [...imported.entries, ...stories.filter(story => !imported.entries.some(entry => entry.id === story.id))];
  subscriptionUrls.push(canonicalUrl); persist(); render();
  renderDiscover();
  if (discoveryOptIn && /^https?:/i.test(canonicalUrl)) submitAnonymousSubscriptions().catch(() => { $("#discovery-status").textContent = "Blog added. Optional discovery sharing could not complete."; });
  return imported;
}
async function importFeedFile(file) {
  if (file.size > 2 * 1024 * 1024) throw new Error("Choose a feed file smaller than 2 MB.");
  const sourceUrl = `local-feed://${encodeURIComponent(file.name)}`;
  const parsed = parseFeed(await file.text(), sourceUrl);
  if (parsed?.malformed) throw new Error("This file contains malformed RSS or Atom XML.");
  if (!parsed) throw new Error("This file is not a readable RSS or Atom feed.");
  const fileIdentity = `local-file://${file.name.toLowerCase()}-${file.size}`;
  parsed.entries.forEach(entry => { entry.localOnly = true; });
  return saveImportedFeed({ ...parsed, feedUrl: fileIdentity }, fileIdentity);
}
async function submitAnonymousSubscriptions() {
  if (!discoveryOptIn || !subscriptionUrls.length) return;
  const response = await fetch("/api/discovery/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ feeds: subscriptionUrls.filter(url => /^https?:/i.test(url)).slice(0,30),contributor:anonymousContributor() }) });
  const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Could not update discovery.");
  recommendations = payload.recommendations?.length ? payload.recommendations : [...starterRecommendations]; renderDiscover();
}
async function resolveWordPressInput(value) {
  const url = new URL(value);
  if (url.hostname.replace(/^www\./, "") !== "wordpress.com") return value;
  const readerBlog = url.pathname.match(/^\/reader\/blogs\/(\d+)(?:\/posts\/\d+)?\/?$/);
  const readerFeed = url.pathname.match(/^\/reader\/feeds\/(\d+)(?:\/posts?(?:\/[^/]+)?)?\/?$/);
  if (!readerBlog && !readerFeed) throw new Error("Paste the writer’s own website or a WordPress Reader /reader/blogs/… or /reader/feeds/… link. Account profile pages are not blog feeds.");
  try {
    const endpoint = readerBlog
      ? `https://public-api.wordpress.com/rest/v1.1/sites/${readerBlog[1]}/?fields=URL,name`
      : `https://public-api.wordpress.com/rest/v1.1/read/feed/${readerFeed[1]}`;
    const response = await proxyFetch(endpoint);
    const site = JSON.parse(response.body);
    const homepage = new URL(site.URL || site.feed_URL);
    if (!["http:", "https:"].includes(homepage.protocol) || homepage.hostname.replace(/^www\./, "") === "wordpress.com") throw new Error("Invalid publisher website");
    return homepage.toString();
  } catch {
    throw new Error("Could not resolve this WordPress Reader link to a public blog. Open ‘Visit site’ in WordPress and paste that website address instead.");
  }
}
async function discoverAndImport(rawUrl) {
  rawUrl = await resolveWordPressInput(normalizeInputUrl(rawUrl));
  const platformFeeds = platformFeedCandidates(rawUrl);
  for (const candidate of platformFeeds) {
    try { const result = await proxyFetch(candidate); const parsed = parseFeed(result.body, result.url); if (parsed && !parsed.malformed) return { ...parsed, feedUrl: result.url }; } catch { /* Continue to website discovery. */ }
  }
  const initial = await proxyFetch(rawUrl);
  if (new URL(initial.url).hostname.replace(/^www\./, "") === "wordpress.com") throw new Error("This address redirects to WordPress’s main website. Paste the publisher’s own blog or direct feed URL instead.");
  const directFeed = parseFeed(initial.body, initial.url);
  if (directFeed?.malformed && /xml|rss|atom/i.test(initial.contentType) ) throw new Error("This feed is malformed and could not be read.");
  if (directFeed && !directFeed.malformed) return { ...directFeed, feedUrl: initial.url };
  const page = new DOMParser().parseFromString(initial.body, "text/html");
  const linkedFeeds = [...page.querySelectorAll('link[rel~="alternate"]')].filter(link => /rss|atom|xml/i.test(link.getAttribute("type") || "") || /feed|rss|atom/i.test(link.getAttribute("href") || "")).map(link => new URL(link.getAttribute("href"), initial.url).toString());
  const guesses = ["/feed", "/rss.xml", "/atom.xml", "/feed.xml", "/index.xml", "/rss", "/blog/feed"].map(path => new URL(path, initial.url).toString());
  let sawMalformedFeed = false;
  for (const candidate of [...new Set([...linkedFeeds, ...guesses])]) {
    try { const result = await proxyFetch(candidate); const parsed = parseFeed(result.body, result.url); if (parsed?.malformed) { sawMalformedFeed = true; continue; } if (parsed) return { ...parsed, feedUrl: result.url }; } catch { /* Try the next ordinary feed location. */ }
  }
  if (sawMalformedFeed) throw new Error("A feed was found, but its XML is malformed.");
  throw new Error("No public RSS or Atom feed was found. Try the writer’s blog homepage or paste its direct feed link. Some sites disable feeds or require a login.");
}
function normalizeInputUrl(value) {
  const input = value.trim();
  const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Please enter a public http or https blog link.");
  return url.toString();
}
function platformFeedCandidates(value) {
  const url = new URL(value); const host = url.hostname.replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  if (host === "medium.com" && parts.length && parts[0] !== "feed") return [`https://medium.com/feed/${parts[0]}`];
  if (host.endsWith(".blogspot.com")) return [`${url.origin}/feeds/posts/default?alt=rss`, `${url.origin}/feeds/posts/default`];
  if (host.endsWith(".wordpress.com") || host.endsWith(".substack.com")) return [`${url.origin}/feed`];
  return [];
}
function switchView(view, keepFeed = false) {
  if (!keepFeed && selectedFeed) { selectedFeed = null; render(); }
  $$(".view").forEach(v => v.classList.toggle("active", v.id === `${view}-view`));
  $$(".nav-link").forEach(n => n.classList.toggle("active", n.dataset.view === view));
  const titles = { home: ["Tuesday, October 29", "Your quiet corner of the web."], discover: ["Follow ideas, not algorithms", "Find your next good read."], library: ["Reading, saved", "Return when you have time."] };
  $("#eyebrow").textContent = titles[view][0]; typePageTitle(titles[view][1]);
  animateEntrance(document.querySelectorAll(`#${view}-view .discover-intro, #${view}-view .library-intro`));
  animateFeedback(document.querySelector(`.nav-link[data-view="${view}"]`));
  refreshScrollMotion();
}

$$(".nav-link").forEach(button => button.addEventListener("click", () => switchView(button.dataset.view)));
$$(".filter").forEach(button => button.addEventListener("click", () => {
  if (currentFilter === button.dataset.filter) return;
  currentFilter = button.dataset.filter;
  $$(".filter").forEach(b => b.classList.toggle("active", b === button));
  renderStories(); animateFeedback(button); animateEntrance(storyList);
}));
$("#mark-read").addEventListener("click", () => { stories.forEach(s => s.unread = false); persist(); render(); });
$("#offline-button").addEventListener("click", () => { isOffline = !isOffline; const btn = $("#offline-button"); btn.classList.toggle("offline", isOffline); btn.setAttribute("aria-pressed", isOffline); btn.innerHTML = `<span></span>${isOffline ? "Offline mode" : "Online"}`; $("#sync-status").textContent = isOffline ? "Reading from local cache" : "All saved locally"; });
let feedMotion;
let feedClosing = false;
function showFeedDialog() {
  const dialog = $("#feed-dialog");
  feedMotion?.kill(); feedClosing = false;
  dialog.showModal();
  if (!window.gsap || !motionEnabled()) return;
  feedMotion = gsap.timeline().fromTo(dialog,
    { opacity: 0, y: 14, scale: .985 },
    { opacity: 1, y: 0, scale: 1, duration: .32, ease: "power2.out", clearProps: "opacity,transform" }
  ).fromTo(dialog.querySelectorAll(".eyebrow, h2, .dialog-copy"),
    { opacity: 0, y: 6 },
    { opacity: 1, y: 0, duration: .24, stagger: .04, clearProps: "opacity,transform" }, .08);
}
function closeFeedDialog() {
  if (feedClosing) return;
  feedMotion?.kill();
  if (!window.gsap || !motionEnabled()) { $("#feed-dialog").close(); return; }
  feedClosing = true;
  feedMotion = gsap.to($("#feed-dialog"), { opacity: 0, y: 8, duration: .16, onComplete: () => $("#feed-dialog").close() });
}
$("#feed-dialog").addEventListener("cancel", event => { event.preventDefault(); closeFeedDialog(); });
$("#feed-dialog").addEventListener("close", () => {
  feedMotion?.kill(); feedClosing = false;
  if (window.gsap) gsap.set(document.querySelectorAll("#feed-dialog, #feed-form > *"), { clearProps: "opacity,transform" });
});
$("#add-feed").addEventListener("click", showFeedDialog); $("#add-feed-small").addEventListener("click", showFeedDialog);
$("#close-feed-dialog").addEventListener("click", closeFeedDialog);
$("#feed-form").addEventListener("submit", async event => {
  event.preventDefault();
  const url = $("#feed-url").value.trim(); const file = $("#feed-file").files[0]; if (!url && !file) { $("#feed-status").classList.add("error"); $("#feed-status").textContent = "Paste a URL or choose a feed file."; return; }
  const status = $("#feed-status"); const submit = $("#feed-submit");
  status.classList.remove("error"); status.textContent = file ? "Reading your local feed file…" : "Finding a feed and reading its latest posts…"; submit.disabled = true;
  try {
    await (file ? importFeedFile(file) : importFeed(url)); $("#feed-dialog").close(); $("#feed-form").reset(); status.textContent = "";
  } catch (error) { status.classList.add("error"); status.textContent = error.message || "We could not add this feed."; }
  finally { submit.disabled = false; }
});
async function hydrateReader() {
  try { const cached = await readerCache.load(); if (cached?.stories?.length) { stories = cached.stories; feeds = cached.feeds || feeds; subscriptionUrls = cached.subscriptionUrls || subscriptionUrls; } } catch { /* localStorage remains the fallback cache */ }
  archiveDemoStories();
  $("#discovery-opt-in").checked = discoveryOptIn;
  render(); renderDiscover();
  animateEntrance(document.querySelectorAll(".brand, #page-title, .top-actions"), .06);
  typePageTitle($("#page-title").textContent);
  window.quietReaderReady = true; window.dispatchEvent(new Event("quiet-reader-ready"));
}
$("#discovery-opt-in").addEventListener("change", async event => { discoveryOptIn = event.target.checked; localStorage.setItem("small-web-discovery-opt-in", String(discoveryOptIn)); const status = $("#discovery-status"); status.textContent = discoveryOptIn ? "Sharing only this anonymous feed list - no name, account, or reading history." : "Discovery sharing is off."; if (discoveryOptIn) { try { await submitAnonymousSubscriptions(); } catch { status.textContent = "Sharing will retry the next time you add a blog."; } } });
hydrateReader();
$("#read-next-opt-in").checked = readNextOptIn;
$("#read-next-opt-in").addEventListener("change", event => {
  readNextOptIn = event.target.checked; lastReadFeed = null; readNextRequest++;
  localStorage.setItem("quiet-web-read-next", String(readNextOptIn));
  $("#read-next-status").textContent = readNextOptIn ? "Sharing is on for future blog-to-blog opens. No past reading history is uploaded. The server still receives your network address when requests are made." : "Read-next sharing is off.";
});
function syncTimelineSharing() {
  $("#timeline-discovery-opt-in").checked = discoveryOptIn;
  $("#timeline-read-next-opt-in").checked = readNextOptIn;
  $("#timeline-sharing-summary").textContent = discoveryOptIn && readNextOptIn ? "Both on" : discoveryOptIn ? "Feed list on" : readNextOptIn ? "Read next on" : "Sharing off";
}
[["timeline-discovery-opt-in", "discovery-opt-in"], ["timeline-read-next-opt-in", "read-next-opt-in"]].forEach(([mirrorId, originalId]) => {
  $("#" + mirrorId).addEventListener("change", event => {
    const original = $("#" + originalId);
    original.checked = event.target.checked;
    original.dispatchEvent(new Event("change", { bubbles: true }));
  });
  $("#" + originalId).addEventListener("change", syncTimelineSharing);
});
// Mirror asynchronous sharing results here as well as the Discover screen.
const sharingStatusObserver = new MutationObserver(() => {
  $("#timeline-sharing-status").textContent = [$("#discovery-status").textContent, $("#read-next-status").textContent].filter(Boolean).join(" ");
});
["discovery-status", "read-next-status"].forEach(id => sharingStatusObserver.observe($("#" + id), { childList: true, characterData: true, subtree: true }));
syncTimelineSharing();
