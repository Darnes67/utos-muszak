'use strict';
const {randomUUID,timingSafeEqual}=require('node:crypto'),{HttpError}=require('./store.cjs'),shop=require('./shop.cjs');
const REWARD=300,DAILY_LIMIT=3,COOLDOWN=120000,TTL=600000;
const day=now=>new Date(now).toISOString().slice(0,10);
function config(raw=require('../ads-config.json')){
 const enabled=raw.enabled===true,adUnitPath=typeof raw.adUnitPath==='string'?raw.adUnitPath:'';
 const cmpScriptUrl=typeof raw.cmpScriptUrl==='string'?raw.cmpScriptUrl:'';
 const validUnit=/^\/[1-9][0-9]{3,19}\/[A-Za-z0-9_./-]{1,180}$/.test(adUnitPath);
 const validCmp=/^https:\/\/fundingchoicesmessages\.google\.com\/i\/pub-[0-9]{16}\?ers=1$/.test(cmpScriptUrl)||raw.externalCmp===true;
 const configured=enabled&&validUnit&&validCmp;
 return {configured,provider:'gpt',reward:REWARD,dailyLimit:DAILY_LIMIT,adUnitPath:configured?adUnitPath:null,cmpScriptUrl:configured?cmpScriptUrl:null,
  reason:!enabled?'A reklámjutalom bekötésre vár. Még nincs aktivált hirdetési szolgáltató.':!validUnit?'Hiányzik a saját Google Ad Manager reklámegység.':!validCmp?'Hiányzik a hozzájárulási felület bekötése.':null};
}
function ledger(p){p.rewardAds??={version:1,tickets:{},starts:[]};return p.rewardAds;}
function todayCount(p,now){return Object.values(p?.rewardAds?.tickets||{}).filter(t=>t.status==='rewarded'&&t.receipt.day===day(now)).length;}
function status(p,c,now){
 const tickets=Object.values(p?.rewardAds?.tickets||{}),last=Math.max(0,...tickets.filter(t=>t.shownAt).map(t=>t.shownAt));
 return {...c,remaining:p?Math.max(0,DAILY_LIMIT-todayCount(p,now)):DAILY_LIMIT,availableAt:last?last+COOLDOWN:0,resetsAt:Date.parse(day(now))+86400000};
}
function enabled(c){if(!c.configured)throw new HttpError(503,c.reason||'A hirdetési szolgáltató még nincs bekötve.');}
function inactiveRound(p,now){if(Object.values(p.rounds||{}).some(r=>r.status==='active'&&Date.parse(r.expiresAt)>now))throw new HttpError(409,'Versenykör közben nem indítható reklám.');}
function publicTicket(t){return {id:t.id,token:t.token,expiresAt:t.expiresAt};}
function start(p,input,c,now){
 enabled(c);inactiveRound(p,now);const l=ledger(p);
 if(typeof input.requestId!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(input.requestId))throw new HttpError(400,'Hibás reklámkérés-azonosító.');
 const old=Object.values(l.tickets).find(t=>t.requestId===input.requestId);if(old){if(old.status==='cancelled'||old.expiresAt<now)throw new HttpError(410,'Ez a reklámkérés lejárt.');return old;}
 if(todayCount(p,now)>=DAILY_LIMIT)throw new HttpError(429,'A mai három reklámjutalmat már megszerezted. Holnap újra nézhetsz reklámot.');
 if(status(p,c,now).availableAt>now)throw new HttpError(429,'Két reklám között legalább két perc teljen el.');
 if(Object.values(l.tickets).some(t=>['ready','shown'].includes(t.status)&&t.expiresAt>now))throw new HttpError(409,'Már van folyamatban reklám ezen a fiókon.');
 l.starts=l.starts.filter(t=>t>now-3600000);if(l.starts.length>=12)throw new HttpError(429,'Túl sok reklámkérés. Próbáld később újra.');l.starts.push(now);
 const kept=Object.values(l.tickets).filter(t=>t.status==='rewarded'||t.expiresAt>now).sort((a,b)=>b.createdAt-a.createdAt).slice(0,63);l.tickets=Object.fromEntries(kept.map(t=>[t.id,t]));
 const t={id:randomUUID(),token:randomUUID(),requestId:input.requestId,unit:c.adUnitPath,createdAt:now,expiresAt:now+TTL,status:'ready'};l.tickets[t.id]=t;return t;
}
function ticket(p,input){
 if(typeof input.ticketId!=='string'||!/^[a-f0-9-]{36}$/i.test(input.ticketId)||typeof input.token!=='string'||!/^[a-f0-9-]{36}$/i.test(input.token))throw new HttpError(400,'Hibás reklámjegy.');
 const t=p.rewardAds?.tickets?.[input.ticketId];if(!t||typeof t.token!=='string'||t.token.length!==input.token.length||!timingSafeEqual(Buffer.from(t.token),Buffer.from(input.token)))throw new HttpError(404,'A reklámjegy nem található ebben a fiókban.');return t;
}
function show(p,input,c,now){
 enabled(c);inactiveRound(p,now);const t=ticket(p,input);
 if(t.expiresAt<now||t.status==='cancelled')throw new HttpError(410,'A reklámjegy lejárt vagy megszakadt.');
 if(t.unit!==c.adUnitPath)throw new HttpError(409,'A hirdetési beállítás megváltozott.');
 if(t.status==='shown')return t;
 if(t.status!=='ready')throw new HttpError(409,'Ez a reklámjegy már felhasznált.');
 if(todayCount(p,now)>=DAILY_LIMIT||status(p,c,now).availableAt>now)throw new HttpError(429,'Most nem kérhető új reklámjutalom.');
 t.status='shown';t.shownAt=now;return t;
}
function claim(p,input,c,now){
 const t=ticket(p,input);if(t.status==='rewarded')return {...t.receipt,duplicate:true};
 enabled(c);inactiveRound(p,now);
 if(t.status!=='shown'||!Number.isFinite(t.shownAt))throw new HttpError(409,'A reklám nem indult el.');
 if(t.expiresAt<now)throw new HttpError(410,'A reklámjutalom beküldési ideje lejárt.');
 if(t.unit!==c.adUnitPath)throw new HttpError(409,'Másik reklámegységhez tartozó jegy.');
 // GPT web grants are browser SDK events, NOT cryptographically verified SSV.
 // Tickets, server amount, CAS, daily cap and timing bound their abuse; do not claim proof of a view.
 if(input.event!=='rewardedSlotGranted'||input.providerReward?.amount!==REWARD||input.providerReward?.type!=='stars')throw new HttpError(400,'Hiányzik a megfelelő hirdetési jutalomjelzés.');
 if(now-t.shownAt<4500)throw new HttpError(400,'Túl korai reklámjutalom-kérés.');
 if(todayCount(p,now)>=DAILY_LIMIT)throw new HttpError(429,'A mai reklámjutalmak elfogytak.');
 const w=shop.ensureWallet(p);w.stars+=REWARD;w.revision++;t.status='rewarded';t.receipt={ticketId:t.id,stars:REWARD,day:day(now),awardedAt:now};return {...t.receipt,duplicate:false};
}
function cancel(p,input){const t=ticket(p,input);if(t.status!=='rewarded')t.status='cancelled';return t;}
module.exports={config,status,start,show,claim,cancel,publicTicket,REWARD,DAILY_LIMIT};
