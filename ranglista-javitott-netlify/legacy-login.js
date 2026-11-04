import {login as identityLogin,getUser,getAccessToken} from './auth.js';
// Both the Webtár and original direct game use this one migration-aware login.
export async function restoreLegacy(email,password,authenticated=false){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
 try{
  const headers={'Content-Type':'application/json','X-Utos-Request':'1'};
  if(authenticated)headers.Authorization='Bearer '+await getAccessToken();
  const response=await fetch('/api/legacy-login',{method:'POST',headers,credentials:'same-origin',cache:'no-store',signal:controller.signal,body:JSON.stringify({email,password})});
  if(!response.headers.get('Content-Type')?.includes('application/json'))throw Object.assign(Error('A régi fiókok visszaállítása még nem elérhető ezen a telepítésen.'),{status:503});
  const result=await response.json();
  if(!response.ok)throw Object.assign(Error(result.error||'A régi fiók ellenőrzése nem sikerült.'),{status:response.status});
 }catch(e){if(e.name==='AbortError')throw Object.assign(Error('A régi fiók ellenőrzése időtúllépés miatt megszakadt. Próbáld újra!'),{status:503});throw e;}finally{clearTimeout(timer);}
}
export async function login(email,password){
 let user;
 try{user=await identityLogin(email,password);}catch(error){
  if(![400,401,422].includes(error.status))throw error;
  await restoreLegacy(email,password);
  return identityLogin(email,password);
 }
 const current=await getUser();
 if(current?.appMetadata?.legacy_source!=='bankiarchive'){
  try{await restoreLegacy(email,password,true);}catch(error){
   // A normal new account need not exist in the archive. A transient archive
   // failure must not log a valid destination account out.
   if(error.status!==401)return{...user,legacyWarning:'Beléptél az új fiókba, de a régi profil ellenőrzése most nem fejeződött be. '+error.message};
  }
 }
 return user;
}
