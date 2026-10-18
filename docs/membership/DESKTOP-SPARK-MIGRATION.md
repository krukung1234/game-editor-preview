# อัปเดต D:\game-editor-preview เป็น V21 Spark — ผลตรวจล่าสุด

18 ตุลาคม 2026

## สถานะ Git

ทำงานบน `test-v21-spark` จาก main เท่านั้น HEAD และ main ยังคง `c9886a92ccbf7c474658dea89c8485f605db4772` ไม่มี Commit ไม่มีไฟล์ staged ไม่ Push/Deploy ไม่เรียก Firebase Production ไม่เปลี่ยนเว็บไซต์ VIP เดิม ไม่ Fetch จากremote

## สิ่งที่อัปเดต

- ใช้ Complete ZIP SHA256 `40e30de80e4fb84aaf419eeb5dc4ef09b88689d13591e6f772df619542fbff83`: อัปเดต23ไฟล์ เพิ่ม63ไฟล์ เปลี่ยนเฉพาะบรรทัด CRLF/LF53ไฟล์ไม่จำเป็นจึงคงไว้
- ระบบสมาชิกหน้าเว็บ/SDK loader/boot/UI/Admin และ Gate รุ่นSpark ครบ เพิ่มAuth/Firestore Rulesและชุดทดสอบใหม่ สมาชิกapprovedมีสิทธิ์lifetimeไม่ผูกกับจำนวนเกม ส่วนpending/ไม่ยืนยันอีเมล/ถูกระงับเข้าEditorไม่ได้ Adminใช้ทะเบียนConsoleที่ผู้ใช้ทั่วไปแก้ไม่ได้
- ANATOMY LAB `index.html` อยู่ในRepositoryจริง พร้อมAdapter `native-28.json` ตัวตรวจพิสูจน์เปลี่ยนเพียงลำดับบล็อกสคริปต์เดิม ห้ามแก้เกมอีก30เกมโดยไม่จำเป็น และตรวจsourceHashทุกเกมผ่าน
- ไฟล์เฉพาะD:40รายการ: สำรองภายนอกแล้วนำออก17รายการ รวมหน้าAdmin/configรหัสผ่านเก่า READMEชื่อเพี้ยน BackendFunctions/Storageเก่า แพตช์ซ้ำและZIPอัปโหลดเก่า อีก23รายการเก็บเป็นเอกสาร/หลักฐาน/ทดสอบPrompt ไม่รวมชุดเว็บไซต์ ดู DESKTOP-V21-LOCAL40-DECISIONS.csv
- พบปัญหาจริงรอบทดสอบ: Adapter ar-dressed ยังอ้าง `netlify-upload.zip` หลังนำ archiveเก่าออก ทำให้ดาวน์โหลด404/หมดเวลา แก้เฉพาะ resources ของ `js/adapters/native/native-09.json` ลบรายการarchiveที่ไม่ใช่ทรัพยากรเกม ไม่แตะ engine ภาพ หรือกติกา ทดสอบเกมนี้ซ้ำผ่านแล้ว
- ปรับตัวตรวจให้ตรวจทรัพยากรดาวน์โหลดทุกเกม และยอมรับเฉพาะรายการนำไฟล์เก่าออกพร้อมตรวจhashของไฟล์ในHEAD ไม่ผ่อนการตรวจ sourceเกมอื่น ปรับตัวทดสอบให้เก็บผล/แคชภายนอกและทำงานได้จากโฟลเดอร์ backend
- เพิ่ม `.gitignore`, `_config.yml` สำหรับยกเว้นไฟล์พัฒนาในbranch-based Pages build ไม่เพิ่มworkflowDeploy และเตรียมชุดเว็บในoutputsเพื่อใช้ตรวจภายในเท่านั้น

## ผลทดสอบจากโค้ด D: จริง

