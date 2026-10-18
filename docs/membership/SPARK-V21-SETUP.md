# เปิดใช้งาน Game Editor VIP V21 แบบ Spark เท่านั้น

18 ตุลาคม 2026 — เอกสารนี้แทนแผน V21 เก่าที่ใช้ Functions/Storage ทั้งหมด

ขณะส่งมอบยังไม่ Deploy ไม่เปลี่ยน Rules หรือบัญชีจริง และปิดการเชื่อมระบบสมาชิก Production ไว้ ต้องได้รับอนุญาตเจ้าของก่อนทำขั้นตอนที่เขียนข้อมูลจริงด้านล่าง

## บริการและค่าใช้จ่าย

ใช้ GitHub Pages, Firebase Authentication แบบ Email/Password และ Cloud Firestore Standard `(default)` ของ `krukung-game-editor-vip` เท่านั้น ไม่ต้องเปิด Blaze ไม่ต้องผูก Billing ไม่ใช้ Functions, Storage, Gateway, Extensions หรือบริการส่งอีเมลภายนอก ไม่เปิด Phone Auth หรือ Identity Platform เพิ่มเติม

ตรวจเอกสาร Firebase วันที่ 18 ตุลาคม 2026:

- [ราคา Spark](https://firebase.google.com/pricing): ไม่ต้องมีวิธีชำระเงิน รองรับ Authentication ที่ไม่ใช่โทรศัพท์และ Firestore ภายในโควตา
- [Firestore ฟรี](https://firebase.google.com/docs/firestore/quotas): ฐานข้อมูลฟรีหนึ่งฐาน/project, พื้นที่ 1 GiB, อ่าน 50,000 ครั้ง/วัน เขียน 20,000 ครั้ง/วัน ลบ 20,000 ครั้ง/วัน และส่งข้อมูลออก 10 GiB/เดือน
- [อีเมล Authentication](https://firebase.google.com/docs/auth/limits): ยืนยันอีเมล 1,000 ฉบับ/วัน และรีเซ็ตรหัสผ่าน 150 ฉบับ/วันใน Spark มีข้อจำกัดการส่งถี่และการสร้างบัญชีต่อ IP ด้วย

ฟรีภายในโควตา ไม่ใช่ไม่จำกัด หากแตะโควตาให้รอรอบใหม่/ลดการอ่าน ห้ามแก้โดยอัปเกรดแผนเอง การอ่านประกอบ Security Rules และ listener ใช้โควตาด้วย หน้า Admin โหลดรายการ/ยอดรวมเมื่อเปิดหน้า กดค้นหา หรือเปลี่ยนสถานะ ไม่มีการอ่านสมาชิกทั้งหมดทุกนาที มี listener เฉพาะคำขอล่าสุดหนึ่งรายการเพื่อแจ้งคำขอใหม่

## สิทธิ์ทำงานอย่างไร

1. ผู้สมัครสร้างบัญชี Auth และโปรไฟล์ pending ของตนเองเท่านั้น Rules ปฏิเสธการสร้าง approved/role/entitlement เอง
2. อีเมลยืนยันด้วย Firebase Auth สมาชิกบันทึก `verifiedEmail` ได้เมื่อ JWT มี `email_verified=true` และอีเมลตรงโปรไฟล์เท่านั้น Admin อนุมัติอีเมลที่ยังไม่ผ่านขั้นตอนนี้ไม่ได้
3. ทะเบียน `/editorAdmins/{UID}` กำหนดได้จาก Firebase Console โดยเจ้าของ project เท่านั้น ทุก browser ถูกห้ามเขียนทะเบียนนี้ รวมทั้ง Admin ในเว็บไซต์
4. Admin ที่ยืนยันอีเมลและมี `enabled: true` จึงอ่านรายชื่อและเปลี่ยนสถานะผู้อื่นได้ เปลี่ยนสถานะตนเองไม่ได้ ทุกการเปลี่ยนมี revision และ audit ใน transaction เดียวกัน Rules ตรวจทั้งสองเอกสาร ปฏิเสธการเขียนที่ขาด audit หรือใช้ข้อมูลรุ่นเก่า
5. เอกสาร `/editorAccess/status` อ่านจาก server ได้เฉพาะสมาชิก approved/lifetime ที่อีเมลตรงกับ Auth และยืนยันแล้ว หน้าเว็บตรวจเอกสารนี้ก่อนเปิดเครื่องมือ ทดลองเล่น หรือดาวน์โหลด
6. สิทธิ์ไม่ผูกกับชื่อหรือจำนวนเกม จึงครอบคลุมเกมใหม่โดยไม่เพิ่มรายชื่อเกมในระบบสมาชิก ต้องพัฒนา/ทดสอบ Adapter ของเกมใหม่ตามขั้นตอน Editor เดิม

## ขั้นตอนใน Firebase Console หลังอนุญาตเปิดใช้งาน

1. เปิด Firebase Console เลือก **krukung-game-editor-vip** ตรวจ Project ID ก่อนทุกครั้ง ห้ามเลือก `krukung-game-hub` ตรวจแผนเป็น **Spark** ไม่มี Billing ที่เชื่อมอยู่ หากแสดง Blaze ให้หยุดและให้เจ้าของตรวจแผนก่อน โค้ดในเครื่องไม่สามารถยืนยันสถานะแผนจริงแทน Console ได้
2. Authentication → Sign-in method: ใช้ Email/Password ที่เปิดแล้ว Authentication → Settings → Authorized domains: ตรวจ `krukung1234.github.io` Authentication → Templates: ตรวจชื่อผู้ส่ง/ลิงก์ยืนยันและรีเซ็ตรหัสผ่าน ไม่ต้องเปิดบริการส่งอีเมลเพิ่ม
3. Firestore Database เลือก `(default)` ที่ Singapore → Rules คัดลอก **membership-backend/firestore.rules** ฉบับ Spark ทั้งไฟล์ ตรวจให้ถูก project แล้วจึง Publish เมื่อได้รับอนุญาต ไฟล์นี้ deny collection ที่ไม่ระบุทั้งหมด จึงใช้กับ project สมาชิกใหม่เท่านั้น
4. สร้าง composite indexes ตาม **membership-backend/firestore.indexes.json**: `editorMembers`: status ASC + facebookKey ASC; status ASC + emailKey ASC; status ASC + createdAt DESC รอให้พร้อมใช้งาน Emulator ไม่บังคับ composite index ครบเหมือน Production จึงต้องทำขั้นตอนนี้จริงก่อนใช้งานค้นหา/แจ้งเตือน
5. Firestore → Data → Start collection: `editorAdmins` → Document ID: **WHwQKKGBlKWlV8dgkeyRGzDCuwn1** → field `enabled`, ชนิด **boolean**, ค่า **true** ใช้ UID เดิมที่ยืนยันอีเมลแล้ว ไม่ใส่อีเมลแทน UID ไม่สร้างบัญชีใหม่ ไม่ต้องมี Custom Claim หรือ Service Account Key หากต้องถอน Admin ให้เปลี่ยน enabled เป็น false จาก Console
6. สร้าง collection `editorAccess` → Document ID `status` → field `enabled` ชนิด boolean ค่า true เอกสารนี้เป็นจุดตรวจสิทธิ์จาก Rules ไม่ใช่รหัสลับ ห้ามเปิด write ให้ผู้ใช้
7. เตรียมเปิดเว็บ: ใน **js/membership-config.js** เปลี่ยนเฉพาะโหมดสำหรับโฮสต์จริงจาก `disabled` เป็น `production` และ `productionReviewed:false` เป็น `true` หลังตรวจ Rules/indexes/ทะเบียนแอดมินแล้ว คงเงื่อนไข localhost เป็น emulator และคง project ใหม่เดิม ไม่แก้ Firebase ของรายการเกมเก่า
8. นำไฟล์ที่แก้ขึ้น branch ทดลองของ repository `game-editor-preview` และตั้ง GitHub Pages ให้ใช้ branch/วิธีเผยแพร่เดิม เมื่อเจ้าของอนุญาตเท่านั้น ไม่อัปโหลด node_modules, test exports, logs หรือไฟล์ key ใด ๆ ไม่มีการรัน firebase deploy ทั้ง project ไม่จำเป็นต้องใช้ Firebase Hosting
9. เจ้าของเข้าบัญชีแอดมินเดิม หากยังไม่มีโปรไฟล์ให้กรอกชื่อ Facebook ใน “ส่งคำขอสมาชิกต่อ” จากนั้นกดตรวจสอบสถานะอีกครั้งเพื่อบันทึกหลักฐานยืนยันอีเมล จะมีลิงก์ “จัดการสมาชิก” จากทะเบียน Admin แม้โปรไฟล์เจ้าของยัง pending
10. หากต้องให้บัญชีเจ้าของเล่น/ปรับแต่งด้วย ให้เจ้าของ project เปิด Console → editorMembers → UID เดิม เปลี่ยน status เป็น `approved`, entitlement เป็น `lifetime`, revision เป็น number 1, approvedAt/updatedAt เป็น timestamp ปัจจุบัน และ approvedBy เป็น UID เดิม คง uid/email/verifiedEmail เดิม ห้ามให้เว็บอนุมัติตนเอง Console เป็นช่องทางผู้ดูแลที่เชื่อถือได้สำหรับตั้งค่าครั้งแรกเท่านั้น
11. ทดลองสมาชิกใหม่ใน browser อีกโปรไฟล์ สมัคร → ยืนยันอีเมล → กดตรวจสอบสถานะ → ต้องเห็น “รอการอนุมัติจากแอดมิน” จากนั้น Admin ค้นชื่อ Facebook เทียบทะเบียนเดิมแล้วอนุมัติ สมาชิกจึงใช้งานได้ ไม่มีวันหมดอายุ ทดสอบปฏิเสธ ระงับ และคืนสิทธิ์ รวมทั้งปิด/เปิด Editor ใหม่ก่อนเปิดรับสมาชิกจริง
12. ดู Firestore Usage และ Authentication usage เป็นระยะ ไม่เปิด TTL/PITR/Backup/Storage/Functions หรือ Extensions เพราะงานนี้ไม่ใช้บริการดังกล่าว

ทางเลือกติดตั้ง Rules/indexes ด้วย CLI (เป็นคำสั่งอ้างอิง ยังไม่ได้รันกับ project จริง):

```powershell
cd "C:\Users\Admin\Documents\Codex\2026-10-16\new-chat\outputs\game-editor-preview-all-games\membership-backend"
npm ci
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes --project krukung-game-editor-vip
```

ใช้บัญชีเจ้าของผ่าน browser OAuth ไม่ขอ Private Key ไม่ฝังรหัสผ่าน การใช้ Console ตามขั้นตอนข้างต้นไม่จำเป็นต้องติดตั้ง CLI

## ทดสอบในเครื่องโดยไม่แตะ Production

ต้องมี Node.js 22, Java 21, Chrome และ Python 3 สำหรับทดสอบ ZIP บน Windows:

```powershell
cd "C:\Users\Admin\Documents\Codex\2026-10-16\new-chat\outputs\game-editor-preview-all-games\membership-backend"
npm ci
npm test
npm run test:emulator
$env:EDITOR_ALL_GAME_PACKAGES = '1'
npm run test:full
```

หาก python/Chrome ไม่อยู่ตำแหน่งปกติ ตั้ง `EDITOR_PYTHON_PATH` และ `EDITOR_CHROME_PATH` เป็น absolute path ก่อนรัน คำสั่งทั้งหมดใช้ demo project เท่านั้น บัญชีตัวอย่างใน tests ไม่ใช่บัญชีจริง

เปิดเว็บทดสอบด้วยสองหน้าต่าง PowerShell: หน้าต่างแรก `npm run emulators` ในโฟลเดอร์ membership-backend; หน้าต่างที่สองกลับราก repository แล้ว `node tools/serve-membership-preview.cjs` เปิด `http://127.0.0.1:8085/` และ Emulator UI `http://127.0.0.1:4000/` ข้อมูลจำลองไม่ใช่ข้อมูล Firebase จริง

## ข้อจำกัดที่ยอมรับ

- Login และ Rules ล็อกหน้าเครื่องมือและข้อมูลสมาชิก **ไม่ป้องกันไฟล์เกมบน GitHub Pages** ผู้ที่รู้ URL ตรงของไฟล์สาธารณะยังอาจเปิดหรือดาวน์โหลดได้ ZIP ส่วนตัวที่ดาวน์โหลดแล้วเล่นได้โดยไม่ล็อกอิน และถอนย้อนหลังจากเครื่องผู้ใช้ไม่ได้
- หากเจ้าของปิด Auth account จาก Console โดยไม่เปลี่ยน member status token เก่าอาจใช้ได้จนหมดอายุ ให้ระงับสมาชิกจากหน้า Admin หรือเปลี่ยน status เป็น disabled พร้อม entitlement:null ใน Console เพื่อให้ Rules และ listener ตรวจได้ทันที ไม่อ้างว่ามี server ตรวจ Auth record ทุก request แบบ Functions
- ไม่รองรับการเปลี่ยนอีเมลสมาชิกในหน้าเว็บครั้งนี้ หาก Auth email เปลี่ยน ระบบปฏิเสธสิทธิ์จนเจ้าของตรวจและแก้โปรไฟล์อย่างถูกต้อง
- Working Copy เก็บในหน่วยความจำเท่านั้น สลับแท็บไม่ล้าง ปิด Editor/รีเฟรชแล้วกลับต้นฉบับ ไม่มีการบันทึกฉบับร่างถาวร
- กล้อง/Hand Tracking ต้องทดสอบกับอุปกรณ์จริงและสิทธิ์กล้อง ใช้ HTTPS หรือ localhost ตาม browser เกมที่ต้องใช้โมเดล/SDK อาจมีข้อจำกัดเมื่อเปิดจาก file:// การทดสอบออฟไลน์ในเครื่องไม่รับรองอุปกรณ์ทุกรุ่น
- สถานะ lifetime หมายถึงไม่มีวันหมดอายุในระบบ สิทธิ์ยังถูกระงับ/คืนได้โดย Admin และขึ้นกับเว็บไซต์ยังให้บริการอยู่
