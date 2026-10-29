const crypto = require("node:crypto");
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
function contributor(value) { if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw Error("A valid anonymous browser contribution token is required."); return value; }
function batchWeight(raw, unique) {
  const hosts = new Map(); unique.forEach(url => { const host = new URL(url).hostname; hosts.set(host,(hosts.get(host)||0)+1); });
  const concentrated = unique.length >= 4 && Math.max(...hosts.values()) / unique.length > .7;
  const duplicates = unique.length < raw.length * .75;
  return Math.min(1,8/Math.max(1,unique.length-1)) * (concentrated || duplicates ? .25 : 1);
}
function budget(store, token) {
  const day = new Date().toISOString().slice(0,10), key = hash(day+token);
  store.budgets ||= {};
  for (const [id,row] of Object.entries(store.budgets)) if(row.day !== day) delete store.budgets[id];
  const row = store.budgets[key] ||= {day,count:0};
  if (++row.count > 120) throw Error("Daily contribution limit reached. Reading is still available.");
}
function record(store, kind, source, target, token, weight=1) {
  if(source === target) return;
  store.evidence ||= {};
  const key = hash(JSON.stringify([kind,source,target]));
  const row = store.evidence[key] ||= {kind,source,target,voters:{}};
  // A different hash per pair prevents cross-pair linkage in the stored evidence.
  const voter = hash(JSON.stringify([kind,source,target,token]));
  row.voters[voter] = Math.min(row.voters[voter] ?? 1,weight);
}
function ranked(store, kind, sources, excluded=[]) {
  const results = new Map();
  for(const row of Object.values(store.evidence || {})) {
    if(row.kind !== kind || !sources.includes(row.source) || excluded.includes(row.target)) continue;
    const weights = Object.values(row.voters), support = weights.reduce((a,b)=>a+b,0);
    if(weights.length < 3 || support < 2) continue;
    const previous = results.get(row.target) || {url:row.target,score:0,distinct:0,source:row.source};
    previous.score += Math.log1p(support);
    if(weights.length > previous.distinct) { previous.distinct = weights.length; previous.source = row.source; }
    results.set(row.target,previous);
  }
  const hostCounts = new Map();
  return [...results.values()].sort((a,b)=>b.score-a.score || a.url.localeCompare(b.url)).filter(row=> {
    const host = new URL(row.url).hostname, count = hostCounts.get(host)||0;
    if(count >= 2) return false; hostCounts.set(host,count+1); return true;
  }).slice(0,6);
}
module.exports={contributor,batchWeight,budget,record,ranked};
