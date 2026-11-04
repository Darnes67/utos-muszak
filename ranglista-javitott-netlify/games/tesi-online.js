import {account,api,openAccount} from '../webtar-account.js';
const panel=document.createElement('section');panel.className='tesi-ranking';panel.innerHTML=`<div class="section-title"><h2>Osztályok ranglistája</h2><button id="tesiRefresh">Frissítés ↻</button></div><p id="tesiOnlineStatus" role="status">Vendégjáték · a helyi mentésed ebben a böngészőben marad.</p><div class="tesi-online-actions"><button id="tesiJoin">Ranglistás játék indítása</button><button id="tesiLeave" hidden>Vissza a helyi játékhoz</button></div><p class="tesi-ranking-note">A ranglistás játék külön, fiókhoz mentett osztály. A régi helyi mentésed megmarad; a helyben szerzett pontok nem kerülnek a hitelesített ranglistába. A teljes eddig gyűjtött coin számít, a vásárlás nem csökkenti a rekordot.</p><label>Rendezés <select id="tesiSort"><option value="earned">Összes coin</option><option value="schoolYears">Lezárt tanévek</option><option value="reps">Fekvőtámaszok</option><option value="medals">Érmek</option></select></label><div class="tesi-table-wrap"><table><thead><tr><th>#</th><th>Játékos</th><th>Összes coin</th><th>Tanév</th><th>Fekvő</th><th>Érem</th></tr></thead><tbody id="tesiRows"></tbody></table></div><p id="tesiBoardStatus" role="status"></p>`;
document.querySelector('.play-column').append(panel);
const style=document.createElement('style');style.textContent='.tesi-ranking{margin-top:24px;padding:22px;border:1px solid #bcd8cb35;background:#163b39;border-radius:22px;color:#f0f4d9}.tesi-ranking h2{margin:0;font-size:24px}.tesi-ranking-note{font-size:13px;color:#bbcdbd;line-height:1.6}.tesi-online-actions{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}.tesi-ranking button,.tesi-ranking select{padding:10px 14px;border-radius:10px;border:1px solid #d2e9b749;background:#264b42;color:#effbcf;cursor:pointer}.tesi-ranking button:disabled{opacity:.5;cursor:wait}.tesi-table-wrap{overflow:auto;margin-top:15px}.tesi-ranking table{width:100%;border-collapse:collapse;font-size:13px;white-space:nowrap}.tesi-ranking th,.tesi-ranking td{padding:12px 9px;text-align:right;border-bottom:1px solid #d8e8c51c}.tesi-ranking th:nth-child(2),.tesi-ranking td:nth-child(2){text-align:left}.tesi-ranking tr.is-me{background:#e5ff7a18;color:#e5ff7a}.tesi-ranking #tesiJoin{background:#dfff89;color:#183d32;font-weight:800}';document.head.append(style);
const $=id=>document.getElementById(id),fmt=n=>Number(n||0).toLocaleString('hu-HU',{maximumFractionDigits:0});
let active=false,userId=null,epoch=0,revision=0,queue=[],pending=null,inflight=null,lastSync=0,joining=false,joiningUserId=null;
function message(s){$('tesiOnlineStatus').textContent=s;}
function controls(){ $('tesiJoin').hidden=active;$('tesiLeave').hidden=!active;$('tesiJoin').disabled=joining; }
function remember(){if(!userId)return;try{localStorage.setItem('banki_tesi_outbox_'+userId,JSON.stringify({pending,queue}));}catch{}}
function adopt(d){revision=d.revision;window.TesiGame.applyState(d.state,{boostSeconds:d.boostSeconds,challenge:d.challenge});}
async function board(){const button=$('tesiRefresh');button.disabled=true;try{const d=await api('/tesi/leaderboard?sort='+encodeURIComponent($('tesiSort').value),undefined,{publicOnly:true});const body=$('tesiRows');body.replaceChildren();for(const row of d.rows){const tr=document.createElement('tr');tr.classList.toggle('is-me',row.user_id===account.user?.id);for(const value of [row.place,row.username,fmt(row.earned),fmt(row.schoolYears),fmt(row.reps),fmt(row.medals)]){const td=document.createElement('td');td.textContent=value;tr.append(td);}body.append(tr);}$('tesiBoardStatus').textContent=d.rows.length?'Az eredmények az utolsó sikeres mentést mutatják.':'Még nincs ranglistás osztály. Indítsd el az elsőt!';}catch(e){$('tesiBoardStatus').textContent=e.message;}finally{button.disabled=false;}}
function stop(){epoch++;active=false;joining=false;joiningUserId=null;remember();userId=null;queue=[];pending=null;window.TesiGame.setOnline(false);controls();message('Vendégjáték · a korábbi helyi mentésedet folytatod.');}
async function flush(){
 if(!active||joining)return;if(inflight)return inflight;
 const currentEpoch=epoch,currentUser=userId;
 if(account.user?.id!==currentUser){stop();return;}
 if(!pending){pending={requestId:crypto.randomUUID(),revision,actions:queue.splice(0,32)};remember();}
 const payload=pending;
 inflight=(async()=>{try{const d=await api('/tesi/action',payload);if(epoch!==currentEpoch||userId!==currentUser)return;pending=null;adopt(d);remember();lastSync=Date.now();message('✓ '+account.user.username+' · fiókhoz mentve · '+fmt(d.state.schoolYears)+' lezárt tanév');}
 catch(e){if(epoch!==currentEpoch)return;message('Mentésre vár: '+e.message+' A következő próbálkozás ugyanazt a naplót küldi.');if(e.status===409){pending=null;queue=[];remember();const d=await api('/tesi/state');if(epoch===currentEpoch){adopt(d);message('A másik ablak frissebb mentését betöltöttük. Folytathatod az edzést.');}}throw e;}
 finally{inflight=null;}})();return inflight;
}
async function join(){if(joining||active)return;if(!account.user){openAccount();return;}joining=true;joiningUserId=account.user.id;controls();const currentEpoch=++epoch,currentUser=joiningUserId;message('A ranglistás osztály betöltése…');try{const d=await api('/tesi/state');if(currentEpoch!==epoch||account.user?.id!==currentUser)return;userId=currentUser;revision=d.revision;queue=[];pending=null;
 try{const saved=JSON.parse(localStorage.getItem('banki_tesi_outbox_'+userId));if(saved?.pending&&Array.isArray(saved?.queue)){pending=saved.pending;queue=saved.queue;}}catch{}
 active=true;window.TesiGame.setOnline(true);adopt(d);message('Ranglistás játék · a szerver ellenőrzi és menti az eredményeket.');
 }catch(e){message(e.message);}finally{if(currentEpoch===epoch){joining=false;joiningUserId=null;}controls();}if(active){try{await flush();await board();}catch{}}}
