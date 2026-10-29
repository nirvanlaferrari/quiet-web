function createStore({url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY,fetchImpl=fetch}={}) {
  async function call(path,options={}) {
    if(!url||!key)throw Error("Configure SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel.");
    const endpoint=new URL(url);if(endpoint.protocol!=="https:")throw Error("Supabase must use HTTPS.");
    const response=await fetchImpl(endpoint.origin+"/rest/v1/"+path,{...options,headers:{apikey:key,"Content-Type":"application/json",...(key.startsWith("eyJ")?{Authorization:`Bearer ${key}`}:{})},signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error("Database request failed. Check the Supabase migration and server environment variables.");
    return response.json();
  }
  const read=async name=>{const rows=await call("quiet_state?key=eq."+encodeURIComponent(name)+"&select=version,body");return rows[0]||{version:0,body:{}};};
  async function update(name,mutate) {
    for(let i=0;i<8;i++){
      const state=await read(name);const result=mutate(state.body);
      const saved=await call("rpc/quiet_compare_swap",{method:"POST",body:JSON.stringify({p_key:name,p_expected:state.version,p_body:state.body})});
      if(saved)return result;
    }
    throw Error("Database is busy. Please retry shortly.");
  }
  return {read,update};
}
module.exports={createStore};
