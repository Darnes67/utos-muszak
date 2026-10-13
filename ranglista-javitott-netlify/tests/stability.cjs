'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert'),economy=require('../economy.js'),{ScoreStore}=require('../server/store.cjs'),{createAPI}=require('../server/api.cjs');
const source=fs.readFileSync('index.html','utf8').match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import [^\n]*;\s*$/gm,'').replace('initOnline();','globalThis.bootPromise=initOnline();');
const fixture=require('./fixture.json'),noop=()=>{},deferred=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve:()=>resolve()};};
class MemoryBlobs{constructor(){this.data=new Map();this.serial=0;}async get(k){return structuredClone(this.data.get(k)?.data??null);}async getWithMetadata(k){return structuredClone(this.data.get(k)??null);}async setJSON(k,data,o){const old=this.data.get(k);if(o.onlyIfNew&&old||o.onlyIfMatch&&old?.etag!==o.onlyIfMatch)return {modified:false};this.data.set(k,{data:structuredClone(data),etag:String(++this.serial)});return {modified:true};}}
function harness(){
 const id='55555555-5555-4555-8555-555555555555',store=new ScoreStore(new MemoryBlobs()),nodes=new Map(),frames=[],gates=new Map(),session=new Map(),errors=[];
 let clock=Date.parse('2026-10-13T14:00:00Z'),failProfile=false,failDraw=false;
 const api=createAPI({store,authenticate:async()=>({id,user_metadata:{username:'BugTester'}}),now:()=>clock});
 const drawing=new Proxy({measureText:()=>({width:60}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||((...args)=>{if(failDraw&&k==='fillRect')throw Error('injected draw error');})});
 function node(){return {style:{},dataset:{},width:1000,height:560,value:'',hidden:true,textContent:'',innerHTML:'',disabled:false,checked:false,children:[],classList:{add:noop,remove:noop,toggle:noop},events:{},captures:new Set(),addEventListener(k,v){this.events[k]=v;},setAttribute:noop,focus:noop,replaceChildren(){this.children=[];},appendChild(x){this.children.push(x);},getContext:()=>drawing,getBoundingClientRect(){return{left:0,top:0,width:this.width,height:this.height};},setPointerCapture(x){this.captures.add(x);},hasPointerCapture(x){return this.captures.has(x);},releasePointerCapture(x){this.captures.delete(x);this.events.lostpointercapture?.({pointerId:x});},reportValidity:()=>true};}
 const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 const context=vm.createContext({UTOS_ECONOMY:economy,document:{getElementById:get,querySelectorAll:()=>[],querySelector:()=>null,createElement:node,addEventListener:noop,hidden:false,body:{classList:{toggle:noop}}},window:{addEventListener:noop},localStorage:{getItem:()=>'{"tutorialSeen":true}',setItem:noop},sessionStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},requestAnimationFrame:cb=>frames.push(cb),console:{log:noop,error:(...x)=>errors.push(x)},location:{protocol:'https:'},handleAuthCallback:async()=>null,getIdentityUser:async()=>({id}),getAccessToken:async()=>'test',Response,AbortController,setTimeout,clearTimeout,fetch:async(url,opts)=>{if(failProfile&&url==='/api/me')throw Error('offline');const gate=gates.get(url);if(gate)await gate.promise;return api(new Request('https://game.test'+url,opts));}});
 const run=s=>vm.runInContext(s,context,{timeout:15000});
 return {id,store,get,run,context,frames,gates,session,errors,set failProfile(v){failProfile=v;},set failDraw(v){failDraw=v;},boot(){run(source);return context.bootPromise;},async step(n){clock+=n*1000/120;context.n=n;run('for(let i=0;i<n;i++){earningBeforeStep();simulate(STEP);earningAfterStep();}');},async round(){context.fixture=fixture;run('competition.events=fixture.events.map(e=>e.slice());let fixtureCursor=0;for(let tick=0;tick<5400;tick++){while(fixtureCursor<fixture.events.length&&fixture.events[fixtureCursor][0]===tick)applyCompetitiveInput(fixture.events[fixtureCursor++]);simulate(STEP);competitionStepDone();}');clock+=45000;},get clock(){return clock;}};
}
const settle=async()=>{for(let i=0;i<18;i++)await new Promise(setImmediate);};
(async()=>{
 // A slow earning-start response must not reset a character or undo mode/reset input.
 const h=harness(),gate=deferred();h.gates.set('/api/earnings/start',gate);const boot=h.boot();await settle();
 assert(h.run('earning.ready'));assert(h.run('playing()'));assert.equal(h.run('earning.booting'),false);
 h.get('invite').events.click();await h.step(240);h.get('modeSelect').events.change({target:{value:'score'}});h.get('reset').events.click();await h.step(180);
 const before=h.run('JSON.stringify({person,selectedMap,selectedTool,mode,challengeState,time})');gate.resolve();await boot;
 assert.equal(h.run('JSON.stringify({person,selectedMap,selectedTool,mode,challengeState,time})'),before,'late response reset visible game');
 await h.run('flushEarnings(true)');const stored=await h.store.get('profile/'+h.id);assert.deepStrictEqual(JSON.parse(h.run('JSON.stringify(person)')),stored.earning.snapshot.person);
 assert.equal(h.get('reset').disabled,false);
 // Editor/replay are escapable via the universal reset; the renderer survives an exception.
 h.run('setMode("free");release(true);lastClip=[renderSnapshot(),renderSnapshot()];beginReplay()');assert(h.run('replay.active'));h.get('reset').events.click();assert(!h.run('replay.active'));
 h.get('editorToggle').events.click();assert(h.run('editorActive'));assert.equal(h.get('reset').disabled,false);h.get('reset').events.click();assert(!h.run('editorActive'));assert(h.run('person!==null'));
 assert.equal(h.frames.length,1);h.failDraw=true;h.frames.shift()(100);assert.equal(h.frames.length,1);assert(h.run('paused'));assert(h.errors.length);h.failDraw=false;h.get('reset').events.click();h.frames.shift()(116);assert.equal(h.frames.length,1);assert(!h.run('paused'));
 // Zero-size pointer surfaces never produce NaN; capture loss never recurses into release.
 h.get('game').width=0;h.get('game').events.pointermove({isPrimary:true,clientX:0,clientY:0});assert(h.run('Number.isFinite(target.x)&&Number.isFinite(target.y)'));h.get('game').width=1000;
 h.run('held=true;down=true;inputId=9');h.get('game').captures.add(9);h.run('release(true)');assert.equal(h.run('inputId'),null);assert(!h.run('down'));
 const ids=JSON.parse(h.run('JSON.stringify(objects.map(o=>o.id))'));assert.equal(ids.length,new Set(ids).size);
 // Delayed old result and leaderboard requests cannot block retry or replace new loan equipment.
 const q=harness();await q.boot();await q.run('startCompetitive("sprint")');const oldId=q.run('competition.ticket.id');const results=deferred();q.gates.set('/api/round/finish',results);await q.round();await settle();
 assert(q.run('submissionBusy'));assert.equal(q.run('onlineBusy'),false);assert(q.run('competition.ending'));
 q.get('retry').events.click();await settle();assert(q.run('competition.active&&!competition.ending'));assert.notEqual(q.run('competition.ticket.id'),oldId);
 // Switch the second official round to its borrowed character/tool without changing the wallet.
 q.run('setMode("free")');await settle();await q.run('startCompetitive("combo")');assert.equal(q.run('selectedCharacter'),1);assert.equal(q.run('selectedTool'),1);
 const newPerson=q.run('JSON.stringify(person)');results.resolve();await settle();assert.equal(q.run('JSON.stringify(person)'),newPerson);assert.equal(q.run('selectedCharacter'),1);assert.equal(q.run('selectedTool'),1);assert.equal(q.get('resultOverlay').hidden,true);
 assert.equal((await q.store.get('profile/'+q.id)).rounds[oldId].status,'finished');assert.equal(q.run('pendingSubmission'),null);
 // Wallet revision prevents an old profile response restoring an already-spent balance.
 q.run('competition.active=false;competition.ending=false;accountWallet.revision=100;accountWallet.stars=17');q.context.stale={id:q.id,username:'BugTester',xp:0,games:0,wallet:{stars:999,revision:99,owned:['tool-0','character-0'],equipped:{tool:'tool-0',character:'character-0'}}};q.run('acceptAccount(stale)');assert.equal(q.run('wallet().stars'),17);assert.equal(q.run('selectedCharacter'),1);
 // API failure at startup leaves a fully functional local game, not a permanent loading state.
 const offline=harness();offline.failProfile=true;await offline.boot();assert.equal(offline.run('accountMode'),'guest');offline.get('invite').events.click();await offline.step(720);assert(offline.run('person!==null'));assert(offline.run('playing()'));offline.get('reset').events.click();assert(offline.run('person!==null'));
 console.log('PASS: delayed earning startup preserves live state, reset during startup, replay/editor reset, frame-error recovery with one RAF, finite pointer coordinates, synchronous capture loss, unique objects, nonblocking result/retry, old result cannot replace borrowed character, monotonic wallet revision, offline startup recovery.');
})().catch(error=>{console.error(error);process.exitCode=1});
