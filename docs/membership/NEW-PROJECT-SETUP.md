# คู่มือตั้งค่า Firebase ใหม่ — สมาชิก VIP Game Editor

สถานะ: เตรียมโค้ดและแผนเท่านั้น ยังไม่เปิดระบบสมาชิกบนเว็บไซต์ ยังไม่ Deploy และยังไม่เปลี่ยน Firebase ใด ๆ

## ทำความเข้าใจก่อนเริ่ม

ระบบใหม่นี้ใช้กับ `game-editor-preview` เท่านั้น Project เดิม `krukung-game-hub` ไม่ถูกแก้ไข เว็บไซต์และรหัส VIP เดิมยังเหมือนเดิม ระหว่างเตรียมงานหน้า preview ก็ยังใช้ระบบเดิม เพราะยังไม่ได้โหลดโค้ดสมาชิกใหม่

ผู้ใช้สมัครเอง → ยืนยันอีเมล → รอแอดมินตรวจทะเบียนสมาชิกเดิม → อนุมัติครั้งเดียว → ใช้งานตลอดชีพ โดยยังระงับสิทธิ์ได้หากจำเป็น ไม่มีการอนุมัติอัตโนมัติจากชื่อ Facebook ไม่ต้องย้ายรหัสผ่านของสมาชิกเดิมหรือให้แอดมินรู้รหัสผ่านสมาชิก

## ค่าใช้จ่าย — อ่านก่อนกดเปิดบริการ

| บริการ | ใช้ทำอะไร | ขั้นตอนนี้ควรทำอย่างไร |
|---|---|---|
| Firebase Project / Web App | แยกระบบสมาชิกใหม่ | สร้างบนแผน Spark ได้ ไม่ต้องผูกบัตรเพื่อเตรียมงาน |
| Authentication แบบ Email/Password | สมัคร เข้าระบบ ยืนยันอีเมล ลืมรหัสผ่าน | เปิดเฉพาะ Email/Password มีโควตาและข้อจำกัด ไม่เปิด Phone/SMS หรืออัปเกรด Identity Platform โดยไม่จำเป็น |
| Cloud Firestore Standard | เก็บคำขอ/สถานะสมาชิก/ประวัติ/คิวแจ้งเตือน | เริ่มใน Spark ได้ภายในโควตา การอ่าน/เขียนเกินโควตาหรือบริการเพิ่มเติมมีเงื่อนไขตามแผน |
| Cloud Functions | ตรวจสิทธิ์และอนุมัติทาง Backend | **นำขึ้นใช้งานจริงต้อง Blaze และ Billing** ยังไม่ต้องเปิดหรือผูกบัตรตอนนี้ Emulator รันในเครื่องก่อนได้ |
| Cloud Storage | เก็บไฟล์เกมที่ต้องจำกัดสิทธิ์ในอนาคต | **ต้อง Blaze** ยังไม่ต้องเปิดตอนนี้ อย่าอัปโหลดเกมหรือเปิด public rules |
| บริการส่งอีเมลแจ้งแอดมิน/อนุมัติ | ส่งอีเมลจากคิว Backend | ยังไม่ได้เลือกผู้ให้บริการ อาจมีค่าบริการ/โดเมน/โควตา ต้องแจ้งและตกลงก่อนเชื่อมจริง |
| Firebase Hosting | โฮสต์เว็บ | รอบนี้ยังใช้ GitHub Pages ไม่ต้องเปิด |
| Google Analytics / AI / Extensions | ไม่ใช่ข้อจำเป็นของระบบนี้ | ข้ามไว้ก่อน |

Blaze เป็นแบบคิดตามการใช้ ไม่ใช่เหมาจ่ายหรือรับประกันใช้ฟรี ถึงผู้ใช้ประมาณ 270 คนก็ยังประเมินยอดจริงไม่ได้ เพราะขึ้นกับการอ่านข้อมูล ไฟล์เกม ทราฟฟิก Functions การ build และอีเมล Budget alert เป็นการเตือน ไม่ใช่คำรับประกันตัดค่าใช้จ่ายอัตโนมัติ การตั้ง spend cap ถ้ามีให้ใช้ ต้องตรวจบริการที่ครอบคลุมแยกต่างหาก

