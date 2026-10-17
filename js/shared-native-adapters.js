/* One capability-driven adapter implementation. Native game engines and their files stay read-only. */
(() => {
 'use strict';
 const root=new URL('../',document.currentScript.src),mini=GameAdapters.get('mini-city'),clone=mini.clone;
 let loaded=null;
 const read=(object,path)=>path.reduce((v,key)=>v?.[key],object);
 const put=(object,path,value)=>{const owner=path.slice(0,-1).reduce((v,key)=>v[key],object);owner[path.at(-1)]=value};
 const fail=(message,field)=>{throw Object.assign(Error(message),{nativeField:field})};
 const image=value=>{
  if(typeof value!=='string'||value.length>1500000)throw Error('รูปภาพไม่ถูกต้อง');
  if(!value||/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value))return value;
  if(value.startsWith('blob:')&&new URL(value).origin===root.origin)return value;
  if((value.startsWith('games/')||value.startsWith('editor-assets/'))&&!value.includes('..')&&!/[<>"'\\?#]/.test(value))return value;
  try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password)return url.href}catch{}
  throw Error('ใช้รูปต้นฉบับ รูปที่อัปโหลด หรือ HTTPS เท่านั้น');
 };
 async function load(entry,signal){
  if(loaded?.id===entry.id&&loaded.bundle)return loaded.bundle;
  const response=await fetch(new URL('js/adapters/native/'+entry.id+'.json?v=shared-15',root),{credentials:'omit',cache:'force-cache',signal});
  if(!response.ok)throw Error('อ่าน Adapter ของเกมนี้ไม่สำเร็จ');const bundle=await response.json();if(bundle.id!==entry.id||bundle.version!==1)throw Error('Adapter ไม่ตรงกับเกม');
  // Defaults come from the immutable native blueprint; do not store a duplicate text bank in JSON.
  bundle.values=Object.fromEntries(bundle.fields.map(field=>{const value=read(bundle.bindings[field.binding].data,field.path);return [field.id,field.kind==='grid'?value.map(row=>row.join(' ')).join('\n'):value]}));
  signal?.throwIfAborted();entry.bundle=bundle;entry.zones=Object.fromEntries(bundle.groups.map(g=>[g.id,g.label]));entry.supportText=bundle.note;
  loaded={id:entry.id,bundle};return bundle;
 }
 function validate(entry,input){
  const b=entry.bundle;if(!b||input?.schemaVersion!==2||input.adapterId!==entry.id)throw Error('ข้อมูลไม่ตรงกับ Adapter');
  const text=(v,label,max=1000,optional=false)=>{if(typeof v!=='string'||v.length>max||(!optional&&!v.trim()))fail(label+' ไม่ถูกต้อง');return v.trim()};
  const m=input.meta||{},meta={title:text(m.title,'ชื่อเกม',200),subject:text(m.subject,'วิชา',100),grade:text(m.grade||'','ระดับชั้น',50,true),topic:text(m.topic,'หัวข้อ',500),description:text(m.description||'','คำอธิบาย',2000,true),instructions:text(m.instructions||'','คำแนะนำเพิ่มเติม',2000,true),praise:text(m.praise||'','คำชม',500,true),cover:''};
  const data={schemaVersion:2,adapterId:entry.id,meta,values:{},assets:{}};
  for(const f of b.fields){let value=input.values?.[f.id];if(f.kind==='boolean'){if(typeof value!=='boolean')fail('กรุณากำหนด '+f.label,f.id)}
   else if(f.kind==='number'){value=Number(value);if(!Number.isFinite(value)||!Number.isInteger(value)||value<(f.min??0)||value>(f.max??100000))fail(f.label+' อยู่นอกช่วงที่เกมรองรับ',f.id)}
   else if(f.kind==='select'){if(!f.choices.includes(value))fail('กรุณาเลือก '+f.label,f.id)}
   else if(f.kind==='grid'){value=text(value,f.label,200);const rows=value.split(/\n/).map(r=>r.trim().split(/[ ,]+/).map(Number));const max=f.path.at(-1)==='puzzle'?0:1;if(rows.length!==4||rows.some(r=>r.length!==4||r.some(n=>!Number.isInteger(n)||n<max||n>4)))fail('ตารางต้องมี 4 แถว แถวละ 4 ตัวเลข',f.id)}
   else{value=text(value,f.label,2000);if(value!==b.values[f.id]&&/[<>&"'`]/.test(value))fail('ใช้ข้อความธรรมดา ไม่ใส่แท็ก HTML หรือเครื่องหมายอัญประกาศในข้อมูลเกมเดิม',f.id)}
   data.values[f.id]=value;
  }
  for(const [key,asset]of Object.entries(b.assets)){const value=input.assets?.[key]??asset.default;data.assets[key]=image(value)}
  const native=bindings(entry,data);
  if(b.type==='sudoku-grid')for(const [i,l]of native.LEVELS.entries()){
   const valid=a=>new Set(a).size===4&&a.every(n=>n>=1&&n<=4);let correct=l.solution.every(valid);
   for(let col=0;col<4;col++)correct&&=valid(l.solution.map(r=>r[col]));for(let r=0;r<4;r+=2)for(let c=0;c<4;c+=2)correct&&=valid([l.solution[r][c],l.solution[r][c+1],l.solution[r+1][c],l.solution[r+1][c+1]]);
   if(!correct||l.puzzle.some((r,y)=>r.some((n,x)=>n&&n!==l.solution[y][x])))fail('โจทย์และเฉลย Sudoku ด่าน '+(i+1)+' ไม่สอดคล้องกัน',b.fields.find(f=>f.path[0]===i&&f.kind==='grid').id);
  }
  if(b.type==='magnet-classification'&&native.objects.filter(o=>o.magnetic).length!==8)fail('เกมแม่เหล็กเดิมต้องมีวัตถุดูดติด 8 ชิ้นและไม่ติด 8 ชิ้น กรุณาสลับเฉลยเป็นคู่');
  if(b.type==='opposite-quiz')for(const stage of native.QUESTIONS)for(const q of stage)if(q[1]===q[2])fail('คำตอบถูกและตัวลวงต้องต่างกัน');
  if(b.type==='quiz'&&native.gameData)for(const level of native.gameData)for(const q of level.questions)if(new Set(q.choices).size!==q.choices.length)fail('ตัวเลือกคำถามต้องไม่ซ้ำกัน');
  if(b.type==='animal-classification')for(const animal of native.animals){const vertebrate=['fish','amphibian','reptile','bird','mammal'].includes(animal.group);if((animal.mainType==='vertebrate')!==vertebrate)fail('ชนิดและกลุ่มของ '+animal.nameTh+' ไม่สอดคล้องกัน')}
  for(const pair of [['goodFoods','badFoods'],['fruits','junkFoods'],['targetWords','trapWords'],['kobWords','otherWords'],['kokWords','otherWords'],['TRUE','FALSE']])if(native[pair[0]]&&native[pair[1]]){const set=new Set(native[pair[0]]);if(native[pair[1]].some(v=>set.has(v)))fail('คำตอบถูกและตัวลวงต้องไม่ซ้ำกัน')}
  if(b.type==='word-pools'&&native.matras)for(const m of native.matras)if(m.words.some(w=>m.decoys.includes(w)))fail('คำเป้าหมายและตัวลวงในกลุ่มเดียวกันต้องไม่ซ้ำ');
  if(native.TRUE&&native.FALSE){const words=new Set(native.TRUE.map(v=>v.word));if(native.FALSE.some(v=>words.has(v.word)))fail('คำควบกล้ำแท้และไม่แท้ต้องไม่ซ้ำกัน')}
  if(native.LEAD&&native.HO&&native.NON){if(native.NON.some(w=>native.LEAD.includes(w)||native.HO.includes(w)))fail('คลังอักษรนำและคำที่ไม่ใช่อักษรนำต้องไม่ซ้ำกัน')}
  if(native.ORDER_PHRASES){const normalize=s=>s.replace(/[\s,，.!?;:ฯ]+/g,'');for(const [id,parts]of Object.entries(native.ORDER_PHRASES)){const q=native.DATA.find(q=>String(q.id)===id);if(q&&normalize(parts.join(''))!==normalize(q.idiom))fail('คำย่อยของคำพังเพย '+id+' ต้องรวมเป็น '+q.idiom)}}
  if(JSON.stringify(data).length>16000000)throw Error('ข้อมูลใหญ่เกิน 16 MB');return data;
 }
 function bindings(entry,data){const result=Object.fromEntries(Object.entries(entry.bundle.bindings).map(([k,v])=>[k,clone(v.data)]));for(const f of entry.bundle.fields){let value=data.values[f.id];if(f.kind==='grid')value=value.split('\n').map(r=>r.trim().split(/[ ,]+/).map(Number));put(result[f.binding],f.path,value);for(const path of f.sync||[])put(result[f.binding],path,value)}if(result.ORDER_PHRASES)for(const q of result.DATA)if(q.words?.length===1)q.words=[q.idiom];return result}
 function matchesFolder(entry,game){for(const value of [game.folder,game.link,game.gameUrl]){if(!value)continue;try{const candidate=decodeURIComponent(String(value)).trim().replace(/^games\//,'').replace(/\/index\.html(?:\?.*)?$/,'').replace(/\/$/,'');if(candidate===entry.folder)return true;const url=new URL(value,root);if(url.origin===root.origin&&decodeURIComponent(url.pathname).includes('/games/'+entry.folder+'/'))return true}catch{}}return false}
 const registry=[];
 for(const item of window.NativeAdapterCatalogue||[]){
  const entry={...item,supportText:item.note,kind:'native',zones:{},clone,image,read,put,load(options={}){return load(entry,options.signal)},
   matches(game){return entry.enabled&&entry.qualification==='complete'&&matchesFolder(entry,game)},
   resolveImage:value=>value?new URL(image(value),root).href:'',fallbackImage:new URL('images/editor-image-placeholder.svg',root).href,
   validate:value=>validate(entry,value),
   async defaults(options={}){const b=await load(entry,options.signal);return {schemaVersion:2,adapterId:entry.id,meta:clone(b.meta),values:clone(b.values),assets:Object.fromEntries(Object.entries(b.assets).map(([k,v])=>[k,v.default]))}},
   bindings:value=>bindings(entry,value),
   launch(value){if(!entry.enabled||entry.qualification!=='complete')throw Error('Adapter นี้ยังไม่ผ่านการรับรองครบ จึงยังไม่เปิดใช้งาน');const data=entry.validate(value),token=crypto.randomUUID(),url=new URL('shared-game-player.html',root);url.searchParams.set('adapter',entry.id);url.searchParams.set('preview',token);return {url:url.href,data,token}},
   connectPreview:mini.connectPreview,
   dispose(){if(loaded?.id===entry.id)loaded=null;delete entry.bundle;entry.zones={}},
   images(data){return Object.entries(data.assets||{}).map(([scene,value])=>({scene,value,field:'รูปภาพ'}))}
  };registry.push(entry);GameAdapters.register(entry);
 }
 window.SharedNativeGames={root,read,put,clone,load,bindings,entries:registry,statusFor:game=>registry.find(entry=>matchesFolder(entry,game))||null};
})();
