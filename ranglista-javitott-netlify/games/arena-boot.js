const errorBox=document.getElementById('startupError');
function failed(){document.getElementById('startupMessage').textContent='A 3D-s játék indítása nem sikerült. Ellenőrizd, hogy a böngészőben engedélyezve van-e a WebGL és a hardveres gyorsítás, majd próbáld újra.';errorBox.classList.remove('hidden');}
document.getElementById('retryStartup').onclick=()=>location.reload();
import('./arena-clash.js').catch(failed);
