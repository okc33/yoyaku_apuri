window.addEventListener("DOMContentLoaded", () => {
  const campusList = document.getElementById("campusList");
  if (campusList) {
    campusList.setAttribute("aria-describedby", "selectedCampus");
    // 二重描画を防ぐため、この初期化ブロックは属性設定のみで終了
    return;
    CAMPUSES.forEach(campus => {
      const card = createCampusCard(campus);
      campusList.appendChild(card);
      card.addEventListener("click", () => selectCampus(card));
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectCampus(card);
        }
      });
    });
  }
  // この下は今のあなたのコードそのままでOK
});
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

// 追加：車種定義（6台）
// 自動運転: 1台、EV: 2台、大型車: 3台
const CARS = [
  { id: "car-blue", image: "img/blue.png", name: "Blue", type: "自動運転", typeId: 1, available: true },
  { id: "car-red", image: "img/red.png", name: "Red", type: "EV", typeId: 2, available: false }, // EVのうち1台は埋まっている
  { id: "car-green", image: "img/green.png", name: "Green", type: "EV", typeId: 2, available: true },
  { id: "car-pink", image: "img/pink.png", name: "Pink", type: "大型車", typeId: 3, available: false }, // 大型車のうち1台は埋まっている
  { id: "car-purple", image: "img/purple.png", name: "Purple", type: "大型車", typeId: 3, available: true },
  { id: "car-yellow", image: "img/yellow.png", name: "Yellow", type: "大型車", typeId: 3, available: true },
];

let currentUser = null;
let currentCampusId = null;
let selectedCampusId = null;
let selectedCarId = null; // 追加：選択された車

const MINUTES_PER_DAY = 24 * 60;
const START_MINUTES = 7 * 60;
const END_MINUTES = 21 * 60;
const RESERVATION_BUFFER_MINUTES = 30;

/* ===== 共通処理 ===== */

