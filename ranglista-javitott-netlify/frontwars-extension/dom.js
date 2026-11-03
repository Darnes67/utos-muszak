(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BankiFrontwarsDOM=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function seconds(text){
    const s=text.trim();let m=s.match(/^(\d+):(\d{2})$/);if(m)return Number(m[1])*60+Number(m[2]);
    m=s.match(/^(?:(\d+)m\s*)?(\d+)s$/i);return m?Number(m[1]||0)*60+Number(m[2]):null;
  }
  function parse(lines,image,now){
    const a=lines.map(s=>s.trim()).filter(Boolean),countIndex=a.findIndex(s=>/^\d+\s*\/\s*\d+$/.test(s));
    if(countIndex<3)return null;
    const count=a[countIndex].match(/^(\d+)\s*\/\s*(\d+)$/),remaining=a.slice(countIndex+1).map(seconds).find(n=>n!==null);
    if(remaining===undefined)return null;
    const modeText=a[countIndex-1],economy=a[countIndex-2],map=a[countIndex-3];
    const mode=/^(?:FREE FOR ALL|FFA|MINDENKI MINDENKI ELLEN)$/i.test(modeText)?'ffa':/TEAM|CSAPAT|DUOS|TRIOS|QUADS|HUMANS VS NATIONS/i.test(modeText)?'teams':'unknown';
    if(!map||map.length>100)return null;
    return{map,economy,mode,modeText,players:Number(count[1]),maxPlayers:Number(count[2]),startsAt:now+remaining*1000,image};
  }
  function card(document){
    for(const img of document.querySelectorAll('img[alt="Map"]')){
      let e=img.parentElement;
      for(let i=0;e&&i<5;i++,e=e.parentElement)if(e.classList.contains('@container')&&/\d+\s*\/\s*\d+/.test(e.innerText))return{element:e,image:img.src};
    }
    return null;
  }
  function read(document,now=Date.now()){
    const c=card(document);return c?parse(c.element.innerText.split('\n'),c.image,now):null;
  }
  function same(lobby,target,now=Date.now()){
    return !!lobby&&!!target&&lobby.mode==='ffa'&&target.mode==='ffa'&&lobby.map===target.map&&lobby.economy===target.economy&&lobby.image.split('?')[0]===target.image.split('?')[0]&&Math.abs(lobby.startsAt-target.startsAt)<9000&&lobby.startsAt-now>=3000&&lobby.maxPlayers-lobby.players>=1;
  }
  return{seconds,parse,card,read,same};
});
