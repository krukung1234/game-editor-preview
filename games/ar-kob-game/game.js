const targetsEl = document.querySelector("#targets");
const scoreEl = document.querySelector("#score");
const timeEl = document.querySelector("#timeLeft");
const startButton = document.querySelector("#startButton");
const punchButton = document.querySelector("#punchButton");
const noCameraButton = document.querySelector("#noCameraButton");
const exitButton = document.querySelector("#exitButton");
const startScreen = document.querySelector("#startScreen");
const startTitle = document.querySelector("#startTitle");
const startCopy = document.querySelector("#startCopy");
const appShell = document.querySelector(".app-shell");
const camera = document.querySelector("#camera");
const message = document.querySelector("#message");
const wand = document.querySelector("#wand");
const handCanvas = document.querySelector("#handCanvas");
const punchAura = document.querySelector("#punchAura");
const confetti = document.querySelector("#confetti");

const kobWords = [
  "กบ", "จับ", "รับ", "นับ", "ตับ", "ขับ", "ดับ", "คับ", "แอบ", "แคบ",
  "เจ็บ", "เก็บ", "เล็บ", "เย็บ", "เสียบ", "เปรียบ", "รอบ", "ตอบ", "สอบ", "ชอบ",
  "ลอบ", "กรอบ", "ขอบ", "มอบ", "ธูป", "รูป", "ซุป", "บาป", "ลาภ", "โลภ",
  "ภาพ", "เทพ", "ทัพ", "ทรัพย์", "ศัพท์", "กราฟ", "ยีราฟ", "กอล์ฟ", "เคารพ", "สรุป"
];

const otherWords = [
  "กา", "นา", "ปลา", "เรือ", "เสือ", "ตา", "ดาว", "บ้าน", "ลิง", "จาน",
  "ฝน", "รถ", "แก้ว", "แมว", "ช้าง", "ครู", "สวน", "สนาม", "ทะเล", "มะลิ",
  "นก", "ลูก", "เมฆ", "เลข", "สุข", "โชค", "โลก", "ดอก", "หมวก", "ปลูก",
  "กิน", "บิน", "เดิน", "แขน", "ดิน", "จม", "ลม", "ชม", "ส้ม", "นม"
];

const palette = ["#ffe66b", "#ff8fc7", "#6ee7ff", "#7df28a", "#b8ff4c", "#ffffff"];
let score = 0;
let timeLeft = 60;
let active = false;
let countdownId = 0;
let audioContext;
let lastPair = [];
let roundLocked = false;
let kobQueue = [];
let otherQueue = [];
let lastUseCamera = true;
let lastPlayMode = "click";
let endUnlockId = 0;
let motionFrameId = 0;
let handContext;
let hands;
let handTrackingBusy = false;
let lastMotionHitAt = 0;
let lastMotionSeenAt = 0;
let lastPinchActive = false;

const handConnections = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

