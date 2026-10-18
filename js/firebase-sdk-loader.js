/* Shared SDK loader; no Analytics or duplicate listeners. */
(()=>{'use strict';const pending=new Map();window.loadFirebaseProduct=function(product){
if(!['app','auth','firestore'].includes(product))return Promise.reject(Error('Unsupported SDK'));
if(pending.has(product))return pending.get(product);
const task=(async()=>{if(product!=='app')await window.loadFirebaseProduct('app');await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://www.gstatic.com/firebasejs/13.0.0/firebase-'+product+'-compat.js';script.onload=resolve;script.onerror=()=>reject(Error('โหลด Firebase SDK ไม่สำเร็จ'));document.head.append(script);});})();pending.set(product,task);return task;};})();
