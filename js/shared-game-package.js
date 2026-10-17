/* On-demand packaging shared by all native adapters. No work runs before Download. */
(() => {
 'use strict';
 const {root,get,compose,shell,clone}=SharedNativeGames,encoder=new TextEncoder();
 const digest=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)))].slice(0,10).map(n=>n.toString(16).padStart(2,'0')).join('');
 const metadata=new Map();
 async function packageInfo(name,version,signal){const key=name+'@'+version;if(metadata.has(key))return metadata.get(key);let url='https://data.jsdelivr.com/v1/package/npm/'+name+'@'+version+'/flat';const list=await(await get(url,signal)).json();if(!Array.isArray(list.files))throw Error('อ่านรายการไฟล์ AR ไม่สำเร็จ: '+name);metadata.set(key,list.files);return list.files}
 async function dependencies(bundle,signal){
  const jobs=new Map(),resourceURLs={},arFiles={},vendors=new Map(),urls=new Set(bundle.scripts.flatMap(s=>(s.network||[]).map(n=>bundle.libraryAliases?.[n.url]||n.url)));const html=await(await get(new URL('games/'+encodeURIComponent(bundle.folder)+'/index.html',root),signal)).text();for(const m of html.matchAll(/<script\b[^>]*src=["']([^"']+)["']/g))if(/^https?:/.test(m[1]))urls.add(m[1]);
  const add=(url,path)=>{jobs.set(path,{url,path});resourceURLs[url]=path;return path};
  if(html.includes('@mediapipe/hands')||[...urls].some(u=>u.includes('@mediapipe/hands'))){const manifest=await(await get(new URL('js/adapters/ar-legacy-manifest.json?v=shared-17',root),signal)).json();for(const job of manifest){const name=job.path.split('/').at(-1);if(name==='LICENSE')add(job.url,'ar/LICENSE-mediapipe.txt');else{add(job.url,'ar/'+name);arFiles[name]='ar/'+name}}}
  for(const [needed,name,version]of [[bundle.uses.face,'@mediapipe/face_detection','0.4.1657300184'],[bundle.uses.segmentation,'@mediapipe/selfie_segmentation','0.1.1675465747']])if(needed){for(const f of await packageInfo(name,version,signal)){if(!/\.(js|wasm|data|binarypb|tflite)$|LICENSE/i.test(f.name)||/\.map$/.test(f.name))continue;const basename=f.name.split('/').at(-1),path='ar/'+basename,url='https://cdn.jsdelivr.net/npm/'+name+'@'+version+f.name;add(url,path);arFiles[basename]=path}}
  for(const url of urls){
   if(/cdn\.tailwindcss\.com/.test(url)||/\/(?:hands|camera_utils|drawing_utils|control_utils|face_detection|selfie_segmentation)\.js(?:\?|$)/.test(url)){const name=new URL(url).pathname.split('/').at(-1)||'tailwind.js';const path=resourceURLs[url]||'ar/'+(url.includes('tailwindcss')?'tailwind.js':name);add(url,path)}
   if(/\.(?:task|tflite)(?:\?|$)/.test(url))add(url,'ar/models/'+await digest(url)+'.'+new URL(url).pathname.split('.').at(-1));
  }
  // FilesetResolver receives a folder, dynamic import receives its original module URL.
  const visionFolders=[...urls].filter(u=>u.includes('@mediapipe/tasks-vision')&&(/\/wasm\/?$/.test(u)||/vision_bundle\.(mjs|js)$/.test(u)));
  const bases=new Set(visionFolders.map(u=>u.replace(/\/(wasm\/?|vision_bundle\.(mjs|js))$/,'')));
  for(const base of bases){const prefix='ar/vision-'+await digest(base);for(const name of ['vision_bundle.mjs','wasm/vision_wasm_internal.js','wasm/vision_wasm_internal.wasm','wasm/vision_wasm_nosimd_internal.js','wasm/vision_wasm_nosimd_internal.wasm'])add(base+'/'+name,prefix+'/'+name);resourceURLs[base+'/wasm']=prefix+'/wasm';resourceURLs[base+'/wasm/']=prefix+'/wasm/'}
  return {jobs:[...jobs.values()],resourceURLs,arFiles,vendors,urls};
 }
 async function inlineStyles(dom,files,signal){
  async function css(text,relative){const patches=[];for(const m of text.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/g)){if(!m[2]||m[2].startsWith('data:')||m[2].startsWith('#'))continue;const url=new URL(m[2],relative);if(!/^https?:/.test(url.protocol))continue;const extension=url.pathname.match(/\.([a-z0-9]+)$/i)?.[1]||'bin',path='fonts/'+await digest(url.href)+'.'+extension;if(!files.has('images/'+path))files.set('images/'+path,new Uint8Array(await(await get(url,signal)).arrayBuffer()));patches.push({start:m.index,end:m.index+m[0].length,value:'url("'+path+'")'})}for(const p of patches.reverse())text=text.slice(0,p.start)+p.value+text.slice(p.end);return text}
  for(const link of [...dom.querySelectorAll('link[rel=stylesheet][href]')]){const url=new URL(link.getAttribute('href'));const style=dom.createElement('style');style.textContent=await css(await(await get(url,signal)).text(),url);link.replaceWith(style)}
  for(const style of dom.querySelectorAll('style')){const imports=[...style.textContent.matchAll(/@import\s+url\(\s*(["']?)(https?:.*?)\1\s*\)\s*;/g)];let text=style.textContent;for(const m of imports){const url=new URL(m[2]);text=text.replace(m[0],await css(await(await get(url,signal)).text(),url))}style.textContent=text}
 }
 async function download(adapter,input,progress,{signal,archive}){
  const data=adapter.validate(input),bundle=adapter.bundle,files=new Map(),sources=new Map(),nativeBase=new URL('games/'+encodeURIComponent(bundle.folder)+'/',root);
  progress('กำลังอ่านทรัพยากรของ '+bundle.title+' เท่านั้น…');
  const deps=await dependencies(bundle,signal),tasks=[...bundle.resources.map(f=>({url:new URL(f.path,nativeBase).href,path:'images/'+f.path})),...deps.jobs];let next=0,completed=0,failed=false;
  async function worker(){while(!failed&&next<tasks.length){signal?.throwIfAborted();const job=tasks[next++];try{const response=await get(job.url,signal),bytes=new Uint8Array(await response.arrayBuffer());files.set(job.path,bytes);sources.set(job.url,job.path);progress('เก็บไฟล์เกมและ AR '+(++completed)+'/'+tasks.length);await new Promise(r=>setTimeout(r,0))}catch(e){failed=true;throw e}}}
  const settled=await Promise.allSettled(Array.from({length:4},worker));const error=settled.find(r=>r.status==='rejected');if(error)throw error.reason;
  for(const url of deps.urls){const path=deps.resourceURLs[url];if(!path||!files.has(path)||!(/\.(?:js|mjs)(?:\?|$)/.test(url)||url.includes('cdn.tailwindcss.com')))continue;const code=new TextDecoder().decode(files.get(path));deps.vendors.set(url,code);deps.vendors.set(new URL(url).href,code)}

  for(const [key,value]of Object.entries(data.assets)){
   if(!value){data.assets[key]='';continue}const url=adapter.resolveImage(value);let path=sources.get(url);if(!path){const response=await get(url,signal),type=response.headers.get('content-type')||'',extension=type.includes('jpeg')?'jpg':type.includes('webp')?'webp':type.includes('gif')?'gif':type.includes('svg')?'svg':'png';path='images/custom-'+await digest(url)+'.'+extension;files.set(path,new Uint8Array(await response.arrayBuffer()));sources.set(url,path)}data.assets[key]='@package:'+path;
  }
  progress('กำลังเชื่อมข้อมูลกับโค้ดเกมต้นฉบับ…');const native=await compose(adapter,data,{packaged:true,signal,vendors:deps.vendors,arFiles:deps.arFiles,resourceURLs:deps.resourceURLs}),dom=new DOMParser().parseFromString(native,'text/html');await inlineStyles(dom,files,signal);
  files.set('index.html',encoder.encode(shell('<!doctype html>\n'+dom.documentElement.outerHTML,data,bundle.viewport)));
  signal?.throwIfAborted();progress('กำลังตรวจ CRC และสร้าง ZIP เกมส่วนตัว…');await archive(files,data.meta.title,{signal});files.clear();sources.clear();deps.vendors.clear();
 }
 window.SharedNativeGames.download=download;
})();
