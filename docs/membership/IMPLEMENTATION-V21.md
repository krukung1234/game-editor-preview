# V21 รุ่น Spark แทนรุ่น Functions เดิม

อ่าน [SPARK-V21-SETUP.md](SPARK-V21-SETUP.md) และ [SPARK-V21-REPORT.md](SPARK-V21-REPORT.md) สำหรับระบบที่ใช้ปัจจุบัน เนื้อหาด้านล่างเป็นผลของ V21 ก่อนเปลี่ยนข้อกำหนด ไม่ใช่คำสั่งติดตั้งปัจจุบัน

---

# ระบบสมาชิก Game Editor VIP — รุ่นทดสอบ 21

วันที่ 18 ตุลาคม 2026 • Repository game-editor-preview • branch development/shared-editor-adapters

**สำหรับตรวจรับและทดสอบในเครื่อง ยังไม่พร้อมเปิด Production และยังไม่มี Deploy/Commit/Push**

## สิ่งที่พัฒนาแล้ว

- ปรับ index.html ของเว็บไซต์เดิมเป็นเข้าสู่ระบบ/สมัครสมาชิก/ลืมรหัสผ่าน ใช้ชื่อ Facebook อีเมล และรหัสผ่านส่วนตัว มีการยืนยันรหัสผ่าน ไม่บันทึกรหัสผ่านใน Firestore หรือ Log
- สมาชิกใหม่ส่งคำขอผ่าน Backend เป็น pending ยืนยันอีเมลก่อนใช้งาน และต้องได้รับ approved/lifetime จาก Backend จึงแสดงเครื่องมือ ไม่มีวันหมดอายุหรือการอนุมัติแยกรายเกม เกมใหม่ใช้สิทธิ์กลางเดียวกันตามความสามารถของ Editor เดิม
- UI แสดงสถานะ verify-email/pending/rejected/disabled และทางแก้ไขต่อเมื่อสมัคร Auth สำเร็จแต่ส่งโปรไฟล์ไม่สำเร็จ ไม่สร้างบัญชีซ้ำหรือทำให้สถานะ approved กลับ pending จากการ retry
- เพิ่ม membership-admin.html สำหรับรายชื่อ/ค้นหาคำขึ้นต้นชื่อ Facebook หรืออีเมล/ตัวกรอง/แบ่งหน้า/ยอดรออนุมัติ/รายละเอียด/อนุมัติ/ปฏิเสธ/ระงับ/คืนสิทธิ์ มีหน้าต่างยืนยันก่อนเปลี่ยนสถานะและป้องกันกดซ้ำ
- Backend ตรวจ Firebase ID token และ Admin claim จาก Auth record ปัจจุบัน ไม่เชื่อ admin_ok, vip_ok, email หรือ UID ที่ client อ้างเอง สมาชิกเปลี่ยนสถานะตนเองหรืออ่านโปรไฟล์ผู้อื่นไม่ได้
- เปลี่ยนสถานะใน transaction พร้อม revision, request ID, audit และคิวแจ้งเตือน ไม่เพิ่มวันหมดอายุ lifetime การคืนสิทธิ์ทำผ่าน Admin เช่นเดิม
- เก็บ Auth แบบ SESSION สำหรับการใช้งานเว็บไซต์ตามปกติ แต่ไม่บันทึก Working Copy เกมถาวร ปิด Editor แล้วเริ่มต้นใหม่ สลับแท็บไม่ปิดข้อมูล และปิดเครื่องมือ/ยกเลิกงานเมื่อสิทธิ์ถูกระงับ
- ตัวโหลด SDK ใช้ร่วมกัน โหลดครั้งเดียวต่อหน้า ไม่เพิ่ม Editor แยกเกม ไม่สร้าง ZIP จนกดดาวน์โหลด ไม่เปลี่ยนไฟล์เกมต้นฉบับ
- รายการเกม/Prompt ยังอ่าน collection games เดิมแบบ read-only ผ่าน App แยก ไม่มีคำสั่งเขียน Project เก่า ทุกข้อมูลสมาชิก/บทบาท/Rules/Backend ใหม่แยกไป Project ใหม่
- คิวแจ้งเตือนใหม่และอนุมัติอยู่ฝั่ง server; **ยังไม่มี worker ส่งอีเมลแจ้งแอดมิน/ผลอนุมัติจริง** หน้า Admin ใช้งานได้โดยไม่ต้องมีบริการอีเมลดังกล่าว อีเมล verification/reset ใช้ Firebase Authentication โดยตรง

