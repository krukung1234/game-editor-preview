# ตรวจรับก่อนเปิด Game Editor VIP V21 Spark

วันที่ 18 ตุลาคม 2026 • ตรวจในเครื่องบน branch development/shared-editor-adapters • ไม่ Deploy/Commit/Push และไม่เปลี่ยน Firebase จริง

**ผลตัดสิน: ยังไม่รับรองให้เปิดใช้งานจริงครบทุกเกม** พบ JavaScript error ในเกมต้นฉบับ ANATOMY LAB และยังไม่มีผลจากกล้อง/มือจริงหรือมือถือจริง ไม่ใช้ผลจากกล้องจำลองแทนการตรวจอุปกรณ์จริง

## สิ่งที่ตรวจผ่าน

- Unit tests 8 รายการ และ Firestore Rules integration test ผ่านซ้ำใน demo Emulator: pending/unverified/rejected/disabled เข้าเครื่องมือไม่ได้, สมาชิกสร้าง approved หรือ Admin เองไม่ได้, เปลี่ยนอีเมล/สิทธิ์/อ่านสมาชิกคนอื่นไม่ได้, Admin ที่ไม่ยืนยันอีเมลหรือถูกถอนทะเบียนถูกปฏิเสธ, revision/audit บังคับใช้ใน transaction
- ไม่พบช่องทางข้ามสิทธิ์ในกรณีที่ทดสอบ ไม่ใช่คำรับรองความปลอดภัยแบบสมบูรณ์หรือการทดสอบเจาะระบบทั้งหมด
- Production configuration isolation test ผ่าน: โหมดโฮสต์จริงยัง disabled และ productionReviewed=false, Project เป็น krukung-game-editor-vip เท่านั้น, continue URL กลับ /game-editor-preview/index.html; localhost ใช้ demo project
- firebase.json มีเฉพาะ Firestore และ Auth/Firestore Emulators ไม่มี Functions/Storage/Gateway ส่วน game-hub-config.js เป็น loader อ่าน catalogue เก่า ไม่มีคำสั่งเขียน/Authentication ของ project เก่า
- git diff ของ games/, js/config.js, js/admin.js, admin.html ว่าง จึงไม่มีการแก้เกมหรือระบบ VIP เก่าจากการตรวจครั้งนี้ เพิ่มเฉพาะชุดทดสอบและรายงาน
- หน้าเกมต้นฉบับทั้ง 31 โหลดใน Chrome desktop และ viewport มือถือแนวตั้ง/นอน 1440×900, 390×844, 844×390 รวม 93 กรณี ไม่พบการล้นแนวนอนในจังหวะที่ตรวจ อีก 30 เกมไม่พบ uncaught JavaScript error ใน smoke test; ANATOMY LAB มี error ทั้งสามขนาด
- จำลองปฏิเสธ getUserMedia ถูกเรียกจริง 46 กรณี ใน 16 เกม ไม่พบ uncaught error จากการปฏิเสธกล้องในกรณีเหล่านั้น อีก 15 เกมไม่ได้เข้าถึงจุดเปิดกล้องใน smoke test นี้ จึงไม่ถือว่าผ่าน fallback ทั้งหมด
- ทดสอบ UI สมาชิกซ้ำรอบนี้ผ่านด้วยชุดปกติที่ไม่เร่งเวลา (preflight-membership-ui.json); หลักฐานรอบ Spark ก่อนหน้า: สมาชิก approved เปิด/แก้/คืนค่า/ทดลองเล่น/ZIP ครบ31, pending เรียก Editor โดยตรงไม่ได้ครบ31, สร้าง Prompt ครบ31, สลับแท็บ10ครั้งข้อมูลอยู่ครบ, Admin ยืนยัน/ยกเลิกอนุมัติและถอนสิทธิ์ผ่าน มีหลักฐาน spark-browser-ui.json และ spark-31-games.json ไม่ยกผลเปิด ZIP ไปอ้างว่าเล่นทุกด่านด้วยมือจริงผ่านแล้ว

## ข้อผิดพลาดที่ยืนยัน

**เกมต้นฉบับ AR_ANATOMY_LAB_A01:** browser แจ้ง `ASSET_FILES is not defined` ทุก viewport ที่ตรวจ ใน games/AR_ANATOMY_LAB_A01/index.html บรรทัด237 เรียก ASSET_FILES.push ก่อน const ASSET_FILES ที่บรรทัด1990 ฉบับ Editor มีการประกอบ/ซ่อมใน Adapter และเปิดได้ แต่ปุ่มเล่นเกมต้นฉบับใช้ไฟล์ raw ที่ยังมีปัญหา ต้องแก้และตรวจทั้ง raw, Adapter, คะแนน และ ZIP ใหม่ก่อนรับรองเกมนี้

