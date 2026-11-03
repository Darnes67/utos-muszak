import {account,api,refreshAccount,openAccount} from './webtar-account.js';
const $=id=>document.getElementById(id),CHANNEL='banki-frontwars-v1',FRONT='https://frontwars.io';
const nonce=Array.from(crypto.getRandomValues(new Uint8Array(20)),n=>n.toString(16).padStart(2,'0')).join('');
const frame=$('frontFrame');let model={party:null,directory:[],viewer:null,now:Date.now()},owner=null,queue=Promise.resolve(),actionBusy=false,polling=false,lastHeartbeat=0,lastReport=0,bridgeSeen=0,menuReady=false,ownLobby=null,reporting=false,attemptSent='',prepared=null,lastPoll=0,lastRevision=-1,serverOffset=0;
const modeLabel={ffa:'FREE FOR ALL',teams:'CSAPATJÁTÉK',unknown:'EGYÉB MÓD'};
function note(message){$('status').textContent=message;}
function bridgeFresh(){return Date.now()-bridgeSeen<7000;}
function post(type,data={}){frame.contentWindow?.postMessage({channel:CHANNEL,nonce,type,...data},FRONT);}
function element(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
function member(){return model.party?.members.find(m=>m.id===owner);}
function renderConnection(){const active=bridgeFresh();$('bridgeLight').classList.toggle('on',active&&menuReady);$('bridgeTitle').textContent=active?(menuReady?'Frontwars összekapcsolva':'Kiegészítő aktív · játékablak megnyitva'):'Kiegészítőre várunk';$('bridgeInfo').textContent=active?(menuReady?'A névátadás és a közös belépés készen áll.':'Új kereséshez térj vissza a Frontwars főmenüjébe.'):'Telepítsd az alábbi kiegészítőt, majd frissítsd ezt az oldalt.';}
function renderLobby(){
  const local=ownLobby&&Date.now()-ownLobby.receivedAt<7000?ownLobby:null,l=local||model.party?.lobby;
  if(!l){$('lobbyImage').hidden=true;$('mapName').textContent='Nyisd meg a frontot.';$('economyBadge').textContent='FRONTWARS';$('modeBadge').textContent='PUBLIC LOBBY';$('capacity').textContent='A valódi lobbyt a lent megnyitott Frontwars-ablakban látod.';$('countdown').textContent='—';$('capacityBar').style.width='0%';$('feedSource').textContent='Élő kapcsolat szükséges';$('lobbyHint').textContent='ÉLŐ ADATOKRA VÁRUNK';return;}
  $('mapName').textContent=l.map;$('economyBadge').textContent=l.economy;$('modeBadge').textContent=modeLabel[l.mode]||'EGYÉB MÓD';$('capacity').textContent=l.players+' / '+l.maxPlayers+' játékos · '+Math.max(0,l.maxPlayers-l.players)+' szabad hely';$('capacityBar').style.width=Math.min(100,l.players/l.maxPlayers*100)+'%';
  const remaining=Math.max(0,Math.ceil((l.startsAt-(local?0:serverOffset)-Date.now())/1000));$('countdown').textContent=remaining>=60?Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0'):remaining+'s';
  $('feedSource').textContent=local?'Élő · saját Frontwars-ablak':'Élő · a parti vezetőjének ablaka';$('lobbyHint').textContent=l.mode==='ffa'?'FREE FOR ALL LOBBY':l.mode==='teams'?'CSAPATJÁTÉK · FFA-RA VÁRUNK':'NEM FELISMERT MÓD · HASZNÁLD AZ ANGOL FRONTWARS-FELÜLETET';
  let image='';try{const u=new URL(l.image);if(u.origin==='https://api.frontwars.io'&&/^\/maps\/[a-zA-Z0-9_-]+\/thumbnail$/.test(u.pathname))image=u.href;}catch{}
  if(image&&$('lobbyImage').getAttribute('src')!==image)$('lobbyImage').src=image;$('lobbyImage').hidden=!image;
}
function render(){
  renderConnection();renderLobby();const signed=!!owner,p=model.party,m=member(),leader=p?.leaderId===owner,open=p?.phase==='open';
  $('viewerName').textContent=signed?model.viewer?.username||account.user?.username:'Vendégként nézelődsz';$('loginLink').hidden=signed;
  $('joinPanel').hidden=!!p;$('partyPanel').hidden=!p;
  $('startSearch').hidden=!leader||!open;$('cancelSearch').hidden=!leader||open;
  $('startSearch').disabled=actionBusy||!p?.members.every(x=>x.ready&&x.bridgeReady);
  if(p){
    $('partyName').textContent=p.title;$('ownCode').textContent=p.code;$('partySize').textContent=p.size+' / '+p.capacity+' játékos · vezető: '+p.leaderName;
    const list=$('members');list.replaceChildren();
    for(const person of p.members){
      const li=element('li',undefined,'member'),avatar=element('span',person.username.slice(0,2).toUpperCase(),'avatar'),copy=element('div',undefined,'member-copy');copy.append(element('strong',person.username+(person.id===p.leaderId?' ♛':'')),element('small',person.frontName+(person.id===owner?' · te':'')));
      let state=person.joinStatus==='joined'?'BELÉPETT':person.joinStatus==='failed'?'ELAKADT':person.ready?'KÉSZ':'VÁRAKOZIK';
      const badge=element('span',state,'member-state'+(person.ready?' ready':'')+(person.joinStatus==='failed'?' error':''));if(person.joinError)copy.append(element('small',person.joinError));else if(!person.bridgeReady&&p.phase!=='launched')copy.append(element('small','Frontwars-kapcsolatra vár'));
      li.append(avatar,copy,badge);if(leader&&person.id!==owner&&open){const kick=element('button','×','mini');kick.title='Játékos eltávolítása';kick.setAttribute('aria-label',person.username+' eltávolítása');kick.onclick=()=>act('kick',{userId:person.id});li.append(kick);}list.append(li);
    }
    $('readyButton').textContent=m?.ready?'✓ Készen állok · visszavonás':'Készen állok';$('readyButton').disabled=actionBusy||!open||!bridgeFresh()||!menuReady;
    const phase=p.phase;$('matchIcon').textContent=phase==='searching'?'⌁':phase==='joining'?'↗':phase==='launched'?'✓':'⌁';document.body.classList.toggle('searching',phase==='searching');
    $('matchTitle').textContent=phase==='searching'?'Matchmaking · FFA-ra várunk':phase==='joining'?'Közös belépés folyamatban':phase==='launched'?'A csapat elindult.':'A parti készenlétre vár.';
    $('matchInfo').textContent=p.message||(leader?'Ha minden játékos kész és csatlakoztatva van, indíthatod a keresést.':'Jelezd a készenlétet. A parti vezetője indítja a keresést.');
  }else {$('matchTitle').textContent='Először álljon össze a parti.';$('matchInfo').textContent='A partihoz Webtár-fiók és elmentett Frontwars-név szükséges. A teljes automatikához minden résztvevő telepítse a kiegészítőt.';document.body.classList.remove('searching');}
  const directory=$('partyList');directory.replaceChildren();const others=model.directory.filter(x=>x.code!==p?.code);
  if(!others.length)directory.append(element('p','Még nincs másik parti. Indíts egyet, és hívd a többieket!','subtle'));
  for(const room of others){const box=element('div',undefined,'party-item');box.append(element('strong',room.title),element('p',room.leaderName+' · '+room.size+'/'+room.capacity+' fő · '+(room.phase==='open'?'csatlakozható':'keresés / játék folyamatban')));const join=element('button','Csatlakozás ↗','quiet');join.disabled=actionBusy||!!p||room.phase!=='open'||room.size>=room.capacity;join.onclick=()=>joinParty(room.code);box.append(join);directory.append(box);}
  $('nameForm').querySelector('button').disabled=actionBusy||!!p&&!open;$('frontName').disabled=actionBusy||!!p&&!open;
  $('createForm').querySelector('button').disabled=actionBusy;$('joinForm').querySelector('button').disabled=actionBusy;
  launchIfNeeded();
}
function apply(data){if((account.user?.id||null)!==owner||data.revision<lastRevision)return;lastRevision=data.revision;serverOffset=data.now-Date.now();const previous=model.party;model=data;
  if(previous?.searchId&&previous.searchId!==data.party?.searchId)post('cancel',{attemptId:previous.searchId});
  if(document.activeElement!==$('frontName')&&data.viewer?.frontName)$('frontName').value=data.viewer.frontName;
  render();
}
async function command(op,data={},quiet=false){
  const captured=owner;if(!captured){openAccount();throw Error('Partihoz jelentkezz be.');}
  const run=async()=>{if(captured!==owner)throw Error('Közben megváltozott a fiók.');if(!quiet){actionBusy=true;render();}try{const result=await api('/frontwars/action',{op,...data});if(captured===owner)apply(result);return result;}finally{if(!quiet){actionBusy=false;render();}}};
  const task=queue.then(run,run);queue=task.catch(()=>{});return task;
}
async function act(op,data={}){try{await command(op,data);if(op==='name')note('A Frontwars-nevedet elmentettük a Webtár-fiókodhoz.');else if(op==='create'||op==='join')note('Bent vagy a partiban. Ha a Frontwars főmenüje betöltött, jelezd a készenlétet.');else if(op==='leave')note('Kiléptél a partiból.');}catch(e){note(e.message);}}
async function poll(){
  if(polling||actionBusy)return;polling=true;const captured=owner;
  try{const r=await api('/frontwars/state');if(owner===captured)apply(r);}catch(e){note('A parti nem frissült: '+e.message);}finally{polling=false;lastPoll=Date.now();}
}
async function accountChanged(){const id=account.user?.id||null;if(id===owner)return;const old=model.party?.searchId;if(old)post('cancel',{attemptId:old});owner=id;lastRevision=-1;serverOffset=0;model={party:null,directory:[],viewer:account.user,now:Date.now()};attemptSent='';ownLobby=null;render();await poll();}
function prepareName(name){return new Promise((resolve,reject)=>{if(prepared){reject(Error('Már folyamatban van a névátadás.'));return;}const timer=setTimeout(()=>{prepared=null;reject(Error('A kiegészítő nem igazolta a névátadást. Ellenőrizd a Frontwars-ablakot.'));},8000);prepared={resolve:()=>{clearTimeout(timer);prepared=null;resolve();},reject:message=>{clearTimeout(timer);prepared=null;reject(Error(message));}};post('prepare',{name});});}
async function ready(){
  const me=member();if(!me)return;
  try{if(me.ready){await command('ready',{ready:false});return;}if(!bridgeFresh()||!menuReady)throw Error('Előbb telepítsd a kiegészítőt, és nyisd meg a Frontwars főmenüjét.');await prepareName(me.frontName);await command('heartbeat',{bridgeReady:true},true);await command('ready',{ready:true});note('Készen állsz. A közös jelre a kiegészítő beléptet a kijelölt FFA-lobbyba.');}catch(e){note(e.message);}
}
function launchIfNeeded(){
  const p=model.party,me=member();if(!owner||p?.phase!=='joining'||!p.target||me?.joinStatus!=='waiting'||attemptSent===p.searchId||!bridgeFresh()||p.leaderId!==owner&&!p.target.gameId)return;
  attemptSent=p.searchId;post('join',{attemptId:p.searchId,name:me.frontName,target:{...p.target,startsAt:p.target.startsAt-serverOffset,dispatchAt:p.target.dispatchAt-serverOffset}});
}
async function reportLobby(){
  const p=model.party;if(!owner||p?.leaderId!==owner||!ownLobby||reporting||actionBusy||Date.now()-lastReport<4000||Date.now()-ownLobby.receivedAt>5000)return;
  reporting=true;lastReport=Date.now();try{await command('report',{lobby:{...ownLobby,startsAt:ownLobby.startsAt+serverOffset}},true);}catch(e){note('A lobbyjelzés nem frissült: '+e.message);}finally{reporting=false;}
}
window.addEventListener('message',e=>{
  if(e.origin!==FRONT||e.source!==frame.contentWindow||e.data?.channel!==CHANNEL||e.data.nonce!==nonce)return;
  const d=e.data;
  if(['hello','snapshot'].includes(d.type)){bridgeSeen=Date.now();menuReady=d.menuReady===true;if(d.type==='snapshot'&&d.lobby)ownLobby={...d.lobby,receivedAt:Date.now()};renderConnection();renderLobby();if(d.type==='snapshot')reportLobby();launchIfNeeded();}
  if(d.type==='prepared')prepared?.resolve();if(d.type==='prepare-error')prepared?.reject(String(d.error||'A névátadás nem sikerült.'));
  if(['joined','failed'].includes(d.type)&&d.attemptId===model.party?.searchId)command('ack',{searchId:d.attemptId,status:d.type==='joined'?'joined':'failed',error:d.error,gameId:d.gameId},true).catch(e=>note('A belépés visszajelzése nem mentődött: '+e.message));
});
$('nameForm').onsubmit=e=>{e.preventDefault();act('name',{name:$('frontName').value});};
$('createForm').onsubmit=async e=>{e.preventDefault();try{if(!owner){openAccount();return;}await command('name',{name:$('frontName').value});await command('create',{title:$('partyTitle').value});note('A parti elkészült. Másold ki a meghívót, és jelezd a készenlétet.');}catch(error){note(error.message);}};
async function joinParty(code){try{if(!owner){$('partyCode').value=code;openAccount();return;}await command('name',{name:$('frontName').value});await command('join',{code});note('Csatlakoztál. A készenlétet mindenki külön jelzi.');}catch(e){note(e.message);}}
$('joinForm').onsubmit=e=>{e.preventDefault();joinParty($('partyCode').value);};
$('readyButton').onclick=ready;$('startSearch').onclick=()=>act('start');$('cancelSearch').onclick=()=>act('cancel');$('leaveParty').onclick=()=>act('leave');$('refreshParties').onclick=poll;$('loginLink').onclick=openAccount;
$('copyCode').onclick=async()=>{if(!model.party)return;const link=location.origin+'/frontwars.html?party='+model.party.code;try{await navigator.clipboard.writeText(link);note('Meghívólink kimásolva: '+model.party.code);}catch{note('Partikód: '+model.party.code+' · Meghívó: '+link);}};
window.addEventListener('webtar-account',accountChanged);frame.addEventListener('load',()=>post('ping'));document.addEventListener('visibilitychange',()=>{if(!document.hidden){post('ping');poll();}});
const invite=new URLSearchParams(location.search).get('party');if(invite&&/^[a-f0-9]{6}$/i.test(invite))$('partyCode').value=invite.toUpperCase();
setInterval(()=>{
  post('ping');renderConnection();renderLobby();
  const active=['searching','joining'].includes(model.party?.phase),interval=active?2500:7000;
  if(Date.now()-lastPoll>interval)poll();
  if(owner&&model.party&&Date.now()-lastHeartbeat>10000){lastHeartbeat=Date.now();command('heartbeat',{bridgeReady:bridgeFresh()&&menuReady},true).catch(e=>note('A jelenlét nem frissült: '+e.message));}
},2000);
render();await refreshAccount();owner=account.user?.id||null;await poll();post('ping');
