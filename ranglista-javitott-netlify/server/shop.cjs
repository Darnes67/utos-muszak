'use strict';
const economy=require('../economy.js'),{HttpError}=require('./store.cjs');
function ensureWallet(profile){profile.wallet=economy.normalizeWallet(profile.wallet);return profile.wallet;}
function publicWallet(profile){const w=ensureWallet(profile);return {version:w.version,revision:w.revision,stars:w.stars,owned:w.owned,equipped:w.equipped,legacyMigrated:w.legacyMigrated,achievements:profile.rewards?.paid||[]};}
function activeRound(p,now){return Object.values(p.rounds||{}).some(r=>r.status==='active'&&Date.parse(r.expiresAt)>now);}
function transaction(p,input,action,now){
 const w=ensureWallet(p),id=input.transactionId;
 if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(id))throw new HttpError(400,'Érvénytelen vásárlási azonosító.');
 const signature=JSON.stringify([action,input.itemId??null,input.category??null]);
 const previous=Object.hasOwn(w.transactions,id)?w.transactions[id]:null;if(previous){if(previous.signature!==signature)throw new HttpError(409,'Az azonosító másik művelethez tartozik.');return w;}
 if(activeRound(p,now))throw new HttpError(409,'A felszerelést és a boltot a kör lezárása után használhatod.');
 const item=economy.product(input.itemId);
 if(action==='buy'){
  if(!item)throw new HttpError(400,'Ismeretlen termék.');
  if(!w.owned.includes(item.id)){if(w.stars<item.price)throw new HttpError(402,'Még '+(item.price-w.stars)+' ★ hiányzik.');w.stars-=item.price;w.owned.push(item.id);}
 }else{
  const category=input.category||item?.category;
  if(!Object.hasOwn(economy.defaults,category))throw new HttpError(400,'Ismeretlen kategória.');
  if(input.itemId===null&&!['tool','character'].includes(category))w.equipped[category]=null;
  else{if(!item||item.category!==category||!w.owned.includes(item.id))throw new HttpError(403,'Ezt a tartalmat előbb vásárold meg.');w.equipped[category]=item.id;}
 }
 w.revision++;w.transactions[id]={signature,at:now};
 const entries=Object.entries(w.transactions);if(entries.length>256)w.transactions=Object.fromEntries(entries.sort((a,b)=>b[1].at-a[1].at).slice(0,256));
 return w;
}
function migrateLegacy(p,ids,equipped){
 const w=ensureWallet(p);if(w.legacyMigrated)return w;
 if(!Array.isArray(ids)||ids.length>6||ids.some(id=>!economy.legacy.includes(id)))throw new HttpError(400,'Érvénytelen régi kozmetikai mentés.');
 // Grandfather ONLY the six old local cosmetics, never a balance, weapon or new skin.
 w.owned=[...new Set([...w.owned,...ids])];
 for(const category of ['shirt','pattern','particle']){const id=equipped?.[category];if(!w.equipped[category]&&ids.includes(id)&&economy.product(id)?.category===category)w.equipped[category]=id;}
 w.revision++;w.legacyMigrated=true;return w;
}
function practiceDefinition(input,p){
 const map=input.map,tool=input.tool,character=input.character,w=ensureWallet(p);
 if(!Number.isInteger(map)||map<0||map>2||!Number.isInteger(tool)||tool<0||tool>5||!Number.isInteger(character)||character<0||character>8)throw new HttpError(400,'Hibás felszerelés.');
 if(!w.owned.includes('tool-'+tool)||!w.owned.includes('character-'+character))throw new HttpError(403,'A csillaggyűjtéshez saját felszerelést válassz.');
 return {kind:'practice',board:null,map,tool,character,seed:740};
}
module.exports={ensureWallet,publicWallet,transaction,migrateLegacy,practiceDefinition};