// 追加：車種ラベルを一元化して常に「〜車」を付ける
function getCarTypeLabel(type) {
  if (!type) return "";
  if (type === "自動運転") return "普通車";
  if (type === "EV") return "EV車";
  return "大型車";
}

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
      const campus = getCampusById(reservation.campusId);
      const campusName = campus ? campus.name : reservation.campusId;
      const li = document.createElement("li");
      // 日付を追加（formatDateForDisplay を使用）と車種表示
      li.innerHTML = `
        <div class="resv-time">${formatDateForDisplay(reservation.date)} ${reservation.start} - ${reservation.endUser}</div>
        <div class="resv-meta">
          <span class="resv-campus">${campusName}</span>
          <span class="resv-car">${reservation.carType || ""}</span>
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
          <div class="side-resv-top">
            <span class="side-resv-date">${formatDateForDisplay(r.date)}</span>
            <span class="side-resv-campus">${campusName}</span>
          </div>
          <span class="side-resv-time">${r.start} - ${r.endUser}</span>
          <span class="side-resv-car">${r.carType || ""}</span>
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
    <div class="summary-main">
      <div class="summary-image">
        <img src="${campus.image}" alt="${campus.name}の写真" loading="lazy" />
      </div>
      <div class="summary-body">
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
      </div>
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

// 追加：車種カード作成（表示文言変更：車名→車種名表記）
function createCarCard(car) {
  const li = document.createElement("li");
  li.className = "campus-card car-card";
  li.dataset.id = car.id;
  li.setAttribute("role", "button");
  li.setAttribute("tabindex", "0");

  const displayTypeLabel = getCarTypeLabel(car.type);

  li.innerHTML = `
    <div class="campus-card-body">
      <h3 class="car-title">${displayTypeLabel}</h3>

      <div class="car-image-wrap">
        <img src="${car.image}" alt="${displayTypeLabel}の写真" loading="lazy" />
        ${car.available ? '' : '<span class="campus-ribbon small">予約不可</span>'}
      </div>

      <div class="campus-footer">
        <div class="campus-action ${car.available ? '' : 'unavailable'}">${car.available ? '選択可能' : '予約済み'}</div>
      </div>
    </div>
  `;

  if (car.available) {
    li.addEventListener("click", () => selectCar(li));
    li.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectCar(li);
      }
    });
  } else {
    li.setAttribute("aria-disabled", "true");
  }
  return li;
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

function renderCarSelection() {
  const container = document.getElementById("carSelection");
  const list = document.getElementById("carList");
  const carMessage = document.getElementById("carSelectionMessage");
  if (!container || !list) return;
  list.innerHTML = "";
  selectedCarId = null;
  container.style.display = "block";
  carMessage.textContent = "車種を選択してください（必須）";

  CARS.forEach(car => {
    const card = createCarCard(car);
    list.appendChild(card);
  });
  updateCarSelectionDisplay();
}

function hideCarSelection() {
  const container = document.getElementById("carSelection");
  if (!container) return;
  container.style.display = "none";
  selectedCarId = null;
  updateCarSelectionDisplay();
}

function selectCar(cardEl) {
  document.querySelectorAll(".car-card.selected").forEach(el => el.classList.remove("selected"));
  cardEl.classList.add("selected");
  selectedCarId = cardEl.dataset.id;
  updateCarSelectionDisplay();
}

function updateCarSelectionDisplay() {
  const info = document.getElementById("selectedCarInfo");
  const btnReserveEl = document.getElementById("btnReserve");
  if (!info || !btnReserveEl) return;
  if (!selectedCarId) {
    info.textContent = "車種を選択していません。";
    btnReserveEl.disabled = true;
  } else {
    const car = CARS.find(c => c.id === selectedCarId);
    // 車名ではなく「車種（〜車）」表記に変更
    info.textContent = car ? `${getCarTypeLabel(car.type)}を選択中` : "車種を選択していません。";
    btnReserveEl.disabled = false;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const campusList = document.getElementById("campusList");
  campusList.setAttribute("aria-describedby", "selectedCampus");
  CAMPUSES.forEach(campus => {
    const card = createCampusCard(campus);
    campusList.appendChild(card);
    // クリックで選択して次へ
    card.addEventListener("click", () => {
      selectCampus(card);
      currentCampusId = card.dataset.id;
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectCampus(card);
        currentCampusId = card.dataset.id;
      }
    });
  });
  updateSelectedCampusDisplay();

  // 時刻セレクト
  populateTimeSelects();
  const startSelect = document.getElementById("startTime");
  const endSelect = document.getElementById("endTimeUser");
  const reserveDateInput = document.getElementById("reserveDate");

  // 追加：初期は車選択非表示
  const carSelectionContainer = document.getElementById("carSelection");
  if (carSelectionContainer) carSelectionContainer.style.display = "none";

  startSelect.addEventListener("change", () => limitEndTimes());
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
    localStorage.removeItem("reservations");
    renderSideReservations();
    selectedCampusId = null;
    currentCampusId = null;
    updateReserveCampusInfo();
    resetReserveMessages();
    document
      .querySelectorAll(".campus-card.selected")
      .forEach(el => el.classList.remove("selected"));
    updateSelectedCampusDisplay();
    document.getElementById("reserveDate").value = "";
    renderReservationList("", "");
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
      hideCarSelection();
      return;
    }

    if (!date || !start || !endUser) {
      result.textContent = "日付・開始・終了を入力してください。";
      result.className = "message error";
      hideCarSelection();
      return;
    }

    const startMin = timeToMinutes(start);
    const endUserMin = timeToMinutes(endUser);
    const endWithGapMin = endUserMin + RESERVATION_BUFFER_MINUTES;

    const ok = isTimeAvailable(date, currentCampusId, startMin, endWithGapMin);
    if (ok) {
      result.textContent = "予約できます。車種を選択してください。";
      result.className = "message ok";
      renderCarSelection();
    } else {
      result.textContent = "すでに予約があります。別の時間にしてください。";
      result.className = "message error";
      hideCarSelection();
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

    // 車選択必須
    if (!selectedCarId) {
      msg.textContent = "車種を選択してください。";
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

    const car = CARS.find(c => c.id === selectedCarId);

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
      carId: car ? car.id : null,
      carName: car ? car.name : null,
      // carType は常に「〜車」表記を保存
      carType: car ? getCarTypeLabel(car.type) : null,
    });
    saveReservations(reservations);

    msg.textContent = "予約しました。";
    msg.className = "message ok";
    renderReservationList(date, currentCampusId);
    renderSideReservations();

    // 車選択フェーズは完了後非表示に
    hideCarSelection();

    // 予約完了モーダルを表示（処理中オーバーレイを1.5秒表示）
    const modal = document.getElementById("reservationModal");
    const modalDesc = document.getElementById("reservationModalDesc");
    const okBtn = document.getElementById("okReservationModal");
    const closeBtn = document.getElementById("closeReservationModal");

    // 処理中オーバーレイを作って1.5秒表示してからモーダルを開く
    const processing = document.createElement("div");
    processing.id = "processingOverlay";
    processing.setAttribute("role", "status");
    processing.style.position = "fixed";
    processing.style.inset = "0";
    processing.style.display = "flex";
    processing.style.alignItems = "center";
    processing.style.justifyContent = "center";
    processing.style.background = "rgba(255,255,255,0.9)";
    processing.style.zIndex = "9999";
    processing.innerHTML = `
      <div style="text-align:center;">
        <div style="font-size:18px;margin-bottom:8px;">読み込み中…</div>
        <div aria-hidden="true" style="width:36px;height:36px;border:4px solid #ddd;border-top-color:#333;border-radius:50%;animation:spin 1s linear infinite"></div>
      </div>
    `;
    document.body.appendChild(processing);

    // キーフレームがなければ追加
    if (!document.getElementById("processingOverlayStyle")) {
      const s = document.createElement("style");
      s.id = "processingOverlayStyle";
      s.textContent = "@keyframes spin{to{transform:rotate(360deg)}}";
      document.head.appendChild(s);
    }

    setTimeout(() => {
      if (processing.parentNode) processing.parentNode.removeChild(processing);
      if (modal && modalDesc) {
        const campus = getCampusById(currentCampusId);
        const campusName = campus ? campus.name : "";
        if (typeof formatDateForDisplay === "function") {
          // モーダルの車表記も「〜車」に統一
          modalDesc.textContent = `${formatDateForDisplay(date)} ${start} - ${endUser} に${campusName}で${car ? getCarTypeLabel(car.type) : ""}の予約が完了しました。`;
        } else {
          modalDesc.textContent = `予約が完了しました。 ${date} ${start}-${endUser} ${campusName}`;
        }
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        if (okBtn) okBtn.focus(); else if (closeBtn) closeBtn.focus();
      }
    }, 1500);
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

// 予約完了モーダルのイベント設定
(function initReservationModal() {
  const modal = document.getElementById("reservationModal");
  if (!modal) return;
  const okBtn = document.getElementById("okReservationModal");
  const closeBtn = document.getElementById("closeReservationModal");

  const close = () => {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  };

  if (okBtn) okBtn.addEventListener("click", close);
  if (closeBtn) closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) {
      close();
    }
  });
})();
