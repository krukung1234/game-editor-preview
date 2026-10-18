# ANATOMY LAB: แก้ ASSET_FILES is not defined

แก้เฉพาะการเรียงลำดับสคริปต์ใน games/AR_ANATOMY_LAB_A01/index.html: ย้ายบล็อก A-01 PATCH เดิมไปหลังบล็อกประกาศ ASSET_FILES, scanMissions และฟังก์ชันที่ใช้ เนื้อหา JavaScript ทุกบล็อกและ HTML/CSS ส่วนอื่นเหมือนเดิมทุกตัวอักษร ไม่สร้างเกมใหม่

ปรับ js/adapters/native/native-28.json ให้ script IDs และ source hash ตรงกับลำดับใหม่ พร้อมนำ executionOrder ที่ย้ายซ้ำออก รักษาตำแหน่งแก้ข้อมูล คะแนน ภาพ และกลไกเดิมทั้งหมด

ปรับตัวตรวจ tools/verify-shared-editor.cjs ให้ยอมรับเฉพาะไฟล์ Anatomy ที่ผู้ใช้อนุญาตครั้งนี้ และตรวจว่ามีเพียงการย้าย script blocks ที่ไม่เปลี่ยนเนื้อหา โดยอ้างอิง docs/shared-editor/anatomy-source-order-fix.json เกม/ภาพ/ทรัพยากรอีก517ไฟล์มี SHA-256 เดิม

## ผลทดสอบ

- เกมต้นฉบับ: ไม่พบ JavaScript error หรือไฟล์ภาพหาย โหลดครบ87รายการ ตรวจ3ขนาดจอไม่มีแถบเลื่อนแนวนอน เล่นครบ5ภารกิจ
- Editor: เปิด แก้ชื่อ ทดลองเล่น คืนค่าและปิดได้ เล่นครบ5ภารกิจ กล้องจำลองส่งผล MediaPipe Hands ได้
- ดาวน์โหลด ZIP103ไฟล์ ตรวจ CRC แตกไฟล์ เปิดใน browser context ที่ไม่ล็อกอินและปิดคำขอภายนอก แล้วเล่นครบ5ภารกิจ ได้คะแนนเท่าฉบับ Preview ไม่มี test helpers ฝังอยู่ใน ZIP จริง
- คะแนนทดสอบทุกฉบับ: ภารกิจ1–5 = 7,5,5,5,4 รวม26 คะแนน โดยจงใจตอบผิดหนึ่งข้อในแต่ละภารกิจ ไม่แก้ตัวแปรคะแนนเพื่อให้ผ่าน
- ทดสอบผ่าน native callbacks/การคลิกและการสแกนจำลอง; ไม่ได้ทดสอบมือจริงหรือมือถือจริง ชุดทดสอบรอ preloadAssets เสร็จก่อนเริ่ม และใช้ทางเลือกไปภารกิจเดิมของเกม
- ตัวตรวจรวม31เกมผ่าน; อีก30เกมไม่ได้แก้ ไม่เปลี่ยน Firebase/Rules/แผนบริการ ไม่เปิด Blaze และไม่ Deploy/Commit/Push

หลักฐาน: evidence/native-28.json, anatomy-source-order-fix.json และ outputs/ANATOMY-FIX-RAW.json, outputs/ANATOMY-FIX-EDITOR.json

ไฟล์ที่ใช้งานจริงเปลี่ยน2ไฟล์คือ index.html ของ Anatomy และ native-28.json ที่ต้องใช้คู่กัน ที่เหลือเป็นตัวตรวจ ชุดทดสอบ และรายงานเท่านั้น หากเผยแพร่ในอนาคตให้ refresh/cache ใหม่เพื่อไม่จับคู่ HTML เก่ากับ Adapter ใหม่ งานนี้ยังไม่ได้เผยแพร่
