(() => {
  'use strict';
  const el=(tag,props={},children=[])=>{const n=document.createElement(tag);for(const [k,v] of Object.entries(props)){if(k==='class')n.className=v;else if(k.startsWith('on'))n.addEventListener(k.slice(2),v);else if(k==='text')n.textContent=v;else n[k]=v}n.append(...children);return n};
  let adapter,draft,original,activeZone='shopping',activeId,opener,dirty=false,loading=false;
  const dialog=el('dialog',{id:'gameEditor',class:'game-editor-dialog'});
  const status=el('p',{id:'editorStatus',class:'editor-status',role:'status'});
  const details=el('div',{id:'editorQuestionDetails'});
  const list=el('div',{id:'editorQuestionList',class:'editor-question-list'});
  const count=el('span',{class:'editor-count'});
  const meta=el('div',{class:'editor-meta'});
  const preview=el('div',{id:'editorPreview',class:'editor-preview'});
  const tabs=el('div',{class:'editor-tabs'});
  const inputs={};
  const uid=()=>crypto.randomUUID().replaceAll('-','');
  const announce=(message,error=false)=>{status.textContent=message;status.classList.toggle('error',error)};
  const mark=()=>{dirty=true;announce('มีการเปลี่ยนแปลง • กดบันทึก หรือทดลองเล่นเพื่อเก็บฉบับนี้ในเบราว์เซอร์')};
  const button=(text,fn,className='editor-button')=>el('button',{type:'button',text,class:className,onclick:fn});
  function field(label,id,value,oninput,type='text'){
    const props={id,value,oninput:event=>oninput(event.target.value)};
    if(type!=='textarea')props.type=type;
    const input=el(type==='textarea'?'textarea':'input',props);
    if(type==='textarea')input.rows=3;
    if(type==='number'){input.min=0;input.max=100000;input.step=1}
    return el('label',{class:'editor-field'},[el('span',{text:label}),input]);
  }
  function selectField(label,id,values,value,change){
    const select=el('select',{id,onchange:e=>change(e.target.value)});for(const item of values){const [v,t]=Array.isArray(item)?item:[item,item];select.append(el('option',{value:v,text:t}))}select.value=value;
    return el('label',{class:'editor-field'},[el('span',{text:label}),select]);
  }
  function current(){return draft.questions.find(q=>q.id===activeId)}
  async function loadImage(file){
    if(!file)return '';
    if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>750000)throw Error('ใช้ PNG/JPEG/WebP/GIF ขนาดไม่เกิน 750 KB ต่อภาพ');
    const value=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('อ่านรูปภาพไม่สำเร็จ'));r.readAsDataURL(file)});
    await new Promise((resolve,reject)=>{const i=new Image();i.onload=resolve;i.onerror=()=>reject(Error('ไฟล์นี้เปิดเป็นรูปภาพไม่ได้'));i.src=value});
    return adapter.image(value);
  }
  function imageField(label,value,change){
    const img=el('img',{class:'editor-image',alt:label});if(value)img.src=adapter.resolveImage(value);else img.hidden=true;
    const file=el('input',{type:'file',accept:'image/png,image/jpeg,image/webp,image/gif',onchange:async event=>{try{const value=await loadImage(event.target.files[0]);if(!value)return;change(value);img.src=adapter.resolveImage(value);img.hidden=false;mark()}catch(e){announce(e.message,true)}finally{event.target.value=''}}});
    return el('div',{class:'editor-image-field'},[el('label',{class:'editor-field'},[el('span',{text:label}),img,file]),button('ลบรูปภาพ',()=>{change('');img.removeAttribute('src');img.hidden=true;mark()},'editor-button subtle')]);
  }
  function renderMeta(){
    meta.replaceChildren();
    for(const [key,label,type] of [['title','ชื่อเกมใหม่'],['topic','หัวข้อบทเรียน'],['instructions','ข้อความคำแนะนำ','textarea'],['praise','ข้อความคำชม']]){
      const f=field(label,'editor-'+key,draft.meta[key],value=>{draft.meta[key]=value;mark()},type);inputs[key]=f.querySelector('input,textarea');meta.append(f);
    }
    const subjectOptions=[...new Set([...APP_CONFIG.CATEGORIES,'ศิลปะ','ปฐมวัย','การงานอาชีพ','พลศึกษา',draft.meta.subject])];
    const grades=['อนุบาล 1','อนุบาล 2','อนุบาล 3',...Array.from({length:6},(_,i)=>'ป.'+(i+1)),...Array.from({length:6},(_,i)=>'ม.'+(i+1))];if(!grades.includes(draft.meta.grade))grades.push(draft.meta.grade);
    meta.insertBefore(selectField('วิชา','editor-subject',subjectOptions,draft.meta.subject,v=>{draft.meta.subject=v;mark()}),meta.children[1]);
    meta.insertBefore(selectField('ระดับชั้น','editor-grade',grades,draft.meta.grade,v=>{draft.meta.grade=v;mark()}),meta.children[2]);
    meta.append(imageField('ภาพหน้าปกเกม',draft.meta.cover,value=>draft.meta.cover=value));
  }
  function renderTabs(){
    tabs.replaceChildren(...Object.entries(adapter.zones).map(([zone,label])=>button(label,()=>{activeZone=zone;activeId=draft.questions.find(q=>q.zone===zone)?.id;renderQuestions()},'editor-button '+(zone===activeZone?'active':''))));
  }
  function move(id,direction){const zone=draft.questions.filter(q=>q.zone===activeZone);const i=zone.findIndex(q=>q.id===id),other=zone[i+direction];if(!other)return;const a=draft.questions.findIndex(q=>q.id===id),b=draft.questions.indexOf(other);[draft.questions[a],draft.questions[b]]=[draft.questions[b],draft.questions[a]];mark();renderQuestions()}
  function renderQuestions(){
    renderTabs();list.replaceChildren();
    const questions=draft.questions.filter(q=>q.zone===activeZone);count.textContent=questions.length+' ภารกิจในด่านนี้';
    questions.forEach((q,i)=>{
      const up=button('↑',()=>move(q.id,-1),'editor-icon');up.disabled=i===0;up.setAttribute('aria-label','เลื่อนขึ้น');
      const down=button('↓',()=>move(q.id,1),'editor-icon');down.disabled=i===questions.length-1;down.setAttribute('aria-label','เลื่อนลง');
      const remove=button('ลบ',()=>{if(questions.length===1){announce('ต้องเหลืออย่างน้อย 1 ภารกิจในแต่ละด่าน',true);return}draft.questions=draft.questions.filter(item=>item.id!==q.id);if(activeId===q.id)activeId=draft.questions.find(item=>item.zone===activeZone).id;mark();renderQuestions()},'editor-icon danger');
      list.append(el('div',{class:'editor-question-row '+(q.id===activeId?'active':'')},[button((i+1)+'. '+q.title,()=>{activeId=q.id;renderQuestions()},'editor-question-select'),up,down,remove]));
    });
    renderQuestion();
  }
  function renderQuestion(){
    details.replaceChildren();const q=current();if(!q)return;
    details.append(field('คำถาม / สถานการณ์','editor-question-title',q.title,v=>{q.title=v;mark();const index=draft.questions.filter(x=>x.zone===activeZone).findIndex(x=>x.id===q.id);list.querySelectorAll('.editor-question-select')[index].textContent=(index+1)+'. '+v},'textarea'),imageField('ภาพประกอบคำถาม',q.image,value=>q.image=value));
    const note=q.zone==='shopping'?'2 กลุ่ม • ตอบถูก 1 คะแนน':q.zone==='education'?'เลือก 3 จาก 6 ชิ้น • ถูกชิ้นละ 1 คะแนน':q.zone==='food'?'เลือกสินค้า 3 จาก 6 ชิ้น • กติกาและคะแนนตามโหมดเกมเดิม':'เลือกคำตอบถูก 1 ข้อ • ได้ 1 คะแนน';
    details.append(el('p',{class:'editor-note',text:note}));
    if(q.zone==='food'){
      details.append(selectField('โหมดซื้อของ','editor-food-mode',[['list','ตามรายการ: กำหนดคำตอบถูก 3 ชิ้น'],['budget','ตามงบ: รวมราคาไม่เกินงบได้ 3 คะแนน'],['plan','วางแผน: เหลือ 0–2 บาทได้ 3, 3–5 ได้ 2, มากกว่า 5 ได้ 1, เกินงบได้ 0']],q.mode,value=>{q.mode=value;mark();renderQuestion()}),field('คำแนะนำภารกิจ','editor-question-hint',q.hint,v=>{q.hint=v;mark()}));
      if(q.mode!=='list')details.append(field('งบประมาณ (บาท)','editor-budget',q.budget,v=>{q.budget=Number(v);mark()},'number'));
    }
    const options=el('div',{class:'editor-options'});
    q.options.forEach((o,i)=>{
      const checkbox=el('input',{type:'checkbox',checked:q.zone==='food'&&q.mode!=='list'?false:o.correct,disabled:q.zone==='food'&&q.mode!=='list',onchange:event=>{if(!['education','food'].includes(q.zone))q.options.forEach((x,j)=>x.correct=j===i&&event.target.checked);else o.correct=event.target.checked;mark();renderQuestion()}});
      checkbox.setAttribute('aria-label','คำตอบถูก ตัวเลือก '+(i+1));
      const row=el('section',{class:'editor-option'},[el('label',{class:'editor-answer'},[checkbox,el('span',{text:'คำตอบถูก '+(i+1)})]),field('ข้อความตัวเลือก '+(i+1),'editor-option-'+i,o.label,v=>{o.label=v;mark()}),imageField('ภาพตัวเลือก '+(i+1),o.image,value=>o.image=value)]);
      if(q.zone==='food')row.append(field('ราคา (บาท)','editor-price-'+i,o.price,v=>{o.price=Number(v);mark()},'number'));
      if(['health','service'].includes(q.zone)){const remove=button('ลบตัวเลือก',()=>{q.options.splice(i,1);mark();renderQuestion()},'editor-button subtle');remove.disabled=q.options.length<=2;row.append(remove)}
      options.append(row);
    });
    details.append(options);
    if(['health','service'].includes(q.zone)){const add=button('+ เพิ่มตัวเลือก',()=>{q.options.push({label:'ตัวเลือกใหม่',image:'',correct:false,price:0});mark();renderQuestion()});add.disabled=q.options.length>=6;details.append(add)}
  }
  function checked(){return adapter.validate(draft)}
  function save(){try{draft=adapter.save(checked());dirty=false;announce('✅ บันทึกฉบับปรับแต่งในเบราว์เซอร์นี้แล้ว')}catch(e){announce(e.message,true)}}
  function showPreview(){try{const data=checked();preview.replaceChildren(el('h3',{text:data.meta.title}),el('p',{text:data.meta.subject+' • '+data.meta.grade+' • '+data.meta.topic}),el('p',{text:data.meta.instructions}));for(const [zone,label] of Object.entries(adapter.zones)){preview.append(el('h4',{text:label}));for(const q of data.questions.filter(q=>q.zone===zone)){const card=el('div',{class:'editor-preview-question'},[el('strong',{text:q.title})]);if(q.image)card.append(el('img',{src:adapter.resolveImage(q.image),alt:q.title,class:'editor-image'}));card.append(el('p',{text:q.options.map(o=>((o.correct&&(zone!=='food'||q.mode==='list'))?'✓ ':'')+o.label+(zone==='food'?' ('+o.price+' บาท)':'')).join(' • ')}));if(zone==='food'&&q.mode!=='list')card.append(el('p',{text:'ตรวจคำตอบจากราคาที่เลือกรวมกัน • งบ '+q.budget+' บาท • โหมด '+q.mode}));preview.append(card)}}preview.hidden=false;preview.scrollIntoView({behavior:'smooth',block:'start'});announce('ตรวจตัวอย่างข้อมูลด้านล่างก่อนทดลองเล่น')}catch(e){announce(e.message,true)}}
  async function importFile(event){try{const file=event.target.files[0];if(!file)return;if(file.size>5000000)throw Error('ไฟล์ JSON ต้องไม่เกิน 5 MB');const data=adapter.validate(JSON.parse(await file.text()));draft=data;dirty=true;activeId=draft.questions.find(q=>q.zone===activeZone).id;preview.hidden=true;renderMeta();renderQuestions();announce('นำเข้าข้อมูลแล้ว ตรวจสอบและกดบันทึกเพื่อเก็บฉบับนี้')}catch(e){announce('นำเข้าไม่ได้: '+e.message,true)}finally{event.target.value=''}}
  const importInput=el('input',{id:'editorImport',type:'file',accept:'.json,application/json',onchange:importFile});importInput.hidden=true;
  function exportData(){try{const blob=new Blob([JSON.stringify(checked(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);const a=el('a',{href:url,download:'mini-city-custom.json'});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('ส่งออก JSON แล้ว สามารถนำไปนำเข้าบนเครื่องอื่นได้')}catch(e){announce(e.message,true)}}
  function close(){if(dirty&&!confirm('มีข้อมูลที่ยังไม่บันทึก ต้องการปิดโดยไม่บันทึกหรือไม่?'))return;dialog.close();opener?.focus()}
  dialog.append(el('header',{class:'editor-heading'},[el('div',{},[el('span',{class:'prompt-version',text:'GAME EDITOR • MINI CITY • รุ่น 1'}),el('h2',{id:'editorHeading',text:'⚙️ ปรับแต่งเกม AR Mini City'}),el('p',{text:'แก้เนื้อหา แล้วเล่นด้วยกลไก AR ภารกิจ คะแนน และเอฟเฟกต์ของเกมเดิม'})]),button('×',close,'editor-close')]),el('p',{class:'editor-note',text:'ข้อมูลเก็บเฉพาะเบราว์เซอร์และที่อยู่เว็บไซต์นี้ การเปิดลิงก์ข้ามเครื่องไม่ส่งข้อมูลไปด้วย ให้ส่งออก JSON แล้วนำเข้าในเครื่องปลายทาง'}),status,meta,el('div',{class:'editor-toolbar'},[el('h3',{text:'จัดการคำถามและคำตอบ'}),count,button('+ เพิ่มภารกิจ',()=>{const same=draft.questions.filter(q=>q.zone===activeZone);if(activeZone==='service'&&same.length>=6){announce('แผนที่ช่วยเมืองรองรับสูงสุด 6 จุด',true);return}if(draft.questions.length>=100){announce('รองรับสูงสุด 100 ภารกิจ',true);return}const q=adapter.clone(current()||same[0]);q.id=uid();q.title='ภารกิจใหม่';draft.questions.push(q);activeId=q.id;mark();renderQuestions()})]),tabs,el('div',{class:'editor-workspace'},[list,details]),preview,el('footer',{class:'editor-footer'},[button('💾 บันทึกในเบราว์เซอร์',save),button('👁 ดูตัวอย่างข้อมูล',showPreview),button('▶ ทดลองเล่น',()=>{try{const data=checked();adapter.save(data);const url=adapter.launch(data);dirty=false;location.assign(url)}catch(e){announce(e.message,true)}},'editor-button primary'),button('ส่งออก JSON',exportData),button('นำเข้า JSON',()=>importInput.click()),button('คืนค่าเกมต้นฉบับ',()=>{if(!confirm('คืนค่าเนื้อหาเป็นต้นฉบับ? ฉบับที่บันทึกไว้ยังคงอยู่จนกว่าจะกดบันทึกทับ'))return;draft=adapter.clone(original);activeId=draft.questions.find(q=>q.zone===activeZone).id;preview.hidden=true;renderMeta();renderQuestions();mark()}),button('ปิด',close)]),importInput);
  dialog.setAttribute('aria-labelledby','editorHeading');dialog.addEventListener('cancel',event=>{event.preventDefault();close()});dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close()}});
  document.body.append(dialog);preview.hidden=true;
  window.GameEditor={async open(game,button){if(loading||dialog.open)return;loading=true;opener=button;adapter=GameAdapters.find(game);if(!adapter){loading=false;return}try{original=await adapter.defaults();let warning='';try{draft=adapter.read()||adapter.clone(original)}catch(error){draft=adapter.clone(original);warning='ฉบับที่เก็บไว้อ่านไม่ได้: '+error.message+' • เปิดต้นฉบับให้แทน ข้อมูลเดิมยังไม่ถูกลบ'}dirty=false;activeZone='shopping';activeId=draft.questions.find(q=>q.zone===activeZone).id;renderMeta();renderQuestions();preview.hidden=true;announce(warning||'เริ่มจากข้อมูลเกมต้นฉบับ หรือฉบับล่าสุดที่บันทึกในเบราว์เซอร์นี้',Boolean(warning));dialog.showModal();dialog.scrollTop=0}catch(error){alert('เปิดตัวแก้ไขไม่ได้: '+error.message)}finally{loading=false}}};
})();
