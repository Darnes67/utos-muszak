'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ENGINE_VERSION='identity-ranglista-1';
let compiled;
function checkEngine(){
  if(!compiled){
    let code;
    try{code=require('./game-source.cjs');}catch(error){
      if(error.code!=='MODULE_NOT_FOUND')throw error;
      const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
      const match=html.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/);if(!match)throw Error('Missing game engine');
      code=match[1].replace(/^import [^\n]*;\s*$/gm,'').replace(/\/\/ ONLINE_CLIENT_BEGIN[\s\S]*?\/\/ ONLINE_CLIENT_END/,'');
    }
    // Keep hot physics variables in an ordinary function scope instead of VM-global bindings.
    // Math belongs to this VM; borrowing host Math makes every physics operation cross contexts.
    compiled=new vm.Script(`'use strict';(function(){
      const Math=globalThis.Math;
      ${code}
      recordFrame=()=>{};saveProgress=()=>{};renderRewards=()=>{};checkAchievements=()=>{for(const a of achievementDefs)if(a.test())earning.badges.add(a.id);};notify=()=>{};
      return {
        initial(ticket){progress=defaultProgress();progress.tutorialSeen=true;prepareEarningGame(ticket);return JSON.stringify(earningSnapshot());},
        segment(snapshot,events,ticks){
          restoreEarningSnapshot(snapshot);const before=starMeter.credits,hitsBefore=progress.totalHits,conesBefore=progress.totalCones;
          let cursor=0;
          for(let tick=0;tick<ticks;tick++){
            while(cursor<events.length&&events[cursor][0]===tick){const e=events[cursor++];applyEarningCommand(e[1],e[2]);}
            if(playing()){simulate(STEP);if(challengeState==='running'&&modeDefs[mode].duration){remaining=Math.max(0,remaining-STEP);if(remaining<=0)endChallenge();}}
          }
          return JSON.stringify({snapshot:earningSnapshot(),hitStars:Math.floor(starMeter.credits+1e-7)-Math.floor(before+1e-7),
            stats:{hits:progress.totalHits-hitsBefore,cones:progress.totalCones-conesBefore,tools:progress.tools,maps:progress.maps,badges:[...earning.badges]}});
        },verify(ticket,inputEvents){
        prepareCompetitiveRound(ticket);
        let cursor=0;
        for(let tick=0;tick<5400;tick++){
          while(cursor<inputEvents.length&&inputEvents[cursor][0]===tick)applyCompetitiveInput(inputEvents[cursor++]);
          simulate(STEP);competitionStepDone();
        }
        return JSON.stringify(competitiveMetrics());
      }};
    })()`,{filename:'trusted-game-engine.js'});
  }
  return true;
}
function createEngine(){
  checkEngine();
  const elements=new Map();
  const noop=()=>{};
  const gradient={addColorStop:noop};
  const drawing=new Proxy({measureText:()=>({width:50}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
  function el(){return{style:{},dataset:{},hidden:true,textContent:'',innerHTML:'',disabled:false,checked:false,value:'',classList:{toggle:noop,remove:noop,add:noop},setAttribute:noop,focus:noop,replaceChildren:noop,appendChild:noop,addEventListener:noop,getContext:()=>drawing,hasPointerCapture:()=>false,getBoundingClientRect:()=>({left:0,top:0,width:1000,height:560}),setPointerCapture:noop};}
  const doc={getElementById(id){if(!elements.has(id))elements.set(id,el());return elements.get(id);},querySelectorAll:()=>[],createElement:el,addEventListener:noop,hidden:false,activeElement:null};
  const context=vm.createContext({UTOS_ECONOMY:require('../economy.js'),document:doc,window:{addEventListener:noop},localStorage:{getItem:()=>'{"tutorialSeen":true}',setItem:noop},requestAnimationFrame:noop,console:{log:noop}});
  context.engine=compiled.runInContext(context,{timeout:1000});
  return context;
}
function validateEvents(events,ticks){
  if(ticks!==5400||!Array.isArray(events)||events.length>12000)throw Error('Érvénytelen körhossz vagy bemenet.');
  let previousTick=-1,count=0;
  for(const e of events){
    if(!Array.isArray(e)||e.length!==4||!e.every(Number.isFinite)||!Number.isInteger(e[0])||e[0]<0||e[0]>5400||!Number.isInteger(e[1])||e[1]<0||e[1]>3||e[2]<0||e[2]>1000||e[3]<0||e[3]>560||e[0]<previousTick)throw Error('Érvénytelen egérmozdulat.');
    count=e[0]===previousTick?count+1:1;if(count>12)throw Error('Túl sok esemény egy fizikai lépésben.');previousTick=e[0];
  }
}
function verifyRound(ticket,events,ticks){
  validateEvents(events,ticks);const context=createEngine();context.ticket=ticket;context.inputEvents=events;
  const result=vm.runInContext('engine.verify(ticket,inputEvents)',context,{timeout:22000});
  return JSON.parse(result);
}
function initialEarnings(ticket){const c=createEngine();c.ticket=ticket;return JSON.parse(vm.runInContext('engine.initial(ticket)',c,{timeout:2000}));}
function verifyEarnings(snapshot,events,ticks){const c=createEngine();Object.assign(c,{snapshot,events,ticks});return JSON.parse(vm.runInContext('engine.segment(snapshot,events,ticks)',c,{timeout:15000}));}
module.exports={initialEarnings,verifyEarnings,ENGINE_VERSION,createEngine,verifyRound,validateEvents,checkEngine};
