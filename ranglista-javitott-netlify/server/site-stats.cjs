'use strict';
const {createHash}=require('node:crypto'),{HttpError}=require('./store.cjs');
const hash=s=>createHash('sha256').update(s).digest('hex'),TTL=90000;
async function registered(store,listUsers,now){
 const cached=await store.get('site-stats/registered');
 if(cached&&now-cached.at<60000)return cached.count;
 try{const ids=new Set();let complete=false;for(let page=1;page<=100;page++){const users=await listUsers({page,perPage:100});if(!Array.isArray(users))throw Error('Invalid Identity list');for(const u of users)if(typeof u.id==='string')ids.add(u.id);if(users.length<100){complete=true;break;}}if(!complete)throw Error('Identity pagination limit');await store.mutate('site-stats/registered',{},d=>{d.count=ids.size;d.at=now;});return ids.size;}catch{return cached?.count??null;}
}
async function stats(store,{visitorId,userId,listUsers,now=Date.now()}){
 if(visitorId!==undefined&&(typeof visitorId!=='string'||!/^[a-f0-9-]{36}$/i.test(visitorId)))throw new HttpError(400,'Érvénytelen látogatóazonosító.');
 const registeredTask=registered(store,listUsers,now);
 let active;
 const count=d=>new Set(Object.values(d.visitors||{}).filter(v=>now-v.at<TTL).map(v=>v.user||v.browser)).size;
 if(visitorId){active=await store.mutate('site-stats/presence',{visitors:{}},d=>{d.visitors=Object.fromEntries(Object.entries(d.visitors).filter(([,v])=>now-v.at<TTL));const browser=hash(visitorId);if(!d.visitors[browser]&&Object.keys(d.visitors).length>=2000)throw new HttpError(503,'A látogatószámláló most foglalt.');d.visitors[browser]={browser,user:userId?hash('user:'+userId):null,at:now};return count(d);});}
 else active=count(await store.get('site-stats/presence')||{});
 return{registered:await registeredTask,active,activeWindowSeconds:90,updatedAt:now};
}
module.exports={stats};