## สิทธิ์ Admin ของเจ้าของ

Project จริงที่ยอมรับ: krukung-game-editor-vip เท่านั้น; Project ทดสอบ: demo-game-editor-membership เท่านั้น

UID เจ้าของ: WHwQKKGBlKWlV8dgkeyRGzDCuwn1 เจ้าของแจ้งว่ายืนยันอีเมลเรียบร้อยแล้ว ระบบยังไม่ได้เขียน claim ให้บัญชีจริง สคริปต์จะตรวจข้อมูล Auth อีกครั้งก่อนดำเนินการ ไม่สร้าง/ลบผู้ใช้ ไม่เปลี่ยน UID

`membership-backend/scripts/bootstrap-admin.cjs` เป็นสคริปต์ผู้ดูแล ใช้ Admin SDK และ operator ADC ตรวจ UID/verified/enabled แล้ว merge editorAdmin กับ claims เดิม พร้อมเตรียม owner membership แบบ lifetime และ audit เริ่มต้นเป็น Dry run ที่ไม่ติดต่อเครือข่าย ต้องระบุ --apply และยืนยัน Project/UID จึงเขียนจริง ไม่มี endpoint หรือฟอร์มบนหน้าเว็บให้ผู้ใช้เพิ่ม Admin

## Rules ที่เตรียมและทดสอบ

- firestore.rules: อ่านเอกสารโปรไฟล์ตนเองได้เท่านั้น ห้าม client สร้าง/แก้/ลบ/อ่านรายการสมาชิกทั้งหมด ทุกสถานะเขียนผ่าน callable Backend ที่ตรวจ Admin
- audit, operation, outbox และ private manifest เป็น server-only
- storage.rules: ปฏิเสธการอ่าน/เขียนจาก client ทั้งหมด ใช้ gateway ฝั่ง server สำหรับไฟล์ private ที่ลงทะเบียนแล้ว
- backend privateEditorResource: ตรวจ ID token แบบตรวจ revocation, verified email, Auth record, approved/lifetime ล่าสุด แล้วตรวจ manifest/path/hash/ขนาด/MIME ก่อนส่งไฟล์ ไม่รับชื่อ bucket จากผู้ใช้ ไม่สร้าง URL token ถาวร
- การใช้ Admin SDK ข้าม Security Rules จึงมีการตรวจสิทธิ์ใน Backend ทุก endpoint ด้วย ไม่อ้างว่า Rules เพียงอย่างเดียวป้องกัน Admin SDK

ยังไม่ Publish Rules ใดใน Firebase จริง และห้ามนำ Rules ชุดนี้ไปทับ krukung-game-hub

## ผลทดสอบจริง