ไม่ได้แก้ไฟล์เกมในงานตรวจนี้ และไม่เปลี่ยนค่า qualification หรือเปิด/ปิดปุ่มเพื่อกลบข้อผิดพลาด

## ความต่างของเกมที่ต้องระบุให้ถูก

- ar-kok-game และ ar-mole-game ใช้กล้องเป็นฉากร่วมกับคลิก/แตะ ไม่มี MediaPipe Hands ในต้นฉบับ จึงเป็น N/A สำหรับ Hand Tracking ไม่ใช่โมเดลติดตามมือเสีย
- ar-kob-game มีโหมดคลิก/แตะและโหมดจีบนิ้วแยกกัน การทดสอบ Hand Tracking ต้องเลือกโหมดจีบนิ้ว การกดเริ่มแบบเมาส์แล้วรอผล Hands เป็นการทดสอบผิดโหมด
- Sudoku เปิด fullscreen และมีหน้าโหลดกล้องก่อนหน้าเริ่ม ต้องรอ state start และออกจาก fullscreen ก่อนกลับ Editor การทดสอบที่กดทะลุหน้าโหลดหรือรอปุ่ม Editor ทั้งที่เกมยัง fullscreen ไม่ใช่หลักฐานว่าเกมเสีย ชุดทดสอบที่หยุดจากสาเหตุเหล่านี้เก็บแยกจากผลทดสอบซ้ำ

## ข้อจำกัดของผลอัตโนมัติ

กล้อง Chrome เป็น synthetic camera ส่วน MediaPipe/WASM ใช้โมเดลจริง การมี inference frame หมายถึง pipeline ทำงาน ไม่ได้หมายถึงตรวจจับมือคนจริงแม่นยำ ชุด deep tests บางเกมเพิ่ม read-only helper และเรียก callback คำตอบ/ลากวาง/landmarks จำลอง รวมทั้งเร่งเวลา จึงทดสอบกติกาและคะแนนได้ แต่ไม่รับรองตำแหน่งนิ้วจริง ความหน่วง แสง กล้องหน้า/หลัง หรือสัมผัสบนอุปกรณ์จริง

ขนาดหน้าจอมือถือเป็น Chrome viewport emulation บน Windows ไม่ใช่ Android/iPhone/Safari จริง ไม่ได้ทดสอบเสียงจากลำโพงจริง มี AudioContext/SDK cleanup warning ในบางการจำลอง จึงต้องตรวจการเปิด-ปิดกล้องซ้ำและเสียงบนอุปกรณ์จริง

ไฟล์ GitHub Pages ยังสาธารณะตามข้อสรุป สมาชิก pending อาจเปิด URL เกมตรงได้ แม้หน้าเครื่องมือถูกล็อก Security Rules ของ project สมาชิกไม่ได้ป้องกันไฟล์เหล่านี้ ZIP ส่วนตัวที่ดาวน์โหลดแล้วไม่ต้องล็อกอินและเรียกคืนไม่ได้

## ขั้นตอนเปิดเว็บไซต์ทดลอง

