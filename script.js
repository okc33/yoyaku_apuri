// デモ用ユーザー（c000000 / 000000）
const DUMMY_USERS = [
  { studentId: "c000000", password: "000000", name: "名古屋 太郎" },
];

// キャンパス一覧（画像パスは差し替えてOK）
const CAMPUSES = [
  { id: "takiko", name: "滝子キャンパス", distance: "0.1 km", img: "img/takiko2.jpg" },
  { id: "sakurayama", name: "桜山キャンパス", distance: "0.8 km", img: "img/sakurayama9.jpg" },
  { id: "tanabedori", name: "田辺通キャンパス", distance: "1.9 km", img: "img/access.jpg" },
  { id: "kitachikusa", name: "北千種キャンパス", distance: "5.9 km", img: "img/kitachikusa1.jpg" },
];

let currentUser = null;
let currentCampusId = null;

/* === 共通 === */
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function loadReservations() {
  const raw = localStorage.getItem("reservations");
  return raw ? JSON.parse(raw) : [];
}

function saveReservations(list) {
  localStorage.setItem("reservations", JSON.stringify(list));
}

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function isTimeAvailable(dateStr, campusId, start, endWithGap) {
  const reservations = loadReservations().filter(r => {
    return r.date === dateStr && r.campusId === campusId;
  });

  const newStart = timeToMinutes(start);
  const newEnd = timeToMinutes(endWithGap);

  for (const r of reservations) {
    const s = timeToMinutes(r.start);
    const e = timeToMinutes(r.end);
    if (newStart < e && s < newEnd) {
      return false;
    }
  }
  return true;
}

function renderReservationList(dateStr, campusId) {
  const listEl = document.getElementById("reservationList");
  listEl.innerHTML = "";
  if (!dateStr || !campusId) return;

  const reservations = loadReservations().filter(r => {
    return r.date === dateStr && r.campusId === campusId;
  });

  if (reservations.length === 0) {
    listEl.innerHTML = "<li>予約はありません。</li>";
    return;
  }

  reservations.sort((a, b) => a.start.localeCompare(b.start));
  reservations.forEach(r => {
    const li = document.createElement("li");
    li.textContent = `${r.start} - ${r.end} (${r.userName})`;
    listEl.appendChild(li);
  });
}

/* === 時間select === */
function populateTimeSelects() {
  const startSel = document.getElementById("startTime");
  const endSel = document.getElementById("endTimeUser");
  startSel.innerHTML = "";
  endSel.innerHTML = "";

  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const t = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const opt1 = document.createElement("option");
      const opt2 = document.createElement("option");
      opt1.value = opt2.value = t;
      opt1.textContent = opt2.textContent = t;
      startSel.appendChild(opt1);
      endSel.appendChild(opt2);
    }
  }
}

function limitEndTimes() {
  const startSel = document.getElementById("startTime");
  const endSel = document.getElementById("endTimeUser");
  const startVal = startSel.value;
  const startMin = timeToMinutes(startVal);

  Array.from(endSel.options).forEach(opt => {
    const endMin = timeToMinutes(opt.value);
    opt.disabled = endMin <= startMin;
  });

  if (endSel.value && timeToMinutes(endSel.value) <= startMin) {
    endSel.value = "";
  }
}