อ้างอิงที่ตรวจวันที่ 17 ต.ค. 2026:
- ราคา/โควตา: https://firebase.google.com/pricing
- Functions กับ Blaze: https://firebase.google.com/docs/functions/get-started
- Storage กับ Blaze: https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
- Budget: https://firebase.google.com/docs/projects/billing/budget-alerts

## ขั้นที่ 1 — สร้าง Project ใหม่

1. เปิด https://console.firebase.google.com/ ด้วยบัญชี Google ของเจ้าของเว็บไซต์
2. กด **Create a project / Add project** อย่าเลือก Project `krukung-game-hub`
3. ตั้งชื่อ เช่น **Krukung Game Editor VIP**
4. ตรวจ **Project ID** ที่ระบบเสนอให้ เป็นรหัสใหม่ที่ไม่ซ้ำ เช่น `krukung-editor-vip-...` ชื่อที่ยกตัวอย่างยังไม่ได้จองหรือสร้างจริง จด Project ID เพราะเปลี่ยนภายหลังไม่ได้
5. หากมีตัวเลือก Analytics หรือเครื่องมือเสริม ให้ข้าม/ปิดสำหรับรอบนี้
6. สร้าง Project แล้วรอจนเปิด Dashboard ได้ ตรวจมุมบนทุกครั้งว่าอยู่ใน Project ใหม่
7. คงแผน **Spark** ไว้ก่อน หากระบบชวนเพิ่ม Billing ให้ข้าม ยังไม่ต้องเพิ่มบัตร

## ขั้นที่ 2 — เพิ่ม Web App เพื่อรับค่าตั้งค่า

1. ใน Project ใหม่ ไป **Project settings → General → Your apps** แล้วเลือกไอคอน **Web `</>`**
2. ตั้งชื่อ App เช่น **Game Editor VIP Web**
3. ไม่ต้องเลือก Firebase Hosting
4. เมื่อระบบแสดง `firebaseConfig` ให้เก็บชุดของ Project ใหม่นี้ไว้ ส่งให้ผู้พัฒนาในขั้นต่อไปได้ โดยเฉพาะ `projectId`, `authDomain`, `apiKey`, `appId` และ `messagingSenderId` ถ้ามี `storageBucket` ก็เก็บไว้ ไม่ต้องสร้าง Storage เพียงเพื่อให้มีค่า
5. Firebase Web config เป็นตัวระบุ App ฝั่งเว็บ ไม่ใช่ service-account private key และไม่ได้ให้สิทธิ์ Admin ด้วยตัวเอง แต่ยังต้องมี Rules ที่ถูกต้อง
6. **ไม่ต้องสร้างหรือส่ง Service Account JSON, Private Key, SMTP password หรือรหัส Google มาในแชต**

## ขั้นที่ 3 — เปิด Authentication