function makeTarget(index) {
  const target = document.createElement("button");
  target.className = "target";
  target.type = "button";
  target.dataset.index = index;
  target.innerHTML = `
    <span class="word-tag"></span>
    <span class="frog"></span>
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
  if (type === "kob") {
    if (kobQueue.length === 0) kobQueue = shuffle(kobWords);
    return kobQueue.pop();
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
    target.querySelector(".frog").style.opacity = "0";
    target.querySelector(".frog").style.visibility = "hidden";
    setWordTag(target, "");
    target.setAttribute("aria-label", "คำว่าง");
  });
}

function showPair() {
  if (!active) return;

  clearTargets();
  roundLocked = false;
  lastPinchActive = false;
  const pair = randomPairTargets();
  const correctIndex = Math.random() > 0.5 ? 0 : 1;
  const correctWord = nextWord("kob");
  const otherWord = nextWord("other");

  pair.forEach((target, index) => {
    const isCorrect = index === correctIndex;
    const word = isCorrect ? correctWord : otherWord;
    target.style.opacity = "1";
    target.style.transform = "none";
    target.dataset.correct = String(isCorrect);
    target.dataset.hit = "false";
    setWordTag(target, word);
    target.querySelector(".frog").style.opacity = "1";
    target.querySelector(".frog").style.visibility = "visible";
    target.setAttribute("aria-label", `คำว่า ${word}`);
    target.classList.add("up");
  });
}

async function startGame(useCamera = lastUseCamera, mode = lastPlayMode) {
  window.clearTimeout(endUnlockId);
  unlockEndButtons();
  lastUseCamera = useCamera;
  lastPlayMode = mode;
  active = true;
  score = 0;
  timeLeft = 60;
  startScreen.classList.add("is-hidden");
  startScreen.classList.remove("is-end", "is-locked");
  appShell.classList.add("is-playing");
  appShell.classList.toggle("mode-punch", mode === "punch");
  handCanvas.classList.toggle("is-active", mode === "punch");
  punchAura.classList.toggle("is-active", mode === "punch");
  punchAura.classList.remove("is-seen", "is-pinching", "is-correct", "is-wrong");
  clearHandOverlay();
  startButton.textContent = "เริ่มแบบคลิก/แตะ";
  updateHud();
  clearTargets();
  showToast(mode === "punch" ? "จีบนิ้วเลือกคำแม่ กบ!" : "เริ่ม!");

  if (useCamera) {
    await startCamera();
  } else {
    stopCamera();
  }

  if (mode === "punch" && useCamera) {
    startMotionDetection();
  } else {
    stopMotionDetection();
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
  appShell.classList.remove("mode-punch");
  handCanvas.classList.remove("is-active");
  punchAura.classList.remove("is-active", "is-seen", "is-pinching", "is-correct", "is-wrong");
  clearHandOverlay();
  stopMotionDetection();
  window.clearInterval(countdownId);
  clearTargets();
  startTitle.innerHTML = `หมดเวลา! <span class="score-line">ได้ ${score} คะแนน</span>`;
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
  appShell.classList.remove("mode-punch");
  handCanvas.classList.remove("is-active");
  punchAura.classList.remove("is-active", "is-seen", "is-pinching", "is-correct", "is-wrong");
  clearHandOverlay();
  stopMotionDetection();
  startScreen.classList.remove("is-end", "is-locked");
  window.clearInterval(countdownId);
  clearTargets();
  score = 0;
  timeLeft = 60;
  updateHud();
  startTitle.textContent = "เกมตีคำ แม่ กบ";
  startCopy.textContent = "กติกาการเล่น";
  startButton.textContent = "เริ่มแบบคลิก/แตะ";
  startScreen.classList.remove("is-hidden");
  stopCamera();
}

function lockEndButtons() {
  startButton.disabled = true;
  punchButton.disabled = true;
  exitButton.disabled = true;
}

function unlockEndButtons() {
  startButton.disabled = false;
  punchButton.disabled = false;
  exitButton.disabled = false;
}

function hitTarget(event) {
  const target = event.currentTarget;
  moveWand(event.clientX, event.clientY, true);
  if (lastPlayMode !== "click") return;
  scoreTarget(target, event.clientX, event.clientY);
}

function scoreTarget(target, x, y) {
  if (!active || roundLocked || !target.classList.contains("up") || target.dataset.hit === "true") return;

  roundLocked = true;
  target.dataset.hit = "true";
  const isCorrect = target.dataset.correct === "true";
  if (isCorrect) score += 1;
  updateHud();

  target.classList.add(isCorrect ? "hit-correct" : "hit-wrong");
  markPunchResult(isCorrect);
  playTone(isCorrect);
  showToast(isCorrect ? "+1 ถูกต้อง!" : "0 คะแนน");
  if (isCorrect) burst(x, y, 36);

  window.setTimeout(() => {
    if (!active) return;
    showPair();
  }, 340);
}

function markPunchResult(isCorrect) {
  if (lastPlayMode !== "punch") return;
  punchAura.classList.remove("is-correct", "is-wrong");
  punchAura.classList.add(isCorrect ? "is-correct" : "is-wrong");
  window.setTimeout(() => {
    punchAura.classList.remove("is-correct", "is-wrong");
  }, 420);
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast("เบราว์เซอร์นี้ไม่รองรับกล้อง");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    camera.srcObject = stream;
    camera.classList.add("is-on");
    await camera.play();
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

function startMotionDetection() {
  stopMotionDetection();
  configureTrackingCanvases();
  handContext = handCanvas.getContext("2d");
  lastMotionHitAt = 0;
  lastMotionSeenAt = 0;
  lastPinchActive = false;
  initializeHands().then((ready) => {
    if (!ready || !active || lastPlayMode !== "punch") return;
    showToast("จีบนิ้วโป้งกับนิ้วชี้เพื่อเลือกคำ");
    motionFrameId = window.requestAnimationFrame(readMotionFrame);
  });
}

function stopMotionDetection() {
  if (motionFrameId) {
    window.cancelAnimationFrame(motionFrameId);
    motionFrameId = 0;
  }
  handTrackingBusy = false;
  lastPinchActive = false;
  clearHandOverlay();
  punchAura.classList.remove("is-seen", "is-pinching", "is-correct", "is-wrong");
}

async function initializeHands() {
  if (hands) return true;
  if (!window.Hands) {
    showToast("โหลด MediaPipe Hands ไม่สำเร็จ");
    return false;
  }

  hands = new window.Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });
  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.68,
    minTrackingConfidence: 0.62,
    selfieMode: false,
  });
  hands.onResults(handleHandResults);
  return true;
}

function readMotionFrame() {
  if (!active || lastPlayMode !== "punch") {
    stopMotionDetection();
    return;
  }

  if (camera.readyState >= 2 && camera.videoWidth > 0 && hands && !handTrackingBusy) {
    configureTrackingCanvases();
    handTrackingBusy = true;
    hands.send({ image: camera }).catch(() => {
      showToast("ตรวจจับมือไม่ได้ ลองเปิดกล้องใหม่อีกครั้ง");
    }).finally(() => {
      handTrackingBusy = false;
    });
  }

  if (performance.now() - lastMotionSeenAt > 450) {
    punchAura.classList.remove("is-seen", "is-pinching");
    lastPinchActive = false;
    clearHandOverlay();
  }

  motionFrameId = window.requestAnimationFrame(readMotionFrame);
}

function handleHandResults(results) {
  if (!active || lastPlayMode !== "punch") return;
  const landmarks = results.multiHandLandmarks?.[0];
  if (!landmarks) {
    punchAura.classList.remove("is-seen", "is-pinching");
    lastPinchActive = false;
    clearHandOverlay();
    return;
  }

  configureTrackingCanvases();
  const points = landmarks.map(mapLandmarkToScreen);
  const pinch = getPinchState(points);
  updatePunchAura(pinch.x, pinch.y, pinch.active);
  drawHandSkeleton(points, pinch.active);
  lastMotionSeenAt = performance.now();

  const justPinched = pinch.active && !lastPinchActive;
  lastPinchActive = pinch.active;
  if (!justPinched || roundLocked) return;

  const now = performance.now();
  if (now - lastMotionHitAt < 560) return;

  const bestTarget = targetAtPoint(pinch.x, pinch.y);
  if (!bestTarget) return;

  lastMotionHitAt = now;
  scoreTarget(bestTarget, pinch.x, pinch.y);
}

function configureTrackingCanvases() {
  const ratio = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const displayWidth = Math.max(1, Math.floor(window.innerWidth * ratio));
  const displayHeight = Math.max(1, Math.floor(window.innerHeight * ratio));
  if (handCanvas.width !== displayWidth || handCanvas.height !== displayHeight) {
    handCanvas.width = displayWidth;
    handCanvas.height = displayHeight;
    handCanvas.style.width = `${window.innerWidth}px`;
    handCanvas.style.height = `${window.innerHeight}px`;
  }
}

function mapLandmarkToScreen(landmark) {
  const videoWidth = Math.max(1, camera.videoWidth);
  const videoHeight = Math.max(1, camera.videoHeight);
  const scale = Math.max(window.innerWidth / videoWidth, window.innerHeight / videoHeight);
  const renderedWidth = videoWidth * scale;
  const renderedHeight = videoHeight * scale;
  const offsetX = (window.innerWidth - renderedWidth) / 2;
  const offsetY = (window.innerHeight - renderedHeight) / 2;
  const unmirroredX = offsetX + landmark.x * renderedWidth;

  return {
    x: window.innerWidth - unmirroredX,
    y: offsetY + landmark.y * renderedHeight,
    z: landmark.z,
  };
}

function getPinchState(points) {
  const thumb = points[4];
  const index = points[8];
  const wrist = points[0];
  const middleBase = points[9];
  const handSize = Math.max(52, Math.hypot(middleBase.x - wrist.x, middleBase.y - wrist.y) * 1.95);
  const distance = Math.hypot(index.x - thumb.x, index.y - thumb.y);
  const threshold = Math.max(34, Math.min(72, handSize * 0.34));

  return {
    x: (thumb.x + index.x) / 2,
    y: (thumb.y + index.y) / 2,
    active: distance <= threshold,
  };
}

function updatePunchAura(x, y, pinching) {
  punchAura.style.setProperty("--punch-x", `${x}px`);
  punchAura.style.setProperty("--punch-y", `${y}px`);
  punchAura.style.setProperty("--punch-power", pinching ? "1.08" : "0.78");
  punchAura.classList.add("is-active", "is-seen");
  punchAura.classList.toggle("is-pinching", pinching);
  lastMotionSeenAt = performance.now();
}

function clearHandOverlay() {
  if (!handContext) return;
  handContext.clearRect(0, 0, handCanvas.width, handCanvas.height);
}

function drawHandSkeleton(points, pinching) {
  if (!handContext) return;
  clearHandOverlay();
  const ratio = handCanvas.width / Math.max(1, window.innerWidth);
  const scaled = points.map((point) => ({
    x: point.x * ratio,
    y: point.y * ratio,
  }));
  const stroke = pinching ? "rgba(255, 234, 78, 0.98)" : "rgba(129, 115, 255, 0.98)";
  const glow = pinching ? "rgba(255, 221, 47, 0.98)" : "rgba(62, 219, 255, 0.9)";
  const joint = pinching ? "rgba(255, 249, 157, 1)" : "rgba(124, 232, 255, 1)";
  const pinch = getPinchState(points);
  const px = pinch.x * ratio;
  const py = pinch.y * ratio;

  handContext.save();
  handContext.lineCap = "round";
  handContext.lineJoin = "round";

  handContext.shadowColor = glow;
  handContext.shadowBlur = (pinching ? 22 : 12) * ratio;
  handContext.strokeStyle = stroke;
  handContext.lineWidth = (pinching ? 6 : 4) * ratio;
  handConnections.forEach(([from, to]) => {
    const a = scaled[from];
    const b = scaled[to];
    handContext.beginPath();
    handContext.moveTo(a.x, a.y);
    handContext.lineTo(b.x, b.y);
    handContext.stroke();
  });

  handContext.fillStyle = joint;
  scaled.forEach((point, index) => {
    const radius = [4, 8].includes(index) ? 6.5 : 4.5;
    handContext.beginPath();
    handContext.arc(point.x, point.y, radius * ratio, 0, Math.PI * 2);
    handContext.fill();
  });

  handContext.strokeStyle = pinching ? "rgba(255, 255, 210, 0.98)" : "rgba(162, 123, 255, 0.72)";
  handContext.lineWidth = 3 * ratio;
  handContext.beginPath();
  handContext.arc(px, py, (pinching ? 30 : 20) * ratio, 0, Math.PI * 2);
  handContext.stroke();
  handContext.restore();
}

function targetAtPoint(x, y) {
  const activeTargets = targets.filter((target) => target.classList.contains("up") && target.dataset.hit !== "true");
  let bestTarget = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  activeTargets.forEach((target) => {
    const rect = target.getBoundingClientRect();
    const expanded = {
      left: rect.left - rect.width * 0.14,
      right: rect.right + rect.width * 0.14,
      top: rect.top - rect.height * 0.18,
      bottom: rect.bottom + rect.height * 0.12,
    };
    if (x < expanded.left || x > expanded.right || y < expanded.top || y > expanded.bottom) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(x - centerX, y - centerY);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestTarget = target;
    }
  });

  return bestTarget;
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
  if (startScreen.classList.contains("is-end")) {
    startGame(lastUseCamera, lastPlayMode);
    return;
  }
  startGame(true, "click");
});
punchButton.addEventListener("click", () => startGame(true, "punch"));
noCameraButton.addEventListener("click", () => startGame(false, "click"));
exitButton.addEventListener("click", resetToStart);

updateHud();
