// デモ用ユーザー（c000000 / 000000）
const DUMMY_USERS = [
  // 実際はログイン後にここから名前をセットする
  { studentId: "c000000", password: "000000", name: "名古屋 太郎" },
];

// キャンパス一覧
const CAMPUSES = [
  {
    id: "takiko",
    name: "滝子キャンパス",
    image: "img/takiko.jpg",
    badge: "本部キャンパス",
    ribbon: "新しい車両が利用できます",
    distance: "中心部から 1.2km",
    address: "昭和区滝子町 1-1",
    features: ["24時間利用可", "EV 2台常備", "スタッフ常駐"],
    availabilityLabel: "本日の空き状況",
    availabilityValue: "車両数 5台",
    rating: "4.8",
    reviews: 132,
  },
  {
    id: "sakurayama",
    name: "桜山キャンパス",
    image: "img/sakurayama.jpg",
    badge: "医療系",
    ribbon: "病院に直結しています",
    distance: "桜山駅から 徒歩 3分",
    address: "瑞穂区瑞穂通 1-2",
    features: ["キャンパス間送迎", "充電スポット完備", "車内Wi-Fi"],
    availabilityLabel: "ピーク前料金",
    availabilityValue: "車両数 3台",
    rating: "4.7",
    reviews: 98,
  },
  {
    id: "kitachikusa",
    name: "北千種キャンパス",
    image: "img/kitachikusa.jpg",
    badge: "芸術系",
    ribbon: "夜間の利用が人気です",
    distance: "今池駅から バス 8分",
    address: "千種区北千種 2-10",
    features: ["大型車利用可", "照明付き駐車場", "入門ゲート24h"],
    availabilityLabel: "学生割適用中",
    availabilityValue: "車両数 4台",
    rating: "4.6",
    reviews: 86,
  },
  {
    id: "tanabe",
    name: "田辺通キャンパス",
    image: "img/tanabe.jpg",
    badge: "教育系",
    ribbon: "朝の予約がしやすい",
    distance: "八事駅から 徒歩 5分",
    address: "昭和区田辺通 3-5",
    features: ["屋根付き駐車場", "チャイルドシート常備", "ICカード解錠"],
    availabilityLabel: "おすすめ枠",
    availabilityValue: "車両数 2台",
    rating: "4.5",
    reviews: 74,
  },
];

let currentUser = null;
let currentCampusId = null;
let selectedCampusId = null;

/* ===== 共通処理 ===== */
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

// 同日同キャンパスで重複していないか
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
function createCampusCard(campus) {
  const card = document.createElement("article");
  card.className = "campus-card";
  card.setAttribute("role", "listitem");
  card.setAttribute("tabindex", "0");
  card.dataset.id = campus.id;
  card.innerHTML = `
    <div class="campus-image">
      <img src="${campus.image}" alt="${campus.name}の写真" loading="lazy" />
      <span class="campus-ribbon">${campus.ribbon}</span>
    </div>
    <div class="campus-card-body">
      <div class="campus-card-header">
        <span class="campus-badge">${campus.badge}</span>
        <div class="campus-rating">
          <span class="star">★</span>
          <span>${campus.rating}</span>
          <span class="reviews">(${campus.reviews}件)</span>
        </div>
      </div>
      <h3>${campus.name}</h3>
      <p class="campus-distance">${campus.distance} · ${campus.address}</p>
      <ul class="campus-features">
        ${campus.features.map(f => `<li>${f}</li>`).join("")}
      </ul>
      <div class="campus-footer">
        <div class="campus-availability">
          <span class="availability-label">${campus.availabilityLabel}</span>
          <span class="availability-value">${campus.availabilityValue}</span>
        </div>
        <div class="campus-action">タップして選択</div>
      </div>
    </div>
  `;
  return card;
}

function updateSelectedCampusDisplay() {
  const selectedText = document.getElementById("selectedCampus");
  const nextBtn = document.getElementById("btnCampusNext");
  if (!selectedCampusId) {
    selectedText.textContent = "キャンパスをまだ選択していません。";
    nextBtn.disabled = true;
    return;
  }
  const campus = CAMPUSES.find(c => c.id === selectedCampusId);
  if (campus) {
    selectedText.textContent = `${campus.name}を選択中です。`;
    nextBtn.disabled = false;
  }
}

function selectCampus(card) {
  document
    .querySelectorAll(".campus-card.selected")
    .forEach(el => el.classList.remove("selected"));
  card.classList.add("selected");
  selectedCampusId = card.dataset.id;
  updateSelectedCampusDisplay();
}

window.addEventListener("DOMContentLoaded", () => {
  const campusList = document.getElementById("campusList");
  campusList.setAttribute("aria-describedby", "selectedCampus");
  CAMPUSES.forEach(campus => {
    const card = createCampusCard(campus);
    campusList.appendChild(card);

    card.addEventListener("click", () => {
      selectCampus(card);
    });
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectCampus(card);
      }
    });
  });
  updateSelectedCampusDisplay();

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
    if (!selectedCampusId) return;
    currentCampusId = selectedCampusId;
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
