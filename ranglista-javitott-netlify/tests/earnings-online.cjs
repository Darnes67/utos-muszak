'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert'),economy=require('../economy.js'),{ScoreStore}=require('../server/store.cjs'),{createAPI}=require('../server/api.cjs');
const code=fs.readFileSync('index.html','utf8').match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import [^\n]*;\s*$/gm,'').replace('initOnline();','globalThis.bootPromise=initOnline();');
class MemoryBlobs{constructor(){this.data=new Map();this.serial=0;}async get(k){return structuredClone(this.data.get(k)?.data??null);}async getWithMetadata(k){return structuredClone(this.data.get(k)??null);}async setJSON(k,data,options){const old=this.data.get(k);if(options.onlyIfNew&&old||options.onlyIfMatch&&old?.etag!==options.onlyIfMatch)return{modified:false};this.data.set(k,{data:structuredClone(data),etag:String(++this.serial)});return{modified:true};}}
const store=new ScoreStore(new MemoryBlobs()),id='44444444-4444-4444-8444-444444444444';let clock=Date.parse('2026-10-12T22:00:00Z'),dropResponse=false;
const api=createAPI({store,authenticate:async()=>({id,user_metadata:{username:'OnlineStars'}}),now:()=>clock});
const noop=()=>{},session=new Map(),local=new Map([['utos-muszak-v5','{"tutorialSeen":true}']]);
function createClient(){
 const nodes=new Map(),drawing=new Proxy({measureText:()=>({width:60}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop});
 function node(){return{style:{},dataset:{},value:'',textContent:'',innerHTML:'',hidden:true,disabled:false,checked:false,children:[],classList:{add:noop,remove:noop,toggle:noop},events:{},addEventListener(k,v){this.events[k]=v;},setAttribute:noop,focus:noop,replaceChildren(){this.children=[];},appendChild(v){this.children.push(v);},getContext:()=>drawing,getBoundingClientRect:()=>({left:0,top:0,width:1000,height:560}),hasPointerCapture:()=>false,setPointerCapture:noop,reportValidity:()=>true};}
 const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 const context=vm.createContext({UTOS_ECONOMY:economy,document:{getElementById:get,querySelectorAll:()=>[],querySelector:()=>null,createElement:node,addEventListener:noop,hidden:false,body:{classList:{toggle:noop}}},window:{addEventListener:noop},localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)},sessionStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},requestAnimationFrame:noop,console,location:{protocol:'https:'},handleAuthCallback:async()=>null,getIdentityUser:async()=>({id}),getAccessToken:async()=>'test-token',Response,AbortController,setTimeout,clearTimeout,fetch:async(url,opts)=>{const response=await api(new Request('https://game.test'+url,opts));if(dropResponse&&url.endsWith('/earnings/claim')){dropResponse=false;throw Error('lost response');}return response;}});
 vm.runInContext(code,context);return {context,get,run:s=>vm.runInContext(s,context,{timeout:15000})};
}
const settle=async()=>{for(let i=0;i<12;i++)await new Promise(setImmediate);};
(async()=>{
 const c=createClient();await c.context.bootPromise;assert(c.run('earning.ready'));assert.equal(c.run('accountMode'),'account');assert.equal(c.run('wallet().stars'),0);
 c.get('invite').events.click();c.get('game').events.pointerdown({button:0,isPrimary:true,clientX:870,clientY:418,pointerId:1,preventDefault:noop});
 const fixture=require('./fixture.json');let cursor=0;
 for(let tick=0;tick<2700;tick++){
  if(tick>=900)while(cursor<fixture.events.length&&fixture.events[cursor][0]===tick-900){const[,kind,x,y]=fixture.events[cursor++],event={button:0,isPrimary:true,clientX:x,clientY:y,pointerId:1,preventDefault:noop};c.get('game').events[['pointermove','pointerdown','pointerup','pointercancel'][kind]](event);}
  clock+=1000/120;c.run('earningBeforeStep();simulate(STEP);earningAfterStep()');
  if((tick+1)%360===0)await settle();
 }
 await c.run('flushEarnings(true)');await settle();assert(c.run('wallet().stars')>5);assert(c.run('accountWallet.achievements.includes("first")'));assert(c.get('achievementCount').textContent!=='0 / 8');
 const profile=await store.get('profile/'+id);assert.equal(c.run('wallet().stars'),profile.wallet.stars);
 // Server commits, response is lost, client keeps the same pending sequence.
 for(let i=0;i<240;i++){clock+=1000/120;c.run('earningBeforeStep();simulate(STEP);earningAfterStep()');}
 dropResponse=true;await c.run('flushEarnings(true)');assert(c.run('!!earning.pending'));const paid=(await store.get('profile/'+id)).wallet.stars;
 await c.run('flushEarnings(true)');assert.equal(c.run('earning.pending'),null);assert.equal(c.run('wallet().stars'),paid);
 // Saved account balance and badge rewards survive a new page load.
 const restored=createClient();await restored.context.bootPromise;assert.equal(restored.run('wallet().stars'),paid);assert(restored.run('accountWallet.achievements.includes("first")'));
 await restored.run('startCompetitive("sprint")');assert(restored.run('competition.active'));assert.equal(restored.run('earning.ready'),false);
 restored.run('setMode("free")');await settle();assert.equal(restored.run('mode'),'free');assert(restored.run('earning.ready'));
 console.log('PASS: complete signed-in frontend/backend startup, automatic normal-play star deposits, visible achievements, lost-response retry without duplicate payout, account reload, flush before competition and automatic return to free play.');
})().catch(e=>{console.error(e);process.exitCode=1});
