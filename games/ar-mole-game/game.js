const holesEl = document.querySelector("#holes");
const scoreEl = document.querySelector("#score");
const timeEl = document.querySelector("#timeLeft");
const startButton = document.querySelector("#startButton");
const noCameraButton = document.querySelector("#noCameraButton");
const exitButton = document.querySelector("#exitButton");
const startScreen = document.querySelector("#startScreen");
const startTitle = document.querySelector("#startTitle");
const startCopy = document.querySelector("#startCopy");
const appShell = document.querySelector(".app-shell");
const camera = document.querySelector("#camera");
const message = document.querySelector("#message");
const hammer = document.querySelector("#hammer");
const confetti = document.querySelector("#confetti");

const targetWords = [
  "กา", "ตา", "นา", "ปู", "ดู", "ดี", "ยา", "ชา", "หู", "ไก่",
  "ปลา", "เสือ", "เรือ", "มือ", "หมา", "ป้า", "อา", "โอ", "สี", "ตี",
  "ปี", "ถู", "งู", "ภู", "ทะเล", "ใบชา", "มะลิ",
  "กะปิ", "กะลา", "มะละกอ", "มะเขือ", "กระทะ", "เวลา", "ราคา", "นาที"
];
const trapWords = [
  "นก", "ลิง", "บ้าน", "ดิน", "ฝน", "ดาว", "แก้ว", "สวน", "รถ", "เดือน",
  "บอล", "ขนม", "ข้าว", "จาน", "ช้าง", "มด", "แมว", "กบ", "เป็ด", "ปลาเค็ม",
  "กล่อง", "สมุด", "ถนน", "แปรง", "แก้ม", "ห้อง", "นักเรียน", "โรงเรียน",
  "สนาม", "ผัก", "เมฆ", "จมูก", "กางเกง", "เสื้อกันฝน", "ลูกบอล", "โต๊ะเรียน",
  "กระดาษ", "กระติก", "ขวด", "ช้อน", "ส้อม", "ขนมปัง", "ประตูบ้าน", "ก้อนหิน"
];
const palette = ["#ffd84d", "#ff77a7", "#42d6ff", "#66d957", "#ff8a24", "#ffffff"];

let score = 0;
let timeLeft = 60;
let active = false;
let countdownId = 0;
let popId = 0;
let audioContext;
let lastPair = [];
let roundLocked = false;
let targetQueue = [];
let trapQueue = [];
let lastUseCamera = true;
let endUnlockId = 0;

function makeHole(index) {
  const hole = document.createElement("button");
  hole.className = "hole";
  hole.type = "button";
  hole.dataset.index = index;
  hole.setAttribute("aria-label", "หลุมว่าง");
  hole.innerHTML = `
    <div class="mole">
      <span class="word-tag"></span>
      <span class="ear left"></span>
      <span class="ear right"></span>
      <span class="mole-body">
        <span class="nose"></span>
        <span class="mouth"></span>
      </span>
    </div>
  `;
  hole.addEventListener("pointerdown", hitHole);
  return hole;
}

for (let i = 0; i < 9; i += 1) {
  holesEl.append(makeHole(i));
}

const holes = [...document.querySelectorAll(".hole")];

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function nextWord(type) {
  if (type === "target") {
    if (targetQueue.length === 0) targetQueue = shuffle(targetWords);
    return targetQueue.pop();
  }

  if (trapQueue.length === 0) trapQueue = shuffle(trapWords);
  return trapQueue.pop();
}

