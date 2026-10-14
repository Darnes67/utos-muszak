(function(root){
'use strict';
function create(win=root,options={}){
 const scripts=new Map();let active=null,generation=0;
 const later=options.setTimeout||setTimeout,clear=options.clearTimeout||clearTimeout;
 function loadScript(url){
  if(scripts.has(url))return scripts.get(url);
  const promise=new Promise((resolve,reject)=>{const script=win.document.createElement('script');let timer;
   const end=(error)=>{clear(timer);script.onload=script.onerror=null;if(error){scripts.delete(url);script.remove?.();reject(error);}else resolve();};
   script.src=url;script.async=true;script.crossOrigin='anonymous';script.onload=()=>end();script.onerror=()=>end(Error('A reklámszolgáltató nem tölthető be. Hálózati hiba vagy reklámblokkoló lehet az oka.'));
   timer=later(()=>end(Error('A reklám betöltése túl sokáig tartott.')),15000);win.document.head.appendChild(script);
  });scripts.set(url,promise);return promise;
 }
 async function consent(config,a){
  if(config.cmpScriptUrl&&!win.__tcfapi)await loadScript(config.cmpScriptUrl);
  if(typeof win.__tcfapi!=='function')throw Error('A hozzájárulási felület nem érhető el. A reklám nem indul el.');
  return new Promise((resolve,reject)=>{let done=false,listenerId=null;
   const finish=(error)=>{if(done)return;done=true;clear(timer);if(listenerId!==null)try{win.__tcfapi('removeEventListener',2,()=>{},listenerId);}catch(_){}error?reject(error):resolve();};
   const timer=later(()=>finish(Error('A reklámhoz még nem érkezett hozzájárulási döntés.')),60000);
   a.abortConsent=()=>finish(Error('Reklám megszakítva.'));
   if(active!==a){a.abortConsent();return;}
   try{win.__tcfapi('addEventListener',2,(data,ok)=>{
    if(data?.listenerId!==undefined)listenerId=data.listenerId;
    if(done){if(listenerId!==null)try{win.__tcfapi('removeEventListener',2,()=>{},listenerId);}catch(_){}return;}
    if(!ok||data?.cmpStatus==='error'){finish(Error('Nem sikerült ellenőrizni a hozzájárulást.'));return;}
    if(data.gdprApplies===false){finish();return;}
    if(data.gdprApplies===true&&['tcloaded','useractioncomplete'].includes(data.eventStatus))finish(data.purpose?.consents?.[1]===true?null:Error('A reklámhoz szükséges hozzájárulás nincs megadva.'));
   });}catch(_){finish(Error('A hozzájárulási felület hibás választ adott.'));}
  });
 }
 function destroy(a){
  clear(a.loadTimer);clear(a.watchTimer);a.abortConsent?.();
  if(a.service)for(const[name,fn]of a.listeners)try{a.service.removeEventListener(name,fn);}catch(_){}
  if(a.slot&&win.googletag?.apiReady)try{win.googletag.destroySlots([a.slot]);}catch(_){}
 }
 function end(a,error){if(active!==a)return;active=null;destroy(a);if(error)a.handlers.onError?.(error);else a.handlers.onClose?.({granted:a.granted});}
 async function prepare(config,handlers){
  if(active)throw Error('Már folyamatban van reklám.');
  const a={generation:++generation,handlers,slot:null,listeners:[],shown:false,granted:false,ready:null,service:null};active=a;
  try{
   if(!config?.configured)throw Error(config?.reason||'Még nincs bekötött reklámszolgáltató.');
   await consent(config,a);if(active!==a)return;
   win.googletag??={cmd:[]};if(!win.googletag.apiReady)await loadScript('https://securepubads.g.doubleclick.net/tag/js/gpt.js');if(active!==a)return;
   a.loadTimer=later(()=>end(a,Error('Most nem érkezett elérhető reklám. Próbáld később újra.')),25000);
   win.googletag.cmd.push(()=>{
    if(active!==a)return;
    try{
     const g=win.googletag;a.slot=g.defineOutOfPageSlot(config.adUnitPath,g.enums.OutOfPageFormat.REWARDED);
     if(!a.slot){end(a,Error('Ez a böngésző vagy képernyő nem támogatja a jutalmazott reklámot.'));return;}
     a.service=g.pubads();a.slot.addService(a.service);
     const listen=(name,fn)=>{const guarded=e=>{if(active===a&&e.slot===a.slot)fn(e);};a.listeners.push([name,guarded]);a.service.addEventListener(name,guarded);};
     listen('rewardedSlotReady',e=>{clear(a.loadTimer);a.ready=e;a.handlers.onReady?.();a.loadTimer=later(()=>end(a,Error('A reklám indítására váró ablak lejárt.')),120000);});
     listen('rewardedSlotGranted',e=>{
      if(!a.shown||a.granted)return;
      if(e.payload?.amount!==300||e.payload?.type!=='stars'){end(a,Error('A reklámegység jutalma nincs 300 stars értékre beállítva.'));return;}
      a.granted=true;a.handlers.onGrant?.({amount:300,type:'stars'});
     });
     listen('rewardedSlotClosed',()=>end(a));
     listen('slotRenderEnded',e=>{if(e.isEmpty)end(a,Error('Most nincs elérhető reklám. Nem vontunk le semmit.'));});
     if(!g.pubadsReady)g.enableServices();g.display(a.slot);
    }catch(error){end(a,error);}
   });
  }catch(error){if(active===a)end(a,error);}
 }
 function show(){
  const a=active;if(!a?.ready||a.shown)return false;
  // Only called by the publisher's explicit "watch for 300 stars" action.
  a.shown=true;clear(a.loadTimer);
  try{if(!a.ready.makeRewardedVisible()){end(a,Error('A reklám nem tudott elindulni.'));return false;}}
  catch(error){end(a,error);return false;}
  if(active===a)a.watchTimer=later(()=>end(a,Error('A reklám válasza túl sokáig tartott. A játék folytatható.')),180000);return true;
 }
 function cancel(){const a=active;generation++;if(a)end(a);}
 return {prepare,show,cancel,get busy(){return !!active;}};
}
const api={create};if(typeof module==='object'&&module.exports)module.exports=api;else root.UTOS_ADS=api;
})(globalThis);
