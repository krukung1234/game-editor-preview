# ผลงาน Game Editor VIP V21 รุ่น Spark

18 ตุลาคม 2026 — branch development/shared-editor-adapters ของ game-editor-preview ไม่ Commit/Push/Deploy ไม่เปลี่ยน Firebase จริงและเว็บไซต์ VIP เดิม

## การเปลี่ยนแปลง

- ใช้ Authentication + Firestore Rules โดยตรง นำ Functions/Storage/Gateway และ operator scripts ที่ใช้แผนเสียเงินออกจากระบบที่ใช้งาน สำรองโค้ดเก่าไว้นอก repository ไม่ต้องเปิด Blaze หรือ Billing
- สมัครได้เฉพาะ pending ผูก UID/อีเมลกับ JWT การยืนยันอีเมลต้องมี email_verified=true สมาชิกเปลี่ยน role/status/entitlement หรืออนุมัติตนเองไม่ได้
- Admin กำหนดด้วยทะเบียน editorAdmins จาก Console เท่านั้น ใช้ UID เดิม ไม่มี Service Account Key หรือรหัสลับในเว็บไซต์ อนุมัติ/ปฏิเสธ/ระงับ/คืนสิทธิ์ผู้อื่นผ่าน transaction พร้อม revision และ audit ที่ Rules บังคับตรวจ ถอนทะเบียน Admin มีผลกับ request/listener ที่ใช้ token เดิมด้วย
- คงหน้า signup/verification/login/reset/pending แก้ข้อความกำลังล็อกอินที่ทับสถานะ pending และปิดปุ่มอนุมัติหากยังไม่มีหลักฐานยืนยันอีเมลจากสมาชิก
- แจ้งคำขอใหม่ด้วย listener เฉพาะรายการล่าสุดหนึ่งรายการ ยอดรวมโหลดเมื่อเปิดหน้า/สั่งค้นหา/เปลี่ยนสถานะ ลดการอ่านซ้ำทุกนาที ไม่ส่งอีเมลแจ้ง Admin ผ่านบริการเสียเงิน
- สิทธิ์ lifetime กลางไม่ผูกกับรายชื่อเกม ครอบคลุมเกมใหม่โดยไม่แก้ระบบสมาชิก ทั้งนี้เกมใหม่ยังต้องทดสอบ Adapter ตามกระบวนการ Editor เดิม
- เปลี่ยน cache revision ของสคริปต์สมาชิกใน HTML ไม่เปลี่ยนเกมต้นฉบับ กลไกเกม Adapter หรือคำสั่ง Prompt

## ผลทดสอบจริง

| ส่วนที่ทดสอบ | ผล |
|---|---|
| Unit: gate, คำตอบตรวจสิทธิ์มาช้า, sign-out, listener cleanup, project guard, Spark config | ผ่าน 8 tests |
| Auth/Firestore demo Emulator: สมัคร ยืนยันอีเมล ขอ reset เข้า/ออก อนุมัติ ปฏิเสธ ระงับ คืนสิทธิ์ | ผ่าน |
| Rules: self-approval, สร้าง approved โดยตรง, ปลอม Admin claim, เขียนทะเบียน Admin, ปลอมการยืนยันอีเมล, อ่านสมาชิกอื่น, เปลี่ยนอีเมล, ขาด audit, revision เก่า | ปฏิเสธตามที่กำหนด |
| ผู้ใช้ pending เปิดหน้า/URL Editor/เรียก JavaScript Editor โดยตรง | เข้าไม่ได้ครบ 31 เกม |
| สมาชิก approved เปิด Editor แก้ชื่อ คืนค่า ปิด | ผ่าน 31/31 |
| ทดลองเล่นด้วยชื่อใหม่และโหลด engine เดิม | ผ่าน 31/31 |
| ดาวน์โหลด ZIP ตรวจ CRC/เส้นทาง แตกไฟล์ เปิดในบริบทไม่ล็อกอินและปิดการเรียกภายนอก | ผ่าน 31/31 |
| Editor 1440×1000, 768×1024, 375×812 | ไม่พบแถบเลื่อนแนวนอนครบ 31 |
| หน้าสมาชิกเพิ่ม 320×568 และ 844×390 พร้อมตรวจภาพมือถือ | ผ่าน ไม่ถูก banner ทับปุ่ม |
| Prompt สร้างข้อความ | ผ่าน 31/31 |
| สลับแท็บ 10 ครั้ง | Working Copy คงอยู่ |
| ระงับสมาชิกขณะเปิด Mini City preview | Editor ปิดและซ่อนเครื่องมือ |
| Admin ค้นหา ยกเลิก/ยืนยันอนุมัติ ถอน Admin | ผ่าน |
| Static: source SHA-256, paths, patch ranges, JS syntax, branch | ผ่าน 31/31 |

ใช้ Auth/Firestore Emulator และ Firebase SDK จริง แต่ catalogue เป็น fixture จากรายการเกมจริงเพื่อไม่แตะ Firebase เก่า ใช้ไฟล์ Editor/เกม/รูปภาพ/ZIP จริง ข้อความ PERMISSION_DENIED ใน log ของ Rules test คือกรณีที่ตั้งใจทดสอบให้ปฏิเสธ

**ขอบเขตการทดสอบเกม:** รอบนี้ตรวจเปิด engine/ข้อมูลชื่อใหม่/แพ็กเกจครบ 31 ไม่ได้เล่นผ่านทุกด่านหรือทดสอบคะแนนทุกกรณีใหม่ ไฟล์เกมและ Adapter ไม่เปลี่ยน มีหลักฐาน gameplay เดิมใน docs/shared-editor/evidence การผ่านการโหลดไม่ใช่การรับรองกล้อง/Hand Tracking จริง ยังต้องตรวจอุปกรณ์และอีเมลจริงหลังได้รับอนุญาตเปิดใช้

