# Krukung Game Hub: ตรวจและแก้ Prompt ใน game-editor-preview

## Repository และสิ่งที่พบ

- สำเนาที่ทำงาน: `outputs/game-editor-preview`
- Remote: https://github.com/krukung1234/game-editor-preview.git
- ฐาน commit: `916eef836d3a605923a53e8e2a2f5ed10758f007`
- Branch ที่แก้: `development/prompt-customizer`
- ไม่มี commit, push, merge หรือแก้ repository เว็บไซต์หลัก
- เมื่อตรวจครั้งนี้ ทั้ง repository และ HTML/JS/CSS ที่ https://krukung1234.github.io/game-editor-preview/ มีระบบฟอร์มใหม่อยู่แล้ว รุ่น asset `20261016-1` ดังนั้นยังไม่มีหลักฐานว่าปัญหาเกิดจากโค้ดฟอร์มหาย และยังยืนยันสาเหตุที่เครื่องผู้ใช้เห็น Popup เก่าไม่ได้ ควรตรวจ URL, HTML ที่ browser ได้รับ และ cache ตามขั้นตอนด้านล่าง

## ไฟล์ที่แก้

1. `index.html`: คงฟอร์มวิชา ระดับชั้น ชื่อเกมใหม่ หัวข้อ เนื้อหา ปุ่มสร้าง/คัดลอก เพิ่มป้ายรุ่น `20261016-2` และ data-prompt-version เพื่อระบุ HTML ที่เปิดอยู่ เปลี่ยน JS/CSS URL เป็น `?v=prompt-20261016-2` พร้อมคำแนะนำและช่องผลลัพธ์ที่อ่านง่าย
2. `js/app.js`: เมื่อเปิด Popup ให้กลับไปส่วนต้นฟอร์มทุกครั้ง ไม่เปิดค้างตำแหน่งล่างที่ดูเหมือน Popup เดิม ใช้ชื่อเกมจากข้อมูลต้นฉบับขณะประกอบ Prompt และปรับรายการ focus ให้ข้ามช่อง disabled คงระบบประกอบข้อความเดิมและการคัดลอกพร้อม fallback
3. `css/style.css`: เพิ่มป้ายรุ่น กล่องฟอร์ม สี ระยะห่าง ช่องกรอก และการจัดแสดงบนมือถือ คงหน้าตา Hub และการ์ดเดิม

Prompt ที่ประกอบมีข้อมูลแบบฟอร์มกับ `game.prompt` จากการอ่าน Firestore เดิม ระบุให้รักษา UI/UX, AR, กล้อง, Hand Tracking, ภารกิจ, คะแนน, เสียง และเอฟเฟกต์เท่าที่ต้นฉบับมี ไม่มีคำสั่งเขียนหรือเปลี่ยนข้อมูล Firebase

## ผลทดสอบ

ผ่าน `node --check js/app.js` และ `git diff --check`

ทดสอบจริงด้วย Chrome headless ผ่าน localhost โดยใช้ config.js และ app.js จริง แต่แทน Firebase SDK ด้วยข้อมูลจำลอง 31 เกม ปิดการเข้าถึงบริการภายนอกในการทดสอบ:

- VIP รหัสผิด/ถูก, จำการเข้าสู่ระบบหลัง reload และ logout
- การ์ด 31 เกม, หมวดหมู่, ค้นหา, สถานะเร็ว ๆ นี้, ปุ่ม Prompt เฉพาะเกมที่มีข้อมูล และลิงก์เล่นเกม/Admin
- เปิดฟอร์มจากปุ่มบนการ์ดและเลือกชั้นได้ 15 ระดับ ตั้งแต่อนุบาล 1 ถึง ม.6
- ฟอร์มว่างถูกปฏิเสธ และสร้างข้อความพร้อม Prompt ต้นฉบับ/วิชา/ชั้น/หัวข้อ/เนื้อหาได้
- คัดลอกผ่าน Clipboard API แล้วอ่าน clipboard กลับมาเทียบข้อความตรงกัน (ปรับเฉพาะรูปแบบ newline ของ Windows ในการเทียบ)
- จำลอง Clipboard API ถูกปฏิเสธ ทดสอบ fallback สำเร็จและล้มเหลว แสดงสถานะถูกต้อง
- เปลี่ยนฟอร์มหรือเปิดเกมใหม่แล้วล้างข้อความเก่าและปิดปุ่มคัดลอกจนกว่าจะสร้างใหม่
- ปิดด้วย ×, ปุ่มปิด, Escape และพื้นหลัง รวมถึง Tab/Shift+Tab และคืน focus
- จอ 375×812, 768×1024, 1440×1000: ฟอร์มไม่ล้นแนวนอน เลื่อนใช้ปุ่มได้ และเปิด Popup จากด้านบน
- เบราว์เซอร์เรียก app.js และ style.css รุ่น `prompt-20261016-2` จริง
- JavaScript/console errors: 0; external writes: 0
- Git diff เปลี่ยนเฉพาะสามไฟล์ข้างต้น ไม่มี diff ใน games/ ทั้ง 31 โฟลเดอร์, js/admin.js, js/config.js, admin.html และ game-player.html

