/* VIP entry using the existing local source catalogue. */
window.APP_CONFIG={CATEGORIES:['สังคมศึกษา','ภาษาไทย','คณิตศาสตร์','วิทยาศาสตร์','ภาษาอังกฤษ','สุขศึกษา','ศิลปะ','การงานอาชีพ','วิทยาการคำนวณ','อื่น ๆ']};
(async()=>{
  await window.VipAccess.ready;if(!await window.VipAccess.authorize()){location.replace('index.html');return;}
  const status=document.getElementById('catalogueStatus');
  try{
    const response=await fetch('js/editor-catalogue.json?v=editor-20261016-8',{credentials:'omit',cache:'no-store'});
    if(!response.ok)throw Error('อ่านรายการเกมไม่ได้ กรุณารีเฟรชหน้า');
    const catalogue=await response.json(),container=document.getElementById('editorCatalogue');
    for(const game of catalogue){
      const card=document.createElement('article'),image=document.createElement('img'),heading=document.createElement('h2'),note=document.createElement('p'),button=document.createElement('button');
      image.src='games/'+encodeURIComponent(game.folder)+'/cover.png';image.alt=game.title;image.loading='lazy';image.addEventListener('error',()=>{image.hidden=true;note.textContent+=' • ภาพปกไม่พร้อมใช้งาน'},{once:true});
      heading.textContent=game.title;const adapter=GameAdapters.find(game);button.type='button';button.className='editor-button primary';button.disabled=!adapter;
      const support=window.SharedNativeGames?.statusFor(game);
      button.textContent=adapter?'⚙️ ปรับแต่งเกม':'⚙️ ยังไม่เปิดใช้งาน';note.textContent=adapter?'แก้ไขเนื้อหา ทดลองเล่น และดาวน์โหลดเกมฉบับปรับแต่ง':'กำลังพัฒนา';
      button.addEventListener('click',()=>GameEditor.open(game,button));card.append(image,heading,note,button);container.append(card);
    }
    status.textContent=catalogue.length+' เกม • เปิดใช้เฉพาะ Adapter ที่ผ่านการตรวจและทดสอบ';
  }catch(error){status.textContent=error.message}
})();
