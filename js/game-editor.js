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
  const sectionTabs=el('div',{class:'editor-section-tabs',role:'tablist'});
  const panels={};let selectedSection='info',missionsMounted=false,imagesMounted=false;
  const imagePanel=el('div',{class:'editor-cover-images'});
  const imageFiles=new Map();let operation=null,session=0,pendingImages=0;
  const imageChecks=new Map(),activeImages=new Set();
  const tabs=el('div',{class:'editor-zones'});
  const body=el('div',{id:'editorBody',class:'editor-body'});
  let pageOverflow='';
  let previewCleanup=null,downloadedSnapshot=null;
  const playPreview=el('div',{class:'editor-play-preview'});playPreview.hidden=true;
  let imageSequence=0;
  const freezeOriginal=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freezeOriginal);Object.freeze(value)}return value};
  const uid=()=>crypto.randomUUID().replaceAll('-','');
  let statusTimer;
  const announce=(message,error=false,temporary=false)=>{clearTimeout(statusTimer);status.textContent=message;status.classList.toggle('error',error);if(temporary)statusTimer=setTimeout(()=>{status.textContent=''},6000)};
  const mark=()=>{dirty=true;announce('กำลังแก้ไขสำเนาชั่วคราว • ทดลองเล่นแล้วดาวน์โหลดก่อนปิดหน้าต่าง')};
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
  function current(){return draft.questions.find(q=>q.id===activeId)}
  function changed(){if(!dirty||!draft)return false;const value=JSON.stringify(draft);return value!==JSON.stringify(original)&&value!==downloadedSnapshot}
  function releaseImages(all=false){const used=all?new Set():new Set([draft?.meta.cover,...(draft?.questions||[]).flatMap(q=>[q.image,...q.options.map(o=>o.image)])]);for(const url of imageFiles.keys())if(!used.has(url)){URL.revokeObjectURL(url);imageFiles.delete(url);imageChecks.delete(url)}}
  async function loadImage(file){
    if(!file)return '';
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>750000)throw Error('ใช้ JPG/PNG/WebP ขนาดไม่เกิน 750 KB ต่อภาพ');
    if([...imageFiles.values()].reduce((sum,blob)=>sum+blob.size,0)+file.size>12000000)throw Error('รูปที่อัปโหลดรวมต้องไม่เกิน 12 MB');
    const url=URL.createObjectURL(file);
    try{const img=new Image();img.src=url;await img.decode();imageFiles.set(url,file);return url}catch{URL.revokeObjectURL(url);throw Error('ไฟล์นี้เปิดเป็นรูปภาพไม่ได้')}
  }

  function imageField(label,value,change){
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
    const choose=button('เลือกไฟล์',event=>{event.stopPropagation();file.click()},'editor-button subtle editor-choose-file');
    const remove=button('ลบรูปภาพ',()=>{change('');releaseImages();img.hidden=false;showImage('');mark()},'editor-button subtle');
    showImage(value);
    return el('div',{class:'editor-image-field'},[caption,img,note,el('div',{class:'editor-image-actions'},[choose,remove]),file]);
  }
  function renderMeta(){
    meta.replaceChildren();
    for(const [key,label,type] of [['title','ชื่อเกมใหม่'],['topic','หัวข้อบทเรียน'],['description','คำอธิบายเกม','textarea'],['instructions','ข้อความคำแนะนำ','textarea'],['praise','ข้อความคำชม']]){
      const f=field(label,'editor-'+key,draft.meta[key],value=>{draft.meta[key]=value;mark()},type);meta.append(f);
    }
    // These controls read shared lists, but selection belongs only to this Working Copy.
    const {subjects,gradeGroups,normalizeGrade}=LearningOptions;
    const subjectBox=el('fieldset',{id:'editor-subject',class:'editor-choice-field'},[el('legend',{text:'วิชา'})]);
    const subjectButtons=el('div',{class:'editor-choice-buttons'});
    let selectedSubject=subjects.includes(draft.meta.subject)?draft.meta.subject:'อื่น ๆ';
    const custom=field('ระบุชื่อวิชา','editor-subject-custom',selectedSubject==='อื่น ๆ'&&draft.meta.subject!=='อื่น ๆ'?draft.meta.subject:'',value=>{draft.meta.subject=value;mark()});
    const customInput=custom.querySelector('input');customInput.maxLength=100;customInput.placeholder='เช่น ดนตรี หรือหน้าที่พลเมือง';
    function updateSubjects(){custom.hidden=selectedSubject!=='อื่น ๆ';customInput.disabled=custom.hidden;for(const b of subjectButtons.children)b.setAttribute('aria-pressed',String(b.dataset.value===selectedSubject))}
    for(const subject of subjects){const b=button(subject,()=>{if(selectedSubject===subject)return;selectedSubject=subject;draft.meta.subject=subject==='อื่น ๆ'?customInput.value:subject;updateSubjects();mark();if(subject==='อื่น ๆ')customInput.focus()});b.dataset.value=subject;subjectButtons.append(b)}
    subjectBox.append(subjectButtons,custom);updateSubjects();
    const gradeBox=el('fieldset',{id:'editor-grade',class:'editor-choice-field'},[el('legend',{text:'ระดับชั้น'})]);
    const groups=el('div',{id:'editorGradeGroups',class:'editor-choice-buttons editor-grade-groups'}),levels=el('div',{id:'editorGradeLevels',class:'editor-choice-buttons'});
    let group=Object.keys(gradeGroups).find(key=>gradeGroups[key].includes(normalizeGrade(draft.meta.grade)))||'ประถมศึกษา';
    function updateGrades(){
      for(const b of groups.children)b.setAttribute('aria-pressed',String(b.dataset.value===group));
      levels.replaceChildren(...gradeGroups[group].map(grade=>{const b=button(grade,()=>{if(normalizeGrade(draft.meta.grade)===grade)return;draft.meta.grade=grade;for(const item of levels.children)item.setAttribute('aria-pressed',String(item.dataset.value===grade));mark()});b.dataset.value=grade;b.setAttribute('aria-pressed',String(normalizeGrade(draft.meta.grade)===grade));return b}));
    }
    for(const name of Object.keys(gradeGroups)){const b=button(name,()=>{if(group===name)return;group=name;draft.meta.grade='';updateGrades();mark()});b.dataset.value=name;groups.append(b)}
    gradeBox.append(groups,levels);updateGrades();
    const title=meta.children[0];title.classList.add('editor-field-wide');meta.insertBefore(subjectBox,meta.children[1]);meta.insertBefore(gradeBox,meta.children[2]);
  }

  function renderImages(){imagePanel.replaceChildren(imageField('ภาพหน้าปกเกม',draft.meta.cover,value=>draft.meta.cover=value),button('↺ คืนภาพต้นฉบับ',()=>{draft.meta.cover=original.meta.cover;releaseImages();mark();renderImages()}));imagesMounted=true}
  function selectSection(section){
    selectedSection=section;
    for(const [key,panel] of Object.entries(panels)){panel.hidden=key!==section;const tab=document.getElementById('editorTab-'+key);tab.setAttribute('aria-selected',String(key===section));tab.tabIndex=key===section?0:-1}
    if(section==='missions'&&!missionsMounted){renderTabs();renderQuestions();missionsMounted=true}
    if(section==='images'&&!imagesMounted)renderImages();
    body.scrollTop=0;
  }
  function renderTabs(){
    if(!tabs.childElementCount)for(const [zone,label] of Object.entries(adapter.zones)){const b=button(label,()=>{if(activeZone===zone)return;activeZone=zone;activeId=draft.questions.find(q=>q.zone===zone).id;workspace.dataset.details='false';renderQuestions()});b.dataset.zone=zone;tabs.append(b)}
    for(const b of tabs.children){b.classList.toggle('active',b.dataset.zone===activeZone);b.setAttribute('aria-pressed',String(b.dataset.zone===activeZone))}
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
    const id=row.dataset.id,q=draft.questions.find(item=>item.id===id);
    if(action.dataset.action==='select'){if(activeId!==id){activeId=id;for(const item of list.children)item.classList.toggle('active',item.dataset.id===id);renderQuestion()}workspace.dataset.details='true';body.scrollTop=0}
    if(action.dataset.action==='up')move(id,-1);
    if(action.dataset.action==='down')move(id,1);
    if(action.dataset.action==='copy'){activeId=id;addQuestion(true)}
    if(action.dataset.action==='delete'){
      if(draft.questions.filter(item=>item.zone===activeZone).length===1){announce('ต้องเหลืออย่างน้อย 1 ภารกิจในแต่ละด่าน',true);return}
      if(!confirm('ลบภารกิจ “'+q.title+'” หรือไม่?'))return;
      draft.questions=draft.questions.filter(item=>item.id!==id);releaseImages();if(activeId===id)activeId=draft.questions.find(item=>item.zone===activeZone).id;mark();renderQuestions();
    }
  });
  function renderQuestions(){
    renderTabs();list.replaceChildren();
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
    details.replaceChildren();const q=current();if(!q)return;
    details.append(button('← กลับรายการภารกิจ',()=>{workspace.dataset.details='false';body.scrollTop=0},'editor-button editor-back-list'),field('คำถาม / สถานการณ์','editor-question-title',q.title,v=>{q.title=v;mark();const index=draft.questions.filter(x=>x.zone===activeZone).findIndex(x=>x.id===q.id);list.querySelectorAll('.editor-question-select')[index].textContent=(index+1)+'. '+v},'textarea'),imageField('ภาพประกอบคำถาม',q.image,value=>q.image=value));
    const note=q.zone==='shopping'?'2 กลุ่ม • ตอบถูก 1 คะแนน':q.zone==='education'?'เลือก 3 จาก 6 ชิ้น • ถูกชิ้นละ 1 คะแนน':q.zone==='food'?'เลือกสินค้า 3 จาก 6 ชิ้น • กติกาและคะแนนตามโหมดเกมเดิม':'เลือกคำตอบถูก 1 ข้อ • ได้ 1 คะแนน';
    details.append(el('p',{class:'editor-note',text:note}));
    if(q.zone==='food'){
      details.append(selectField('โหมดซื้อของ','editor-food-mode',[['list','ตามรายการ: กำหนดคำตอบถูก 3 ชิ้น'],['budget','ตามงบ: รวมราคาไม่เกินงบได้ 3 คะแนน'],['plan','วางแผน: เหลือ 0–2 บาทได้ 3, 3–5 ได้ 2, มากกว่า 5 ได้ 1, เกินงบได้ 0']],q.mode,value=>{q.mode=value;mark();renderQuestion()}),field('คำแนะนำภารกิจ','editor-question-hint',q.hint,v=>{q.hint=v;mark()}));
      if(q.mode!=='list')details.append(field('งบประมาณ (บาท)','editor-budget',q.budget,v=>{q.budget=Number(v);mark()},'number'));
    }
    const options=el('div',{class:'editor-options'});
    q.options.forEach((o,i)=>{
      const checkbox=el('input',{type:'checkbox',checked:q.zone==='food'&&q.mode!=='list'?false:o.correct,disabled:q.zone==='food'&&q.mode!=='list',onchange:event=>{if(!['education','food'].includes(q.zone))q.options.forEach((x,j)=>x.correct=j===i&&event.target.checked);else o.correct=event.target.checked;mark();options.querySelectorAll('.editor-answer input').forEach((input,index)=>input.checked=q.options[index].correct)}});
      checkbox.setAttribute('aria-label','คำตอบถูก ตัวเลือก '+(i+1));
      const row=el('section',{class:'editor-option'},[el('label',{class:'editor-answer'},[checkbox,el('span',{text:'คำตอบถูก '+(i+1)})]),field('ข้อความตัวเลือก '+(i+1),'editor-option-'+i,o.label,v=>{o.label=v;mark()}),imageField('ภาพตัวเลือก '+(i+1),o.image,value=>o.image=value)]);
      if(q.zone==='food')row.append(field('ราคา (บาท)','editor-price-'+i,o.price,v=>{o.price=Number(v);mark()},'number'));
      if(['health','service'].includes(q.zone)){const remove=button('ลบตัวเลือก',()=>{q.options.splice(i,1);releaseImages();mark();renderQuestion()},'editor-button subtle');remove.disabled=q.options.length<=2;row.append(remove)}
      options.append(row);
    });
    details.append(options);
    if(['health','service'].includes(q.zone)){const add=button('+ เพิ่มตัวเลือก',()=>{q.options.push({label:'ตัวเลือกใหม่',image:'',correct:false,price:0});mark();renderQuestion()});add.disabled=q.options.length>=6;details.append(add)}
  }
  function checked(){return adapter.validate(draft)}
  function focusProblem(error){
    if(!error.field&&!error.questionId)return;
    body.inert=false;
    if(error.questionId){const q=draft.questions.find(item=>item.id===error.questionId);if(q){const mounted=missionsMounted;activeZone=q.zone;activeId=q.id;selectSection('missions');if(mounted)renderQuestions();workspace.dataset.details='true'}}
    else selectSection(error.field==='รูปภาพ'?'images':'info');
    const fields={'ชื่อเกม':'editor-title','วิชา':'editor-subject','ระดับชั้น':'editor-grade','หัวข้อ':'editor-topic','คำอธิบายเกม':'editor-description','คำแนะนำ':'editor-instructions','คำชม':'editor-praise','คำถาม':'editor-question-title','ตัวเลือก':'editor-option-0'};
    let target;
    if(error.field==='รูปภาพ')target=Number.isInteger(error.optionIndex)?details.querySelectorAll('.editor-option .editor-choose-file')[error.optionIndex]:panels[selectedSection].querySelector('.editor-choose-file');
    else if(/คำตอบถูก|เฉลย/.test(error.message))target=details.querySelector('.editor-answer input');
    else if(/งบ/.test(error.message))target=document.getElementById('editor-budget');
    else if(error.field==='ราคา')target=document.getElementById('editor-price-'+(error.optionIndex||0));
    else if(error.field==='ตัวเลือก')target=document.getElementById('editor-option-'+(error.optionIndex||0));
    else target=document.getElementById(fields[error.field]);
    if(target?.id==='editor-subject')target=!document.getElementById('editor-subject-custom').disabled?document.getElementById('editor-subject-custom'):target.querySelector('button');
    if(target?.id==='editor-grade')target=document.querySelector('#editorGradeLevels button');
    target=target||panels[selectedSection].querySelector('input,textarea,button');target?.focus({preventScroll:true});target?.scrollIntoView({block:'center'});
  }
  async function ready(signal){
    const data=checked(),images=[{value:data.meta.cover,field:'รูปภาพ'},...data.questions.flatMap(q=>[{value:q.image,field:'รูปภาพ',questionId:q.id},...q.options.map((o,optionIndex)=>({value:o.image,field:'รูปภาพ',questionId:q.id,optionIndex}))])].filter(item=>item.value);
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
      announce('กำลังตรวจข้อมูลและรูปภาพ…');const data=await ready(controller.signal),snapshot=JSON.stringify(draft);
      await PersonalGameDownload.download(adapter,data,message=>{if(token===session)announce(message)},{signal:controller.signal});
      if(token!==session)return;downloadedSnapshot=snapshot;dirty=false;announce('ส่ง ZIP ให้เบราว์เซอร์แล้ว • แตกไฟล์แล้วเปิด index.html ดูวิธีใช้กล้องในเกม',false,true);
    }catch(error){if(token===session&&!controller.signal.aborted){announce('ดาวน์โหลดไม่สำเร็จ: '+error.message,true);focusProblem(error)}}
    finally{if(operation===controller){operation=null;body.inert=false;downloadButton.disabled=false;playButton.disabled=false;resetButton.disabled=false}}
  }
  function stopPreview(){previewCleanup?.();previewCleanup=null;playPreview.replaceChildren();playPreview.hidden=true;body.hidden=false;footer.hidden=false;sectionTabs.hidden=false;playButton.focus()}
  async function startPreview(){
    if(operation||pendingImages||!playPreview.hidden||!draft)return;
    const controller=new AbortController(),token=session;operation=controller;playButton.disabled=true;downloadButton.disabled=true;resetButton.disabled=true;body.inert=true;
    try{
      announce('กำลังตรวจข้อมูลและรูปภาพ…');const data=await ready(controller.signal);if(token!==session)return;
      const run=adapter.launch(data),frame=el('iframe',{title:'ทดลองเล่นเกมต้นฉบับด้วยข้อมูลที่แก้ไข',class:'editor-preview-frame'});frame.setAttribute('allow','camera; microphone; autoplay; fullscreen');
      previewCleanup=adapter.connectPreview(frame,run,stopPreview);playPreview.replaceChildren(button('← กลับไปแก้ไข',stopPreview,'editor-button editor-preview-back'),frame);playPreview.hidden=false;body.hidden=true;footer.hidden=true;sectionTabs.hidden=true;frame.src=run.url;announce('ทดลองเล่นด้วยเกมเดิม • กลับไปแก้ไขได้');
    }catch(error){if(token===session&&!controller.signal.aborted){announce('ทดลองเล่นไม่ได้: '+error.message,true);focusProblem(error)}}
    finally{if(operation===controller){operation=null;playButton.disabled=false;downloadButton.disabled=false;resetButton.disabled=false;body.inert=false}}
  }
  function close(){
    if(changed()&&!confirm('ข้อมูลที่ปรับแต่งไว้จะหายไปหากปิดหน้าต่าง ต้องการปิดหรือไม่?'))return;
    if(!playPreview.hidden)stopPreview();
    session++;operation?.abort();operation=null;pendingImages=0;loading=false;draft=null;original=null;downloadedSnapshot=null;meta.replaceChildren();details.replaceChildren();list.replaceChildren();tabs.replaceChildren();imagePanel.replaceChildren();releaseImages(true);for(const img of activeImages)img.removeAttribute('src');activeImages.clear();imageChecks.clear();dirty=false;clearTimeout(statusTimer);
    document.body.style.overflow=pageOverflow;dialog.close();opener?.focus();
  }
  function restoreOriginal(){if(!draft||!confirm('ต้องการคืนค่าข้อมูลเกมต้นฉบับหรือไม่? การเปลี่ยนแปลงที่ยังไม่ได้ดาวน์โหลดจะหายไป'))return;operation?.abort();operation=null;draft=adapter.clone(original);releaseImages();imageChecks.clear();dirty=false;downloadedSnapshot=null;activeZone='shopping';activeId=draft.questions.find(q=>q.zone===activeZone).id;missionsMounted=false;imagesMounted=false;details.replaceChildren();list.replaceChildren();imagePanel.replaceChildren();workspace.dataset.details='false';renderMeta();selectSection(selectedSection);announce('คืนค่าข้อมูลต้นฉบับครบทุกส่วนแล้ว',false,true)}

  const closeButton=button('×',close,'editor-close');closeButton.id='editorCloseBtn';closeButton.setAttribute('aria-label','ปิดหน้าต่างปรับแต่งเกม');
  const heading=el('header',{class:'editor-heading'},[el('div',{},[el('span',{class:'prompt-version',text:'GAME EDITOR • MINI CITY • รุ่น 20261016-10'}),el('h2',{id:'editorHeading',text:'⚙️ ปรับแต่งเกม AR Mini City'}),el('p',{text:'แก้เนื้อหา แล้วทดลองเล่นด้วยระบบเกมเดิม'})]),closeButton]);
  const fixedHeading=el('div',{class:'editor-fixed-heading'},[heading,status]);
  const toolbar=el('div',{class:'editor-toolbar'},[el('h3',{text:'จัดการคำถามและคำตอบ'}),count,button('+ เพิ่มภารกิจ',()=>addQuestion(false))]);
  const workspace=el('div',{class:'editor-workspace'},[list,details]);workspace.dataset.details='false';
  for(const [key,label,content] of [['info','📄 ข้อมูลเกม',[meta]],['missions','📋 ภารกิจ',[toolbar,tabs,workspace]],['images','🖼️ รูปภาพ',[imagePanel,el('p',{class:'editor-note',text:'ภาพคำถามและตัวเลือกแก้ไขได้ในแท็บภารกิจ • JPG/PNG/WebP ภาพละไม่เกิน 750 KB'})]]]){
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
  dialog.addEventListener('close',()=>{if(!dialog.open){document.body.style.overflow=pageOverflow}});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close()}});
  document.body.append(dialog);
  window.GameEditor={async open(game,button){
    if(loading||dialog.open)return;adapter=GameAdapters.find(game);if(!adapter)return;
    loading=true;opener=button;session++;const token=session,controller=new AbortController();operation=controller;
    pageOverflow=document.body.style.overflow;document.body.style.overflow='hidden';body.hidden=true;footer.hidden=true;sectionTabs.hidden=true;playPreview.hidden=true;dialog.showModal();announce('กำลังอ่านข้อมูลต้นฉบับของเกม…');
    try{
      const source=await adapter.defaults({signal:controller.signal});if(token!==session)return;
      original=freezeOriginal({...source,meta:{...source.meta,description:game.description||source.meta.description}});draft=adapter.clone(original);dirty=false;activeZone='shopping';activeId=draft.questions.find(q=>q.zone===activeZone).id;
      downloadedSnapshot=null;missionsMounted=false;imagesMounted=false;workspace.dataset.details='false';body.hidden=false;body.inert=false;footer.hidden=false;sectionTabs.hidden=false;playButton.disabled=false;downloadButton.disabled=false;resetButton.disabled=false;renderMeta();selectSection('info');announce('เริ่มจากต้นฉบับ • ข้อมูลชั่วคราว ไม่บันทึกอัตโนมัติ');body.scrollTop=0;
    }catch(error){if(token===session&&!controller.signal.aborted)announce('เปิดตัวแก้ไขไม่ได้: '+error.message+' • ปิดแล้วลองใหม่',true)}
    finally{if(token===session){loading=false;if(operation===controller)operation=null}}
  }};
})();