1. ไป **Build → Authentication → Get started**
2. ใน **Sign-in method / Sign-in providers** เลือก **Email/Password** แล้วเปิดเฉพาะ Email/Password ปกติ ไม่ต้องเปิด Email link แบบไม่ใช้รหัสผ่าน
3. ไปส่วน **Settings → Password policy** ถ้ามี ตั้งอย่างน้อย 12 ตัวอักษรและมีตัวอักษรอังกฤษ/ตัวเลข เลือกโหมด **Require** เพื่อบังคับฝั่งบริการ ไม่พึ่งเพียง validation บนหน้าเว็บ ค่าในโค้ดฝั่งเว็บรองรับความยาว 12–128 ตัวอักษร
4. ไป **Settings → Authorized domains** เพิ่ม **`krukung1234.github.io`** ใส่เฉพาะชื่อโดเมน ไม่ใส่ `https://` หรือ `/game-editor-preview/`
5. สำหรับ Emulator ไม่ต้องเพิ่ม localhost ลง Production ถ้าภายหลังตกลงทดสอบเว็บกับ Project จริงจาก localhost จึงค่อยเพิ่มชั่วคราว และเอาออกเมื่อเสร็จ Project ใหม่ไม่ได้เพิ่ม localhost ให้อัตโนมัติเสมอไป
6. ไป **Templates** ตรวจอีเมล Verification และ Password reset ใส่ชื่อผู้ส่ง/ชื่อเว็บไซต์ที่เข้าใจง่าย ตั้งภาษาตามที่ Console รองรับ
7. URL กลับเว็บไซต์ที่จะใช้จริงคือ `https://krukung1234.github.io/game-editor-preview/index.html` ส่วน Emulator ใช้ `http://localhost:8000/index.html` ไม่ใส่ localhost ในค่าที่นำขึ้นจริง
8. ยังไม่ต้องนำเข้าสมาชิก 270 คนหรือสร้างบัญชีแทนสมาชิก ให้สมาชิกสมัครเองหลังระบบผ่านทดสอบ แอดมินเทียบกับทะเบียนเดิมก่อนอนุมัติ

อ้างอิง: https://firebase.google.com/docs/auth/web/password-auth และ https://firebase.google.com/docs/auth/web/manage-users

## ขั้นที่ 4 — เตรียม Firestore ใน Project ใหม่

1. เปิด **Build → Firestore Database → Create database**
2. เลือก **Standard edition / Native mode** หากมีตัวเลือก อย่าเลือก MongoDB compatibility
3. เลือกฐานข้อมูล `(default)`
4. เลือก **Production mode** เพื่อเริ่มด้วยกฎปฏิเสธการเข้าถึง ไม่เลือก Test mode ที่เปิดกว้าง คำว่า Production mode ตรงนี้คือค่า Rules เริ่มต้น ไม่ได้หมายถึงนำเว็บไซต์ขึ้นใช้งานแล้ว
5. เลือก Location อย่างรอบคอบ แผน Backend นี้กำหนด Functions ไว้ที่ `asia-southeast1` (สิงคโปร์) จึงแนะนำ Firestore ในพื้นที่เดียวกันถ้ามีให้เลือกและสอดคล้องกับนโยบายข้อมูลของเจ้าของ ตรวจตัวเลือกจริงก่อนสร้าง เพราะย้าย Location ของฐานเดิมภายหลังไม่ได้ด้วยการกดเปลี่ยนค่า
6. ยังไม่ต้องสร้าง collection เอง โค้ด Backend จะสร้าง `editorMembers`, `editorMemberAudit`, `editorMemberOperations`, `editorNotificationOutbox` เมื่อมีการใช้งานจริงในอนาคต
7. คง Rules เริ่มต้นที่ปิดไว้ก่อน **ยังไม่ Publish Rules ในชุดโค้ดนี้** จนกว่า Emulator ผ่านและเจ้าของอนุญาต
8. ห้ามคัดลอกข้อมูล `games` หรือ Rules จาก `krukung-game-hub` มาทับโดยตรง

## ขั้นที่ 5 — หยุดก่อน Billing, Functions และ Storage

**เมื่อทำขั้น 1–4 แล้ว ส่ง Project ID และ Web config ใหม่มาให้ผู้พัฒนาได้เลย ยังไม่ต้องผูก Billing, เปิด Storage, Deploy Functions หรือย้ายเกม**

หาก Console ขอ Billing ในบริการใด ให้หยุดที่หน้านั้นและแจ้งก่อน ไม่กดยืนยันค่าใช้จ่ายแทนเจ้าของ

