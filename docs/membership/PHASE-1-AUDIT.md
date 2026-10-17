# ระบบสมาชิก VIP ตลอดชีพ — ผลสำรวจระยะที่ 1

วันที่ 17 ตุลาคม 2026 • ยังไม่เปลี่ยน Authentication, Security Rules หรือ Production

## ขอบเขตที่ตรวจจริง
- Repository origin: https://github.com/krukung1234/game-editor-preview.git
- Branch: development/shared-editor-adapters
- ตรวจ index.html, js/app.js, js/config.js, js/vip-access.js, admin.html, js/admin.js, game-player.html และสถาปัตยกรรม Editor กลาง
- พบโฟลเดอร์เกม 31 โฟลเดอร์ ไม่แก้ไฟล์เกม
- ไม่พบ firebase.json, .firebaserc, Firestore Rules, Cloud Functions หรือแพ็กเกจ Firebase Authentication ใน Repository นี้ การไม่มีไฟล์ Rules ไม่ได้แปลว่า Production ไม่มีกฎ
- Firebase ที่หน้าเว็บอ้างอิงคือ krukung-game-hub; Firestore collection games ใช้โดยระบบรายการเกมและ Admin เดิม
- ยังตรวจ Console/Rules/IAM/Authentication providers/รายชื่อสมาชิกจริงไม่ได้ ไม่มีสิทธิ์ Firebase Console ใน session นี้ ไม่ได้อ่านข้อมูลส่วนตัวสมาชิก
- พยายามอ่าน config สาธารณะของเว็บไซต์หลักและ preview เพื่อเทียบ Project แต่ web tool เข้าถึงไม่ได้ และ shell DNS หา host ไม่ได้ จึงยังยืนยันไม่ได้ว่า Production ทั้งสองเว็บใช้ backend เดียวกัน

## โครงสร้างเดิมและผลกระทบ
| ส่วน | สิ่งที่พบ | แนวทาง |
|---|---|---|
| VIP | ตรวจรหัสร่วมใน js/app.js และเก็บ vip_ok ใน localStorage | เปลี่ยนเฉพาะ preview หลังมี backend ทดสอบ ไม่ใช้ vip_ok เป็นหลักฐานสมาชิกใหม่ |
| Admin เกม | ตรวจรหัสใน client และใช้ admin_ok; เขียน games ผ่าน Firestore client | คงระบบเดิม ห้ามนำ admin_ok ไปใช้อนุมัติสมาชิก เพิ่มส่วนสมาชิกที่ตรวจ Firebase ID token + custom claim |
| Firebase config | ใช้ krukung-game-hub และโหลด app/firestore compat 10.12.5 | ห้ามเปลี่ยน config เดิมโดยพลการ แยก config ระบบสมาชิกและ emulator |
| เครื่องมือ | VipAccess ตรวจ flag; Prompt/Editor/player เรียก gate นี้ | ใช้ gate กลางเดิม แต่ต้องรอ Auth และสถานะสมาชิกพร้อม ไม่เพิ่ม gate แยกทุกเกม |
| เกม/ทรัพยากร | games/ และ editor-assets/ เป็นไฟล์ static | Login ไม่สามารถปิดการอ่านไฟล์สาธารณะได้ ต้องออกแบบ protected delivery แยกหากต้องการป้องกันไฟล์จริง |
| ZIP | ประกอบเกมและรูปใน browser จากทรัพยากรต้นฉบับ | คง engine/composer เดิม การย้ายไป protected storage ต้องรักษา relative paths, SHA และ URL แบบไม่มี token สาธารณะถาวร |

ไม่คัดลอกรหัสผ่านเดิมหรือข้อมูลลับลงเอกสารนี้ ไม่แก้ js/config.js หรือระบบ Admin เดิม

## แผนที่เสนอ ก่อนเปลี่ยนระบบจริง
แนะนำ Firebase Project ใหม่เฉพาะสมาชิก Game Editor เพื่อแยก Auth, Rules, Functions และข้อมูลส่วนตัวจากเว็บไซต์ VIP เดิม ต้องยืนยัน Project ที่จะใช้ก่อนเชื่อมระบบจริง หากใช้ Project เดิมต้องได้ Rules ที่ deploy อยู่จริงทั้งหมดและสำรองก่อน รวมถึงตรวจ broad wildcard allow ที่อาจทำให้ collection ใหม่เปิดให้ทุกคนอ่าน/เขียนได้ การเพิ่ม deny เฉพาะ collection ไม่สามารถหักล้าง allow ที่ซ้อนทับได้

