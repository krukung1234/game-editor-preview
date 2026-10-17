# VIP และ Editor รุ่น 20261017-20

พัฒนาบน game-editor-preview สาขา development/shared-editor-adapters เท่านั้น ยังไม่ Commit, Push หรือ Deploy

## สิ่งที่เปลี่ยน
- หน้าเข้าสู่ระบบเหลือช่องรหัสและปุ่มเข้าเว็บไซต์ ลบลิงก์ Editor ที่ไม่ต้องเข้าสู่ระบบ คงรหัส VIP และระบบตรวจรหัสเดิม
- ตรวจสิทธิ์ก่อนเปิด Prompt/Editor และหน้าทดลองเล่น ปิดทางเข้าปกติผ่าน URL โดยตรง และรับการออกจากระบบจากอีกแท็บ ไม่ปิด Editor เพราะสลับแท็บ
- การ์ดครบ 31 เกม แสดงวิชา/ระดับชั้นตามข้อมูลจริง หากไม่มีระดับชั้นแสดงว่าไม่ระบุ ไม่เดาข้อมูล ปุ่ม Prompt ม่วง / ปรับแต่งเกม น้ำเงิน / เล่นเกม เขียว จัดขนาดและแนวให้สมดุล ไม่มีข้อความเทคนิคใต้ปุ่ม
- คง Editor กลาง 3 แท็บและ 3 ปุ่มเดิม ช่องวิชา/ชั้นต้นฉบับอ่านอย่างเดียวสีเทา ย้ายภาพปกที่รองรับมาให้เปลี่ยนและคืนค่าได้ในแท็บข้อมูลเกม
- เปลี่ยนภาพปกได้จริง 7 เกม: Mini City, Career Quest, Bakery, เกม native-14, native-22, Animals native-25 และ native-29 ดูชื่อครบใน support-status.json อีก 24 เกมแสดงภาพอ่านอย่างเดียวเมื่อยังไม่มีจุดเชื่อมปกที่ตรวจแล้ว ไม่แสดงปุ่มอัปโหลดที่ใช้ไม่ได้ ภาพอื่นยังแก้ตามความสามารถเดิม
- แก้กรณีอัปโหลดภาพเสร็จหลังสลับแท็บ ให้ภาพในข้อมูลเกมตรงกับ Working Copy โดยไม่ล้างฟอร์ม
- เพิ่ม cache version และตรวจเส้นทางประกอบ ZIP โดยไม่แตะ games/, Admin, config หรือ Firestore

## ผลทดสอบจริง
- VIP: รหัสผิด/ถูก ลิงก์ตรง การเปิด Editor โดยไม่ผ่านสิทธิ์ ออกจากระบบและเพิกถอนอีกแท็บ ผ่าน ไม่มีการเขียน Firestore
- UI ครบ 31 เกม เปิด/แก้/คืนค่า/ปิดและเปิดใหม่ ผ่าน Native 30 เกมตรวจเส้นทางฟิลด์รวม 3048 จุด
- Prompt ครบ 31 เกม และกรณีคำสั่งเก่า 20 แบบ/กรณีไม่ควรลบ 9 แบบ ผ่าน ไม่เปลี่ยนตัวประกอบ Prompt ในงานนี้
- ภาพปก native 6 เกม: เปลี่ยนภาพ ทดลองเล่น ดาวน์โหลด ZIP ตรวจ CRC แตกไฟล์และเล่นบน localhost โดยปิดเครือข่ายภายนอก ผ่าน Mini City แยกทดสอบครบ 5 ภารกิจทั้ง Preview และ ZIP
- ตรวจ UI 1440×1000, 768×1024, 375×812, 320×568 และ 844×390 ไม่พบแนวนอนล้นจอ ตรวจภาพหน้าจอ desktop/mobile แล้ว
- ตรวจอัปโหลดภาพพร้อมสลับแท็บ และการสลับแท็บ 10 ครั้ง ผ่าน ข้อมูลอยู่ในหน่วยความจำ ไม่เพิ่มร่างถาวร
- หลักฐานเล่นและ ZIP ของทั้ง 31 เกมอ้างอิงชุด qualification รุ่น 19 รอบนี้ไม่ได้เล่นทั้ง 31 เกมซ้ำทุกด่าน จึงไม่อ้างว่าทดสอบฮาร์ดแวร์ทุกเกมครบ 100%

## ข้อจำกัดตามจริง
GitHub Pages ส่ง HTML/CSS/JS แบบ static การตรวจ vip_ok ฝั่งเบราว์เซอร์ปิดช่องทางใช้งานปกติเท่านั้น ผู้ที่แก้ storage หรืออ่านโค้ดสาธารณะยังข้ามได้ ไม่ใช่ระบบยืนยันตัวตนฝั่งเซิร์ฟเวอร์ หากต้องการป้องกันไฟล์จริงต้องตรวจสิทธิ์ฝั่งเซิร์ฟเวอร์หรือใช้ hosting ที่มี access control งานนี้ไม่ได้เพิ่มระบบดังกล่าวหรือเปลี่ยน Firebase
https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages

กล้องทดสอบด้วย Chrome/SDK จริงและกล้องจำลอง ไม่ได้ทดสอบมือ/ใบหน้าคนจริงหรือมือถือจริง กล้องควรใช้ HTTPS/localhost และอนุญาตสิทธิ์ ไม่รับประกัน file:// ภาพที่มีตัวอักษรฝังต้องเปลี่ยนไฟล์ภาพเอง ปก Bakery ใช้ texture ร่วม ต้องรักษาขนาด/เค้าโครงเดิม เกม Anatomy ต้นฉบับดิบยังมี ASSET_FILES is not defined แต่ฉบับที่ประกอบผ่าน Editor แก้แล้วโดยไม่เขียนทับต้นฉบับ

## ไฟล์ที่แก้
index.html, editor.html, game-player.html, personal-game-player.html, shared-game-player.html; css/style.css, css/game-editor.css; js/vip-access.js, app.js, game-editor.js, public-game-editor.js, personal-game-player.js, shared-game-player.js; cache query ใน shared-native-adapters.js, shared-game-composer.js, shared-game-package.js, personal-game-download.js; metadata ปก native-01/06/14/22/25/29.json; tools/verify-shared-editor.cjs และ docs/shared-editor

## วิธีใช้และนำขึ้น GitHub Pages
แตก ZIP update ทับเฉพาะ checkout game-editor-preview รุ่น 19 ที่มีไฟล์เกมเดิมครบ หรือใช้ cumulative overlay กับฐานเดิมที่เข้ากันได้ สำรองและตรวจ diff ก่อน อย่าวางในเว็บไซต์หลัก รัน node tools/verify-shared-editor.cjs จากราก repo แล้วเปิดผ่าน localhost ทดสอบล็อกอิน/Editor/ดาวน์โหลดก่อน Commit และ Push ด้วยตนเองไป branch ทดลองที่ตั้งค่า Pages ไว้ เมื่อ deploy เสร็จ Ctrl+F5 ตรวจ Network ว่าโหลด shared-20/vip-20 ไม่ใช่ cache เก่า รอบนี้ยังไม่ได้ deploy หรือทดสอบ Pages จริง

รายเกมครบ 31 เกมและขอบเขตเดิมดู REPORT-V19.md และ support-status.json หลักฐานรอบนี้อยู่ evidence/VIP-V20*.json
