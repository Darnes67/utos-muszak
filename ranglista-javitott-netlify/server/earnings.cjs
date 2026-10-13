'use strict';
const {randomUUID}=require('node:crypto'),economy=require('../economy.js'),{HttpError}=require('./store.cjs'),{initialEarnings,verifyEarnings,ENGINE_VERSION}=require('./engine.cjs'),rewards=require('./rewards.cjs');
function config(input,p){
 const c=input.config,w=p.wallet;
 if(!c||!['free','score','tasks'].includes(c.mode)||!Number.isInteger(c.map)||c.map<0||c.map>2||!Number.isInteger(c.tool)||!economy.product("tool-"+c.tool)||!Number.isInteger(c.character)||!economy.product("character-"+c.character)||![.75,1,1.35].includes(c.sensitivity)||typeof c.autoGetup!=='boolean'||!Number.isFinite(c.gravity)||c.gravity<20||c.gravity>180||typeof c.invite!=='boolean')throw new HttpError(400,'Hibás játékbeállítás.');
 if(!w.owned.includes('tool-'+c.tool)||!w.owned.includes('character-'+c.character))throw new HttpError(403,'A csillaggyűjtéshez saját felszerelés szükséges.');
 if(c.ready!==undefined&&typeof c.ready!=='boolean'||c.held!==undefined&&typeof c.held!=='boolean'||c.pose!==undefined&&(!point(c.pose)||!Number.isFinite(c.pose.angle)||Math.abs(c.pose.angle)>Math.PI+1e-6))throw new HttpError(400,'Hibás kezdő póz.');
 return {...c};
}
function start(p,input,now){
 if(typeof input.requestId!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(input.requestId))throw new HttpError(400,'Hibás munkamenet-azonosító.');
 if(p.earning?.requestId===input.requestId)return p.earning;
 if(Object.values(p.rounds||{}).some(r=>r.status==='active'&&Date.parse(r.expiresAt)>now))throw new HttpError(409,'Előbb fejezd be a versenykört.');
 const starts=(p.earningStarts||[]).filter(t=>t>now-600000);if(starts.length>=20)throw new HttpError(429,'Túl sok új munkamenet. Várj néhány percet.');starts.push(now);p.earningStarts=starts;
 const ticket={id:randomUUID(),seed:740,config:config(input,p),meter:p.earningMeter||economy.meter()};
 const state={...ticket,requestId:input.requestId,engine:ENGINE_VERSION,seq:0,totalTicks:0,startedAt:now,expiresAt:now+86400000,snapshot:initialEarnings(ticket),receipt:null,active:true};p.earning=state;return state;
}
const point=v=>v&&Number.isFinite(v.x)&&Number.isFinite(v.y)&&v.x>=0&&v.x<=1000&&v.y>=0&&v.y<=560;
function validate(events,ticks,p){
 if(!Number.isInteger(ticks)||ticks<1||ticks>1200||!Array.isArray(events)||events.length>2400)throw new HttpError(400,'Hibás csillaggyűjtési napló.');
 let last=-1,count=0;
 for(const e of events){
  if(!Array.isArray(e)||e.length!==3||!Number.isInteger(e[0])||e[0]<last||e[0]<0||e[0]>=ticks)throw new HttpError(400,'Hibás bemeneti időpont.');
  count=e[0]===last?count+1:1;last=e[0];if(count>20)throw new HttpError(400,'Túl sűrű bemeneti napló.');
  const name=e[1],v=e[2];let valid=false;
  if(['move','down','grab'].includes(name))valid=point(v);
  if(['invite','stand','start','end','objects','hand'].includes(name))valid=v===null;
  if(name==='release')valid=v===null||typeof v==='boolean';if(name==='pause')valid=typeof v==='boolean';
  if(name==='mode')valid=v&&['free','score','tasks'].includes(v.mode)&&Number.isInteger(v.map)&&v.map>=0&&v.map<=2;
  if(name==='map')valid=Number.isInteger(v)&&v>=0&&v<=2;
  if(name==='equipment')valid=v&&Number.isInteger(v.tool)&&Number.isInteger(v.character)&&p.wallet.owned.includes('tool-'+v.tool)&&p.wallet.owned.includes('character-'+v.character);
  if(name==='prefs')valid=v&&[.75,1,1.35].includes(v.sensitivity)&&typeof v.autoGetup==='boolean'&&Number.isFinite(v.gravity)&&v.gravity>=20&&v.gravity<=180;
  if(name==='layout')valid=v&&Array.isArray(v.objects)&&Array.isArray(v.tramps)&&v.objects.length+v.tramps.length<=20&&v.objects.every(o=>['box','ball','cone'].includes(o.kind)&&point(o)&&Number.isFinite(o.angle)&&Number.isFinite(o.r)&&o.r>=14&&o.r<=32)&&v.tramps.every(o=>point(o)&&Number.isFinite(o.angle)&&Number.isFinite(o.width)&&o.width>=90&&o.width<=160);
  if(!valid)throw new HttpError(400,'Érvénytelen játékművelet.');
 }
}
function verify(p,input,now){
 const session=p.earning;
 if(!session||session.id!==input.sessionId)throw new HttpError(404,'A csillaggyűjtési munkamenet nem található.');
 if(session.receipt?.seq===input.seq)return {duplicate:true,receipt:session.receipt};
 if(!session.active)throw new HttpError(409,'Ez a csillaggyűjtés már lezárult.');
 if(session.engine!==ENGINE_VERSION||now>session.expiresAt)throw new HttpError(410,'A csillaggyűjtési munkamenet lejárt.');
 if(input.seq!==session.seq)throw new HttpError(409,'A jutalomnapló sorrendje eltér.');
 validate(input.events,input.ticks,p);
 if(session.totalTicks+input.ticks>(now-session.startedAt+10000)*.12)throw new HttpError(400,'A játékidő gyorsabban nőtt a valós időnél.');
 const verified=verifyEarnings(session.snapshot,input.events,input.ticks);
 return {verified,sessionId:session.id,seq:session.seq};
}
function commit(p,input,checked,now){
 const session=p.earning;
 if(!session||session.id!==input.sessionId)throw new HttpError(409,'Másik csillaggyűjtési munkamenet indult.');
 if(session.receipt?.seq===input.seq)return session.receipt;
 if(!session.active||session.seq!==checked.seq)throw new HttpError(409,'A jutalomnapló sorrendje megváltozott.');
 const {snapshot,hitStars,stats}=checked.verified;
 // Derived entirely from replayed physics, not submitted score/balance/achievement IDs.
 const budget=p.earningBudget||{tokens:1,at:session.startedAt};budget.tokens=Math.min(50,budget.tokens+Math.max(0,now-budget.at)*.00083);budget.at=now;
 const paidStars=Math.min(hitStars,Math.floor(budget.tokens+1e-7));budget.tokens-=paidStars;p.earningBudget=budget;
 p.wallet.stars+=paidStars;if(paidStars)p.wallet.revision++;const achievements=rewards.award(p,stats),bonus=achievements.reduce((sum,a)=>sum+a.stars,0);
 session.snapshot=snapshot;session.seq++;session.totalTicks+=input.ticks;session.expiresAt=now+86400000;p.earningMeter=snapshot.starMeter;
 session.receipt={seq:input.seq,hitStars,stars:paidStars+bonus,achievements};return session.receipt;
}
function publicTicket(session){return {id:session.id,seed:session.seed,config:session.config,meter:session.meter};}
module.exports={start,verify,commit,validate,publicTicket};