function action(type,data={}){if(!active)return false;if(account.user?.id!==userId){stop();return false;}
 if(queue.length>=32){message('A mentés várakozik. Várd meg a kapcsolódást!');return true;}
 if(type==='train'){window.TesiGame.playTrainingAnimation();const tail=queue.at(-1);if(tail?.type==='train'&&tail.count<40)tail.count++;else queue.push({type:'train',count:1});}
 else if(type==='buy')queue.push({type,key:data.key,max:!!data.max});
 else if(['daily','prestige','challenge'].includes(type))queue.push({type});else return true;
 remember();if(type!=='train')flush().catch(()=>{});return true;
}
window.TesiOnline={get active(){return active;},action};
$('tesiJoin').onclick=join;$('tesiLeave').onclick=async()=>{try{await flush();if(queue.length)await flush();stop();board();}catch{message('A mentés még nem sikerült. Kapcsolódás után próbáld újra; a napló helyben megmaradt.');}};$('tesiRefresh').onclick=board;$('tesiSort').onchange=board;
window.addEventListener('webtar-account',()=>{if((active||joining)&&account.user?.id!==(joining?joiningUserId:userId)){stop();}controls();});
window.addEventListener('message',async e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='webtar:prepare-account')return;try{await flush();if(queue.length)await flush();parent.postMessage({type:'webtar:account-prepared',id:e.data.id},location.origin);}catch(error){parent.postMessage({type:'webtar:account-prepared',id:e.data.id,error:error.message},location.origin);}});
setInterval(()=>{if(active&&!document.hidden&&(queue.length||pending||Date.now()-lastSync>15000))flush().catch(()=>{});},5000);
document.addEventListener('visibilitychange',()=>{if(active&&!document.hidden)flush().catch(()=>{});});window.addEventListener('pagehide',remember);board();
