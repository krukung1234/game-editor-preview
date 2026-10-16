const targetsEl = document.querySelector("#targets");
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
const wand = document.querySelector("#wand");
const confetti = document.querySelector("#confetti");

const kokWords = [
  "นก", "รัก", "ปาก", "ลูก", "เมฆ", "เลข", "สุข", "โรค", "โชค", "ภาค",
  "พริก", "เปียก", "จาก", "ฝาก", "โลก", "หมวก", "ดอก", "ปลวก", "เชือก", "ปลูก",
  "บวก", "ลึก", "หัก", "หนัก", "หลัก", "มัก", "พัก", "ผัก", "คุก", "ซัก",
  "จุก", "ปีก", "อีก", "เล็ก", "เด็ก", "มุก", "ตึก", "กระจก", "สนุก", "สุนัข"
];

const otherWords = [
  "ปลา", "ตา", "ดาว", "บ้าน", "ลิง", "จาน", "ฝน", "รถ", "แก้ว", "เรือ",
  "เสือ", "หมา", "ไก่", "ช้าง", "แมว", "โต๊ะ", "ครู", "สวน", "ขนม", "สนาม",
  "ดินสอ", "เก้าอี้", "ถนน", "รองเท้า", "กระเป๋า", "ใบชา", "เวลา", "นาที", "ทะเล", "มะลิ",
  "หัวใจ", "สีฟ้า", "ประตู", "หน้าต่าง", "โรงเรียน", "คุณครู", "นักเรียน", "ดอกไม้", "ผลไม้", "ลูกโป่ง"
];

const palette = ["#ffe66b", "#ff8fc7", "#6ee7ff", "#7df28a", "#ad8cff", "#ffffff"];
let score = 0;
let timeLeft = 60;
let active = false;
let countdownId = 0;
let audioContext;
let lastPair = [];
let roundLocked = false;
let kokQueue = [];
let otherQueue = [];
let lastUseCamera = true;
let endUnlockId = 0;

function makeTarget(index) {
  const target = document.createElement("button");
  target.className = "target";
  target.type = "button";
  target.dataset.index = index;
  target.innerHTML = `
    <span class="word-tag"></span>
    <span class="rabbit">
      <span class="rabbit-ear left"></span>
      <span class="rabbit-ear right"></span>
      <span class="rabbit-face">
        <span class="rabbit-cheek left"></span>
        <span class="rabbit-cheek right"></span>
        <span class="rabbit-nose"></span>
        <span class="rabbit-smile"></span>
        <span class="rabbit-tooth"></span>
      </span>
      <span class="rabbit-paw left"></span>
      <span class="rabbit-paw right"></span>
    </span>
  `;
  target.addEventListener("pointerdown", hitTarget);
  targetsEl.append(target);
}

for (let i = 0; i < 9; i += 1) {
  makeTarget(i);
}

const targets = [...document.querySelectorAll(".target")];

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function nextWord(type) {
  if (type === "kok") {
    if (kokQueue.length === 0) kokQueue = shuffle(kokWords);
    return kokQueue.pop();
  }

  if (otherQueue.length === 0) otherQueue = shuffle(otherWords);
  return otherQueue.pop();
}

