'use strict';
const assert=require('node:assert/strict'),{create}=require('../ads.js');
const config={configured:true,adUnitPath:'/123456789/utos_rewarded'},noop=()=>{};
function setup(consent=true,supported=true){
 const listeners=new Map(),timers=new Map();let serial=0,destroyed=0,visible=0;const slot={addService:noop};
 const service={addEventListener(n,f){listeners.set(n,f);},removeEventListener(n){listeners.delete(n);}};
 const win={__tcfapi(name,v,cb){if(name==='addEventListener')cb({listenerId:1,gdprApplies:true,eventStatus:'tcloaded',purpose:{consents:{1:consent}}},true);},googletag:{apiReady:true,pubadsReady:true,cmd:{push:f=>f()},enums:{OutOfPageFormat:{REWARDED:1}},defineOutOfPageSlot:()=>supported?slot:null,pubads:()=>service,display:noop,destroySlots(){destroyed++;}}};
 const events=[],sdk=create(win,{setTimeout(f){timers.set(++serial,f);return serial;},clearTimeout(id){timers.delete(id);}});
 const handlers={onReady:()=>events.push('ready'),onGrant:()=>events.push('grant'),onClose:x=>events.push(x.granted?'paid-close':'close'),onError:e=>events.push('error:'+e.message)};
 const emit=(name,extra={})=>listeners.get(name)?.({slot,...extra});
 const ready=(success=true)=>emit('rewardedSlotReady',{makeRewardedVisible(){visible++;return success;}});
 return{sdk,events,emit,ready,slot,timers,listeners,handlers,get destroyed(){return destroyed;},get visible(){return visible;}};
}
(async()=>{
 let x=setup();await x.sdk.prepare(config,x.handlers);x.emit('rewardedSlotGranted',{payload:{amount:300,type:'stars'}});assert.equal(x.events.length,0);x.ready();assert.equal(x.visible,0);assert.equal(x.sdk.show(),true);x.emit('rewardedSlotGranted',{slot:{},payload:{amount:300,type:'stars'}});x.emit('rewardedSlotGranted',{payload:{amount:300,type:'stars'}});x.emit('rewardedSlotGranted',{payload:{amount:300,type:'stars'}});x.emit('rewardedSlotClosed');assert.deepEqual(x.events,['ready','grant','paid-close']);assert.equal(x.destroyed,1);assert.equal(x.listeners.size,0);assert.equal(x.timers.size,0);
 x=setup();await x.sdk.prepare(config,x.handlers);x.ready();x.sdk.show();x.emit('rewardedSlotClosed');assert.deepEqual(x.events,['ready','close']);
 x=setup();await x.sdk.prepare(config,x.handlers);x.emit('slotRenderEnded',{isEmpty:true});assert(x.events[0].startsWith('error:'));assert.equal(x.timers.size,0);
 x=setup(false);await x.sdk.prepare(config,x.handlers);assert(x.events[0].startsWith('error:'));assert.equal(x.destroyed,0);
 x=setup(true,false);await x.sdk.prepare(config,x.handlers);assert(x.events[0].startsWith('error:'));assert.equal(x.sdk.busy,false);
 x=setup();await x.sdk.prepare(config,x.handlers);x.ready(false);assert.equal(x.sdk.show(),false);assert.equal(x.timers.size,0);
 x=setup();await x.sdk.prepare(config,x.handlers);x.ready();x.sdk.show();x.emit('rewardedSlotGranted',{payload:{amount:20,type:'stars'}});assert(!x.events.includes('grant'));assert.equal(x.sdk.busy,false);
 x=setup();await x.sdk.prepare(config,x.handlers);[...x.timers.values()][0]();assert(x.events[0].startsWith('error:'));assert.equal(x.timers.size,0);
 x=setup();const preparing=x.sdk.prepare(config,x.handlers);x.sdk.cancel();await preparing;assert.equal(x.sdk.busy,false);assert.equal(x.timers.size,0);
 console.log('PASS: GPT SDK opt-in visibility, exact reward event/payload, early/unrelated/duplicate events ignored, no-fill/consent-denied/unsupported/timeout/cancel cleanup, early close pays nothing.');
})().catch(e=>{console.error(e);process.exitCode=1});
