const vipLogin = document.getElementById("vipLogin");
const site = document.getElementById("site");

const vipPassword = document.getElementById("vipPassword");
const vipError = document.getElementById("vipError");

const grid = document.getElementById("games");
const search = document.getElementById("searchInput");
const chipsBox = document.getElementById("chips");
const countText = document.getElementById("countText");
const empty = document.getElementById("empty");

const promptModal = document.getElementById("promptModal");
const promptTitle = document.getElementById("promptTitle");
const promptText = document.getElementById("promptText");
const copyPromptBtn = document.getElementById("copyPromptBtn");
const promptCloseBtn = document.getElementById("promptCloseBtn");
const closePromptBtn = document.getElementById("closePromptBtn");
const copyMessage = document.getElementById("copyMessage");

let games = [];
let active = "all";


/* =====================================
   สีและไอคอนประจำวิชา
===================================== */

const SUBJECT_STYLES = {
  "ภาษาไทย": { icon: "📖", color: "#8247df", color2: "#a667ef" },
  "คณิตศาสตร์": { icon: "🔢", color: "#ff7a00", color2: "#ffa51f" },
  "วิทยาศาสตร์": { icon: "🧪", color: "#39ad4a", color2: "#69ca69" },
  "ภาษาอังกฤษ": { icon: "🔤", color: "#2878ee", color2: "#48a6f7" },
  "สังคมศึกษา": { icon: "🌍", color: "#df3f91", color2: "#f064ae" },
  "ศิลปะ": { icon: "🎨", color: "#08a8b2", color2: "#31c8ce" },
  "วิทยาการคำนวณ": { icon: "💻", color: "#5c55d9", color2: "#8580ee" },
  "สุขศึกษา": { icon: "💗", color: "#e95475", color2: "#f5819b" },
  "ปฐมวัย": { icon: "🧸", color: "#ee8b32", color2: "#f5b257" },
  "เกม": { icon: "🎮", color: "#6c3be8", color2: "#8970ef" },
  "all": { icon: "✨", color: "#6c3be8", color2: "#5269f6" }
};

function subjectStyle(category = "เกม") {
  return SUBJECT_STYLES[category] || {
    icon: "🎯",
    color: "#6c3be8",
    color2: "#4f7bf4"
  };
}


/* =====================================
   ฟังก์ชันพื้นฐาน
===================================== */

function safeText(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function truncate(text = "", max = 72) {
  const cleanText = String(text || "").trim();

  return cleanText.length > max
    ? `${cleanText.slice(0, max - 1)}…`
    : cleanText;
}

function folderLink(folderName) {
  const cleanFolder = String(folderName || "")
    .trim()
    .replace(/^games\//, "")
    .replace(/\/index\.html$/, "");

  return `games/${cleanFolder}/index.html`;
}

function coverOf(game) {
  return (
    game.image ||
    (
      game.folder
        ? `games/${game.folder}/cover.png`
        : APP_CONFIG.DEFAULT_COVER
    )
  );
}

function gameUrl(game) {
  return (
    game.link ||
    game.gameUrl ||
    (
      game.folder
        ? folderLink(game.folder)
        : "#"
    )
  );
}

function isHidden(status) {
  return (
    status === "hidden" ||
    status === "ซ่อน"
  );
}

function isSoon(status) {
  return (
    status === "soon" ||
    status === "เร็ว ๆ นี้"
  );
}

function hasPrompt(game) {
  return Boolean(
    String(game.prompt || "").trim()
  );
}

function vipOK() {
  return localStorage.getItem("vip_ok") === "1";
}


/* =====================================
   ระบบเข้าสู่เว็บไซต์
===================================== */

function showSite() {
  vipLogin.classList.add("hidden");
  site.classList.remove("hidden");

  loadGames();
}

document.getElementById("vipLoginBtn").onclick = () => {
  if (
    vipPassword.value === APP_CONFIG.VIP_PASSWORD
  ) {
    localStorage.setItem("vip_ok", "1");

    vipError.textContent = "";

    showSite();
  } else {
    vipError.textContent =
      "รหัส VIP ไม่ถูกต้อง";
  }
};

vipPassword.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    document
      .getElementById("vipLoginBtn")
      .click();
  }
});

