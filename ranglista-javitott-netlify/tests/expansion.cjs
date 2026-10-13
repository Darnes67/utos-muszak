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
 const config={mode:'free',map:0,tool:12,character:9,sensitivity:1,autoGetup:true,gravity:100,invite:true,ready:true};
 context.ticket={seed:740,config};
 run('accountMode="account";accountWallet=economy.freshWallet();accountWallet.owned=economy.products.map(p=>p.id);prepareEarningGame(ticket);earning.ready=true;earning.prefs=JSON.stringify({sensitivity:1,autoGetup:true,gravity:100});');
 const before=run('hits');pointer('pointerdown',870,418);run('for(let i=0;i<60;i++)simulate(STEP)');
 assert.equal(run('projectiles.length'),0,'pickup must not shoot');assert.equal(run('attempts'),0);
 pointer('pointerup',870,418);
 // Each bullet can hit only once, even when its sweep crosses several joints.
 for(const tool of [12,13,14]){
  context.tool=tool;run('selectedTool=tool;objects=[];person=null;callPerson();person.x=500;person.mode="idle";person.safeTime=0;physics(STEP);');
  const y=run('person.nodes[0].y'),oldHits=run('hits'),oldAttempts=run('attempts');context.y=y;
  run('projectiles=[{tool,x:0,y,px:0,py:y,vx:4000,vy:0,r:2,age:0}];updateProjectiles(.25)');
  assert.equal(run('hits'),oldHits+1);assert.equal(run('attempts'),oldAttempts+1);assert.equal(run('projectiles.length'),0);
  run('updateProjectiles(.25)');assert.equal(run('hits'),oldHits+1);
  assert(run('strongest')>=25&&run('strongest')<=60,'guns must allow medium-strength missions');
 }
 // Actual pointer input, all maps and every new tool, exactly replayed by the server.
 let gunHits=0;
 const keys=['time','person','objects','tramps','bat','held','down','selectedMap','selectedTool','selectedCharacter','hits','objectHits','score','attempts','misses','maxCombo','starMeter','projectiles','fireCooldown','muzzleFlash','gunArmed'];
 for(const map of [0,1,2])for(const tool of [6,7,8,9,10,11,12,13,14]){
  context.ticket={seed:740,config:{...config,map,tool,character:9+((tool+map)%20)}};
  run('earning.ready=false;earning.events=[];earning.tick=0;prepareEarningGame(ticket);earning.ready=true;earning.prefs=JSON.stringify({sensitivity:1,autoGetup:true,gravity:100});');
  let snapshot=initialEarnings(context.ticket);
  pointer('pointerdown',870,418);
  for(let tick=0;tick<480;tick++){
   if(tick%6===0){const p=JSON.parse(run('JSON.stringify(person.nodes[0])'));pointer('pointermove',tool>=12?p.x:tick%12?360:650,tool>=12?p.y:330);}
   run('earningBeforeStep();simulate(STEP);earningAfterStep();');
   if((tick+1)%240===0){
    const events=JSON.parse(run('JSON.stringify(earning.events.filter(e=>e[0]<240))'));
    const result=verifyEarnings(snapshot,events,240);snapshot=result.snapshot;
    const live=JSON.parse(run('JSON.stringify(earningSnapshot())'));
    for(const key of keys)assert.deepStrictEqual(live[key],snapshot[key],key+' mismatch tool '+tool+' map '+map);
    run('earning.events=earning.events.filter(e=>e[0]>=240).map(e=>[e[0]-240,e[1],e[2]]);earning.tick-=240');
   }
  }
  if(tool>=12){assert(run('attempts')>=2,'held automatic fire');gunHits+=run('hits');}
 }
 assert(gunHits>10,'automatic shots must really hit the moving person');
 // Pause prevents physics/timer/shots; release stops automatic fire, reset cancels in-flight bullets.
 const state=run('JSON.stringify(earningSnapshot())');get('pause').events.click();const pausedState=run('JSON.stringify(projectiles)');
 assert(run('paused'));assert(!run('playing()'));assert.equal(run('JSON.stringify(projectiles)'),pausedState);get('resume').events.click();assert(!run('down'));
 run('projectiles=[{x:200,y:100,px:190,py:100,vx:1000,vy:0,tool:14,r:2,age:.1}];lastClip=[renderSnapshot(),renderSnapshot()];down=false;');
 const replayState=run('JSON.stringify(earningSnapshot())');run('beginReplay();drawReplay();stopReplay()');assert.equal(run('JSON.stringify(earningSnapshot())'),replayState,'replay must preserve live physics');
 run('resetSession()');assert.equal(run('projectiles.length'),0);assert.equal(run('fireCooldown'),0);
 // Silhouettes stay inside the Canvas even at extreme rotations/edge pickup positions.
 for(let tool=0;tool<15;tool++)for(let a=0;a<8;a++){
  context.tool=tool;context.a=a;run('selectedTool=tool;Object.assign(bat,{x:a%2?0:W,y:a%3?0:H,angle:a*Math.PI/4});constrainToolPose(bat)');
  assert(run('toolParts().every(([x1,y1,x2,y2,r])=>[[x1,y1],[x2,y2]].every(([x,y])=>{const p=transform(bat,x,y);return p.x-r>=-0.01&&p.x+r<=W+.01&&p.y-r>=-.01&&p.y+r<=H+.01}))'),'tool clipped '+tool);
 }
 for(let avatar=9;avatar<29;avatar++){
  context.avatar=avatar;run('selectedCharacter=avatar;bodyParts=characterParts();person=null;callPerson();for(let i=0;i<1000;i++)simulate(STEP);drawPerson()');
  assert(run('person.nodes.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y))'));
 }
 // Old snapshots from before guns still restore safely.
 const legacy=JSON.parse(run('JSON.stringify(earningSnapshot())'));for(const k of ['projectiles','fireCooldown','muzzleFlash','gunArmed'])delete legacy[k];context.legacy=legacy;run('restoreEarningSnapshot(legacy);simulate(STEP)');assert.equal(run('projectiles.length'),0);
 assert.equal(frames,1);
 console.log('PASS: 20 new character physics/drawing, 9 new tools on all 3 maps, UI/server projectile checkpoints, held automatic fire, no pickup attempt, one bullet/one hit, swept high-speed shots, medium-strength missions, pause/reset/replay, 15 rotated edge-safe tool geometries, old snapshot compatibility, one RAF.');
})().catch(e=>{console.error(e);process.exitCode=1});