- Unit/Gate8/8ผ่าน; โครงสร้างAdapter/source hash/JS syntax/ทรัพยากร/branch/การแยกProductionผ่าน
- Editor31/31 เปิด แก้ชื่อและข้อมูลภายใน คืนค่า ปิด ผ่าน responsive desktop/tablet/mobileจำลอง
- Preview31/31 ตรวจข้อมูลแก้ไขถึงnative binding; Sudokuแก้โจทย์/เฉลยสลับเลขพร้อมกันเพื่อรักษาความถูกต้อง
- ZIP31/31 ดาวน์โหลดตรวจCRC แตกไฟล์ เปิดcontextใหม่ที่ไม่ล็อกอินโดยบล็อกเครือข่ายภายนอก ตรวจข้อมูลภายในเกมตรงค่าที่แก้ ไม่ใช่ตรวจเพียงหน้าปก
- Auth/Firestore Emulatorจริง: สมัคร ยืนยันผ่านลิงก์จำลอง ขอรีเซ็ตรหัสผ่าน เข้าสู่ระบบ คงsessionเมื่อreload ปฏิเสธpendingทุกEditor31เกม สิทธิ์approvedและการระงับปิดEditorทันที ผ่าน
- AdminUI: ค้นหา ยกเลิก/ยืนยันอนุมัติ ปฏิเสธ ระงับ คืนสิทธิ์ และเพิกถอนAdminเดิม ผ่าน
- Rules: ป้องกันอนุมัติตัวเอง แอบตั้งAdmin ปลอมยืนยันอีเมล อีเมลไม่ตรง สถานะรุ่นเก่า เขียนไม่ครบaudit แก้ข้อมูลเกมกลาง ผ่าน
- Prompt31ฟอร์มสร้างข้อความได้หลังอนุญาตสมาชิก; สลับแท็บ10ครั้งWorking Copyไม่หาย ผ่านในChromeทดสอบ
- รอบแรกหยุดที่เกมแต่งตัวจากarchiveอ้างอิงเก่า หลังแก้ทดสอบซ้ำตั้งแต่เกมนั้นและต่อจน31 ผล31เกมเป็นหลักฐานรวมก่อน/หลังแก้ โดยเก้าเกมก่อนหน้าไม่มีruntimeเปลี่ยนตามมา

## ความปลอดภัยและงานค้าง

ตรวจประวัติGitที่อยู่ในเครื่อง21commits/373text objects พบข้อมูลรหัสVIPและAdminเก่าในconfig/README และรหัสจำลองในtests ไม่พบรูปแบบService Account/Private Key/tokenตามที่สแกน ไม่แสดงค่ารหัสในรายงาน ไม่ใช่การรับรองความลับทุกรูปแบบหรือremoteที่ยังไม่ได้Fetch

รหัส **VIP_PASSWORD และ ADMIN_PASSWORD รุ่นเก่า** เคยใช้ตรวจรหัสในโค้ดเดิมและยังอยู่ในhistory ให้เจ้าของยกเลิก/เปลี่ยนถ้ายังใช้งานเว็บเดิม ไม่ได้ทดลองรหัสกับเว็บจริง ไม่เปลี่ยนรหัสหรือrewritehistoryเอง การนำไฟล์ออกจากworking treeไม่ลบรหัสออกจากmainหรือประวัติเดิม

ชุดเว็บที่เตรียมมี730ไฟล์ ตรวจhashตรงกับruntimeในD: และสแกนไม่พบรูปแบบรหัสผ่านฝัง/PrivateKey/ServiceAccount/token ไม่มีbackend/tests/logs/เอกสาร/ข้อมูลจำลองอยู่ในชุดนี้ Firebase Web API keyเป็นpublicconfig ไม่ใช่Service Account Key ส่วนรหัสfixtureคงเฉพาะtestsพัฒนา ไม่ใช้บัญชีจริง

