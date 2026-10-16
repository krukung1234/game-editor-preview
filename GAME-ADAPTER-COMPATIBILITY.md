# สถานะ Adapter ของเกมทั้ง 31 เกม

Mini City รองรับการแก้ข้อมูลและทดลองเล่นจริง เกมอื่นยังไม่เปิด Editor การตรวจเกมอื่นในรอบนี้เป็นการอ่านโครงสร้างไฟล์และชื่อชุดข้อมูล ไม่ได้เปลี่ยนหรือทดสอบการเล่นภายในเกมเหล่านั้น

| เกม | สถานะ | ไฟล์เกมที่ต้องมีจุดเชื่อม Adapter | จุดข้อมูลที่พบจาก source (ต้องตรวจต่อ) |
|---|---|---|---|
| AR Career Quest ตามล่าหาอาชีพ | ยังไม่รองรับ • ปิดปุ่ม | `games/AR Career Quest ตามล่าหาอาชีพ/index.html` | `question` |
| AR mini city | รองรับและทดสอบแล้ว | `games/AR mini city/index.html` | `missions`, `tasks`, `food`, `missionByAnswer`, `gameData`, `item`, `task` |
| AR Paint Academy | ยังไม่รองรับ • ปิดปุ่ม | `games/AR Paint Academy/index.html` | `TOOLS`, `toolMap`, `LEVELS`, `missions`, `toolButton` |
| AR คำตรงข้ามไทย | ยังไม่รองรับ • ปิดปุ่ม | `games/AR คำตรงข้ามไทย/index.html` | `QUESTIONS` |
| ar พิชิตตัวเลข | ยังไม่รองรับ • ปิดปุ่ม | `games/ar พิชิตตัวเลข/index.html` | `questionIndex`, `item`, `isObjectOption` |
| AR หนูน้อยเก็บชีสแสนอร่อย | ยังไม่รองรับ • ปิดปุ่ม | `games/AR หนูน้อยเก็บชีสแสนอร่อย/index.html` | `levels`, `level`, `item` |
| AR-bakery-pastry | ยังไม่รองรับ • ปิดปุ่ม | `games/AR-bakery-pastry/index.html` | `LEVELS`, `trayWord` |
| ar-computer | ยังไม่รองรับ • ปิดปุ่ม | `games/ar-computer/index.html` | `gameData`, `currentLevelIndex`, `currentQuestionIndex`, `objects`, `draggedObject`, `uiLevelIntro`, `levelData`, `qData` |
| ar-dino-fire-shooter | ยังไม่รองรับ • ปิดปุ่ม | `games/ar-dino-fire-shooter/index.html` | `questionEl`, `usedWords`, `word`, `data`, `correctWord`, `wrongWord` |
| ar-dressed | ยังไม่รองรับ • ปิดปุ่ม | `games/ar-dressed/index.html` | `clothesData`, `items`, `item`, `itemIndex` |
| ar-fishing-adventure | ยังไม่รองรับ • ปิดปุ่ม | `games/ar-fishing-adventure/index.html` | `wordData` |
| ar-good-food-v1 | ยังไม่รองรับ • ปิดปุ่ม | `games/ar-good-food-v1/index.html` | `goodFoods`, `badFoods`, `items` |
| ar-good-food-v2 | ยังไม่รองรับ • ปิดปุ่ม | `games/ar-good-food-v2/index.html` | `goodFoods`, `badFoods`, `levels`, `currentLevel`, `level`, `items` |
| ar-good-food-v3 | ยังไม่รองรับ • ปิดปุ่ม | `games/ar-good-food-v3/index.html` | `goodFoods`, `badFoods`, `levels`, `currentLevel`, `foods`, `levelNo`, `level`, `items` |
| AR-How-Do-You-Feel | ยังไม่รองรับ • ปิดปุ่ม | `games/AR-How-Do-You-Feel/index.html` | ไม่พบชื่อตัวแปรมาตรฐาน ต้องตรวจตรรกะเฉพาะเกม |
| ar-kob-game | ยังไม่รองรับ • ปิดปุ่ม | `games/ar-kob-game/index.html` | ไม่พบชื่อตัวแปรมาตรฐาน ต้องตรวจตรรกะเฉพาะเกม |
| ar-kok-game | ยังไม่รองรับ • ปิดปุ่ม | `games/ar-kok-game/index.html` | ไม่พบชื่อตัวแปรมาตรฐาน ต้องตรวจตรรกะเฉพาะเกม |
| ar-living-things-game-updated | ยังไม่รองรับ • ปิดปุ่ม | `games/ar-living-things-game-updated/index.html` | ไม่พบชื่อตัวแปรมาตรฐาน ต้องตรวจตรรกะเฉพาะเกม |
| ar-mole-game | ยังไม่รองรับ • ปิดปุ่ม | `games/ar-mole-game/index.html` | ไม่พบชื่อตัวแปรมาตรฐาน ต้องตรวจตรรกะเฉพาะเกม |
| ar-Multiplication | ยังไม่รองรับ • ปิดปุ่ม | `games/ar-Multiplication/index.html` | `missionText`, `questionText`, `TOTAL_QUESTIONS`, `QUESTION_SECONDS`, `MISSION_TITLES`, `questions`, `questionStartMs`, `nextQuestionTimeout` |
| AR-Safety-Hero-Academy | ยังไม่รองรับ • ปิดปุ่ม | `games/AR-Safety-Hero-Academy/index.html` | `level` |
| ar-sudoku | ยังไม่รองรับ • ปิดปุ่ม | `games/ar-sudoku/index.html` | `levelText`, `levelCompleteText`, `nextLevelButton`, `LEVELS`, `currentLevel`, `puzzle`, `pendingNextLevel`, `bankSize` |
| ar-sushi-game | ยังไม่รองรับ • ปิดปุ่ม | `games/ar-sushi-game/index.html` | `WORDS`, `LEVEL_ORDER`, `level`, `item` |
| ar-words-english | ยังไม่รองรับ • ปิดปุ่ม | `games/ar-words-english/index.html` | `WORDS`, `questions`, `levelFor`, `level` |
| ar-คำพังเพย | ยังไม่รองรับ • ปิดปุ่ม | `games/ar-คำพังเพย/index.html` | `DATA`, `LEVELS`, `currentLevel`, `sameLevel`, `item`, `NEW_LEVELS`, `dataLevel` |
| AR-สัตว์มีกระดูกสันหลัง | ยังไม่รองรับ • ปิดปุ่ม | `games/AR-สัตว์มีกระดูกสันหลัง/index.html` | `animals`, `levels`, `questions` |
| ar-เก็บผลไม้ | ยังไม่รองรับ • ปิดปุ่ม | `games/ar-เก็บผลไม้/index.html` | `fruits`, `junkFoods`, `objects`, `isFruit`, `item`, `itemBottom`, `itemCenterX` |
| AR-แยกขยะด้วยมือ | ยังไม่รองรับ • ปิดปุ่ม | `games/AR-แยกขยะด้วยมือ/index.html` | `roundItems` |
| AR_ANATOMY_LAB_A01 | ยังไม่รองรับ • ปิดปุ่ม | `games/AR_ANATOMY_LAB_A01/index.html` | `missionVisited`, `missions`, `functionQuestions`, `scanMissions`, `missionScores`, `summaryMission`, `data`, `missionTotals` |
| AR_Magnet_Lab | ยังไม่รองรับ • ปิดปุ่ม | `games/AR_Magnet_Lab/index.html` | `objects`, `missionSlots`, `missionSlotsMobile`, `scene` |
| AR_Opposite | ยังไม่รองรับ • ปิดปุ่ม | `games/AR_Opposite/index.html` | `question` |

สำหรับแต่ละเกมที่ยังไม่รองรับ ต้องเพิ่ม `js/adapters/<game-key>-runtime.js` และ schema/ค่าเริ่มต้น เช่น `js/adapters/<game-key>-defaults.json` เชื่อมไฟล์เกมในตาราง และไฟล์ JavaScript ภายในเกมที่เกี่ยวข้อง (ดู localScripts ใน JSON) จากนั้นลงทะเบียนใน `js/game-adapters.js` และขยาย `js/game-editor.js` สำหรับประเภทข้อมูลของเกมนั้น ก่อนทดสอบคำถาม เฉลย คะแนน การสัมผัส/กล้อง และเปิดใช้งานปุ่ม

ชื่อชุดข้อมูลในตารางเป็นเพียงจุดเริ่มค้นหา บางชื่อเป็น state/UI ไม่ใช่คลังคำถาม และบางเกมสร้างโจทย์จากกฎ เช่น Sudoku หรือคณิตศาสตร์ จึงใช้ Adapter ของ Mini City แทนโดยตรงไม่ได้
