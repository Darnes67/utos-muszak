'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert'),economy=require('../economy.js'),{initialEarnings,verifyEarnings}=require('../server/engine.cjs');
const source=fs.readFileSync('index.html','utf8').match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import [^\n]*;\s*$/gm,'').replace(/\/\/ ONLINE_CLIENT_BEGIN[\s\S]*?\/\/ ONLINE_CLIENT_END/,'');
const saved=new Map();let frames=0;const nodes=new Map(),noop=()=>{},drawing=new Proxy({measureText:()=>({width:60}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||((...args)=>{for(const value of args)if(typeof value==="number")assert(Number.isFinite(value),"Non-finite draw geometry: "+k);})});
function node(){return{style:{},dataset:{},value:'',textContent:'',innerHTML:'',hidden:true,disabled:false,checked:false,classList:{add:noop,remove:noop,toggle:noop},events:{},addEventListener(k,v){this.events[k]=v;},setAttribute:noop,focus:noop,replaceChildren:noop,getContext:()=>drawing,getBoundingClientRect:()=>({left:0,top:0,width:1000,height:560}),hasPointerCapture:()=>false,setPointerCapture:noop};}
const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
const context=vm.createContext({UTOS_ECONOMY:economy,document:{getElementById:get,querySelectorAll:()=>[],createElement:node,addEventListener:noop,hidden:false,body:{classList:{toggle:noop}}},window:{addEventListener:noop},localStorage:{getItem:k=>saved.get(k)||'{"tutorialSeen":true}',setItem:(k,v)=>saved.set(k,v)},requestAnimationFrame:()=>frames++,console});
vm.runInContext(source,context);const run=s=>vm.runInContext(s,context,{timeout:15000});
function pointer(name,x,y){get('game').events[name]({button:0,isPrimary:true,clientX:x,clientY:y,pointerId:1,preventDefault:noop});}


(async()=>{
 assert.equal(run('progress.blood'),false,'legacy saves must keep blood disabled until chosen');
 get('blood').events.change({target:{checked:true}});assert(run('progress.blood'));assert(run('loadProgress().blood'));assert(get('blood').events.change);
 const baseline=run('JSON.stringify({stars:wallet().stars,score,hits,attempts,person})');
 run('visualImpact({x:500,y:300},{x:1000,y:0},.8,true,"fej")');assert(run('bloodDrops.length')>0);assert(run('impactFX.length')>0);
 assert.equal(run('JSON.stringify({stars:wallet().stars,score,hits,attempts,person})'),baseline,'visual effects cannot score or alter joints');
 run('for(let i=0;i<180;i++)updateVisualEffects(STEP)');assert.equal(run('bloodDrops.length'),0);assert(run('bloodStains.length')>0);
 run('for(let i=0;i<750;i++)updateVisualEffects(STEP)');assert.equal(run('bloodStains.length'),0,'floor marks must expire');
 for(let i=0;i<100;i++)run('visualImpact({x:500,y:420},{x:1500,y:300},.8,true,"kar");emitShot({x:700,y:250},tools[12])');
 assert(run('bloodDrops.length<=64&&bloodStains.length<=24&&impactFX.length<=20&&gunSmoke.length<=20&&shells.length<=24'),'bounded effects');
 run('down=false;lastClip=[renderSnapshot(),renderSnapshot()]');const live=run('JSON.stringify({impactFX,bloodDrops,bloodStains,gunSmoke,shells,stars:wallet().stars})');
 run('beginReplay();drawReplay();stopReplay()');assert.equal(run('JSON.stringify({impactFX,bloodDrops,bloodStains,gunSmoke,shells,stars:wallet().stars})'),live,'draw-only replay must preserve live effects/balance');
 get('blood').events.change({target:{checked:false}});assert.equal(run('bloodDrops.length'),0);assert.equal(run('bloodStains.length'),0);assert(!run('loadProgress().blood'));
 get('blood').events.change({target:{checked:true}});run('progress.reduced=true;clearVisualEffects();visualImpact({x:500,y:300},{x:1000,y:0},.5,true,"fej");emitShot({x:700,y:250},tools[12])');assert.equal(run('bloodDrops.length'),2);assert.equal(run('shells.length'),0);assert.equal(run('gunSmoke.length'),0);run('drawVisualEffects();drawBloodStains()');
 run('resetSession()');assert(run('impactFX.length+bloodDrops.length+bloodStains.length+gunSmoke.length+shells.length===0'));
 // Old and new characters draw all facial states, clothes and palettes without invalid geometry.
 for(let avatar=0;avatar<29;avatar++){
  context.avatar=avatar;run('selectedCharacter=avatar;person=null;bodyParts=characterParts();callPerson();person.x=500;person.mode="idle";physics(STEP)');
  for(const hurt of [0,.5,1]){context.hurt=hurt;run('person.hurt=hurt;person.hitName="fej";drawPerson()');}
 }
 // The comic caption must leave the face/impact readable on every skin.
 for(let avatar=0;avatar<29;avatar++){
  context.avatar=avatar;run('selectedCharacter=avatar;bodyParts=characterParts();person=null;callPerson();person.x=500;person.mode="idle";physics(STEP)');
  assert(run('(()=>{const n=person.nodes[0],r=characterProfile().headR,p=impactLabelPosition({x:n.x,y:n.y});return overlapArea({left:p.x-110,right:p.x+110,top:p.y-35,bottom:p.y+25},{left:n.x-r,right:n.x+r,top:n.y-r,bottom:n.y+r})===0;})()'),'caption covers avatar '+avatar);
 }
 run('visualImpact({x:500,y:350},{x:1000,y:0},.7,true,"fej");resetSceneObjects()');assert.equal(run('bloodDrops.length'),0,'tidy scene also removes blood');
 // Every original product keeps its ID/ownership but is a little cheaper, including guns.
 const oldPrices=[{"id": "character-0", "price": 0}, {"id": "character-1", "price": 285}, {"id": "character-2", "price": 330}, {"id": "character-3", "price": 760}, {"id": "character-4", "price": 665}, {"id": "character-5", "price": 710}, {"id": "character-6", "price": 810}, {"id": "character-7", "price": 1140}, {"id": "character-8", "price": 1425}, {"id": "tool-0", "price": 0}, {"id": "tool-1", "price": 140}, {"id": "tool-2", "price": 855}, {"id": "tool-3", "price": 380}, {"id": "tool-4", "price": 620}, {"id": "tool-5", "price": 1140}, {"id": "shirt-blue", "price": 140}, {"id": "shirt-pink", "price": 170}, {"id": "shirt-neon", "price": 430}, {"id": "shirt-galaxy", "price": 855}, {"id": "pattern-stripes", "price": 140}, {"id": "pattern-dots", "price": 140}, {"id": "pattern-comic", "price": 380}, {"id": "pattern-gold", "price": 760}, {"id": "particle-heart", "price": 285}, {"id": "particle-confetti", "price": 330}, {"id": "particle-spark", "price": 665}, {"id": "particle-orbit", "price": 1330}, {"id": "character-9", "price": 800}, {"id": "character-10", "price": 700}, {"id": "character-11", "price": 850}, {"id": "character-12", "price": 800}, {"id": "character-13", "price": 600}, {"id": "character-14", "price": 650}, {"id": "character-15", "price": 850}, {"id": "character-16", "price": 700}, {"id": "character-17", "price": 950}, {"id": "character-18", "price": 900}, {"id": "character-19", "price": 1100}, {"id": "character-20", "price": 1050}, {"id": "character-21", "price": 750}, {"id": "character-22", "price": 800}, {"id": "character-23", "price": 950}, {"id": "character-24", "price": 1200}, {"id": "character-25", "price": 750}, {"id": "character-26", "price": 850}, {"id": "character-27", "price": 900}, {"id": "character-28", "price": 1300}, {"id": "tool-6", "price": 250}, {"id": "tool-7", "price": 550}, {"id": "tool-8", "price": 350}, {"id": "tool-9", "price": 800}, {"id": "tool-10", "price": 450}, {"id": "tool-11", "price": 1000}, {"id": "tool-12", "price": 1800}, {"id": "tool-13", "price": 2400}, {"id": "tool-14", "price": 3200}];const old={product:id=>oldPrices.find(p=>p.id===id)};for(const p of economy.products){const before=old.product(p.id);assert(before);assert(p.price>=0);if(before.price)assert(p.price<before.price&&p.price>=before.price*.88,p.id+' discount');else assert.equal(p.price,0);}
 const account=economy.normalizeWallet({stars:999,owned:['character-9','tool-14'],equipped:{character:'character-9',tool:'tool-14'}});assert.equal(account.equipped.tool,'tool-14');assert.equal(account.equipped.character,'character-9');assert.equal(account.stars,999);
 assert.equal(frames,1);
 console.log('PASS: blood switch persistence/legacy default, visual effects independent of gameplay/rewards, finite drops and fading stains, bounded particles/smoke/casings, replay preservation, reduced effects, reset cleanup, all 29 facial states, discounts on all 56 products and old purchases preserved, one RAF.');
})().catch(e=>{console.error(e);process.exitCode=1});