1. Unit tests 12 กรณีผ่าน ทั้ง project isolation, allowed registration fields, verified/lifetime, server role, transition/revision/self-approval, client response race, gate account change และ teardown
2. Auth/Firestore/Functions/Storage Emulator จริงผ่าน ไม่ใช่ mock Rules: สมัคร/อีเมลซ้ำ, verification OOB, reset OOB และเข้าสู่ระบบด้วยรหัสใหม่, pending denied, verified approval, idempotency, self-approval denied, disable/restore, token Admin เดิมหลังถอน claim ถูกปฏิเสธ
3. Rules ปฏิเสธการอ่านข้อมูลผู้อื่น การ list สมาชิก การปลอม audit และ client เปลี่ยน approved/lifetime; ทดสอบกับข้อมูล/ไฟล์ที่มีอยู่จริง
4. private gateway กับไฟล์ตัวอย่างจริงใน Storage Emulator: ไม่ล็อกอิน401, pending403, approved200 ได้ bytes ถูกต้อง, disabled403
5. Chrome ใช้ SDK จริงและ demo emulators แต่ใช้ fixture catalogue แทนการอ่าน Firestore เก่า: สมัคร/ยืนยัน/รออนุมัติ/logout/reset, pending เข้า Editor ทางตรงไม่ได้, ใส่ vip_ok ปลอมแล้วเปิดไม่ได้
6. ผู้ใช้ approved เปิดการ์ดครบ31เกม เปิด/แก้/คืนค่า/ปิด Editor ครบ31เกม และสร้าง Prompt ครบ31เกม สลับแท็บ10ครั้งข้อมูลยังอยู่
7. Mini City ทดลองเล่นผ่านช่องทางสมาชิก; Career Quest ดาวน์โหลดฉบับแก้ชื่อ ตรวจ ZIP CRC/แตก60ไฟล์/เปิดด้วยชื่อใหม่ใน browser context อีกชุดที่ไม่ล็อกอิน โดยบล็อกเครือข่ายภายนอก ผ่าน
8. ระงับสิทธิ์จาก server ขณะเปิด Editor/Preview ทำให้ปิดและซ่อนเครื่องมือ; Admin UI ค้นหา/ยกเลิกยืนยัน/อนุมัติจริงผ่าน Backend; ถอน Admin claim แล้ว token เดิมโหลดรายชื่อไม่ได้
9. Responsive 5 ขนาด 1440×1000,768×1024,375×812,320×568,844×390 ไม่พบ horizontal overflow ไม่พบ JavaScript page error
10. Static verifier ของเกม31เกมผ่าน source SHA/data paths/images/patches และไม่พบ diff ใน games/, js/config.js, js/admin.js, admin.html

ไม่ได้เล่นทุกด่าน/คะแนน/ZIPทั้ง31เกมซ้ำในงาน Auth รอบนี้ หลักฐาน engine/ZIP เดิมยังอยู่ docs/shared-editor/evidence/; ไม่อ้างว่าทดสอบกล้อง/มือจริง อุปกรณ์มือถือจริง อีเมลถึง inbox จริง หรือ Firebase Production แล้ว เกม Anatomy ต้นฉบับดิบมีข้อผิดพลาดที่รายงานในรุ่นก่อน ฉบับที่ประกอบผ่าน Editor มี repair เดิม งาน Auth ไม่แก้เกมต้นฉบับนั้น

## ไฟล์สาธารณะ: ยังเป็นข้อจำกัดก่อนเปิดใช้งาน

GitHub Pages เป็น Static Hosting ไฟล์ games/, editor-assets/ และ source data ที่ยังเผยแพร่ผ่าน Pages/Repository ยังเปิด URL ตรงได้ ไม่ถูกปิดด้วย Login หรือ Rules ของ Firestore ใหม่

สำรวจแบบ offline พบ **693 ไฟล์ รวม445,273,583 bytes (ประมาณ424.65 MiB)** จาก31เกมและทรัพยากรที่เกี่ยวข้อง ไม่มีไฟล์เกิน32MiBสำหรับ gateway ตัวอย่าง รายการ/hashอยู่ private-resource-inventory.json ยังไม่มีการ upload

เตรียม audit-private-game-files.cjs และ upload-private-resources.cjs แบบ Dry run เป็นค่าเริ่มต้น สคริปต์ย้ายจะตรวจ path/hash/project/owner verified+claim และไม่สร้าง public download token แต่ **ยังไม่ได้เชื่อม fetch/image/runtime ทั้ง31เกมเข้ากับ private transport และยังไม่ได้ถอดไฟล์ออกจาก Pages** จึงยังไม่ถือว่าป้องกันไฟล์เกมครบแล้ว

