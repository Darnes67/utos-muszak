'use strict';
const {randomBytes,randomUUID}=require('node:crypto');
const {HttpError,profileKey}=require('./store.cjs');
const KEY='frontwars/parties/v1',PRESENCE=90000,BRIDGE=20000,SEARCH=15*60000,MAX=8;
const fail=(status,message)=>{throw new HttpError(status,message);};
function name(value){
  if(typeof value!=='string')fail(400,'Adj meg egy Frontwars-nevet.');
  const n=value.trim();if(!/^[\p{L}\p{N} _.\-\[\]]{3,20}$/u.test(n))fail(400,'A Frontwars-név 3–20 karakter: betű, szám, szóköz, _, -, pont vagy szögletes zárójel.');return n;
}
function clean(data,now){
  data.parties??={};data.memberships={};
  for(const [code,p] of Object.entries(data.parties)){
    const oldSize=p.members.length;p.members=p.members.filter(m=>now-m.lastSeen<PRESENCE);
    if(!p.members.length||now-p.updatedAt>24*3600000){delete data.parties[code];continue;}
    const changed=p.members.length!==oldSize;
    if(!p.members.some(m=>m.id===p.leaderId)){p.leaderId=p.members[0].id;reset(p,'A korábbi vezető kilépett. Az új vezető újraindíthatja a keresést.');}
    else if(changed&&['searching','joining'].includes(p.phase))reset(p,'Egy játékos kapcsolat nélkül maradt. Ellenőrizzétek a készenlétet.');
    if(p.phase==='searching'&&now-p.searchStartedAt>SEARCH)reset(p,'A keresés 15 perc után leállt. Újraindítható.');
    for(const m of p.members)data.memberships[m.id]=code;
  }
  return data;
}
function reset(p,message=''){
  p.phase='open';p.target=null;p.searchId=null;p.message=message;
  for(const m of p.members){m.ready=false;m.joinStatus='';m.joinError='';}
}
function snapshot(raw,now){
  if(!raw||typeof raw!=='object')fail(400,'Hiányzó Frontwars-lobby.');
  const map=typeof raw.map==='string'?raw.map.trim().slice(0,100):'',economy=typeof raw.economy==='string'?raw.economy.slice(0,30):'';
  if(!map||!['ffa','teams','unknown'].includes(raw.mode))fail(400,'Nem felismerhető a Frontwars-lobby.');
  if(!Number.isInteger(raw.players)||!Number.isInteger(raw.maxPlayers)||raw.players<0||raw.maxPlayers<1||raw.maxPlayers>1000||raw.players>raw.maxPlayers)fail(400,'Hibás lobbylétszám.');
  const startsAt=Number(raw.startsAt);if(!Number.isFinite(startsAt)||startsAt<now-5000||startsAt>now+10*60000)fail(400,'A lobby visszaszámlálása elavult.');
  let image='';try{const u=new URL(raw.image);if(u.protocol==='https:'&&u.hostname==='api.frontwars.io'&&/^\/maps\/[a-zA-Z0-9_-]+\/thumbnail$/.test(u.pathname)){u.search='';image=u.href;}}catch{}
  return{map,economy,mode:raw.mode,players:raw.players,maxPlayers:raw.maxPlayers,startsAt,image,receivedAt:now};
}
function match(p,now){
  const l=p.lobby;if(p.phase!=='searching'||!l||now-l.receivedAt>5000||l.mode!=='ffa'||l.startsAt-now<18000)return;
  if(!p.members.every(m=>m.ready&&now-m.lastSeen<PRESENCE&&now-m.bridgeAt<BRIDGE))return;
  if(l.maxPlayers-l.players<p.members.length+1)return;
  p.phase='joining';p.target={...l,searchId:p.searchId,dispatchAt:now+1500,partySize:p.members.length,gameId:null};p.message='Megfelelő FFA-lobby találva. Közös belépés folyamatban.';
  for(const m of p.members)m.joinStatus='waiting';
}
function visible(p,now,details=false){
  const leader=p.members.find(m=>m.id===p.leaderId);
  const base={code:p.code,title:p.title,leaderId:p.leaderId,leaderName:leader?.username||'',phase:p.phase,size:p.members.length,capacity:MAX,readyCount:p.members.filter(m=>m.ready).length};
  return details?{...base,message:p.message||'',searchId:p.searchId,searchStartedAt:p.searchStartedAt||null,target:p.target,lobby:p.lobby&&now-p.lobby.receivedAt<15000?p.lobby:null,members:p.members.map(m=>({id:m.id,username:m.username,frontName:m.frontName,ready:m.ready,bridgeReady:now-m.bridgeAt<BRIDGE,joinStatus:m.joinStatus||'',joinError:m.joinError||''}))}:base;
}
function output(data,profile,now){
  const p=profile?data.parties[data.memberships[profile.id]]:null;
  return{now,revision:data.revision||0,viewer:profile?{id:profile.id,username:profile.username,frontName:profile.frontwars?.name||''}:null,party:p?visible(p,now,true):null,directory:Object.values(data.parties).sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,40).map(p=>visible(p,now))};
}
async function state(store,profile,now){const data=clean(await store.get(KEY)||{parties:{}},now);return output(data,profile,now);}
async function action(store,profile,input,now){
  if(!profile)fail(401,'Partihoz jelentkezz be a Bánki Webtár-fiókoddal.');
  const allowed=['name','create','join','leave','heartbeat','ready','start','cancel','report','ack','kick'];
  if(!allowed.includes(input.op))fail(400,'Ismeretlen parti-művelet.');
  let current=profile;
  if(input.op==='name'){
    const n=name(input.name);current=await store.mutate(profileKey(profile.id),profile,p=>{p.frontwars={...p.frontwars,name:n};return p;});
  }
  let result;
  await store.mutate(KEY,{parties:{},memberships:{}},data=>{
    clean(data,now);let p=data.parties[data.memberships[profile.id]],me=p?.members.find(m=>m.id===profile.id);
    const member=()=>{if(!p||!me)fail(404,'Már nem vagy ebben a partiban.');};
    const leader=()=>{member();if(p.leaderId!==profile.id)fail(403,'Ezt csak a parti vezetője intézheti.');};
    const open=()=>{member();if(p.phase!=='open')fail(409,'Előbb állítsátok le a keresést vagy a belépést.');};
    if(input.op==='name'&&me){open();me.frontName=current.frontwars.name;me.ready=false;}
    if(input.op==='create'&&!p){
      if(Object.keys(data.parties).length>=160)fail(503,'Most megtelt a partioldal. Próbáld később.');
      const frontName=name(current.frontwars?.name);let code;
      do{code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(data.parties[code]);
      const title=typeof input.title==='string'?input.title.trim().slice(0,50):'';
      if(/[\x00-\x1f<>]/.test(title))fail(400,'Adj egyszerű nevet a partinak.');
      p=data.parties[code]={code,title:title||profile.username+' partija',leaderId:profile.id,createdAt:now,updatedAt:now,phase:'open',searchId:null,target:null,lobby:null,members:[]};
      me={id:profile.id,username:profile.username,frontName,joinedAt:now,lastSeen:now,bridgeAt:0,ready:false};p.members.push(me);data.memberships[profile.id]=code;
    }
    if(input.op==='join'){
      const code=typeof input.code==='string'?input.code.trim().toUpperCase():'';
      if(!/^[A-F0-9]{6}$/.test(code))fail(400,'A partikód 6 betűből/számból áll.');
      if(p&&p.code!==code)fail(409,'Előbb lépj ki a mostani partidból.');
      if(!p){p=data.parties[code];if(!p)fail(404,'Ez a parti már nem elérhető.');if(p.phase!=='open')fail(409,'Ebben a partiban már folyik a keresés.');if(p.members.length>=MAX)fail(409,'A parti megtelt.');
        me={id:profile.id,username:profile.username,frontName:name(current.frontwars?.name),joinedAt:now,lastSeen:now,bridgeAt:0,ready:false};p.members.push(me);data.memberships[profile.id]=code;
        for(const m of p.members)m.ready=false;
      }
    }
    if(input.op==='leave'){
      member();p.members=p.members.filter(m=>m.id!==profile.id);delete data.memberships[profile.id];
      if(!p.members.length)delete data.parties[p.code];else {if(p.leaderId===profile.id)p.leaderId=p.members[0].id;reset(p,'A tagság változott. Jelöljétek újra a készenlétet.');}me=null;p=null;
    }
    if(input.op==='kick'){
      leader();open();if(input.userId===profile.id)fail(400,'A kilépés gombbal hagyhatod el a partit.');if(!p.members.some(m=>m.id===input.userId))fail(404,'Ez a játékos nincs a partidban.');
      p.members=p.members.filter(m=>m.id!==input.userId);delete data.memberships[input.userId];reset(p,'A tagság változott. Jelöljétek újra a készenlétet.');
    }
    if(input.op==='heartbeat'){
      if(me){me.lastSeen=now;if(input.bridgeReady===true)me.bridgeAt=now;}
    }
    if(input.op==='ready'){
      open();if(input.ready===true&&now-me.bridgeAt>=BRIDGE)fail(409,'Előbb kapcsold össze a Frontwars-ablakot a kiegészítővel.');me.ready=input.ready===true;me.lastSeen=now;
    }
    if(input.op==='start'){
      leader();if(p.phase==='open'){
        if(!p.members.every(m=>m.ready&&now-m.bridgeAt<BRIDGE))fail(409,'Minden játékos legyen készen, aktív Frontwars-kapcsolattal.');
        p.phase='searching';p.searchId=randomUUID();p.target=null;p.searchStartedAt=now;p.message='Matchmaking · megfelelő Free For All-lobby keresése…';for(const m of p.members){m.joinStatus='';m.joinError='';}
        match(p,now);
      }
    }
    if(input.op==='cancel'){leader();reset(p,'A vezető leállította a keresést. A Frontwarsban már megnyitott játékot külön kell elhagyni.');}
    if(input.op==='report'){
      leader();me.lastSeen=now;me.bridgeAt=now;p.lobby=snapshot(input.lobby,now);match(p,now);
    }
    if(input.op==='ack'){
      member();if(!['joining','launched'].includes(p.phase)||input.searchId!==p.searchId)fail(409,'Ez a belépési kísérlet már nem aktuális.');
      if(!['joined','failed'].includes(input.status))fail(400,'Ismeretlen belépési állapot.');
      if(input.status==='joined'){if(typeof input.gameId!=='string'||!/^[A-Za-z0-9_-]{6,80}$/.test(input.gameId))fail(400,'A Frontwars nem adott érvényes meccsazonosítót.');if(profile.id===p.leaderId){if(p.target.gameId&&p.target.gameId!==input.gameId)fail(409,'A vezető már másik meccset igazolt vissza.');p.target.gameId=input.gameId;}else if(!p.target.gameId||input.gameId!==p.target.gameId)fail(409,'Nem a parti közös meccsét igazoltad vissza.');}
      me.joinStatus=input.status;me.joinError=input.status==='failed'?String(input.error||'A Frontwars nem igazolta a belépést.').slice(0,180):'';
      if(p.members.every(m=>m.joinStatus==='joined')){p.phase='launched';p.message='Minden játékos Frontwars-ablaka visszaigazolta a belépést.';}
    }
    if(me){me.lastSeen=now;p.updatedAt=now;}
    data.revision=(data.revision||0)+1;result=output(data,current,now);return data;
  });return result;
}
module.exports={state,action,name,snapshot,match,clean};
