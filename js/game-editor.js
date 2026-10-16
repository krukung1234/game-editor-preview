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
  const body=el('div',{id:'editorBody',class:'editor-body'});
  let pageOverflow='';
  let downloading=false;
  let previewCleanup=null,downloadedSnapshot=null;
  const playPreview=el('div',{class:'editor-play-preview'});playPreview.hidden=true;
  let imageSequence=0;
  const freezeOriginal=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freezeOriginal);Object.freeze(value)}return value};
  const uid=()=>crypto.randomUUID().replaceAll('-','');
  const announce=(message,error=false)=>{status.textContent=message;status.classList.toggle('error',error)};
  const mark=()=>{dirty=JSON.stringify(draft)!==JSON.stringify(original)&&JSON.stringify(draft)!==downloadedSnapshot;announce('กำลังแก้ไขสำเนาชั่วคราว • ทดลองเล่นแล้วดาวน์โหลดก่อนปิดหน้าต่าง')};
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
  async function loadImage(file){
    if(!file)return '';
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>750000)throw Error('ใช้ JPG/PNG/WebP ขนาดไม่เกิน 750 KB ต่อภาพ');
    const value=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('อ่านรูปภาพไม่สำเร็จ'));r.readAsDataURL(file)});
    await new Promise((resolve,reject)=>{const i=new Image();i.onload=resolve;i.onerror=()=>reject(Error('ไฟล์นี้เปิดเป็นรูปภาพไม่ได้'));i.src=value});
    return adapter.image(value);
  }
  function imageField(label,value,change){
    const imageId='editor-image-'+(++imageSequence);
    const caption=el('span',{id:imageId,class:'editor-image-label',text:label});
    const note=el('span',{class:'editor-image-status'});
    const img=el('img',{class:'editor-image',alt:label});
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
      const owner=draft;
      try{
        const selected=event.target.files[0];if(!selected)return;
        const source=await loadImage(selected);
        if(owner!==draft||!dialog.open)return;
        change(source);img.hidden=false;showImage(source);mark();
      }catch(error){if(owner===draft)announce(error.message,true)}finally{event.target.value=''}
    }});
    file.hidden=true;file.setAttribute('aria-label',label);file.setAttribute('aria-labelledby',imageId);
    // No wrapping label, delegated click or change handler can activate this file input.
    const choose=button('เลือกไฟล์',event=>{event.stopPropagation();file.click()},'editor-button subtle editor-choose-file');
    const remove=button('ลบรูปภาพ',()=>{change('');img.hidden=false;showImage('');mark()},'editor-button subtle');
    showImage(value);
    return el('div',{class:'editor-image-field'},[caption,img,note,el('div',{class:'editor-image-actions'},[choose,remove]),file]);
  }
  function renderMeta(){
    meta.replaceChildren();
    for(const [key,label,type] of [['title','ชื่อเกมใหม่'],['topic','หัวข้อบทเรียน'],['description','คำอธิบายเกม','textarea'],['instructions','ข้อความคำแนะนำ','textarea'],['praise','ข้อความคำชม']]){
      const f=field(label,'editor-'+key,draft.meta[key],value=>{draft.meta[key]=value;mark()},type);inputs[key]=f.querySelector('input,textarea');meta.append(f);
    }
    const subjectOptions=[...new Set([...APP_CONFIG.CATEGORIES,'ศิลปะ','ปฐมวัย','การงานอาชีพ','พลศึกษา',draft.meta.subject])];
    const grades=['อนุบาล 1','อนุบาล 2','อนุบาล 3',...Array.from({length:6},(_,i)=>'ป.'+(i+1)),...Array.from({length:6},(_,i)=>'ม.'+(i+1))];if(!grades.includes(draft.meta.grade))grades.push(draft.meta.grade);
    meta.insertBefore(selectField('วิชา','editor-subject',subjectOptions,draft.meta.subject,v=>{draft.meta.subject=v;mark()}),meta.children[1]);
    meta.insertBefore(selectField('ระดับชั้น','editor-grade',grades,draft.meta.grade,v=>{draft.meta.grade=v;mark()}),meta.children[2]);
    for(const id of ['editor-subject','editor-grade']){const select=meta.querySelector('#'+id);const custom=field('ระบุ'+(id==='editor-subject'?'วิชา':'ระดับชั้น')+'เอง',id+'-custom','',value=>{draft.meta[id==='editor-subject'?'subject':'grade']=value;mark()});custom.hidden=true;custom.querySelector('input').maxLength=id==='editor-subject'?100:50;select.append(el('option',{value:'__custom__',text:'อื่น ๆ (ระบุเอง)'}));select.addEventListener('change',()=>{custom.hidden=select.value!=='__custom__';if(!custom.hidden){draft.meta[id==='editor-subject'?'subject':'grade']=custom.querySelector('input').value;custom.querySelector('input').focus()}});select.parentElement.append(custom)}
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
      const remove=button('🗑',()=>{
        if(questions.length===1){announce('ต้องเหลืออย่างน้อย 1 ภารกิจในแต่ละด่าน',true);return}
        if(!confirm('ลบภารกิจ “'+q.title+'” หรือไม่?'))return;
        draft.questions=draft.questions.filter(item=>item.id!==q.id);
        if(activeId===q.id)activeId=draft.questions.find(item=>item.zone===activeZone).id;
        mark();renderQuestions();
      },'editor-icon danger');
      remove.setAttribute('aria-label','ลบภารกิจ');remove.title='ลบภารกิจ';up.title='เลื่อนขึ้น';down.title='เลื่อนลง';
      list.append(el('div',{class:'editor-question-row '+(q.id===activeId?'active':'')},[button((i+1)+'. '+q.title,()=>{activeId=q.id;renderQuestions()},'editor-question-select'),el('div',{class:'editor-question-actions'},[up,down,remove])]));
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
  async function downloadGame(){
    if(downloading)return;
    try{
      const data=checked(),snapshot=JSON.stringify(data);downloading=true;downloadButton.disabled=true;announce('กำลังเตรียมเกมพร้อมรูปและไฟล์ AR… กรุณารอ');
      if(!window.PersonalGameDownload)throw Error('โหลดโมดูลดาวน์โหลดไม่สำเร็จ กรุณารีเฟรชหน้า');
      await PersonalGameDownload.download(adapter,data,message=>announce(message));
      downloadedSnapshot=snapshot;dirty=JSON.stringify(draft)!==JSON.stringify(original)&&JSON.stringify(draft)!==snapshot;announce('ส่งไฟล์ ZIP ให้เบราว์เซอร์แล้ว • ตรวจไฟล์ในโฟลเดอร์ดาวน์โหลด แตกไฟล์ทั้งหมดและอ่าน README-TH.txt'+(dirty?' • มีการแก้ไขเพิ่มหลังเริ่มแพ็ก โปรดลองเล่นและดาวน์โหลดอีกครั้ง':''));
    }catch(error){announce('ดาวน์โหลดไม่สำเร็จ: '+error.message,true)}finally{downloading=false;downloadButton.disabled=false}
  }
  function stopPreview(){previewCleanup?.();previewCleanup=null;playPreview.replaceChildren();playPreview.hidden=true;body.hidden=false;footer.hidden=false;playButton.focus()}
  function startPreview(){try{
    const run=adapter.launch(checked());
    const frame=el('iframe',{title:'ทดลองเล่นเกมต้นฉบับด้วยข้อมูลที่แก้ไข',class:'editor-preview-frame'});frame.setAttribute('allow','camera; microphone; autoplay; fullscreen');
    previewCleanup=adapter.connectPreview(frame,run,stopPreview);
    playPreview.replaceChildren(button('← กลับไปแก้ไข',stopPreview,'editor-button editor-preview-back'),frame);
    playPreview.hidden=false;body.hidden=true;footer.hidden=true;frame.src=run.url;
    announce('ทดลองเล่นด้วยสำเนาชั่วคราว • กดกลับไปแก้ไขเพื่อทำงานต่อ');
  }catch(error){announce('ทดลองเล่นไม่ได้: '+error.message,true)}}
  function close(){
    if(downloading){announce('กำลังจัดไฟล์ กรุณารอให้ดาวน์โหลดเสร็จก่อนปิด',true);return}
    if(dirty&&!confirm('การเปลี่ยนแปลงที่ยังไม่ได้ดาวน์โหลดจะหายไป ต้องการปิดหรือไม่?'))return;
    if(!playPreview.hidden)stopPreview();
    draft=null;original=null;downloadedSnapshot=null;meta.replaceChildren();details.replaceChildren();list.replaceChildren();dirty=false;
    document.body.style.overflow=pageOverflow;dialog.close();opener?.focus();
  }
  function restoreOriginal(){if(!confirm('ต้องการคืนค่าข้อมูลเกมต้นฉบับหรือไม่? การเปลี่ยนแปลงที่ยังไม่ได้ดาวน์โหลดจะหายไป'))return;draft=adapter.clone(original);dirty=false;downloadedSnapshot=null;activeZone='shopping';activeId=draft.questions.find(q=>q.zone===activeZone).id;renderMeta();renderQuestions();body.scrollTop=0;announce('คืนค่าข้อมูลต้นฉบับครบทุกส่วนแล้ว')}
  const closeButton=button('×',close,'editor-close');closeButton.id='editorCloseBtn';closeButton.setAttribute('aria-label','ปิดหน้าต่างปรับแต่งเกม');
  const heading=el('header',{class:'editor-heading'},[el('div',{},[el('span',{class:'prompt-version',text:'GAME EDITOR • MINI CITY • รุ่น 20261016-8'}),el('h2',{id:'editorHeading',text:'⚙️ ปรับแต่งเกม AR Mini City'}),el('p',{text:'แก้เนื้อหา แล้วทดลองเล่นด้วยระบบเกมเดิม'})]),closeButton]);
  const fixedHeading=el('div',{class:'editor-fixed-heading'},[heading,status]);
  body.append(el('p',{class:'editor-note',text:'ต้นฉบับอ่านอย่างเดียว • แก้ไขในหน่วยความจำชั่วคราวเท่านั้น • ทดลองเล่นแล้วดาวน์โหลดก่อนปิดหน้าต่าง • ZIP ประมาณ 100 MB ต้องใช้อินเทอร์เน็ตตอนดาวน์โหลด'}),meta,el('div',{class:'editor-toolbar'},[el('h3',{text:'จัดการคำถามและคำตอบ'}),count,button('+ เพิ่มภารกิจ',()=>{
    const same=draft.questions.filter(q=>q.zone===activeZone);
    if(activeZone==='service'&&same.length>=6){announce('แผนที่ช่วยเมืองรองรับสูงสุด 6 จุด',true);return}
    if(draft.questions.length>=100){announce('รองรับสูงสุด 100 ภารกิจ',true);return}
    const q=adapter.clone(current()||same[0]);q.id=uid();q.title='ภารกิจใหม่';draft.questions.push(q);activeId=q.id;mark();renderQuestions();
  })]),tabs,el('div',{class:'editor-workspace'},[list,details]),preview);
  const playButton=button('▶ ทดลองเล่น',startPreview,'editor-button primary');playButton.id='editorPlayBtn';
  const resetButton=button('🔄 คืนค่าเกมต้นฉบับ',restoreOriginal);resetButton.id='editorResetBtn';
  const downloadButton=button('⬇ ดาวน์โหลดเกม',downloadGame,'editor-button editor-download');downloadButton.id='editorDownloadBtn';
  const footer=el('footer',{class:'editor-footer'},[playButton,resetButton,downloadButton]);footer.setAttribute('aria-label','การทำงานกับเกม');
  dialog.append(fixedHeading,body,footer,playPreview);
  dialog.setAttribute('aria-labelledby','editorHeading');
  dialog.addEventListener('cancel',event=>{event.preventDefault();if(!playPreview.hidden)stopPreview();else close()});
  dialog.addEventListener('close',()=>{if(!dialog.open){document.body.style.overflow=pageOverflow}});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close()}});
  document.body.append(dialog);preview.hidden=true;
  window.GameEditor={async open(game,button){if(loading||dialog.open)return;loading=true;opener=button;adapter=GameAdapters.find(game);if(!adapter){loading=false;return}try{const source=await adapter.defaults();original=freezeOriginal({...source,meta:{...source.meta,description:game.description||source.meta.description}});draft=adapter.clone(original);dirty=false;activeZone='shopping';activeId=draft.questions.find(q=>q.zone===activeZone).id;renderMeta();renderQuestions();preview.hidden=true;downloadedSnapshot=null;body.hidden=false;footer.hidden=false;playPreview.hidden=true;announce('เริ่มจากข้อมูลต้นฉบับ • การเปลี่ยนแปลงจะไม่ถูกบันทึกอัตโนมัติ');pageOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();body.scrollTop=0}catch(error){alert('เปิดตัวแก้ไขไม่ได้: '+error.message)}finally{loading=false}}};
})();
