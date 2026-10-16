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

      const editorReady = Boolean(window.GameAdapters && window.GameEditor);
      const editorAdapter = editorReady ? window.GameAdapters.find(game) : null;
      const editorNoteId = 'editor-status-' + encodeURIComponent(String(game.id));
      const editorStatus = editorAdapter
        ? ''
        : editorReady ? 'ยังไม่รองรับการแก้ไขและทดลองเล่น' : 'โหลดตัวปรับแต่งไม่สำเร็จ กรุณารีเฟรชหน้า';
      const editorButton = editorAdapter
        ? `<button type="button" class="edit-game-button" data-edit-game-id="${safeText(game.id)}">⚙️ ปรับแต่งเกม</button>`
        : `<button type="button" class="edit-game-button" disabled aria-describedby="${safeText(editorNoteId)}" title="${safeText(editorStatus)}">⚙️ ปรับแต่งเกม</button>`;
      const editorNote = editorStatus
        ? `<p id="${safeText(editorNoteId)}" class="editor-unsupported">${safeText(editorStatus)}</p>`
        : '<p class="editor-supported">ปรับข้อมูลและทดลองเล่นได้ • Mini City</p>';
      const promptButton = hasPrompt(game)
        ? `<button type="button" class="prompt-button" data-game-id="${safeText(game.id)}">📋 Prompt</button>`
        : '<button type="button" class="prompt-button" disabled title="เกมนี้ยังไม่มี Prompt ต้นฉบับ">📋 Prompt</button>';

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
              <div class="game-buttons">
                ${promptButton}
                ${editorButton}
                <a
                  class="play ${soon ? "soon" : ""}"
                  href="${safeText(playHref)}"
                  ${soon ? 'aria-disabled="true" onclick="return false"' : ""}
                >
                  ${soon ? "เร็ว ๆ นี้" : "▶ เล่นเกม"}
                </a>
              </div>
              ${editorNote}
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll(".edit-game-button:not(:disabled)").forEach(button => {
    button.addEventListener("click", () => {
      const game = games.find(item => String(item.id) === button.dataset.editGameId);
      if (game) window.GameEditor.open(game, button);
    });
  });

  document.querySelectorAll(".prompt-button:not(:disabled)")
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
const promptNewName = document.getElementById("promptNewName");
const promptTopic = document.getElementById("promptTopic");
const promptDetails = document.getElementById("promptDetails");
const promptCustomSubject = document.getElementById("promptCustomSubject");
const promptAiDesign = document.getElementById("promptAiDesign");
const promptValidation = document.getElementById("promptValidation");
const promptSubjects = LearningOptions.subjects;
const promptGradeGroups = LearningOptions.gradeGroups;
let selectedPromptGame = null, promptOpener = null, previousOverflow = "", promptSession = 0, copyingSession = null;
let selectedPromptSubject = "", selectedPromptGrade = "", selectedPromptGroup = "ประถมศึกษา";

function resetPromptOutput() {
  promptText.value = "";
  copyPromptBtn.disabled = true;
  copyPromptBtn.textContent = "📋 คัดลอก Prompt";
  copyMessage.classList.remove("show", "error");
  promptValidation.hidden = true;
  promptSession++;
}

function renderPromptChoices(containerId, values, selected, choose) {
  const container = document.getElementById(containerId);
  container.replaceChildren(...values.map(value => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = value;
    button.setAttribute("aria-pressed", String(value === selected));
    button.addEventListener("click", () => {
      choose(value);
      resetPromptOutput();
      renderPromptControls();
      [...document.getElementById(containerId).children].find(item => item.textContent === value)?.focus({preventScroll:true});
    });
    return button;
  }));
}

function renderPromptControls() {
  renderPromptChoices("promptSubjects", promptSubjects, selectedPromptSubject, value => { selectedPromptSubject = value; });
  const custom = selectedPromptSubject === "อื่น ๆ";
  document.getElementById("promptCustomLabel").hidden = !custom;
  promptCustomSubject.disabled = !custom;
  promptCustomSubject.required = custom;
  renderPromptChoices("promptGradeGroups", Object.keys(promptGradeGroups), selectedPromptGroup, value => {
    if (value !== selectedPromptGroup) selectedPromptGrade = "";
    selectedPromptGroup = value;
  });
  renderPromptChoices("promptGrades", promptGradeGroups[selectedPromptGroup], selectedPromptGrade, value => { selectedPromptGrade = value; });
}

