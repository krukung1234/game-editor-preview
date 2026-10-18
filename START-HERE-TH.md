# Game Editor VIP V21 Spark — เริ่มทดสอบในเครื่อง

ชุดรวมเว็บไซต์เดิม ระบบสมาชิก และเกม 31 เกม รวม ANATOMY LAB ฉบับแก้ลำดับโหลดสคริปต์แล้ว ไม่ใช่ ZIP แพตช์ เกมต้นฉบับอื่นไม่ได้เปลี่ยนกลไก

ยังไม่ Deploy ไม่เปลี่ยน Firebase จริง ไม่ Commit/Push และไม่เปิด Billing ระบบ Production ยังปิดไว้โดยตั้งใจ ใช้เฉพาะ Authentication Email/Password และ Firestore ไม่มี Functions, Storage หรือ Gateway

## เปิดบน Windows

1. แตก ZIP ทั้งชุดก่อน เช่น `C:\GameEditor` เข้าโฟลเดอร์ที่มี `index.html` และ `membership-backend` อย่าเปิดจากใน ZIP
2. ติดตั้ง Node.js 22, Java 21 และ Chrome ถ้าจะรันทดสอบ ZIP ให้ติดตั้ง Python 3 ด้วย ตรวจด้วย `node --version`, `java -version`, `python --version`
3. ในโฟลเดอร์ดังกล่าว คลิกแถบที่อยู่ Explorer พิมพ์ `powershell` แล้ว Enter รัน:

```powershell
cd membership-backend
npm ci
npm run emulators
```

4. เปิด PowerShell อีกหน้าต่างที่โฟลเดอร์หลักเดิม รัน:

```powershell
node tools/serve-membership-preview.cjs
```

5. เปิด `http://127.0.0.1:8085/index.html` ส่วน Emulator เปิด `http://127.0.0.1:4000` ต้องคงหน้าต่างคำสั่งทั้งสองไว้ อินเทอร์เน็ตจำเป็นตอนติดตั้งแพ็กเกจและโหลด Firebase SDK/ทรัพยากรภายนอก
6. สมัครด้วยอีเมลทดสอบ ชื่อ Facebook และรหัสผ่านใหม่สำหรับทดสอบเท่านั้น ลิงก์ยืนยันอีเมลจำลองจะแสดงในหน้าต่าง Emulator เปิดลิงก์แล้วกลับมากดตรวจสอบสถานะ ต้องเห็นรออนุมัติ
7. ตั้งแอดมินเฉพาะใน Emulator UI: ดู UID จาก Authentication สร้างเอกสาร Firestore `editorAdmins/UID` โดยเพิ่ม `enabled` ชนิด boolean เป็น true ห้ามใส่ UID บัญชีทดสอบนี้ลงทะเบียนแอดมิน Production
8. เปิด `http://127.0.0.1:8085/membership-admin.html` ด้วยบัญชีทดสอบที่ยืนยันอีเมลและมีทะเบียน Admin แล้ว อนุมัติสมาชิกทดสอบอีกบัญชีหนึ่ง ทดสอบปฏิเสธ ระงับ และคืนสิทธิ์ด้วย ใช้คนละโปรไฟล์เบราว์เซอร์
9. สมาชิก approved ทดลองเปิด Editor เปลี่ยนชื่อ/ภารกิจ/ภาพ ทดลองเล่น คืนค่า ดาวน์โหลด ZIP แตกไฟล์แล้วเปิดเกม หากกล้องใช้กับ file:// ไม่ได้ ให้ใช้ localhost หรือ HTTPS ตามความสามารถเบราว์เซอร์
10. ปิดเซิร์ฟเวอร์และ Emulator ด้วย Ctrl+C ข้อมูล Emulator ไม่ใช่ข้อมูลสมาชิกจริง และอาจหายเมื่อปิด ไม่มีการเก็บ Working Copy ถาวร

## รันทดสอบอัตโนมัติ

ปิด Emulator ที่รันอยู่ก่อน จากโฟลเดอร์ `membership-backend`:

```powershell
npm test
npm run test:emulator
$env:EDITOR_ALL_GAME_PACKAGES='1'
npx firebase emulators:exec --project demo-game-editor-membership --only auth,firestore "node test/release-complete.cjs"
```

