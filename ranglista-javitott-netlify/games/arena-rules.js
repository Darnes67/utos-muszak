(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ArenaRules=factory();})(globalThis,()=>{
'use strict';
const maps=['neon','dunes','orbit'],pids=['host','guest'];
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const vec=v=>Array.isArray(v)&&v.length===3&&v.every(finite)&&v.every(x=>Math.abs(x)<1000)&&v.some(x=>Math.abs(x)>.00001);
function validMessage(m,c){
 if(!m||typeof m!=='object'||Array.isArray(m)||typeof m.t!=='string')return false;
 const playing=c.phase==='playing',lobby=['connecting','lobby'].includes(c.phase),loadout=c.phase==='loadout';
 const combat=['state','fire','hit','snapshot','skill','effect','roundEnd','locked','begin'];
 if(combat.includes(m.t)&&(m._round!==c.round||m._match!==c.matchId))return false;
 const weapon=id=>typeof id==='string'&&c.weaponIds.includes(id),ability=id=>typeof id==='string'&&c.abilityIds.includes(id);
 const picks=a=>Array.isArray(a)&&a.length===5&&new Set(a).size===5&&a.every(weapon);
 const scores=s=>s&&pids.every(k=>Number.isInteger(s[k])&&s[k]>=0&&s[k]<=5);
 switch(m.t){
 case'hello':return lobby&&typeof m.nick==='string'&&finite(m.version);
 case'profile':return lobby&&typeof m.nick==='string';
 case'map':return !c.isHost&&lobby&&maps.includes(m.map);
 case'ready':return lobby&&typeof m.ready==='boolean';
 case'loadout':return !c.isHost&&['lobby','result'].includes(c.phase)&&picks(m.choices)&&maps.includes(m.map)&&m.round===1&&typeof m.matchId==='string'&&m.matchId.length>0&&m.matchId.length<100;
 case'locked':return loadout&&c.choices.includes(m.weapon)&&ability(m.ability);
 case'begin':return !c.isHost&&loadout;
 case'state':return playing&&[m.x,m.y,m.z,m.yaw].every(finite)&&Math.abs(m.x)<=32&&Math.abs(m.z)<=32&&m.y>=0&&m.y<10;
 case'fire':return playing&&weapon(m.weapon)&&[m.x,m.y,m.z].every(finite)&&Array.isArray(m.dirs)&&m.dirs.length>=1&&m.dirs.length<=9&&m.dirs.every(vec);
 case'hit':return !c.isHost&&playing&&finite(m.damage)&&m.damage>=0&&m.damage<1000;
 case'snapshot':return !c.isHost&&playing&&m.hp&&pids.every(k=>finite(m.hp[k])&&m.hp[k]>=0&&m.hp[k]<=100)&&scores(m.score)&&m.round===c.round;
 case'skill':return c.isHost&&playing&&ability(m.id);
 case'effect':return !c.isHost&&playing&&pids.includes(m.pid)&&ability(m.id)&&finite(m.duration)&&m.duration>=0&&m.duration<=40000;
 case'roundEnd':return !c.isHost&&playing&&pids.includes(m.winner)&&scores(m.score)&&typeof m.final==='boolean';
 case'nextLoadout':return !c.isHost&&c.phase==='roundOver'&&m.round===c.round+1&&m._match===c.matchId&&picks(m.choices);
 case'rematch':return c.phase==='result';
 case'disconnect':return true;
 default:return false;
 }
}
return{validMessage};
});