function randomPairHoles() {
  const available = holes
    .map((hole, index) => ({ hole, index, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort);
  const fresh = available.filter((item) => !lastPair.includes(item.index));
  const pair = (fresh.length >= 2 ? fresh : available).slice(0, 2);
  lastPair = pair.map((item) => item.index);
  return pair.map((item) => item.hole);
}

function updateHud() {
  scoreEl.textContent = score;
  timeEl.textContent = timeLeft;
}

function clearHoles() {
  holes.forEach((hole) => {
    hole.classList.remove("up", "hit-correct", "hit-wrong");
    hole.dataset.target = "";
    hole.dataset.hit = "";
    const tag = hole.querySelector(".word-tag");
    tag.textContent = "";
    tag.classList.remove("long", "very-long");
    hole.setAttribute("aria-label", "หลุมว่าง");
  });
}

function setWordTag(hole, word) {
  const tag = hole.querySelector(".word-tag");
  tag.textContent = word;
  tag.classList.toggle("long", word.length >= 5);
  tag.classList.toggle("very-long", word.length >= 8);
}

function showPair() {
  if (!active) return;

  clearHoles();
  roundLocked = false;
  const pair = randomPairHoles();
  const targetIndex = Math.random() > 0.5 ? 0 : 1;
  const targetWord = nextWord("target");
  const trapWord = nextWord("trap");

  pair.forEach((hole, index) => {
    const isTarget = index === targetIndex;
    const word = isTarget ? targetWord : trapWord;
    hole.dataset.target = String(isTarget);
    hole.dataset.hit = "false";
    setWordTag(hole, word);
    hole.setAttribute("aria-label", `ตัวตุ่นคำว่า ${word}`);
    hole.classList.add("up");
  });
}

async function startGame(useCamera = lastUseCamera) {
  window.clearTimeout(endUnlockId);
  unlockEndButtons();
  lastUseCamera = useCamera;
  active = true;
  score = 0;
  timeLeft = 60;
  startScreen.classList.add("is-hidden");
  startScreen.classList.remove("is-end");
  appShell.classList.add("is-playing");
  startButton.textContent = "เริ่มแบบเปิดกล้อง AR";
  updateHud();
  clearHoles();
  showToast("เริ่ม!");
  if (useCamera) {
    startCamera();
  } else {
    stopCamera();
  }

  window.clearInterval(countdownId);
  window.clearTimeout(popId);
  showPair();

  countdownId = window.setInterval(() => {
    timeLeft -= 1;
    updateHud();
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function endGame() {
  active = false;
  appShell.classList.remove("is-playing");
  window.clearInterval(countdownId);
  window.clearTimeout(popId);
  clearHoles();
  startTitle.textContent = `หมดเวลา! ได้ ${score} คะแนน`;
  startCopy.textContent = "ดูคะแนนก่อนนะ ปุ่มจะกดได้ในอีก 2 วินาที";
  startButton.textContent = "เล่นอีกครั้ง";
  startScreen.classList.add("is-end");
  startScreen.classList.add("is-locked");
  startScreen.classList.remove("is-hidden");
  lockEndButtons();
  endUnlockId = window.setTimeout(() => {
    if (!startScreen.classList.contains("is-end")) return;
    startCopy.textContent = "เลือกเล่นอีกครั้ง หรือออกจากเกม";
    startScreen.classList.remove("is-locked");
    unlockEndButtons();
  }, 2000);
  burst(window.innerWidth / 2, window.innerHeight * 0.45, 44);
}

function resetToStart() {
  window.clearTimeout(endUnlockId);
  unlockEndButtons();
  active = false;
  appShell.classList.remove("is-playing");
  startScreen.classList.remove("is-end", "is-locked");
  window.clearInterval(countdownId);
  window.clearTimeout(popId);
  clearHoles();
  score = 0;
  timeLeft = 60;
  updateHud();
  startTitle.textContent = "ตีตัวตุ่น แม่ ก กา";
  startCopy.textContent = "กติกาการเล่น";
  startButton.textContent = "เริ่มแบบเปิดกล้อง AR";
  startScreen.classList.remove("is-hidden");
  stopCamera();
}

function lockEndButtons() {
  startButton.disabled = true;
  exitButton.disabled = true;
}

function unlockEndButtons() {
  startButton.disabled = false;
  exitButton.disabled = false;
}

function hitHole(event) {
  const hole = event.currentTarget;
  moveHammer(event.clientX, event.clientY, true);
  if (!active || roundLocked || !hole.classList.contains("up") || hole.dataset.hit === "true") return;

  roundLocked = true;
  hole.dataset.hit = "true";
  const isCorrect = hole.dataset.target === "true";
  score += isCorrect ? 1 : 0;
  updateHud();

  hole.classList.add(isCorrect ? "hit-correct" : "hit-wrong");
  playTone(isCorrect);
  showToast(isCorrect ? "+1 ถูกต้อง!" : "0 คะแนน");
  if (isCorrect) burst(event.clientX, event.clientY, 34);

  window.setTimeout(() => {
    if (!active) return;
    showPair();
  }, 320);
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast("เบราว์เซอร์นี้ไม่รองรับกล้อง");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    camera.srcObject = stream;
    camera.classList.add("is-on");
  } catch (error) {
    showToast("เปิดกล้องไม่ได้");
  }
}

function stopCamera() {
  const stream = camera.srcObject;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
  camera.srcObject = null;
  camera.classList.remove("is-on");
}

function moveHammer(x, y, whack = false) {
  hammer.style.setProperty("--x", `${x}px`);
  hammer.style.setProperty("--y", `${y}px`);
  if (!whack) return;

  hammer.classList.remove("whack");
  void hammer.offsetWidth;
  hammer.classList.add("whack");
}

function showToast(text) {
  message.textContent = text;
  message.classList.remove("show");
  void message.offsetWidth;
  message.classList.add("show");
}

function burst(x, y, amount) {
  for (let i = 0; i < amount; i += 1) {
    const piece = document.createElement("span");
    piece.className = "piece";
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    piece.style.background = randomItem(palette);
    piece.style.setProperty("--dx", `${Math.random() * 260 - 130}px`);
    piece.style.setProperty("--dy", `${Math.random() * 180 + 80}px`);
    piece.style.setProperty("--spin", `${Math.random() * 720 - 360}deg`);
    confetti.append(piece);
    window.setTimeout(() => piece.remove(), 900);
  }
}

function playTone(isCorrect) {
  audioContext ||= new AudioContext();
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(isCorrect ? 680 : 180, now);
  oscillator.frequency.exponentialRampToValueAtTime(isCorrect ? 980 : 120, now + 0.13);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.2);
}

document.addEventListener("pointermove", (event) => moveHammer(event.clientX, event.clientY));
document.addEventListener("pointerdown", (event) => moveHammer(event.clientX, event.clientY, true));
startButton.addEventListener("click", () => {
  startGame(startScreen.classList.contains("is-end") ? lastUseCamera : true);
});
noCameraButton.addEventListener("click", () => startGame(false));
exitButton.addEventListener("click", resetToStart);

updateHud();
