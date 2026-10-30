const parser=require("robots-parser");
async function check(url,validate,fetchImpl=fetch){
  if(url.pathname==="/robots.txt")return;
  let target=new URL("/robots.txt",url),response;
  for(let i=0;i<6;i++){
    await validate(target.href);
    response=await fetchImpl(target,{redirect:"manual",signal:AbortSignal.timeout(7000),headers:{"User-Agent":"QuietWebReader/1.0"}});
    if([301,302,303,307,308].includes(response.status)){const location=response.headers.get("location");await response.body?.cancel();if(!location||i===5)throw Error("robots.txt redirect limit exceeded.");target=new URL(location,target);continue;}break;
  }
  if(response.status>=500)throw Error("robots.txt temporarily unavailable; please retry later.");
  if(response.status>=400){await response.body?.cancel();return;}
  const reader=response.body?.getReader();let text="",size=0;const decoder=new TextDecoder();
  if(reader)while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>512000){await reader.cancel();throw Error("robots.txt exceeds the policy size limit.");}text+=decoder.decode(part.value,{stream:true});}
  text+=decoder.decode();
  if(parser(new URL("/robots.txt",url).href,text).isAllowed(url.href,"QuietWebReader")===false)throw Error("This publisher disallows automated access to this URL in robots.txt.");
}
module.exports={check};