function resetPromptDefaults() {
  if (!selectedPromptGame) return;
  promptForm.reset();
  const category = selectedPromptGame.category || "";
  selectedPromptSubject = promptSubjects.includes(category) ? category : "อื่น ๆ";
  promptCustomSubject.value = selectedPromptSubject === "อื่น ๆ" && category !== "อื่น ๆ" ? category : "";
  const rawGrade = String(selectedPromptGame.grade || selectedPromptGame.gradeLevel || "").trim();
  selectedPromptGrade = LearningOptions.normalizeGrade(rawGrade);
  selectedPromptGroup = Object.keys(promptGradeGroups).find(group => promptGradeGroups[group].includes(selectedPromptGrade)) || "ประถมศึกษา";
  if (!promptGradeGroups[selectedPromptGroup].includes(selectedPromptGrade)) selectedPromptGrade = "";
  promptOriginal.value = selectedPromptGame.title || "เกม";
  promptTitle.textContent = "📋 ปรับแต่ง Prompt: " + promptOriginal.value;
  resetPromptOutput();
  renderPromptControls();
  document.getElementById("promptBody").scrollTop = 0;
}

function openPrompt(gameId) {
  const game = games.find(item => String(item.id) === String(gameId));
  if (!game || !hasPrompt(game)) { alert("เกมนี้ยังไม่มี Prompt"); return; }
  promptOpener = document.activeElement;
  // Snapshot only: form changes must never mutate the catalogue or Firestore data.
  selectedPromptGame = {title:game.title, category:game.category, grade:game.grade, gradeLevel:game.gradeLevel, prompt:game.prompt};
  resetPromptDefaults();
  previousOverflow = document.body.style.overflow;
  promptModal.classList.add("show");
  promptModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  site.inert = true;
  promptCloseBtn.focus({preventScroll:true});
}

