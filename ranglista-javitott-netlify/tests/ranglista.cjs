const assert=require('node:assert'),fs=require('node:fs'),path=require('node:path');
const {ScoreStore}=require('../server/store.cjs');
const {createAPI,identityUser,weekKey,definition}=require('../server/api.cjs');
class MemoryBlobs{
 constructor(){this.rows=new Map();this.serial=0;this.failBoard=false;this.conflicts=0;}
 async get(k){return this.rows.has(k)?structuredClone(this.rows.get(k).data):null;}
 async getWithMetadata(k){return this.rows.has(k)?structuredClone(this.rows.get(k)):null;}
 async setJSON(k,data,options){
  if(this.failBoard&&k.startsWith('board/'))throw Error('Simulated storage outage');
  const old=this.rows.get(k);if(options.onlyIfNew&&old||options.onlyIfMatch&&old?.etag!==options.onlyIfMatch){this.conflicts++;return{modified:false};}
  const etag=String(++this.serial);this.rows.set(k,{data:structuredClone(data),etag});return{modified:true,etag};
 }
}
const userA={id:'11111111-1111-4111-8111-111111111111',email:'secret-a@example.test',user_metadata:{username:'Alex'}};
const userB={id:'22222222-2222-4222-8222-222222222222',email:'secret-b@example.test',user_metadata:{username:'Alex'}};
const blobs=new MemoryBlobs(),store=new ScoreStore(blobs);let clock=Date.parse('2026-10-12T12:00:00Z');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixture.json')));
const api=createAPI({store,authenticate:async req=>req.headers.get('x-test-user')==='a'?userA:req.headers.get('x-test-user')==='b'?userB:null,now:()=>clock});
async function call(route,body,user){const headers={};if(user)headers['x-test-user']=user;if(body!==undefined)Object.assign(headers,{'Content-Type':'application/json','X-Utos-Request':'1',origin:'https://game.test'});const response=await api(new Request('https://game.test/api'+route,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)}));assert.equal(response.headers.get('cache-control'),'no-store');return{status:response.status,data:await response.json()};}
(async()=>{
 assert.equal((await call('/me')).data.user,null);
 assert.equal((await call('/round/start',{kind:'sprint'})).status,401);
 const a=(await call('/me',undefined,'a')).data.user,b=(await call('/me',undefined,'b')).data.user;assert.equal(a.username,'Alex');assert.notEqual(b.username,'Alex');assert(!JSON.stringify(a).includes('email'));
 assert.deepEqual((await call('/leaderboard?kind=sprint&period=all')).data.rows,[]);
 const start=await call('/round/start',{kind:'sprint'},'a');assert.equal(start.status,200);const id=start.data.ticket.id;
 assert.equal((await call('/round/finish',{roundId:id,ticks:5400,events:fixture.events},'b')).status,404);
 assert.equal((await call('/round/finish',{roundId:id,ticks:5400,events:fixture.events},'a')).status,400);
 clock+=46000;
 assert.equal((await call('/round/finish',{roundId:id,ticks:5400,events:[[0,0,-2,4]]},'a')).status,400);
 blobs.failBoard=true;const partial=await call('/round/finish',{roundId:id,ticks:5400,events:fixture.events,points:99999999},'a');assert.equal(partial.status,503);
 const saved=await store.get('profile/'+a.id);assert.equal(saved.games,1);assert.equal(saved.rounds[id].result.points,fixture.metrics.points);const xp=saved.xp;
 blobs.failBoard=false;const result=await call('/round/finish',{roundId:id,ticks:5400,events:[]},'a');assert.equal(result.status,200);assert.equal(result.data.user.xp,xp);assert.equal(result.data.user.games,1);
 const repeated=await Promise.all([call('/round/finish',{roundId:id},'a'),call('/round/finish',{roundId:id},'a')]);assert(repeated.every(r=>r.status===200));assert.equal((await store.get('profile/'+a.id)).games,1);
 const board=await call('/leaderboard?kind=sprint&period=week',undefined,'a');assert.equal(board.data.mine.place,1);assert.equal(board.data.rows[0].points,fixture.metrics.points);assert(!JSON.stringify(board.data).includes('secret-a'));
 assert.equal((await call('/leaderboard?kind=sprint&period=bad')).status,400);
 // Concurrent CAS updates must preserve every increment and both board rows.
 await store.mutate('counter',{n:0},x=>x.n++);
 await Promise.all(Array.from({length:8},()=>store.mutate('counter',{n:0},x=>++x.n)));assert.equal((await store.get('counter')).n,9);assert(blobs.conflicts>0);
 // A stub verifier isolates multi-user persistence logic, without trusting submitted score.
 const quick=createAPI({store,authenticate:async req=>req.headers.get('x-test-user')==='b'?userB:null,now:()=>clock,verify:()=>({...fixture.metrics,points:123})});
 const request=(route,body)=>quick(new Request('https://game.test/api'+route,{method:'POST',headers:{'x-test-user':'b','Content-Type':'application/json','X-Utos-Request':'1',origin:'https://game.test'},body:JSON.stringify(body)}));
 const ticket=await(await request('/round/start',{kind:'sprint'})).json();clock+=46000;await request('/round/finish',{roundId:ticket.ticket.id});
 const second=await call('/leaderboard?kind=sprint&period=all',undefined,'b');assert.equal(second.data.rows.length,2);assert.equal(second.data.mine.place,2);
 const expired=(await call('/round/start',{kind:'daily'},'a')).data.ticket;clock+=481000;assert.equal((await call('/round/finish',{roundId:expired.id,ticks:5400,events:[]},'a')).status,410);
 assert.equal(weekKey('2026-10-18'),weekKey('2026-10-12'));assert.notEqual(definition('daily',new Date('2026-10-12')).board,definition('daily',new Date('2026-10-13')).board);
 const nativeFetch=global.fetch;global.fetch=async(url,opts)=>{assert(url.endsWith('/.netlify/identity/user'));assert.equal(opts.headers.Authorization,'Bearer valid-test-token');return new Response(JSON.stringify(userA),{status:200});};assert.equal((await identityUser(new Request('https://game.test/api/me',{headers:{Authorization:'Bearer valid-test-token'}}))).id,userA.id);
 global.fetch=async()=>new Response('{}',{status:401});await assert.rejects(()=>identityUser(new Request('https://game.test/api/me',{headers:{Authorization:'Bearer unsigned-fake-jwt'}})),/lejárt/);global.fetch=nativeFetch;
 console.log('PASS: Identity verification, public/private profile, duplicate name, full server physics, empty/listed leaderboard, own placement, timing/expiry, one-time XP, CAS races, partial write repair, week/day keys, no-cache responses.');
})().catch(e=>{console.error(e);process.exitCode=1});
