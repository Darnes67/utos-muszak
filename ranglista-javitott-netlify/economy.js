(function(root){
'use strict';
const products=[
 {id:'character-0',category:'character',title:'Alex',description:'A zöld pólós alapfigura.',price:0,index:0,color:'#b5f57a'},
 {id:'character-1',category:'character',title:'Mira',description:'Lila pulóver, saját arc és mozdulatok.',price:285,index:1,color:'#bb9dff'},
 {id:'character-2',category:'character',title:'Béla',description:'Melósruha és sisakigazítás.',price:330,index:2,color:'#f4b263'},
 {id:'character-3',category:'character',title:'Cartman',description:'Piros kabát, türkiz sapka és sárga kesztyű.',price:760,index:3,color:'#d94f52'},
 {id:'character-4',category:'character',title:'Kenny',description:'Narancssárga kapucnis rajzfilmfigura.',price:665,index:4,color:'#f49952'},
 {id:'character-5',category:'character',title:'Stan',description:'Kék-piros sapka, barna kabát.',price:710,index:5,color:'#956c56'},
 {id:'character-6',category:'character',title:'Kyle',description:'Zöld fülvédős sapka, narancssárga kabát.',price:810,index:6,color:'#65c253'},
 {id:'character-7',category:'character',title:'Homer',description:'Sárga arc, fehér ing, jellegzetes hajszálak.',price:1140,index:7,color:'#f2d164'},
 {id:'character-8',category:'character',title:'SpongyaBob',description:'Szivacsforma, ing, nyakkendő és térdzokni.',price:1425,index:8,color:'#f6dd52'},
 {id:'tool-0',category:'tool',title:'Fa baseballütő',description:'Pontos és gyors. Erő 1× · fordulás 20 · követés 28.',price:0,index:0,color:'#e3bb7b'},
 {id:'tool-1',category:'tool',title:'Szivacsütő',description:'Nagyon könnyű. Erő 0,48× · fordulás 25 · követés 32.',price:140,index:1,color:'#e391c7'},
 {id:'tool-2',category:'tool',title:'Játék kalapács',description:'Súlyos, de lassú. Erő 1,55× · fordulás 7 · követés 16.',price:855,index:2,color:'#87b5ef'},
 {id:'tool-3',category:'tool',title:'Felfújható banán',description:'Hajlékony és könnyű. Erő 0,6× · fordulás 23 · követés 30.',price:380,index:3,color:'#ffe176'},
 {id:'tool-4',category:'tool',title:'Rugós bokszkesztyű',description:'Pontos ököl. Erő 1,15× · fordulás 15 · követés 22.',price:620,index:4,color:'#fa7e99'},
 {id:'tool-5',category:'tool',title:'Óriási szivacskéz',description:'Nagy felület, puha lökés. Erő 0,4× · fordulás 22 · követés 31.',price:1140,index:5,color:'#69d9c1'},
 {id:'shirt-blue',category:'shirt',title:'Óceánkék ruha',description:'Kék ruhaszín minden figurához.',price:140,value:'#7ac8fa',color:'#7ac8fa'},
 {id:'shirt-pink',category:'shirt',title:'Rágógumi ruha',description:'Vidám rózsaszín ruha.',price:170,value:'#f493c7',color:'#f493c7'},
 {id:'shirt-neon',category:'shirt',title:'Neon műszak',description:'Türkiz ruha, villámminta és fényes szegély.',price:430,value:'#55ded1',color:'#55ded1',detail:'neon'},
 {id:'shirt-galaxy',category:'shirt',title:'Csillagkapitány',description:'Lila ruha, csillaghímzés és arany jelvény.',price:855,value:'#7665c2',color:'#7665c2',detail:'galaxy'},
 {id:'pattern-stripes',category:'pattern',title:'Csíkos eszköz',description:'Kontrasztos csíkok az eszköz felületén.',price:140,value:'stripes',color:'#d8eea0'},
 {id:'pattern-dots',category:'pattern',title:'Pöttyös eszköz',description:'Rajzfilmes, fényes pöttyök.',price:140,value:'dots',color:'#f493c7'},
 {id:'pattern-comic',category:'pattern',title:'Képregénynyomat',description:'BONK felirat, cikkcakkok és színes pontok.',price:380,value:'comic',color:'#ffd16d'},
 {id:'pattern-gold',category:'pattern',title:'Arany műszak',description:'Arany díszcsík, csillagok és szegecsek.',price:760,value:'gold',color:'#ffd16d'},
 {id:'particle-heart',category:'particle',title:'Szívecskék',description:'Apró rózsaszín szívek a találat helyén.',price:285,value:'heart',color:'#fa86b9'},
 {id:'particle-confetti',category:'particle',title:'Konfettieső',description:'Többszínű konfetticsíkok.',price:330,value:'confetti',color:'#8fcdf4'},
 {id:'particle-spark',category:'particle',title:'Neonszikrák',description:'Élénk fénysugarak és szikrák.',price:665,value:'spark',color:'#65eed7'},
 {id:'particle-orbit',category:'particle',title:'Galaktikus bonk',description:'Mini bolygók gyűrűkkel és csillagokkal.',price:1330,value:'orbit',color:'#c09fff'}
];
products.push(
{"id": "character-9", "category": "character", "title": "Peter Griffin", "description": "Family Guy · saját arc, jellegzetes ruha és külön testarányok.", "price": 800, "index": 9, "color": "#f4f0df"},
{"id": "character-10", "category": "character", "title": "Lois Griffin", "description": "Family Guy · saját arc, jellegzetes ruha és külön testarányok.", "price": 700, "index": 10, "color": "#66b6b0"},
{"id": "character-11", "category": "character", "title": "Stewie Griffin", "description": "Family Guy · saját arc, jellegzetes ruha és külön testarányok.", "price": 850, "index": 11, "color": "#f1df70"},
{"id": "character-12", "category": "character", "title": "Brian Griffin", "description": "Family Guy · saját arc, jellegzetes ruha és külön testarányok.", "price": 800, "index": 12, "color": "#f4f1e9"},
{"id": "character-13", "category": "character", "title": "Meg Griffin", "description": "Family Guy · saját arc, jellegzetes ruha és külön testarányok.", "price": 600, "index": 13, "color": "#d9658e"},
{"id": "character-14", "category": "character", "title": "Chris Griffin", "description": "Family Guy · saját arc, jellegzetes ruha és külön testarányok.", "price": 650, "index": 14, "color": "#487bbd"},
{"id": "character-15", "category": "character", "title": "Glenn Quagmire", "description": "Family Guy · saját arc, jellegzetes ruha és külön testarányok.", "price": 850, "index": 15, "color": "#cf4a45"},
{"id": "character-16", "category": "character", "title": "Cleveland Brown", "description": "Family Guy · saját arc, jellegzetes ruha és külön testarányok.", "price": 700, "index": 16, "color": "#e7bd55"},
{"id": "character-17", "category": "character", "title": "Csillag Patrik", "description": "SpongyaBob · saját arc, jellegzetes ruha és külön testarányok.", "price": 950, "index": 17, "color": "#f09bad"},
{"id": "character-18", "category": "character", "title": "Tunyacsáp", "description": "SpongyaBob · saját arc, jellegzetes ruha és külön testarányok.", "price": 900, "index": 18, "color": "#b28b57"},
{"id": "character-19", "category": "character", "title": "Rák úr", "description": "SpongyaBob · saját arc, jellegzetes ruha és külön testarányok.", "price": 1100, "index": 19, "color": "#9cbcdf"},
{"id": "character-20", "category": "character", "title": "Szandi", "description": "SpongyaBob · saját arc, jellegzetes ruha és külön testarányok.", "price": 1050, "index": 20, "color": "#efefed"},
{"id": "character-21", "category": "character", "title": "Bart Simpson", "description": "A Simpson család · saját arc, jellegzetes ruha és külön testarányok.", "price": 750, "index": 21, "color": "#ec7944"},
{"id": "character-22", "category": "character", "title": "Lisa Simpson", "description": "A Simpson család · saját arc, jellegzetes ruha és külön testarányok.", "price": 800, "index": 22, "color": "#e9714f"},
{"id": "character-23", "category": "character", "title": "Marge Simpson", "description": "A Simpson család · saját arc, jellegzetes ruha és külön testarányok.", "price": 950, "index": 23, "color": "#a4cf7a"},
{"id": "character-24", "category": "character", "title": "Rick Sanchez", "description": "Rick és Morty · saját arc, jellegzetes ruha és külön testarányok.", "price": 1200, "index": 24, "color": "#e9ece9"},
{"id": "character-25", "category": "character", "title": "Morty Smith", "description": "Rick és Morty · saját arc, jellegzetes ruha és külön testarányok.", "price": 750, "index": 25, "color": "#f0d85b"},
{"id": "character-26", "category": "character", "title": "Finn", "description": "Kalandra fel! · saját arc, jellegzetes ruha és külön testarányok.", "price": 850, "index": 26, "color": "#65c9eb"},
{"id": "character-27", "category": "character", "title": "Jake", "description": "Kalandra fel! · saját arc, jellegzetes ruha és külön testarányok.", "price": 900, "index": 27, "color": "#eeb64c"},
{"id": "character-28", "category": "character", "title": "Shrek", "description": "Shrek · saját arc, jellegzetes ruha és külön testarányok.", "price": 1300, "index": 28, "color": "#e6debd"},
{"id": "tool-6", "category": "tool", "title": "Gumicsirke", "description": "Erő 0.5× · fordulás 24 · követés 30. Saját forma és hang.", "price": 250, "index": 6, "color": "#e95648"},
{"id": "tool-7", "category": "tool", "title": "Serpenyő", "description": "Erő 1.25× · fordulás 10 · követés 21. Saját forma és hang.", "price": 550, "index": 7, "color": "#677b8c"},
{"id": "tool-8", "category": "tool", "title": "Seprű", "description": "Erő 0.62× · fordulás 19 · követés 26. Saját forma és hang.", "price": 350, "index": 8, "color": "#ead08b"},
{"id": "tool-9", "category": "tool", "title": "Óriási villáskulcs", "description": "Erő 1.3× · fordulás 9 · követés 18. Saját forma és hang.", "price": 800, "index": 9, "color": "#8298ab"},
{"id": "tool-10", "category": "tool", "title": "WC-pumpa", "description": "Erő 0.7× · fordulás 17 · követés 24. Saját forma és hang.", "price": 450, "index": 10, "color": "#df6862"},
{"id": "tool-11", "category": "tool", "title": "Rocksztár gitár", "description": "Erő 1.05× · fordulás 12 · követés 22. Saját forma és hang.", "price": 1000, "index": 11, "color": "#bc78ee"},
{"id": "tool-12", "category": "tool", "title": "Pisztoly", "description": "Tartsd nyomva a klikket a tüzeléshez. 2.6 lövés/mp · erő 0.72×. A fegyver a kurzor felé céloz.", "price": 1800, "index": 12, "color": "#b7c2cc"},
{"id": "tool-13", "category": "tool", "title": "Sörétes puska", "description": "Tartsd nyomva a klikket a tüzeléshez. 1.1 lövés/mp · erő 1.3×. A fegyver a kurzor felé céloz.", "price": 2400, "index": 13, "color": "#aa7a4d"},
{"id": "tool-14", "category": "tool", "title": "Gépfegyver", "description": "Tartsd nyomva a klikket a tüzeléshez. 6.2 lövés/mp · erő 0.42×. A fegyver a kurzor felé céloz.", "price": 3200, "index": 14, "color": "#b5c4cb"}
);
const achievements=[
 {id:'first',name:'Első találat',reward:5},
 {id:'combo5',name:'Ötös kombó',reward:10},
 {id:'hits50',name:'Ötven találat',reward:20},
 {id:'tools6',name:'Eszköztáros',reward:15},
 {id:'maps3',name:'Világutazó',reward:10},
 {id:'cones3',name:'Bójaborogató',reward:10},
 {id:'perfect',name:'Mesterlövész',reward:25},
 {id:'record',name:'Rekorder',reward:20}
];
const defaults={tool:'tool-0',character:'character-0',shirt:null,pattern:null,particle:null};
const legacy=['shirt-blue','shirt-pink','pattern-stripes','pattern-dots','particle-heart','particle-confetti'];
function freshWallet(){return {version:1,revision:0,stars:0,owned:['tool-0','character-0'],equipped:{...defaults},transactions:{},legacyMigrated:false};}
function normalizeWallet(raw){
 const w=freshWallet();if(!raw||typeof raw!=='object')return w;
 if(Number.isSafeInteger(raw.revision)&&raw.revision>=0)w.revision=raw.revision;
 if(Number.isFinite(raw.stars))w.stars=Math.max(0,Math.min(1e9,Math.floor(raw.stars)));
 if(Array.isArray(raw.owned))w.owned=[...new Set([...w.owned,...raw.owned.filter(id=>products.some(p=>p.id===id))])];
 for(const category of Object.keys(defaults)){const id=raw.equipped?.[category];if(id===null&&!['tool','character'].includes(category))w.equipped[category]=null;else if(w.owned.includes(id)&&products.some(p=>p.id===id&&p.category===category))w.equipped[category]=id;}
 if(raw.transactions&&typeof raw.transactions==='object'&&!Array.isArray(raw.transactions))w.transactions=raw.transactions;
 w.legacyMigrated=raw.legacyMigrated===true;w.achievements=Array.isArray(raw.achievements)?[...new Set(raw.achievements.filter(id=>achievements.some(a=>a.id===id)))]:[];return w;
}
function product(id){return products.find(p=>p.id===id);}
function meter(){return {tokens:0,clock:0,credits:0,roundCredits:0,cleanupAt:0,objects:{}};}
function advance(m,dt,combo){m.clock+=dt;if(m.clock-m.cleanupAt>15){for(const id of Object.keys(m.objects))if(m.clock-m.objects[id]>=10)delete m.objects[id];m.cleanupAt=m.clock;}m.tokens=Math.min(1,m.tokens+dt*(.75+.02*Math.min(4,Math.max(0,combo-1))));}
function hit(m,kind,objectId){
 if(kind==='object'){if(m.clock-(m.objects[objectId]??-100)<10)return 0;m.objects[objectId]=m.clock;}
 const value=Math.min(m.tokens,kind==='body'?1:.35);m.tokens-=value;
 const before=Math.floor(m.credits+1e-7);m.credits+=value;m.roundCredits+=value;return Math.floor(m.credits+1e-7)-before;
}
const api={products,defaults,legacy,achievements,freshWallet,normalizeWallet,product,meter,advance,hit};
if(typeof module==='object'&&module.exports)module.exports=api;else root.UTOS_ECONOMY=api;
})(globalThis);
