(()=>{
 if(window!==window.top)return;
 const field=id=>document.getElementById(id);let visitorId,busy=false,last=0;
 const fresh=()=>crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/,'$1-$2-$3-$4-$5');
 try{visitorId=localStorage.getItem('banki-visitor-v1');if(!/^[a-f0-9-]{36}$/i.test(visitorId||'')){visitorId=fresh();localStorage.setItem('banki-visitor-v1',visitorId);}}catch{visitorId=fresh();}
 async function update(){
  if(busy||document.visibilityState==='hidden'||Date.now()-last<15000)return;busy=true;last=Date.now();const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
  try{const r=await fetch('/api/site-stats',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Utos-Request':'1'},body:JSON.stringify({visitorId}),signal:ctrl.signal});if(!r.ok)throw Error();const data=await r.json();if(field('registeredCount'))field('registeredCount').textContent=Number.isSafeInteger(data.registered)?data.registered.toLocaleString('hu-HU'):'—';if(field('activeCount'))field('activeCount').textContent=data.active.toLocaleString('hu-HU');if(field('statsStatus'))field('statsStatus').textContent='Élő adatok · aktív az elmúlt 90 másodpercben, vendégekkel együtt';}
  catch{if(field('statsStatus'))field('statsStatus').textContent='A számláló most nem frissült. Hamarosan újrapróbáljuk.';}finally{clearTimeout(timer);busy=false;}
 }
 update();setInterval(update,30000);document.addEventListener('visibilitychange',update);window.addEventListener('webtar-account',()=>{last=0;update();});
})();