1. **ตรวจในเครื่องก่อน** เปิด PowerShell ที่ membership-backend รัน npm ci แล้ว npm run emulators เปิดอีกหน้าต่างที่ราก repository รัน node tools/serve-membership-preview.cjs เข้า http://127.0.0.1:8085/ และ Emulator UI http://127.0.0.1:4000/ ใช้บัญชีจำลองเท่านั้น ไม่ใช้รหัสผ่านบัญชีจริง
2. สร้างบัญชีจำลองและยืนยันผ่านลิงก์ที่ Emulator แสดง ตั้งทะเบียน editorAdmins/{UIDจำลอง} enabled=true และ editorAccess/status enabled=true ใน Firestore Emulator ให้บัญชีแอดมินจำลองมี approved/lifetime ผ่าน Emulator UI สมาชิกอีกบัญชีคง pending แล้วทดสอบอนุมัติ/ปฏิเสธ/ระงับ/คืนสิทธิ์ อย่าเปิด Console project จริงแทน Emulator ในขั้นนี้
3. แก้ปัญหา ANATOMY LAB และทดสอบซ้ำก่อนรับรองปุ่มเล่นเกมต้นฉบับ พร้อมอัปเดต source hash/qualification ของ Adapter หากโค้ดต้นฉบับเปลี่ยน ไม่แก้เพียงตัวเลข hash โดยข้ามการทดสอบ
4. กรอกผลกล้อง/มือจริงและเล่นครบทุกด่านใน PREFLIGHT-V21-MANUAL-ACCEPTANCE.csv ทั้ง Windows Chrome, Android Chrome และ iPhone Safari ตามอุปกรณ์ที่ต้องรองรับ ทดสอบตอบถูก/ผิด โบนัส เริ่มใหม่ ปฏิเสธกล้อง ทางเลือกคลิก/สัมผัส หมุนจอ สลับแท็บ และปิดกล้องหลังออกเกม ต้องไม่ให้คะแนนซ้ำจากการค้างนิ้ว
5. **หลังได้รับอนุญาตเท่านั้น** เจ้าของเปิด Console ของ krukung-game-editor-vip ตรวจแผน Spark และไม่ผูก Billing ตรวจ Email/Password และ authorized domain krukung1234.github.io ห้ามเลือก project krukung-game-hub หรือเปิด Blaze/Functions/Storage/Extensions
6. ติดตั้ง Firestore Rules และ composite indexes ตาม SPARK-V21-SETUP.md สร้างทะเบียน Admin ด้วย UID เดิม WHwQKKGBlKWlV8dgkeyRGzDCuwn1 จาก Console เท่านั้น สร้าง editorAccess/status และเตรียมโปรไฟล์เจ้าของตามคู่มือ ไม่ใช้ Service Account Key ในเว็บไซต์
7. หลังแก้ข้อบกพร่องและได้รับอนุญาตเผยแพร่ เปลี่ยนเฉพาะ production mode จาก disabled เป็น production และ productionReviewed เป็น true ใน membership-config.js คง named app ใหม่และ read-only catalogue เดิม จากนั้นเผยแพร่เฉพาะ game-editor-preview บน branch ทดลองตามวิธี Pages เดิม ไม่แก้ repository/Pages ของ VIP เก่า
8. เปิดสอง browser profiles: บัญชี pending ต้องยังเข้าเครื่องมือไม่ได้ บัญชี approved จึงเล่น/Editor/ZIP ได้ ทดสอบ Admin ถอนสิทธิ์ขณะกำลังเปิด Editor ตรวจลิงก์อีเมลจริงและผลบนมือถือจริงก่อนเปิดรับสมาชิกทั่วไป
9. ติดตาม Firestore Usage ภายในโควตา Spark หากโควตาหมดให้รอ/ลดการอ่าน ไม่อัปเกรดแผนเอง ไม่เพิ่มบริการเสียเงินเพื่อให้ผ่านการทดสอบ

ยังไม่ได้ดำเนินการขั้น5–8กับระบบจริง คู่มือละเอียด: [SPARK-V21-SETUP.md](SPARK-V21-SETUP.md)

## ค่าใช้จ่ายและหลักฐาน

