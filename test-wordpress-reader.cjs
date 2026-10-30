const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const dom=new JSDOM('',{runScripts:'outside-only',url:'https://reader.example'}),w=dom.window;
w.AbortSignal=AbortSignal;
const code=fs.readFileSync('app.js','utf8');w.eval(code.slice(code.indexOf('async function resolveWordPressInput('),code.indexOf('async function discoverAndImport(')));
(async()=>{
 let calls=[];w.fetch=async(url,opts)=>{calls.push({url,opts});return{ok:true,json:async()=>({URL:'https://thesquigglelinecafe.wordpress.com/'})}};
 for(const path of ['blogs/198763049/posts/4867','feeds/135229745/posts/4867','feeds/135229745/post','feeds/135229745'])assert.equal(await w.resolveWordPressInput('https://wordpress.com/reader/'+path),'https://thesquigglelinecafe.wordpress.com/');
 assert.ok(calls[0].url.includes('/sites/198763049/'));assert.ok(calls[1].url.includes('/read/feed/135229745'));assert.equal(calls[0].opts.credentials,'omit');assert.equal(calls[0].opts.redirect,'error');
 assert.equal(await w.resolveWordPressInput('https://wordpress.com/blog/feed/'),'https://wordpress.com/blog/feed/');
 assert.equal(await w.resolveWordPressInput('https://publisher.example/'),'https://publisher.example/');
 await assert.rejects(()=>w.resolveWordPressInput('https://wordpress.com/me'),/Account profile/);
 w.fetch=async()=>({ok:false,status:404});await assert.rejects(()=>w.resolveWordPressInput('https://wordpress.com/reader/blogs/123'),/404/);
 w.fetch=async()=>({ok:true,json:async()=>({URL:'javascript:alert(1)'})});await assert.rejects(()=>w.resolveWordPressInput('https://wordpress.com/reader/blogs/123'),/No public/);
 console.log('PASS: Reader blog/feed/post variants, credential-free CORS metadata, direct WordPress blog, profile rejection and error safety');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>dom.window.close());