หลังทดสอบ Emulator และได้รับอนุญาตแล้วเท่านั้น ขั้นใช้งานจริงจะมี:
- เจ้าของพิจารณาอัปเกรด Blaze และเชื่อม Billing ของ Project ใหม่
- ตั้ง Budget/ผู้รับแจ้งเตือนค่าใช้จ่าย ตรวจโควตาและสิทธิ์ IAM
- Deploy Functions/Rules/Indexes เฉพาะ Project ID ใหม่ที่ระบุชัดเจน ไม่ใช้ alias ที่ชี้ Project เดิม
- สร้างบัญชีแอดมินใน Auth ใหม่และยืนยันอีเมล แล้วกำหนด custom claim `editorAdmin` ผ่าน Admin SDK ด้วยผู้มีสิทธิ์จริง ไม่ใช้รหัส Admin เดิมหรือการกรอกอีเมลเพื่อให้สิทธิ์
- เลือกผู้ให้บริการอีเมลและตั้ง Secret Manager; ทดสอบคิวซ้ำ/การ retry ก่อนเปิดส่งจริง
- ค่อยเปิดหน้า Login/สมัครสมาชิกและส่วน Admin สมาชิกบน preview หลังทดสอบ ไม่แตะเว็บหลัก

## โค้ดที่เตรียมไว้และขอบเขต

โฟลเดอร์ `membership-backend/` แยกจาก config Firebase เดิม ใช้ default Project สำหรับทดสอบชื่อ `demo-game-editor-membership` ไม่ใช่ Project จริง:
- Callable Backend สมัครคำขอ, ตรวจสิทธิ์, รายชื่อ/ค้นหาแบบ prefix/แบ่งหน้า, ยอดรออนุมัติ, รายละเอียด, อนุมัติ/ปฏิเสธ/ระงับ/คืนสิทธิ์
- ตรวจ Admin จาก Firebase Auth record/custom claim ฝั่ง server ทุกคำสั่ง ไม่เชื่อ `admin_ok` หรือ claim ที่ client ส่งมาเอง
- สมัครซ้ำหลัง network ล้มเหลวไม่ทำให้สถานะกลับ pending; เปลี่ยนสถานะใช้ revision และ request ID กันกดซ้ำ พร้อม audit และ outbox ใน transaction เดียวกัน
- Firestore Rules อนุญาตสมาชิกอ่านโปรไฟล์ตนเองแบบรายเอกสารเท่านั้น ห้าม client เขียนหรืออ่านคนอื่น Admin ใช้ Backend
- Storage Rules ปฏิเสธทุกอย่างไว้ก่อน ยังไม่ใช่ระบบส่งไฟล์เกมที่ย้ายเสร็จแล้ว
- `js/membership-client.mjs` เป็น module เชื่อม Auth/ยืนยันอีเมล/reset/ติดตามสถานะที่เตรียมไว้ ใช้ named Firebase App ใหม่ ไม่อ่านรหัสเดิมหรือใช้ `vip_ok` เป็นสิทธิ์
- คิวอีเมลมีเฉพาะข้อมูลประเภทแจ้งเตือน/UID ยังไม่มี worker ส่งจริง ไม่กล่าวอ้างว่าส่งแล้ว

**ยังไม่โหลด module ใหม่นี้ใน index.html** หน้า Login สมาชิกและ UI จัดการสมาชิกยังเป็นงานระยะถัดไปหลังรับค่า Project ใหม่ ไม่มีการเปลี่ยนระบบเดิมเงียบ ๆ

## ทดสอบในเครื่องโดยไม่ Deploy — สำหรับผู้พัฒนา

ต้องมี Node.js 22, npm และ JDK ที่ Emulator รุ่นติดตั้งรองรับ (แนะนำ JDK 21) ติดตั้ง dependency จาก manifest แล้ว lock รุ่นก่อน qualification ห้ามใช้ credentials ของ Project จริงในการทดสอบ

จากโฟลเดอร์ `membership-backend`:

```powershell
npm install
npm --prefix functions install
npm test
npm run test:emulator
```

