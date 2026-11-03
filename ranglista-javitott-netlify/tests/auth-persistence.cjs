const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('auth.js','utf8'),storage=new Map();
const user={id:'11111111-1111-4111-8111-111111111111',email:'old-player@example.test',user_metadata:{username:'OldAlex'},app_metadata:{},confirmed_at:'2026-01-01',created_at:'2026-01-01'};
const jwt=exp=>'eyJhbGciOiJub25lIn0.'+Buffer.from(JSON.stringify({sub:user.id,exp})).toString('base64url')+'.test';
const token=()=>({access_token:jwt(Math.floor(Date.now()/1000)+3600),refresh_token:'mock-refresh',expires_in:3600,token_type:'bearer'});
let mode='ok',refreshes=0;
async function browser(){
 const cookies=new Map(),writes=[];
 const document={get cookie(){return [...cookies].map(([k,v])=>k+'='+v).join('; ');},set cookie(value){writes.push(value);const [pair]=value.split(';'),i=pair.indexOf('='),key=pair.slice(0,i),v=pair.slice(i+1);if(!v||value.includes('expires=Thu, 01 Jan 1970'))cookies.delete(key);else cookies.set(key,v);}};
 const location={origin:'https://new-webtar.test',hash:'',pathname:'/',search:''};
 const context=vm.createContext({console,document,window:{location,addEventListener(){},dispatchEvent(){}},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},URL,URLSearchParams,Headers,Response,atob,setTimeout:()=>1,clearTimeout(){},history:{replaceState(){}},fetch:async(url,options={})=>{
  assert(String(url).startsWith(location.origin+'/.netlify/identity/'));
  if(String(url).endsWith('/token')){const body=new URLSearchParams(options.body);if(body.get('grant_type')==='refresh_token'){refreshes++;assert.equal(body.get('refresh_token'),'mock-refresh');if(mode==='offline')throw new TypeError('Temporary network failure');if(mode==='invalid')return Response.json({error:'invalid_grant'},{status:400});}else {assert.equal(body.get('username'),user.email);assert.equal(body.get('password'),'dummy-test-password');}return Response.json(token());}
  if(String(url).endsWith('/user'))return Response.json(user);
  if(String(url).endsWith('/logout'))return Response.json({});
  throw Error('Unexpected Identity URL');
 }});
 const module=new vm.SourceTextModule(source,{context});await module.link(()=>{throw Error('Unexpected import');});await module.evaluate();return{auth:module.namespace,cookies,writes};
}
(async()=>{
 let b=await browser();assert.equal(await b.auth.getUser(),null);
 assert.equal((await b.auth.login(user.email,'dummy-test-password')).id,user.id);assert(storage.has('gotrue.user'));assert(b.writes.some(s=>s.startsWith('nf_jwt=')&&s.includes('max-age=2592000')));
 // New browser session with no cookies must recover localStorage, retaining the old ID.
 let saved=JSON.parse(storage.get('gotrue.user'));saved.url='https://old-utos.test/.netlify/identity';storage.set('gotrue.user',JSON.stringify(saved));
 b=await browser();assert.equal(b.cookies.size,0);assert.equal((await b.auth.getUser()).id,user.id);assert(b.cookies.has('nf_jwt'));assert.equal(JSON.parse(storage.get('gotrue.user')).id,user.id);
 // Expired access tokens refresh at the current host, including after a temporary outage.
 saved=JSON.parse(storage.get('gotrue.user'));saved.token.access_token=jwt(Math.floor(Date.now()/1000)-100);saved.token.expires_at=Date.now()-100000;storage.set('gotrue.user',JSON.stringify(saved));
 b=await browser();mode='offline';await assert.rejects(()=>b.auth.getUser(),/Temporary network/);assert(storage.has('gotrue.user'));
 mode='ok';assert.equal((await b.auth.getUser()).id,user.id);assert(refreshes>=2);assert.equal(await b.auth.getAccessToken(),JSON.parse(storage.get('gotrue.user')).token.access_token);assert(b.cookies.has('nf_refresh'));
 await b.auth.logout();assert.equal(storage.has('gotrue.user'),false);assert.equal(b.cookies.size,0);assert.equal(await b.auth.getUser(),null);
 // An explicitly revoked refresh token still ends the remembered session.
 await b.auth.login(user.email,'dummy-test-password');saved=JSON.parse(storage.get('gotrue.user'));saved.token.access_token=jwt(1);storage.set('gotrue.user',JSON.stringify(saved));b=await browser();mode='invalid';await assert.rejects(()=>b.auth.getUser());assert.equal(storage.has('gotrue.user'),false);
 console.log('PASS: real auth bundle remembers login, restores missing cookies, refreshes at current host, survives network failure, and clears explicit logout/revocation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
