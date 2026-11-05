'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const Rules=require('../games/arena-rules.js');
const weapons=['pulse','phantom','scatter','vector','revolver'],abilities=['dash','shield','blink'];
const base={phase:'playing',isHost:true,round:2,matchId:'match',choices:weapons,weaponIds:weapons,abilityIds:abilities};
const packet={t:'fire',_round:2,_match:'match',weapon:'pulse',x:0,y:1.65,z:1,dirs:[[1,0,0]]};
assert(Rules.validMessage(packet,base));for(const m of [{...packet,_round:1},{...packet,_match:'stale'},{...packet,weapon:'invented'},{...packet,x:NaN},{...packet,dirs:[[Infinity,0,0]]}])assert(!Rules.validMessage(m,base));
assert(!Rules.validMessage({t:'effect',_round:2,_match:'match',pid:'other',id:'shield',duration:10},{...base,isHost:false}));
assert(!Rules.validMessage({t:'snapshot',_round:2,_match:'match',round:2,hp:{host:NaN,guest:100},score:{host:0,guest:0}},{...base,isHost:false}));
class Element{constructor(){this.classList={toggle(){},add(){},remove(){}};this.style={};this.dataset={};this.value='';this.children=[];this.handlers={};}append(e){this.children.push(e)}addEventListener(n,f){this.handlers[n]=f;}setAttribute(){}focus(){}closest(){return false;}}
const nodes=new Map(),el=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id)};
const timers=[],listeners={},frames=[];let time=10000;
class Peer{constructor(){this.events={};this.open=false;}on(e,f){this.events[e]=f;}emit(e,...a){this.events[e]?.(...a)}destroy(){this.destroyed=true;}connect(){return new Peer();}send(m){this.sent??=[];this.sent.push(m)}close(){this.emit('close')}}
(async()=>{
 const sandbox={console,URLSearchParams,Math,Date,performance:{now:()=>time},innerWidth:1280,innerHeight:800,devicePixelRatio:1,crypto:require('node:crypto').webcrypto,matchMedia:()=>({matches:false}),localStorage:{getItem:()=>null,setItem(){}},setTimeout:(f,ms)=>{timers.push({f,ms});return timers.length;},clearTimeout(){},requestAnimationFrame:f=>frames.push(f)};
 sandbox.document={getElementById:el,createElement:()=>new Element(),body:{classList:{toggle(){}}},addEventListener:(n,f)=>listeners[n]=f,exitPointerLock(){this.pointerLockElement=null;listeners.pointerlockchange?.();}};
 sandbox.window={Peer,addEventListener:(n,f)=>listeners[n]=f};sandbox.ArenaRules=Rules;
 sandbox.navigator={clipboard:{writeText:async()=>{}}};
 el('game').requestPointerLock=()=>{sandbox.document.pointerLockElement=el('game');listeners.pointerlockchange?.();};
 const context=vm.createContext(sandbox);
 const three=new vm.SourceTextModule(fs.readFileSync('vendor/three.module.min.js','utf8'),{context});await three.link(()=>{throw Error('Unexpected vendor dependency')});await three.evaluate();
 class Renderer{constructor(){this.shadowMap={};}setSize(){}setPixelRatio(){}render(){}}
 const names=Object.keys(three.namespace);const bridge=new vm.SyntheticModule(names,function(){for(const n of names)this.setExport(n,n==='WebGLRenderer'?Renderer:three.namespace[n]);},{context});
 const code=fs.readFileSync('games/arena-clash.js','utf8')+`\nexport {startPractice,resetSession,createRoom,receive,localMovementAbility,hostDamage};export const inspect=()=>({phase,practiceMode,roomSequence,ownPos:[ownPos.x,ownPos.y,ownPos.z],selectedWeapon,selectedAbility,peer,matchId,roundNum,score,roundLoadouts});export const blockedBlink=()=>{ownPos.set(19,0,5);const original=moveAllowed;moveAllowed=()=>false;localMovementAbility('blink');moveAllowed=original;return[ownPos.x,ownPos.z];};`;
 const game=new vm.SourceTextModule(code,{context});await game.link(()=>bridge);await game.evaluate();const api=game.namespace;
 assert.deepEqual(Array.from(api.blockedBlink()),[19,5]);
 let prevented=false;listeners.keydown({code:'Tab',target:{closest:()=>false},preventDefault(){prevented=true}});assert(!prevented);
 api.createRoom();const old=api.inspect().peer;api.createRoom();const seq=api.inspect().roomSequence;old.emit('open');assert.equal(api.inspect().phase,'connecting');assert.equal(api.inspect().roomSequence,seq);
 api.startPractice();assert.equal(api.inspect().phase,'loadout');el('lockLoadout').onclick();assert.equal(api.inspect().phase,'playing');assert(api.inspect().roundLoadouts.host.weapon);assert.equal(api.inspect().roundLoadouts.guest.weapon,'pulse');
 const generation=api.inspect().roomSequence;for(const t of timers.filter(t=>t.ms===16000))t.f();assert.equal(api.inspect().roomSequence,generation);assert.equal(api.inspect().phase,'playing');
 api.hostDamage('guest',100,'host','weapon');assert.equal(api.inspect().score.host,1);assert.equal(api.inspect().phase,'roundOver');
 api.resetSession();assert.equal(api.inspect().phase,'menu');for(const t of timers.filter(t=>t.ms===3500))t.f();assert.equal(api.inspect().phase,'menu');
 api.startPractice();el('lockLoadout').onclick();for(let round=1;round<=5;round++){api.hostDamage('guest',100,'host','weapon');if(round<5){timers.filter(t=>t.ms===3500).at(-1).f();assert.equal(api.inspect().phase,'loadout');el('lockLoadout').onclick();}}timers.filter(t=>t.ms===2500).at(-1).f();assert.equal(api.inspect().phase,'result');const before=api.inspect().matchId;el('rematchBtn').onclick();assert.equal(api.inspect().phase,'loadout');assert.equal(api.inspect().score.host,0);assert.notEqual(api.inspect().matchId,before);
 const portal=fs.readFileSync('portal.html','utf8');assert.equal((portal.match(/class="card" data-game=/g)||[]).length,6);assert(portal.includes("tesi:'Alex',arena:'Alex és Milán'"));assert(fs.readFileSync('games/tesi-muszak.html','utf8').includes('Készítette: Alex'));
 console.log('PASS Arena: stale/invalid packets, finite vectors, blocked blink, stale connection/timers, Tab navigation, practice loadout/combat, session teardown, 6 cards and creator credits. Real Three geometry with renderer test double; browser WebGL rendering not covered.');
})().catch(e=>{console.error(e);process.exitCode=1});
