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
    distance: "現在地から0.1km",
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
    distance: "現在地から0.8km",
    address: "瑞穂区瑞穂通 1-2",
    features: ["キャンパス間送迎", "充電スポット完備", "車内Wi-Fi"],
    availabilityLabel: "ピーク前料金",
    availabilityValue: "車両数 3台",
    rating: "4.7",
    reviews: 98,
  },
  {
    id: "tanabe",
    name: "田辺通キャンパス",
    image: "img/tanabe.jpg",
    badge: "教育系",
    ribbon: "朝の予約がしやすい",
    distance: "現在地から1.9km",
    address: "昭和区田辺通 3-5",
    features: ["屋根付き駐車場", "チャイルドシート常備", "ICカード解錠"],
    availabilityLabel: "おすすめ枠",
    availabilityValue: "車両数 2台",
    rating: "4.5",
    reviews: 74,
  },
  {
    id: "kitachikusa",
    name: "北千種キャンパス",
    image: "img/kitachikusa.jpg",
    badge: "芸術系",
    ribbon: "夜間の利用が人気です",
    distance: "現在地から5.9km",
    address: "千種区北千種 2-10",
    features: ["大型車利用可", "照明付き駐車場", "入門ゲート24h"],
    availabilityLabel: "学生割適用中",
    availabilityValue: "車両数 4台",
    rating: "4.6",
    reviews: 86,
  },
];

let currentUser = null;
let currentCampusId = null;
let selectedCampusId = null;

const MINUTES_PER_DAY = 24 * 60;
const START_MINUTES = 7 * 60;
const END_MINUTES = 21 * 60;
const RESERVATION_BUFFER_MINUTES = 30;

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
  const normalized = ((mins % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatTimeWithDay(mins) {
  const dayOffset = Math.floor(mins / MINUTES_PER_DAY);
  const time = minutesToTime(mins);
  return dayOffset > 0 ? `翌日 ${time}` : time;
}

function getCampusById(id) {
  return CAMPUSES.find(c => c.id === id) || null;
}

function formatDateForDisplay(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}`;
}

// 同日同キャンパスで重複していないか
function isTimeAvailable(dateStr, campusId, startMinutes, endMinutes) {
  const reservations = loadReservations().filter(r => {
    return r.date === dateStr && r.campusId === campusId;
  });

  return reservations.every(reservation => {
    const existingStart = reservation.startMinutes;
    const existingEnd = reservation.endMinutes;

    const overlap =
      (startMinutes < existingEnd && endMinutes > existingStart) ||
      (existingStart < endMinutes && existingEnd > startMinutes);

    return !overlap;
  });
}

// 指定日の予約を描画
function renderReservationList(dateStr, campusId) {
  const list = document.getElementById("reservationList");
  list.innerHTML = "";

  if (!dateStr || !campusId) {
    list.innerHTML = '<li class="empty">日付とキャンパスを選択すると予約が表示されます。</li>';
    return;
  }

  const reservations = loadReservations().filter(r => {
    return r.date === dateStr && r.campusId === campusId;
  });

  if (reservations.length === 0) {
    list.innerHTML = '<li class="empty">この日の予約はありません。</li>';
    return;
  }

  reservations
    .sort((a, b) => a.startMinutes - b.startMinutes)
    .forEach(reservation => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="reservation-meta">
          <span class="reservation-time">${reservation.start} - ${reservation.endUser}</span>
          <span class="reservation-name">${reservation.userName}</span>
        </div>
      `;
      list.appendChild(li);
    });
}

// サイドメニューの予約
function renderSideReservations() {
  const list = document.getElementById("sideReservationList");
  const reservations = loadReservations();

  list.innerHTML = "";

  if (reservations.length === 0) {
    list.innerHTML = "<li>まだ予約がありません。</li>";
    return;
  }

  reservations
    .slice()
    .reverse()
    .forEach(r => {
      const campus = getCampusById(r.campusId);
      const campusName = campus ? campus.name : r.campusId;
      const item = document.createElement("li");
      item.innerHTML = `
        <div class="side-resv-text">
          <span class="side-resv-date">${formatDateForDisplay(r.date)}</span>
          <span class="side-resv-time">${r.start} - ${r.endUser}</span>
          <span class="side-resv-campus">${campusName}</span>
        </div>
        ${
          campus
            ? `<div class="side-resv-image"><img src="${campus.image}" alt="${campusName}の写真" loading="lazy" /></div>`
            : ""
        }
      `;
      list.appendChild(item);
    });
}

function updateReserveCampusInfo() {
  const nameEl = document.getElementById("reserveCampusName");
  const distanceEl = document.getElementById("reserveCampusDistance");
  const summaryEl = document.getElementById("reserveCampusSummary");
  if (!currentCampusId) {
    nameEl.textContent = "キャンパス未選択";
    distanceEl.textContent = "";
    summaryEl.innerHTML = '<p class="schedule-summary-empty">キャンパス情報がここに表示されます。</p>';
    return;
  }

  const campus = getCampusById(currentCampusId);
  if (!campus) {
    nameEl.textContent = "キャンパス未選択";
    distanceEl.textContent = "";
    summaryEl.innerHTML = '<p class="schedule-summary-empty">キャンパス情報が取得できませんでした。</p>';
    return;
  }

  nameEl.textContent = campus.name;
  distanceEl.textContent = campus.distance;
  summaryEl.innerHTML = `
    <div class="summary-header">
      <span class="summary-badge">${campus.badge}</span>
      <div class="summary-rating">
        <span class="star">★</span>
        <span>${campus.rating}</span>
        <span class="reviews">(${campus.reviews}件)</span>
      </div>
    </div>
    <h3 class="summary-title">${campus.name}</h3>
    <p class="summary-distance">${campus.distance}</p>
    <p class="summary-address">${campus.address}</p>
    <ul class="summary-features">
      ${campus.features.map(f => `<li>${f}</li>`).join("")}
    </ul>
    <div class="summary-availability">
      <span class="label">${campus.availabilityLabel}</span>
      <span class="value">${campus.availabilityValue}</span>
    </div>
  `;
}

