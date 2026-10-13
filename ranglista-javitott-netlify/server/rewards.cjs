'use strict';
const economy=require('../economy.js');
function ensure(profile){
 if(profile.rewards?.version===1)return profile.rewards;
 const state={version:1,paid:[],hits:0,cones:0,tools:[],maps:[],maxCombo:1,records:{}};
 // Backfill only existing, server-verified rounds. Never import local balances or badges.
 for(const round of Object.values(profile.rounds||{})){
  if(round.status!=='finished'||!round.result)continue;
  const m=round.result;state.hits+=Math.max(0,m.hits||0);state.cones+=Math.max(0,m.cones||0);state.maxCombo=Math.max(state.maxCombo,m.maxCombo||1);
  if((m.hits||0)+(m.objectHits||0)>0){state.tools.push(round.tool);state.maps.push(round.map);}
 }
 state.tools=[...new Set(state.tools)];state.maps=[...new Set(state.maps)];profile.rewards=state;return state;
}
function award(profile,stats={}){
 const s=ensure(profile);s.hits+=Math.max(0,stats.hits||0);s.cones+=Math.max(0,stats.cones||0);
 s.maxCombo=Math.max(s.maxCombo,stats.maxCombo||1);s.tools=[...new Set([...s.tools,...(stats.tools||[])])];s.maps=[...new Set([...s.maps,...(stats.maps||[])])];
 const eligible=new Set(stats.badges||[]);
 if(s.hits>=1)eligible.add('first');if(s.hits>=50)eligible.add('hits50');if(s.cones>=3)eligible.add('cones3');
 if(s.maxCombo>=5)eligible.add('combo5');if(s.tools.length>=6)eligible.add('tools6');if(s.maps.length>=3)eligible.add('maps3');
 const unlocked=[];
 for(const a of economy.achievements){if(eligible.has(a.id)&&!s.paid.includes(a.id)){s.paid.push(a.id);profile.wallet.stars+=a.reward;unlocked.push({id:a.id,stars:a.reward});}}
 if(unlocked.length)profile.wallet.revision++;return unlocked;
}
module.exports={ensure,award};
