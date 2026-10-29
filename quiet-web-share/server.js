const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const dns = require("node:dns/promises");
const crypto = require("node:crypto");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4174);
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_BATCH_FEEDS = 30;
const DISCOVERY_FILE = path.join(ROOT, "data", "discovery.json");
const rateLimits = new Map();
const rateLimitSalt = crypto.randomBytes(24).toString("hex");
const MIME_TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8" };

function isPrivateAddress(address) {
  const value = address.toLowerCase();
  if (value === "::1" || value.startsWith("fe80:") || value.startsWith("fc") || value.startsWith("fd")) return true;
  const parts = value.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  return parts[0] === 0 || parts[0] === 10 || parts[0] === 127 || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168);
}

async function validateRemoteUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("Enter a valid http(s) URL."); }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error("Only public http(s) URLs are allowed.");
  const addresses = await dns.lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("Local and private addresses are not allowed.");
  return url;
}

async function fetchSafely(rawUrl, redirectsLeft = 3) {
  const url = await validateRemoteUrl(rawUrl);
  let response;
  try { response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(12000), headers: { "User-Agent": "SmallWebReader/0.1 (+local development)" } }); }
  catch (error) { if (error.name === "TimeoutError" || error.name === "AbortError") throw new Error("This website took too long to respond. Please try again later."); throw new Error("We could not reach this website right now."); }
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (!redirectsLeft || !response.headers.get("location")) throw new Error("Too many redirects.");
    return fetchSafely(new URL(response.headers.get("location"), url).toString(), redirectsLeft - 1);
  }
  if (!response.ok) throw new Error(`The site responded with ${response.status}.`);
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_RESPONSE_BYTES) throw new Error("The response is too large to import.");
  const body = await response.text();
  if (Buffer.byteLength(body) > MAX_RESPONSE_BYTES) throw new Error("The response is too large to import.");
  return { url: response.url, contentType: response.headers.get("content-type") || "", body };
}

function sendJson(response, status, body) { response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }); response.end(JSON.stringify(body)); }
function normalizeFeedUrl(value) { const url = new URL(value); url.hash = ""; [...url.searchParams.keys()].filter(key => /^utm_/i.test(key)).forEach(key => url.searchParams.delete(key)); url.hostname = url.hostname.toLowerCase().replace(/^www\./, ""); url.pathname = url.pathname.replace(/\/+$/, "") || "/"; return url.toString(); }
async function readDiscoveryStore() { try { return JSON.parse(await fs.readFile(DISCOVERY_FILE, "utf8")); } catch { return { feeds: {}, pairs: {} }; } }
async function writeDiscoveryStore(store) { await fs.mkdir(path.dirname(DISCOVERY_FILE), { recursive: true }); await fs.writeFile(DISCOVERY_FILE, JSON.stringify(store, null, 2)); }
async function readJsonBody(request) { let body = ""; for await (const chunk of request) { body += chunk; if (body.length > 20000) throw new Error("Request body is too large."); } try { return JSON.parse(body || "{}"); } catch { throw new Error("Invalid JSON body."); } }
function allowSubmission(request) { const ipHash = crypto.createHash("sha256").update(`${rateLimitSalt}:${request.socket.remoteAddress || "unknown"}`).digest("hex"); const now = Date.now(); const recent = rateLimits.get(ipHash) || []; const active = recent.filter(time => now - time < 60000); if (active.length >= 10) return false; active.push(now); rateLimits.set(ipHash, active); return true; }
function recommendationsFor(store, followed) {
  const scores = new Map();
  for (const [pair, count] of Object.entries(store.pairs)) { const [a, b] = pair.split("|"); if (followed.includes(a) && !followed.includes(b)) scores.set(b, (scores.get(b) || 0) + count); if (followed.includes(b) && !followed.includes(a)) scores.set(a, (scores.get(a) || 0) + count); }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([url, score], index) => ({ name: new URL(url).hostname, category: "Independent web", reason: `Appeared with ${score} anonymous reading list${score === 1 ? "" : "s"}`, color: ["#d6ff58", "#b9c8ff", "#f9b89e", "#e9c4ff"][index % 4], description: "A privacy-preserving recommendation based on shared subscriptions.", url }));
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  if (requestUrl.pathname === "/api/fetch") {
    if (request.method !== "GET") return sendJson(response, 405, { error: "Method not allowed." });
    try { return sendJson(response, 200, await fetchSafely(requestUrl.searchParams.get("url") || "")); }
    catch (error) { return sendJson(response, 400, { error: error.message || "Could not fetch this URL." }); }
  }
  if (requestUrl.pathname === "/api/discovery/submit") {
    if (request.method !== "POST") return sendJson(response, 405, { error: "Method not allowed." });
    if (!allowSubmission(request)) return sendJson(response, 429, { error: "Please wait before submitting another discovery update." });
    try {
      const body = await readJsonBody(request); if (!Array.isArray(body.feeds) || !body.feeds.length || body.feeds.length > MAX_BATCH_FEEDS) throw new Error("Submit between 1 and 30 feed URLs.");
      const feeds = [...new Set(body.feeds.map(normalizeFeedUrl))];
      for (const feed of feeds) await validateRemoteUrl(feed);
      const store = await readDiscoveryStore();
      for (const feed of feeds) store.feeds[feed] = (store.feeds[feed] || 0) + 1;
      for (let i = 0; i < feeds.length; i += 1) for (let j = i + 1; j < feeds.length; j += 1) { const key = [feeds[i], feeds[j]].sort().join("|"); store.pairs[key] = (store.pairs[key] || 0) + 1; }
      await writeDiscoveryStore(store); return sendJson(response, 200, { recommendations: recommendationsFor(store, feeds) });
    } catch (error) { return sendJson(response, 400, { error: error.message || "Could not update discovery." }); }
  }
  const safePath = path.normalize(requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname).replace(/^[/\\]+/, "");
  const filename = path.resolve(ROOT, safePath);
  if (!filename.startsWith(ROOT)) { response.writeHead(403); return response.end("Forbidden"); }
  try { const data = await fs.readFile(filename); response.writeHead(200, { "content-type": MIME_TYPES[path.extname(filename)] || "application/octet-stream" }); response.end(data); }
  catch { response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); response.end("Not found"); }
});

server.listen(PORT, "127.0.0.1", () => console.log(`Small Web Reader running at http://127.0.0.1:${PORT}`));
