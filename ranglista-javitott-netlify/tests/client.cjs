const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const code=html.match(/\/\/ ONLINE_CLIENT_BEGIN([\s\S]*?)\/\/ ONLINE_CLIENT_END/)[1];
const elements=new Map();const noop=()=>{};
function node(){return{textContent:'',hidden:false,children:[],appendChild(v){this.children.push(v)},replaceChildren(){this.children=[]},addEventListener:noop,focus:noop,value:'',className:'',disabled:false,reportValidity:()=>true};}
const $=id=>{if(!elements.has(id))elements.set(id,node());return elements.get(id);};
let captured,tokenRequests=0;
const context=vm.createContext({$,document:{createElement:node,querySelectorAll:()=>[]},window:{addEventListener:noop},competition:{active:false,ending:false},getIdentityUser:async()=>({id:'a'}),getAccessToken:async()=>{tokenRequests++;return'fresh-jwt';},fetch:async(url,opts)=>{captured={url,opts};return new Response(JSON.stringify({rows:[{user_id:'a',username:'Alex',place:1,points:900,accuracy:80,best_streak:4}],mine:{place:1,points:900}}),{headers:{'Content-Type':'application/json'}});},playing:()=>false,handleAuthCallback:async()=>null,location:{protocol:'file:'},notify:noop,Response});
vm.runInContext(code,context);const run=source=>vm.runInContext(source,context);
(async()=>{
 run('onlineUser={id:"a",username:"Alex",xp:50,games:1}');await run('loadLeaderboard()');
 assert.equal(captured.opts.headers.Authorization,'Bearer fresh-jwt');assert(tokenRequests>0);assert.equal($('myPlace').textContent,'Saját helyezés: #1 · 900 pont');assert.equal($('boardRows').children[0].children[1].textContent,'Alex');
 context.fetch=async()=>new Response('<html>404</html>',{status:404,headers:{'Content-Type':'text/html'}});await assert.rejects(()=>run('api("/leaderboard")'),/Hiányzik a ranglista API/);
 context.fetch=async()=>new Response(JSON.stringify({error:'A munkamenet lejárt.'}),{status:401,headers:{'Content-Type':'application/json'}});await run('loadLeaderboard()');assert.equal(run('onlineUser'),null);assert.equal($('boardRows').children.length,0);assert($('boardMessage').textContent.includes('lejárt'));
 context.fetch=async()=>{throw Error('Failed to fetch')};await assert.rejects(()=>run('api("/leaderboard")'),/Nincs kapcsolat/);
 const auth=fs.readFileSync(require('node:path').join(__dirname,'../auth.js'),'utf8');assert(auth.includes('export async function getAccessToken()'));assert(html.includes('getAccessToken } from'));
 console.log('PASS: refreshed JWT header, actual leaderboard DOM, own placement, explicit missing-API error, expired session clears old rows, network-error handling.');
})().catch(e=>{console.error(e);process.exitCode=1});
