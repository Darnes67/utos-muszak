const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const code=html.match(/\/\/ ONLINE_CLIENT_BEGIN([\s\S]*?)\/\/ ONLINE_CLIENT_END/)[1];
const elements=new Map();const noop=()=>{};
function node(){return{textContent:'',hidden:false,children:[],appendChild(v){this.children.push(v)},replaceChildren(){this.children=[]},addEventListener:noop,focus:noop,value:'',className:'',disabled:false,reportValidity:()=>true};}
const $=id=>{if(!elements.has(id))elements.set(id,node());return elements.get(id);};
let captured,tokenRequests=0;const savedSession=new Map();
const context=vm.createContext({economy:require('../economy.js'),accountMode:'guest',accountWallet:null,applyEquipment:noop,renderRewards:noop,progress:{guestWallet:{owned:[]}},sessionStars:0,$,document:{createElement:node,querySelectorAll:()=>[],querySelector:()=>null},window:{addEventListener:noop},competition:{active:false,ending:false},getIdentityUser:async()=>({id:'a'}),getAccessToken:async()=>{tokenRequests++;return'fresh-jwt';},fetch:async(url,opts)=>{captured={url,opts};return new Response(JSON.stringify({rows:[{user_id:'a',username:'Alex',place:1,points:900,accuracy:80,best_streak:4}],mine:{place:1,points:900}}),{headers:{'Content-Type':'application/json'}});},playing:()=>false,handleAuthCallback:async()=>null,location:{protocol:'file:'},notify:noop,Response,AbortController,setTimeout:(fn,ms)=>setTimeout(fn,ms===40000?30:ms),clearTimeout,sessionStorage:{getItem:k=>savedSession.get(k)||null,setItem:(k,v)=>savedSession.set(k,v),removeItem:k=>savedSession.delete(k)}});
vm.runInContext(code,context);const run=source=>vm.runInContext(source,context);
(async()=>{
 run('onlineUser={id:"a",username:"Alex",xp:50,games:1}');await run('loadLeaderboard()');
 assert.equal(captured.opts.headers.Authorization,'Bearer fresh-jwt');assert(tokenRequests>0);assert.equal($('myPlace').textContent,'Saját helyezés: #1 · 900 pont');assert.equal($('boardRows').children[0].children[1].textContent,'Alex');
 context.fetch=async()=>new Response('<html>404</html>',{status:404,headers:{'Content-Type':'text/html'}});await assert.rejects(()=>run('api("/leaderboard")'),/Hiányzik a ranglista API/);
 context.fetch=async()=>new Response(JSON.stringify({error:'A munkamenet lejárt.'}),{status:401,headers:{'Content-Type':'application/json'}});await run('loadLeaderboard()');assert.equal(run('onlineUser'),null);assert.equal($('boardRows').children.length,0);assert($('boardMessage').textContent.includes('lejárt'));
 context.fetch=async()=>{throw Error('Failed to fetch')};await assert.rejects(()=>run('api("/leaderboard")'),/Nincs kapcsolat/);
 // Timeouts cover authentication, network and response-body stalls.
 context.getIdentityUser=()=>new Promise(()=>{});await assert.rejects(()=>run('api("/me")'),/40 másodpercen/);
 context.getIdentityUser=async()=>({id:'a'});context.fetch=(url,opts)=>{captured={opts};return new Promise(()=>{});};await assert.rejects(()=>run('api("/me")'),/40 másodpercen/);assert(captured.opts.signal.aborted);
 context.fetch=async()=>({ok:true,headers:new Headers({'Content-Type':'application/json'}),json:()=>new Promise(()=>{})});await assert.rejects(()=>run('api("/me")'),/40 másodpercen/);
 run('onlineUser={id:"a",username:"Alex",xp:50,games:1};pendingSubmission={roundId:"test-round",events:[],ticks:5400};keepSubmission()');
 context.fetch=async()=>{throw Error('offline')};await run('sendCompetitiveResult()');assert.equal(run('onlineBusy'),false);assert.equal($('submitAgain').hidden,false);assert.equal(run('pendingSubmission.roundId'),'test-round');assert(savedSession.size);
 run('pendingSubmission=null;restoreSubmission()');assert.equal(run('pendingSubmission.roundId'),'test-round');
 context.fetch=async(url)=>new Response(JSON.stringify(url.endsWith('/round/finish')?{user:{id:'a',username:'Alex',xp:100,games:2},result:{points:900,xp:50}}:{rows:[],mine:null}),{headers:{'Content-Type':'application/json'}});
 await run('sendCompetitiveResult()');assert.equal(run('pendingSubmission'),null);assert.equal(savedSession.size,0);assert($('resultOnline').textContent.includes('Ranglistára mentve'));
 // A lost purchase response must retry the same transaction ID.
 run('onlineUser={id:"a",username:"Alex",xp:100,games:2}');
 let purchaseId;context.fetch=async(url,opts)=>{purchaseId=JSON.parse(opts.body).transactionId;throw Error('lost response')};
 await assert.rejects(()=>run('accountShopAction("buy","tool-1")'),/Nincs kapcsolat/);assert(savedSession.size);
 context.fetch=async(url,opts)=>{assert.equal(JSON.parse(opts.body).transactionId,purchaseId);return new Response(JSON.stringify({user:{id:'a',username:'Alex',xp:100,games:2,wallet:{stars:200,owned:['tool-0','character-0','tool-1'],equipped:{tool:'tool-0',character:'character-0'}}}}),{headers:{'Content-Type':'application/json'}});};
 await run('accountShopAction("buy","tool-1")');assert.equal(run('accountWallet.stars'),200);assert(run('accountWallet.owned.includes("tool-1")'));assert.equal(savedSession.size,0);
 const auth=fs.readFileSync(require('node:path').join(__dirname,'../auth.js'),'utf8');assert(auth.includes('export async function getAccessToken()'));assert(html.includes('getAccessToken } from'));
 console.log('PASS: refreshed JWT header, actual leaderboard DOM, own placement, explicit missing-API error, expired session clears old rows, network-error handling, auth/fetch/body timeouts, pending-round recovery and successful retry.');
})().catch(e=>{console.error(e);process.exitCode=1});