ข้อจำกัด: ไม่ทดสอบ Firestore สดและการเล่นภายในเกม AR ทั้ง 31 เกม ระบบ Admin ตรวจว่าลิงก์และโค้ดเดิมไม่เปลี่ยน ไม่ได้ทดสอบการเขียนข้อมูลผ่าน Admin

ดูผลแบบ machine-readable ใน `preview-test-results.json` และภาพ `prompt-mobile.png` / `prompt-desktop.png`

## Commit และ Push ด้วยตนเอง

เปิด terminal ในโฟลเดอร์ `game-editor-preview` ที่ส่งให้ ตรวจ remote และ branch ก่อน:

```powershell
git remote -v
git branch --show-current
git diff --stat
git diff --check
git diff -- index.html js/app.js css/style.css
```

Remote ต้องเป็น `krukung1234/game-editor-preview.git` และ branch ต้องเป็น `development/prompt-customizer` เมื่อพร้อมจึงสั่งด้วยตนเอง:

```powershell
git add -- index.html js/app.js css/style.css
git commit -m "Improve prompt customization dialog and refresh asset versions"
git push -u origin development/prompt-customizer
```

หากใช้ repository ที่ clone ไว้เดิมแทนสำเนาที่ส่งให้ ให้สร้าง branch พัฒนาก่อน (`git switch -c development/prompt-customizer`) แล้วคัดลอกเฉพาะสามไฟล์จากแพ็กเกจไปแทนให้ตรงตำแหน่ง

การ push branch พัฒนาไม่ทำให้ GitHub Pages เปลี่ยนอัตโนมัติ หาก Pages ยังตั้งให้ deploy จาก main ให้ตรวจ Settings → Pages และ workflow ใน repository preview แล้วเลือกวิธีเผยแพร่ branch นี้ หรือเปิด PR ไปยัง main ของ game-editor-preview เพื่อตรวจและ merge เอง ห้ามทำใน repository เว็บไซต์หลัก

## ตรวจหลังเผยแพร่และ Browser Cache

1. รอ deployment ของ game-editor-preview สำเร็จ และตรวจ branch/โฟลเดอร์ที่ใช้เผยแพร่ให้ตรงกับไฟล์ที่แก้
2. เปิด URL ที่มี `/game-editor-preview/` เช่น https://krukung1234.github.io/game-editor-preview/?prompt-release=20261016-2
3. ใช้ Ctrl+Shift+R หรือเปิดหน้าต่าง Incognito แล้วเข้าสู่ VIP กด 📋 Prompt ต้องเห็นป้าย “รุ่น 20261016-2” พร้อมฟอร์ม
4. ถ้ายังเห็นของเก่า เปิด DevTools → Network → Disable cache แล้ว reload ดู document response ต้องมี `data-prompt-version="20261016-2"` และ `id="promptForm"`
5. ดู Network ว่าเรียก `js/app.js?v=prompt-20261016-2` และ `css/style.css?v=prompt-20261016-2` ได้ 200 ตรวจ response ว่ามีโค้ดใหม่ หาก HTML ยังเก่า การเปลี่ยน query ของ asset อย่างเดียวช่วยไม่ได้ ต้องตรวจ deployment source และ URL ก่อน
6. หากมี Service Worker จากการติดตั้งเดิม ให้ตรวจ Application → Service Workers ว่าควบคุม URL นี้อยู่หรือไม่ ก่อน unregister ตัวที่เกี่ยวข้อง โค้ดชุดนี้ไม่พบการลงทะเบียน Service Worker
7. กรอกฟอร์ม สร้าง Prompt คัดลอกแล้ววางในโปรแกรมข้อความ ตรวจข้อมูลครบ และเปิด Console ตรวจ error ทดสอบบนมือถือจริงอีกครั้ง

ไฟล์ที่ส่งยังอยู่ในเครื่อง จนกว่าจะ commit/push และ deploy ด้วยตนเอง หน้าออนไลน์จะยังไม่ใช้การแก้ไขรอบนี้
