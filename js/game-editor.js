(() => {
  'use strict';
  const el=(tag,props={},children=[])=>{const n=document.createElement(tag);for(const [k,v] of Object.entries(props)){if(k==='class')n.className=v;else if(k.startsWith('on'))n.addEventListener(k.slice(2),v);else if(k==='text')n.textContent=v;else n[k]=v}n.append(...children);return n};
  let adapter,draft,original,activeZone='shopping',activeId,opener,loading=false,downloadedSignature=null;
  let optionOriginalImages=new WeakMap();
  const dialog=el('dialog',{id:'gameEditor',class:'game-editor-dialog'});
  const status=el('p',{id:'editorStatus',class:'editor-status',role:'status'});
  const details=el('div',{id:'editorQuestionDetails'});
  const list=el('div',{id:'editorQuestionList',class:'editor-question-list'});
  const count=el('span',{class:'editor-count'});
  const meta=el('div',{class:'editor-meta'});
  const sectionTabs=el('div',{class:'editor-section-tabs',role:'tablist'});
  const panels={};let selectedSection='info',missionsMounted=false,imagesMounted=false;
  const imagePanel=el('div',{class:'editor-cover-images'});
  const imageFiles=new Map();let operation=null,session=0,pendingImages=0;
  const imageChecks=new Map(),activeImages=new Set();
  const stageFields=el('div',{class:'editor-stage-fields'});
  const tabs=el('div',{class:'editor-zones'});
  const body=el('div',{id:'editorBody',class:'editor-body'});
  body.addEventListener('focusin',event=>{const input=event.target;if(input.matches('input:not([type=file]),textarea,select'))requestAnimationFrame(()=>{if(dialog.open&&input.isConnected)input.scrollIntoView({block:'nearest'})})});
  let pageOverflow='';
  let previewCleanup=null;
  const playPreview=el('div',{class:'editor-play-preview'});playPreview.hidden=true;
  let imageSequence=0;
  const freezeOriginal=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freezeOriginal);Object.freeze(value)}return value};
  const uid=()=>crypto.randomUUID().replaceAll('-','');
  let statusTimer;
  const announce=(message,error=false,temporary=false)=>{clearTimeout(statusTimer);status.textContent=message;status.classList.toggle('error',error);if(temporary)statusTimer=setTimeout(()=>{status.textContent=''},6000)};
  const mark=()=>{announce('กำลังแก้ไขสำเนาชั่วคราว • ทดลองเล่นแล้วดาวน์โหลดก่อนปิดหน้าต่าง')};
  const button=(text,fn,className='editor-button')=>el('button',{type:'button',text,class:className,onclick:fn});
  function field(label,id,value,oninput,type='text'){
    const props={id,value,oninput:event=>oninput(event.target.value)};
    if(type!=='textarea')props.type=type;
    const input=el(type==='textarea'?'textarea':'input',props);
    if(type==='textarea')input.rows=3;
    if(type==='number'){input.min=0;input.max=100000;input.step=1}
    return el('div',{class:'editor-field'},[el('label',{htmlFor:id,text:label}),input]);
  }
  function selectField(label,id,values,value,change){
    const select=el('select',{id,onchange:e=>change(e.target.value)});for(const item of values){const [v,t]=Array.isArray(item)?item:[item,item];select.append(el('option',{value:v,text:t}))}select.value=value;
    return el('div',{class:'editor-field'},[el('label',{htmlFor:id,text:label}),select]);
  }
  function current(){return draft.questions?.find(q=>q.id===activeId)}
  function changed(){if(!draft||!original)return false;const value=JSON.stringify(draft);return value!==JSON.stringify(original)&&value!==downloadedSignature}
  const sceneImages=data=>data?.assets?Object.values(data.assets):data?.presentation?[data.presentation.mapBackground,data.presentation.serviceMapBackground,data.presentation.backpackImage,...Object.values(data.presentation.stages).map(stage=>stage.background)]:[];
  function releaseImages(all=false){const used=all?new Set():new Set([draft?.meta.cover,...sceneImages(draft),...(draft?.questions||[]).flatMap(q=>[q.image,...q.options.map(o=>o.image)])]);for(const url of imageFiles.keys())if(!used.has(url)){URL.revokeObjectURL(url);imageFiles.delete(url);imageChecks.delete(url)}}
  async function loadImage(file){
    if(!file)return '';
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>750000)throw Error('ใช้ JPG/PNG/WebP ขนาดไม่เกิน 750 KB ต่อภาพ');
    if([...imageFiles.values()].reduce((sum,blob)=>sum+blob.size,0)+file.size>12000000)throw Error('รูปที่อัปโหลดรวมต้องไม่เกิน 12 MB');
    const url=URL.createObjectURL(file);
    try{const img=new Image();img.src=url;await img.decode();imageFiles.set(url,file);return url}catch{URL.revokeObjectURL(url);throw Error('ไฟล์นี้เปิดเป็นรูปภาพไม่ได้')}
  }

  function imageField(label,value,change,baseline){
    const imageId='editor-image-'+(++imageSequence);
    const caption=el('span',{id:imageId,class:'editor-image-label',text:label});
    const note=el('span',{class:'editor-image-status'});
    const img=el('img',{class:'editor-image',alt:label,loading:'lazy',decoding:'async'});
    const fallback=adapter.fallbackImage;
    function showImage(source){
      img.dataset.imageState=source?'loading':'empty';
      note.textContent=source?'กำลังโหลดภาพ…':'ยังไม่ได้เลือกภาพ';
      img.src=source?adapter.resolveImage(source):fallback;
    }
    img.addEventListener('load',()=>{if(img.dataset.imageState==='loading'){img.dataset.imageState='ready';note.textContent=''}});
    img.addEventListener('error',()=>{
      if(img.src===fallback){img.removeAttribute('src');img.hidden=true;return}
      img.dataset.imageState='failed';note.textContent='โหลดภาพเดิมไม่สำเร็จ แสดงภาพสำรอง • เลือกไฟล์ใหม่ได้';img.src=fallback;
    });
    const file=el('input',{type:'file',accept:'image/png,image/jpeg,image/webp',onchange:async event=>{
      const owner=draft,token=session;let counted=false;
      try{
        const selected=event.target.files[0];if(!selected)return;pendingImages++;counted=true;playButton.disabled=true;downloadButton.disabled=true;
        const source=await loadImage(selected);
        if(owner!==draft||!dialog.open){releaseImages();return}
        change(source);releaseImages();img.hidden=false;showImage(source);mark();
      }catch(error){if(owner===draft)announce(error.message,true)}finally{event.target.value='';if(counted&&token===session){pendingImages--;if(!operation){playButton.disabled=pendingImages>0;downloadButton.disabled=pendingImages>0}}}
    }});
    file.hidden=true;file.setAttribute('aria-label',label);file.setAttribute('aria-labelledby',imageId);
    // No wrapping label, delegated click or change handler can activate this file input.
    const choose=button('🖼️ เปลี่ยนภาพ',event=>{event.stopPropagation();file.click()},'editor-button subtle editor-choose-file');
    const restore=button('↺ คืนภาพต้นฉบับ',()=>{change(baseline??'');releaseImages();img.hidden=false;showImage(baseline??'');mark()},'editor-button subtle');
    showImage(value);
    return el('div',{class:'editor-image-field'},[caption,img,note,el('div',{class:'editor-image-actions'},[choose,restore]),el('small',{text:/หน้าปก|พื้นหลัง|ภาพฉาก/.test(label)?'แนะนำอัตราส่วน 16:9 โดยรักษาตำแหน่งปุ่มเดิม':'ใช้สัดส่วนเดิม หากรูปมีหลายช่องต้องรักษาตำแหน่งแต่ละช่อง'}),file]);
  }
  const capabilityNote=()=>adapter.bundle.userNote||'แก้ไขข้อมูลและภาพที่แสดงในหน้าต่างนี้ได้ โดยคงจำนวนด่านและรูปแบบการเล่นเดิม ภาพที่มีข้อความฝังอยู่ต้องเปลี่ยนด้วยภาพใหม่';
  function renderMeta(){
    meta.replaceChildren();
    for(const [key,label,type] of [['title','ชื่อเกมใหม่'],['topic','หัวข้อบทเรียน']]){
      const f=field(label,'editor-'+key,draft.meta[key],value=>{draft.meta[key]=value;mark()},type);meta.append(f);
    }
    const title=meta.children[0];title.classList.add('editor-field-wide');
    for(const [key,label]of [['subject','🔒 วิชาต้นฉบับ'],['grade','🔒 ระดับชั้นต้นฉบับ']]){
      const box=field(label,'editor-'+key,original.meta[key]||'ต้นฉบับไม่ระบุ',()=>{});box.classList.add('editor-original-meta');box.querySelector('input').readOnly=true;meta.insertBefore(box,meta.children[1+(key==='grade'?1:0)]);
    }
    const textSettings=el('details',{class:'editor-text-settings editor-field-wide'},[el('summary',{text:'ตั้งค่าข้อความเพิ่มเติม'})]);
    for(const [key,label,type] of [['description','คำอธิบายเกม','textarea'],['instructions',adapter.kind==='native'?'คำแนะนำเพิ่มเติม (แถบข้อมูลบทเรียน)':'ข้อความคำแนะนำ','textarea'],['praise',adapter.kind==='native'?'คำชมเมื่อคะแนนเพิ่ม / ผ่านภารกิจ':'ข้อความคำชม']])textSettings.append(field(label,'editor-'+key,draft.meta[key],value=>{draft.meta[key]=value;mark()},type));
    meta.append(textSettings);if(adapter.kind==='native')meta.append(el('p',{class:'editor-note editor-field-wide',text:capabilityNote()}));
  }

  function renderImageGallery(entries,offset=0,filter='all'){
    imagePanel.replaceChildren();const kinds={all:'ทั้งหมด',cover:'ภาพหน้าปก',background:'พื้นหลัง / ภาพด่าน',question:'คำถาม / ตัวเลือก',other:'ภาพประกอบอื่น'};
    const filters=el('div',{class:'editor-image-filters'});for(const [key,label]of Object.entries(kinds)){const total=key==='all'?entries.length:entries.filter(item=>item.kind===key).length;if(!total)continue;const b=button(label+' ('+total+')',()=>renderImageGallery(entries,0,key));b.setAttribute('aria-pressed',String(key===filter));filters.append(b)}imagePanel.append(filters);
    const selected=entries.filter(item=>filter==='all'||item.kind===filter),page=selected.slice(offset,offset+12);
    for(const item of page){const card=el('section',{class:'editor-scene-card'});card.dataset.scene=item.key;card.append(imageField(item.label,item.get(),item.set,item.original));imagePanel.append(card)}
    const controls=el('div',{class:'editor-image-actions'},[el('p',{class:'editor-note',text:(selected.length?offset+1:0)+'–'+Math.min(offset+12,selected.length)+' / '+selected.length+' ภาพ • ภาพที่มีข้อความหรือหลายช่องต้องรักษาขนาดและตำแหน่งเดิม'})]);
    if(offset>0)controls.append(button('← ภาพก่อนหน้า',()=>renderImageGallery(entries,offset-12,filter)));if(offset+12<selected.length)controls.append(button('ภาพถัดไป →',()=>renderImageGallery(entries,offset+12,filter)));imagePanel.append(controls);imagesMounted=true;
  }
  function renderImages(){
    if(adapter.kind==='native'){renderNativeImages();return}
    const entries=[{key:'cover',label:'ภาพหน้าปกเกม',kind:'cover',get:()=>draft.meta.cover,set:v=>draft.meta.cover=v,original:original.meta.cover}];
    for(const [key,label]of [['mapBackground','ภาพพื้นหลังหน้าเลือกภารกิจ'],['serviceMapBackground','ภาพแผนที่ภายในด่านสุดท้าย'],['backpackImage','ภาพวัตถุตรงกลางด่านเลือก 3 จาก 6']])entries.push({key,label,kind:key==='backpackImage'?'other':'background',get:()=>draft.presentation[key],set:v=>draft.presentation[key]=v,original:original.presentation[key]});
    for(const zone of Object.keys(adapter.zones))entries.push({key:zone,label:'ภาพฉาก: '+draft.presentation.stages[zone].name,kind:'background',get:()=>draft.presentation.stages[zone].background,set:v=>draft.presentation.stages[zone].background=v,original:original.presentation.stages[zone].background});
    for(const q of draft.questions){const base=original.questions.find(item=>item.id===q.id);entries.push({key:'question-'+q.id,label:'คำถาม: '+q.title,kind:'question',get:()=>q.image,set:v=>q.image=v,original:base?.image||''});q.options.forEach((o,i)=>entries.push({key:'option-'+q.id+'-'+i,label:'ตัวเลือก '+(i+1)+': '+o.label,kind:'question',get:()=>o.image,set:v=>o.image=v,original:optionOriginalImages.get(o)||''}))}
    renderImageGallery(entries);
  }
  function renderStage(){
    const stage=draft.presentation.stages[activeZone];stageFields.replaceChildren();
    for(const [key,label] of [['name','ชื่อเขต / ชื่อด่าน'],['description','ข้อความบนปุ่มเลือกด่าน'],['instructions','คำแนะนำประจำด่าน (ไม่บังคับ)']])stageFields.append(field(label,'editor-stage-'+key,stage[key],value=>{stage[key]=value;mark();renderTabs();imagesMounted=false},key==='instructions'?'textarea':'text'));
  }
  function selectSection(section){
    selectedSection=section;
    for(const [key,panel] of Object.entries(panels)){panel.hidden=key!==section;const tab=document.getElementById('editorTab-'+key);tab.setAttribute('aria-selected',String(key===section));tab.tabIndex=key===section?0:-1}
    if(section==='missions'&&!missionsMounted){renderTabs();renderQuestions();missionsMounted=true}
    if(section==='images'&&!imagesMounted)renderImages();
    body.scrollTop=0;
  }
  function renderTabs(){
    if(adapter.kind==='native'){renderNativeTabs();return}
    if(!tabs.childElementCount)for(const [zone,label] of Object.entries(adapter.zones)){const b=button(label,()=>{if(activeZone===zone)return;activeZone=zone;activeId=draft.questions.find(q=>q.zone===zone).id;workspace.dataset.details='false';renderQuestions()});b.dataset.zone=zone;tabs.append(b)}
    for(const b of tabs.children){b.textContent=draft.presentation.stages[b.dataset.zone].name;b.classList.toggle('active',b.dataset.zone===activeZone);b.setAttribute('aria-pressed',String(b.dataset.zone===activeZone))}
  }
  function move(id,direction){const zone=draft.questions.filter(q=>q.zone===activeZone);const i=zone.findIndex(q=>q.id===id),other=zone[i+direction];if(!other)return;const a=draft.questions.findIndex(q=>q.id===id),b=draft.questions.indexOf(other);[draft.questions[a],draft.questions[b]]=[draft.questions[b],draft.questions[a]];mark();renderQuestions()}
  function addQuestion(copy=false){
    const same=draft.questions.filter(q=>q.zone===activeZone);
    if(activeZone==='service'&&same.length>=6){announce('แผนที่ช่วยเมืองรองรับสูงสุด 6 จุด',true);return}
    if(draft.questions.length>=100){announce('รองรับสูงสุด 100 ภารกิจ',true);return}
    const source=current()||same[0],q=adapter.clone(source);q.id=uid();q.title=copy?source.title+' (สำเนา)':'ภารกิจใหม่';
    draft.questions.splice(draft.questions.indexOf(source)+1,0,q);activeId=q.id;mark();renderQuestions();workspace.dataset.details='true';
  }
  list.addEventListener('click',event=>{
    const action=event.target.closest('button[data-action]'),row=action?.closest('[data-id]');if(!row||!draft)return;
    if(adapter.kind==='native'){if(action.dataset.action==='select'){activeId=row.dataset.id;renderNativeQuestion();workspace.dataset.details='true';for(const item of list.children)item.classList.toggle('active',item.dataset.id===activeId)}return}
    const id=row.dataset.id,q=draft.questions.find(item=>item.id===id);
    if(action.dataset.action==='select'){if(activeId!==id){activeId=id;for(const item of list.children)item.classList.toggle('active',item.dataset.id===id);renderQuestion()}workspace.dataset.details='true';body.scrollTop=0}
    if(action.dataset.action==='up')move(id,-1);
    if(action.dataset.action==='down')move(id,1);
    if(action.dataset.action==='copy'){activeId=id;addQuestion(true)}
    if(action.dataset.action==='delete'){
      if(draft.questions.filter(item=>item.zone===activeZone).length===1){announce('ต้องเหลืออย่างน้อย 1 ภารกิจในแต่ละด่าน',true);return}
      askConfirmation('ยืนยันการลบภารกิจ','ลบภารกิจ “'+q.title+'” หรือไม่?','ลบภารกิจ',()=>{draft.questions=draft.questions.filter(item=>item.id!==id);releaseImages();if(activeId===id)activeId=draft.questions.find(item=>item.zone===activeZone).id;mark();renderQuestions()});
    }
  });
  function renderNavigator(){
    const rows=adapter.kind==='native'?(nativeGroup()?.records||[]):draft.questions.filter(q=>q.zone===activeZone),index=rows.findIndex(row=>row.id===activeId);questionNavigator.replaceChildren();if(index<0)return;
    const choose=id=>{activeId=id;workspace.dataset.details='true';if(adapter.kind==='native')renderNativeQuestion();else renderQuestion();for(const item of list.children)item.classList.toggle('active',item.dataset.id===id)};
    const previous=button('← ก่อนหน้า',()=>choose(rows[index-1].id));previous.disabled=index===0;const next=button('ถัดไป →',()=>choose(rows[index+1].id));next.disabled=index===rows.length-1;
    questionNavigator.append(selectField('เลือกคำถาม / รายการ','editorQuestionJump',rows.map((row,i)=>[row.id,(i+1)+'. '+(row.title||row.label||'รายการ')]),activeId,choose),previous,el('span',{class:'editor-question-position',text:(index+1)+' / '+rows.length}),next);
  }
  function renderQuestions(){
    if(adapter.kind==='native'){renderNativeQuestions();return}
    renderTabs();renderStage();list.replaceChildren();
    const questions=draft.questions.filter(q=>q.zone===activeZone);count.textContent=questions.length+' ภารกิจในด่านนี้';
    for(const [i,q] of questions.entries()){
      const select=el('button',{type:'button',text:(i+1)+'. '+q.title,class:'editor-question-select'});select.dataset.action='select';
      const actions=el('div',{class:'editor-question-actions'});
      for(const [action,text,label,disabled] of [['up','↑','เลื่อนขึ้น',i===0],['down','↓','เลื่อนลง',i===questions.length-1],['copy','⧉','คัดลอกคำถาม',false],['delete','🗑','ลบภารกิจ',false]]){
        const b=el('button',{type:'button',class:'editor-icon'+(action==='delete'?' danger':''),text,disabled,title:label});b.setAttribute('aria-label',label);b.dataset.action=action;actions.append(b)
      }
      const row=el('div',{class:'editor-question-row '+(q.id===activeId?'active':'')},[select,actions]);row.dataset.id=q.id;list.append(row);
    }
    renderQuestion();
  }
  function renderQuestion(){
    if(adapter.kind==='native'){renderNativeQuestion();return}
    details.replaceChildren();const q=current();if(!q)return;renderNavigator();
    details.append(button('← กลับรายการภารกิจ',()=>{workspace.dataset.details='false';body.scrollTop=0},'editor-button editor-back-list'),field('คำถาม / สถานการณ์','editor-question-title',q.title,v=>{q.title=v;mark();const index=draft.questions.filter(x=>x.zone===activeZone).findIndex(x=>x.id===q.id);list.querySelectorAll('.editor-question-select')[index].textContent=(index+1)+'. '+v},'textarea'),imageField('ภาพประกอบคำถาม',q.image,value=>q.image=value,original.questions.find(item=>item.id===q.id)?.image||''));
    const note=q.zone==='shopping'?'2 กลุ่ม • ตอบถูก 1 คะแนน':q.zone==='education'?'เลือก 3 จาก 6 ชิ้น • ถูกชิ้นละ 1 คะแนน':q.zone==='food'?'เลือกสินค้า 3 จาก 6 ชิ้น • กติกาและคะแนนตามโหมดเกมเดิม':'เลือกคำตอบถูก 1 ข้อ • ได้ 1 คะแนน';
    details.append(el('p',{class:'editor-note',text:note}));
    details.append(field('ข้อความประกอบภารกิจ (ไม่บังคับ)','editor-question-hint',q.hint,v=>{q.hint=v;mark()}));
    if(q.zone==='food'){
      details.append(selectField('โหมดซื้อของ','editor-food-mode',[['list','ตามรายการ: กำหนดคำตอบถูก 3 ชิ้น'],['budget','ตามงบ: รวมราคาไม่เกินงบได้ 3 คะแนน'],['plan','วางแผน: เหลือ 0–2 บาทได้ 3, 3–5 ได้ 2, มากกว่า 5 ได้ 1, เกินงบได้ 0']],q.mode,value=>{q.mode=value;mark();renderQuestion()}));
      if(q.mode!=='list')details.append(field('งบประมาณ (บาท)','editor-budget',q.budget,v=>{q.budget=Number(v);mark()},'number'));
    }
    const options=el('div',{class:'editor-options'});
    q.options.forEach((o,i)=>{
      const single=!['education','food'].includes(q.zone);
      const checkbox=el('input',{type:single?'radio':'checkbox',name:'editor-answer-'+q.id,checked:q.zone==='food'&&q.mode!=='list'?false:o.correct,disabled:q.zone==='food'&&q.mode!=='list',onchange:event=>{if(!['education','food'].includes(q.zone))q.options.forEach((x,j)=>x.correct=j===i);else o.correct=event.target.checked;mark();options.querySelectorAll('.editor-answer input').forEach((input,index)=>input.checked=q.options[index].correct)}});
      checkbox.setAttribute('aria-label','คำตอบถูก ตัวเลือก '+(i+1));
      const row=el('section',{class:'editor-option'},[el('label',{class:'editor-answer'},[checkbox,el('span',{text:'คำตอบถูก '+(i+1)})]),field('ข้อความตัวเลือก '+(i+1),'editor-option-'+i,o.label,v=>{o.label=v;mark()}),imageField('ภาพตัวเลือก '+(i+1),o.image,value=>o.image=value,optionOriginalImages.get(o)||'')]);
      if(q.zone==='food')row.append(field('ราคา (บาท)','editor-price-'+i,o.price,v=>{o.price=Number(v);mark()},'number'));
      if(['health','service'].includes(q.zone)){const remove=button('ลบตัวเลือก',()=>{q.options.splice(i,1);releaseImages();mark();renderQuestion()},'editor-button subtle');remove.disabled=q.options.length<=2;row.append(remove)}
      options.append(row);
    });
    details.append(options);
    if(['health','service'].includes(q.zone)){const add=button('+ เพิ่มตัวเลือก',()=>{q.options.push({label:'ตัวเลือกใหม่',image:'',correct:false,price:0});mark();renderQuestion()});add.disabled=q.options.length>=6;details.append(add)}
  }
  function initializeSelection(){
    optionOriginalImages=new WeakMap();for(const q of draft.questions||[]){const base=original.questions.find(item=>item.id===q.id);q.options.forEach((o,i)=>optionOriginalImages.set(o,base?.options[i]?.image||''))}
    if(adapter.kind==='native'){activeZone=adapter.bundle.groups[0]?.id;activeId=adapter.bundle.groups[0]?.records[0]?.id}
    else{activeZone='shopping';activeId=draft.questions.find(q=>q.zone===activeZone).id}
  }
  function nativeGroup(){return adapter.bundle.groups.find(g=>g.id===activeZone)}
  function renderNativeTabs(){
    tabs.replaceChildren();const groups=adapter.bundle.groups;
    if(groups.length>8){tabs.append(selectField('ชุดภารกิจ / ด่าน','nativeGroup',groups.map(g=>[g.id,g.label]),activeZone,value=>{activeZone=value;activeId=nativeGroup().records[0]?.id;workspace.dataset.details='false';renderNativeQuestions()}));return}
    for(const group of groups){const b=button(group.label,()=>{activeZone=group.id;activeId=group.records[0]?.id;workspace.dataset.details='false';renderNativeQuestions()});b.classList.toggle('active',group.id===activeZone);b.setAttribute('aria-pressed',String(group.id===activeZone));tabs.append(b)}
  }
  function renderNativeQuestions(){
    renderNativeTabs();const group=nativeGroup();list.replaceChildren();stageFields.replaceChildren(el('p',{class:'editor-note',text:capabilityNote()}));
    if(!group)return;count.textContent=group.records.length+' รายการในชุดนี้';
    for(const [index,row]of group.records.entries()){
      const f=adapter.bundle.fields.find(f=>f.id===row.fields[0]),label=String(draft.values[f?.id]??row.label).split('\n')[0].slice(0,80),select=button((index+1)+'. '+label,()=>{activeId=row.id;renderNativeQuestion();workspace.dataset.details='true';for(const item of list.children)item.classList.toggle('active',item.dataset.id===row.id)},'editor-question-select');
      const item=el('div',{class:'editor-question-row '+(row.id===activeId?'active':'')},[select]);item.dataset.id=row.id;list.append(item);
    }
    renderNativeQuestion();
  }
  function renderNativeQuestion(){
    details.replaceChildren();const row=nativeGroup()?.records.find(r=>r.id===activeId);if(!row)return;renderNavigator();
    details.append(button('← กลับรายการภารกิจ',()=>{workspace.dataset.details='false';body.scrollTop=0},'editor-button editor-back-list'));
    for(const id of row.fields){const f=adapter.bundle.fields.find(f=>f.id===id),value=draft.values[id],change=v=>{draft.values[id]=v;const rule=f.answerTextRule;if(rule){const index=Number(draft.values[rule.index]);if(Number.isInteger(index)&&index>=0&&index<rule.options.length){const answer=draft.values[rule.options[index]];draft.values[rule.target]=answer;const input=document.getElementById('native-'+rule.target);if(input)input.value=answer;}}mark()};let node;
      if(f.kind==='boolean'){const checkbox=el('input',{id:'native-'+id,type:'checkbox',checked:value,onchange:e=>change(e.target.checked)});node=el('div',{class:'editor-field'},[el('label',{htmlFor:checkbox.id,text:f.label}),checkbox])}
      else if(f.kind==='select')node=selectField(f.label,'native-'+id,f.choices.map(v=>f.choiceLabels?.[v]?[v,f.choiceLabels[v]]:v),value,change);
      else{node=field(f.label,'native-'+id,value,change,f.kind==='number'?'number':'textarea');const input=node.querySelector('input,textarea');if(f.kind==='grid'){input.rows=4;input.inputMode='numeric';input.placeholder='1 0 0 4\n0 4 1 0\n0 1 4 0\n4 0 0 1'}if(f.kind==='number'){input.min=f.min??0;input.max=f.max??100000}}
      node.dataset.nativeField=id;details.append(node);
    }
  }
  function renderNativeImages(){
    const entries=Object.entries(adapter.bundle.assets).map(([key,asset])=>({key,label:asset.label,kind:asset.role||(/หน้าปก|cover/i.test(asset.label+' '+asset.path)?'cover':/พื้นหลัง|background|scene|\bbg\b/i.test(asset.label+' '+asset.path)?'background':/คำถาม|ตัวเลือก|question|option/i.test(asset.label)?'question':'other'),get:()=>draft.assets[key],set:value=>draft.assets[key]=value,original:original.assets[key]}));
    if(!entries.length){imagePanel.replaceChildren(el('p',{class:'editor-note',text:'เกมนี้วาดภาพด้วยโค้ดหรือสัญลักษณ์ แก้เฉพาะ Emoji หรือไอคอนที่รองรับได้ในแท็บคำถาม / ภารกิจ'}));imagesMounted=true;return}renderImageGallery(entries);
  }
  function checked(){return adapter.validate({...draft,meta:{...draft.meta,subject:original.meta.subject,grade:original.meta.grade}})}
  function focusProblem(error){
    if(adapter.kind==='native'){
      if(error.nativeField){const b=adapter.bundle,group=b.groups.find(g=>g.records.some(r=>r.fields.includes(error.nativeField)));if(group){activeZone=group.id;activeId=group.records.find(r=>r.fields.includes(error.nativeField)).id;selectSection('missions');renderNativeQuestions();workspace.dataset.details='true';const input=document.getElementById('native-'+error.nativeField);input?.focus();input?.scrollIntoView({block:'center'})}}
      return;
    }
    if(!error.field&&!error.questionId)return;
    body.inert=false;
    if(error.stageId){activeZone=error.stageId;activeId=draft.questions.find(q=>q.zone===activeZone).id;if(missionsMounted)renderQuestions();}
    if(error.questionId){const q=draft.questions.find(item=>item.id===error.questionId);if(q){const mounted=missionsMounted;activeZone=q.zone;activeId=q.id;selectSection('missions');if(mounted)renderQuestions();workspace.dataset.details='true'}}
    else selectSection(error.field==='รูปภาพ'?'images':['ชื่อด่าน','ข้อความด่าน','คำแนะนำด่าน'].includes(error.field)?'missions':'info');
    const fields={'ชื่อเกม':'editor-title','วิชา':'editor-subject','ระดับชั้น':'editor-grade','หัวข้อ':'editor-topic','คำอธิบายเกม':'editor-description','คำแนะนำ':'editor-instructions','คำชม':'editor-praise','คำถาม':'editor-question-title','ตัวเลือก':'editor-option-0','ชื่อด่าน':'editor-stage-name','ข้อความด่าน':'editor-stage-description','คำแนะนำด่าน':'editor-stage-instructions'};
    let target;
    for(const settings of meta.querySelectorAll('details'))settings.open=true;
    if(error.field==='รูปภาพ'&&error.scene)target=imagePanel.querySelector('[data-scene="'+error.scene+'"] .editor-choose-file');
    else if(error.field==='รูปภาพ')target=Number.isInteger(error.optionIndex)?details.querySelectorAll('.editor-option .editor-choose-file')[error.optionIndex]:panels[selectedSection].querySelector('.editor-choose-file');
    else if(/คำตอบถูก|เฉลย/.test(error.message))target=details.querySelector('.editor-answer input');
    else if(/งบ/.test(error.message))target=document.getElementById('editor-budget');
    else if(error.field==='ราคา')target=document.getElementById('editor-price-'+(error.optionIndex||0));
    else if(error.field==='ตัวเลือก')target=document.getElementById('editor-option-'+(error.optionIndex||0));
    else target=document.getElementById(fields[error.field]);


    target=target||panels[selectedSection].querySelector('input,textarea,button');target?.focus({preventScroll:true});target?.scrollIntoView({block:'center'});
  }
  async function ready(signal){
    const data=checked(),images=adapter.kind==='native'?adapter.images(data).filter(item=>item.value&&item.value!==original.assets[item.scene]):[{value:data.meta.cover,field:'รูปภาพ',scene:'cover'},...['mapBackground','serviceMapBackground','backpackImage'].map(scene=>({value:data.presentation[scene],field:'รูปภาพ',scene})),...Object.entries(data.presentation.stages).map(([scene,stage])=>({value:stage.background,field:'รูปภาพ',scene})),...data.questions.flatMap(q=>[{value:q.image,field:'รูปภาพ',questionId:q.id},...q.options.map((o,optionIndex)=>({value:o.image,field:'รูปภาพ',questionId:q.id,optionIndex}))])].filter(item=>item.value);
    let next=0;
    const worker=async()=>{while(next<images.length){signal.throwIfAborted();const item=images[next++],url=adapter.resolveImage(item.value);try{
      if(!imageChecks.has(url)){const img=new Image();activeImages.add(img);img.src=url;const timer=setTimeout(()=>img.removeAttribute('src'),15000);const promise=img.decode().finally(()=>{clearTimeout(timer);activeImages.delete(img)}).catch(error=>{if(imageChecks.get(url)===promise)imageChecks.delete(url);throw error});imageChecks.set(url,promise)}
      await Promise.race([imageChecks.get(url),new Promise((_,reject)=>{const cancel=()=>reject(signal.reason);signal.addEventListener('abort',cancel,{once:true});imageChecks.get(url).finally(()=>signal.removeEventListener('abort',cancel)).catch(()=>{})})]);
    }catch(error){if(signal.aborted)throw error;throw Object.assign(Error('โหลดภาพไม่ได้ กรุณาเลือกรูปใหม่ก่อนทดลองเล่นหรือดาวน์โหลด'),item)}}};
    await Promise.all(Array.from({length:4},worker));signal.throwIfAborted();return data;
  }
  async function downloadGame(){
    if(operation||pendingImages||!draft)return;
    const controller=new AbortController(),token=session;operation=controller;downloadButton.disabled=true;playButton.disabled=true;resetButton.disabled=true;body.inert=true;
    try{
      announce('กำลังตรวจข้อมูลและรูปภาพ…');const data=await ready(controller.signal);
      await PersonalGameDownload.download(adapter,data,message=>{if(token===session)announce(message)},{signal:controller.signal});
      if(token===session)downloadedSignature=JSON.stringify(draft);
      if(token!==session)return;announce('ส่ง ZIP ให้เบราว์เซอร์แล้ว • แตกไฟล์แล้วเปิด index.html ดูวิธีใช้กล้องในเกม',false,true);
    }catch(error){if(token===session&&!controller.signal.aborted){announce('ดาวน์โหลดไม่สำเร็จ: '+error.message,true);focusProblem(error)}}
    finally{if(operation===controller){operation=null;body.inert=false;downloadButton.disabled=false;playButton.disabled=false;resetButton.disabled=false}}
  }
  function stopPreview(){if(adapter?.kind==='native')try{playPreview.querySelector('iframe')?.contentWindow?.document.getElementById('nativeGameFrame')?.contentWindow?.NativeGameSession?.dispose()}catch{}previewCleanup?.();previewCleanup=null;playPreview.replaceChildren();playPreview.hidden=true;delete dialog.dataset.nativePreview;body.hidden=false;footer.hidden=false;sectionTabs.hidden=false;playButton.focus()}
  async function startPreview(){
    if(operation||pendingImages||!playPreview.hidden||!draft)return;
    const controller=new AbortController(),token=session;operation=controller;playButton.disabled=true;downloadButton.disabled=true;resetButton.disabled=true;body.inert=true;
    try{
      announce('กำลังตรวจข้อมูลและรูปภาพ…');const data=await ready(controller.signal);if(token!==session)return;
      const run=adapter.launch(data),frame=el('iframe',{title:'ทดลองเล่นเกมต้นฉบับด้วยข้อมูลที่แก้ไข',class:'editor-preview-frame'});frame.setAttribute('allow','camera; microphone; autoplay; fullscreen');
      previewCleanup=adapter.connectPreview(frame,run,stopPreview);playPreview.replaceChildren(button('← กลับไปแก้ไข',stopPreview,'editor-button editor-preview-back'),frame);playPreview.hidden=false;dialog.dataset.nativePreview=String(adapter.kind==='native');body.hidden=true;footer.hidden=true;sectionTabs.hidden=true;frame.src=run.url;announce('ทดลองเล่นด้วยเกมเดิม • กลับไปแก้ไขได้');
    }catch(error){if(token===session&&!controller.signal.aborted){announce('ทดลองเล่นไม่ได้: '+error.message,true);focusProblem(error)}}
    finally{if(operation===controller){operation=null;playButton.disabled=false;downloadButton.disabled=false;resetButton.disabled=false;body.inert=false}}
  }
  let closeAuthorized=false;
  function finishClose(){
    if(!dialog.open)return;
    closeAuthorized=true;
    if(closeConfirmation.open)closeConfirmation.close();
    confirmationReturnFocus=null;
    if(!playPreview.hidden)stopPreview();
    session++;downloadedSignature=null;confirmationAction=null;operation?.abort();operation=null;pendingImages=0;loading=false;draft=null;original=null;meta.replaceChildren();details.replaceChildren();list.replaceChildren();tabs.replaceChildren();stageFields.replaceChildren();questionNavigator.replaceChildren();imagePanel.replaceChildren();releaseImages(true);for(const img of activeImages)img.removeAttribute('src');activeImages.clear();imageChecks.clear();clearTimeout(statusTimer);adapter?.dispose?.();
    document.body.style.overflow=pageOverflow;dialog.close();opener?.focus();
  }
  let confirmationReturnFocus=null,lastEditorFocus=null,confirmationAction=null;
  const closeConfirmation=el('dialog',{id:'editorCloseConfirmation',class:'editor-close-confirmation',role:'alertdialog'});
  closeConfirmation.setAttribute('aria-modal','true');closeConfirmation.setAttribute('aria-labelledby','editorCloseConfirmationTitle');closeConfirmation.setAttribute('aria-describedby','editorCloseConfirmationMessage');
  function continueEditing(){
    if(!closeConfirmation.open)return;
    closeConfirmation.close();confirmationAction=null;
    const target=confirmationReturnFocus;confirmationReturnFocus=null;
    if(dialog.open){if(target?.isConnected&&target.getClientRects().length&&!target.disabled&&!target.closest('[inert]'))target.focus({preventScroll:true});else closeButton.focus({preventScroll:true})}
  }
  const continueButton=button('แก้ไขต่อ',continueEditing);continueButton.id='editorContinueEditing';
  const confirmCloseButton=button('ยืนยันการปิด',()=>{const action=confirmationAction;continueEditing();action?.()},'editor-button primary');confirmCloseButton.id='editorConfirmClose';
  closeConfirmation.append(el('h2',{id:'editorCloseConfirmationTitle',text:'ยืนยันการปิดหน้าต่าง'}),el('p',{id:'editorCloseConfirmationMessage',text:'หากปิดหน้าต่างตอนนี้ การเปลี่ยนแปลงทั้งหมดจะหายไป และเมื่อเปิดใหม่จะกลับเป็นเกมต้นฉบับ'}),el('div',{class:'editor-close-confirmation-actions'},[continueButton,confirmCloseButton]));
  closeConfirmation.addEventListener('cancel',event=>{event.preventDefault();event.stopPropagation();continueEditing()});
  closeConfirmation.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    if(event.shiftKey&&document.activeElement===continueButton){event.preventDefault();confirmCloseButton.focus()}
    else if(!event.shiftKey&&document.activeElement===confirmCloseButton){event.preventDefault();continueButton.focus()}
  });
  dialog.addEventListener('focusin',event=>{if(event.target!==dialog)lastEditorFocus=event.target});
  function askConfirmation(title,message,accept,action,cancel='ยกเลิก'){
    if(!dialog.open||closeConfirmation.open)return;confirmationReturnFocus=dialog.contains(document.activeElement)?document.activeElement:lastEditorFocus;confirmationAction=action;
    document.getElementById('editorCloseConfirmationTitle').textContent=title;document.getElementById('editorCloseConfirmationMessage').textContent=message;continueButton.textContent=cancel;confirmCloseButton.textContent=accept;closeConfirmation.showModal();continueButton.focus({preventScroll:true});
  }
  function close(){if(!dialog.open||closeConfirmation.open)return;if(!changed()){finishClose();return}askConfirmation('ยืนยันการปิดหน้าต่าง','หากปิดหน้าต่างตอนนี้ การเปลี่ยนแปลงทั้งหมดจะหายไป และเมื่อเปิดใหม่จะกลับเป็นเกมต้นฉบับ','ยืนยันการปิด',finishClose,'แก้ไขต่อ')}
  function restoreOriginal(){if(!draft||operation)return;askConfirmation('คืนค่าเกมต้นฉบับ','ข้อมูลที่แก้ไขในครั้งนี้ รวมคำถาม เฉลย ข้อความและรูปภาพ จะถูกยกเลิกทั้งหมด','คืนค่าเกมต้นฉบับ',()=>{downloadedSignature=null;draft=adapter.clone(original);releaseImages();imageChecks.clear();initializeSelection();missionsMounted=false;imagesMounted=false;details.replaceChildren();list.replaceChildren();imagePanel.replaceChildren();workspace.dataset.details='false';renderMeta();selectSection(selectedSection);announce('คืนค่าข้อมูลต้นฉบับครบทุกส่วนแล้ว',false,true)})}


  const closeButton=button('×',close,'editor-close');closeButton.id='editorCloseBtn';closeButton.setAttribute('aria-label','ปิดหน้าต่างปรับแต่งเกม');
  const heading=el('header',{class:'editor-heading'},[el('div',{},[el('span',{class:'prompt-version',text:'GAME EDITOR • SHARED • รุ่น 20261017-19'}),el('h2',{id:'editorHeading',text:'⚙️ ปรับแต่งเกม AR Mini City'}),el('p',{text:'แก้ไขเนื้อหาและคำถาม โดยคงรูปแบบการเล่นเดิม'})]),closeButton]);
  const fixedHeading=el('div',{class:'editor-fixed-heading'},[heading,el('p',{class:'editor-session-note',text:'ไม่ต้องมีปุ่มบันทึก แก้ไขแล้วทดลองเล่นและดาวน์โหลดได้ทันที'}),status]);
  const addQuestionButton=button('+ เพิ่มภารกิจ',()=>addQuestion(false));
  const toolbar=el('div',{class:'editor-toolbar'},[el('h3',{text:'จัดการคำถามและคำตอบ'}),count,addQuestionButton]);
  const questionNavigator=el('div',{class:'editor-question-navigator'});
  const workspace=el('div',{class:'editor-workspace'},[list,details]);workspace.dataset.details='false';
  for(const [key,label,content] of [['info','📄 ข้อมูลเกม',[meta]],['missions','📝 คำถาม / ภารกิจ',[toolbar,tabs,stageFields,questionNavigator,workspace]],['images','🖼️ รูปภาพ',[imagePanel,el('p',{class:'editor-note',text:'ภาพคำถามและตัวเลือกแก้ไขได้ในแท็บภารกิจ • JPG/PNG/WebP ภาพละไม่เกิน 750 KB'})]]]){
    const tab=button(label,()=>selectSection(key));tab.id='editorTab-'+key;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','editorPanel-'+key);sectionTabs.append(tab);
    const panel=el('section',{id:'editorPanel-'+key,role:'tabpanel'},content);panel.setAttribute('aria-labelledby',tab.id);panels[key]=panel;body.append(panel);
  }
  sectionTabs.addEventListener('keydown',event=>{const all=[...sectionTabs.children],index=all.indexOf(document.activeElement);let target;if(event.key==='ArrowRight')target=(index+1)%3;if(event.key==='ArrowLeft')target=(index+2)%3;if(event.key==='Home')target=0;if(event.key==='End')target=2;if(target!==undefined){event.preventDefault();all[target].click();all[target].focus()}});
  const playButton=button('▶ ทดลองเล่น',startPreview,'editor-button primary');playButton.id='editorPlayBtn';
  const resetButton=button('🔄 คืนค่าเกมต้นฉบับ',restoreOriginal);resetButton.id='editorResetBtn';
  const downloadButton=button('⬇ ดาวน์โหลดเกม',downloadGame,'editor-button editor-download');downloadButton.id='editorDownloadBtn';
  const footer=el('footer',{class:'editor-footer'},[playButton,resetButton,downloadButton]);footer.setAttribute('aria-label','การทำงานกับเกม');
  dialog.append(fixedHeading,sectionTabs,body,footer,playPreview);
  dialog.setAttribute('aria-labelledby','editorHeading');
  dialog.addEventListener('cancel',event=>{event.preventDefault();if(!playPreview.hidden)stopPreview();else close()});
  dialog.addEventListener('close',()=>{
    const authorized=closeAuthorized;closeAuthorized=false;
    if(dialog.open)return;
    // Keep the same DOM and Working Copy if a native/external close bypassed our close flow.
    // Focus/visibility changes never dispose data, re-render fields or open a new session.
    if(!authorized&&(draft||loading)){
      const target=lastEditorFocus,confirming=closeConfirmation.open;
      if(confirming)closeConfirmation.close();
      dialog.showModal();
      if(confirming){closeConfirmation.showModal();continueButton.focus({preventScroll:true})}
      else if(target?.isConnected&&target.getClientRects().length&&!target.disabled&&!target.closest('[inert]'))target.focus({preventScroll:true});
      return;
    }
    if(closeConfirmation.open)closeConfirmation.close();
    confirmationReturnFocus=null;lastEditorFocus=null;document.body.style.overflow=pageOverflow;
  });
  // Backdrop clicks can be window-activation clicks; only X/Escape request closing.
  document.body.append(dialog,closeConfirmation);
  window.GameEditor={async open(game,button){
    if(loading||dialog.open)return;adapter=GameAdapters.find(game);if(!adapter)return;
    loading=true;downloadedSignature=null;opener=button;session++;const token=session,controller=new AbortController();operation=controller;
    pageOverflow=document.body.style.overflow;document.body.style.overflow='hidden';body.hidden=true;footer.hidden=true;sectionTabs.hidden=true;playPreview.hidden=true;dialog.showModal();announce('กำลังอ่านข้อมูลต้นฉบับของเกม…');
    try{
      const source=await adapter.defaults({signal:controller.signal});if(token!==session)return;
      original=freezeOriginal({...source,meta:{...source.meta,subject:typeof game.category==='string'&&game.category.trim()?game.category:source.meta.subject,grade:LearningOptions.normalizeGrade((typeof game.grade==='string'&&game.grade)||(typeof game.gradeLevel==='string'&&game.gradeLevel)||source.meta.grade),...(adapter.kind==='native'&&game.title?{title:game.title}:{}),description:game.description||source.meta.description}});draft=adapter.clone(original);initializeSelection();
      missionsMounted=false;imagesMounted=false;workspace.dataset.details='false';body.hidden=false;body.inert=false;footer.hidden=false;sectionTabs.hidden=false;playButton.disabled=false;downloadButton.disabled=false;resetButton.disabled=false;addQuestionButton.hidden=adapter.kind==='native';document.getElementById('editorHeading').textContent=adapter.kind==='native'?'⚙️ ปรับแต่งเกม '+game.title:'⚙️ ปรับแต่งเกม AR Mini City';renderMeta();selectSection('info');announce('เริ่มจากต้นฉบับ • ข้อมูลชั่วคราว ไม่บันทึกอัตโนมัติ');body.scrollTop=0;
    }catch(error){if(token===session&&!controller.signal.aborted)announce('เปิดตัวแก้ไขไม่ได้: '+error.message+' • ปิดแล้วลองใหม่',true)}
    finally{if(token===session){loading=false;if(operation===controller)operation=null}}
  }};
})();