ใช้เฉพาะAuth Email/Password+Firestore ตามconfigSpark ไม่มีFunctions/Storage/Gateway Productionยังdisabled/productionReviewed=false ไม่ได้ตรวจConsoleแผนจริงหรือส่งเมลจริง ไม่ได้เปิดBilling

GitHubPagesยังเป็นไฟล์สาธารณะ ผู้รู้URLเกมตรงยังอาจเปิดได้ `_config.yml` ช่วยตัดไฟล์พัฒนาสำหรับbranch-based Jekyll buildเท่านั้น ไม่ใช่Authหรือการลบไฟล์จากGitHub หากเผยแพร่ด้วยActionsภายหลังต้องเลือกชุดเว็บที่ตัดไฟล์แล้ว อย่าอัปโหลดRepositoryทั้งชุดโดยไม่ตรวจ

พร้อมเข้าสู่ขั้นทดสอบอุปกรณ์จริงหลังจัดสภาพแวดล้อมตามสิทธิ์อนุญาต ยังไม่พร้อมรับรองProduction กล้อง/HandTracking/เสียง/ทุกด่านบนAndroid Chrome/iPhone Safari/Windowsจริงยังไม่ทดสอบรอบนี้ ดู CSV manual acceptance31เกม localhostโทรศัพท์ไม่ใช่คอมพิวเตอร์ กล้องอาจต้องHTTPS/localhostและบางSDKต้องอินเทอร์เน็ต

## ผลรายเกม (จำลอง)

| เกม | Editor/คืนค่า | Preview/ข้อมูลภายใน | ZIP CRC/แตกเปิด | กล้อง/อุปกรณ์จริง |
|---|---|---|---|---|
| AR Career Quest ตามล่าหาอาชีพ | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| AR Mini City สินค้าและบริการ | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| AR Paint Academy | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| AR คำตรงข้ามไทย | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| ar พิชิตตัวเลข | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| AR หนูน้อยเก็บชีสแสนอร่อย | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| AR-bakery-pastry | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| ar-computer | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| ar-dino-fire-shooter | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| ar-dressed | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| ar-fishing-adventure | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| ar-good-food-v1 | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| ar-good-food-v2 | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| ar-good-food-v3 | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| AR-How-Do-You-Feel | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| ar-kob-game | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| ar-kok-game | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| ar-living-things-game-updated | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| ar-mole-game | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| ar-Multiplication | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| AR-Safety-Hero-Academy | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| ar-sudoku | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| ar-sushi-game | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| ar-words-english | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| ar-คำพังเพย | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| AR-สัตว์มีกระดูกสันหลัง | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| ar-เก็บผลไม้ | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| AR-แยกขยะด้วยมือ | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| AR_ANATOMY_LAB_A01 | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| AR_Magnet_Lab | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |
| AR_Opposite | ผ่าน | ผ่าน | ผ่าน | ยังไม่ทดสอบ |

## หลักฐานและการส่งต่อ

ผลจากD:อยู่ `outputs/desktop-v21-tests/RELEASE-V21-GAMES.json` และ `RELEASE-V21-MEMBERSHIP.json`; Rulesอยู่ `docs/membership/test-results/spark-rules.json`; ประวัติความลับและรายการ40ไฟล์อยู่รายงานoutputs ชุดเว็บตัดไฟล์พัฒนาอยู่ `outputs/Game-Editor-VIP-V21-Spark-Publish-Preview` ไม่มีการDeploy

ไฟล์สำรองที่มีconfigเก่าอยู่ `work/desktop-v21-migration-private-backup` ภายนอกRepository ห้ามนำกลับเข้าชุดเผยแพร่หรือแนบไฟล์สำรองนี้สาธารณะ

Working Copyยังไม่Commit ให้ตรวจGitHubDesktopที่branch test-v21-spark และรายการdiffก่อน อย่าสั่งPublish branch/Push/Merge/Deployจนเจ้าของอนุญาต รายงานนี้ไม่ใช่การอนุมัติขั้นตอนเหล่านั้น
