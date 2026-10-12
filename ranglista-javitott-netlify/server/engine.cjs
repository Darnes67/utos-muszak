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
      code=match[1].replace(/^import .* from ['"]\.\/auth\.js['"];\s*$/m,'').replace(/\/\/ ONLINE_CLIENT_BEGIN[\s\S]*?\/\/ ONLINE_CLIENT_END/,'');
    }
    compiled=new vm.Script(code,{filename:'trusted-game-engine.js'});
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
  const context=vm.createContext({document:doc,window:{addEventListener:noop},localStorage:{getItem:()=>'{"tutorialSeen":true}',setItem:noop},requestAnimationFrame:noop,console:{log:noop},Math});
  compiled.runInContext(context,{timeout:1000});
  vm.runInContext('recordFrame=()=>{};saveProgress=()=>{};renderRewards=()=>{};checkAchievements=()=>{};notify=()=>{};',context);
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
  const result=vm.runInContext(`
    prepareCompetitiveRound(ticket);
    let cursor=0;
    for(let tick=0;tick<5400;tick++){
      while(cursor<inputEvents.length&&inputEvents[cursor][0]===tick)applyCompetitiveInput(inputEvents[cursor++]);
      simulate(STEP);competitionStepDone();
    }
    JSON.stringify(competitiveMetrics());`,context,{timeout:9000});
  return JSON.parse(result);
}
module.exports={ENGINE_VERSION,createEngine,verifyRound,validateEvents,checkEngine};
