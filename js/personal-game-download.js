/* Personal ZIP exporter. Only GET requests; no repository/database client or credentials. */
(() => {
  'use strict';
  const root=new URL('../',document.currentScript.src),encoder=new TextEncoder();
  const table=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
  const crc32=bytes=>{let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0};
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
    async function get(url,signal){
    const requestSignal=signal?AbortSignal.any([signal,AbortSignal.timeout(60000)]):AbortSignal.timeout(60000);
    let response;try{response=await fetch(url,{method:'GET',credentials:'omit',referrerPolicy:'no-referrer',signal:requestSignal})}
    catch(error){if(signal?.aborted)throw signal.reason;throw Error('โหลดไฟล์สำหรับแพ็กเกมไม่ได้: '+decodeURIComponent(new URL(url,root).pathname)+' • ตรวจอินเทอร์เน็ตและ CORS แล้วลองใหม่')}
    if(!response.ok||response.type==='opaque')throw Error('โหลดไฟล์ไม่สำเร็จ ('+response.status+'): '+decodeURIComponent(new URL(url,root).pathname));
    return response;
  }
  const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
  function safeName(value){
    let result='';for(const char of value.normalize('NFKC').trim()){const part=char.charCodeAt(0)<32||'<>:"/\\|?*'.includes(char)?'-':char;if(encoder.encode(result+part).length>180)break;result+=part}
    result=result.replace(/[. ]+$/g,'')||'my-ar-game';if(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(result))result='game-'+result;return result;
  }
  async function verifyZip(blob,files,signal){
    const bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer);let position=0,count=0;
    if(view.getUint32(bytes.length-22,true)!==0x06054b50||view.getUint16(bytes.length-12,true)!==files.size)throw Error('ตรวจโครงสร้าง ZIP ไม่ผ่าน');
    for(const [name,data] of files){
      signal?.throwIfAborted();if(view.getUint32(position,true)!==0x04034b50)throw Error('ZIP มีส่วนหัวไม่ถูกต้อง');
      const length=view.getUint16(position+26,true),extra=view.getUint16(position+28,true),size=view.getUint32(position+18,true),start=position+30+length+extra;
      if(new TextDecoder().decode(bytes.subarray(position+30,position+30+length))!==name||size!==data.length||crc32(bytes.subarray(start,start+size))!==view.getUint32(position+14,true))throw Error('ตรวจไฟล์ใน ZIP ไม่ผ่าน: '+name);
      position=start+size;if(++count%3===0)await pause();
    }
    if(view.getUint32(position,true)!==0x02014b50)throw Error('ZIP ไม่มีสารบัญไฟล์');
  }
  async function archive(files,title,{signal}={}){
    let size=0;for(const [path,bytes]of files){if(path.startsWith('/')||path.includes('\\')||path.split('/').includes('..'))throw Error('เส้นทาง ZIP ไม่ปลอดภัย');size+=bytes.length;if(size>250*1024*1024)throw Error('ไฟล์เกมรวมเกิน 250 MB')}
    const folder=safeName(title),namedFiles=new Map([...files].map(([path,bytes])=>[folder+'/'+path,bytes])),blob=zip(namedFiles);await verifyZip(blob,namedFiles,signal);signal?.throwIfAborted();const href=URL.createObjectURL(blob),link=document.createElement('a');link.href=href;link.download=folder+'.zip';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
  }
  async function download(adapter,input,progress=()=>{},{signal}={}){
    if(adapter.kind==='native'){await import(new URL('js/shared-game-package.js?v=shared-19',root).href);return SharedNativeGames.download(adapter,input,progress,{signal,archive})}
    const data=adapter.validate(input),files=new Map(),sources=new Map();let total=0;
    const add=(name,bytes)=>{if(files.has(name))return;if(name.startsWith('/')||name.includes('\\')||name.split('/').includes('..'))throw Error('เส้นทางไฟล์ไม่ถูกต้อง');total+=bytes.length;if(total>250*1024*1024)throw Error('เกมมีขนาดเกิน 250 MB');files.set(name,bytes)};
    const text=(name,value)=>add(name,encoder.encode(value));
    const readText=async path=>await(await get(new URL(path,root),signal)).text();
    progress('กำลังอ่านเกมต้นฉบับและรวมโค้ด • ต้องใช้อินเทอร์เน็ตระหว่างแพ็กไฟล์ AR');
    const manifest=JSON.parse(await readText('js/adapters/mini-city-package-manifest.json?v=editor-20261016-9'));
    if(manifest.version!==1||manifest.adapterId!==adapter.id)throw Error('รายการไฟล์ไม่ตรงกับเกม');
    const source=await readText('games/AR mini city/index.html'),dom=new DOMParser().parseFromString(source,'text/html');
    const jobs=manifest.nativeAssets.map(path=>({path,url:new URL(path,root).href})).concat(manifest.mediaPipe),resources=new Map();let next=0,done=0,failed=false;
    async function worker(){while(!failed&&next<jobs.length){signal?.throwIfAborted();const job=jobs[next++];try{const response=await get(job.url,signal),bytes=new Uint8Array(await response.arrayBuffer());if(job.size!==undefined&&bytes.length!==job.size)throw Error('ไฟล์ AR ไม่ครบ: '+job.path);resources.set(job.path,bytes);progress('กำลังเก็บไฟล์ '+(++done)+'/'+jobs.length);await pause()}catch(error){failed=true;throw error}}}
    const results=await Promise.allSettled(Array.from({length:4},worker)),failure=results.find(result=>result.status==='rejected');if(failure)throw failure.reason;
    for(const path of manifest.nativeAssets){const relative=path.slice('games/AR mini city/'.length),name='images/'+relative;add(name,resources.get(path));sources.set(new URL(path,root).href,name)}
    const inlineVendors=new Map();let license='';
    for(const item of manifest.mediaPipe){const bytes=resources.get(item.path);if(item.path.endsWith('/hands.js')||item.path.endsWith('/camera_utils.js'))inlineVendors.set(item.path.split('/').pop(),new TextDecoder().decode(bytes));else if(item.path.endsWith('/LICENSE'))license=new TextDecoder().decode(bytes);else add('ar/'+item.path.split('/').pop(),bytes)}
    let imageIndex=0;
    async function collectImage(value){
      if(!value)return '';
      const url=adapter.resolveImage(value);if(sources.has(url))return sources.get(url);
      const response=await get(url,signal),type=(response.headers.get('content-type')||'').split(';')[0],extension=({'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'})[type];if(!extension)throw Error('รูปส่วนตัวต้องเป็น JPG/PNG/WebP ที่อ่านได้');
      const bytes=new Uint8Array(await response.arrayBuffer()),name='images/personal-'+(++imageIndex)+'.'+extension;add(name,bytes);sources.set(url,name);return name;
    }
    data.meta.cover=await collectImage(data.meta.cover);
    for(const key of ['mapBackground','serviceMapBackground','backpackImage'])data.presentation[key]=await collectImage(data.presentation[key]);
    for(const stage of Object.values(data.presentation.stages))stage.background=await collectImage(stage.background);
    for(const q of data.questions){q.image=await collectImage(q.image);for(const o of q.options)o.image=await collectImage(o.image)}
    const nativeURL=new URL('games/AR mini city/index.html',root),localScripts={'/js/game-adapters.js':'js/game-adapters.js','/js/adapters/mini-city-runtime.js':'js/adapters/mini-city-runtime.js'};
    // Inline only explicitly identified script elements; native game source remains unchanged.
    for(const script of dom.querySelectorAll('script[src]')){
      const url=new URL(script.getAttribute('src'),nativeURL);let code=url.hostname==='cdn.jsdelivr.net'?inlineVendors.get(url.pathname.split('/').pop()):undefined;
      if(code===undefined){const path=Object.entries(localScripts).find(([suffix])=>url.origin===root.origin&&url.pathname.endsWith(suffix))?.[1];if(!path)throw Error('ยังรวม script นี้ไม่ได้: '+url.pathname);code=await readText(path)}
      script.removeAttribute('src');script.textContent=code.replace(/<\/script/gi,'<\\/script');
    }
    if(dom.querySelector('link[rel=stylesheet]'))throw Error('เกมมี stylesheet ภายนอกที่ยังไม่มีตัวรวมไฟล์');
    const charset=dom.head.querySelector('meta[charset]')||dom.createElement('meta');charset.setAttribute('charset','UTF-8');
    const base=dom.createElement('base');base.href='images/';dom.head.prepend(charset,base);
    const bootstrap=dom.createElement('script');bootstrap.textContent='window.MiniCityPersonalGame='+JSON.stringify({version:2,id:crypto.randomUUID(),data}).split('<').join(String.fromCharCode(92)+'u003c')+';';dom.head.insertBefore(bootstrap,base.nextSibling);
    const css=dom.createElement('style');css.textContent=await readText('css/mini-city-editor-play.css');dom.head.append(css);dom.title=data.meta.title;
    const help=dom.createElement('dialog');help.id='packageHelp';help.style.cssText='max-width:min(720px,90vw);max-height:80dvh;overflow:auto;padding:24px;border:1px solid #d7c8ed;border-radius:20px;font:16px/1.7 Tahoma,sans-serif';
    const heading=dom.createElement('h2');heading.textContent='วิธีใช้เกมของฉัน';const note=dom.createElement('p');note.textContent='แตก ZIP ทั้งหมดแล้วเปิด index.html • คลิก/แตะเพื่อเล่นได้ กล้องและ Hand Tracking แนะนำ localhost หรือ HTTPS พร้อมอนุญาตกล้อง และอุปกรณ์ที่รองรับ WebGL/WASM การเปิด file:// อาจถูกบล็อกโมเดล AR เสียงพูดไทยขึ้นกับเสียงในเครื่อง';
    const guide=dom.createElement('p');guide.textContent='บนคอมพิวเตอร์ที่มี Python: เปิด Terminal ในโฟลเดอร์เกม รัน python -m http.server 8000 แล้วเปิด http://localhost:8000/ • หากต้องการใช้งานผ่าน HTTPS ให้อัปโหลด index.html และโฟลเดอร์ images กับ ar ทั้งหมดไปยังโฮสต์แบบ static ที่รองรับ HTTPS เช่น GitHub Pages และเปิดจากลิงก์ HTTPS ห้ามย้ายเพียงไฟล์ index.html';
    const licenseDetails=dom.createElement('details'),summary=dom.createElement('summary'),pre=dom.createElement('pre');summary.textContent='สิทธิ์การใช้งาน MediaPipe';pre.textContent=license;pre.style.whiteSpace='pre-wrap';licenseDetails.append(summary,pre);
    const close=dom.createElement('form');close.method='dialog';const closeButton=dom.createElement('button');closeButton.textContent='กลับไปเล่นเกม';close.append(closeButton);help.append(heading,note,guide,licenseDetails,close);dom.body.append(help);
    const links=dom.createElement('script');links.textContent="document.addEventListener('DOMContentLoaded',()=>{const b=document.createElement('button');b.textContent='วิธีเปิดเกม / กล้อง';b.style.cssText='position:absolute;bottom:18%;left:50%;transform:translateX(-50%);z-index:20;border:0;border-radius:16px;padding:8px 14px;background:white;color:#4c3286';b.onclick=()=>document.getElementById('packageHelp').showModal();document.getElementById('coverScreen').append(b)})";dom.body.append(links);
    // Static assets keep their native asset paths under images/ through the document base.
    text('index.html','<!DOCTYPE html>\n'+dom.documentElement.outerHTML);
    resources.clear();inlineVendors.clear();signal?.throwIfAborted();progress('กำลังสร้างและตรวจ ZIP • '+(total/1024/1024).toFixed(1)+' MB');await pause();
    await archive(files,data.meta.title,{signal});
  }
  window.PersonalGameDownload={download};
})();
