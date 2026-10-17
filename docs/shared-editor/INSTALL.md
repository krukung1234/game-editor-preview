# วิธีนำโค้ดชุดนี้ไปตรวจและใช้

ชุดอัปเดตนี้ไม่ใช่เว็บไซต์ใหม่ ใช้วางทับไฟล์ที่ระบุใน Repository game-editor-preview ที่มีเกมเดิมครบอยู่แล้ว ฐานทดสอบคือ commit 89469c1dfd44342924677ea66a445be44ccd0a16 (v13) ห้ามนำไปวางใน krukung1234.github.io

## ตรวจบนเครื่องก่อน

1. ตรวจ git remote -v ให้เป็น game-editor-preview และใช้ branch development/shared-editor-adapters ห้ามทำบน main/master สำรองงานที่ยังไม่ commit ก่อนวางไฟล์
2. แตก ZIP อัปเดตและคัดลอกเฉพาะไฟล์ภายในลงใน checkout เดิมตาม path อย่าใช้ ZIP นี้แทน clone ทั้งเว็บไซต์ เพราะไม่ได้รวม games/ และ config เดิม
3. รัน node tools/verify-shared-editor.cjs ตรวจ SHA, Blueprint, รูป, syntax และ branch หาก source คนละรุ่นต้องตรวจ Adapter ใหม่ ไม่ข้าม guard
4. เปิดผ่าน localhost เช่น python -m http.server 8000 หรือ Live Server แล้วเข้า http://localhost:8000/editor.html เพื่อทดสอบสาธารณะโดยไม่ใช้ Firebase และ /index.html เพื่อตรวจ Hub เดิม
5. ควรเห็น 31 เกม แต่เปิดปุ่มได้เฉพาะ 5 เกมตามรายงาน เกมอื่นปิดพร้อมเหตุผล อย่าเปลี่ยน enabled ให้ครบ 31 โดยข้ามการทดสอบ
6. แก้ชื่อ/ชั้น/คลังคำหรือคู่คำ แล้วทดลองเล่น ตอบถูกและผิด ตรวจคะแนนและข้อความจบ ลองเปลี่ยนรูปที่มีให้แก้ (sprite ต้องรักษา geometry) สลับแท็บ 10 ครั้ง ข้อมูลต้องอยู่ ปิดแล้วยืนยันและเปิดใหม่ต้องกลับต้นฉบับ
7. ดาวน์โหลดเกม แตก ZIP ทั้งโฟลเดอร์ เปิดผ่านเซิร์ฟเวอร์ localhost แยกต่างหากและตัดเน็ตเพื่อตรวจว่าไม่แอบเรียกไฟล์จาก repository ต้นทาง กล้องต้องใช้ localhost/HTTPS และอนุญาตกล้องจริง
8. ตรวจมือถือ/แท็บเล็ตจริงเพิ่มเติมก่อนประกาศใช้งานทั่วไป ผลอัตโนมัติในรายงานใช้ viewport จำลองและกล้องจำลอง ไม่ใช่การทดสอบฮาร์ดแวร์ทุกชนิด

## Commit และ Push เมื่อผู้ใช้ตรวจแล้วเท่านั้น

Codex ไม่ได้รันคำสั่งด้านล่าง:

```powershell
git switch development/shared-editor-adapters
git status --short
git diff --check
node tools/verify-shared-editor.cjs
# ตรวจและเลือก add เฉพาะไฟล์ในรายงาน รวมไฟล์ใหม่ใน js/adapters/native, editor-assets, docs และ tools
git add index.html editor.html shared-game-player.html css/game-editor.css js/app.js js/game-editor.js js/public-game-editor.js js/personal-game-download.js js/shared-native-adapters.js js/shared-game-composer.js js/shared-game-player.js js/shared-game-package.js js/native-game-session.js js/native-adapter-catalogue.js js/adapters/native js/adapters/ar-legacy-manifest.json editor-assets/shared docs/shared-editor tools/verify-shared-editor.cjs
git commit -m "Add shared AR game editor with qualified adapter gates"
git push -u origin development/shared-editor-adapters
```

GitHub Pages จะแสดงโค้ดต่อเมื่อ source ของ Pages ใช้ branch ที่ถูก deploy หรือมี workflow ที่เผยแพร่ branch ทดลองนี้ การ Push branch ทดลองอย่างเดียวอาจไม่เปลี่ยนหน้า Pages ที่ตั้ง source เป็น main ห้าม merge เข้า main อัตโนมัติ ใช้ deployment สำหรับ preview branch ตามที่ผู้ใช้ตรวจอนุมัติก่อน และตรวจ Settings > Pages ของ game-editor-preview เท่านั้น

ไฟล์ CSS/JS ของ Editor ใช้ version shared-19 เพื่อเปลี่ยน cache key หลังอัปโหลดครบ ใช้ Ctrl+F5 และตรวจ Network ว่าโหลด shared-19 ไม่ใช่รุ่นเก่า ห้ามอ้างว่าเว็บไซต์ออนไลน์เปลี่ยนแล้วหากยังไม่ได้ deploy

อ่าน docs/shared-editor/REPORT.md สำหรับตาราง 31 เกมและข้อจำกัดทั้งหมด

รุ่น19เปิดEditor31เกมตามหลักฐานอัตโนมัติ อ่านREPORT.mdสำหรับข้อจำกัดกล้องและข้อผิดพลาดเดิมของไฟล์ต้นฉบับ ไม่อ้างว่าทดสอบอุปกรณ์จริงหรือPagesจริงแล้ว
