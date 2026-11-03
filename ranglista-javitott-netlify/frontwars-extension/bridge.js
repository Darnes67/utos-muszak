(()=>{
  'use strict';
  const ORIGIN='https://bankiwebtar.netlify.app',CHANNEL='banki-frontwars-v1',dom=globalThis.BankiFrontwarsDOM;
  if(window===window.parent||!dom)return;
  const PENDING='banki-frontwars-pending-v1';
  let nonce='',cancelled=new Set(),working=null,lastReport=0,lastSnapshot='';
  const send=(type,payload={})=>{if(nonce)window.parent.postMessage({channel:CHANNEL,nonce,type,...payload},ORIGIN);};
  const delay=ms=>new Promise(r=>setTimeout(r,ms));
  const username=()=>document.querySelector('input[placeholder="Enter your username"]');
  const menuReady=()=>!!username()&&!!dom.read(document);
  function gameId(){const id=new URLSearchParams(location.search).get('game');return id&&/^[A-Za-z0-9_-]{6,80}$/.test(id)?id:null;}
  function confirmPending(){
    if(!nonce)return;let pending;try{pending=JSON.parse(sessionStorage.getItem(PENDING));}catch{return;}
    if(!pending)return;if(Date.now()-pending.createdAt>25000){sessionStorage.removeItem(PENDING);send('failed',{attemptId:pending.attemptId,error:'A Frontwars nem igazolta időben a megnyitott meccset.'});return;}
    const id=gameId();if(!id||pending.gameId&&pending.gameId!==id||document.querySelector('#fw-splash'))return;
    const text=document.body.innerText;
    if(/Something went wrong|Game not found|Failed to join|Lobby is full/i.test(text)){sessionStorage.removeItem(PENDING);send('failed',{attemptId:pending.attemptId,error:'A Frontwars hibát jelzett a meccs megnyitásakor.'});return;}
    if(text.replace(/\s/g,'').toLowerCase().includes(pending.name.replace(/\s/g,'').toLowerCase())||document.querySelector('#game-control-main')||/LEAVE LOBBY|WAITING FOR PLAYERS/i.test(text)){
      sessionStorage.removeItem(PENDING);cancelled.add(pending.attemptId);send('joined',{attemptId:pending.attemptId,gameId:id});
    }
  }
  function report(){confirmPending();
    if(!nonce)return;
    const lobby=dom.read(document),key=JSON.stringify(lobby);
    if(key!==lastSnapshot||Date.now()-lastReport>2500){lastSnapshot=key;lastReport=Date.now();send('snapshot',{lobby,menuReady:menuReady(),version:'1.0.0'});}
  }
  async function fill(name){
    if(typeof name!=='string'||name.length<3||name.length>20)throw Error('A Frontwars-név 3–20 karakter legyen.');
    const input=username();if(!input)throw Error('Nyisd meg a Frontwars főmenüjét. A névmező még nem látható.');
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
    if(!setter)throw Error('A böngésző nem engedte kitölteni a névmezőt.');
    setter.call(input,name);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
    await delay(350);
    if(username()?.value!==name)throw Error('A Frontwars nem tartotta meg a nevet. Írd be kézzel, majd jelezd újra a készenlétet.');
  }
  async function join(command){
    const {attemptId,target,name}=command;
    if(typeof attemptId!=='string'||attemptId.length>80||working===attemptId||cancelled.has(attemptId))return;
    working=attemptId;
    try{
      await fill(name);
      const until=Math.min(2500,Math.max(0,Number(target?.dispatchAt)-Date.now()));if(until)await delay(until);
      if(cancelled.has(attemptId))return;
      const lobby=dom.read(document);if(!dom.same(lobby,target))throw Error('A kijelölt FFA-lobby már változott, megtelt vagy elindult. Nem léptettelek másik meccsbe.');
      const c=dom.card(document);if(!c)throw Error('A Frontwars lobbykártyája nem található.');
      c.element.scrollIntoView({block:'center'});await delay(150);
      const rect=c.element.getBoundingClientRect(),hit=document.elementFromPoint(rect.left+rect.width/2,Math.max(1,Math.min(innerHeight-1,rect.top+rect.height/2)));
      if(!hit||!c.element.contains(hit))throw Error('Egy Frontwars-ablak eltakarja a lobbyt. Zárd be az oktatót vagy a felugró ablakot, majd indulhat új keresés.');
      sessionStorage.setItem(PENDING,JSON.stringify({attemptId,name,gameId:target.gameId||null,createdAt:Date.now()}));
      if(target.gameId){if(!/^[A-Za-z0-9_-]{6,80}$/.test(target.gameId))throw Error('Érvénytelen meccsazonosító.');location.assign('https://frontwars.io/?game='+encodeURIComponent(target.gameId));return;}
      c.element.click();
      for(let i=0;i<70;i++){
        await delay(200);confirmPending();if(cancelled.has(attemptId))return;
      }
      throw Error('A Frontwars nem igazolta vissza a belépést. Ellenőrizd a lent megnyitott játékablakot.');
    }catch(e){sessionStorage.removeItem(PENDING);send('failed',{attemptId,error:e.message});}
    finally{working=null;cancelled.add(attemptId);if(cancelled.size>30)cancelled=new Set([...cancelled].slice(-20));}
  }
  window.addEventListener('message',e=>{
    if(e.origin!==ORIGIN||e.source!==window.parent||e.data?.channel!==CHANNEL)return;
    const m=e.data;if(typeof m.nonce!=='string'||m.nonce.length<16||m.nonce.length>100)return;
    if(m.type==='ping'){nonce=m.nonce;send('hello',{version:'1.0.0',menuReady:menuReady()});report();return;}
    if(m.nonce!==nonce)return;
    if(m.type==='prepare')fill(m.name).then(()=>send('prepared')).catch(e=>send('prepare-error',{error:e.message}));
    if(m.type==='join')join(m);
    if(m.type==='cancel'&&typeof m.attemptId==='string'){cancelled.add(m.attemptId);try{const p=JSON.parse(sessionStorage.getItem(PENDING));if(p?.attemptId===m.attemptId)sessionStorage.removeItem(PENDING);}catch{}}
  });
  setInterval(report,1000);
})();
