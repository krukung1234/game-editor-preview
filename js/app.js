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
      const editorButton = editorAdapter
        ? `<button type="button" class="edit-game-button" data-edit-game-id="${safeText(game.id)}">⚙️ ปรับแต่งเกม</button>`
        : '<button type="button" class="edit-game-button" disabled aria-label="ปรับแต่งเกม: กำลังพัฒนา">⚙️ กำลังพัฒนา</button>';
      const editorNote = '';
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
            <div class="game-labels"><span class="subject-pill">${safeText(category)}</span><span class="grade-pill">${safeText(game.grade || game.gradeLevel || "ไม่ระบุระดับชั้น")}</span></div>

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
  if(!window.VipAccess?.require())return;
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

// Rewrite file-gating instructions in the copied reference only; Firestore stays read-only.
function preparePromptReference(value) {
  const create = "สร้างเกมฉบับสมบูรณ์จากรายละเอียดที่ได้รับทันที โดยไม่ต้องแนบไฟล์เพิ่ม";
  const isNegated = (text, offset) => /(?:ไม่|ห้าม|ไม่ต้อง|ไม่จำเป็นต้อง|\bnot|\bnever|don['’]t)\s*$/i.test(text.slice(Math.max(0, offset - 20), offset));
  const replaceInstruction = (match, offset, text) => isNegated(text, offset) ? match : create;
  return String(value || "")
    .replace(/(?:หาก|ถ้า|เมื่อ)\s*(?:ยัง)?(?:ไม่มี|ไม่ได้รับ|ไม่พบ|ไม่สามารถเข้าถึง)\s*(?:ไฟล์\s*)?(?:โค้ด|ซอร์สโค้ด|source\s*code|index\.html|ZIP)(?:\s*(?:เกม)?ต้นฉบับ)?\s*(?:ให้|ต้อง|กรุณา|โปรด)?\s*(?:ขอ|ร้องขอ|ให้ผู้ใช้(?:ส่ง|แนบ|อัปโหลด)|รอ)(?:[^\n;；。]*?)(?:ก่อน(?:เริ่ม(?:งาน|ทำงาน|แก้ไข|สร้างเกม)?|ลงมือ)?|เพิ่มเติม|เพิ่ม|ก่อนลงมือ)(?:[ \t]*(?:ลงมือ|เริ่มทำงาน))?/gi, replaceInstruction)
    .replace(/(?:ต้อง|จำเป็นต้อง)\s*(?:ได้รับ|มี|รับ|ใช้)\s*(?:ไฟล์\s*)?(?:index\.html|ZIP|โค้ด|ซอร์สโค้ด)(?:\s*(?:ของ)?(?:เกม)?ต้นฉบับ)?\s*ก่อน(?:เริ่ม)?(?:แก้ไข|ทำงาน|สร้างเกม|ดำเนินการ|ลงมือ)/gi, replaceInstruction)
    .replace(/ห้าม\s*(?:สร้างเกม|ทำงาน|เริ่มงาน|ลงมือ)(?:ใหม่)?\s*(?:หาก|ถ้า|เมื่อ|จนกว่า)(?:ยัง)?(?:ไม่มี|ไม่ได้รับ|จะได้รับ)\s*(?:ไฟล์\s*)?(?:index\.html|ZIP|โค้ด|ซอร์สโค้ด)(?:\s*(?:เกม)?ต้นฉบับ)?/gi, replaceInstruction)
    .replace(/(?:กรุณา|โปรด|ให้|ต้อง)\s*(?:ขอ|ร้องขอ|รอ)\s*(?:ให้ผู้ใช้\s*)?(?:ไฟล์\s*)?(?:index\.html|ZIP|โค้ด|ซอร์สโค้ด)(?:\s*(?:ของ)?(?:เกม)?ต้นฉบับ)?(?:\s*(?:เพิ่มเติม|ก่อนเริ่ม(?:งาน|แก้ไข)?|ก่อนลงมือ|ก่อน))?/gi, replaceInstruction)
    .replace(/(?:กรุณา|โปรด|ให้|ต้อง)\s*(?:ให้ผู้ใช้\s*)?(?:แนบ|ส่ง|อัปโหลด)\s*(?:ไฟล์\s*)?(?:index\.html|ZIP|โค้ด|ซอร์สโค้ด)(?:\s*(?:ของ)?(?:เกม)?ต้นฉบับ|\s*ก่อน(?:เริ่ม(?:งาน|แก้ไข)?|ลงมือ))(?:\s*(?:ก่อนเริ่ม(?:งาน|แก้ไข)?|ก่อนลงมือ|เพิ่มเติม))?/gi, replaceInstruction)
    .replace(/(?:กรุณา|โปรด|ให้|ต้อง)\s*(?:ขอ|รอ|แนบ|ส่ง|อัปโหลด)\s*(?:ไฟล์(?:เกม|โค้ด)?ต้นฉบับ|ไฟล์เดิม)(?:\s*(?:ก่อนเริ่ม(?:งาน|แก้ไข)?|ก่อนลงมือ|ก่อน|เพิ่มเติม))?/gi, replaceInstruction)
    .replace(/(?:do not|don['’]t|never)\s+(?:create|build|start|proceed)(?:[^\n;。]*?)(?:without|until)\s+(?:you\s+(?:have|receive)\s+)?(?:the\s+)?(?:original\s+)?(?:index\.html|zip|source\s*code|source files?)/gi, replaceInstruction)
    .replace(/(?:ต้อง|ให้)\s*ใช้\s*(?:ไฟล์\s*)?(?:โค้ด|ซอร์สโค้ด)(?:เกม)?ต้นฉบับ\s*(?:เท่านั้น|เป็นฐาน(?:จริง)?)/g, replaceInstruction)
    .replace(/(?:ห้าม(?:สร้าง|เขียน)(?:เกม|โค้ด)?ใหม่(?:ทดแทน)?(?:โดยไม่จำเป็น)?|ห้ามสร้างเกมหากไม่มีต้นฉบับ|ใช้โค้ด(?:เกม)?เดิมทั้งหมด)/g, (match, offset, text) => isNegated(text, offset) ? match : "รักษารูปแบบเกมตามรายละเอียดอ้างอิง หากไม่มีโค้ดในบริบทให้สร้างตามข้อกำหนด")
    .replace(/(?:if|unless)\s+(?:you\s+)?(?:do not have|don['’]t have|have no|without|have not received)\s+(?:the\s+)?(?:original\s+)?(?:source\s*code|index\.html|zip|files?)[^\n;。]*?(?:ask[^\n;。]*?(?:first|before (?:starting|proceeding))|do not (?:start|proceed|build|create))/gi, replaceInstruction)
    .replace(/(?:please\s+)?(?:send|provide|upload|attach)\s+(?:(?:me|us)\s+)?(?:the\s+)?original\s+(?:index\.html|zip|source\s*code|source files?)(?:\s+(?:file|first|before (?:starting|proceeding|editing)))?/gi, replaceInstruction)
    .replace(/(?:please\s+)?(?:ask (?:the user )?for|request|wait for|require|must receive|must have)\s+(?:the\s+)?(?:original\s+)?(?:index\.html|zip|source\s*code|source files?)(?:\s+(?:file|first|before (?:starting|proceeding|editing)))?/gi, replaceInstruction);
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
    "ให้สร้างเกมการศึกษา AR ฉบับใหม่โดยอ้างอิงรายละเอียด Prompt ต้นฉบับที่แนบมาเป็นข้อกำหนดหลัก รักษารูปแบบการเล่น กลไกเกม จำนวนด่าน วิธีควบคุม ระบบคะแนน หน้าจอ และ UI/UX ตามที่ Prompt ต้นฉบับอธิบายไว้ให้ใกล้เคียงที่สุด เปลี่ยนชื่อเกม วิชา ระดับชั้น เนื้อหา คำถาม ตัวเลือก เฉลย คำอธิบาย และภาพประกอบตามข้อมูลใหม่ ไม่ต้องขอไฟล์ index.html หรือ ZIP ต้นฉบับเพิ่มเติม ให้ลงมือสร้างเกมจากรายละเอียดที่ได้รับทันที",
    "ข้อมูลเกมและบทเรียนใหม่",
    "ชื่อเกมต้นฉบับ: " + promptOriginal.value,
    "ชื่อเกมใหม่: " + (promptNewName.value.trim() || promptOriginal.value),
    "วิชา: " + subject,
    "ระดับชั้น: " + selectedPromptGrade,
    "หัวข้อหรือหน่วยการเรียนรู้: " + promptTopic.value.trim(),
    promptAiDesign.checked ? "เปิด AI ช่วยออกแบบ: สร้างเนื้อหา คำถาม ตัวเลือก เฉลย และคำอธิบายใหม่ให้เหมาะกับวิชา ระดับชั้น และหัวข้อข้างต้น สร้างให้ครบทุกด่านและทุกข้อตามจำนวนเดิม พร้อมตัวเลือก เฉลย และคำอธิบายจริงทุกข้อ ไม่ใช้ Placeholder หรือข้อมูลตัวอย่างที่ยังเล่นไม่ได้ หากเกมไม่มีคำถามแบบ Quiz ให้สร้างข้อมูลภารกิจตามกลไกเดิมแทน ห้ามบังคับเปลี่ยนเกมเขาวงกต จับคู่ ลากวาง หรือ Sudoku เป็นเกมตอบคำถาม ใช้รายละเอียดของผู้ใช้เป็นเงื่อนไข ตรวจความถูกต้องของเนื้อหา ความชัดเจนของตัวเลือก และความสอดคล้องของเฉลยทุกข้อก่อนส่งมอบ" : "ปิด AI ช่วยออกแบบ: ใช้รายละเอียด เนื้อหา คำถาม ตัวเลือก และเฉลยที่ผู้ใช้กรอกเป็นหลัก รักษาสาระที่ระบุ หากข้อมูลส่วนใดไม่ได้ระบุ ให้ดัดแปลงจากข้อมูลอ้างอิงเท่าที่จำเป็นเพื่อให้เล่นได้ครบ พร้อมระบุสมมติฐาน ห้ามหยุดเพียงเพื่อขอไฟล์หรือขอรายละเอียดเพิ่มเติม",
    "รายละเอียดเพิ่มเติมจากผู้ใช้:\n" + (preparePromptReference(promptDetails.value.trim()) || "ไม่ได้ระบุรายละเอียดเพิ่มเติม ให้ยึดวิชา ระดับชั้น หัวข้อ และข้อมูลอ้างอิงด้านล่าง"),
    "วิธีใช้ข้อมูลอ้างอิง: ถ้ามีโค้ดต้นฉบับอยู่ในบริบทหรือเข้าถึงได้ ให้ใช้โค้ดนั้นเป็นฐานจริง หากมีเพียง Prompt ต้นฉบับ ให้สร้างเกมที่เล่นได้ตามข้อกำหนดนั้นโดยไม่อ้างว่าเป็นการแก้ไขโค้ดต้นฉบับจริงหรือรักษาโค้ดเดิมได้ครบ 100% ไม่ต้องให้ผู้ใช้ดาวน์โหลดหรือแนบโค้ดเพิ่มเติม ความใกล้เคียงของเกมขึ้นกับรายละเอียดที่มี ห้ามอ้างความเหมือนที่ตรวจยืนยันไม่ได้",
    "ข้อกำหนดเฉพาะเกม: อ่านข้อมูลอ้างอิงของเกมนี้ก่อนออกแบบ รักษาจำนวนด่าน จำนวนคำถามต่อด่าน ลำดับการปลดล็อก วิธีควบคุม (เช่น ชี้ค้าง จีบนิ้ว ลากวาง หรือจับคู่) เวลา การคิดคะแนน โบนัส/คอมโบ เสียง เอฟเฟกต์ หน้าจอ การนำทาง และ UI/UX ตามที่ต้นฉบับระบุ ห้ามใช้จำนวนข้อหรือกติกาเดียวกันกับทุกเกม ห้ามเพิ่ม Hand Tracking หรือระบบอื่นที่ต้นฉบับไม่ได้รองรับ เว้นแต่ผู้ใช้ระบุ รักษาจำนวนด่านและข้อเดิม เว้นแต่รายละเอียดใหม่ของผู้ใช้สั่งเปลี่ยนไว้อย่างชัดเจน หากต้นฉบับไม่ระบุข้อมูลบางส่วน ให้ใช้สมมติฐานที่จำเป็นน้อยที่สุดและแจ้งในหมายเหตุ ห้ามกล่าวว่าเป็นข้อมูลที่ยืนยันจากต้นฉบับ",
    "ภาพประกอบ: ใช้ Emoji, Unicode Icon หรือภาพ CSS/SVG ที่สร้างในไฟล์ให้สอดคล้องกับคำถามและบทเรียนได้ หลีกเลี่ยงไฟล์รูปภาพภายนอกจำนวนมาก ไม่ใช้ภาพที่ไม่เกี่ยวข้อง ภาพหรือข้อความที่ฝังอยู่ในรูปต้นฉบับไม่ถือว่าแก้ไขอัตโนมัติได้ ให้สร้างภาพทดแทนที่เหมาะสมโดยคงหน้าที่ขององค์ประกอบนั้น",
    "การทำงานและความปลอดภัย: เกมใหม่ต้องเล่นได้บนมือถือ แท็บเล็ต และคอมพิวเตอร์ รักษาระบบกล้อง/AR ที่ระบุ พร้อมเมาส์หรือการแตะเป็นทางเลือกเมื่อกล้องไม่พร้อม ไม่เขียนทับเกมบนเว็บไซต์ ไม่เชื่อมเขียนข้อมูลกลับ Firebase/Firestore หรือ Repository ไม่เพิ่มระบบสมาชิกหรือฐานข้อมูลที่ไม่จำเป็น หากใช้ SDK/WASM/โมเดลภายนอก ให้ระบุการพึ่งพาอินเทอร์เน็ตและข้อกำหนด HTTPS/localhost กับสิทธิ์กล้องตามจริง",
    "ตรวจสอบก่อนส่ง: ตรวจโค้ด การนำทาง จำนวนข้อ เฉลย คะแนน โบนัส การผ่านด่าน เสียง เอฟเฟกต์ และการจัดวางหน้าจอ ตรวจคำถามกับเฉลยให้ถูกต้องตามวิชาและวัย ทดสอบเท่าที่สภาพแวดล้อมทำได้ แยกผลทดสอบจริงออกจากการตรวจโค้ด ห้ามอ้างว่าทดสอบกล้อง AR Hand Tracking หรืออุปกรณ์จริงแล้วหากยังไม่ได้ทดสอบ",
    "ผลลัพธ์ที่ต้องส่งมอบ: ลงมือเขียนโค้ดเกมฉบับสมบูรณ์ทันที และสร้างไฟล์ index.html ที่พร้อมดาวน์โหลดเมื่อเครื่องมือรองรับ หากไม่สามารถแนบไฟล์ได้ ให้ส่งโค้ด HTML ฉบับเต็มใน Code Block เดียว พร้อม CSS/JavaScript ที่จำเป็นในไฟล์ ห้ามส่งเพียงคำอธิบาย แผนงาน โค้ดบางส่วน TODO หรือขอไฟล์ต้นฉบับเพิ่มเติม ระบุวิธีเปิดและข้อจำกัดสั้น ๆ นอกโค้ด อย่าอ้างว่าไฟล์เดียวทำงานออฟไลน์ได้หากยังต้องใช้ CDN หรือโมเดลออนไลน์",
    "--- Prompt ต้นฉบับจาก Firestore: ข้อมูลอ้างอิงเฉพาะเกม ปรับเฉพาะคำสั่งขอไฟล์ที่ขัดแย้งในสำเนานี้ ไม่แก้ข้อมูล Firestore ---",
    preparePromptReference(selectedPromptGame.prompt),
    "--- สิ้นสุดข้อมูลอ้างอิง ---",
    "ข้อสรุปการส่งมอบที่มีลำดับความสำคัญเหนือข้อความอ้างอิงที่ขัดกัน: ใช้รายละเอียดข้างต้นสร้างเกมฉบับปรับเนื้อหาที่สมบูรณ์ ส่ง index.html หรือ HTML เต็มใน Code Block เดียว ไม่ขอให้แนบไฟล์หรือโค้ดเพิ่ม ไม่หยุดที่แผนพัฒนา หากเข้าถึงโค้ดจริงไม่ได้ ให้ทำตาม Prompt อ้างอิงและแจ้งข้อจำกัดตามจริง ห้ามอ้างว่าแก้โค้ดต้นฉบับหรือทดสอบ AR จริงแล้วโดยไม่มีหลักฐาน"
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