/* === 初期化 === */
window.addEventListener("DOMContentLoaded", () => {
  // ハンバーガー
  const menuBtn = document.getElementById("menuBtn");
  const sideMenu = document.getElementById("sideMenu");
  const overlay = document.getElementById("overlay");
  const closeMenu = document.getElementById("closeMenu");

  function openMenu() {
    sideMenu.classList.add("open");
    overlay.classList.add("show");
  }
  function closeMenuFn() {
    sideMenu.classList.remove("open");
    overlay.classList.remove("show");
  }
  menuBtn.addEventListener("click", openMenu);
  closeMenu.addEventListener("click", closeMenuFn);
  overlay.addEventListener("click", closeMenuFn);

  // キャンパスカード生成
  const campusList = document.getElementById("campusList");
  CAMPUSES.forEach(c => {
    const card = document.createElement("div");
    card.className = "campus-card";
    card.dataset.id = c.id;

    const img = document.createElement("img");
    img.className = "campus-img";
    img.src = c.img;
    img.alt = c.name;
    // 画像がない時でも高さ確保
    img.onerror = () => {
      img.style.background = "#e5e7eb";
      img.src = "";
      img.alt = "";
    };

    const body = document.createElement("div");
    body.className = "campus-body";

    const name = document.createElement("div");
    name.className = "campus-name";
    name.textContent = c.name;

    const dist = document.createElement("div");
    dist.className = "campus-distance";
    dist.textContent = c.distance + " から";

    const meta = document.createElement("div");
    meta.className = "campus-meta";
    meta.textContent = "駐車場あり・学生利用可";

    body.appendChild(name);
    body.appendChild(dist);
    body.appendChild(meta);

    card.appendChild(img);
    card.appendChild(body);

    card.addEventListener("click", () => {
      document.querySelectorAll(".campus-card").forEach(el => el.classList.remove("selected"));
      card.classList.add("selected");
      currentCampusId = c.id;
      document.getElementById("btnCampusNext").disabled = false;
    });

    campusList.appendChild(card);
  });

  // 時刻セレクト
  populateTimeSelects();
  document.getElementById("startTime").addEventListener("change", limitEndTimes);

  // ログイン
  document.getElementById("btnLogin").addEventListener("click", () => {
    const sid = document.getElementById("studentId").value.trim();
    const pw = document.getElementById("password").value.trim();
    const msg = document.getElementById("loginMessage");

    const found = DUMMY_USERS.find(u => u.studentId === sid && u.password === pw);
    if (!found) {
      msg.textContent = "学籍番号またはパスワードが違います。";
      msg.className = "message error";
      return;
    }

    currentUser = found;
    msg.textContent = "";
    document.getElementById("sideUserName").textContent = found.name;
    showPage("page-campus");
  });

  // キャンパス→日時
  document.getElementById("btnCampusNext").addEventListener("click", () => {
    if (!currentCampusId) return;
    showPage("page-reserve");
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById("reserveDate").value = today;
    renderReservationList(today, currentCampusId);
  });

  // 空き確認
  document.getElementById("btnCheck").addEventListener("click", () => {
    const date = document.getElementById("reserveDate").value;
    const start = document.getElementById("startTime").value;
    const endUser = document.getElementById("endTimeUser").value;
    const result = document.getElementById("checkResult");

    if (!date || !start || !endUser) {
      result.textContent = "日付・開始・終了を入力してください。";
      result.className = "message error";
      return;
    }

    const endUserMin = timeToMinutes(endUser);
    const endWithGap = minutesToTime(endUserMin + 30);

    const ok = isTimeAvailable(date, currentCampusId, start, endWithGap);
    if (ok) {
      result.textContent = `予約できます。（終了扱い時間: ${endWithGap}）`;
      result.className = "message ok";
    } else {
      result.textContent = "すでに予約があります。別の時間にしてください。";
      result.className = "message error";
    }
  });

  // 予約
  document.getElementById("btnReserve").addEventListener("click", () => {
    const date = document.getElementById("reserveDate").value;
    const start = document.getElementById("startTime").value;
    const endUser = document.getElementById("endTimeUser").value;
    const msg = document.getElementById("reserveMessage");

    if (!currentUser) {
      msg.textContent = "ログインが必要です。";
      msg.className = "message error";
      return;
    }
    if (!date || !start || !endUser) {
      msg.textContent = "日付・開始・終了を入力してください。";
      msg.className = "message error";
      return;
    }

    const endUserMin = timeToMinutes(endUser);
    const endWithGap = minutesToTime(endUserMin + 30);

    const ok = isTimeAvailable(date, currentCampusId, start, endWithGap);
    if (!ok) {
      msg.textContent = "この時間帯は予約済みです。";
      msg.className = "message error";
      return;
    }

    const reservations = loadReservations();
    reservations.push({
      date,
      campusId: currentCampusId,
      start,
      end: endWithGap,
      userName: currentUser.name,
      userId: currentUser.studentId,
    });
    saveReservations(reservations);

    msg.textContent = "予約しました。";
    msg.className = "message ok";
    renderReservationList(date, currentCampusId);
  });

  // 日付切り替え
  document.getElementById("reserveDate").addEventListener("change", (e) => {
    if (currentCampusId) {
      renderReservationList(e.target.value, currentCampusId);
    }
  });
});  if (reservations.length === 0) {
    listEl.innerHTML = "<li>予約はありません。</li>";
    return;
  }

  reservations.sort((a, b) => a.start.localeCompare(b.start));
  reservations.forEach(r => {
    const li = document.createElement("li");
    li.textContent = `${r.start} - ${r.end} (${r.userName})`;
    listEl.appendChild(li);
  });
}

/* ===== 15分刻みのselect生成 ===== */
function populateTimeSelects() {
  const startSel = document.getElementById("startTime");
  const endSel = document.getElementById("endTimeUser");
  startSel.innerHTML = "";
  endSel.innerHTML = "";

  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const t = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const opt1 = document.createElement("option");
      const opt2 = document.createElement("option");
      opt1.value = opt2.value = t;
      opt1.textContent = opt2.textContent = t;
      startSel.appendChild(opt1);
      endSel.appendChild(opt2);
    }
  }
}