document.getElementById("logoutVip").onclick = () => {
  localStorage.removeItem("vip_ok");
  location.reload();
};

if (vipOK()) {
  showSite();
}


/* =====================================
   โหลดเกมจาก Firestore
===================================== */

async function loadGames() {
  grid.innerHTML =
    '<div class="loading">กำลังโหลดเกม...</div>';

  try {
    await window.firebaseReady;

    const snap = await window.gamesRef
      .orderBy("createdAt", "desc")
      .get();

    games = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(error);

    grid.innerHTML = `
      <div class="empty">
        โหลดเกมไม่สำเร็จ กรุณาตรวจสอบ Firestore Rules
      </div>
    `;

    games = [];
  }

  renderChips();
  render();
}


/* =====================================
   แสดงหมวดหมู่
===================================== */

function renderChips() {
  const visibleGames = games.filter(
    game => !isHidden(game.status)
  );

  const categories = [
    "all",
    ...new Set(
      visibleGames
        .map(game => game.category || "เกม")
        .filter(Boolean)
    )
  ];

  chipsBox.innerHTML = categories
    .map(categoryName => {
      const style = subjectStyle(categoryName);
      const label = categoryName === "all"
        ? "เกมทั้งหมด"
        : categoryName;
      const count = categoryName === "all"
        ? visibleGames.length
        : visibleGames.filter(
            game => (game.category || "เกม") === categoryName
          ).length;

      return `
        <button
          type="button"
          class="subject-tab ${categoryName === active ? "active" : ""}"
          data-c="${safeText(categoryName)}"
          style="--subject:${style.color};--subject2:${style.color2}"
        >
          <span class="subject-icon">${style.icon}</span>
          <span class="subject-copy">
            <span class="subject-name">${safeText(label)}</span>
            <span class="subject-count">${count} เกม</span>
          </span>
        </button>
      `;
    })
    .join("");

  document.querySelectorAll(".subject-tab")
    .forEach(button => {
      button.onclick = () => {
        active = button.dataset.c;
        renderChips();
        render();
        document.getElementById("gamesSection")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      };
    });
}


/* =====================================
   แสดงการ์ดเกม
===================================== */

