/* Personal ZIP exporter. Only GET requests; no repository/database client or credentials. */
(() => {
  'use strict';
  const root=new URL('../',document.currentScript.src),encoder=new TextEncoder();
  const table=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
  const crc32=bytes=>{let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0};
  const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
  function zip(files){
    const parts=[],directory=[];let offset=0,centralSize=0;
    for(const [path,bytes] of files){
      const name=encoder.encode(path),crc=crc32(bytes),header=new Uint8Array(30),h=new DataView(header.buffer);
      h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint16(12,33,true);h.setUint32(14,crc,true);h.setUint32(18,bytes.length,true);h.setUint32(22,bytes.length,true);h.setUint16(26,name.length,true);
      parts.push(header,name,bytes);
      const central=new Uint8Array(46),c=new DataView(central.buffer);
      c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,33,true);c.setUint32(16,crc,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);
      directory.push(central,name);centralSize+=central.length+name.length;offset+=header.length+name.length+bytes.length;
    }
    const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.size,true);e.setUint16(10,files.size,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);
    return new Blob([...parts,...directory,end],{type:'application/zip'});
  }
  async function get(url){
    const r=await fetch(url,{method:'GET',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(60000)});
    if(!r.ok||r.type==='opaque')throw Error('โหลดไฟล์สำหรับแพ็กเกมไม่ได้ ('+r.status+') กรุณาตรวจเครือข่ายและไฟล์ที่เผยแพร่');
    return r;
  }
  async function download(adapter,input,progress=()=>{}){
    const data=adapter.validate(input),backup=JSON.stringify(data,null,2),files=new Map();let total=0;
    const add=(name,bytes)=>{
      if(!name||name.startsWith('/')||name.split('/').some(s=>s==='..')||name.includes('\\'))throw Error('เส้นทางไฟล์ไม่ถูกต้อง');
      if(files.has(name))return;
      total+=bytes.length;if(total>250*1024*1024)throw Error('เกมมีขนาดเกิน 250 MB กรุณาลดจำนวนหรือขนาดภาพ');files.set(name,bytes);
    };
    const text=(name,value)=>add(name,encoder.encode(value));
    progress('กำลังอ่านเกมต้นฉบับ • ดาวน์โหลดรูปและไฟล์ AR ประมาณ 100 MB ต้องใช้อินเทอร์เน็ตในขั้นตอนนี้');
    const manifest=await(await get(new URL('js/adapters/mini-city-package-manifest.json?v=personal-1',root))).json();
    if(manifest.version!==1||manifest.adapterId!==adapter.id)throw Error('รายการไฟล์ไม่ตรงกับเกม');
    const nativeURL=new URL('games/AR mini city/index.html',root),source=await(await get(nativeURL)).text();
    const dom=new DOMParser().parseFromString(source,'text/html');
    // Change only script element URLs in the exported copy; native inline game code is untouched.
    for(const script of dom.querySelectorAll('script[src]')){
      const url=new URL(script.getAttribute('src'),nativeURL);
      if(url.origin===root.origin)continue;
      if(url.pathname.endsWith('/hands/hands.js'))script.setAttribute('src','../../vendor/mediapipe/hands/hands.js');
      else if(url.pathname.endsWith('/camera_utils/camera_utils.js'))script.setAttribute('src','../../vendor/mediapipe/camera_utils.js');
      else throw Error('เกมมี script ภายนอกที่ยังไม่รองรับการแพ็ก');
    }
    const bootstrap=dom.createElement('script');bootstrap.setAttribute('src','../../personal-game-data.js');dom.head.prepend(bootstrap);dom.title=data.meta.title;
    text('games/AR mini city/index.html','<!DOCTYPE html>\n'+dom.documentElement.outerHTML);
    const local=['js/game-adapters.js','js/adapters/mini-city-runtime.js','css/mini-city-editor-play.css','images/editor-image-placeholder.svg',...manifest.nativeAssets];
    let done=0;const jobs=[...new Set(local)].map(name=>({path:name,url:new URL(name,root).href})).concat(manifest.mediaPipe);
    let next=0,failed=false;
    async function worker(){while(!failed&&next<jobs.length){try{const job=jobs[next++],response=await get(job.url),bytes=new Uint8Array(await response.arrayBuffer());if(job.size!==undefined&&job.size!==bytes.length)throw Error('ไฟล์ AR ดาวน์โหลดไม่ครบ: '+job.path);add(job.path,bytes);progress('กำลังเก็บไฟล์ '+(++done)+'/'+jobs.length+' • '+(total/1024/1024).toFixed(1)+' MB')}catch(error){failed=true;throw error}}}
    const workers=await Promise.allSettled(Array.from({length:4},worker));
    const failure=workers.find(result=>result.status==='rejected');if(failure)throw failure.reason;
    const cache=new Map();let imageIndex=0;
    async function collectImage(value){
      if(!value)return '';
      const url=adapter.resolveImage(value),u=new URL(url);
      if(u.origin===root.origin&&u.pathname.startsWith(root.pathname)){
        const nativePath=decodeURIComponent(u.pathname.slice(root.pathname.length));if(files.has(nativePath))return nativePath;
      }
      if(cache.has(url))return cache.get(url);
      let response;try{response=await get(url)}catch{throw Error('เก็บรูปส่วนตัวไม่สำเร็จ อาจติด CORS/สิทธิ์หรือเครือข่าย กรุณาอัปโหลดรูปลงใน Editor แล้วดาวน์โหลดใหม่')}
      const type=(response.headers.get('content-type')||'').split(';')[0],ext=({'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'})[type];
      if(!ext)throw Error('รูปส่วนตัวต้องเป็น PNG/JPEG/WebP/GIF ที่ดาวน์โหลดได้ครบ กรุณาอัปโหลดแทน URL นี้');
      const name='games/AR mini city/assets/personal/image-'+String(++imageIndex).padStart(4,'0')+'.'+ext;
      add(name,new Uint8Array(await response.arrayBuffer()));cache.set(url,name);return name;
    }
    data.meta.cover=await collectImage(data.meta.cover);
    for(const q of data.questions){q.image=await collectImage(q.image);for(const o of q.options)o.image=await collectImage(o.image)}
    const id=crypto.randomUUID();
    text('personal-game-data.js','window.MiniCityPersonalGame='+JSON.stringify({version:1,id,data}).replaceAll('<','\\u003c')+';\n');
    text('my-game.json',backup);
    const page=dom.implementation.createHTMLDocument(data.meta.title);page.documentElement.lang='th';page.head.append(Object.assign(page.createElement('meta'),{name:'viewport',content:'width=device-width, initial-scale=1'}));
    const heading=page.createElement('h1');heading.textContent=data.meta.title;
    const note=page.createElement('p');note.textContent='เกมส่วนตัวของคุณ • เล่นด้วยคลิก/แตะได้หลังแตก ZIP ครบทุกไฟล์ • กล้อง/Hand Tracking แนะนำเปิดผ่าน localhost หรือ HTTPS และอนุญาตกล้อง';
    const link=page.createElement('a');link.href='games/AR%20mini%20city/index.html';link.textContent='▶ เปิดเกมของฉัน';link.style.cssText='display:inline-block;background:#6940d9;color:white;padding:18px 30px;border-radius:14px;text-decoration:none;font-size:24px';
    page.body.style.cssText='font-family:Tahoma,sans-serif;max-width:760px;margin:50px auto;padding:24px;color:#28164c;line-height:1.8';page.body.append(heading,note,link);
    text('index.html','<!DOCTYPE html>\n'+page.documentElement.outerHTML);
    text('README-TH.txt',`เกมส่วนตัว: ${input.meta.title}\n\n1. แตก ZIP ทั้งหมดก่อน เปิด index.html แล้วกดเปิดเกม\n2. คลิก/แตะ ภารกิจ คะแนน เสียงและภาพใช้ไฟล์ที่รวมมา ไม่ต้องเชื่อม GitHub หรือ Firebase\n3. รวม MediaPipe Hands 0.4.1675469240 และโมเดล/WASM แล้ว หากต้องการกล้อง/Hand Tracking ให้เปิดโฟลเดอร์นี้ผ่าน localhost หรือ HTTPS และอนุญาตกล้อง การเปิด file:// อาจเล่นคลิกได้แต่ browser บล็อกโหลดโมเดล AR\n4. ถ้ามี Python: เปิด terminal ในโฟลเดอร์นี้ รัน python -m http.server 8000 แล้วเปิด http://localhost:8000/ (หลังติดตั้ง Python แล้วไม่ต้องใช้อินเทอร์เน็ต)\n5. อุปกรณ์ต้องรองรับกล้อง/WebGL/WASM เสียงพูดภาษาไทยขึ้นกับเสียงที่ติดตั้งในเครื่อง การอนุญาตกล้องต้องได้รับจากผู้ใช้\n6. my-game.json คือสำรองข้อมูลสำหรับนำเข้า Editor บนเว็บเพื่อแก้ต่อ personal-game-data.js เป็นข้อมูลสำหรับเล่นแพ็กนี้\n7. ไม่ส่งการบันทึกหรือคะแนนกลับไปยัง GitHub/Firestore ฉบับนี้แยกจากต้นฉบับและผู้ใช้อื่น\n8. ควรเก็บไฟล์นี้เป็นการใช้ส่วนตัวตามสิทธิ์ของสื่อ/เกมต้นฉบับ และคงไฟล์ license ของ MediaPipe ที่รวมมา\n`);
    const contents=[];for(const [name,bytes] of files)contents.push({path:name,size:bytes.length,sha256:await digest(bytes)});
    text('PACKAGE-MANIFEST.json',JSON.stringify({version:1,adapterId:adapter.id,id,mediaPipeVersion:'0.4.1675469240',files:contents},null,2));
    progress('กำลังสร้าง ZIP • '+(total/1024/1024).toFixed(1)+' MB');
    await new Promise(resolve=>setTimeout(resolve,0));
    const blob=zip(files),href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download='my-mini-city-game.zip';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
  }
  window.PersonalGameDownload={download};
})();