หาก `python` เป็น Windows Store alias ให้กำหนด `$env:EDITOR_PYTHON_PATH` เป็นตำแหน่ง python.exe จริง ทดสอบนี้เปิด Chrome headless ใช้ข้อมูลสมาชิกจำลองและแค็ตตาล็อกจำลอง แต่โหลด Editor และไฟล์เกมจริง ไฟล์ผลทดสอบจะเขียนข้างโฟลเดอร์เว็บไซต์ ห้ามใช้บัญชี/รหัสผ่านจริงในชุดทดสอบ

## อุปกรณ์จริงและการเปิดทดลองออนไลน์

localhost ของโทรศัพท์หมายถึงโทรศัพท์เอง ไม่ใช่คอมพิวเตอร์ เซิร์ฟเวอร์ตัวอย่างนี้รับเฉพาะเครื่องเดียว เพื่อทดสอบ Android Chrome / iPhone Safari ผ่านระบบสมาชิกและกล้อง ต้องเตรียม URL HTTPS ทดลองหลังเจ้าของอนุญาต ใช้เช็กลิสต์ `docs/membership/PREFLIGHT-V21-MANUAL-ACCEPTANCE.csv` ทั้ง 31 แถว ตรวจทุกด่าน คะแนน โบนัส คำตอบผิด/ถูก เริ่มใหม่ เสียง การอนุญาต/ปฏิเสธกล้อง มือจริง การแตะ หมุนจอ สลับแท็บ และ ZIP ที่แตกแล้ว บันทึกชื่อเครื่อง OS เบราว์เซอร์ วันที่และหลักฐาน

ผล Chrome จำลองไม่ยืนยันว่ากล้อง/Hand Tracking/เสียงบน iPhone หรือ Android ผ่านแล้ว เกมที่ไม่ใช้ Hand Tracking ให้บันทึกไม่เกี่ยวข้องตามกลไกจริง อย่าคาดหมายว่าทุกเกมใช้การควบคุมเหมือนกัน

ขั้นตอน Production ภายหลังอนุญาตอยู่ใน `docs/membership/SPARK-V21-SETUP.md`: ตรวจ Spark ของ project `krukung-game-editor-vip`, ติดตั้งเฉพาะ Firestore Rules/indexes, สร้างทะเบียน Admin UID เดิมผ่าน Console, ตั้งเอกสารสิทธิ์ และเปิด config/เผยแพร่เว็บทดลองตามลำดับ ห้ามเปลี่ยน project `krukung-game-hub` การตั้ง Admin ไม่ใช้รหัสลับหรือ Service Account Key ในเว็บ ห้ามเปิด Blaze

## ข้อจำกัดสำคัญ

- ระบบสมาชิกล็อกหน้าเครื่องมือและใช้ Firestore Rules ตรวจสิทธิ์สมาชิก แต่ไฟล์เกมบน GitHub Pages เป็นไฟล์สาธารณะ ผู้ทราบ URL ตรงยังอาจเปิดได้ ไม่ใช่ระบบป้องกันไฟล์สมบูรณ์
- ยืนยันอีเมลใน Emulator ไม่ใช่การส่งอีเมลจริง การส่งถึงกล่องจดหมายจริงและการตั้งค่า Console ต้องตรวจภายหลังได้รับอนุญาต
- สถานะล็อกอินใช้ session ของแท็บ คงอยู่เมื่อ reload แท็บเดิม แต่ไม่รับประกันหลังปิดเบราว์เซอร์ Working Copy หายเมื่อปิด Editor/โหลดหน้าใหม่ตามข้อกำหนด
- ไฟล์ภาพมีข้อความฝังอยู่เปลี่ยนข้อความอัตโนมัติไม่ได้ ต้องเปลี่ยนภาพ ทรัพยากร AR ที่จำเป็นคงไว้ ไฟล์อาจมากกว่า index.html และ images/
- แพ็กเกจนี้ไม่นำหน้า Admin รุ่นเก่าและ config รหัสผ่านแบบเก่ามารวม ใช้ `membership-admin.html` เท่านั้น ไม่ได้ลบหรือแก้เว็บไซต์ VIP เดิม

ดูผลตรวจล่าสุดใน `docs/membership/RELEASE-V21-REPORT.md` และหลักฐาน JSON ในโฟลเดอร์เดียวกัน