function resetReserveMessages() {
  const check = document.getElementById("checkResult");
  const reserve = document.getElementById("reserveMessage");
  if (check) {
    check.textContent = "";
    check.className = "message";
  }
  if (reserve) {
    reserve.textContent = "";
    reserve.className = "message";
  }
}

/* ===== 15分刻みのselect生成 ===== */
function populateTimeSelects() {
  const startSel = document.getElementById("startTime");
  const endSel = document.getElementById("endTimeUser");
  startSel.innerHTML = "";
  endSel.innerHTML = "";

  for (let mins = START_MINUTES; mins <= END_MINUTES - 15; mins += 15) {
    const t = minutesToTime(mins);
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    startSel.appendChild(opt);
  }

  for (let mins = START_MINUTES + 15; mins <= END_MINUTES; mins += 15) {
    const t = minutesToTime(mins);
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    endSel.appendChild(opt);
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
  // 縦サイズを半分にする（上寄せで縮小）
  card.style.transform = "scaleY(0.5)";
  card.style.transformOrigin = "top";
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
    selectedText.textContent = `${campus.name}を選択中です。（${campus.distance}）`;
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
  const startSelect = document.getElementById("startTime");
  const endSelect = document.getElementById("endTimeUser");
  const reserveDateInput = document.getElementById("reserveDate");

  startSelect.addEventListener("change", () => {
    limitEndTimes();
    resetReserveMessages();
  });
  endSelect.addEventListener("change", resetReserveMessages);
  limitEndTimes();

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

  // ログイン
  const loginForm = document.getElementById("loginForm");
  const loginMessage = document.getElementById("loginMessage");
  loginForm.addEventListener("submit", e => {
    e.preventDefault();
    const id = document.getElementById("studentId").value.trim();
    const pw = document.getElementById("password").value.trim();
    const found = DUMMY_USERS.find(user => user.studentId === id && user.password === pw);
    if (!found) {
      loginMessage.textContent = "学籍番号かパスワードが違います。";
      loginMessage.className = "message error";
      return;
    }
    currentUser = found;
    loginMessage.textContent = "";
    document.getElementById("sideUserName").textContent = `${found.name} さん`;
    showPage("page-campus");
  });

  // キャンパス→日時
  document.getElementById("btnCampusNext").addEventListener("click", () => {
    if (!selectedCampusId) {
      return;
    }
    currentCampusId = selectedCampusId;
    showPage("page-reserve");
    updateReserveCampusInfo();
    renderReservationList(reserveDateInput.value, currentCampusId);
  });

  // 戻る
  document.getElementById("btnBackToCampus").addEventListener("click", () => {
    showPage("page-campus");
    currentCampusId = null;
    updateReserveCampusInfo();
    resetReserveMessages();
    reserveDateInput.value = "";
    document
      .querySelectorAll(".campus-card.selected")
      .forEach(el => el.classList.remove("selected"));
    selectedCampusId = null;
    updateSelectedCampusDisplay();
    renderReservationList("", "");
  });

  // 空き確認
  document.getElementById("btnCheck").addEventListener("click", () => {
    const date = document.getElementById("reserveDate").value;
    const start = document.getElementById("startTime").value;
    const endUser = document.getElementById("endTimeUser").value;
    const result = document.getElementById("checkResult");
    const reserveMsg = document.getElementById("reserveMessage");

    result.className = "message";
    if (reserveMsg) {
      reserveMsg.textContent = "";
      reserveMsg.className = "message";
    }

    if (!currentCampusId) {
      result.textContent = "キャンパスを選び直してください。";
      result.className = "message error";
      return;
    }

    if (!date || !start || !endUser) {
      result.textContent = "日付・開始・終了を入力してください。";
      result.className = "message error";
      return;
    }

    const startMin = timeToMinutes(start);
    const endUserMin = timeToMinutes(endUser);
    const endWithGapMin = endUserMin + RESERVATION_BUFFER_MINUTES;

    const ok = isTimeAvailable(date, currentCampusId, startMin, endWithGapMin);
    if (ok) {
      result.textContent = "予約できます。";
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
    if (!currentCampusId) {
      msg.textContent = "キャンパスを選び直してください。";
      msg.className = "message error";
      return;
    }
    if (!date || !start || !endUser) {
      msg.textContent = "日付・開始・終了を入力してください。";
      msg.className = "message error";
      return;
    }

    const startMin = timeToMinutes(start);
    const endUserMin = timeToMinutes(endUser);
    const endWithGapMin = endUserMin + RESERVATION_BUFFER_MINUTES;

    const ok = isTimeAvailable(date, currentCampusId, startMin, endWithGapMin);
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
      startMinutes: startMin,
      endUser,
      end: endUser,
      endMinutes: endWithGapMin,
      userName: currentUser.name,
      userId: currentUser.studentId,
    });
    saveReservations(reservations);

    msg.textContent = "予約しました。";
    msg.className = "message ok";
    renderReservationList(date, currentCampusId);
    renderSideReservations();
  });

  // 日付切替
  reserveDateInput.addEventListener("change", (e) => {
    resetReserveMessages();
    if (currentCampusId) {
      renderReservationList(e.target.value, currentCampusId);
    }
  });

  renderSideReservations();
  updateReserveCampusInfo();
  renderReservationList("", "");
});
