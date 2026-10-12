'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert'),economy=require('../economy.js'),{initialEarnings,verifyEarnings}=require('../server/engine.cjs');
const source=fs.readFileSync('index.html','utf8').match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import [^\n]*;\s*$/gm,'').replace(/\/\/ ONLINE_CLIENT_BEGIN[\s\S]*?\/\/ ONLINE_CLIENT_END/,'');
let frames=0;const nodes=new Map(),noop=()=>{},drawing=new Proxy({measureText:()=>({width:60}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop});
function node(){return{style:{},dataset:{},value:'',textContent:'',innerHTML:'',hidden:true,disabled:false,checked:false,classList:{add:noop,remove:noop,toggle:noop},events:{},addEventListener(k,v){this.events[k]=v;},setAttribute:noop,focus:noop,replaceChildren:noop,getContext:()=>drawing,getBoundingClientRect:()=>({left:0,top:0,width:1000,height:560}),hasPointerCapture:()=>false,setPointerCapture:noop};}
const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
const context=vm.createContext({UTOS_ECONOMY:economy,document:{getElementById:get,querySelectorAll:()=>[],createElement:node,addEventListener:noop,hidden:false,body:{classList:{toggle:noop}}},window:{addEventListener:noop},localStorage:{getItem:()=>'{"tutorialSeen":true}',setItem:noop},requestAnimationFrame:()=>frames++,console});
vm.runInContext(source,context);const run=s=>vm.runInContext(s,context,{timeout:15000});
function pointer(name,x,y){get('game').events[name]({button:0,isPrimary:true,clientX:x,clientY:y,pointerId:1,preventDefault:noop});}
(async()=>{
 const ticket={seed:740,config:{mode:'free',map:0,tool:0,character:0,sensitivity:1,autoGetup:true,gravity:100,invite:true}};context.ticket=ticket;
 run('accountMode="account";accountWallet=economy.freshWallet();accountWallet.owned=economy.products.map(p=>p.id);prepareEarningGame(ticket);earning.ready=true;earning.prefs=JSON.stringify({sensitivity:1,autoGetup:true,gravity:100});');
 let snapshot=initialEarnings(ticket);
 let checks=0;function checkpoint(ticks){checks++; 
  const events=JSON.parse(run('JSON.stringify(earning.events.filter(e=>e[0]<'+ticks+'))'));
  const result=verifyEarnings(snapshot,events,ticks);snapshot=result.snapshot;
  const live=JSON.parse(run('JSON.stringify(earningSnapshot())'));
  for(const key of ['time','person','objects','tramps','bat','held','down','swing','worldAccumulator','holdDirection','holdTurn','holdPath','selectedMap','selectedTool','selectedCharacter','mode','challengeState','remaining','hits','score','maxCombo','starMeter'])assert.deepStrictEqual(live[key],snapshot[key],key+' diverged from trusted physics at '+checks);
  run('earning.events=earning.events.filter(e=>e[0]>='+ticks+').map(e=>[e[0]-'+ticks+',e[1],e[2]]);earning.tick-='+ticks+';');
  return result;
 }
 function steps(n){context.n=n;run('for(let i=0;i<n;i++){earningBeforeStep();simulate(STEP);earningAfterStep();}');}
 pointer('pointerdown',870,418);steps(900);checkpoint(900);
 const fixture=require('./fixture.json');let cursor=0,totalStars=0;
 for(let tick=0;tick<5400;tick++){
  while(cursor<fixture.events.length&&fixture.events[cursor][0]===tick){const[,kind,x,y]=fixture.events[cursor++];if(kind===0)pointer('pointermove',x,y);else if(kind===1)pointer('pointerdown',x,y);else if(kind===2)pointer('pointerup',x,y);else pointer('pointercancel',x,y);}
  steps(1);if((tick+1)%900===0)totalStars+=checkpoint(900).hitStars;
 }
 assert(totalStars>10);assert(run('hits')>10);assert(run('earning.pendingStars')>0);
 // Real UI handlers, pause/resume, settings, getup and scene reset preserve the replay state.
 get('pause').events.click();assert(run('paused'));get('resume').events.click();
 get('stand').events.click();get('objectsReset').events.click();get('gravity').events.input({target:{value:'60'}});get('sensitivity').events.change({target:{value:'1.35'}});
 steps(360);checkpoint(360);
 get('handTool').events.click();pointer('pointerdown',run('person.nodes[0].x'),run('person.nodes[0].y'));pointer('pointermove',540,180);steps(240);pointer('pointerup',540,180);get('handTool').events.click();steps(120);checkpoint(360);
 get('editorToggle').events.click();run('addSceneItem("box")');get('editorToggle').events.click();steps(360);checkpoint(360);
 run('accountWallet.equipped.tool="tool-4";applyEquipment()');steps(360);checkpoint(360);
 get('reset').events.click();steps(360);checkpoint(360);
 for(const map of [0,1,2])for(const tool of [0,1,2,3,4,5]){
  context.ticket={seed:740,config:{...ticket.config,map,tool}};
  run('earning.ready=false;earning.events=[];earning.tick=0;prepareEarningGame(ticket);earning.ready=true;earning.prefs=JSON.stringify({sensitivity:1,autoGetup:true,gravity:100});');
  snapshot=initialEarnings(context.ticket);pointer('pointerdown',870,418);steps(900);checkpoint(900);
  for(let tick=0;tick<360;tick++){if(tick%8===0)pointer('pointermove',tick%16?360:650,300);steps(1);}checkpoint(360);
 }
 assert.equal(frames,1);
 // Guest badges grant exactly once and remain paid through reset/repeated checks.
 run('earning.ready=false;accountMode="guest";accountWallet=null;progress.totalHits=50;maxCombo=5;checkAchievements()');const balance=run('wallet().stars');assert(balance>=35);
 run('checkAchievements();resetSession();checkAchievements()');assert.equal(run('wallet().stars'),balance);
 console.log('PASS: actual pointer/button handlers match server snapshots over 45 seconds, held-click input, segmented rewards, pause/resume, sensitivity/gravity, stand/reset, elastic hand, editor exit, glove equipment, guest one-time bonuses, one RAF.');
})().catch(e=>{console.error(e);process.exitCode=1});