1. พัฒนาใน Emulator ด้วย demo project ID ไม่มี production credentials และไม่ fallback ไป Production เมื่อ emulator ใช้ไม่ได้
2. สมาชิกใช้ Email/Password Auth; ตรวจรูปแบบ ความยาว ชื่อ Facebook และยืนยันรหัส; ส่ง verification/reset ผ่าน Auth ไม่เก็บรหัสใน Firestore หรือ logs ไม่อ้างว่า validate client ป้องกัน API abuse ได้ทั้งหมด
3. Backend สร้าง application ให้ UID ตัวเองแบบ idempotent; กำหนด pending/lifetime จากฝั่ง server ไม่รับ status/role/approvedBy จาก client หากสร้าง Auth แล้วส่ง application ไม่สำเร็จให้ผู้ใช้ retry หลัง login ได้ ไม่สร้างบัญชีซ้ำ
4. ข้อมูลแยกเป็น editorMembers/{uid}: uid, facebookName, email, createdAt, status, entitlement, approvedAt, approvedBy, updatedAt และ revision ไม่มี expiry สำหรับ lifetime ประวัติการเปลี่ยนสถานะแยกใน editorMemberAudit และ notifications แยกออกจาก profile
5. Custom claim editorAdmin กำหนดโดย Admin SDK ผ่านคำสั่งของเจ้าของระบบที่มีสิทธิ์เท่านั้น ไม่ใช้รายชื่ออีเมล client หรือรหัส Admin เดิมเพื่อให้ claim ไม่ทับ claims อื่น
6. Callable backend ตรวจ token, emailVerified และ editorAdmin ทุกคำสั่งจัดการสมาชิก ใช้ transaction/revision/idempotency key ป้องกันกดซ้ำและ approve/disable แข่งกัน เก็บ actor UID + timestamp ฝั่ง server
7. ผู้ใช้ทั่วไปอ่านได้เฉพาะโปรไฟล์ตนเอง; client ห้ามเขียน approved/lifetime/role และห้ามอ่านคนอื่น Admin list/search ผ่าน backend ที่ตรวจ claim; pagination และจำกัดผลลัพธ์ ไม่มีการส่งทะเบียนทั้งหมดลงหน้า login
8. ก่อนเปิดเครื่องมือ ต้องได้ emailVerified + approved + lifetime จาก server ที่ตอบล่าสุด ไม่ใช้ storage flag หรือ claim approved ที่ค้างเป็นสิทธิ์ถาวร ฟังสถานะสมาชิกเพื่อระงับเครื่องมือและยกเลิกงานที่ยังไม่เสร็จเมื่อ disabled/rejected/logout ไม่ปิดเพราะ blur/visibilitychange
9. UI สมัคร/Login/ยืนยันอีเมล/รออนุมัติ/reset และส่วน Admin สมาชิก ใช้ดีไซน์เดิม ส่วน Admin เกมเดิมไม่เปลี่ยน
10. ส่งแจ้งเตือนใหม่/อนุมัติผ่าน outbox ฝั่ง server การสมัครต้องสำเร็จแม้ส่งอีเมลไม่ได้ ใช้ provider idempotency หากรองรับ, retry/backoff และบันทึกสถานะ ห้ามรับประกัน exactly-once email หาก provider ไม่รองรับ เก็บ SMTP/API secret ใน Secret Manager ไม่ลง GitHub
11. ทดสอบก่อนสลับ preview: verified/unverified, 4 สถานะ, approve/reject/disable/restore, member อ่านคนอื่น/แก้สิทธิ์ตนเอง, claim ปลอม, เข้าหน้าตรง, revocation และ emulator unavailable ต้องปฏิเสธสิทธิ์
12. ทดสอบ UI/Prompt/Editor/Preview/ZIP ครบ31เกมอีกครั้งหลังเชื่อม Auth; browser account isolation และ responsive รวมทั้ง regression เว็บไซต์เดิม

อ้างอิง Firebase: https://firebase.google.com/docs/auth/admin/custom-claims และ https://firebase.google.com/docs/emulator-suite/connect_auth

## ไฟล์ที่วางแผนเพิ่ม/เปลี่ยน
- เพิ่ม backend ระบบสมาชิก/การอนุมัติ/outbox และ emulator config/rules/tests ในพื้นที่แยก ไม่ใช่ไฟล์ deploy ทับ rules ปัจจุบัน
- เพิ่ม membership config/module/CSS และ Admin ส่วนสมาชิกที่แยก Auth จาก admin_ok
- ปรับ index.html/js/app.js/js/vip-access.js และทางเข้า player เฉพาะจุดเชื่อม Auth หลังผ่าน emulator
- ไม่แก้เกม31เกม ระบบ Prompt generator กลไก Editor หรือ config/Admin เดิมโดยไม่จำเป็น

## สิ่งที่ต้องทราบจากเจ้าของก่อนเชื่อมจริง
- ใช้ Firebase Project ใหม่ (แนะนำ) หรือ Project เดิม; หากเลือกเดิมต้องตรวจ Rules ที่ deploy จริงและแอปที่ใช้ร่วมกันก่อน
- ภายหลังต้องกำหนด UID เจ้าของ Admin ผ่าน Firebase Auth และอีเมลผู้รับแจ้งเตือน/บริการส่งอีเมล ไม่ขอ service-account key หรือ SMTP password ในแชต
- ตกลงว่ารอบแรกจำกัดเฉพาะเครื่องมือ หรือย้ายทรัพยากรเกมสาธารณะไป protected storage ด้วย การย้ายทรัพยากรจะต้องมีการทดสอบ paths/SDK/ZIP เพิ่ม ไม่อ้างว่า login อย่างเดียวป้องกันไฟล์เกมได้

## ผลทดสอบรอบนี้
ตรวจโครงสร้างจากโค้ดและจำนวนเกมเท่านั้น ยังไม่ได้พัฒนา/รันการสมัคร ยืนยันอีเมล อนุมัติ Functions Rules หรืออีเมล จึงยังไม่รายงานว่ากรณีทดสอบ18ข้อผ่าน Java มีในเครื่อง แต่ไม่พบ Firebase CLI/npm ใน PATH ต้องเตรียมเครื่องมือก่อน Emulator

ไม่มีการเรียกเขียน Firebase, เปลี่ยน Rules, Deploy, Commit หรือ Push