document.getElementById("resetPromptBtn").addEventListener("click", resetPromptDefaults);
promptForm.addEventListener("input", resetPromptOutput);
promptForm.addEventListener("change", resetPromptOutput);
promptForm.addEventListener("submit", event => {
  event.preventDefault();
  if (!selectedPromptGame) return;
  resetPromptOutput();
  const subject = selectedPromptSubject === "อื่น ๆ" ? promptCustomSubject.value.trim() : selectedPromptSubject;
  const missing = !subject ? "กรุณาเลือกหรือระบุวิชา" : !selectedPromptGrade ? "กรุณาเลือกระดับชั้น" : !promptTopic.value.trim() ? "กรุณาระบุหัวข้อหรือหน่วยการเรียนรู้" : "";
  if (missing) {
    promptValidation.textContent = missing;
    promptValidation.hidden = false;
    const target = !subject ? promptCustomSubject : !selectedPromptGrade ? document.querySelector("#promptGrades button") : promptTopic;
    target.focus();
    return;
  }
  if (!promptForm.reportValidity()) return;
  promptText.value = [
    "ปรับปรุงเกมโดยใช้โค้ดเกมต้นฉบับเป็นฐาน ห้ามสร้างเกมใหม่ทดแทนหรือเปลี่ยนโครงสร้างโดยไม่จำเป็น และห้ามทำให้ฟังก์ชันเดิมเสียหาย",
    "ชื่อเกมต้นฉบับ: " + promptOriginal.value,
    "ชื่อเกมใหม่: " + (promptNewName.value.trim() || promptOriginal.value),
    "วิชา: " + subject,
    "ระดับชั้น: " + selectedPromptGrade,
    "หัวข้อหรือหน่วยการเรียนรู้: " + promptTopic.value.trim(),
    promptAiDesign.checked
      ? "เปิด AI ช่วยออกแบบ: ให้ออกแบบเนื้อหา คำถาม ตัวเลือก เฉลย คำอธิบาย และภาพประกอบให้เหมาะกับวิชา ระดับชั้น และหัวข้อที่กำหนด ตรวจสอบความถูกต้องและใช้รายละเอียดเพิ่มเติมของผู้ใช้เป็นข้อกำหนด หากข้อมูลขัดกันให้ถามก่อนแก้ไข"
      : "ปิด AI ช่วยออกแบบ: ใช้รายละเอียด เนื้อหา คำถาม ตัวเลือก และเฉลยที่ผู้ใช้กรอกเป็นหลัก ห้ามแต่งคำตอบหรือเปลี่ยนสาระเอง หากข้อมูลไม่พอให้ถามผู้ใช้ก่อนลงมือ",
    "รายละเอียดเพิ่มเติมจากผู้ใช้:\n" + (promptDetails.value.trim() || "ไม่ได้ระบุรายละเอียดเพิ่มเติม"),
    "ข้อกำหนด:\n1. ตรวจโค้ดและ Prompt ต้นฉบับก่อนแก้ไข เปลี่ยนชื่อเกม วิชา ระดับชั้น และเนื้อหาตามข้อมูลข้างต้น รักษา UI/UX ธีม การนำทางและรูปแบบการเล่นเดิม\n2. คงระบบ AR การใช้กล้อง Hand Tracking ภารกิจ คะแนน เสียง เอฟเฟกต์ และองค์ประกอบสำคัญ เฉพาะที่เกมเดิมรองรับ ห้ามสมมติว่ามีทุกระบบ รักษาทางเลือกเมื่อกล้องหรืออุปกรณ์ไม่รองรับ\n3. ปรับคำถาม ตัวเลือก เฉลย คำอธิบาย และภาพประกอบให้สอดคล้องกับบทเรียน เหมาะกับวัยและกติกาแต่ละด่าน\n4. ห้ามแก้ไขหรือลบข้อมูลต้นฉบับใน Firebase/Firestore หรือเขียนทับเกมต้นฉบับ\n5. รองรับมือถือ แท็บเล็ต และคอมพิวเตอร์ ให้ AI ตรวจสอบโค้ดและการทำงานจริงก่อนส่งงาน รวมถึงเฉลย การคิดคะแนน ภารกิจ เสียง เอฟเฟกต์และระบบเดิมที่รองรับ พร้อมรายงานผลและข้อจำกัดอย่างตรงไปตรงมา\n6. หากยังไม่มีโค้ดเกมต้นฉบับ ให้ขอโค้ดก่อนลงมือ ห้ามอ้างว่าทดสอบระบบที่ยังไม่ได้ตรวจ",
    "--- Prompt ต้นฉบับจาก Firestore (ข้อมูลอ้างอิง ข้อกำหนดใหม่ข้างต้นมีความสำคัญเหนือคำสั่งที่ขัดกัน) ---",
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
promptModal.addEventListener("click", event => { if (event.target === promptModal) closePrompt(); });
document.addEventListener("keydown", event => {
  if (!promptModal.classList.contains("show")) return;
  if (event.key === "Escape") { event.preventDefault(); closePrompt(); }
  if (event.key === "Tab") {
    const items = [...promptModal.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)')].filter(item => item.getClientRects().length && item.tabIndex >= 0);
    const first = items[0], last = items[items.length-1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

copyPromptBtn.addEventListener("click", async () => {
  const text = promptText.value, session = promptSession;
  if (!text || copyingSession === session) return;
  copyingSession = session;
  try {
    let copied = false;
    try { await navigator.clipboard.writeText(text); copied = true; }
    catch (error) {
      if (session !== promptSession) return;
      promptText.focus(); promptText.select(); promptText.setSelectionRange(0, text.length);
      copied = document.execCommand("copy");
    }
    if (session !== promptSession) return;
    copyMessage.textContent = copied ? "คัดลอก Prompt เรียบร้อยแล้ว" : "คัดลอกอัตโนมัติไม่สำเร็จ กรุณาเลือกข้อความแล้วคัดลอกด้วยตนเอง";
    copyMessage.classList.toggle("error", !copied);
    copyMessage.classList.add("show");
    copyPromptBtn.textContent = copied ? "✅ คัดลอกแล้ว" : "📋 ลองคัดลอกอีกครั้ง";
  } catch (error) {
    if (session === promptSession) {
      copyMessage.textContent = "คัดลอกไม่สำเร็จ กรุณาเลือกข้อความแล้วคัดลอกด้วยตนเอง";
      copyMessage.classList.add("show", "error");
    }
  } finally { if (copyingSession === session) copyingSession = null; }
});
