const assert=require('node:assert');
const {verifyRound}=require('../server/engine.cjs'),fixture=require('./fixture.json');
const ticket={kind:'sprint',map:0,tool:0,character:0,seed:740};
const started=performance.now();
const first=verifyRound(ticket,fixture.events,5400);assert.deepStrictEqual(first,fixture.metrics);
const uncachedMs=performance.now()-started,cacheStart=performance.now();const second=verifyRound(ticket,fixture.events,5400);const cachedMs=performance.now()-cacheStart;assert.deepStrictEqual(second,fixture.metrics);
first.points=-1;assert.deepStrictEqual(verifyRound(ticket,fixture.events,5400),fixture.metrics);
console.log('Verifier reference round: '+Math.round(uncachedMs)+' ms; identical replay cache: '+cachedMs.toFixed(2)+' ms.');
for(const variant of [{kind:'combo',map:0,tool:1,character:1,seed:741},{kind:'daily',map:2,tool:4,character:5,seed:742}]){
 const result=verifyRound(variant,fixture.events,5400);assert(Number.isFinite(result.points));assert(result.hits>0);
}
const rapid=[];
for(let tick=0;tick<5400;tick++){
 if(tick===220)rapid.push([tick,1,300,240]);
 rapid.push([tick,0,tick%2?300:700,240],[tick,0,tick%2?320:680,260]);
 if(tick===5399)rapid.push([tick,2,300,240]);
}
const result=verifyRound(ticket,rapid,5400);assert(Number.isFinite(result.points));assert(result.hits>0);
console.log('PASS: identical reference metrics, isolated repeated rounds, all competitive variants, 10,802-event rapid-swing replay ('+Math.round(performance.now()-started)+' ms total).');
