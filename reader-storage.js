(function(root,factory){if(typeof module==="object"&&module.exports)module.exports=factory;else root.createReaderStorage=factory;})(typeof window!=="undefined"?window:globalThis,function({local,indexed,onStatus=()=>{}}){
  const valid=value=>value&&Array.isArray(value.stories)&&Array.isArray(value.feeds)&&Array.isArray(value.subscriptionUrls);
  const read=(key,fallback)=>{try{return JSON.parse(local.getItem(key))??fallback;}catch{return fallback;}};
  const stored=read("quiet-web-reader-state",null);
  const initial=valid(stored)?stored:{stories:read("small-web-stories",[]),feeds:read("small-web-feeds",[]),subscriptionUrls:read("small-web-subscriptions",[]),updatedAt:0};
  for(const key of ["stories","feeds","subscriptionUrls"])if(!Array.isArray(initial[key]))initial[key]=[];
  let revision=Number(initial.updatedAt)||0,queue=Promise.resolve();
  function open(){return new Promise((resolve,reject)=>{
    if(!indexed)return reject(Error("IndexedDB unavailable"));
    const request=indexed.open("small-web-reader",1);
    const timer=setTimeout(()=>reject(Error("Browser database timed out")),4000);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains("state"))request.result.createObjectStore("state");};
    request.onsuccess=()=>{clearTimeout(timer);resolve(request.result);};request.onerror=()=>{clearTimeout(timer);reject(request.error);};request.onblocked=()=>{clearTimeout(timer);reject(Error("Browser database blocked"));};
  });}
  async function load(){const db=await open();return new Promise((resolve,reject)=>{
    const transaction=db.transaction("state");const request=transaction.objectStore("state").get("reader");
    request.onsuccess=()=>resolve(valid(request.result)?request.result:null);request.onerror=()=>reject(request.error);
    transaction.oncomplete=()=>db.close();transaction.onerror=()=>{db.close();reject(transaction.error);};
  });}
  async function write(snapshot){const db=await open();return new Promise((resolve,reject)=>{
    const transaction=db.transaction("state","readwrite");transaction.objectStore("state").put(snapshot,"reader");
    transaction.oncomplete=()=>{db.close();resolve();};transaction.onerror=transaction.onabort=()=>{db.close();reject(transaction.error||Error("Browser save failed"));};
  });}
  function save(state){
    revision=Math.max(Date.now(),revision+1);
    const snapshot=JSON.parse(JSON.stringify({...state,updatedAt:revision}));let localSaved=false;
    try{local.setItem("quiet-web-reader-state",JSON.stringify(snapshot));localSaved=true;}catch{}
    queue=queue.catch(()=>{}).then(()=>write(snapshot)).then(()=>{onStatus("saved");return true;},()=>{onStatus(localSaved?"local-only":"failed");return localSaved;});
    return queue;
  }
  return {initial,load,save,get revision(){return revision;},adoptRevision(value){revision=Math.max(revision,Number(value)||0);}};
});
