'use strict';
const assert=require('node:assert'),economy=require('../economy.js'),{ScoreStore}=require('../server/store.cjs'),{createAPI}=require('../server/api.cjs');
const fixture=require('./fixture.json');
class MemoryBlobs{
 constructor(){this.data=new Map();this.serial=0;this.fail=false;}
 async get(k){return structuredClone(this.data.get(k)?.data??null);}
 async getWithMetadata(k){return structuredClone(this.data.get(k)??null);}
 async setJSON(k,data,options){if(this.fail)throw Error('storage offline');const old=this.data.get(k);if(options.onlyIfNew&&old||options.onlyIfMatch&&old?.etag!==options.onlyIfMatch)return {modified:false};this.data.set(k,{data:structuredClone(data),etag:String(++this.serial)});return {modified:true};}
}
const blobs=new MemoryBlobs(),store=new ScoreStore(blobs),id='11111111-1111-4111-8111-111111111111',key='profile/'+id;
let clock=Date.parse('2026-10-12T20:00:00Z');
const api=createAPI({store,authenticate:async req=>req.headers.get('x-user')?{id,user_metadata:{username:'ShopTester'}}:null,now:()=>clock});
let serial=0;const tx=()=>('transaction_'+String(++serial).padStart(10,'0'));
async function call(path,input,auth=true){const r=await api(new Request('https://game.test/api'+path,{method:input===undefined?'GET':'POST',headers:{...(auth?{'x-user':'yes'}:{}),...(input!==undefined?{'Content-Type':'application/json','X-Utos-Request':'1',Origin:'https://game.test'}:{})},body:input===undefined?undefined:JSON.stringify(input)}));return {status:r.status,data:await r.json()};}
(async()=>{
 const me=await call('/me');assert.deepEqual(me.data.user.wallet.owned,['tool-0','character-0']);assert.equal(me.data.user.wallet.stars,0);
 const poor=await call('/shop/buy',{itemId:'tool-1',transactionId:tx(),price:0,stars:99999});assert.equal(poor.status,402);assert.equal((await call('/me')).data.user.wallet.stars,0);
 assert.equal((await call('/shop/buy',{itemId:'tool-1',transactionId:tx()},false)).status,401);
 assert.equal((await call('/shop/equip',{itemId:'tool-5',transactionId:tx()})).status,403);
 assert.equal((await call('/round/start',{kind:'practice',map:0,tool:5,character:0})).status,403);
 const legacy=await call('/shop/legacy',{ids:['shirt-blue','particle-heart'],equipped:{shirt:'shirt-blue'},stars:1e8});assert.equal(legacy.data.user.wallet.stars,0);assert.equal(legacy.data.user.wallet.equipped.shirt,'shirt-blue');assert(legacy.data.user.wallet.owned.includes('shirt-blue'));
 await call('/shop/legacy',{ids:['shirt-pink']});assert(!(await call('/me')).data.user.wallet.owned.includes('shirt-pink'));
 const round=(await call('/round/start',{kind:'practice',map:0,tool:0,character:0})).data.ticket;
 assert.equal((await call('/shop/equip',{itemId:'shirt-blue',transactionId:tx()})).status,409);
 clock+=46000;const finish=await call('/round/finish',{roundId:round.id,events:fixture.events,ticks:5400,stars:999999});assert.equal(finish.status,200);assert.equal(finish.data.result.stars,33);assert.equal(finish.data.user.wallet.stars,68);
 const repeated=await call('/round/finish',{roundId:round.id});assert.equal(repeated.data.user.wallet.stars,68);assert.equal((await call('/leaderboard?kind=sprint&period=all')).data.rows.length,0);
 const loan=(await call('/round/start',{kind:'combo'})).data.ticket;assert.equal(loan.tool,1);assert(!(await call('/me')).data.user.wallet.owned.includes('tool-1'));await call('/round/cancel',{roundId:loan.id});
 assert.equal((await call('/round/finish',{roundId:loan.id,events:fixture.events,ticks:5400})).status,409);
 await store.mutate(key,null,p=>{p.wallet.stars=100000;});
 const transactionId=tx(),before=(await call('/me')).data.user.wallet.stars;
 const race=await Promise.all([call('/shop/buy',{itemId:'tool-1',transactionId,price:0}),call('/shop/buy',{itemId:'tool-1',transactionId,price:0})]);assert(race.every(r=>r.status===200));assert.equal((await call('/me')).data.user.wallet.stars,before-150);
 assert.equal((await call('/shop/buy',{itemId:'tool-2',transactionId})).status,409);
 for(const product of economy.products){
  const bought=await call('/shop/buy',{itemId:product.id,transactionId:tx()});assert.equal(bought.status,200,product.id);assert(bought.data.user.wallet.owned.includes(product.id));
  const equipped=await call('/shop/equip',{itemId:product.id,transactionId:tx()});assert.equal(equipped.status,200,product.id);assert.equal(equipped.data.user.wallet.equipped[product.category],product.id);
 }
 assert.equal((await call('/shop/equip',{itemId:null,category:'__proto__',transactionId:tx()})).status,400);
 const saved=await call('/me');assert.equal(saved.data.user.wallet.equipped.tool,'tool-5');assert(!JSON.stringify(saved.data).includes('transactions'));
 blobs.fail=true;assert.equal((await call('/shop/equip',{itemId:'tool-0',transactionId:tx()})).status,503);blobs.fail=false;assert.equal((await call('/me')).data.user.wallet.equipped.tool,'tool-5');
 for(const category of ['shirt','pattern','particle'])assert.equal((await call('/shop/equip',{itemId:null,category,transactionId:tx()})).data.user.wallet.equipped[category],null);
 // Existing server purchases and balances survive schema normalization.
 const preserved=economy.normalizeWallet({stars:123,owned:['tool-4','shirt-pink'],equipped:{tool:'tool-4',shirt:'shirt-pink'}});assert.equal(preserved.stars,123);assert.equal(preserved.equipped.tool,'tool-4');
 const migrated=economy.normalizeWallet({stars:55,owned:['shirt-blue'],equipped:{tool:'tool-5',character:'character-3',shirt:'shirt-blue'}});assert.equal(migrated.equipped.tool,'tool-0');assert.equal(migrated.equipped.character,'character-0');assert.equal(migrated.equipped.shirt,'shirt-blue');
 for(const combo of [1,5]){const m=economy.meter();for(let tick=0;tick<7200;tick++){economy.advance(m,1/120,combo);if(tick%120===0)economy.hit(m,'body');}assert(m.credits>=40&&m.credits<=50.01);}
 const idle=economy.meter();economy.advance(idle,1000,5);assert.equal(idle.credits,0);assert.equal(economy.hit(idle,'object','same'),0); // fractional object credit, no integer payout
 assert.equal(economy.hit(idle,'object','same'),0);
 console.log('PASS: verified star income, no duplicate round reward, all 27 product purchases/equipment, server prices, atomic concurrent purchase, missing balance, unowned rejection, challenge loan, cancellation, legacy cosmetics, server-state persistence, storage failure, 40–50 stars/minute cap.');
})().catch(e=>{console.error(e);process.exitCode=1});
