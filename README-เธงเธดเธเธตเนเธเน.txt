Krukung Game Hub V15 - VIP Login + Admin Login

สิ่งที่เพิ่มในเวอร์ชันนี้
1) หน้าเว็บหลัก https://krukung1234.github.io/ จะมีหน้า Login สำหรับสมาชิก VIP ก่อน
2) หน้า Admin https://krukung1234.github.io/admin.html ใช้รหัส Admin แยกต่างหาก
3) หน้า Login ไม่แสดงรหัสผ่านบนหน้าจอ
4) ระบบเกมยังใช้ Folder Mode เหมือนเดิม

รหัสผ่านเริ่มต้น
- VIP Password: vip2026
- Admin Password: vip69

วิธีเปลี่ยนรหัสผ่าน
เปิดไฟล์ js/config.js แล้วแก้บรรทัดนี้
const VIP_PASSWORD = "vip2026";
const ADMIN_PASSWORD = "vip69";

วิธีลงเว็บ
1. แตก ZIP
2. เปิดโฟลเดอร์ krukung_v15
3. คัดลอกไฟล์ทั้งหมดไปวางทับในโฟลเดอร์ krukung1234.github.io
4. เปิด GitHub Desktop
5. Commit
6. Push origin
7. เปิดลิงก์
   https://krukung1234.github.io/?v=15
   https://krukung1234.github.io/admin.html?v=15

หมายเหตุเรื่องความปลอดภัย
วิธีนี้เป็นระบบล็อกแบบง่าย เหมาะสำหรับกลุ่ม VIP ทั่วไปบน GitHub Pages
ถ้าต้องการระบบสมาชิกปลอดภัยระดับสูง ต้องใช้ Firebase Authentication เพิ่มเติม
