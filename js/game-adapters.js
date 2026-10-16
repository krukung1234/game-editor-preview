/* Versioned, local-only adapter contract. Each future game registers its own adapter. */
(() => {
  'use strict';
  const root = new URL('../', document.currentScript.src);
  const clone = value => JSON.parse(JSON.stringify(value));
  const zones = {shopping:'🛍️ แยกสินค้าและบริการ',health:'🏥 จับคู่คำถาม',education:'📚 จัดกระเป๋า',food:'🍎 ซื้อของ',service:'🛠️ ช่วยเมือง'};
  const key = 'krukung.editor.v1.mini-city';
  const runKey = 'krukung.editor.run.v1.mini-city';
  const fail = message => { throw new Error(message); };
  function text(value, label, max=1000, optional=false) {
    if (typeof value !== 'string' || (!optional && !value.trim()) || value.length>max) fail(label+' ไม่ถูกต้อง');
    return value.trim();
  }
  function image(value) {
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
    if(!input || input.schemaVersion!==1 || input.adapterId!=='mini-city') fail('ไฟล์นี้ไม่ใช่ข้อมูล Mini City รุ่นที่รองรับ');
    const meta=input.meta||{};
    const data={schemaVersion:1,adapterId:'mini-city',meta:{title:text(meta.title,'ชื่อเกม',200),description:text(meta.description||'','คำอธิบายเกม',2000,true),subject:text(meta.subject,'วิชา',100),grade:text(meta.grade,'ระดับชั้น',50),topic:text(meta.topic,'หัวข้อ',500),instructions:text(meta.instructions,'คำแนะนำ',2000),praise:text(meta.praise,'คำชม',500),cover:image(meta.cover||'')},questions:[]};
    if(!Array.isArray(input.questions)||input.questions.length<5||input.questions.length>100) fail('ต้องมีภารกิจอย่างน้อย 1 ข้อต่อด่าน และรวมไม่เกิน 100 ข้อ');
    const ids=new Set();
    for(const q of input.questions) {
      if(!q || !zones[q.zone] || typeof q.id!=='string' || !/^[a-zA-Z0-9_-]{1,60}$/.test(q.id) || ids.has(q.id)) fail('รหัสคำถามหรือด่านไม่ถูกต้อง/ซ้ำ');
      ids.add(q.id);
      const mode=q.zone==='food'?q.mode:'single';
      if(q.zone==='food'&&!['list','budget','plan'].includes(mode)) fail('โหมดซื้อของไม่ถูกต้อง');
      const n={id:q.id,zone:q.zone,title:text(q.title,'คำถาม',1000),image:image(q.image||''),hint:text(q.hint||'','คำแนะนำข้อ',500,true),mode,budget:0,options:[]};
      if(!Array.isArray(q.options)||q.options.length<2||q.options.length>6) fail('แต่ละข้อต้องมี 2–6 ตัวเลือก');
      if(q.zone==='shopping'&&q.options.length!==2) fail('แยกสินค้า/บริการต้องมี 2 ตัวเลือกตามกลไกเดิม');
      if(['food','education'].includes(q.zone)&&q.options.length!==6) fail('ด่านจัดกระเป๋า/ซื้อของต้องมี 6 ตัวเลือกตามกลไกเดิม');
      for(const o of q.options) {
        if(typeof o.correct!=='boolean') fail('กรุณาระบุเฉลย');
        const price=Number(o.price||0);if(!Number.isFinite(price)||price<0||price>100000) fail('ราคาต้องเป็น 0–100000');
        n.options.push({label:text(o.label,'ตัวเลือก',200),image:image(o.image||''),correct:o.correct,price});
      }
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
  const entry={id:'mini-city',zones,key,runKey,validate,matches:normalizeLocation,
    resolveImage:value=>value?new URL(image(value),root).href:'',
    fallbackImage:new URL('images/editor-image-placeholder.svg',root).href,
    async defaults(){const r=await fetch(new URL('js/adapters/mini-city-defaults.json?v=personal-1',root),{cache:'no-store',credentials:'omit'});if(!r.ok)throw Error('โหลดข้อมูลต้นฉบับไม่สำเร็จ');return validate(await r.json())},
    read(){const value=localStorage.getItem(key);return value?validate(JSON.parse(value)):null},
    save(value){const data=validate(value);try{localStorage.setItem(key,JSON.stringify(data))}catch{fail('บันทึกไม่ได้ พื้นที่เบราว์เซอร์เต็มหรือไม่อนุญาต กรุณาส่งออก JSON')}return data},
    launch(value){const data=validate(value),id=crypto.randomUUID();try{sessionStorage.setItem(runKey,JSON.stringify({id,data}))}catch{fail('เตรียมเกมไม่ได้ พื้นที่ของแท็บเต็ม กรุณาส่งออก JSON หรือลดรูปภาพ')}const url=new URL('personal-game-player.html',root);url.searchParams.set('editor','mini-city');url.searchParams.set('draft',id);return url.href},
    clone,image
  };
  const registry=new Map([['mini-city',entry]]);
  window.GameAdapters={get:id=>registry.get(id),find:game=>[...registry.values()].find(a=>a.matches(game)),register(adapter){if(!adapter.id||registry.has(adapter.id))throw Error('Adapter id ซ้ำหรือว่าง');registry.set(adapter.id,adapter)}};
})();
