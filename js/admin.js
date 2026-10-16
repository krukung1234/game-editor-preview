const loginBox = document.getElementById("adminLogin");
const panel = document.getElementById("adminPanel");
const pw = document.getElementById("adminPassword");
const err = document.getElementById("adminError");

const form = document.getElementById("gameForm");
const list = document.getElementById("gameList");
const category = document.getElementById("category");

const desc = document.getElementById("description");
const descCount = document.getElementById("descCount");

const folder = document.getElementById("folder");
const linkPreview = document.getElementById("linkPreview");

const adminSearch = document.getElementById("adminSearch");

const promptInput = document.getElementById("prompt");

let games = [];


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

function val(id) {
  const element = document.getElementById(id);

  if (!element) {
    return "";
  }

  return element.value.trim();
}

function setVal(id, value) {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  element.value = value || "";
}

function adminOK() {
  return localStorage.getItem("admin_ok") === "1";
}


/* =====================================
   ระบบเข้าสู่ระบบ Admin
===================================== */

function showAdmin() {
  loginBox.classList.add("hidden");
  panel.classList.remove("hidden");

  loadGames();
}

document.getElementById("adminLoginBtn").onclick = () => {
  if (pw.value === APP_CONFIG.ADMIN_PASSWORD) {
    localStorage.setItem("admin_ok", "1");
    err.textContent = "";

    showAdmin();
  } else {
    err.textContent = "รหัส Admin ไม่ถูกต้อง";
  }
};

pw.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    document.getElementById("adminLoginBtn").click();
  }
});

document.getElementById("logoutAdmin").onclick = () => {
  localStorage.removeItem("admin_ok");
  location.reload();
};


/* =====================================
   สร้างรายการหมวดหมู่
===================================== */

APP_CONFIG.CATEGORIES.forEach(item => {
  category.insertAdjacentHTML(
    "beforeend",
    `<option value="${safeText(item)}">${safeText(item)}</option>`
  );
});

if (adminOK()) {
  showAdmin();
}


/* =====================================
   สร้างลิงก์เกมอัตโนมัติ
===================================== */