คำสั่งเหล่านี้ไม่มี deploy และระบุ demo Project ไว้ใน script ชุดทดสอบ integration ปฏิเสธการรันหาก env ไม่ชี้ localhost demo Emulator ใช้พอร์ต 9099/8080/5001/9199/UI4000 ถ้าพอร์ตชนต้องเปลี่ยนทั้ง config/client/tests ให้ตรงกัน ไม่ย้ายไป Production แทนเมื่อ Emulator ล้มเหลว

อย่าเปิด `firebase deploy` หรือเลือก Project จริงระหว่างระยะนี้ ไม่ใส่ service account ไว้ใน repo และไม่อ้างว่าผ่าน Emulator จนมีผลทดสอบจริง

## ไฟล์เกมสาธารณะ — สิ่งที่ยังต้องทำ

`games/`, `editor-assets/` และข้อมูลเกม/Adapter ปัจจุบันอยู่ใน GitHub Pages และอาจอยู่ใน GitHub repository สาธารณะ เพิ่มบัญชีสมาชิกแล้วก็ยังเปิด URL ไฟล์เหล่านี้ตรง ๆ ได้ การซ่อนปุ่มหรือใช้ localStorage ไม่แก้เรื่องนี้

ทางเลือกที่เสนอให้พิจารณาภายหลัง: เก็บทรัพยากรที่ต้องจำกัดสิทธิ์ใน bucket ของ Project ใหม่แบบ private แล้วให้ backend ตรวจ ID token + verified email + สถานะ approved/lifetime ล่าสุดก่อนส่งไฟล์ ห้ามใช้ URL token ถาวรที่ใครคัดลอกไปก็โหลดได้ การอ่านไฟล์ผ่าน Admin SDK ข้าม Rules ดังนั้น proxy ต้องตรวจสิทธิ์เองทุกครั้ง

ก่อนย้ายจริงต้องทดสอบ HTML/JS/CSS/images/models/WASM/relative paths, CORS, worker, กล้อง และ ZIP ทั้ง 31 เกม รักษาเกมเดิม ไม่ใช้ iframe เปล่าหรือแทนข้อความสุ่ม การลบจาก Pages ไม่สามารถเรียกคืนสำเนาที่คนอื่นดาวน์โหลดหรือเก็บในประวัติ Git ไปแล้วได้ งานนี้ยังไม่ย้าย/ลบไฟล์เกมและยังไม่อ้างว่าป้องกันไฟล์สาธารณะได้

## ผลตรวจจริงในรอบเตรียมงาน

- Unit tests 8 กรณีผ่าน: guard Project เก่า, ฟิลด์สมัครที่อนุญาต, สถานะ/อีเมล, Admin claim จริง, revision/transition/self-approval, client config และ response ที่กลับมาช้าหลัง disabled/logout
- ตรวจ syntax ไฟล์ใหม่ผ่าน และ static verifier เกม31เกมเดิมผ่าน
- มี integration suite สำหรับ Auth + callable + Firestore/Storage Rules + verify/reset ใน Emulator แต่ **ยังไม่ได้รัน** เพราะเครื่องนี้ยังไม่มี Firebase CLI/npm/dependencies ครบ ไม่เท่ากับทดสอบระบบ Firebase จริงผ่าน
- ไม่ได้ทดสอบอีเมลส่งถึง inbox, UI สมาชิกบนมือถือ, Admin สมาชิก, การเปิดใช้31เกมด้วย Auth ใหม่ หรือ protected downloads เพราะยังไม่เชื่อมส่วนเหล่านั้น
- ไม่มีการ Deploy, แก้ Rules จริง, เปิด Billing, เขียนข้อมูล Firebase เดิม/ใหม่, Commit หรือ Push

## สิ่งที่เจ้าของต้องส่งกลับ

1. Project ID ใหม่
2. Web `firebaseConfig` ของ Project ใหม่
3. แจ้งว่าเปิด Email/Password และสร้าง Firestore แล้วหรือยัง พร้อม Firestore Location ที่เลือก

อีเมลแอดมิน/บริการส่งอีเมลจะถามก่อนตั้งค่าระยะถัดไป ไม่ต้องส่งรหัสผ่านหรือ Private Key
