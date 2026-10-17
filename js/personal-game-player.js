/* Read the original page and replay its unchanged native script with fresh adapter URLs. */
(async()=>{
  'use strict';
  try{
    if(!window.VipAccess?.allowed())throw Error('กรุณาเข้าสู่ระบบ VIP ก่อนทดลองเล่น');
    const token=new URLSearchParams(location.search).get('preview');
    if(!token||parent===window)throw Error('กรุณาเปิดทดลองเล่นจากหน้าปรับแต่งเกม ข้อมูลทดลองเล่นไม่เก็บไว้ในลิงก์');
    const data=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{window.removeEventListener('message',receive);reject(Error('ไม่ได้รับข้อมูลทดลองเล่น กรุณากลับไปลองใหม่'))},10000);
      function receive(event){if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='mini-city-data'||event.data.token!==token)return;clearTimeout(timer);window.removeEventListener('message',receive);resolve(event.data.data)}
      window.addEventListener('message',receive);parent.postMessage({type:'mini-city-request',token},location.origin);
    });
    window.MiniCityPreviewGame={id:token,data};

    const sourceURL=new URL('games/AR mini city/index.html',location.href);
    const response=await fetch(sourceURL,{method:'GET',cache:'no-store',credentials:'omit'});
    if(!response.ok)throw Error('อ่านไฟล์เกมต้นฉบับไม่สำเร็จ');
    const source=await response.text(),copy=new DOMParser().parseFromString(source,'text/html');
    const base=copy.createElement('base');base.href=sourceURL.href;copy.head.prepend(base);
    let registry=false,runtime=false;
    for(const script of copy.querySelectorAll('script[src]')){
      const url=new URL(script.getAttribute('src'),sourceURL);
      if(url.origin!==sourceURL.origin)continue;
      if(url.pathname.endsWith('/js/game-adapters.js')){url.search='?v=editor-20261016-12';script.src=url.href;registry=true}
      if(url.pathname.endsWith('/js/adapters/mini-city-runtime.js')){url.search='?v=editor-20261016-12';script.src=url.href;runtime=true}
    }
    if(!registry||!runtime)throw Error('เกมต้นฉบับรุ่นนี้ยังไม่มีจุดเชื่อม Mini City Adapter');
    // User data stays in parent/child memory only. No HTML substitution of questions or game logic.
    document.open();document.write('<!DOCTYPE html>\n'+copy.documentElement.outerHTML);document.close();
  }catch(error){const target=document.getElementById('previewStatus');if(target)target.textContent='เปิดเกมไม่ได้: '+error.message}
})();
