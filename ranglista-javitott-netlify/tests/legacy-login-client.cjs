'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
async function scenario({firstFails=false,mapped=false,status=200}={}){
 const calls=[];let attempts=0;const user={id:'new-user',appMetadata:mapped?{legacy_source:'bankiarchive'}:{}};
 const context=vm.createContext({AbortController,setTimeout,clearTimeout,fetch:async(url,o)=>{calls.push({url,o});return new Response(JSON.stringify(status===200?{ok:true}:{error:'Test migration error'}),{status,headers:{'Content-Type':'application/json'}});}});
 const auth=new vm.SyntheticModule(['login','getUser','getAccessToken'],function(){this.setExport('login',async()=>{attempts++;if(firstFails&&attempts===1)throw Object.assign(Error('Wrong project'),{status:400});return user;});this.setExport('getUser',async()=>user);this.setExport('getAccessToken',async()=>'current-project-token');},{context});
 const mod=new vm.SourceTextModule(fs.readFileSync('legacy-login.js','utf8'),{context});await mod.link(()=>auth);await mod.evaluate();const result=await mod.namespace.login('old@example.test','short');return{calls,attempts,result};
}
(async()=>{
 let s=await scenario({firstFails:true});assert.equal(s.attempts,2);assert.equal(s.calls.length,1);assert.equal(s.calls[0].o.headers.Authorization,undefined);assert.equal(s.calls[0].url,'/api/legacy-login');assert.equal(s.calls[0].o.credentials,'same-origin');assert.equal(JSON.parse(s.calls[0].o.body).password,'short');
 s=await scenario();assert.equal(s.attempts,1);assert.equal(s.calls[0].o.headers.Authorization,'Bearer current-project-token');
 s=await scenario({mapped:true});assert.equal(s.calls.length,0);
 s=await scenario({status:401});assert.equal(s.result.id,'new-user');assert(!s.result.legacyWarning);
 s=await scenario({status:503});assert.equal(s.result.id,'new-user');assert(s.result.legacyWarning);
 await assert.rejects(scenario({firstFails:true,status:409}),e=>e.status===409);
 for(const p of ['index.html','webtar-account.js'])assert(fs.readFileSync(p,'utf8').includes("from './legacy-login.js'"));
 console.log('PASS both login entrypoints, old-password fallback, current-account proof, ordinary new login, archive outage warning, collision rejection and no duplicate migration of mapped users');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
