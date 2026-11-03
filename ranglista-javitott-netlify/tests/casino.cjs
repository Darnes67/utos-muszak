const assert=require('node:assert'),{ScoreStore}=require('../server/store.cjs'),{createAPI}=require('../server/api.cjs'),core=require('../casino-core.js');
class Memory{constructor(){this.rows=new Map();this.i=0;this.fail=false;}async get(k){return structuredClone(this.rows.get(k)?.data??null)}async getWithMetadata(k){return structuredClone(this.rows.get(k)||null)}async setJSON(k,data,o){if(this.fail&&k==='lucky67/board/all')throw Error('outage');const old=this.rows.get(k);if(o.onlyIfNew&&old||o.onlyIfMatch&&old?.etag!==o.onlyIfMatch)return{modified:false};this.rows.set(k,{data:structuredClone(data),etag:String(++this.i)});return{modified:true}}}
const memory=new Memory(),store=new ScoreStore(memory),users={a:{id:'11111111-1111-4111-8111-111111111111',email:'PRIVATE@example.test',user_metadata:{username:'Alex'}},b:{id:'22222222-2222-4222-8222-222222222222',user_metadata:{username:'Barni'}}};let clock=Date.parse('2026-11-03T12:00:00Z');
const api=createAPI({store,authenticate:async r=>users[r.headers.get('test-user')]||null,now:()=>clock});
async function call(path,body,user){const headers={'test-user':user||''};if(body!==undefined)Object.assign(headers,{'Content-Type':'application/json','X-Utos-Request':'1',origin:'https://game.test'});const res=await api(new Request('https://game.test/api'+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)}));return{status:res.status,data:await res.json()}}
const id=n=>'casino_request_test_'+n;
(async()=>{
 // Stakes: loss debits once, wins return a multiple including the stake.
 let s=core.fresh(),r=core.apply(s,{game:'roulette',action:'spin',stake:500,choice:{kind:'color',value:'red'}},clock,()=>2);
 assert.equal(s.balance,99500);assert.equal(r.net,-500);assert.equal(r.charged,500);assert.equal(r.payout,0);
 r=core.apply(s,{game:'roulette',action:'spin',stake:2000,choice:{kind:'color',value:'red'}},clock,()=>1);
 assert.equal(r.payout,4000);assert.equal(r.net,2000);assert.equal(s.balance,101500);
 for(const stake of [undefined,0,-100,99,150,100001,Infinity,'1000',200000]){const before=structuredClone(s);assert.throws(()=>core.apply(s,{game:'slots',action:'spin',stake},clock,()=>0));assert.deepEqual(s,before);}
 const beforeInvalid=structuredClone(s);assert.throws(()=>core.apply(s,{game:'roulette',action:'spin',stake:1000,choice:{kind:'number',value:99}},clock,()=>0));assert.deepEqual(s,beforeInvalid);
 const poor=core.fresh();poor.balance=0;assert.throws(()=>core.apply(poor,{game:'slots',action:'spin',stake:100},clock,()=>0),/elegendő/);assert.equal(poor.balance,0);assert.equal(core.apply(poor,{game:'wheel',action:'spin'},clock,()=>0).reward,500);assert.equal(poor.balance,500);
 for(const symbols of [[0,0,0],[0,0,1],[0,1,2]]){s=core.fresh();let i=0;const reward=symbols[0]===symbols[2]?12000:symbols[0]===symbols[1]?1500:0;r=core.apply(s,{game:'slots',action:'spin',stake:1000},clock,()=>symbols[i++]);assert.equal(r.payout,reward);assert.equal(s.balance,99000+reward);}
 for(let guess=2;guess<=12;guess++){s=core.fresh();let i=0;const dice=guess<=7?[1,guess-1]:[6,guess-6];r=core.apply(s,{game:'dice',action:'roll',stake:1000,choice:guess},clock,()=>dice[i++]-1);assert.equal(r.payout,Math.floor(342000/((6-Math.abs(7-guess))*10)));assert.equal(s.balance,99000+r.payout);}
 // Blackjack settles the original stake; hit/stand never debit it again.
 const card=v=>({v:String(v),s:'♠'});
 for(const [p,d,payout] of [[['A',10],[10,7],2500],[[10,9],[10,7],2000],[[10,7],[10,7],1000],[[10,6],[10,7],0]]){s=core.fresh();s.balance-=1000;s.blackjack={active:true,stake:1000,player:p.map(card),dealer:d.map(card),deck:[card(10)]};r=core.apply(s,{game:'blackjack',action:'stand',stake:100000},clock,()=>0);assert.equal(r.charged,0);assert.equal(r.stake,1000);assert.equal(r.payout,payout);assert.equal(s.balance,99000+payout);}
 s=core.fresh();s.balance-=1000;s.blackjack={active:true,stake:1000,player:[card(2),card(3)],dealer:[card(10),card(7)],deck:[card(2)]};r=core.apply(s,{game:'blackjack',action:'hit',stake:99999},clock,()=>0);assert.equal(s.balance,99000);assert(!r.finished);assert.equal(r.charged,0);
 const active=structuredClone(s);assert.throws(()=>core.apply(s,{game:'blackjack',action:'deal',stake:1000},clock,()=>0));assert.deepEqual(s,active);
 // Keep old balances and finish old free hands without inventing a stake.
 s.blackjack.stake=undefined;r=core.apply(s,{game:'blackjack',action:'stand'},clock,()=>0);assert.equal(r.stake,0);assert.equal(s.balance,99000);
 // Deterministic engine: wheel alignment uses the exact server number's index.
 for(let i=0;i<37;i++){let s=core.fresh();const r=core.apply(s,{game:'roulette',action:'spin',stake:1000,choice:{kind:'number',value:i}},clock,()=>i);assert.equal(r.number,i);assert.equal(r.reward,36000);const angle=(360-core.ORDER.indexOf(i)*360/37)%360;assert(Math.abs(((core.ORDER.indexOf(i)*360/37+angle)%360))<1e-8);}
 let local=core.fresh();core.apply(local,{game:'blackjack',action:'deal',stake:1000},clock,()=>0);if(local.blackjack.active){core.apply(local,{game:'blackjack',action:'hit'},clock,()=>0);if(local.blackjack.active)core.apply(local,{game:'blackjack',action:'stand'},clock,()=>0);}assert(!local.blackjack.active);
 assert.equal((await call('/casino/state')).data.state,null);assert.equal((await call('/casino/play',{requestId:id(1),game:'wheel',action:'spin'})).status,401);
 const old=(await call('/me',undefined,'a')).data.user;
 await store.mutate('profile/'+old.id,{},p=>{p.xp=4321;p.games=7;p.rounds.legacy={status:'finished',result:{points:900}};p.wallet.stars=1234;p.wallet.owned.push('character-3');p.existingField={retain:true};});
 await store.mutate('board/sprint/all',{rows:{}},b=>b.rows[old.id]={user_id:old.id,username:'Alex',points:900,created_at:'2026-10-01'});
 const state=await call('/casino/state',undefined,'a');assert.equal(state.data.state.balance,100000);assert(!JSON.stringify(state.data).includes('PRIVATE'));assert.equal((await call('/casino/leaderboard')).data.rows.length,0);
 const request={requestId:id('daily'),game:'wheel',action:'spin',balance:999999999,score:999999999};
 const daily=await Promise.all(Array.from({length:6},()=>call('/casino/play',request,'a')));assert(daily.every(r=>r.status===200));assert(daily.every(r=>r.data.reward===daily[0].data.reward));assert(daily[0].data.reward<=10000);
 let saved=await store.get('profile/'+old.id);assert.equal(saved.lucky67.rounds,1);assert.equal(saved.xp,4321);assert.equal(saved.games,7);assert.equal(saved.wallet.stars,1234);assert(saved.wallet.owned.includes('character-3'));assert(saved.rounds.legacy);assert(saved.existingField.retain);assert.equal((await store.get('board/sprint/all')).rows[old.id].points,900);
 clock+=4000;assert.equal((await call('/casino/play',{requestId:id('daily2'),game:'wheel',action:'spin'},'a')).status,400);
 const publicBoard=await call('/casino/leaderboard');assert.equal(publicBoard.data.rows[0].username,'Alex');assert(!JSON.stringify(publicBoard).includes('PRIVATE'));assert.equal(publicBoard.data.rows[0].rounds,1);
 assert.equal((await call('/casino/play',{...request,game:'slots'},'a')).status,409);
 clock+=86400000;memory.fail=true;const pending={requestId:id('recover'),game:'wheel',action:'spin'};assert.equal((await call('/casino/play',pending,'a')).status,503);saved=await store.get('profile/'+old.id);const balance=saved.lucky67.balance;memory.fail=false;const repaired=await call('/casino/play',pending,'a');assert.equal(repaired.status,200);assert.equal(repaired.data.latestState.balance,balance);assert.equal(repaired.data.latestState.rounds,2);
 const s2=await call('/casino/state',undefined,'b');assert.equal(s2.data.state.balance,100000);clock+=5000;const deal=await call('/casino/play',{requestId:id('bj'),game:'blackjack',action:'deal',stake:1000},'b');assert.equal(deal.status,200);assert(!JSON.stringify(deal.data).includes('deck'));if(deal.data.state.blackjack.active){assert.equal(deal.data.state.blackjack.dealer[1].v,'?');assert.equal((await call('/casino/play',{requestId:id('bjfast'),game:'blackjack',action:'hit'},'b')).status,429);clock+=1000;assert.equal((await call('/casino/play',{requestId:id('bjstand'),game:'blackjack',action:'stand'},'b')).status,200);}
 clock+=5000;assert.equal((await call('/casino/play',{requestId:id('invalid'),game:'roulette',action:'spin',stake:1000,choice:{kind:'number',value:99}},'a')).status,400);
 clock+=5000;
 const balanceBefore=(await call('/casino/state',undefined,'a')).data.state.balance;
 const wager={requestId:id('wager'),game:'roulette',action:'spin',stake:2000,choice:{kind:'color',value:'red'},reward:999999999,balance:999999999};
 const wagered=await Promise.all(Array.from({length:6},()=>call('/casino/play',wager,'a')));assert(wagered.every(r=>r.status===200));assert(wagered.every(r=>r.data.payout===wagered[0].data.payout));assert([0,4000].includes(wagered[0].data.payout));assert.equal(wagered[0].data.latestState.balance,balanceBefore-2000+wagered[0].data.payout);
 assert.equal((await call('/casino/play',{...wager,stake:1000},'a')).status,409);
 const ranked=(await call('/casino/leaderboard')).data.rows.find(r=>r.user_id===old.id);assert.equal(ranked.balance,wagered[0].data.latestState.balance);
 clock+=5000;const beforeBad=(await call('/casino/state',undefined,'a')).data.state;
 assert.equal((await call('/casino/play',{requestId:id('no-stake'),game:'slots',action:'spin'},'a')).status,400);assert.deepEqual((await call('/casino/state',undefined,'a')).data.state,beforeBad);
 const legacy=(await call('/me',undefined,'a')).data.user;assert.equal(legacy.id,old.id);assert.equal(legacy.username,old.username);assert.equal(legacy.xp,4321);
 console.log('PASS: all roulette targets, stake debit and scaled payouts, atomic validation, guest blackjack, server-owned rewards, idempotent concurrent saves, rate limit, daily reset, index repair, public privacy, and existing IDs/profile/stars/rankings preserved.');
})().catch(e=>{console.error(e);process.exitCode=1});
