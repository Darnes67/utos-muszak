import {login,restoreLegacy} from './legacy-login.js';
import {signup,logout,getUser,handleAuthCallback,requestPasswordRecovery,updateUser,getAccessToken} from './auth.js';
export const account={user:null,ready:false,error:''};
const el=id=>document.getElementById(id),inPortal=!!el('accountModal');let busy=false,recovery=false,previousFocus=null,sequence=0;
const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('banki-account-v1'):null;
export async function api(path,data,{publicOnly=false}={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
 try{
  const headers={};if(!publicOnly&&await getUser())headers.Authorization='Bearer '+await getAccessToken();
  if(data!==undefined)Object.assign(headers,{'Content-Type':'application/json','X-Utos-Request':'1'});
  const r=await fetch('/api'+path,{method:data===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers,signal:controller.signal,body:data===undefined?undefined:JSON.stringify(data)});
  if(!r.headers.get('content-type')?.includes('application/json'))throw Error('Az online szolgáltatás most nem érhető el. Vendégként tovább játszhatsz.');
  const d=await r.json();if(!r.ok){const e=Error(d.error||'A kérés nem sikerült.');e.status=r.status;throw e;}return d;
 }catch(e){if(e.name==='AbortError')throw Error('A szerver nem válaszolt. Próbáld újra!');throw e;}finally{clearTimeout(timer);}
}
function notify(){
 if(inPortal&&el('legacyRestoreOpen')){el('legacyRestoreOpen').hidden=!account.user||recovery;if(!account.user||recovery)el('legacyRestoreForm').hidden=true;}
 if(inPortal){el('accountButton').textContent=account.user?'● '+account.user.username:'Bejelentkezés';el('accountSummary').textContent=account.user?account.user.username+' · '+account.user.xp+' XP · '+account.user.games+' Ütős műszak kör · '+(account.user.wallet?.stars||0)+' ★':'Egy fiók az összes játékhoz. A régi Ütős műszak-fiókoddal is beléphetsz.';el('accountLogout').hidden=!account.user;el('accountForms').hidden=!!account.user&&!recovery;}
 window.dispatchEvent(new CustomEvent('webtar-account',{detail:{user:account.user,error:account.error}}));
}
export async function refreshAccount(){const n=++sequence;try{const d=await api('/me');if(n!==sequence)return;account.user=d.user;account.error='';}catch(e){if(n!==sequence)return;account.error=e.message;if(e.status===401)account.user=null;}account.ready=true;notify();return account.user;}
function announce(){channel?.postMessage({type:'changed'});const f=el('frame');if(f?.contentWindow)f.contentWindow.postMessage({type:'webtar:account-changed'},location.origin);}
function status(text){if(el('accountStatus'))el('accountStatus').textContent=text;}
export function openAccount(){
 if(!inPortal){if(parent!==window)parent.postMessage({type:'webtar:auth-open'},location.origin);else location.assign('/?account=1#'+(location.pathname.endsWith('tesi-muszak.html')?'tesi':'lucky'));return;}
 previousFocus=document.activeElement;el('accountModal').showModal();el('frame')?.contentWindow?.postMessage({type:'webtar:auth-opened'},location.origin);notify();if(!account.user)el('webtarEmail').focus();else el('accountClose').focus();
}
function closeAccount(){if(busy)return;el('accountModal').close();el('webtarPassword').value='';if(el('legacyPassword'))el('legacyPassword').value='';if(el('legacyRestoreForm'))el('legacyRestoreForm').hidden=true;previousFocus?.focus?.();el('frame')?.contentWindow?.postMessage({type:'webtar:auth-complete'},location.origin);}
function authMessage(e){return [400,401,422].includes(e.status)?'Ellenőrizd az adatokat és az e-mailes megerősítést. Régi fióknál ugyanazt az e-mailt és jelszót használd.':e.message;}
const changing=new Map();
async function prepareChild(){
 const frame=el('frame');if(frame&&!/utosmuszak\.html|lucky67\.html|tesi-muszak\.html/.test(frame.getAttribute('src')||''))return;
 if(!frame||el('player').hidden||!frame.getAttribute('src')||frame.src==='about:blank')return;
 const id=(crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join(''));await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{changing.delete(id);reject(Error('A játék nem fejezte be a mentést. Próbáld újra, vagy lépj vissza a Webtárba.'));},18000);changing.set(id,{resolve:()=>{clearTimeout(timer);resolve();},reject:m=>{clearTimeout(timer);reject(Error(m));}});frame.contentWindow.postMessage({type:'webtar:prepare-account',id},location.origin);});
}
async function action(kind){
 if(busy)return;
 if(kind!=='logout'&&!el('webtarEmail').reportValidity())return;
 if(['login','register','reset'].includes(kind)&&!el('webtarPassword').reportValidity())return;
 if(['register','reset'].includes(kind)&&el('webtarPassword').value.length<10){status('Az új jelszó legalább 10 karakter legyen.');return;}
 const name=el('webtarUsername').value.trim();if(kind==='register'&&!/^[A-Za-z0-9_]{3,18}$/.test(name)){status('A játékosnév 3–18 karakter: betű, szám vagy _.');return;}
 let legacyWarning='';busy=true;el('accountModal').querySelectorAll('[data-auth]').forEach(b=>b.disabled=true);status('Kapcsolódás…');
 try{
  if(kind==='recover'){await requestPasswordRecovery(el('webtarEmail').value.trim());status('Ha van ilyen fiók, elküldtük a visszaállító levelet.');return;}
  await prepareChild();
  if(kind==='logout'){await logout();account.user=null;}
  else if(kind==='register'){await signup(el('webtarEmail').value.trim(),el('webtarPassword').value,{username:name,full_name:name});if(!await getUser()){status('Regisztráció elküldve. Erősítsd meg az e-mail-címed a kapott levélben, majd lépj be.');el('webtarPassword').value='';return;}}
  else if(kind==='reset'){await updateUser({password:el('webtarPassword').value});recovery=false;el('webtarEmail').required=true;el('webtarEmail').disabled=false;el('authReset').hidden=true;el('authNormal').hidden=false;}
  else {const logged=await login(el('webtarEmail').value.trim(),el('webtarPassword').value);legacyWarning=logged?.legacyWarning||'';}
  await refreshAccount();if(kind!=='logout'&&!account.user)throw Error(account.error||'A fiókot a szerver még nem igazolta. Próbáld újra!');
  announce();status(legacyWarning||(kind==='logout'?'Kijelentkeztél. Vendégként tovább játszhatsz.':'Sikeres bejelentkezés. A játékok a közös profilodat használják.'));el('webtarPassword').value='';
 }catch(e){status(authMessage(e));}finally{busy=false;el('accountModal').querySelectorAll('[data-auth]').forEach(b=>b.disabled=false);notify();}
}
async function restoreOldProfile(e){
 e.preventDefault();if(busy||!account.user)return;
 if(!el('legacyEmail').reportValidity()||!el('legacyPassword').reportValidity())return;
 busy=true;el('legacyRestoreSubmit').disabled=true;status('Régi fiók igazolása és profil visszaállítása…');
 try{
  await prepareChild();
  await restoreLegacy(el('legacyEmail').value.trim(),el('legacyPassword').value,true);
  await refreshAccount();if(!account.user)throw Error(account.error||'A profil még nem érhető el.');
  announce();el('legacyRestoreForm').hidden=true;status('A régi profilod visszaállt. A régi pontokat, csillagokat és egyenleget használod tovább.');
 }catch(error){status(error.message);}finally{el('legacyPassword').value='';busy=false;el('legacyRestoreSubmit').disabled=false;notify();}
}
channel?.addEventListener('message',e=>{if(e.data?.type==='changed'){refreshAccount();if(inPortal)el('frame')?.contentWindow?.postMessage({type:'webtar:account-changed'},location.origin);}});
window.addEventListener('message',e=>{
 if(e.origin!==location.origin)return;
 if(inPortal&&e.source===el('frame')?.contentWindow){
  if(e.data?.type==='webtar:auth-open'){openAccount();return;}
  if(e.data?.type==='webtar:account-prepared'){const p=changing.get(e.data.id);if(p){changing.delete(e.data.id);e.data.error?p.reject(e.data.error):p.resolve();}}
 }
 if(!inPortal&&e.source===parent&&e.data?.type==='webtar:account-changed')refreshAccount();
});
if(inPortal){
 if(el('legacyRestoreOpen'))el('legacyRestoreOpen').onclick=async()=>{if(busy)return;el('legacyRestoreForm').hidden=!el('legacyRestoreForm').hidden;if(!el('legacyRestoreForm').hidden){const identity=await getUser();el('legacyEmail').value=identity?.email||'';el('legacyPassword').focus();}};
 if(el('legacyRestoreForm'))el('legacyRestoreForm').addEventListener('submit',restoreOldProfile);
 el('accountButton').onclick=openAccount;if(el('playerAccount'))el('playerAccount').onclick=openAccount;el('accountClose').onclick=closeAccount;
 el('accountModal').addEventListener('cancel',e=>{if(busy||recovery)e.preventDefault();else closeAccount();});
 el('accountForms').addEventListener('submit',e=>{e.preventDefault();action(recovery?'reset':'login');});
 el('accountModal').querySelectorAll('[data-auth]').forEach(b=>b.onclick=()=>action(b.dataset.auth));
 (async()=>{try{const cb=await handleAuthCallback();if(cb?.type==='recovery'){recovery=true;openAccount();el('accountForms').hidden=false;el('authNormal').hidden=true;el('authReset').hidden=false;el('webtarEmail').required=false;el('webtarEmail').disabled=true;status('Adj meg egy új, legalább 10 karakteres jelszót.');}else if(cb){status('Az e-mail-címed megerősítve. A régi profilod továbbra is elérhető.');announce();}}catch(e){openAccount();status(authMessage(e));}await refreshAccount();if(new URLSearchParams(location.search).has('account'))openAccount();})();
}else refreshAccount();
