(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LuckyCore=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const START=100000,ORDER=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26],REDS=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const color=n=>n===0?'green':REDS.includes(n)?'red':'black';
const total=hand=>{let n=hand.reduce((s,c)=>s+(c.v==='A'?11:['J','Q','K'].includes(c.v)?10:Number(c.v)),0),a=hand.filter(c=>c.v==='A').length;while(n>21&&a-->0)n-=10;return n;};
function fresh(){return{version:1,balance:START,best:START,rounds:0,daily:'',revision:0,lastAt:0,receipts:[],blackjack:null};}
function view(s){const b=s.blackjack;return{balance:s.balance,best:s.best,rounds:s.rounds,daily:s.daily,revision:s.revision,blackjack:b?{player:b.player,dealer:b.active?[b.dealer[0],{v:'?',s:'?'}]:b.dealer,active:b.active,stake:b.stake||0,total:total(b.player),dealerTotal:b.active?null:total(b.dealer)}:null};}
function transition(s,input,now,rand){
 const {game,action,choice}=input;let reward=0,result={},finished=true,charged=0,roundStake=0;
 const paid=game!=='wheel'&&(game!=='blackjack'||action==='deal');
 if(paid){const bet=input.stake;if(!Number.isSafeInteger(bet)||bet<100||bet>100000||bet%100!==0)throw Error('A tét 100 és 100 000 közötti, százzal osztható játékpont legyen.');if(bet>s.balance)throw Error('Nincs elegendő játékpontod ehhez a téthez.');s.balance-=bet;charged=roundStake=bet;}
 const fail=m=>{throw Error(m);};
 if(game==='roulette'){
  if(action!=='spin'||!choice||!(choice.kind==='number'&&Number.isInteger(choice.value)&&choice.value>=0&&choice.value<=36||choice.kind==='color'&&['red','black','green'].includes(choice.value)))fail('Válassz egy színt vagy számot.');
  const n=rand(37),c=color(n),win=choice.kind==='number'?n===choice.value:c===choice.value;
  reward=win?roundStake*(choice.kind==='number'||c==='green'?36:2):0;result={number:n,color:c,win};
 }else if(game==='slots'){
  if(action!=='spin')fail('Ismeretlen művelet.');const symbols=Array.from({length:3},()=>rand(6)),same=new Set(symbols).size;
  reward=same===1?roundStake*12:same===2?Math.floor(roundStake*1.5):0;result={symbols,win:reward>0};
 }else if(game==='dice'){
  if(action!=='roll'||!Number.isInteger(choice)||choice<2||choice>12)fail('A tipp 2 és 12 közötti egész szám legyen.');
  const dice=[rand(6)+1,rand(6)+1],sum=dice[0]+dice[1];const ways=6-Math.abs(7-choice);reward=sum===choice?Math.floor(roundStake*342/(ways*10)):0;result={dice,sum,win:reward>0};
 }else if(game==='wheel'){
  if(action!=='spin')fail('Ismeretlen művelet.');const day=new Date(now).toISOString().slice(0,10);if(s.daily===day)fail('A mai bónuszt már átvetted. Holnap újra pörgethetsz (UTC).');
  const index=rand(8),prizes=[500,1000,2500,500,5000,1000,2500,10000];reward=prizes[index];s.daily=day;result={index,win:true};
 }else if(game==='blackjack'){
  let b=s.blackjack;
  if(action==='deal'){
   if(b?.active)fail('Előbb fejezd be a megkezdett kört.');
   const deck=[];for(const suit of ['♠','♥','♦','♣'])for(const v of ['A','2','3','4','5','6','7','8','9','10','J','Q','K'])deck.push({v,s:suit});
   for(let i=deck.length-1;i>0;i--){const j=rand(i+1);[deck[i],deck[j]]=[deck[j],deck[i]];}
   b=s.blackjack={deck,player:[deck.pop(),deck.pop()],dealer:[deck.pop(),deck.pop()],active:true,stake:roundStake};
   if(total(b.player)===21)actionFinish();else finished=false;
  }else{
   if(!b?.active)fail('Indíts egy új kört.');roundStake=b.stake||0;
   if(action==='hit'){b.player.push(b.deck.pop());if(total(b.player)>=21)actionFinish();else finished=false;}
   else if(action==='stand')actionFinish();else fail('Ismeretlen művelet.');
  }
  function actionFinish(){
   if(total(b.player)<=21)while(total(b.dealer)<17)b.dealer.push(b.deck.pop());
   b.active=false;const p=total(b.player),d=total(b.dealer),win=p<=21&&(d>21||p>d);const tie=p<=21&&p===d;reward=win?Math.floor((b.stake||0)*(p===21&&b.player.length===2?2.5:2)):tie?(b.stake||0):0;result={win,tie,bust:p>21};
  }
 }else fail('Ismeretlen játék.');
 if(!Number.isSafeInteger(s.balance)||s.balance<0||s.balance>Number.MAX_SAFE_INTEGER-3600000)fail('Az egyenleg nem kezelhető.');
 s.balance+=reward;s.best=Math.max(s.best||START,s.balance);if(finished)s.rounds++;s.revision++;s.lastAt=now;
 return{game,action,reward,payout:reward,stake:roundStake,charged,net:reward-roundStake,finished,...result,state:view(s)};
}
function apply(s,input,now,rand){const draft=JSON.parse(JSON.stringify(s));const result=transition(draft,input,now,rand);Object.assign(s,draft);return result;}
return{START,ORDER,REDS,color,total,fresh,view,apply};
});
