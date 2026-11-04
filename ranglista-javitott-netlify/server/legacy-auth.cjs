'use strict';
const {HttpError}=require('./store.cjs');
const SOURCE='bankiarchive',BASE='https://bankiarchive.netlify.app/.netlify/identity';
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const meta=u=>u?.app_metadata||u?.appMetadata||{};
function profileIdentity(user){const m=meta(user);return m.legacy_source===SOURCE&&uuid(m.legacy_profile_id)?{...user,id:m.legacy_profile_id}:user;}
const failure=()=>new HttpError(401,'Ellenőrizd a régi e-mail-címet, jelszót és az e-mailes megerősítést.');
async function migrate(input,{createUser,listUsers,updateUser,currentUser,fetchImpl=fetch}={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.email!=='string'||typeof input.password!=='string')throw failure();
 const email=input.email.trim().toLowerCase(),password=input.password;
 if(email.length>254||!/^\S+@\S+\.\S+$/.test(email)||!password||password.length>1024)throw failure();
 let auth,legacy;
 try{
  const response=await fetchImpl(BASE+'/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams({grant_type:'password',username:email,password}).toString(),redirect:'error',signal:AbortSignal.timeout(8000)});
  if([400,401,403,422].includes(response.status))throw failure();
  if(!response.ok)throw new HttpError(503,'A régi fiókszolgáltatás most nem érhető el. Próbáld újra később!');
  auth=await response.json();if(typeof auth.access_token!=='string'||auth.access_token.length>10000)throw failure();
  const checked=await fetchImpl(BASE+'/user',{headers:{Authorization:'Bearer '+auth.access_token,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!checked.ok)throw failure();legacy=await checked.json();
 }catch(e){if(e instanceof HttpError)throw e;throw new HttpError(503,'A régi fiókszolgáltatás most nem érhető el. Próbáld újra később!');}
 if(!uuid(legacy?.id)||typeof legacy.email!=='string'||legacy.email.toLowerCase()!==email||!legacy.confirmed_at)throw failure();
 if(typeof createUser!=='function'||typeof listUsers!=='function')throw new HttpError(503,'A fiók-visszaállítás még nem elérhető ezen a telepítésen.');
 const m=legacy.user_metadata||{},userMetadata={};
 for(const key of ['username','full_name'])if(typeof m[key]==='string'&&m[key].length<=100)userMetadata[key]=m[key];
 const mapping={legacy_source:SOURCE,legacy_profile_id:legacy.id};
 try{const created=await createUser({email,password,data:{app_metadata:mapping,user_metadata:userMetadata}});const cm=meta(created);if(cm.legacy_source!==SOURCE||cm.legacy_profile_id!==legacy.id)throw new HttpError(503,'A fiók összekapcsolása nem fejeződött be.');return{ok:true};}
 catch(e){
  // Retry after concurrent creation only when an administrator-set mapping proves
  // that this exact legacy account was migrated. Never reset an existing password.
  if(e instanceof HttpError)throw e;
  let found;
  try{for(let page=1;page<=20;page++){const users=await listUsers({page,perPage:100});if(!Array.isArray(users))throw Error();found=users.find(u=>typeof u.email==='string'&&u.email.toLowerCase()===email);if(found||users.length<100)break;}}catch{throw new HttpError(503,'A fiók-visszaállítás most nem fejezhető be. Próbáld újra!');}
  if(found){const fm=meta(found);if(fm.legacy_source===SOURCE&&fm.legacy_profile_id===legacy.id)return{ok:true};
   // Linking a separately-created destination account needs BOTH proofs:
   // verified old credentials above and its current destination bearer session.
   const current=typeof currentUser==='function'?await currentUser():null;
   if(current&&current.id===found.id&&typeof current.email==='string'&&current.email.toLowerCase()===email&&typeof updateUser==='function'&&!fm.legacy_profile_id){
    const linked=await updateUser(found.id,{app_metadata:{...fm,...mapping}});const lm=meta(linked);
    if(lm.legacy_source!==SOURCE||lm.legacy_profile_id!==legacy.id)throw new HttpError(503,'A fiók összekapcsolása nem fejeződött be.');
    return{ok:true};
   }
   throw new HttpError(409,'Ezzel az e-maillel már külön új fiók létezik. A biztonságos összekapcsoláshoz mindkét fiók igazolása szükséges; a jelszót nem módosítottuk.');}
  throw new HttpError(503,'A fiók-visszaállítás most nem fejezhető be. Próbáld újra!');
 }
}
module.exports={migrate,profileIdentity,SOURCE,BASE};
