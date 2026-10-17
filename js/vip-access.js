/* Existing VIP flag only: UI gating, not server-side authentication. */
(()=>{'use strict';const home=new URL('../index.html',document.currentScript.src).href;
 const allowed=()=>{try{return localStorage.getItem('vip_ok')==='1'}catch{return false}};
 const requireAccess=()=>{if(allowed())return true;location.replace(home);return false};
 window.VipAccess=Object.freeze({allowed,require:requireAccess});
 addEventListener('storage',e=>{if((e.key==='vip_ok'||e.key===null)&&!allowed())location.replace(home)});
 addEventListener('pageshow',e=>{if(e.persisted&&!allowed())location.replace(home)});
})();
