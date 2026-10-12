'use strict';
const {randomUUID,createHash}=require('node:crypto');
const {HttpError,profileKey}=require('./store.cjs');
const {ENGINE_VERSION,verifyRound,checkEngine}=require('./engine.cjs');
const shop=require('./shop.cjs');
const digest=value=>createHash('sha256').update(value).digest('hex');
const expose=p=>p?{id:p.id,username:p.username,xp:p.xp,games:p.games,wallet:shop.publicWallet(p)}:null;
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function weekKey(date){const d=new Date(date);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
function definition(kind,date=new Date()){
  if(kind==='sprint')return{kind,board:'sprint',map:0,tool:0,character:0,seed:740};
  if(kind==='combo')return{kind,board:'combo',map:0,tool:1,character:1,seed:741};
  if(kind==='daily'){const day=date.toISOString().slice(0,10),seed=parseInt(digest(day).slice(0,8),16);return{kind,board:'daily:'+day,map:seed%3,tool:Math.floor(seed/3)%6,character:3+Math.floor(seed/18)%6,seed};}
  throw new HttpError(400,'Ismeretlen versenytípus.');
}
function bearer(req){const auth=req.headers.get('authorization');if(auth?.startsWith('Bearer '))return auth.slice(7);const cookie=(req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('nf_jwt='));if(!cookie)return null;try{return decodeURIComponent(cookie.slice(7));}catch(_){return null;}}
function identityURL(req){return new URL('/.netlify/identity/user',req.url).href;}
async function probeIdentity(req){
  try{
    const response=await fetch(identityURL(req),{headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(8000)});
    return {ready:response.status===401,status:response.status};
  }catch(_){return {ready:false,status:0};}
}
async function identityUser(req){
  const token=bearer(req);if(!token)return null;
  if(token.length>10000)throw new HttpError(401,'A munkamenet érvénytelen. Jelentkezz be újra!');
  // The browser and verifier must use the SAME project's service, including after a site move.
  // Do not use a stale URL environment setting and never trust a decoded JWT.
  let response;
  try{response=await fetch(identityURL(req),{headers:{Authorization:'Bearer '+token,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(8000)});}
  catch(_){throw new HttpError(503,'A szerver nem tudott kapcsolódni a fiókszolgáltatáshoz. Próbáld újra!');}
  if(response.status===401||response.status===403)throw new HttpError(401,'A munkamenet lejárt, vagy másik projekthez tartozik. Jelentkezz be újra ezen az oldalon!');
  if(!response.ok)throw new HttpError(503,'A fiókszolgáltatás nem válaszolt megfelelően (HTTP '+response.status+'). Próbáld újra!');
  let user;try{user=await response.json();}catch(_){throw new HttpError(503,'A fiókszolgáltatás hibás választ adott. Próbáld újra!');}
  if(typeof user.id!=='string'||!/^[a-f0-9-]{36}$/i.test(user.id))throw new HttpError(401,'Érvénytelen játékosfiók.');return user;
}
async function ensureProfile(store,user){
  const key=profileKey(user.id),found=await store.get(key);if(found){if(found.wallet?.version===1)return found;return store.mutate(key,found,p=>{shop.ensureWallet(p);return p;});}
  const requested=user.user_metadata?.username||user.user_metadata?.full_name||'',base=/^[A-Za-z0-9_]{3,18}$/.test(requested)?requested:'Jatekos_'+digest(user.id).slice(0,6);
  let username;
  for(let i=0;i<20;i++){
    const candidate=i?base.slice(0,10)+'_'+digest(user.id).slice(0,5)+i:base;
    const claimed=await store.mutate('name/'+candidate.toLowerCase(),{owner:null},record=>{if(record.owner&&record.owner!==user.id)return false;record.owner=user.id;return true;});
    if(claimed){username=candidate;break;}
  }
  if(!username)throw new HttpError(503,'A játékosnév most nem foglalható le. Próbáld újra!');
  return store.mutate(key,{id:user.id,username,xp:0,games:0,rounds:{},starts:[],finishes:[]},p=>{shop.ensureWallet(p);return p;});
}
async function indexResult(store,profile,round,result){
  const row={user_id:profile.id,username:profile.username,points:result.points,accuracy:result.accuracy,best_streak:result.bestStreak,created_at:result.created_at};
  for(const period of ['all','week:'+weekKey(result.created_at)]){
    await store.mutate('board/'+round.board+'/'+period,{rows:{}},board=>{
      const old=board.rows[profile.id];if(!old||row.points>old.points||row.points===old.points&&row.created_at<old.created_at)board.rows[profile.id]=row;
    });
  }
}
function createAPI({store,authenticate=identityUser,verify=verifyRound,now=()=>Date.now(),requestTimeout=35000,probe=probeIdentity}){
 async function handle(req){
  let phase='request';
  try{
    const url=new URL(req.url),route=url.pathname.replace(/^\/\.netlify\/functions\/ranglista/,'/api').replace(/^\/api/,'');
    if(!['GET','POST'].includes(req.method))throw new HttpError(405,'Nem támogatott kérés.');
    if(req.method==='POST'){
      if(req.headers.get('X-Utos-Request')!=='1'||!req.headers.get('content-type')?.startsWith('application/json'))throw new HttpError(403,'Érvénytelen kérésforrás.');
      if(req.headers.get('origin')&&req.headers.get('origin')!==url.origin)throw new HttpError(403,'A kérés másik oldalról érkezett.');
    }
    if(route==='/health'&&req.method==='GET'){phase='engine';checkEngine();phase='storage';await store.get('health-check');phase='identity-probe';const identity=await probe(req);return reply({ok:true,engine:ENGINE_VERSION,release:'star-shop-1',identity});}
    phase='identity';const identity=await authenticate(req);phase='profile';const profile=identity?await ensureProfile(store,identity):null;
    if(route==='/me'&&req.method==='GET')return reply({user:expose(profile),engine:ENGINE_VERSION});
    if(route==='/leaderboard'&&req.method==='GET'){
      const kind=url.searchParams.get('kind')||'sprint',period=url.searchParams.get('period')||'week';if(!['all','week'].includes(period))throw new HttpError(400,'Ismeretlen időszak.');
      const date=new Date(now()),def=definition(kind,date),suffix=period==='all'?'all':'week:'+weekKey(date);
      phase='leaderboard';const board=await store.get('board/'+def.board+'/'+suffix)||{rows:{}};
      const rows=Object.values(board.rows).sort((a,b)=>b.points-a.points||a.created_at.localeCompare(b.created_at)||a.user_id.localeCompare(b.user_id)).map((r,i)=>({...r,place:i+1}));
      return reply({rows:rows.slice(0,50),mine:profile?rows.find(r=>r.user_id===profile.id)||null:null,label:kind==='daily'?def.board.slice(6):period==='week'?weekKey(date)+' óta (UTC)':'összesített'});
    }
    if(!['/round/start','/round/finish','/round/cancel','/shop/buy','/shop/equip','/shop/legacy'].includes(route)||req.method!=='POST')throw new HttpError(404,'Hiányzó API-végpont.');
    if(!profile)throw new HttpError(401,'A versenyhez jelentkezz be!');
    const text=await req.text();if(Buffer.byteLength(text)>600000)throw new HttpError(413,'Túl nagy bemeneti napló.');
    let input;try{input=JSON.parse(text);}catch(_){throw new HttpError(400,'Hibás kérés.');}if(!input||typeof input!=='object'||Array.isArray(input))throw new HttpError(400,'Hibás kérés.');
    if(route.startsWith('/shop/')){
      phase='shop';const current=await store.mutate(profileKey(profile.id),profile,p=>{
        if(route==='/shop/legacy')shop.migrateLegacy(p,input.ids,input.equipped);
        else shop.transaction(p,input,route==='/shop/buy'?'buy':'equip',now());return p;
      });return reply({user:expose(current)});
    }
    if(route==='/round/cancel'){
      if(typeof input.roundId!=='string'||!/^[a-f0-9-]{36}$/i.test(input.roundId))throw new HttpError(400,'Érvénytelen kör.');
      const current=await store.mutate(profileKey(profile.id),profile,p=>{const r=p.rounds?.[input.roundId];if(r?.status==='active')r.status='cancelled';return p;});return reply({user:expose(current)});
    }
    if(route==='/round/start'){
      const date=new Date(now()),def=input.kind==='practice'?shop.practiceDefinition(input,profile):definition(input.kind,date),round={id:randomUUID(),...def,engine:ENGINE_VERSION,created_at:date.toISOString(),expiresAt:new Date(now()+480000).toISOString(),status:'active'};
      await store.mutate(profileKey(profile.id),profile,p=>{
        p.starts=p.starts.filter(t=>t>now()-600000);if(p.starts.length>=16)throw new HttpError(429,'Túl sok új kör. Várj néhány percet.');p.starts.push(now());for(const r of Object.values(p.rounds))if(r.status==='active')r.status='cancelled';
        const entries=Object.entries(p.rounds).filter(([,r])=>r.status==='finished'||Date.parse(r.expiresAt)>now());
        p.rounds=Object.fromEntries(entries.sort((a,b)=>b[1].created_at.localeCompare(a[1].created_at)).slice(0,127));p.rounds[round.id]=round;
      });return reply({ticket:round});
    }
    if(typeof input.roundId!=='string'||!/^[a-f0-9-]{36}$/i.test(input.roundId))throw new HttpError(400,'Érvénytelen kör.');
    phase='round-read';let current=await store.get(profileKey(profile.id)),round=current.rounds[input.roundId];if(!round)throw new HttpError(404,'A kör nem található a fiókodban.');
    if(round.status==='cancelled')throw new HttpError(409,'Ezt a kört már elhagytad. Indíts új kört!');
    if(round.status!=='finished'){
      if(round.engine!==ENGINE_VERSION)throw new HttpError(409,'A játék frissült. Töltsd újra az oldalt!');
      if(Date.parse(round.expiresAt)<now())throw new HttpError(410,'A kör beküldési ideje lejárt. Indíts új kört!');
      if(now()-Date.parse(round.created_at)<44000)throw new HttpError(400,'A 45 másodperces kör még nem fejeződhetett be.');
      await store.mutate(profileKey(profile.id),current,p=>{p.finishes=(p.finishes||[]).filter(t=>t>now()-600000);if(p.finishes.length>=32)throw new HttpError(429,'Túl sok beküldés. Várj néhány percet.');p.finishes.push(now());});
      phase='verification';let metrics;try{metrics=verify(round,input.events,input.ticks);}catch(error){
        if(error.code==='ERR_SCRIPT_EXECUTION_TIMEOUT')throw new HttpError(503,'Az eredmény ellenőrzése túl sokáig tartott. Próbáld újra a beküldést!');
        if(!compiledInputValid(input))throw new HttpError(400,'Érvénytelen egérnapló. Indíts új kört!');
        console.error('Ranking verifier failed',error.code||error.name);throw new HttpError(503,'A szerveroldali játékmotor nem tudta ellenőrizni a kört. A napló megmaradt, próbáld újra!');
      }
      const stars=Number.isFinite(metrics.earnedStars)?Math.max(0,Math.min(38,Math.floor(metrics.earnedStars))):0;
      const result={...metrics,stars,xp:50+Math.floor(metrics.points/100),created_at:new Date(now()).toISOString()};
      phase='save-result';current=await store.mutate(profileKey(profile.id),current,p=>{
        const ticket=p.rounds[input.roundId];if(!ticket)throw new HttpError(404,'A kör nem található.');
        if(ticket.status==='cancelled')throw new HttpError(409,'A kört már elhagytad.');
        if(ticket.status!=='finished'){ticket.status='finished';ticket.result=result;p.xp+=result.xp;p.games++;shop.ensureWallet(p).stars+=result.stars;}return p;
      });round=current.rounds[input.roundId];
    }
    // Retry also repairs a partial leaderboard write, without granting XP again.
    phase='save-leaderboard';if(round.board)await indexResult(store,current,round,round.result);return reply({result:round.result,user:expose(current)});
  }catch(error){if(!(error instanceof HttpError))console.error('Ranking request failed',phase,error.code||error.name);return reply({error:error instanceof HttpError?error.message:'A ranglista-tároló nem érhető el. Próbáld újra a beküldést!',code:phase},error.status||503);}
 }
 return async req=>{
  let timer;
  const expired=new Promise(resolve=>{timer=setTimeout(()=>resolve(reply({error:'A szerver nem fejezte be időben a mentést. A kör megmaradt, próbáld újra a beküldést!',code:'server-timeout'},503)),requestTimeout);});
  try{return await Promise.race([handle(req),expired]);}finally{clearTimeout(timer);}
 };
}
function compiledInputValid(input){try{require('./engine.cjs').validateEvents(input.events,input.ticks);return true;}catch(_){return false;}}
module.exports={createAPI,identityUser,definition,weekKey,ensureProfile,identityURL,probeIdentity};