// 終了時刻は開始より後だけ
function limitEndTimes() {
  const startSel = document.getElementById("startTime");
  const endSel = document.getElementById("endTimeUser");
  const startVal = startSel.value;
  const startMin = timeToMinutes(startVal);

  Array.from(endSel.options).forEach(opt => {
    const endMin = timeToMinutes(opt.value);
    opt.disabled = endMin <= startMin;
  });

  if (endSel.value && timeToMinutes(endSel.value) <= startMin) {
    endSel.value = "";
  }
}

/* ===== 初期化 ===== */
window.addEventListener("DOMContentLoaded", () => {
  // キャンパスセレクト
  const campusSelect = document.getElementById("campusSelect");
  CAMPUSES.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    campusSelect.appendChild(opt);
  });

  // 時刻セレクト
  populateTimeSelects();
  document.getElementById("startTime").addEventListener("change", limitEndTimes);

  // ハンバーガー
  const menuBtn = document.getElementById("menuBtn");
  const sideMenu = document.getElementById("sideMenu");
  const overlay = document.getElementById("overlay");
  const closeMenu = document.getElementById("closeMenu");

  function openMenu() {
    sideMenu.classList.add("open");
    overlay.classList.add("show");
  }
  function closeMenuFn() {
    sideMenu.classList.remove("open");
    overlay.classList.remove("show");
  }
  menuBtn.addEventListener("click", openMenu);
  closeMenu.addEventListener("click", closeMenuFn);
  overlay.addEventListener("click", closeMenuFn);

  // ログイン処理
  document.getElementById("btnLogin").addEventListener("click", () => {
    const sid = document.getElementById("studentId").value.trim();
    const pw = document.getElementById("password").value.trim();
    const msg = document.getElementById("loginMessage");

    const found = DUMMY_USERS.find(u => u.studentId === sid && u.password === pw);
    if (!found) {
      msg.textContent = "学籍番号またはパスワードが違います。";
      msg.className = "message error";
      return;
    }

    currentUser = found;
    msg.textContent = "";
    document.getElementById("sideUserName").textContent = `${found.name}`;
    showPage("page-campus");
  });

  // キャンパスから日時へ
  document.getElementById("btnCampusNext").addEventListener("click", () => {
    currentCampusId = document.getElementById("campusSelect").value;
    showPage("page-reserve");
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById("reserveDate").value = today;
    renderReservationList(today, currentCampusId);
  });

  // 空き確認
  document.getElementById("btnCheck").addEventListener("click", () => {
    const date = document.getElementById("reserveDate").value;
    const start = document.getElementById("startTime").value;
    const endUser = document.getElementById("endTimeUser").value;
    const result = document.getElementById("checkResult");

    if (!date || !start || !endUser) {
      result.textContent = "日付・開始・終了を入力してください。";
      result.className = "message error";
      return;
    }

    const endUserMin = timeToMinutes(endUser);
    const endWithGap = minutesToTime(endUserMin + 30);

    const ok = isTimeAvailable(date, currentCampusId, start, endWithGap);
    if (ok) {
      result.textContent = `予約できます。（終了扱い時間: ${endWithGap}）`;
      result.className = "message ok";
    } else {
      result.textContent = "すでに予約があります。別の時間にしてください。";
      result.className = "message error";
    }
  });

  // 予約する
  document.getElementById("btnReserve").addEventListener("click", () => {
    const date = document.getElementById("reserveDate").value;
    const start = document.getElementById("startTime").value;
    const endUser = document.getElementById("endTimeUser").value;
    const msg = document.getElementById("reserveMessage");

    if (!currentUser) {
      msg.textContent = "ログインが必要です。";
      msg.className = "message error";
      return;
    }
    if (!date || !start || !endUser) {
      msg.textContent = "日付・開始・終了を入力してください。";
      msg.className = "message error";
      return;
    }

    const endUserMin = timeToMinutes(endUser);
    const endWithGap = minutesToTime(endUserMin + 30);

    const ok = isTimeAvailable(date, currentCampusId, start, endWithGap);
    if (!ok) {
      msg.textContent = "この時間帯は予約済みです。";
      msg.className = "message error";
      return;
    }

    const reservations = loadReservations();
    reservations.push({
      date,
      campusId: currentCampusId,
      start,
      end: endWithGap,
      userName: currentUser.name,
      userId: currentUser.studentId,
    });
    saveReservations(reservations);

    msg.textContent = "予約しました。";
    msg.className = "message ok";
    renderReservationList(date, currentCampusId);
  });

  // 日付切替
  document.getElementById("reserveDate").addEventListener("change", (e) => {
    if (currentCampusId) {
      renderReservationList(e.target.value, currentCampusId);
    }
  });
});