function randomPairTargets() {
  const available = targets
    .map((target, index) => ({ target, index, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort);
  const fresh = available.filter((item) => !lastPair.includes(item.index));
  const pair = (fresh.length >= 2 ? fresh : available).slice(0, 2);
  lastPair = pair.map((item) => item.index);
  return pair.map((item) => item.target);
}

function updateHud() {
  scoreEl.textContent = score;
  timeEl.textContent = timeLeft;
}

function setWordTag(target, word) {
  const tag = target.querySelector(".word-tag");
  tag.textContent = word;
  tag.classList.toggle("long", word.length >= 5);
  tag.classList.toggle("very-long", word.length >= 8);
}

function clearTargets() {
  targets.forEach((target) => {
    target.classList.remove("up", "hit-correct", "hit-wrong");
    target.dataset.correct = "";
    target.dataset.hit = "";
    target.style.opacity = "1";
    target.style.transform = "none";
    target.querySelector(".rabbit").style.opacity = "0";
    target.querySelector(".rabbit").style.visibility = "hidden";
    setWordTag(target, "");
    target.setAttribute("aria-label", "คำว่าง");
  });
}

function showPair() {
  if (!active) return;

  clearTargets();
  roundLocked = false;
  const pair = randomPairTargets();
  const correctIndex = Math.random() > 0.5 ? 0 : 1;
  const correctWord = nextWord("kok");
  const otherWord = nextWord("other");

  pair.forEach((target, index) => {
    const isCorrect = index === correctIndex;
    const word = isCorrect ? correctWord : otherWord;
    target.style.opacity = "1";
    target.style.transform = "none";
    target.dataset.correct = String(isCorrect);
    target.dataset.hit = "false";
    setWordTag(target, word);
    target.querySelector(".rabbit").style.opacity = "1";
    target.querySelector(".rabbit").style.visibility = "visible";
    target.setAttribute("aria-label", `คำว่า ${word}`);
    target.classList.add("up");
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
  startScreen.classList.remove("is-end", "is-locked");
  appShell.classList.add("is-playing");
  startButton.textContent = "เริ่มแบบเปิดกล้อง AR";
  updateHud();
  clearTargets();
  showToast("เริ่ม!");

  if (useCamera) {
    startCamera();
  } else {
    stopCamera();
  }

  window.clearInterval(countdownId);
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
  clearTargets();
  startTitle.textContent = `หมดเวลา! ได้ ${score} คะแนน`;
  startCopy.textContent = "ดูคะแนนก่อนนะ ปุ่มจะกดได้ในอีก 2 วินาที";
  startButton.textContent = "เล่นอีกครั้ง";
  startScreen.classList.add("is-end", "is-locked");
  startScreen.classList.remove("is-hidden");
  lockEndButtons();
  endUnlockId = window.setTimeout(() => {
    if (!startScreen.classList.contains("is-end")) return;
    startCopy.textContent = "เลือกเล่นอีกครั้ง หรือออกจากเกม";
    startScreen.classList.remove("is-locked");
    unlockEndButtons();
  }, 2000);
  burst(window.innerWidth / 2, window.innerHeight * 0.45, 48);
}

function resetToStart() {
  window.clearTimeout(endUnlockId);
  unlockEndButtons();
  active = false;
  appShell.classList.remove("is-playing");
  startScreen.classList.remove("is-end", "is-locked");
  window.clearInterval(countdownId);
  clearTargets();
  score = 0;
  timeLeft = 60;
  updateHud();
  startTitle.textContent = "เกมตีคำ แม่ กก";
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

function hitTarget(event) {
  const target = event.currentTarget;
  moveWand(event.clientX, event.clientY, true);
  if (!active || roundLocked || !target.classList.contains("up") || target.dataset.hit === "true") return;

  roundLocked = true;
  target.dataset.hit = "true";
  const isCorrect = target.dataset.correct === "true";
  if (isCorrect) score += 1;
  updateHud();

  target.classList.add(isCorrect ? "hit-correct" : "hit-wrong");
  playTone(isCorrect);
  showToast(isCorrect ? "+1 ถูกต้อง!" : "0 คะแนน");
  if (isCorrect) burst(event.clientX, event.clientY, 36);

  window.setTimeout(() => {
    if (!active) return;
    showPair();
  }, 340);
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

function moveWand(x, y, whack = false) {
  wand.style.setProperty("--x", `${x}px`);
  wand.style.setProperty("--y", `${y}px`);
  if (!whack) return;

  wand.classList.remove("whack");
  void wand.offsetWidth;
  wand.classList.add("whack");
}

function showToast(text) {
  message.textContent = text;
  message.classList.remove("show");
  void message.offsetWidth;
  message.classList.add("show");
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function burst(x, y, amount) {
  for (let i = 0; i < amount; i += 1) {
    const piece = document.createElement("span");
    piece.className = "piece";
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    piece.style.background = randomItem(palette);
    piece.style.setProperty("--dx", `${Math.random() * 280 - 140}px`);
    piece.style.setProperty("--dy", `${Math.random() * 190 + 80}px`);
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
  oscillator.frequency.setValueAtTime(isCorrect ? 760 : 190, now);
  oscillator.frequency.exponentialRampToValueAtTime(isCorrect ? 1120 : 120, now + 0.13);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.2);
}

document.addEventListener("pointermove", (event) => moveWand(event.clientX, event.clientY));
document.addEventListener("pointerdown", (event) => moveWand(event.clientX, event.clientY, true));
startButton.addEventListener("click", () => {
  startGame(startScreen.classList.contains("is-end") ? lastUseCamera : true);
});
noCameraButton.addEventListener("click", () => startGame(false));
exitButton.addEventListener("click", resetToStart);

updateHud();
