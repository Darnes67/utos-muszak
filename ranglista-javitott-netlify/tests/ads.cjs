'use strict';
const assert=require('node:assert/strict'),ads=require('../server/ads.cjs'),{ScoreStore}=require('../server/store.cjs'),{createAPI}=require('../server/api.cjs');
class MemoryBlobs{constructor(){this.data=new Map();this.serial=0;this.fail=false;}async get(k){return structuredClone(this.data.get(k)?.data??null);}async getWithMetadata(k){return structuredClone(this.data.get(k)??null);}async setJSON(k,data,o){if(this.fail)throw Error('offline');const old=this.data.get(k);if(o.onlyIfNew&&old||o.onlyIfMatch&&old?.etag!==o.onlyIfMatch)return{modified:false};this.data.set(k,{data:structuredClone(data),etag:String(++this.serial)});return{modified:true};}}
const c=ads.config({enabled:true,adUnitPath:'/123456789/utos_rewarded',externalCmp:true}),blobs=new MemoryBlobs(),store=new ScoreStore(blobs),ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];let now=Date.parse('2026-10-14T13:00:00Z'),counter=0;
const api=createAPI({store,adConfig:c,now:()=>now,authenticate:async req=>req.headers.get('x-user')?{id:ids[Number(req.headers.get('x-user'))-1],user_metadata:{username:'AdTester'+req.headers.get('x-user')}}:null});
async function call(path,data,user=1){const r=await api(new Request('https://game.test/api'+path,{method:data===undefined?'GET':'POST',headers:{...(user?{'x-user':String(user)}:{}),...(data===undefined?{}:{'Content-Type':'application/json','X-Utos-Request':'1',Origin:'https://game.test'})},body:data===undefined?undefined:JSON.stringify(data)}));return{status:r.status,data:await r.json()};}
const start=()=>call('/ads/start',{requestId:'ad_request_'+String(++counter).padStart(8,'0')});
const input=t=>({ticketId:t.id,token:t.token,event:'rewardedSlotGranted',providerReward:{amount:300,type:'stars'}});
(async()=>{
 assert.equal(ads.config().configured,false);assert.equal(ads.config({enabled:true,adUnitPath:'/1234/a'}).configured,false);assert.equal(c.configured,true);
 assert.equal((await call('/ads/status',undefined,0)).data.ads.reward,300);assert.equal((await call('/ads/start',{requestId:'ad_request_00000000'},0)).status,401);
 let t=(await start()).data.ticket;
 assert.equal((await call('/ads/start',{requestId:'ad_request_00000001'})).data.ticket.id,t.id);assert.equal((await start()).status,409);
 assert.equal((await call('/ads/claim',input(t))).status,409);assert.equal((await call('/ads/show',input(t),2)).status,404);
 assert.equal((await call('/ads/show',input(t))).status,200);assert.equal((await call('/ads/claim',input(t))).status,400);now+=6000;
 assert.equal((await call('/ads/claim',{...input(t),providerReward:{amount:99999,type:'stars'}})).status,400);
 assert.equal((await call('/ads/claim',{...input(t),event:'rewardedSlotClosed'})).status,400);
 const race=await Promise.all([call('/ads/claim',input(t)),call('/ads/claim',input(t)),call('/ads/claim',input(t))]);assert(race.every(r=>r.status===200));assert.equal(race.filter(r=>!r.data.receipt.duplicate).length,1);
 let me=(await call('/me')).data.user;assert.equal(me.wallet.stars,300);assert.equal(me.xp,0);assert.equal(me.games,0);assert.equal((await start()).status,429);assert(!JSON.stringify(me).includes(t.token));
 for(let i=0;i<2;i++){now+=120000;t=(await start()).data.ticket;await call('/ads/show',input(t));now+=6000;assert.equal((await call('/ads/claim',input(t))).data.receipt.stars,300);}
 assert.equal((await call('/me')).data.user.wallet.stars,900);assert.equal((await call('/ads/status')).data.ads.remaining,0);now+=120000;assert.equal((await start()).status,429);
 assert.equal((await call('/leaderboard?kind=sprint&period=all')).data.rows.length,0);
 now=Date.parse('2026-10-15T13:00:00Z');assert.equal((await call('/ads/status')).data.ads.remaining,3);t=(await start()).data.ticket;await call('/ads/cancel',input(t));assert.equal((await call('/ads/claim',input(t))).status,409);
 t=(await start()).data.ticket;await call('/ads/show',input(t));now+=600001;assert.equal((await call('/ads/claim',input(t))).status,410);
 now+=120000;t=(await start()).data.ticket;await call('/ads/show',input(t));now+=6000;blobs.fail=true;assert.equal((await call('/ads/claim',input(t))).status,503);blobs.fail=false;assert.equal((await call('/me')).data.user.wallet.stars,900);
 assert.equal((await call('/ads/claim',input(t))).data.receipt.stars,300);const paid=(await call('/me')).data.user.wallet.stars;assert.equal((await call('/ads/claim',input(t))).data.receipt.duplicate,true);assert.equal((await call('/me')).data.user.wallet.stars,paid);
 await call('/round/start',{kind:'sprint'});now+=120000;assert.equal((await start()).status,409);
 const disabled=createAPI({store,authenticate:async()=>({id:ids[1]}),now:()=>now});const off=await disabled(new Request('https://game.test/api/ads/start',{method:'POST',headers:{'Content-Type':'application/json','X-Utos-Request':'1'},body:JSON.stringify({requestId:'ad_request_disabled'})}));assert.equal(off.status,503);
 console.log('PASS: ads server 300-star CAS credit, concurrent/repeated claims once, account binding, cap 3/day, cooldown, UTC reset, cancellation/expiry/storage failure, no XP/ranking change, inactive provider cannot award.');
})().catch(e=>{console.error(e);process.exitCode=1});
