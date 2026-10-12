'use strict';
const assert=require('node:assert'),economy=require('../economy.js'),{ScoreStore}=require('../server/store.cjs'),{createAPI}=require('../server/api.cjs'),{initialEarnings,verifyEarnings}=require('../server/engine.cjs');
const fixture=require('./fixture.json');
class MemoryBlobs{constructor(){this.data=new Map();this.serial=0;this.fail=false;}async get(k){return structuredClone(this.data.get(k)?.data??null);}async getWithMetadata(k){return structuredClone(this.data.get(k)??null);}async setJSON(k,data,options){if(this.fail)throw Error('offline');const old=this.data.get(k);if(options.onlyIfNew&&old||options.onlyIfMatch&&old?.etag!==options.onlyIfMatch)return{modified:false};this.data.set(k,{data:structuredClone(data),etag:String(++this.serial)});return{modified:true};}}
const blobs=new MemoryBlobs(),store=new ScoreStore(blobs),id='33333333-3333-4333-8333-333333333333',key='profile/'+id;
let clock=Date.parse('2026-10-12T22:00:00Z');
const api=createAPI({store,authenticate:async req=>req.headers.get('x-test')?{id,user_metadata:{username:'StarTester'}}:null,now:()=>clock});
async function call(path,input,auth=true){const response=await api(new Request('https://game.test/api'+path,{method:input===undefined?'GET':'POST',headers:{...(auth?{'x-test':'yes'}:{}),...(input!==undefined?{'X-Utos-Request':'1','Content-Type':'application/json',Origin:'https://game.test'}:{})},body:input===undefined?undefined:JSON.stringify(input)}));return {status:response.status,data:await response.json()};}
const config={mode:'free',map:0,tool:0,character:0,sensitivity:1,autoGetup:true,gravity:100,invite:true};
function freeEvents(){return [[0,'down',{x:870,y:418}],...fixture.events.map(([tick,kind,x,y])=>[tick+900,['move','down','release','release'][kind],kind<2?{x,y}:kind===3?true:false])];}
(async()=>{
 assert.equal((await call('/earnings/start',{requestId:'start_request_0000001',config},false)).status,401);
 const started=await call('/earnings/start',{requestId:'start_request_0000001',config});assert.equal(started.status,200);const ticket=started.data.ticket;assert.equal(started.data.user.wallet.stars,0);
 const again=await call('/earnings/start',{requestId:'start_request_0000001',config});assert.equal(again.data.ticket.id,ticket.id);
 const ev=freeEvents();let snapshot=initialEarnings(ticket),expectedHits=0,paid=0,seq=0;
 for(let from=0;from<6300;from+=900){
  const events=ev.filter(e=>e[0]>=from&&e[0]<from+900).map(e=>[e[0]-from,e[1],e[2]]),ticks=900;
  const part=verifyEarnings(snapshot,events,ticks);snapshot=part.snapshot;expectedHits+=part.stats.hits;
  const payload={sessionId:ticket.id,seq,ticks,events,stars:100000,achievements:['tools6']};
  if(seq===0){assert.equal((await call('/earnings/claim',payload)).status,400);}
  clock+=7500;
  const res=await call('/earnings/claim',payload);assert.equal(res.status,200,JSON.stringify(res.data));paid+=res.data.stars;
  assert.equal(res.data.hitStars,part.hitStars);assert.equal(res.data.user.wallet.stars,paid);assert(res.data.hitStars<=7);
  const duplicate=await call('/earnings/claim',payload);assert.equal(duplicate.status,200);assert.equal(duplicate.data.user.wallet.stars,paid);seq++;
 }
 assert(expectedHits>10);const me=await call('/me');assert(me.data.user.wallet.stars>30);assert(me.data.user.wallet.achievements.includes('first'));assert(me.data.user.wallet.achievements.includes('combo5'));assert(!me.data.user.wallet.achievements.includes('tools6'));
 const saved=await store.get(key);assert.equal(saved.rewards.hits,expectedHits);assert.equal(saved.rewards.paid.length,new Set(saved.rewards.paid).size);
 const before=saved.wallet.stars;
 // A restarted session carries the same token bucket; starting/calling/getting up cannot mint stars.
 const restart=await call('/earnings/start',{requestId:'start_request_0000002',config});assert.equal(restart.status,200);clock+=3000;
 const idle=await call('/earnings/claim',{sessionId:restart.data.ticket.id,seq:0,ticks:360,events:[[0,'stand',null],[1,'objects',null],[2,'invite',null],[3,'mode',{mode:'free',map:0}]]});assert.equal(idle.status,200);assert.equal(idle.data.hitStars,0);assert.equal(idle.data.user.wallet.stars,before);
 // Equipment is checked against server ownership; client money/achievement claims are ignored.
 clock+=3000;assert.equal((await call('/earnings/claim',{sessionId:restart.data.ticket.id,seq:1,ticks:360,events:[[0,'equipment',{tool:5,character:0}]]})).status,400);
 blobs.fail=true;assert.equal((await call('/earnings/claim',{sessionId:restart.data.ticket.id,seq:1,ticks:360,events:[]})).status,503);blobs.fail=false;
 assert.equal((await call('/earnings/claim',{sessionId:restart.data.ticket.id,seq:1,ticks:360,events:[]})).status,200);
 const round=(await call('/round/start',{kind:'sprint'})).data.ticket;
 assert.equal((await call('/earnings/start',{requestId:'start_request_0000003',config})).status,409);
 clock+=46000;const finish=await call('/round/finish',{roundId:round.id,ticks:5400,events:fixture.events});assert.equal(finish.status,200);assert(finish.data.result.achievements.some(a=>a.id==='record'));
 const balance=finish.data.user.wallet.stars;await call('/round/finish',{roundId:round.id});assert.equal((await call('/me')).data.user.wallet.stars,balance);
 // Every achievement is paid only once, even under CAS retries and concurrent checks.
 const rewards=require('../server/rewards.cjs');await store.mutate(key,null,p=>{rewards.award(p,{hits:50,cones:3,maxCombo:5,tools:[0,1,2,3,4,5],maps:[0,1,2],badges:['perfect','record']});});
 const all=await store.get(key),after=all.wallet.stars;assert.equal(all.rewards.paid.length,8);
 await Promise.all(Array.from({length:4},()=>store.mutate(key,null,p=>rewards.award(p,{badges:economy.achievements.map(a=>a.id)}))));assert.equal((await store.get(key)).wallet.stars,after);
 assert.equal(economy.achievements.reduce((n,a)=>n+a.reward,0),115);
 console.log('PASS: automatic free-play physics replay, segmented state continuity, held-click swings, 30+ earned stars, server-owned prices/rewards, achievement backfill and eight one-time bonuses, duplicate claims, timing limit, restart token continuity, no rewards for setup, server ownership, storage failure/retry, competitive isolation.');
})().catch(e=>{console.error(e);process.exitCode=1});
