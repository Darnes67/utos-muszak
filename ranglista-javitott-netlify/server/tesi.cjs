'use strict';
const C=require('../games/tesi-core.js');
const{HttpError}=require('./store.cjs');
const key=id=>'tesi/player/'+id;
const BOARD='tesi/board/all';
function fresh(now){return{version:1,state:C.fresh(),revision:0,at:now,activeUntil:now,autoFraction:0,manualTokens:1,combo:0,lastTrain:0,boostUntil:0,challenge:null,receipts:[]};}
function settle(p,now){
 const delta=Math.max(0,now-p.at)/1000,active=Math.max(0,Math.min(delta,(p.activeUntil-p.at)/1000)),away=Math.min(7200,Math.max(0,delta-active));
 const s=p.state,rate=Number.isFinite(C.interval(s))?s.levels.students/Math.max(C.interval(s),C.duration(s)):0;
 // Bonus applies only to the part of online elapsed time inside the server's boost window.
 const boosted=Math.max(0,Math.min(active,(p.boostUntil-p.at)/1000));
 const reps=rate*(active+away*C.offlineEfficiency(s))+p.autoFraction,n=Math.floor(reps);p.autoFraction=reps-n;
 if(n)C.credit(s,Math.floor(n*C.reward(s)+rate*boosted*C.reward(s)),n);
 p.manualTokens=Math.min(8,p.manualTokens+delta/C.duration(s));p.at=Math.max(now,p.at);C.awards(s);
}
function apply(p,a,now){const s=p.state;
 switch(a.type){
 case'train':{
  const count=a.count??1;if(!Number.isInteger(count)||count<1||count>40)throw new HttpError(400,'Hibás edzés.');
  const accepted=Math.min(count,Math.floor(p.manualTokens));p.manualTokens-=accepted;if(!accepted)break;
  p.combo=now-p.lastTrain<=C.comboWindow(s)*1000?Math.min(25,p.combo+accepted):accepted;p.lastTrain=now;
  const reps=accepted*Math.min(s.levels.students,1+s.levels.whistle);s.clicks+=accepted;
  C.credit(s,Math.floor(reps*C.reward(s)*C.comboBonus(s,p.combo)*(now<p.boostUntil?2:1)),reps);
  if(p.challenge&&now<=p.challenge.until){p.challenge.count+=accepted;if(p.challenge.count>=12){p.boostUntil=now+30000;p.challenge=null;}}
  break;
 }
 case'buy':if(!Object.hasOwn(C.defs,a.key)||typeof a.max!=='boolean')throw new HttpError(400,'Hibás fejlesztés.');C.buy(s,a.key,a.max);break;
 case'daily':{const day=new Date(now).toISOString().slice(0,10);if(s.daily!==day){s.daily=day;C.credit(s,C.dailyReward(s));}break;}
 case'prestige':if(C.prestige(s)){p.manualTokens=1;p.autoFraction=0;p.combo=0;p.challenge=null;p.boostUntil=0;}break;
 case'challenge':if(now>=p.boostUntil&&(!p.challenge||now>p.challenge.until))p.challenge={count:0,until:now+20000};break;
 default:throw new HttpError(400,'Ismeretlen edzésművelet.');
 }C.awards(s);
}
function output(p,now){return{state:p.state,revision:p.revision,serverTime:now,boostSeconds:Math.max(0,(p.boostUntil-now)/1000),challenge:p.challenge&&now<p.challenge.until?{count:p.challenge.count,left:(p.challenge.until-now)/1000}:null};}
async function index(store,profile,p){const row={user_id:profile.id,username:profile.username,earned:p.state.earned,reps:p.state.reps,schoolYears:p.state.schoolYears,medals:p.state.medals,revision:p.revision};await store.mutate(BOARD,{rows:{}},b=>{if(!b.rows[profile.id]||b.rows[profile.id].revision<=row.revision)b.rows[profile.id]=row;});}
async function state(store,profile,now){if(!profile)throw new HttpError(401,'A ranglistás játékhoz jelentkezz be!');const p=await store.get(key(profile.id));return output(p||fresh(now),now);}
async function action(store,profile,input,now){
 if(!profile)throw new HttpError(401,'A ranglistás játékhoz jelentkezz be!');
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['revision','requestId','actions'].includes(k))||!Number.isSafeInteger(input.revision)||input.revision<0||typeof input.requestId!=='string'||!/^[a-f0-9-]{36}$/i.test(input.requestId)||!Array.isArray(input.actions)||input.actions.length>32)throw new HttpError(400,'Hibás mentési kérés.');
 for(const a of input.actions)if(!a||typeof a!=='object'||Array.isArray(a)||Object.keys(a).some(k=>!['type','count','key','max'].includes(k)))throw new HttpError(400,'Hibás edzésművelet.');
 const p=await store.mutate(key(profile.id),fresh(now),current=>{
  if(current.receipts.includes(input.requestId))return current;
  if(current.revision!==input.revision)throw new HttpError(409,'A mentés egy másik ablakban változott. Töltsd újra a ranglistás játékot!');
  settle(current,now);for(const a of input.actions)apply(current,a,now);
  current.activeUntil=now+20000;current.revision++;current.state.lastSave=now;current.receipts.push(input.requestId);current.receipts=current.receipts.slice(-64);return current;
 });await index(store,profile,p);return output(p,now);
}
async function leaderboard(store,sort='earned'){if(!['earned','reps','schoolYears','medals'].includes(sort))throw new HttpError(400,'Ismeretlen ranglista.');const b=await store.get(BOARD)||{rows:{}};return Object.values(b.rows).sort((a,b)=>b[sort]-a[sort]||b.earned-a.earned||a.user_id.localeCompare(b.user_id)).slice(0,100).map(({revision,...row},i)=>({...row,place:i+1}));}
module.exports={fresh,settle,apply,state,action,leaderboard};