ก่อนเปิดจริง ต้องอนุญาตการย้ายไป private bucket, ตรวจ IAM/Public access prevention, เชื่อม authenticated transport กับเส้นทาง assets/iframe/SDK ที่จำเป็น, ทดสอบ31เกมอีกครั้ง และปรับ publishing artifact/repository ไม่ส่งไฟล์ที่ต้องจำกัดสิทธิ์หรือ legacy config/Admin assets ออกสู่ public การเปลี่ยนไฟล์จาก public เป็น private เรียกคืนสำเนาที่ดาวน์โหลดไปแล้วไม่ได้

เพราะเหตุนี้ membership-config.js จึงเปิดได้เฉพาะ Emulator บน localhost; บนเว็บจริงตั้ง mode disabled และ productionReviewed:false ไม่เปิดสิทธิ์ด้วยการเปลี่ยน localStorage และไม่มีคำสั่ง Deploy อัตโนมัติ

อ้างอิง: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages

## สิ่งที่ต้องทำใน Console เพิ่มเติมตอนนี้

- ไม่ต้องสร้างผู้ใช้ใหม่หรือเปลี่ยน UID; ไม่ต้องแก้ Project เก่า
- ตรวจ Password policy เป็น Require อย่างน้อย12ตัวอักษร มีตัวอักษรอังกฤษ/ตัวเลข และตรวจ Verification/Password reset templates ของ Project ใหม่
- คง Firestore ใหม่ไว้ที่ (default), asia-southeast1 และกฎปิดเริ่มต้นจนกว่าจะอนุญาต deploy
- ไม่ต้องเปิด Storage หรือ Billing ในตอนนี้ เพียงตรวจรับโค้ด/หลักฐานก่อน

## ขั้นตอนสำหรับผู้ดูแลหลังได้รับอนุญาตแยกต่างหาก

1. ตกลงค่าใช้จ่ายและขอบเขตการย้ายไฟล์ก่อน: Functions deploy ต้อง Blaze; Storage ต้อง Blaze; มีค่า build/artifact/พื้นที่/requests/egress ตามการใช้ โดยไฟล์เกมดาวน์โหลดอาจมีขนาดมาก ไม่รับประกันใช้ฟรีสำหรับ270คน ไม่เปิดบริการเพิ่มแทนเจ้าของ
2. ตั้ง Billing เฉพาะ Project ใหม่ พร้อม Budget/ผู้รับแจ้งเตือนค่าใช้จ่าย การตั้ง alerts อย่างเดียวไม่ได้ตัดค่าใช้จ่ายอัตโนมัติ ตรวจ Spend caps ของบริการที่รองรับแยกต่างหาก
3. ผู้ดูแลใช้ Cloud Shell ของ Google ผ่านบัญชีที่มีสิทธิ์ใน Project ใหม่ ใช้ Node22 และ operator ADC/OAuth ไม่ดาวน์โหลด/ส่ง service-account private key ในแชต
4. ก่อนเขียน Admin จริง ตรวจรับสคริปต์และรัน Dry run ก่อน:

```sh
node membership-backend/scripts/bootstrap-admin.cjs
```

5. เฉพาะหลังอนุญาตการเขียนสิทธิ์จริงแล้ว จึงรันใน trusted operator environment:

```sh
node membership-backend/scripts/bootstrap-admin.cjs --apply --confirm-project krukung-game-editor-vip --confirm-uid WHwQKKGBlKWlV8dgkeyRGzDCuwn1
```

ต้องติดตั้ง functions dependencies และเตรียม operator ADC ก่อน; การตั้ง claim ด้วย Admin SDK เองไม่ใช่การ Deploy Cloud Functions และไม่จำเป็นต้องเปิด Blaze เพียงเพื่อรันสคริปต์นี้ แต่ไม่มีการรัน --apply ในงานนี้

