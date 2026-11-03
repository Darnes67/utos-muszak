const assert=require('node:assert/strict'),{ScoreStore}=require('../server/store.cjs'),{createAPI}=require('../server/api.cjs'),dom=require('../frontwars-extension/dom.js');
class Memory{constructor(){this.rows=new Map();this.i=0;}async get(k){return structuredClone(this.rows.get(k)?.data??null);}async getWithMetadata(k){return structuredClone(this.rows.get(k)||null);}async setJSON(k,data,o){const old=this.rows.get(k);if(o.onlyIfNew&&old||o.onlyIfMatch&&old?.etag!==o.onlyIfMatch)return{modified:false};this.rows.set(k,{data:structuredClone(data),etag:String(++this.i)});return{modified:true};}}
const memory=new Memory(),store=new ScoreStore(memory),users=Object.fromEntries(Array.from({length:10},(_,i)=>['u'+i,{id:String(i+1).padStart(8,'0')+'-1111-4111-8111-111111111111',email:'PRIVATE'+i+'@example.test',user_metadata:{username:'Player'+i}}]));let now=Date.parse('2026-11-03T10:00:00Z');
const api=createAPI({store,authenticate:async r=>users[r.headers.get('test-user')]||null,now:()=>now});
async function call(body,user='u0',path='/frontwars/action'){const headers={'test-user':user};if(body!==undefined)Object.assign(headers,{'Content-Type':'application/json','X-Utos-Request':'1',origin:'https://banki.test'});const r=await api(new Request('https://banki.test/api'+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)}));return{status:r.status,data:await r.json()};}
async function ok(body,user){const r=await call(body,user);assert.equal(r.status,200,JSON.stringify(r));return r.data;}
const state=(user='u0')=>call(undefined,user,'/frontwars/state');
const lobby=(mode='ffa',players=12)=>({map:'Salish Sea',economy:'FAST',mode,players,maxPlayers:50,startsAt:now+30000,image:'https://api.frontwars.io/maps/abc-123/thumbnail?v=1'});
(async()=>{
 assert.equal((await call({op:'create'},'')).status,401);assert.equal((await state('')).data.viewer,null);
 assert.equal((await call({op:'name',name:'<script>'})).status,400);assert.equal((await call({op:'create'})).status,400);
 for(const [key] of Object.entries(users))await ok({op:'name',name:'[BANKI] '+key},key);
 const before=await store.get('profile/'+users.u0.id);before.xp=4321;before.wallet.stars=1234;before.lucky67={balance:107500};await store.mutate('profile/'+before.id,before,p=>Object.assign(p,before));
 const created=await Promise.all([ok({op:'create',title:'Haverok'}),ok({op:'create',title:'Másik'})]);const code=created[0].party.code;assert.equal(created[1].party.code,code);assert.equal((await state('')).data.directory.length,1);
 await ok({op:'join',code},'u1');assert.equal((await call({op:'start'},'u1')).status,403);assert.equal((await call({op:'report',lobby:lobby()},'u1')).status,403);
 assert.equal((await call({op:'start'})).status,409);assert.equal((await call({op:'ready',ready:true})).status,409);
 for(const user of ['u0','u1']){await ok({op:'heartbeat',bridgeReady:true},user);await ok({op:'ready',ready:true},user);}
 await ok({op:'report',lobby:lobby('teams')});let r=await ok({op:'start'});assert.equal(r.party.phase,'searching');const search=r.party.searchId;assert.equal((await ok({op:'start'})).party.searchId,search);
 r=await ok({op:'report',lobby:lobby('ffa',48)});assert.equal(r.party.phase,'searching');
 r=await ok({op:'report',lobby:{...lobby(),startsAt:now+2000}});assert.equal(r.party.phase,'searching');
 r=await ok({op:'report',lobby:lobby()});assert.equal(r.party.phase,'joining');assert.equal(r.party.target.searchId,search);assert.equal(r.party.target.partySize,2);assert.equal(r.party.target.image,'https://api.frontwars.io/maps/abc-123/thumbnail');
 assert.equal((await call({op:'join',code},'u2')).status,409);assert.equal((await call({op:'cancel'},'u1')).status,403);assert.equal((await call({op:'ack',searchId:'old',status:'joined'},'u1')).status,409);
 await ok({op:'ack',searchId:search,status:'joined',gameId:'TestGame123'});assert.equal((await state('u1')).data.party.target.gameId,'TestGame123');assert.equal((await call({op:'ack',searchId:search,status:'joined',gameId:'WrongGame12'},'u1')).status,409);r=await ok({op:'ack',searchId:search,status:'failed',error:'A lobby megtelt'},'u1');assert.equal(r.party.phase,'joining');assert.equal(r.party.members[1].joinStatus,'failed');
 await ok({op:'cancel'});assert.equal((await state()).data.party.phase,'open');assert.equal((await call({op:'ack',searchId:search,status:'joined',gameId:'TestGame123'})).status,409);
 await Promise.all(['u2','u3','u4','u5','u6','u7'].map(user=>ok({op:'join',code},user)));assert.equal((await state()).data.party.size,8);assert.equal((await call({op:'join',code},'u8')).status,409);
 await ok({op:'leave'});r=(await state('u1')).data;assert.equal(r.party.leaderId,users.u1.id);assert(r.party.members.every(m=>!m.ready));assert.equal((await state()).data.party,null);
 assert.equal((await call({op:'kick',userId:users.u3.id},'u2')).status,403);await ok({op:'kick',userId:users.u3.id},'u1');assert.equal((await state('u3')).data.party,null);
 const publicData=(await state('')).data;assert(!JSON.stringify(publicData).includes('PRIVATE'));assert(!publicData.directory[0].members);assert(!publicData.directory[0].frontName);
 const saved=await store.get('profile/'+users.u0.id);assert.equal(saved.xp,4321);assert.equal(saved.wallet.stars,1234);assert.equal(saved.lucky67.balance,107500);
 now+=95000;assert.equal((await state('u1')).data.party,null);assert.equal((await state('')).data.directory.length,0);
 // Parse the exact format observed on the production card; no inferred FFA from an unknown mode.
 const lines=['HALLOWEEN · MORNING','JOIN NEXT GAME','Salish Sea','FAST','FREE FOR ALL','48/50','30s','STARTS IN'];const parsed=dom.parse(lines,'https://api.frontwars.io/maps/abc-123/thumbnail?v=1',now);assert.equal(parsed.map,'Salish Sea');assert.equal(parsed.mode,'ffa');assert.equal(parsed.players,48);assert.equal(parsed.startsAt,now+30000);
 assert.equal(dom.parse(['JOIN NEXT GAME','Türkiye','CLASSIC','6 TEAMS','7/42','1:05','STARTS IN'],'',now).mode,'teams');assert.equal(dom.parse(['JOIN NEXT GAME','X','FAST','HUMANS VS NATIONS','3/20','40s','STARTS IN'],'',now).mode,'teams');assert.equal(dom.parse(['JOIN NEXT GAME','X','FAST','UNKNOWN','3/20','40s','STARTS IN'],'',now).mode,'unknown');assert.equal(dom.parse(['loading'],'',now),null);
 assert(dom.same(parsed,{...parsed,image:parsed.image.split('?')[0]},now));assert(!dom.same(parsed,{...parsed,map:'Europe'},now));assert(!dom.same(parsed,{...parsed,startsAt:now+60000},now));assert(!dom.same({...parsed,players:50},parsed,now));assert.equal(dom.seconds('1m 05s'),65);
 console.log('PASS: authenticated cross-account parties, CAS joins/capacity, leader-only matching, ready/bridge gates, FFA and seat/time filters, launch acknowledgements, cancellation, ownership transfer, stale presence, profile preservation, public privacy, real lobby format and wrong-game refusal.');
})().catch(e=>{console.error(e);process.exitCode=1;});