function gameLink(folderName) {
  const cleanFolder = String(folderName || "")
    .trim()
    .replace(/^games\//, "")
    .replace(/\/index\.html$/, "");

  return cleanFolder
    ? `games/${cleanFolder}/index.html`
    : "";
}

function updatePreview() {
  linkPreview.value = gameLink(folder.value);
}

folder.addEventListener("input", updatePreview);


/* =====================================
   นับจำนวนตัวอักษรคำอธิบาย
===================================== */

desc.addEventListener("input", () => {
  descCount.textContent = desc.value.length;
});


/* =====================================
   โหลดข้อมูลเกมจาก Firestore
===================================== */

async function loadGames() {
  try {
    await window.firebaseReady;

    const snap = await window.gamesRef
      .orderBy("createdAt", "desc")
      .get();

    games = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    render();
  } catch (error) {
    console.error(error);

    alert(
      "โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบ Firestore Rules"
    );
  }
}


/* =====================================
   แสดงรายการเกมในหน้า Admin
===================================== */

function render() {
  const key = String(adminSearch.value || "")
    .toLowerCase()
    .trim();

  const filteredGames = games.filter(game => {
    const searchText = `
      ${game.title || ""}
      ${game.category || ""}
      ${game.folder || ""}
      ${game.description || ""}
      ${game.prompt || ""}
    `.toLowerCase();

    return searchText.includes(key);
  });

  document.getElementById("totalGames").textContent =
    games.length;

  document.getElementById("openGames").textContent =
    games.filter(game => game.status === "open").length;

  document.getElementById("soonGames").textContent =
    games.filter(game => game.status === "soon").length;

  if (!filteredGames.length) {
    list.innerHTML =
      '<p class="muted">ยังไม่มีเกม</p>';

    return;
  }

  list.innerHTML = filteredGames
    .map(game => {
      const cover =
        game.image ||
        (
          game.folder
            ? `games/${game.folder}/cover.png`
            : ""
        );

      const link =
        game.link ||
        game.gameUrl ||
        (
          game.folder
            ? gameLink(game.folder)
            : "#"
        );

      const hasPrompt =
        Boolean(String(game.prompt || "").trim());

      const promptBadge = hasPrompt
        ? `
          <span class="prompt-status has-prompt">
            📋 มี Prompt
          </span>
        `
        : `
          <span class="prompt-status no-prompt">
            ยังไม่มี Prompt
          </span>
        `;

      const gameJson = JSON.stringify(game)
        .replaceAll("'", "&apos;");

      return `
        <div class="game-row">

          <img
            src="${safeText(cover)}"
            alt="${safeText(game.title || "รูปปกเกม")}"
            onerror="this.style.display='none'"
          >

          <div class="game-row-content">

            <b>
              ${safeText(game.title)}
            </b>

            <small>
              ${safeText(game.category || "")}
              ·
              ${safeText(game.folder || "")}
            </small>

            <p>
              ${safeText(game.description || "")}
            </p>

            ${promptBadge}

          </div>

          <div class="row-actions">

            <a
              href="game-player.html?url=${encodeURIComponent(link)}&title=${encodeURIComponent(game.title || "เกม")}"
              target="_blank"
              rel="noopener"
            >
              ดู
            </a>

            <button
              type="button"
              onclick='editGame(${gameJson})'
            >
              แก้ไข
            </button>

            <button
              type="button"
              class="danger"
              onclick="deleteGame('${game.id}')"
            >
              ลบ
            </button>

          </div>

        </div>
      `;
    })
    .join("");
}

adminSearch.addEventListener("input", render);


/* =====================================
   บันทึกเกม
===================================== */

form.addEventListener("submit", async event => {
  event.preventDefault();

  const id = val("id");
  const folderName = val("folder");

  const now =
    firebase.firestore.FieldValue.serverTimestamp();

  const data = {
    title: val("title"),

    category: val("category"),

    description: val("description").slice(0, 90),

    image:
      val("image") ||
      (
        folderName
          ? `games/${folderName}/cover.png`
          : ""
      ),

    folder: folderName,

    link: gameLink(folderName),

    gameUrl: gameLink(folderName),

    status: val("status"),

    prompt: val("prompt"),

    updatedAt: now
  };

  if (!data.title || !data.folder) {
    alert(
      "กรุณากรอกชื่อเกมและชื่อโฟลเดอร์เกม"
    );

    return;
  }

  try {
    await window.firebaseReady;

    if (id) {
      await window.gamesRef
        .doc(id)
        .update(data);
    } else {
      await window.gamesRef.add({
        ...data,
        createdAt: now
      });
    }

    alert("บันทึกสำเร็จ");

    resetForm();

    await loadGames();
  } catch (error) {
    console.error(error);

    alert(
      "บันทึกไม่สำเร็จ กรุณาตรวจสอบ Firestore Rules"
    );
  }
});


/* =====================================
   แก้ไขเกม
===================================== */

function editGame(game) {
  setVal("id", game.id);

  setVal("title", game.title);

  setVal("description", game.description);

  descCount.textContent =
    String(game.description || "").length;

  setVal("image", game.image);

  setVal("folder", game.folder);

  setVal("status", game.status || "open");

  setVal("prompt", game.prompt || "");

  category.value =
    game.category || "อื่น ๆ";

  updatePreview();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  setTimeout(() => {
    const titleInput =
      document.getElementById("title");

    if (titleInput) {
      titleInput.focus();
    }
  }, 500);
}


/* =====================================
   ลบเกม
===================================== */

async function deleteGame(id) {
  const confirmed = confirm(
    "ลบเกมนี้ใช่ไหม?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await window.firebaseReady;

    await window.gamesRef
      .doc(id)
      .delete();

    await loadGames();
  } catch (error) {
    console.error(error);

    alert("ลบไม่สำเร็จ");
  }
}


/* =====================================
   ล้างฟอร์ม
===================================== */

function resetForm() {
  form.reset();

  setVal("id", "");

  setVal("prompt", "");

  descCount.textContent = "0";

  updatePreview();

  if (APP_CONFIG.CATEGORIES.length) {
    category.value =
      APP_CONFIG.CATEGORIES[0];
  }

  document.getElementById("status").value =
    "open";
}

document.getElementById("resetBtn").onclick =
  resetForm;


/* =====================================
   เปิดฟังก์ชันให้ปุ่มใน HTML เรียกใช้
===================================== */

window.editGame = editGame;
window.deleteGame = deleteGame;
