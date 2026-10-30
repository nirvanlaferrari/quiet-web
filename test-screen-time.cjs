const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");
let now = 0, interval;
const events = {}, children = [], nodes = new Map();
class Node {
  constructor() { this.open = false; this.events = {}; this.nodes = new Map(); this.opens = 0; }
  setAttribute() {}
  append(...items) { children.push(...items); }
  querySelector(selector) { if (!this.nodes.has(selector)) this.nodes.set(selector,new Node()); return this.nodes.get(selector); }
  addEventListener(type,fn) { this.events[type] = fn; }
  showModal() { this.open = true; this.opens++; }
  close() { this.open = false; this.events.close?.(); }
}
const session = new Map(), local = new Map();
const storage = values => ({ getItem:key=>values.get(key) ?? null, setItem:(key,value)=>values.set(key,value) });
const doc = { hidden:false,body:new Node(),createElement:()=>new Node(),getElementById:id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);},addEventListener:(type,fn)=>events[type]=fn };
runInNewContext(readFileSync(path.join(__dirname,"../screen-time.js"),"utf8"), { document:doc,window:{addEventListener(){}},performance:{now:()=>now},sessionStorage:storage(session),localStorage:storage(local),setInterval:fn=>{interval=fn;} });
const [settings,reminder]=children;
function advance(ticks) { for(let i=0;i<ticks;i++){now+=15000;interval();} }
advance(239); assert.equal(reminder.open,false);
advance(1); assert.equal(reminder.open,true); assert.equal(reminder.opens,1);
advance(5); assert.equal(reminder.opens,1);
reminder.querySelector("#dismiss-break").onclick(); assert.equal(Number(session.get("quiet-web-screen-time")),0);
doc.hidden=true; events.visibilitychange(); advance(240); assert.equal(Number(session.get("quiet-web-screen-time")),0);
doc.hidden=false; events.visibilitychange(); advance(20);
settings.querySelector("#preview-break").onclick(); assert.equal(reminder.open,true);
reminder.querySelector("#accept-break").onclick(); assert.equal(Number(session.get("quiet-web-screen-time")),300000);
settings.querySelector("input").checked=false; settings.querySelector("input").onchange(); advance(240); assert.equal(reminder.open,false);
assert.equal(Number(session.get("quiet-web-screen-time")),0);
console.log("PASS: hourly threshold, no duplicate popup, dismiss reset, hidden-tab pause, preview preserves time, disable stops reminders");
