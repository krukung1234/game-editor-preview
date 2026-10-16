/* Explicit bridge into Mini City's native data, renderers, scoring and hand tracking. */
(() => {
  'use strict';
  const adapter=GameAdapters.get('mini-city');
  const nativeImage=value=>value?'games/AR mini city/'+value:'';
  function fromNative(api) {
    const d=api.data,option=(label,img,correct=false,price=0)=>({label,image:nativeImage(img),correct,price});
    const make=(zone,i,title,img,options,extra={})=>({id:zone+'-'+i,zone,title,image:nativeImage(img),hint:'',mode:'single',budget:0,options,...extra});
    const questions=[];
    d.commerce.forEach((q,i)=>questions.push(make('shopping',i,q.name,q.img,[option('สินค้า','',q.type==='สินค้า'),option('บริการ','',q.type==='บริการ')])));
    d.health.forEach((q,i)=>questions.push(make('health',i,q.title,q.img,q.options.map(id=>option(api.healthChoices[id].label,api.healthChoices[id].img,id===q.answer)))));
    d.education.forEach((q,i)=>questions.push(make('education',i,q.title,q.scene,q.items.map(name=>option(name,api.productByName(name)[1],q.targets.includes(name))))));
    d.food.forEach((q,i)=>questions.push(make('food',i,q.title,'',q.items.map(o=>option(o.name,o.img,(q.targets||[]).includes(o.name),o.price)),{mode:q.mode,budget:q.budget||0,hint:q.hint})));
    d.services.forEach((q,i)=>questions.push(make('service',i,q.problem,q.img,Object.entries(d.serviceChoices).map(([id,o])=>option(o.label,o.img,id===q.answer)))));
    return {schemaVersion:1,adapterId:'mini-city',meta:{title:'AR Mini City สินค้าและบริการ',subject:'สังคมศึกษา',grade:'ป.1',topic:'สินค้าและบริการ',instructions:'คลิกหรือแตะตัวเลือก หรือเปิดกล้องแล้วชี้นิ้วค้างที่ปุ่ม 3 วินาที',praise:'เก่งมาก! ไปต่อกันเลย',cover:'games/AR mini city/cover.png'},questions};
  }
  window.MiniCityAdapter={attach(api){
    adapter.nativeDefaults=fromNative(api);
    const packaged=window.MiniCityPersonalGame;
    const query=new URLSearchParams(location.search);
    if(!packaged&&query.get('editor')!=='mini-city')return;
    let data;
    try{
      if(packaged)data=adapter.validate(packaged.data);
      else if(query.has('draft')){const raw=sessionStorage.getItem(adapter.runKey),snapshot=raw?JSON.parse(raw):null;if(!snapshot||snapshot.id!==query.get('draft'))throw Error('ไม่พบฉบับทดลองเล่นในแท็บนี้ กรุณากลับไปเปิดจากตัวแก้ไขเกม');data=adapter.validate(snapshot.data)}
      else{const raw=localStorage.getItem(adapter.runKey);if(!raw)throw Error('ไม่พบข้อมูลทดลองเล่นในเบราว์เซอร์นี้ กรุณาเปิดจากหน้าปรับแต่งเกม');data=adapter.validate(JSON.parse(raw))}
    }
    catch(error){api.showError(error.message);return}
    if(packaged&&window.Hands){
      const NativeHands=window.Hands;
      window.Hands=class extends NativeHands{constructor(options){super({...options,locateFile:file=>new URL('../../vendor/mediapipe/hands/'+file,document.baseURI).href})}};
    }
    const zoneQuestions=z=>data.questions.filter(q=>q.zone===z);
    const names=new Map(),assets=new Map();
    const token=(q,i)=>'MCX_'+q.id+'_'+i+'_X';
    const remember=(id,label,img)=>{names.set(id,label);assets.set(id,adapter.resolveImage(img));return id};
    const translate=value=>{let s=String(value);for(const [id,label] of names)s=s.split(id).join(label);return s};
    const title=q=>remember(token(q,'title'),q.title,q.image);
    const opts=q=>q.options.map((o,i)=>({id:remember(token(q,i),o.label,o.image),...o}));
    // Native renderers receive internal keys, never user HTML. Labels are restored via text nodes.
    api.data.commerce=zoneQuestions('shopping').map(q=>({name:title(q),img:adapter.resolveImage(q.image),type:q.options[0].correct?'สินค้า':'บริการ'}));
    api.data.health=zoneQuestions('health').map(q=>{const options=opts(q);for(const o of options)api.healthChoices[o.id]={label:o.id,img:adapter.resolveImage(o.image)};return {title:title(q),img:adapter.resolveImage(q.image),options:options.map(o=>o.id),answer:options.find(o=>o.correct).id}});
    api.data.education=zoneQuestions('education').map(q=>{const options=opts(q);return {title:title(q),scene:adapter.resolveImage(q.image),items:options.map(o=>o.id),targets:options.filter(o=>o.correct).map(o=>o.id)}});
    api.data.food=zoneQuestions('food').map(q=>{const options=opts(q);return {title:title(q),label:{list:'ซื้อของตามรายการ',budget:'ซื้อของตามงบ',plan:'นักช้อปวางแผนเก่ง'}[q.mode],hint:remember(token(q,'hint'),q.hint||data.meta.instructions,''),mode:q.mode,budget:q.budget,pickCount:3,items:options.map(o=>({name:o.id,img:adapter.resolveImage(o.image),price:o.price})),targets:options.filter(o=>o.correct).map(o=>o.id)}});
    api.data.serviceChoices={};
    api.data.services=zoneQuestions('service').map((q,i)=>{const options=opts(q);for(const o of options)api.data.serviceChoices[o.id]={label:o.id,img:adapter.resolveImage(o.image)};return {number:i+1,problem:title(q),img:adapter.resolveImage(q.image),answer:options.find(o=>o.correct).id,left:(18+(i%3)*31)+'%',top:(i<3?38:72)+'%'}});
    for(const [z,def] of Object.entries(api.zoneDefs))def.count=zoneQuestions(z).length;
    function fixText(node){
      const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);const texts=[];while(walker.nextNode())texts.push(walker.currentNode);for(const n of texts)n.textContent=translate(n.textContent);
      node.querySelectorAll('img').forEach(img=>{img.alt=translate(img.alt);if(!img.getAttribute('src'))img.hidden=true});
    }
    function qImage(card,q){if(!q.image)return;const img=document.createElement('img');img.className='editor-question-image';img.src=adapter.resolveImage(q.image);img.alt=q.title;card.prepend(img)}
    const original=api.functions;
    const current=()=>zoneQuestions(api.getRound().zone)[api.getRound().index];
    const render=(name,after)=>(card)=>{original[name](card);after?.(card);fixText(card)};
    api.install({
      productByName(name){return assets.has(name)?[name,assets.get(name)]:original.productByName(name)},
      prepareZone(){original.prepareZone();const r=api.getRound();r.total=zoneQuestions(r.zone).length;if(r.zone==='shopping')r.commerce=api.data.commerce;if(r.zone==='health')r.health=api.data.health;if(r.zone==='education')r.education=api.data.education},
      renderCommerce:render('renderCommerce',card=>{const q=current();card.querySelector('.question').textContent=q.title;card.querySelectorAll('.category-target').forEach((b,i)=>{b.querySelector('b').textContent=q.options[i].label;b.querySelector('small').textContent=''});}),
      renderHealth:render('renderHealth',card=>qImage(card,current())),
      renderEducation:render('renderEducation',card=>{if(api.getRound().educationRevealed){const p=document.createElement('p');p.textContent=data.meta.praise;card.append(p)}}),
      renderFood:render('renderFood',card=>{qImage(card,current());if(api.getRound().foodRevealed){const p=document.createElement('p');p.textContent=data.meta.praise;card.append(p)}}),
      renderServiceMission:render('renderServiceMission',card=>{const r=api.getRound();card.querySelector('.question').textContent='ช่วยเมืองให้ครบ '+r.total+' จุด!';const active=r.serviceSelected;const qs=zoneQuestions('service');const allowed=new Set(active===null?[]:qs[active].options.map((_,i)=>token(qs[active],i)));card.querySelectorAll('.service-card').forEach(b=>{if(!allowed.has(b.dataset.choice))b.remove()});if(active!==null){const popup=card.querySelector('.mission-popup');if(popup)qImage(popup,qs[active])}}),
      setFeedback(text){original.setFeedback(translate(text))},
      showAnswerFeedback(options){const answer=api.getRound().zone==='shopping'?current().title+': '+current().options.find(o=>o.correct).label:translate(options.correctText);original.showAnswerFeedback({...options,correctText:answer});document.getElementById('sideScore').textContent=api.getRound().score+' คะแนน';if(options.correct)document.getElementById('answerTitle').textContent=data.meta.praise},
      help(){original.help();const p=document.createElement('p');p.textContent=data.meta.instructions;document.getElementById('modalBox').prepend(p)},
      saveState(){try{if(packaged)localStorage.setItem('mini-city-personal.'+packaged.id+'.progress',JSON.stringify(api.getState()));else sessionStorage.setItem(adapter.runKey+'.progress',JSON.stringify(api.getState()))}catch{}}
    });
    api.setState({stars:0,completed:[],unlocked:1});
    const responsive=document.createElement('link');responsive.rel='stylesheet';responsive.href=new URL('../../css/mini-city-editor-play.css?v=editor-2',document.baseURI).href;document.head.append(responsive);
    document.title=data.meta.title;
    const cover=document.querySelector('#coverScreen .bg');if(cover){if(data.meta.cover)cover.src=adapter.resolveImage(data.meta.cover);else{cover.removeAttribute('src');cover.hidden=true}}
    const badge=document.createElement('div');badge.className='editor-game-title';badge.textContent=data.meta.title+' • '+data.meta.subject+' '+data.meta.grade+' • '+data.meta.topic;document.querySelector('#coverScreen').append(badge);
    const instructions=document.createElement('small');instructions.style.cssText='display:block;margin-top:6px;font-size:13px;line-height:1.5';instructions.textContent=data.meta.instructions;badge.append(instructions);
    if(data.meta.description){const description=document.createElement('small');description.style.cssText='display:block;margin-top:6px;font-size:13px;line-height:1.5';description.textContent=data.meta.description;badge.append(description)}
    // The native button already holds the original help callback; append after it renders.
    document.getElementById('helpBtn').addEventListener('click',()=>{const p=document.createElement('p');p.textContent=data.meta.instructions;document.getElementById('modalBox').prepend(p)});
    const back=document.createElement('a');back.href='../../index.html';back.className='editor-return';back.textContent=packaged?'← หน้าหลักเกมของฉัน':'← กลับหน้าหลัก / ปรับแต่ง';document.body.append(back);
    const style=document.createElement('style');style.textContent='.editor-game-title{position:absolute;top:3%;left:10%;right:10%;z-index:15;padding:10px;border-radius:16px;text-align:center;background:#fffef5ed;color:#164f7a;font-weight:bold}.editor-question-image{max-width:28%;max-height:90px;object-fit:contain;flex-shrink:0}.mission-popup .editor-question-image{max-width:80%;max-height:80px}';document.head.append(style);
    const feedback=document.getElementById('feedback');feedback.style.setProperty('--editor-praise',JSON.stringify(data.meta.praise));style.textContent+='body .feedback::after{content:var(--editor-praise)}.editor-return{position:fixed;bottom:6px;right:8px;z-index:95;background:#fff;color:#164f7a;padding:6px 12px;border-radius:16px;font-size:12px;text-decoration:none}';
    api.renderMap();
  }};
})();
