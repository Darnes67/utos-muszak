const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const nodes=new Map();
function node(id){if(!nodes.has(id))nodes.set(id,{id,textContent:'',style:{},disabled:false,open:false,classList:{toggle(){}},querySelector(s){return node(id+s)},append(){},replaceChildren(){},setAttribute(){},addEventListener(){},close(){this.open=false},showModal(){this.open=true}});return nodes.get(id)}
const ctx=new Proxy({createLinearGradient(){return{addColorStop(){}}}},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});node('gym').getContext=()=>ctx;
let raf,now=0;const storage=new Map([['banki_tesi_v1_intro','1']]);const doc={getElementById:node,createElement:()=>node('article'+Math.random()),hidden:false,addEventListener(){}};
const sandbox={document:doc,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},performance:{now:()=>now},matchMedia:()=>({matches:false}),setTimeout:()=>1,setInterval:()=>1,clearTimeout(){},requestAnimationFrame:f=>raf=f,window:{addEventListener(){}},Date,Math,Intl,console};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('games/tesi-core.js','utf8'),sandbox);vm.runInContext(fs.readFileSync('games/tesi-muszak.js','utf8'),sandbox);node('train').onclick();for(let i=0;i<90;i++){now+=1000/60;raf(now)}assert.equal(node('reps').textContent,'1');assert.equal(node('coins').textContent,'1');node('daily').onclick();const dailyCoins=Number(node('coins').textContent);node('daily').onclick();assert.equal(Number(node('coins').textContent),dailyCoins);console.log('Tesi UI: one click completes one repetition, credits one coin, daily reward is claimed once.');

// Ranked animation must not grant local currency or overwrite the guest save.
const bridge=sandbox.window.TesiGame;
assert.ok(bridge&&bridge.getState&&bridge.applyState&&bridge.setOnline);
const guest=bridge.getState(),sent=[];
sandbox.window.TesiOnline={action:(type,data)=>sent.push({type,data})};
bridge.setOnline(true);
const storedGuest=storage.get('banki_tesi_v1');
const online=bridge.getState();online.coins=750;online.earned=1200;online.schoolYears=2;
bridge.applyState(online);
node('train').onclick();assert.equal(sent[0].type,'train');
bridge.playTrainingAnimation();for(let i=0;i<110;i++){now+=1000/60;raf(now);}
assert.equal(bridge.getState().coins,750);
assert.equal(bridge.getState().reps,online.reps);
bridge.save();assert.equal(storage.get('banki_tesi_v1'),storedGuest);
assert.equal(node('schoolYears').textContent,'2');
bridge.setOnline(false);assert.equal(bridge.getState().coins,guest.coins);
assert.equal(bridge.getState().reps,guest.reps);
console.log('Tesi UI: ranked animation cannot mint coins; online actions are routed and guest progress is preserved.');
