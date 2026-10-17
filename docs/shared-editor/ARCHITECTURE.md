# สถาปัตยกรรม Editor กลาง

ใช้ js/game-editor.js เดิมเป็นหน้าต่างเดียว 3 แท็บ/3 ปุ่ม Mini City ยังคง Adapter เดิม ส่วนเกมอื่นเป็น schemaVersion 2 ใช้ implementation ร่วมใน shared-native-adapters.js และ Blueprint JSON ตามเกม ไม่มี UI/ตัวเล่นทดแทนแยก 31 ชุด

1. native-adapter-catalogue.js เก็บเฉพาะ metadata และสถานะรับรอง enabled=true ใช้ได้เฉพาะ qualification=complete
2. เปิด Editor แล้วโหลด Blueprint เฉพาะเกมนั้นผ่าน load() รายการ values เริ่มต้นคำนวณจาก binding paths ลดคลังข้อความซ้ำ จากนั้น clone เป็น Working Copy แยกจากต้นฉบับ
3. ฟอร์มสร้างจาก field capabilities จริง ไม่เปิดจำนวนด่าน/ID/ฟิสิกส์/ตำแหน่งที่ยังไม่มี validator รูปแบ่งหน้า 12 รายการ วิชาและระดับชั้นอ่านจากต้นฉบับและแสดงแบบอ่านอย่างเดียว ไม่มี state ร่วมกับ Prompt
4. Preview ใช้ต้นฉบับ games/<folder>/index.html และสคริปต์จริง ผ่าน composer ที่ตรวจ SHA-256 ของ HTML และแต่ละสคริปต์ก่อนแทนเฉพาะตำแหน่ง AST ของ data initializer ที่อนุญาต พร้อม score observation และตำแหน่งชื่อเกมที่ประกาศชัดใน manifest ไม่สุ่มค้นหาแล้วแทนข้อความ HTML
5. shared-game-player เป็นกรอบข้อมูลบทเรียนและ iframe ของ engine จริง การเปลี่ยนคำถาม/คำตอบเกิดใน data initializer ของ engine ไม่ใช่ iframe แสดงตัวอย่างข้อมูลเฉย ๆ ขนาด viewport ขั้นต่ำระบุได้ตามประเภทเกมเพื่อรักษาพิกัด/สัดส่วนในจอสั้น ไม่มีการเปลี่ยนกติกาเพื่อให้พอดีจอ
6. native-game-session อยู่ภายในเกมส่วนตัวเท่านั้น เชื่อมรูปที่แก้กับ path เดิม และเก็บ native progress ใน memory จัดการ stream/model/observer ตอน dispose ไม่แก้ parent Storage prototype ไม่ปิด Editor จาก blur/focus/visibilitychange
7. ดาวน์โหลดจึง dynamic import shared-game-package.js รวบรวมเฉพาะ resources ของเกมที่เลือก พร้อมรูป/โมเดล/ไฟล์ JS/WASM/ใบอนุญาตที่จำเป็น ใช้ ZIP writer/CRC verifier ร่วมกับ Mini City ไม่มีการบันทึกลง Firestore/Repository
8. เมื่อกลับจาก Preview หยุด stream/model โดยชัดเจนก่อนถอด frame ปิด Editor แล้ว abort งาน ปล่อย DOM/Blob URL/Blueprint และเปิดครั้งหน้าจากต้นฉบับ

## กติกาสำหรับ Adapter ถัดไป

- ไม่ตั้ง enabled=true เพราะเปิดหน้าฟอร์มได้อย่างเดียว ต้องผ่านทั้งแก้ข้อมูลจริง ตอบถูก/ผิด คะแนน จบภารกิจ AR/กล้อง ภาพ ZIP แตกแล้วทำงาน Responsive และต้นฉบับไม่เปลี่ยน
- ห้ามเปิดช่องของ ID, coordinates, counters หรือค่าที่สัมพันธ์กันโดยไม่มี validation เฉพาะชนิดเกม เช่น Sudoku ต้องตรวจ row/column/block และ clue; แม่เหล็กเดิมต้องคงจำนวน 8/8
- ค่าของแต่ละเกมมีโครงสร้างต่างกัน ต้องตรวจ call sites และโค้ดที่ override ค่าภายหลัง ไม่สมมติว่า constant ทุกชุดถูกใช้จริง
- ชื่อเกมในภาพเป็น raster ต้องให้ผู้ใช้เปลี่ยนรูปเอง แผ่น sprite มี geometry เดิม ไม่อ้างว่า AI/Editor เปลี่ยนตัวหนังสือในภาพอัตโนมัติ
- เปลี่ยน source เกมแล้ว SHA จะไม่ผ่าน ต้องสำรวจ/สร้าง descriptor ใหม่และทำ qualification ใหม่ การปรับ JSON offsets เองโดยไม่ตรวจ AST ไม่ปลอดภัย
- ข้อมูลแก้ไขไม่ใช่ draft ถาวร ไม่เพิ่ม localStorage/IndexedDB มาแก้การสลับแท็บ

ตรวจโครงสร้างด้วย node tools/verify-shared-editor.cjs ก่อนทดสอบจริง คำสั่งนี้ไม่ใช่ตัวรับรอง gameplay แทนการเล่นเกมและ ZIP

รุ่น19: answerTextRule เป็นความสัมพันธ์ในBlueprintระหว่างตัวเลือก ตำแหน่งคำตอบ และข้อความเฉลย จัดการผ่าน input handler กลางเพียงจุดเดียว ไม่มีการเปลี่ยนengineตามเกม
