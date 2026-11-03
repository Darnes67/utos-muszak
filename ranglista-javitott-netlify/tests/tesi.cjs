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