6. ตั้ง functions env EDITOR_MEMBERSHIP_PROJECT_ID=krukung-game-editor-vip จาก example (ไม่ใช้ demo และไม่ใส่ secrets ใน Git) ตรวจ service account IAM ให้จำเป็นเท่านั้น แยกผู้มีสิทธิ์ bootstrap จาก runtime ที่อ่าน Auth/เขียนข้อมูลสมาชิก
7. ทดสอบ App Check/abuse controls และเตรียม release plan ก่อนขอ Deploy Backend/Rules/Indexes เฉพาะ Project ใหม่ ไม่ใช้ project alias เดิม
8. เมื่ออนุญาต Storage แล้ว จึงตรวจ private bucket ว่าไม่มี allUsers/public IAM, ใช้สคริปต์ migration ที่ตรวจแล้ว และทดสอบ transport/การบล็อกไฟล์ก่อนเปิดหน้าเว็บสมาชิกจริง
9. เลือกผู้ให้บริการส่งอีเมลแจ้งแอดมินและแจ้งผลอนุมัติ ตั้ง secret ฝั่ง server และ worker ที่ retry/idempotent ภายหลัง ไม่ใส่ API secret ใน GitHub Pages
10. เมื่อผ่านทดสอบและอนุญาต Deploy เว็บไซต์แล้ว จึงเปิด production config และเผยแพร่ artifact ที่ตรวจว่าไม่มีไฟล์ private/legacy credentials ห้ามอัปโหลด ZIP นี้เป็นเว็บไซต์ทันที

อ้างอิงค่าใช้จ่าย: https://firebase.google.com/docs/functions/get-started ; https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024 ; https://firebase.google.com/docs/projects/billing/budget-alerts

## วิธีทดสอบซ้ำในเครื่อง

ใช้ Node22, JDK21, Python3 สำหรับตรวจ ZIP และ Chrome ติดตั้ง dependencies ด้วย npm ci จาก lockfile ใน membership-backend และ functions

```powershell
cd membership-backend
npm ci --ignore-scripts
cd functions
npm ci --ignore-scripts
cd ..
npm test
npm run test:full
```

บนเครื่องนี้ Python alias ปกติไม่พร้อมใช้ ให้ตั้ง EDITOR_PYTHON_PATH ไป Python runtime ที่ Codex เตรียมให้; ถ้า Chrome อยู่คนละตำแหน่ง ตั้ง EDITOR_CHROME_PATH ชุดทดสอบบังคับ project demo และlocalhost ไม่ยอมใช้ Production หาก emulator ไม่พร้อม

ดูหน้าเว็บเอง: terminal1 `npm run emulators` ใน membership-backend; terminal2 `node tools/serve-membership-preview.cjs` จากรากrepo แล้วเปิด http://127.0.0.1:8085 ใช้เฉพาะบัญชีทดสอบใน Emulator ไม่ใช้รหัสบัญชีจริง และไม่คาดหวังว่ารหัสแอดมินจริงจะมีอยู่ใน demo

## ไฟล์เปลี่ยนหลัก

- index.html, editor.html, game-player.html, personal-game-player.html, shared-game-player.html; เพิ่ม membership-admin.html
- js/app.js, js/vip-access.js, js/game-editor.js (เฉพาะ authorize/cleanup), js/public-game-editor.js, js/personal-game-player.js, js/shared-game-player.js
- เพิ่ม js/firebase-sdk-loader.js, game-hub-config.js, member-game-player.js, membership-config.js, membership-boot.mjs, membership-ui.mjs, membership-admin.mjs; ขยาย membership-client.mjs
- เพิ่ม css/membership.css
- membership-backend/functions/index.cjs, policy.cjs, protected-resource.cjs, tests และ lockfiles; scripts/bootstrap-admin.cjs และ upload-private-resources.cjs
- tools/verify-shared-editor.cjs, audit-private-game-files.cjs, serve-membership-preview.cjs และ docs/membership

ไม่แก้เกมต้นฉบับ31เกม, Admin เกมเดิม, js/config.js หรือ Firebase Project เก่า ไม่มี Deploy/Commit/Push และยังไม่ได้ให้ Admin claim แก่บัญชีจริง
