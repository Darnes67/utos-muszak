'use strict';
const {randomInt}=require('node:crypto'),core=require('../casino-core.js'),{HttpError,profileKey}=require('./store.cjs');
const BOARD='lucky67/board/all';
function ensure(p){if(!p.lucky67)p.lucky67=core.fresh();return p.lucky67;}
async function index(store,p,now){
 const s=p.lucky67;if(!s||!s.rounds)return;
 await store.mutate(BOARD,{rows:{}},b=>{const old=b.rows[p.id];if(!old||s.revision>=old.revision)b.rows[p.id]={user_id:p.id,username:p.username,balance:s.balance,best:s.best,rounds:s.rounds,revision:s.revision,updated_at:new Date(now).toISOString()};});
}
async function leaderboard(store){const b=await store.get(BOARD)||{rows:{}};return Object.values(b.rows).sort((a,b)=>b.balance-a.balance||a.updated_at.localeCompare(b.updated_at)||a.user_id.localeCompare(b.user_id)).slice(0,50).map((r,i)=>({user_id:r.user_id,username:r.username,balance:r.balance,best:r.best,rounds:r.rounds,place:i+1}));}
async function state(store,profile){if(!profile)return{state:null};const p=await store.mutate(profileKey(profile.id),profile,p=>{ensure(p);return p;});await index(store,p,Date.now());return{state:core.view(p.lucky67),player:{id:p.id,username:p.username}};}
async function play(store,profile,input,now){
 if(!profile)throw new HttpError(401,'Ranglistás játékhoz jelentkezz be a Bánki Webtárba.');
 if(typeof input.requestId!=='string'||!/^[A-Za-z0-9_-]{16,80}$/.test(input.requestId))throw new HttpError(400,'Érvénytelen kérésazonosító.');
 const signature=JSON.stringify([input.game,input.action,input.choice??null]);let result;
 const p=await store.mutate(profileKey(profile.id),profile,p=>{
  const s=ensure(p),duplicate=s.receipts.find(r=>r.id===input.requestId);
  if(duplicate){if(duplicate.signature!==signature)throw new HttpError(409,'Ezt a kérésazonosítót már más művelethez használtad.');result=duplicate.result;return p;}
  const delay=input.game==='blackjack'?450:2800;
  if(now-s.lastAt<delay)throw new HttpError(429,'Várd meg az előző animáció végét, majd próbáld újra.');
  try{result=core.apply(s,input,now,randomInt);}catch(e){throw new HttpError(400,e.message);}
  s.receipts.push({id:input.requestId,signature,result});s.receipts=s.receipts.slice(-64);return p;
 });
 // Retry repairs an interrupted public index write without a second reward.
 await index(store,p,now);return{...result,latestState:core.view(p.lucky67),player:{id:p.id,username:p.username}};
}
module.exports={state,play,leaderboard};
