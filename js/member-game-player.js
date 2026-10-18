(async()=>{'use strict';await window.VipAccess.ready;
if(!await window.VipAccess.authorize()){location.replace('index.html');return;}
const q=new URLSearchParams(location.search),root=new URL('../',document.currentScript?.src||new URL('js/member-game-player.js',location.href));
const target=new URL(q.get('url')||'',location.href),prefix=new URL('games/',root).pathname;
if(target.origin!==location.origin||!target.pathname.startsWith(prefix)||!target.pathname.endsWith('/index.html')||decodeURIComponent(target.pathname).split('/').includes('..')){document.querySelector('#lock p').textContent='ลิงก์เกมไม่ถูกต้อง กรุณาเปิดจากรายการเกม';return;}
document.getElementById('title').textContent=q.get('title')||'เกม';document.getElementById('lock').style.display='none';document.getElementById('player').style.display='block';document.getElementById('frame').src=target.href;
addEventListener('vip-access-change',event=>{if(!event.detail.allowed&&event.detail.wasAllowed){document.getElementById('frame').src='about:blank';location.replace('index.html');}});
})();
