/* Versioned, local-only adapter contract. Each future game registers its own adapter. */
(() => {
  'use strict';
  const root = window.MiniCityPersonalGame ? new URL('./',location.href) : new URL('../', document.currentScript.src);
  const clone = value => JSON.parse(JSON.stringify(value));
  const zones = {shopping:'🛍️ แยกสินค้าและบริการ',health:'🏥 จับคู่คำถาม',education:'📚 จัดกระเป๋า',food:'🍎 ซื้อของ',service:'🛠️ ช่วยเมือง'};
  const sceneDefaults={
    mapBackground:'games/AR mini city/assets/city_map.png',serviceMapBackground:'games/AR mini city/assets/city_map.png',backpackImage:'games/AR mini city/assets/product/product_schoolbag.png',
    stages:Object.fromEntries([
      ['shopping','🛍️ ย่านการค้า','แยกเข้าร้านให้ถูก'],['health','🏥 ย่านสุขภาพ','จับคู่อาการกับบริการ'],['education','📚 ย่านการศึกษา','จัดกระเป๋าไปเรียน'],['food','🍎 ย่านอาหาร','เลือกซื้อของตามรายการ'],['service','🛠️ ย่านบริการ','ภารกิจช่วยเมือง']
    ].map(([id,name,description])=>[id,{name,description,instructions:'',background:'games/AR mini city/assets/'+id+'_zone.png'}]))
  };
  function presentation(value={}){
    const result={stages:{}};
    for(const key of ['mapBackground','serviceMapBackground','backpackImage']){validationField='รูปภาพ';try{result[key]=image(value[key]??sceneDefaults[key])}catch(error){throw Object.assign(error,{scene:key,field:'รูปภาพ'})}}
    for(const id of Object.keys(zones)){
      const stage=value.stages?.[id]||{},fallback=sceneDefaults.stages[id];
      try{result.stages[id]={name:text(stage.name??fallback.name,'ชื่อด่าน',100),description:text(stage.description??fallback.description,'ข้อความด่าน',500,true),instructions:text(stage.instructions??'','คำแนะนำด่าน',1000,true),background:image(stage.background??fallback.background)};}catch(error){throw Object.assign(error,{stageId:id,...(/รูปภาพ|เส้นทาง/.test(error.message)?{scene:id,field:'รูปภาพ'}:{})})}
    }
    return result;
  }
  let validationField=null,validationQuestion=null,validationOption=null;
  const fail=(message,location={})=>{throw Object.assign(new Error(message),{field:validationField,questionId:validationQuestion,optionIndex:validationOption},location)};
  function text(value, label, max=1000, optional=false) {
    validationField=label;
    if (typeof value !== 'string' || (!optional && !value.trim()) || value.length>max) fail(label+' ไม่ถูกต้อง');
    return value.trim();
  }
  function image(value) {
    if(window.MiniCityPersonalGame&&typeof value==='string'&&value.startsWith('images/')&&!value.includes('..')&&!/[<>"'\\?#]/.test(value))return value;
    if(typeof value==='string'&&value.startsWith('blob:')){try{if(new URL(value).origin===root.origin)return value}catch{}}
    if (typeof value !== 'string' || value.length>1100000) fail('รูปภาพใหญ่เกินกำหนด');
    if(value.startsWith('assets/'))return image('games/AR mini city/'+value);
    if (!value || /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value)) return value;
    if (value.startsWith('games/AR mini city/assets/') || value==='games/AR mini city/cover.png') {
      if (value.includes('..') || /[<>"'\\?#]/.test(value)) fail('เส้นทางรูปภาพไม่ถูกต้อง');
      return value;
    }
    try { const u=new URL(value); if(u.protocol==='https:' && !u.username && !u.password) return u.href; } catch {}
    fail('รูปภาพต้องเป็น PNG/JPEG/WebP/GIF, HTTPS หรือรูปเดิมของเกม');
  }
  function validate(input) {
    validationField=null;validationQuestion=null;validationOption=null;
    if(!input || input.schemaVersion!==1 || input.adapterId!=='mini-city') fail('ไฟล์นี้ไม่ใช่ข้อมูล Mini City รุ่นที่รองรับ');
    const meta=input.meta||{};
    const data={schemaVersion:1,adapterId:'mini-city',meta:{title:text(meta.title,'ชื่อเกม',200),description:text(meta.description||'','คำอธิบายเกม',2000,true),subject:text(meta.subject,'วิชา',100),grade:text(meta.grade,'ระดับชั้น',50),topic:text(meta.topic,'หัวข้อ',500),instructions:text(meta.instructions,'คำแนะนำ',2000),praise:text(meta.praise,'คำชม',500),cover:image(meta.cover||'')},questions:[]};
    data.presentation=presentation(input.presentation);
    if(!Array.isArray(input.questions)||input.questions.length<5||input.questions.length>100) fail('ต้องมีภารกิจอย่างน้อย 1 ข้อต่อด่าน และรวมไม่เกิน 100 ข้อ');
    const ids=new Set();
    for(const q of input.questions) {
      validationQuestion=q?.id;validationField='คำถาม';validationOption=null;
      if(!q || !zones[q.zone] || typeof q.id!=='string' || !/^[a-zA-Z0-9_-]{1,60}$/.test(q.id) || ids.has(q.id)) fail('รหัสคำถามหรือด่านไม่ถูกต้อง/ซ้ำ');
      ids.add(q.id);
      const mode=q.zone==='food'?q.mode:'single';
      if(q.zone==='food'&&!['list','budget','plan'].includes(mode)) fail('โหมดซื้อของไม่ถูกต้อง');
      const n={id:q.id,zone:q.zone,title:text(q.title,'คำถาม',1000),image:image(q.image||''),hint:text(q.hint||'','คำแนะนำข้อ',500,true),mode,budget:0,options:[]};
      if(!Array.isArray(q.options)||q.options.length<2||q.options.length>6) fail('แต่ละข้อต้องมี 2–6 ตัวเลือก');
      if(q.zone==='shopping'&&q.options.length!==2) fail('แยกสินค้า/บริการต้องมี 2 ตัวเลือกตามกลไกเดิม');
      if(['food','education'].includes(q.zone)&&q.options.length!==6) fail('ด่านจัดกระเป๋า/ซื้อของต้องมี 6 ตัวเลือกตามกลไกเดิม');
      for(const [optionIndex,o] of q.options.entries()) {
        validationOption=optionIndex;
        if(typeof o.correct!=='boolean') fail('กรุณาระบุเฉลย');
        const price=Number(o.price||0);if(!Number.isFinite(price)||price<0||price>100000) fail('ราคาต้องเป็น 0–100000',{field:'ราคา'});
        n.options.push({label:text(o.label,'ตัวเลือก',200),image:image(o.image||''),correct:o.correct,price});
      }
      validationOption=null;
      if(new Set(n.options.map(o=>o.label.normalize('NFKC').toLocaleLowerCase())).size!==n.options.length)fail('ตัวเลือกซ้ำ กรุณาใช้ข้อความที่แตกต่างกันในแต่ละข้อ',{field:'ตัวเลือก'});
      const answers=n.options.filter(o=>o.correct).length;
      if(n.zone==='education'||(n.zone==='food'&&mode==='list')) {if(answers!==3)fail('ด่านจัดกระเป๋า/ซื้อของตามรายการต้องมีคำตอบถูก 3 ข้อ');}
      else if(n.zone==='food') {
        n.budget=Number(q.budget);if(!Number.isFinite(n.budget)||n.budget<0||n.budget>100000)fail('งบไม่ถูกต้อง');
        const cheapest=n.options.map(o=>o.price).sort((a,b)=>a-b).slice(0,3).reduce((a,b)=>a+b,0);
        if(cheapest>n.budget)fail('งบน้อยเกินไป ไม่มีชุดสินค้า 3 ชิ้นที่ซื้อได้');
      } else if(answers!==1) fail('ข้อนี้ต้องมีคำตอบถูก 1 ข้อ');
      data.questions.push(n);
    }
    for(const z of Object.keys(zones))if(!data.questions.some(q=>q.zone===z))fail('ต้องเหลือภารกิจอย่างน้อย 1 ข้อในแต่ละด่าน');
    if(data.questions.filter(q=>q.zone==='service').length>6)fail('แผนที่ช่วยเมืองรองรับสูงสุด 6 จุด');
    if(JSON.stringify(data).length>4000000)fail('ข้อมูลรวมใหญ่เกิน 4 MB กรุณาลดรูปภาพ');
    return data;
  }
  function normalizeLocation(game) {
    try { if(decodeURIComponent(String(game.folder||'')).trim().replace(/^games\//,'').replace(/\/index\.html$/,'').replace(/\/$/,'')==='AR mini city')return true; } catch {}
    for(const value of [game.folder,game.link,game.gameUrl]) {
      if(!value)continue;
      try {
        const url=new URL(value.includes('/')||value.includes(':')?value:'games/'+value+'/index.html',root);
        const prefix=decodeURIComponent(root.pathname);
        const p=decodeURIComponent(url.pathname);
        if((url.origin===root.origin||url.origin==='https://krukung1234.github.io') && (p===prefix+'games/AR mini city/index.html'||p===prefix+'games/AR mini city/'||p===prefix+'games/AR mini city'||p==='/games/AR mini city/index.html'||p==='/games/AR mini city/'))return true;
      }catch{}
    }
    return false;
  }
  const entry={id:'mini-city',zones,presentation,validate,matches:normalizeLocation,
    resolveImage:value=>value?new URL(image(value),root).href:'',
    fallbackImage:new URL('images/editor-image-placeholder.svg',root).href,
    async defaults({signal}={}){const r=await fetch(new URL('js/adapters/mini-city-defaults.json?v=editor-20261016-12',root),{cache:'no-cache',credentials:'omit',signal});if(!r.ok)throw Error('โหลดข้อมูลต้นฉบับไม่สำเร็จ');return validate(await r.json())},
    launch(value){const data=validate(value),token=crypto.randomUUID(),url=new URL('personal-game-player.html',root);url.searchParams.set('editor','mini-city');url.searchParams.set('preview',token);return {url:url.href,data,token}},
    connectPreview(frame,run,onClose){
      const receive=event=>{
        if(event.origin!==root.origin||event.source!==frame.contentWindow||event.data?.token!==run.token)return;
        if(event.data.type==='mini-city-request')frame.contentWindow.postMessage({type:'mini-city-data',token:run.token,data:clone(run.data)},root.origin);
        if(event.data.type==='mini-city-close')onClose();
      };
      window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);
    },
    clone,image
  };
  const registry=new Map([['mini-city',entry]]);
  window.GameAdapters={get:id=>registry.get(id),find:game=>[...registry.values()].find(a=>a.matches(game)),register(adapter){if(!adapter.id||registry.has(adapter.id))throw Error('Adapter id ซ้ำหรือว่าง');registry.set(adapter.id,adapter)}};
})();
