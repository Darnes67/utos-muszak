(function(root){
'use strict';
const products=[
 {id:'character-0',category:'character',title:'Alex',description:'A zöld pólós alapfigura.',price:0,index:0,color:'#b5f57a'},
 {id:'character-1',category:'character',title:'Mira',description:'Lila pulóver, saját arc és mozdulatok.',price:300,index:1,color:'#bb9dff'},
 {id:'character-2',category:'character',title:'Béla',description:'Melósruha és sisakigazítás.',price:350,index:2,color:'#f4b263'},
 {id:'character-3',category:'character',title:'Cartman',description:'Piros kabát, türkiz sapka és sárga kesztyű.',price:800,index:3,color:'#d94f52'},
 {id:'character-4',category:'character',title:'Kenny',description:'Narancssárga kapucnis rajzfilmfigura.',price:700,index:4,color:'#f49952'},
 {id:'character-5',category:'character',title:'Stan',description:'Kék-piros sapka, barna kabát.',price:750,index:5,color:'#956c56'},
 {id:'character-6',category:'character',title:'Kyle',description:'Zöld fülvédős sapka, narancssárga kabát.',price:850,index:6,color:'#65c253'},
 {id:'character-7',category:'character',title:'Homer',description:'Sárga arc, fehér ing, jellegzetes hajszálak.',price:1200,index:7,color:'#f2d164'},
 {id:'character-8',category:'character',title:'SpongyaBob',description:'Szivacsforma, ing, nyakkendő és térdzokni.',price:1500,index:8,color:'#f6dd52'},
 {id:'tool-0',category:'tool',title:'Fa baseballütő',description:'Pontos és gyors. Erő 1× · fordulás 20 · követés 28.',price:0,index:0,color:'#e3bb7b'},
 {id:'tool-1',category:'tool',title:'Szivacsütő',description:'Nagyon könnyű. Erő 0,48× · fordulás 25 · követés 32.',price:150,index:1,color:'#e391c7'},
 {id:'tool-2',category:'tool',title:'Játék kalapács',description:'Súlyos, de lassú. Erő 1,55× · fordulás 7 · követés 16.',price:900,index:2,color:'#87b5ef'},
 {id:'tool-3',category:'tool',title:'Felfújható banán',description:'Hajlékony és könnyű. Erő 0,6× · fordulás 23 · követés 30.',price:400,index:3,color:'#ffe176'},
 {id:'tool-4',category:'tool',title:'Rugós bokszkesztyű',description:'Pontos ököl. Erő 1,15× · fordulás 15 · követés 22.',price:650,index:4,color:'#fa7e99'},
 {id:'tool-5',category:'tool',title:'Óriási szivacskéz',description:'Nagy felület, puha lökés. Erő 0,4× · fordulás 22 · követés 31.',price:1200,index:5,color:'#69d9c1'},
 {id:'shirt-blue',category:'shirt',title:'Óceánkék ruha',description:'Kék ruhaszín minden figurához.',price:150,value:'#7ac8fa',color:'#7ac8fa'},
 {id:'shirt-pink',category:'shirt',title:'Rágógumi ruha',description:'Vidám rózsaszín ruha.',price:180,value:'#f493c7',color:'#f493c7'},
 {id:'shirt-neon',category:'shirt',title:'Neon műszak',description:'Türkiz ruha, villámminta és fényes szegély.',price:450,value:'#55ded1',color:'#55ded1',detail:'neon'},
 {id:'shirt-galaxy',category:'shirt',title:'Csillagkapitány',description:'Lila ruha, csillaghímzés és arany jelvény.',price:900,value:'#7665c2',color:'#7665c2',detail:'galaxy'},
 {id:'pattern-stripes',category:'pattern',title:'Csíkos eszköz',description:'Kontrasztos csíkok az eszköz felületén.',price:150,value:'stripes',color:'#d8eea0'},
 {id:'pattern-dots',category:'pattern',title:'Pöttyös eszköz',description:'Rajzfilmes, fényes pöttyök.',price:150,value:'dots',color:'#f493c7'},
 {id:'pattern-comic',category:'pattern',title:'Képregénynyomat',description:'BONK felirat, cikkcakkok és színes pontok.',price:400,value:'comic',color:'#ffd16d'},
 {id:'pattern-gold',category:'pattern',title:'Arany műszak',description:'Arany díszcsík, csillagok és szegecsek.',price:800,value:'gold',color:'#ffd16d'},
 {id:'particle-heart',category:'particle',title:'Szívecskék',description:'Apró rózsaszín szívek a találat helyén.',price:300,value:'heart',color:'#fa86b9'},
 {id:'particle-confetti',category:'particle',title:'Konfettieső',description:'Többszínű konfetticsíkok.',price:350,value:'confetti',color:'#8fcdf4'},
 {id:'particle-spark',category:'particle',title:'Neonszikrák',description:'Élénk fénysugarak és szikrák.',price:700,value:'spark',color:'#65eed7'},
 {id:'particle-orbit',category:'particle',title:'Galaktikus bonk',description:'Mini bolygók gyűrűkkel és csillagokkal.',price:1400,value:'orbit',color:'#c09fff'}
];
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