## ไฟล์และขั้นตอนต่อไป

ไฟล์หลัก: js/membership-*, js/firebase-sdk-loader.js, HTML cache revision, membership-backend/firestore.rules, firestore.indexes.json, firebase.json, package.json/lock, tests และเอกสาร รายการครบอยู่ใน [SPARK-V21-CHANGED-FILES.txt](SPARK-V21-CHANGED-FILES.txt)

หลักฐานอยู่ใน test-results/spark-unit.tap, spark-rules.json, spark-browser-ui.json, spark-31-games.json, spark-static.txt ไฟล์ games/, js/config.js, js/admin.js และ admin.html ไม่เปลี่ยนจากต้นฉบับที่ตรวจ

ทำตาม [คู่มือเปิดใช้ทีละขั้น](SPARK-V21-SETUP.md) หลังอนุญาตเท่านั้น: ตรวจ Spark → Auth/domain → Rules/indexes → ทะเบียน Admin UID เดิมและ editorAccess/status → เปิด config Production → เผยแพร่ branch ทดลอง → ตรวจสองบัญชีจริง

ตรวจเอกสารแล้วว่าบริการที่เลือกใช้ได้ใน Spark ภายในโควตา แต่ยังไม่ได้เปิด Console ยืนยันแผนจริงแทนเจ้าของ ค่า Production ยัง disabled ไม่ Deploy Rules/indexes หรือกำหนด Admin จริง

**ข้อจำกัดที่ยอมรับ:** หน้าเว็บ/ข้อมูลสมาชิกบังคับสิทธิ์ แต่ URL ตรงของไฟล์บน GitHub Pages ยังสาธารณะ ZIP ที่ดาวน์โหลดแล้วใช้ได้โดยไม่ล็อกอินและเรียกคืนไม่ได้ ไม่อ้างว่าป้องกันไฟล์สมบูรณ์ ไม่มีระบบย้ายไฟล์ไป Storage/Functions

## รายการตรวจเกมรอบ Spark

| เกม | Editor/คืนค่า | ทดลองเล่น | ZIP/CRC/เปิดหลังแตก |
|---|---|---|---|
| AR Career Quest ตามล่าหาอาชีพ | ผ่าน | ผ่าน | ผ่าน (60 ไฟล์) |
| AR Mini City สินค้าและบริการ | ผ่าน | ผ่าน | ผ่าน (67 ไฟล์) |
| AR Paint Academy | ผ่าน | ผ่าน | ผ่าน (23 ไฟล์) |
| AR คำตรงข้ามไทย | ผ่าน | ผ่าน | ผ่าน (20 ไฟล์) |
| ar พิชิตตัวเลข | ผ่าน | ผ่าน | ผ่าน (21 ไฟล์) |
| AR หนูน้อยเก็บชีสแสนอร่อย | ผ่าน | ผ่าน | ผ่าน (2 ไฟล์) |
| AR-bakery-pastry | ผ่าน | ผ่าน | ผ่าน (27 ไฟล์) |
| ar-computer | ผ่าน | ผ่าน | ผ่าน (21 ไฟล์) |
| ar-dino-fire-shooter | ผ่าน | ผ่าน | ผ่าน (33 ไฟล์) |
| ar-dressed | ผ่าน | ผ่าน | ผ่าน (41 ไฟล์) |
| ar-fishing-adventure | ผ่าน | ผ่าน | ผ่าน (28 ไฟล์) |
| ar-good-food-v1 | ผ่าน | ผ่าน | ผ่าน (15 ไฟล์) |
| ar-good-food-v2 | ผ่าน | ผ่าน | ผ่าน (15 ไฟล์) |
| ar-good-food-v3 | ผ่าน | ผ่าน | ผ่าน (15 ไฟล์) |
| AR-How-Do-You-Feel | ผ่าน | ผ่าน | ผ่าน (24 ไฟล์) |
| ar-kob-game | ผ่าน | ผ่าน | ผ่าน (22 ไฟล์) |
| ar-kok-game | ผ่าน | ผ่าน | ผ่าน (7 ไฟล์) |
| ar-living-things-game-updated | ผ่าน | ผ่าน | ผ่าน (62 ไฟล์) |
| ar-mole-game | ผ่าน | ผ่าน | ผ่าน (6 ไฟล์) |
| ar-Multiplication | ผ่าน | ผ่าน | ผ่าน (9 ไฟล์) |
| AR-Safety-Hero-Academy | ผ่าน | ผ่าน | ผ่าน (55 ไฟล์) |
| ar-sudoku | ผ่าน | ผ่าน | ผ่าน (23 ไฟล์) |
| ar-sushi-game | ผ่าน | ผ่าน | ผ่าน (33 ไฟล์) |
| ar-words-english | ผ่าน | ผ่าน | ผ่าน (10 ไฟล์) |
| ar-คำพังเพย | ผ่าน | ผ่าน | ผ่าน (82 ไฟล์) |
| AR-สัตว์มีกระดูกสันหลัง | ผ่าน | ผ่าน | ผ่าน (79 ไฟล์) |
| ar-เก็บผลไม้ | ผ่าน | ผ่าน | ผ่าน (13 ไฟล์) |
| AR-แยกขยะด้วยมือ | ผ่าน | ผ่าน | ผ่าน (24 ไฟล์) |
| AR_ANATOMY_LAB_A01 | ผ่าน | ผ่าน | ผ่าน (103 ไฟล์) |
| AR_Magnet_Lab | ผ่าน | ผ่าน | ผ่าน (41 ไฟล์) |
| AR_Opposite | ผ่าน | ผ่าน | ผ่าน (61 ไฟล์) |