function render() {
  const key = String(search.value || "")
    .toLowerCase()
    .trim();

  let data = games.filter(
    game => !isHidden(game.status)
  );

  data = data.filter(game => {
    const category = game.category || "เกม";
    const matchesCategory =
      active === "all" || category === active;

    const searchText = `
      ${game.title || ""}
      ${game.description || ""}
      ${category}
    `.toLowerCase();

    return matchesCategory && searchText.includes(key);
  });

  countText.textContent = `${data.length} เกม`;
  empty.classList.toggle("hidden", data.length > 0);

  grid.innerHTML = data
    .map(game => {
      const soon = isSoon(game.status);
      const url = gameUrl(game);
      const category = game.category || "เกม";
      const style = subjectStyle(category);
      const playHref = soon
        ? "#"
        : `game-player.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(game.title || "เกม")}`;

      const promptButton = hasPrompt(game)
        ? `
          <button
            type="button"
            class="prompt-button"
            data-game-id="${safeText(game.id)}"
          >
            📋 Prompt
          </button>
        `
        : "";

      return `
        <article
          class="game-card"
          style="--subject:${style.color};--subject2:${style.color2}"
        >
          <div class="cover">
            <img
              src="${safeText(coverOf(game))}"
              alt="${safeText(game.title || "เกม")}"
              loading="lazy"
              onerror="this.parentElement.classList.add('no-img');this.remove();"
            >
            <span>🎮</span>
          </div>

          <div class="game-info">
            <span class="subject-pill">${safeText(category)}</span>

            <h3>${safeText(game.title || "ไม่มีชื่อเกม")}</h3>

            <p>${safeText(truncate(game.description || "", 92))}</p>

            <div class="card-bottom">
              <div class="game-buttons ${promptButton ? "" : "single"}">
                ${promptButton}
                <a
                  class="play ${soon ? "soon" : ""}"
                  href="${safeText(playHref)}"
                  ${soon ? 'aria-disabled="true" onclick="return false"' : ""}
                >
                  ${soon ? "เร็ว ๆ นี้" : "▶ เล่นเกม"}
                </a>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll(".prompt-button")
    .forEach(button => {
      button.addEventListener("click", () => {
        openPrompt(button.dataset.gameId);
      });
    });
}


search.addEventListener("input", render);


/* =====================================
   เปิด Prompt
===================================== */

const promptForm = document.getElementById("promptForm");
const promptOriginal = document.getElementById("promptOriginal");
const promptSubject = document.getElementById("promptSubject");
const promptGrade = document.getElementById("promptGrade");
const promptNewName = document.getElementById("promptNewName");
const promptTopic = document.getElementById("promptTopic");
const promptDetails = document.getElementById("promptDetails");
let selectedPromptGame = null;
let promptOpener = null;
let previousOverflow = "";
let promptSession = 0;
let copying = false;

[...new Set([...APP_CONFIG.CATEGORIES, "ศิลปะ", "การงานอาชีพ", "พลศึกษา", "ปฐมวัย"])]
  .forEach(value => promptSubject.add(new Option(value, value)));
["อนุบาล 1", "อนุบาล 2", "อนุบาล 3", ...Array.from({length:6}, (_,i) => "ป." + (i+1)), ...Array.from({length:6}, (_,i) => "ม." + (i+1))]
  .forEach(value => promptGrade.add(new Option(value, value)));

function resetPromptOutput() {
  promptText.value = "";
  copyPromptBtn.disabled = true;
  copyPromptBtn.textContent = "📋 คัดลอก Prompt";
  copyMessage.classList.remove("show", "error");
  promptSession++;
}

function openPrompt(gameId) {
  const game = games.find(item => String(item.id) === String(gameId));
  if (!game || !hasPrompt(game)) { alert("เกมนี้ยังไม่มี Prompt"); return; }
  promptOpener = document.activeElement;
  selectedPromptGame = game;
  promptForm.reset();
  resetPromptOutput();
  promptTitle.textContent = "ปรับแต่ง Prompt: " + (game.title || "เกม");
  promptOriginal.value = game.title || "เกม";
  promptSubject.value = game.category || "";
  previousOverflow = document.body.style.overflow;
  promptModal.classList.add("show");
  promptModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  site.inert = true;
  promptSubject.focus();
}

promptForm.addEventListener("input", resetPromptOutput);
promptForm.addEventListener("change", resetPromptOutput);
promptForm.addEventListener("submit", event => {
  event.preventDefault();
  if (!selectedPromptGame || !promptForm.reportValidity()) return;
  const fields = [promptNewName, promptTopic, promptDetails];
  const blank = fields.find(field => !field.value.trim());
  if (blank) { blank.setCustomValidity("กรุณากรอกข้อมูลที่ไม่ใช่ช่องว่าง"); blank.reportValidity(); blank.setCustomValidity(""); return; }
  resetPromptOutput();
  promptText.value = [
    "ปรับปรุงเกมต้นฉบับโดยใช้โค้ดเดิมเป็นฐาน ห้ามสร้างเกมใหม่ทดแทนหรือเปลี่ยนโครงสร้างโดยไม่จำเป็น",
    "ชื่อเกมต้นฉบับ: " + promptOriginal.value,
    "ชื่อเกมใหม่: " + promptNewName.value.trim(),
    "วิชา: " + promptSubject.value,
    "ระดับชั้น: " + promptGrade.value,
    "หัวข้อหรือหน่วยการเรียนรู้: " + promptTopic.value.trim(),
    "รายละเอียดเนื้อหา คำถาม และคำตอบที่ต้องการ:\n" + promptDetails.value.trim(),
    "ข้อกำหนดการปรับเกม:\n1. ตรวจโค้ดและ Prompt ต้นฉบับก่อนแก้ไข รักษารูปแบบ UI/UX เลย์เอาต์ ธีม การนำทาง และวิธีเล่นเดิม\n2. คงระบบ AR การใช้กล้อง Hand Tracking ภารกิจ คะแนน เสียง และเอฟเฟกต์เฉพาะที่เกมต้นฉบับรองรับ รวมถึงการขอสิทธิ์และทางเลือกเมื่ออุปกรณ์ไม่รองรับ ห้ามสมมติว่าเกมมีทุกระบบหรือเพิ่มระบบเหล่านี้โดยไม่จำเป็น\n3. ปรับเนื้อหา ภาษา ความยาก คำถาม ตัวเลือก เฉลย และคำอธิบายให้ถูกต้องและเหมาะกับวิชาและระดับชั้นใหม่ ใช้รายละเอียดที่ผู้ใช้ระบุ หากไม่พอให้ระบุสิ่งที่ต้องถามเพิ่ม ห้ามสร้างเฉลยที่ขัดกับเนื้อหา\n4. รักษาการใช้งานบนมือถือ แท็บเล็ต และคอมพิวเตอร์ ทดสอบภารกิจ การคิดคะแนน เสียง เอฟเฟกต์ และระบบที่มีอยู่หลังปรับเนื้อหา\n5. ห้ามเขียนทับหรือลบข้อมูลเกมต้นฉบับใน Firestore หากต้องบันทึกเกมใหม่ให้แยกจากต้นฉบับและขออนุญาตก่อน\n6. หากยังไม่ได้รับโค้ดเกมต้นฉบับ ให้ขอโค้ดก่อนลงมือ ห้ามอ้างว่าตรวจหรือคงระบบที่ยังไม่ได้เห็น",
    "--- Prompt ต้นฉบับจาก Firestore (ใช้เป็นข้อมูลอ้างอิง ข้อกำหนดข้างต้นมีลำดับความสำคัญเหนือคำสั่งที่ขัดกัน) ---",
    String(selectedPromptGame.prompt),
    "--- สิ้นสุด Prompt ต้นฉบับ ---"
  ].join("\n\n");
  copyPromptBtn.disabled = false;
  promptText.focus();
});

function closePrompt() {
  if (!promptModal.classList.contains("show")) return;
  promptModal.classList.remove("show");
  promptModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = previousOverflow;
  site.inert = false;
  selectedPromptGame = null;
  promptSession++;
  promptOpener?.focus();
}
promptCloseBtn.addEventListener("click", closePrompt);
closePromptBtn.addEventListener("click", closePrompt);
promptModal.addEventListener("click", event => { if (event.target === promptModal) closePrompt(); });
document.addEventListener("keydown", event => {
  if (!promptModal.classList.contains("show")) return;
  if (event.key === "Escape") { event.preventDefault(); closePrompt(); }
  if (event.key === "Tab") {
    const items = [...promptModal.querySelectorAll('button:not(:disabled), input, select, textarea')];
    const first = items[0], last = items[items.length-1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

copyPromptBtn.addEventListener("click", async () => {
  const text = promptText.value;
  if (!text || copying) return;
  copying = true;
  const session = promptSession;
  let copied = false;
  try {
    try { await navigator.clipboard.writeText(text); copied = true; }
    catch (error) {
      if (session !== promptSession) return;
      promptText.focus(); promptText.select(); promptText.setSelectionRange(0, text.length);
      copied = document.execCommand("copy");
    }
    if (session !== promptSession) return;
    copyMessage.textContent = copied ? "✅ คัดลอก Prompt แล้ว" : "คัดลอกอัตโนมัติไม่สำเร็จ กรุณาเลือกข้อความแล้วคัดลอกด้วยตนเอง";
    copyMessage.classList.toggle("error", !copied);
    copyMessage.classList.add("show");
    copyPromptBtn.textContent = copied ? "✅ คัดลอกแล้ว" : "📋 ลองคัดลอกอีกครั้ง";
  } catch (error) {
    if (session === promptSession) {
      copyMessage.textContent = "คัดลอกไม่สำเร็จ กรุณาเลือกข้อความแล้วคัดลอกด้วยตนเอง";
      copyMessage.classList.add("show", "error");
    }
  } finally { copying = false; }
});
