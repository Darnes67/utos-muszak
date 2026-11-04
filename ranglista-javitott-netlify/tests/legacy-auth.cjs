'use strict';
const assert=require('node:assert/strict');
const {migrate,profileIdentity,BASE}=require('../server/legacy-auth.cjs');
const {ensureProfile,createAPI}=require('../server/api.cjs');
const oldId='11111111-1111-4111-8111-111111111111',newId='22222222-2222-4222-8222-222222222222';
const mapping={legacy_source:'bankiarchive',legacy_profile_id:oldId};
const old={id:oldId,email:'old@example.com',confirmed_at:'2026-01-01',user_metadata:{username:'OldPlayer',roles:['admin']}};
const input={email:old.email,password:'test-only-password'};
function opts(extra={}){return{fetchImpl:async(url,o)=>{assert.equal(o.redirect,'error');assert(url===BASE+'/token'||url===BASE+'/user');if(url.endsWith('/token')){const form=new URLSearchParams(o.body);assert.equal(form.get('password'),input.password);return Response.json({access_token:'opaque-verified-token',user:{id:'FORGED'}});}assert.equal(o.headers.Authorization,'Bearer opaque-verified-token');return Response.json(old);},createUser:async p=>{assert.equal(p.password,input.password);assert.deepEqual(p.data.app_metadata,mapping);assert.equal(p.data.user_metadata.roles,undefined);return{id:newId,email:old.email,appMetadata:mapping};},listUsers:async()=>[],...extra};}
(async()=>{
 assert.deepEqual(await migrate({...input,id:'FORGED',app_metadata:{legacy_profile_id:'FORGED'}},opts()),{ok:true});
 let created=0;await assert.rejects(migrate(input,opts({createUser:async()=>created++,fetchImpl:async()=>Response.json({}, {status:401})})),e=>e.status===401);assert.equal(created,0);
 await assert.rejects(migrate(input,opts({fetchImpl:async url=>Response.json(url.endsWith('/token')?{access_token:'token'}:{...old,id:'forged'})})),e=>e.status===401);
 await assert.rejects(migrate(input,opts({fetchImpl:async url=>Response.json(url.endsWith('/token')?{access_token:'token'}:{...old,email:'other@example.com'})})),e=>e.status===401);
 const duplicate=opts({createUser:async()=>{throw Error('duplicate');},listUsers:async()=>[{id:newId,email:old.email,appMetadata:mapping}]});assert.deepEqual(await migrate(input,duplicate),{ok:true});
 let updates=0;const conflict=opts({createUser:async()=>{throw Error('duplicate');},listUsers:async()=>[{id:newId,email:old.email,appMetadata:{}}],updateUser:async()=>updates++});
 await assert.rejects(migrate(input,conflict),e=>e.status===409);assert.equal(updates,0);
 await assert.rejects(migrate(input,{...conflict,currentUser:async()=>({id:oldId,email:old.email})}),e=>e.status===409);assert.equal(updates,0);
 assert.deepEqual(await migrate(input,{...conflict,currentUser:async()=>({id:newId,email:old.email}),updateUser:async(id,attrs)=>{updates++;assert.equal(id,newId);assert.deepEqual(attrs,{app_metadata:mapping});return{id,appMetadata:attrs.app_metadata};}}),{ok:true});assert.equal(updates,1);
 assert.equal(profileIdentity({id:newId,user_metadata:mapping}).id,newId);assert.equal(profileIdentity({id:newId,app_metadata:{...mapping,legacy_source:'evil'}}).id,newId);assert.equal(profileIdentity({id:newId,app_metadata:mapping}).id,oldId);
 const profile={id:oldId,username:'OldPlayer',xp:12345,games:7,wallet:{version:1,revision:2,stars:500},rewards:{version:1}};
 const store={get:async key=>key==='profile/'+oldId?structuredClone(profile):null,mutate:async()=>{throw Error('Should not change imported profile');}};
 assert.deepEqual(await ensureProfile(store,{id:newId,app_metadata:mapping}),profile);
 const api=createAPI({store,authenticate:async()=>null,createIdentityUser:opts().createUser,listIdentityUsers:async()=>[],legacyFetch:opts().fetchImpl});
 const req=(origin,body=input)=>new Request('https://bankiwebtar.test/api/legacy-login',{method:'POST',headers:{'Content-Type':'application/json','X-Utos-Request':'1',origin},body:JSON.stringify(body)});
 assert.equal((await api(req('https://evil.test'))).status,403);const response=await api(req('https://bankiwebtar.test'));assert.equal(response.status,200);const text=await response.text();assert(!text.includes(input.password));assert(!text.includes('opaque'));assert(!text.includes(old.email));assert.equal(response.headers.get('Cache-Control'),'no-store');
 console.log('PASS legacy proof, fixed origin, forged-user rejection, no role migration, duplicate/race retry, double-proof links, password nonreplacement, canonical imported XP/wallet, CSRF and no-secret response');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