ตรวจเอกสาร [Firebase Pricing](https://firebase.google.com/pricing) และ [Rules Emulator testing](https://firebase.google.com/docs/firestore/security/test-rules-emulator) แล้ว บริการที่โค้ดใช้รองรับ Spark ภายในโควตา ไม่ต้องมีวิธีชำระเงิน แต่ยังไม่ได้เปิด Console ตรวจแผนจริงแทนเจ้าของ

หลักฐานเพิ่มเติมอยู่ใน test-results/preflight-*; ตารางคะแนนและสถานะรายเกมด้านล่างเป็นผล probe ไม่ใช่ใบรับรองการเล่นด้วยกล้องจริง

## ผลรายเกม

สรุป: โปรบกติกา/คะแนนผ่าน **30/31**; อีก1เกมยังตรวจไม่ครบ หน้า raw มี JS error **1/31**; กล้อง/มือและอุปกรณ์จริงยังไม่ทดสอบ **31/31** ไม่ใช้คำว่าเปิดใช้งานสมบูรณ์จากผลจำลอง

| เกม | ระบบกล้องตามโค้ด | กติกา/คะแนนตามโปรบ | หน้าเกมเดิม 3 ขนาด | อุปกรณ์จริง |
|---|---|---|---|---|
| AR Career Quest ตามล่าหาอาชีพ | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| AR Mini City สินค้าและบริการ | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| AR Paint Academy | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| AR คำตรงข้ามไทย | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| ar พิชิตตัวเลข | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| AR หนูน้อยเก็บชีสแสนอร่อย | ตามโหมดเกม | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| AR-bakery-pastry | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| ar-computer | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| ar-dino-fire-shooter | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| ar-dressed | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| ar-fishing-adventure | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| ar-good-food-v1 | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| ar-good-food-v2 | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| ar-good-food-v3 | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| AR-How-Do-You-Feel | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| ar-kob-game | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| ar-kok-game | กล้อง + คลิก/แตะ | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| ar-living-things-game-updated | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| ar-mole-game | กล้อง + คลิก/แตะ | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| ar-Multiplication | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| AR-Safety-Hero-Academy | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| ar-sudoku | Hands | ผ่านตามโปรบ (ตาราง 4 ด่าน) | ผ่าน smoke test | ยังไม่ทดสอบ |
| ar-sushi-game | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| ar-words-english | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| ar-คำพังเพย | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| AR-สัตว์มีกระดูกสันหลัง | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| ar-เก็บผลไม้ | Face/ใบหน้า | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| AR-แยกขยะด้วยมือ | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| AR_ANATOMY_LAB_A01 | Hands | ยังไม่ผ่านการตรวจครบ | พบ JS error | ยังไม่ทดสอบ |
| AR_Magnet_Lab | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |
| AR_Opposite | Hands | ผ่านตามโปรบ | ผ่าน smoke test | ยังไม่ทดสอบ |

ตัวอย่างผลที่มี assertion ชัดเจน: Career Quest ครบ3ด่านได้29/30เมื่อจงใจตอบผิด1ข้อ; Mini City ครบ5เขตได้5/6,4/5,9/9,9/9,3/3; Sudoku แก้ตารางครบ4ด่าน; AR Opposite ทำ20ข้อได้19เมื่อผิด1ข้อ

หลักฐาน probe ผ่าน30เกมใช้ทั้งคลิก/แตะจำลองและ native callbacks ไม่ได้หมายความว่าผู้เล่นจริงผ่านทุกด่านบนทุกอุปกรณ์แล้ว ผลที่สะดุดจากการกดก่อนโหลดเสร็จ/ยังไม่ออกfullscreen/รอHandsในเกมcamera-only เก็บในไฟล์แต่แทนผลด้วยการทดสอบซ้ำที่ถูกโหมด ส่วน ANATOMY LAB ยังไม่แทนเป็นผ่าน

## รันทดสอบซ้ำ

จากราก repository หลังเปิด Auth/Firestore demo Emulators ตามคู่มือ:

```powershell
$env:GCLOUD_PROJECT='demo-game-editor-membership'
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8080'
$env:FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099'
node membership-backend/test/preflight-production.cjs
node --test membership-backend/test/spark-unit.test.cjs membership-backend/test/gate.test.cjs
node membership-backend/test/preflight-membership.cjs
node membership-backend/test/preflight-browser.cjs
```

ใช้ Node22/Java21/Chrome/Python3 และ npm ci ใน membership-backend ตาม SPARK-V21-SETUP.md ชุด preflight-browser ใช้ helper/โมเดลจริงกับกล้องจำลองและเร่งเวลา เป็น developer probe ไม่ใช่การเล่นผ่าน UI ด้วยมือจริง ZIP ที่ชุด deep test สร้างมี test helpers จึงไม่ใช่ชุดแจกสมาชิก ห้ามอัปโหลด test exports ขึ้น Pages

การรันทดสอบ Rules ที่ clearFirestore ต้องทำก่อน seed หรือหลังปิดชุด browser แล้วเท่านั้น อย่าปิด Emulator ขณะที่อีกชุดยังใช้ การตรวจเกมต้นฉบับ raw และกล้องปฏิเสธมีสคริปต์ใน work/preflight-v21-raw.cjs และหลักฐาน preflight-raw-devices.json

รายการเปลี่ยนในงานตรวจนี้: เพิ่ม membership-backend/test/preflight-*.cjs และ preflight-support/*, เอกสาร PREFLIGHT-V21-*, หลักฐาน preflight-* และอัปเดต pointer สถานะเอกสาร ไม่เปลี่ยนโค้ดเกม/สมาชิก/Rules/config ที่ใช้งานจริง ไม่แก้ข้อผิดพลาดต้นฉบับโดยพลการ
