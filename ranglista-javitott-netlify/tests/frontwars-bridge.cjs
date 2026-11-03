const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),dom=require('../frontwars-extension/dom.js');
const source=fs.readFileSync('frontwars-extension/bridge.js','utf8'),ORIGIN='https://bankiwebtar.netlify.app',nonce='test-parent-nonce-123456789';
let now=1000000,listener,reporter,clicks=0;const messages=[],saved=new Map(),parent={postMessage:(data,origin)=>{assert.equal(origin,ORIGIN);messages.push(data);}};
class Input{get value(){return this._value||'';}set value(v){this._value=v;}dispatchEvent(e){assert(['input','change'].includes(e.type));}}
const input=new Input(),target={map:'Salish Sea',economy:'FAST',mode:'ffa',players:12,maxPlayers:50,startsAt:now+30000,image:'https://api.frontwars.io/maps/abc/thumbnail',dispatchAt:now,partySize:2};let lobby={...target},splash=false;
const location={href:'https://frontwars.io/',search:'',assign(url){this.href=url;this.search=new URL(url).search;document.body.innerText=input.value+' WAITING FOR PLAYERS';}};
const hit={},card={scrollIntoView(){},getBoundingClientRect:()=>({left:0,top:0,width:500,height:400}),contains:e=>e===hit,click(){clicks++;location.href='https://frontwars.io/?game=ActualGame123';location.search='?game=ActualGame123';document.body.innerText=input.value+' WAITING FOR PLAYERS';}};
const document={body:{innerText:'JOIN NEXT GAME'},querySelector:q=>q==='input[placeholder="Enter your username"]'?input:q==='#fw-splash'&&splash?{}:null,elementFromPoint:()=>hit};
const context={console,URL,URLSearchParams,Date:class extends Date{static now(){return now;}},innerHeight:800,HTMLInputElement:Input,Event:class{constructor(type){this.type=type;}},document,location,sessionStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},window:{parent,addEventListener:(type,handler)=>{assert.equal(type,'message');listener=handler;}},BankiFrontwarsDOM:{...dom,read:()=>lobby,same:(l,t)=>dom.same(l,t,now),card:()=>({element:card})},setTimeout:fn=>{setImmediate(fn);},setInterval:fn=>{reporter=fn;}};
vm.runInNewContext(source,context);
const send=(type,data={},origin=ORIGIN,source=parent)=>listener({origin,source,data:{channel:'banki-frontwars-v1',nonce,type,...data}}),flush=async()=>{for(let i=0;i<90;i++)await new Promise(r=>setImmediate(r));};
(async()=>{
 send('ping',{},'https://evil.test');send('ping',{},ORIGIN,{});assert.equal(messages.length,0);
 send('ping');assert(messages.some(m=>m.type==='hello'));assert(messages.some(m=>m.type==='snapshot'));
 send('prepare',{name:'[BANKI] Test'});await flush();assert.equal(input.value,'[BANKI] Test');assert(messages.some(m=>m.type==='prepared'));
 send('join',{attemptId:'leader-attempt-1',name:'Leader',target});await flush();assert.equal(clicks,1);assert(messages.some(m=>m.type==='joined'&&m.gameId==='ActualGame123'&&m.attemptId==='leader-attempt-1'));
 send('join',{attemptId:'leader-attempt-1',name:'Leader',target});await flush();assert.equal(clicks,1);
 location.href='https://frontwars.io/';location.search='';document.body.innerText='JOIN NEXT GAME';send('join',{attemptId:'member-attempt-1',name:'Member',target:{...target,gameId:'ActualGame123'}});await flush();assert.equal(location.href,'https://frontwars.io/?game=ActualGame123');assert.equal(clicks,1);reporter();assert(messages.some(m=>m.type==='joined'&&m.attemptId==='member-attempt-1'&&m.gameId==='ActualGame123'));
 location.href='https://frontwars.io/';location.search='';document.body.innerText='JOIN NEXT GAME';lobby={...target,mode:'teams'};send('join',{attemptId:'wrong-mode',name:'Member',target});await flush();assert.equal(clicks,1);assert(messages.some(m=>m.type==='failed'&&m.attemptId==='wrong-mode'));assert.equal(saved.size,0);
 lobby={...target};send('cancel',{attemptId:'cancel-before-join'});send('join',{attemptId:'cancel-before-join',name:'Member',target});await flush();assert.equal(clicks,1);
 assert(messages.every(m=>m.nonce===nonce));assert(!JSON.stringify(messages).includes('cookie'));console.log('PASS: extension origin/source/nonce checks, native name input events, exact-game follower navigation, reload confirmation, duplicate/cancel prevention, and wrong-mode refusal.');
})().catch(e=>{console.error(e);process.exitCode=1;});
