'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert'),economy=require('../economy.js');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const source=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import [^\n]*;\s*$/gm,'').replace(/\/\/ ONLINE_CLIENT_BEGIN[\s\S]*?\/\/ ONLINE_CLIENT_END/,'');
let frames=0,drawCalls=0;const noop=()=>{},nodes=new Map();
function drawing(){return new Proxy({measureText:()=>({width:60}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:(...args)=>{drawCalls++;for(const x of args)if(typeof x==='number')assert(Number.isFinite(x),'Non-finite '+k+' geometry');},set:(o,k,v)=>(o[k]=v,true)});}
function node(){const context=drawing();return {width:280,height:170,dataset:{},style:{},value:'',textContent:'',innerHTML:'',checked:false,hidden:false,disabled:false,classList:{add:noop,remove:noop,toggle:noop},getContext:()=>context,addEventListener:noop,setAttribute:noop,focus:noop,scrollIntoView:noop,replaceChildren:noop,appendChild:noop,hasPointerCapture:()=>false,getBoundingClientRect:()=>({left:0,top:0,width:1000,height:560})};}
const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
function queryAll(selector){
 if(selector==='#shop canvas')return [...get('shop').innerHTML.matchAll(/data-preview="([^"]+)"/g)].map(m=>Object.assign(node(),{dataset:{preview:m[1]}}));
 if(selector==='#shop button[data-shopid]')return [...get('shop').innerHTML.matchAll(/data-shopid="([^"]+)"/g)].map(m=>Object.assign(node(),{dataset:{shopid:m[1]}}));
 return [];
}
const saved=new Map([['utos-muszak-v5',JSON.stringify({stars:500,owned:['shirt-blue'],equipped:{shirt:'shirt-blue'},avatar:3,tutorialSeen:true})]]);
const context=vm.createContext({UTOS_ECONOMY:economy,document:{getElementById:get,querySelectorAll:queryAll,createElement:node,addEventListener:noop,hidden:false,body:{classList:{toggle:noop}}},window:{addEventListener:noop},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},requestAnimationFrame:()=>frames++,console});
vm.runInContext(source,context,{timeout:3000});const run=s=>vm.runInContext(s,context,{timeout:3000});
(async()=>{
 assert.equal(run('wallet().stars'),500);assert.equal(run('selectedCharacter'),0);assert.equal(run('equipped("shirt")'),'shirt-blue');
 assert(await run('purchase("tool-1")'));assert.equal(run('wallet().stars'),500-economy.product("tool-1").price);assert(run('owns("tool-1")'));assert.equal(run('selectedTool'),0);
 assert(await run('purchase("tool-1")'));assert.equal(run('selectedTool'),1);assert.equal(run('wallet().stars'),500-economy.product("tool-1").price);
 assert.equal(await run('purchase("tool-2")'),false);assert.equal(run('wallet().stars'),500-economy.product("tool-1").price);assert(!run('owns("tool-2")'));
 run('selectCharacter(3)');assert.equal(run('selectedCharacter'),0);assert.equal(get('shopPanel').open,true);
 const ctxBefore=run('ctx'),bodyBefore=run('person'),characterBefore=run('selectedCharacter');
 for(const item of economy.products){context.testItem=item;context.testCanvas=node();run('drawShopPreview(testItem,testCanvas)');}
 for(let i=0;i<8;i++){context.angle=i*Math.PI/4;run('drawShopPreview(economy.product("tool-4"),testCanvas,angle)');}
 assert(drawCalls>500);assert.strictEqual(run('ctx'),ctxBefore);assert.strictEqual(run('person'),bodyBefore);assert.equal(run('selectedCharacter'),characterBefore);
 run('showShop("particle")');assert(get('shop').innerHTML.includes('particle-orbit'));assert(get('shop').innerHTML.includes('Nagy előnézet'));
 const balance=run('wallet().stars');run('callPerson();beginGetup();resetSession();setMode("free");');assert.equal(run('wallet().stars'),balance);assert.equal(frames,1);
 assert.equal(JSON.parse(saved.get('utos-muszak-v5')).guestWallet.stars,500-economy.product("tool-1").price);
 saved.set('utos-muszak-v5','invalid json');assert.equal(run('loadProgress().guestWallet.stars'),0);
 const getItem=context.localStorage.getItem;context.localStorage.getItem=()=>{throw Error('blocked storage')};assert.equal(run('loadProgress().guestWallet.equipped.tool'),'tool-0');context.localStorage.getItem=getItem;

 console.log('PASS: legacy guest balance/cosmetics, locked avatar fallback, guest purchase/equip, insufficient balance, locked selection, all product/rotated glove previews with finite geometry, preview restores live state, no rewards from reset/getup, persistent purchases, single RAF loop.');
})().catch(e=>{console.error(e);process.exitCode=1});
