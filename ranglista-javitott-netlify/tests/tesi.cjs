'use strict';
const assert=require('node:assert/strict');
const C=require('../games/tesi-core.js');
// A fresh game always starts at one student, one coin per completed repetition.
let s=C.fresh();assert.equal(s.levels.students,1);assert.equal(C.reward(s),1);assert.equal(C.income(s),0);assert.equal(C.offline(s,s.lastSave+7200000),0);
C.credit(s,1,1);assert.equal(s.coins,1);assert.equal(s.reps,1);
assert.equal(C.buy(s,'students'),0);assert.equal(s.coins,1);
s.coins=100;assert.equal(C.buy(s,'students'),1);assert.equal(s.coins,75);assert.equal(s.levels.students,2);assert.equal(C.cost(s,'students'),42);
assert.equal(C.buy(s,'power'),1);assert.equal(C.reward(s),2);assert.equal(s.coins,60);
const slow=C.duration(s);assert.equal(C.buy(s,'speed'),1);assert(C.duration(s)<slow);assert.equal(C.buy(s,'unknown'),0);
s.coins=1e15;assert.equal(C.buy(s,'students',true),16);assert.equal(s.levels.students,18);assert.equal(C.cost(s,'students'),Infinity);const before=s.coins;assert.equal(C.buy(s,'students'),0);assert.equal(s.coins,before);
s=C.fresh();s.coins=60;assert.equal(C.buy(s,'auto'),1);assert.equal(C.income(s),.2);let now=s.lastSave;assert.equal(C.offline(s,now+100000),7);assert.equal(C.offline(s,now+100000),0);assert.equal(C.offline(s,now+99000),0);
s.lastSave=now;assert.equal(C.offline(s,now+86400000),504);assert.equal(C.awards(s).filter(a=>a.id==='auto').length,1);assert.deepEqual(C.awards(s),[]);
// Prestige must retain lifetime progress and awards, but reset the current run.
s=C.fresh();assert.equal(C.prestige(s),0);C.credit(s,10000,120);s.clicks=140;s.daily='2026-11-03';C.awards(s);const lifetime=s.earned;const badges=[...s.badges];assert.equal(C.prestige(s),3);assert.equal(s.coins,0);assert.equal(s.runEarned,0);assert.equal(s.levels.students,1);assert.equal(s.medals,3);assert.equal(s.earned,lifetime);assert.equal(s.reps,120);assert.equal(s.clicks,140);assert.deepEqual(s.badges,badges);assert.equal(s.daily,'2026-11-03');assert.deepEqual(C.restore(JSON.parse(JSON.stringify(s))),s);
const clean=C.restore({version:1,coins:NaN,earned:-1,medals:Infinity,levels:{students:999,auto:-5},badges:['bogus','first']});assert.equal(clean.coins,0);assert.equal(clean.earned,0);assert.equal(clean.medals,0);assert.equal(clean.levels.students,18);assert.equal(clean.levels.auto,0);assert.deepEqual(clean.badges,['first']);assert.equal(C.restore({version:99}).levels.students,1);
console.log('Tesi economy, upgrade spending, offline cap, one-time rewards, persistence and prestige passed.');
// Old medals do not reveal how many school years were closed.
const legacy=C.restore({version:1,medals:42,earned:12345,reps:200,levels:{students:4,power:3}});
assert.equal(legacy.schoolYears,0);assert.equal(legacy.medals,42);assert.equal(legacy.earned,12345);assert.equal(legacy.levels.hydration,0);
legacy.runEarned=10000;C.prestige(legacy);assert.equal(legacy.schoolYears,1);legacy.runEarned=40000;C.prestige(legacy);assert.equal(legacy.schoolYears,2);assert.equal(C.restore(legacy).schoolYears,2);
// Every new upgrade has a measurable effect, while spending never counts as earnings.
s=C.fresh();s.coins=1e9;s.levels.power=10;s.levels.auto=1;
for(const[key,measure]of [['hydration',C.duration],['metronome',C.interval],['scholarship',C.reward],['caretaker',C.offlineEfficiency],['captain',C.comboWindow]]){
 const old=measure(s),earned=s.earned;assert.equal(C.buy(s,key),1);assert.notEqual(measure(s),old);assert.equal(s.earned,earned);assert(C.effect(s,key));
}
assert(C.comboBonus(s,25)>2);assert.equal(C.dailyReward(s),200);
s.levels.caretaker=10;assert.equal(C.offlineEfficiency(s),.85);const saved=structuredClone(s);const expected=Math.floor(C.income(s)*7200*.85+1e-9);assert.equal(C.offline(s,s.lastSave+86400000),expected);assert.equal(C.offline(s,s.lastSave),0);assert.equal(C.restore(saved).levels.scholarship,1);
console.log('Tesi v2 upgrades, legacy migration, exact school-year counter and offline efficiency passed.');
