import {account,api,refreshAccount,openAccount} from '../webtar-account.js';
const core=globalThis.LuckyCore,$=id=>document.getElementById(id),fmt=n=>Number(n||0).toLocaleString('hu-HU'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let current='roulette',guestState=core.fresh(),state=core.view(guestState),owner=null,busy=false,pending=null,ready=false,choice={kind:'color',value:'red'},rotation=0,soundOn=localStorage.getItem('lucky67_sound')==='on',ctx,master,lastAccount=null;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,reduced.matches?35:ms));
function rng(n){const limit=Math.floor(4294967296/n)*n,a=new Uint32Array(1);do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%n;}
function guest(){try{const s=JSON.parse(localStorage.getItem('lucky67_guest_v2'));if(s?.version===1&&Number.isSafeInteger(s.balance)&&s.balance>=0)return s;const old=JSON.parse(localStorage.getItem('lucky67_demo'));if(old&&Number.isSafeInteger(old.balance)&&old.balance>=0){const fresh=core.fresh();fresh.balance=old.balance;fresh.best=old.balance;return fresh;}}catch(_){}return core.fresh();}
function keepGuest(){localStorage.setItem('lucky67_guest_v2',JSON.stringify(guestState));}
function pendingKey(){return 'lucky67_pending:'+owner;}
function keepPending(){if(owner){if(pending)sessionStorage.setItem(pendingKey(),JSON.stringify(pending));else sessionStorage.removeItem(pendingKey());}}
function soundInit(){if(!soundOn)return;try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();if(!master){master=ctx.createGain();master.gain.value=.22;master.connect(ctx.destination);}if(ctx.state==='suspended')ctx.resume();}catch(_){}}
function tone(f,t=.08,type='sine',delay=0,volume=.22){if(!soundOn||document.hidden)return;soundInit();if(!ctx||!master)return;const start=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,start);g.gain.setValueAtTime(.001,start);g.gain.exponentialRampToValueAtTime(volume,start+.006);g.gain.exponentialRampToValueAtTime(.001,start+t);o.connect(g);g.connect(master);o.start(start);o.stop(start+t+.01);}
function sfx(kind){if(kind==='win'){[523,659,784,1046].forEach((f,i)=>tone(f,.25,'triangle',i*.09,.3));}else if(kind==='spin'){[180,240,300].forEach((f,i)=>tone(f,.12,'triangle',i*.05));}else if(kind==='deal'){tone(150,.06,'triangle');tone(680,.045,'sine',.035,.12);}else if(kind==='land'){tone(290,.12,'triangle');}else tone(520,.04,'sine',0,.1);}
function renderSound(){$('sound').textContent=soundOn?'♫ Hang: BE':'♫ Hang bekapcsolása';$('sound').setAttribute('aria-pressed',String(soundOn));}
$('sound').onclick=()=>{soundOn=!soundOn;localStorage.setItem('lucky67_sound',soundOn?'on':'off');renderSound();if(soundOn){soundInit();sfx('win');}else ctx?.suspend();};renderSound();
document.addEventListener('visibilitychange',()=>{if(document.hidden)ctx?.suspend();});
function notice(text,win=false){$('result').textContent=text;$('result').classList.remove('win');if(win){void $('result').offsetWidth;$('result').classList.add('win');}}
function celebrate(){sfx('win');if(reduced.matches)return;const root=$('celebration');root.replaceChildren();for(let i=0;i<32;i++){const p=document.createElement('i');p.className='confetti';p.style.setProperty('--x',(Math.random()-.5)*500+'px');p.style.setProperty('--y',(-80+Math.random()*400)+'px');p.style.background=['#efce82','#b8f879','#fff'][i%3];root.appendChild(p);}setTimeout(()=>root.replaceChildren(),1300);}
function updateWallet(){const before=Number($('balance').dataset.value||state.balance),target=state.balance;let t0;const animate=t=>{t0??=t;const p=reduced.matches?1:Math.min(1,(t-t0)/650);$('balance').textContent=fmt(Math.round(before+(target-before)*(1-(1-p)**3)));if(p<1)requestAnimationFrame(animate);};$('balance').dataset.value=target;requestAnimationFrame(animate);$('playerName').textContent=account.user?account.user.username:'Vendégjáték';$('saveStatus').textContent=owner?'Fiókhoz mentve · '+state.rounds+' lezárt kör':'Helyi mentés · a ranglistához jelentkezz be';}
function lock(value){busy=value;document.querySelectorAll('nav button,#gameContent button,#gameContent select,#stakePanel button,#stakePanel input').forEach(b=>b.disabled=value||!!pending);if(!value&&!pending&&current==='blackjack')blackjackButtons();if(!value&&!pending&&current==='wheel'&&state.daily===new Date().toISOString().slice(0,10)&&$('play'))$('play').disabled=true;$('retryArea').hidden=!pending;refreshStake();}
let syncTask=null,syncFor=null;
function syncAccount(){const id=account.user?.id||null;if(syncTask&&syncFor===id)return syncTask;syncFor=id;const task=doSyncAccount();syncTask=task;task.finally(()=>{if(syncTask===task)syncTask=null;});return task;}
async function doSyncAccount(){const id=account.user?.id||null;if(id===lastAccount&&ready)return;lastAccount=id;ready=false;owner=id;pending=null;
 if(!id){guestState=guest();state=core.view(guestState);ready=true;updateWallet();renderGame();return;}
 try{const r=await api('/casino/state');if(owner!==id)return;state=r.state;try{const saved=JSON.parse(sessionStorage.getItem(pendingKey()));if(saved?.game)pending=saved;}catch(_){}ready=true;updateWallet();renderGame();lock(false);}
 catch(e){if(owner!==id)return;notice('A fiók betöltése nem sikerült: '+e.message);$('saveStatus').textContent='A fiók még nem töltődött be';}
}
window.addEventListener('webtar-account',()=>{if(busy)return;syncAccount();});
$('accountLink').onclick=()=>openAccount();
window.addEventListener('message',async e=>{if(e.origin!==location.origin||e.source!==parent)return;if(e.data?.type==='webtar:prepare-account'){parent.postMessage({type:'webtar:account-prepared',id:e.data.id,error:busy||pending?'Előbb fejezd be vagy mentsd újra a Lucky67 folyamatban lévő körét.':''},location.origin);}});
async function board(){const button=$('refreshBoard');button.disabled=true;try{const r=await api('/casino/leaderboard',undefined,{publicOnly:true});const list=$('leaderboard');list.replaceChildren();if(!r.rows.length){const li=document.createElement('li');li.className='empty';li.textContent='Még nincs eredmény. Bejelentkezve játssz egy kört, és legyél az első!';list.appendChild(li);}for(const row of r.rows){const li=document.createElement('li');li.className='rank-row'+(row.user_id===owner?' mine':'');const place=document.createElement('span');place.textContent=String(row.place).padStart(2,'0');const box=document.createElement('div'),name=document.createElement('strong'),score=document.createElement('small');name.textContent=row.username;score.textContent=fmt(row.balance)+' pont · '+row.rounds+' kör';box.append(name,score);li.append(place,box);list.appendChild(li);}$('boardStatus').textContent='Élő, szerveren mentett eredmények.';}catch(e){if($('leaderboard').textContent.includes('Toplista betöltése'))$('leaderboard').textContent='Nincs betöltött eredmény.';$('boardStatus').textContent='A toplista most nem tölthető be. '+e.message;}finally{button.disabled=false;}}
$('refreshBoard').onclick=board;
const wheelColors=['#147c49','#a62c39','#152c23'];
function drawWheel(canvas,prizes=false){canvas.setAttribute('aria-label',prizes?'Napi bónuszkerék nyolc jutalommal':'Európai rulettkerék 37 számozott mezővel');const c=canvas.getContext('2d'),S=760,C=S/2,R=365;canvas.width=canvas.height=S;c.clearRect(0,0,S,S);const values=prizes?[500,1000,2500,500,5000,1000,2500,10000]:core.ORDER,step=Math.PI*2/values.length;
 for(let i=0;i<values.length;i++){const a=-Math.PI/2+(i-.5)*step,b=a+step;c.beginPath();c.moveTo(C,C);c.arc(C,C,R,a,b);c.closePath();c.fillStyle=prizes?(i%2?'#173e2a':'#b38d39'):(core.color(values[i])==='red'?'#ae2939':core.color(values[i])==='green'?'#087d4a':'#111d18');c.fill();c.lineWidth=2;c.strokeStyle='#e2c77b80';c.stroke();c.save();c.translate(C,C);c.rotate(-Math.PI/2+i*step);c.translate(R*.86,0);c.rotate(Math.PI/2);c.fillStyle='#fff9dc';c.font=`900 ${prizes?30:23}px Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText(prizes?fmt(values[i]):values[i],0,0);c.restore();}
 c.beginPath();c.arc(C,C,R*.68,0,Math.PI*2);const g=c.createRadialGradient(C-60,C-70,20,C,C,R*.7);g.addColorStop(0,'#547e4b');g.addColorStop(1,'#0b2a1a');c.fillStyle=g;c.fill();c.strokeStyle='#d4b568';c.lineWidth=10;c.stroke();for(let i=0;i<8;i++){const a=i*Math.PI/4;c.beginPath();c.moveTo(C,C);c.lineTo(C+Math.cos(a)*R*.64,C+Math.sin(a)*R*.64);c.strokeStyle='#d8b56450';c.lineWidth=3;c.stroke();}}
function wheelMarkup(){return '<div class="roulette-stage"><div class="pointer"></div><canvas id="wheelCanvas" role="img" aria-label="Jól látható, számozott rulettkerék"></canvas><div class="ball-track" id="ballTrack"><i class="ball"></i></div><div class="wheel-cap">67</div></div>';}
function selectChoice(kind,value){choice={kind,value};document.querySelectorAll('[data-choice]').forEach(b=>b.classList.toggle('selected',b.dataset.kind===kind&&String(b.dataset.value)===String(value)));sfx('click');refreshStake();}
function renderGame(){rotation=0;$('retryArea').hidden=!pending;const names={roulette:'EURÓPAI RULETT',blackjack:'BLACKJACK · 21',slots:'SLOT MACHINE',dice:'DICE MASTER',wheel:'NAPI SZERENCSEKERÉK'};$('tableLabel').textContent=names[current];document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.game===current));let html='';
 if(current==='roulette'){html='<p>Válassz egy színt vagy pontos számot. A mutató jelöli a ténylegesen kipörgetett eredményt.</p>'+wheelMarkup()+'<div id="rouletteNumber" aria-live="polite"></div><div class="control-label">Kifizetés · piros / fekete: 2× · zöld / szám: 36×</div><div class="choices">'+[['red','Piros'],['black','Fekete'],['green','Zöld 0']].map(([v,n])=>`<button class="${v}" data-choice data-kind="color" data-value="${v}">${n}</button>`).join('')+'</div><div class="number-grid">'+Array.from({length:37},(_,n)=>`<button class="${core.color(n)}" data-choice data-kind="number" data-value="${n}" aria-label="Tipp: ${n}">${n}</button>`).join('')+'</div><button id="play" class="action">Kerék megpörgetése ↗</button>';}
 if(current==='wheel'){html='<p>Naponta egy ingyenes bónusz, 500–10 000 pont között. A napi jutalom fiókonként egyszer vehető át.</p>'+wheelMarkup()+'<button id="play" class="action">Napi bónusz pörgetése ✦</button>';}
 if(current==='slots'){html='<p>Kifizetés: három azonos jel 12× tét, két azonos 1,5× tét. Három különböző jel esetén a tét elvész.</p><div class="reels">'+['🍀','⭐','💎'].map((v,i)=>`<div class="reel" id="reel${i}">${v}</div>`).join('')+'</div><button id="play" class="action">Tárcsák indítása ↗</button>';}
 if(current==='dice'){html='<p>Találd el a két kocka összegét. A ritkább összegek nagyobb szorzóval fizetnek; a pontos kifizetést fent látod.</p><div class="dice"><div class="die" id="die0">⚂</div><div class="die" id="die1">⚄</div></div><label>Tipp: <select id="guess">'+Array.from({length:11},(_,i)=>`<option value="${i+2}" ${i===5?'selected':''}>${i+2}</option>`).join('')+'</select></label><button id="play" class="action">Kockák eldobása ↗</button>';}
 if(current==='blackjack'){html='<p>Kerülj közelebb a 21-hez, mint az osztó. Ász: 1 vagy 11. Az osztó 17-nél megáll. Kifizetés: győzelem 2×, kétlapos 21 esetén 2,5×. Döntetlennél a tét visszajár.</p><div class="hand-label">♛ AZ OSZTÓ LAPJAI</div><div class="hand" id="dealerHand"></div><div class="hand-total" id="dealerTotal"></div><div class="hand-label">A TE LAPJAID</div><div class="hand" id="playerHand"></div><div class="hand-total" id="playerTotal"></div><div class="bj-controls"><button class="action" id="deal">Új kör</button><button class="action" id="hit">Lap kérek</button><button class="action" id="stand">Megállok</button></div>';}
 $('gameContent').innerHTML=html;
 if(['roulette','wheel'].includes(current))drawWheel($('wheelCanvas'),current==='wheel');
 if(current==='roulette'){document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>selectChoice(b.dataset.kind,b.dataset.kind==='number'?Number(b.dataset.value):b.dataset.value));selectChoice(choice.kind,choice.value);}
 if(current==='blackjack'){renderHands();for(const a of ['deal','hit','stand'])$(a).onclick=()=>play(a);}
 else $('play').onclick=()=>play(current==='dice'?'roll':'spin');
 if(current==='wheel'&&state.daily===new Date().toISOString().slice(0,10)){$('play').textContent='✓ Mai bónusz átvéve';$('play').disabled=true;}
 if(current==='dice')$('guess').onchange=refreshStake;
 lock(false);
}
function validStake(){const n=Number($('stake').value);return Number.isSafeInteger(n)&&n>=100&&n<=100000&&n%100===0&&n<=state.balance;}
function refreshStake(){
 const active=current==='blackjack'&&state.blackjack?.active,free=current==='wheel',n=active?state.blackjack.stake:Number($('stake').value),blocked=busy||!!pending;
 $('stakePanel').hidden=free;$('roundTag').textContent=free?'INGYENES NAPI BÓNUSZ':'VIRTUÁLIS PONTOS TÉT';
 document.querySelectorAll('#stakePanel input,#stakePanel button').forEach(b=>b.disabled=blocked||!!active);
 if(free)return;
 if(active){$('stakeNote').textContent='Folyamatban lévő leosztás · '+fmt(n)+' pont már levonva. A lapkérés és megállás nem kerül újabb pontba.';}
 else $('stakeNote').textContent=validStake()?'100–100 000 pont, százas lépésekben. A tét a kör elején levonódik.':n>state.balance?'Ehhez nincs elég pontod. Válassz kisebb tétet, vagy pörgesd meg az ingyenes napi kereket.':'100 és 100 000 közötti, százzal osztható tétet válassz.';
 let hint='';
 if(active||validStake()){if(current==='roulette'){const m=choice.kind==='number'||choice.value==='green'?36:2;hint='Találat: '+fmt(n*m)+' pont kifizetés ('+m+'×), ebből '+fmt(n*(m-1))+' pont nyereség.';}
 if(current==='slots')hint='Két azonos: '+fmt(Math.floor(n*1.5))+' · három azonos: '+fmt(n*12)+' pont kifizetés.';
 if(current==='dice'&&$('guess')){const m=34.2/(6-Math.abs(7-Number($('guess').value)));hint='Találat: '+fmt(Math.floor(n*342/((6-Math.abs(7-Number($('guess').value)))*10)))+' pont kifizetés ('+m.toLocaleString('hu-HU',{maximumFractionDigits:2})+'×).';}
 if(current==='blackjack')hint='Győzelem: '+fmt(n*2)+' · blackjack: '+fmt(Math.floor(n*2.5))+' · döntetlen: '+fmt(n)+' pont kifizetés.';}
 $('payoutHint').textContent=hint;
 if(current==='blackjack'){blackjackButtons();if(!active)$('deal').textContent='Leosztás · '+fmt(n)+' pont';}
 else if($('play'))$('play').disabled=blocked||!validStake();
}
$('stake').oninput=refreshStake;
document.querySelectorAll('[data-stake]').forEach(b=>b.onclick=()=>{$('stake').value=b.dataset.stake==='max'?Math.min(100000,Math.floor(state.balance/100)*100):b.dataset.stake;refreshStake();sfx('click');});
function card(c,i){const e=document.createElement('div');e.className='card'+(['♥','♦'].includes(c.s)?' red':'')+(c.v==='?'?' back':'');e.style.animationDelay=(reduced.matches?0:i*.07)+'s';if(c.v!=='?'){const a=document.createElement('span'),b=document.createElement('span');a.textContent=c.v;b.textContent=c.s;e.append(a,b);}return e;}
function renderHands(){const b=state.blackjack;for(const [id,cards] of [['playerHand',b?.player||[]],['dealerHand',b?.dealer||[]]]){const root=$(id);root.replaceChildren(...cards.map(card));}$('playerTotal').textContent=b?'Összesen: '+b.total:'Várjuk az első leosztást';$('dealerTotal').textContent=b?.active?'Egy lap rejtve':b?'Összesen: '+b.dealerTotal:'';blackjackButtons();}
function blackjackButtons(){if(current!=='blackjack')return;const active=!!state.blackjack?.active;$('deal').disabled=busy||!!pending||active||!validStake();$('hit').disabled=$('stand').disabled=busy||!!pending||!active;}
async function animate(result){
 sfx('spin');if(['roulette','wheel'].includes(current)){
  const count=current==='wheel'?8:37,index=current==='wheel'?result.index:core.ORDER.indexOf(result.number),target=(360-index*360/count)%360,normal=((rotation%360)+360)%360;rotation+=1800+(target-normal+360)%360;
  const canvas=$('wheelCanvas'),ball=$('ballTrack'),duration=reduced.matches?40:3600;
  canvas.style.transition=`transform ${duration}ms cubic-bezier(.12,.65,.13,1)`;canvas.style.transform=`rotate(${rotation}deg)`;ball.style.transition=`transform ${duration}ms cubic-bezier(.12,.65,.13,1)`;ball.style.transform='rotate(-1440deg)';
  let tick=0;const clock=setInterval(()=>{if(tick++<17)tone(650-tick*12,.018,'triangle',0,.09);},160);await wait(duration+60);clearInterval(clock);ball.style.transition='none';ball.style.transform='rotate(0deg)';
  if(current==='roulette'){const badge=document.createElement('span');badge.className='result-badge '+result.color;badge.textContent=result.number;$('rouletteNumber').replaceChildren(badge);}
 }else if(current==='slots'){
  const icons=['🍀','⭐','💎','7️⃣','🔔','🍒'];const timers=[];for(let i=0;i<3;i++){$('reel'+i).classList.add('rolling');timers[i]=setInterval(()=>$('reel'+i).textContent=icons[rng(6)],70);}
  for(let i=0;i<3;i++){await wait(i===0?700:360);clearInterval(timers[i]);$('reel'+i).textContent=icons[result.symbols[i]];$('reel'+i).classList.remove('rolling');sfx('land');}
 }else if(current==='dice'){
  for(let i=0;i<2;i++)$('die'+i).classList.add('shaking');const timer=setInterval(()=>{for(let i=0;i<2;i++)$('die'+i).textContent=String.fromCodePoint(9856+rng(6));tone(130,.03,'triangle',0,.1);},110);await wait(1100);clearInterval(timer);for(let i=0;i<2;i++){$('die'+i).textContent=String.fromCodePoint(9855+result.dice[i]);$('die'+i).classList.remove('shaking');}
 }else if(current==='blackjack'){sfx('deal');await wait(450);}
}
async function play(action,retry=false){
 if(busy)return;soundInit();if(!ready){await refreshAccount();await syncAccount();if(!ready){notice('Előbb töltsd újra a fiókot vagy térj vissza vendégjátékra.');return;}}
 if(pending&&!retry){notice('Előbb próbáld újra az előző kör mentését.');return;}
 const input=retry?pending:{requestId:(crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('')),game:current,action,stake:current==='wheel'?undefined:current==='blackjack'&&action!=='deal'?(state.blackjack?.stake||0):Number($('stake').value),choice:current==='roulette'?{...choice}:current==='dice'?Number($('guess').value):null};
 if(retry&&input.game!==current){current=input.game;renderGame();}
 lock(true);notice('Indul a kör…');let result;
 try{
  if(owner){pending=input;keepPending();result=await api('/casino/play',input);}else{result=core.apply(guestState,input,Date.now(),rng);keepGuest();}
  await animate(result);state=result.latestState||result.state;pending=null;keepPending();updateWallet();if(current==='blackjack')renderHands();
  if(!result.finished)notice('Tét: '+fmt(result.stake)+' pont, már levonva. Összesen '+state.blackjack.total+'. Kérsz még egy lapot, vagy megállsz?');
  else if(result.game==='wheel'){notice('Napi bónusz: +'+fmt(result.reward)+' pont!',true);celebrate();}
  else {const net=result.net??result.reward,summary='Tét: '+fmt(result.stake)+' · Kifizetés: '+fmt(result.payout??result.reward)+' · '+(net>0?'Nyereség: +':net<0?'Veszteség: −':'Nettó: ')+fmt(Math.abs(net))+' pont.';notice((result.tie?'Döntetlen, a tét visszajár. ':result.bust?'Túllépted a 21-et. ':'')+summary,net>0);if(net>0)celebrate();}
  if(owner&&result.finished)board();
 }catch(e){notice(e.message);if(e.status&&e.status<500){pending=null;keepPending();}else if(owner){$('retryArea').hidden=false;}$('saveStatus').textContent=owner?'A fiókhoz mentés még nincs visszaigazolva':'Helyi mentés';}
 finally{lock(false);if((account.user?.id||null)!==owner)syncAccount();if(current==='wheel'&&state.daily===new Date().toISOString().slice(0,10)&&!pending){$('play').disabled=true;$('play').textContent='✓ Mai bónusz átvéve';}}
}
$('retry').onclick=()=>play(pending?.action,true);
document.querySelectorAll('nav [data-game]').forEach(b=>b.onclick=()=>{if(busy||pending)return;sfx('click');current=b.dataset.game;renderGame();notice(current==='wheel'?'A napi bónuszkerék ingyenes.':state.blackjack?.active&&current==='blackjack'?'A korábbi leosztásod folytatható, a tét már levonva.':'Válassz tétet és játssz! A kifizetés a téteddel arányos.');});
guestState=guest();state=core.view(guestState);updateWallet();renderGame();board();await refreshAccount();await syncAccount();
