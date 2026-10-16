Krukung Game Hub V16 Professional

รหัสเริ่มต้น:
VIP: vip2026
Admin: vip69

แก้รหัสได้ที่ js/config.js

วิธีลง:
1) แตก ZIP
2) วางไฟล์ทั้งหมดทับในโฟลเดอร์ krukung1234.github.io
3) เปิด GitHub Desktop
4) Commit
5) Push origin
6) เปิด https://krukung1234.github.io/?v=16
7) เปิด Admin https://krukung1234.github.io/admin.html?v=16

วิธีเพิ่มเกมแบบ Folder Mode:
1) สร้างโฟลเดอร์เกมใน games เช่น games/ar-sudoku
2) ใส่ index.html ของเกมไว้ในโฟลเดอร์นั้น
3) ใส่รูปหน้าปกชื่อ cover.png ในโฟลเดอร์เกม
4) Commit + Push
5) เข้า Admin เพิ่มเกม โดยกรอกชื่อโฟลเดอร์ ar-sudoku

Firestore Rules สำหรับทดสอบ:
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /games/{docId} {
      allow read, write: if true;
    }
  }
}
