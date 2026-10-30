const crypto=require("node:crypto");
const salt=process.env.SUPABASE_SECRET_KEY||crypto.randomBytes(32).toString("hex");
const mac=text=>crypto.createHmac("sha256",salt).update("quiet-web-submission:"+text).digest("hex");
function issue(){const payload=crypto.randomBytes(32).toString("hex")+":"+(Date.now()+300000);return payload+":"+mac(payload);}
function verify(token){
  if(typeof token!=="string"||!/^([a-f0-9]{64}):\d{13}:[a-f0-9]{64}$/.test(token))throw Error("Request a fresh submission token.");
  const [nonce,time,signature]=token.split(":");const expires=Number(time);
  if(expires<Date.now()||expires>Date.now()+300000||!crypto.timingSafeEqual(Buffer.from(signature,"hex"),Buffer.from(mac(nonce+":"+time),"hex")))throw Error("Submission token expired or invalid.");
  return {nonce,expires};
}
async function consume(token,update){const verified=verify(token);await update(state=>{for(const [key,expiry]of Object.entries(state))if(expiry<Date.now())delete state[key];const key=mac(verified.nonce);if(state[key])throw Error("Submission token already used.");state[key]=verified.expires;});return verified.nonce;}
const ipKey=ip=>mac(Math.floor(Date.now()/60000)+":"+ip);
module.exports={issue,verify,consume,ipKey};
