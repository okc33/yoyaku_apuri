// デモ用ユーザー（c000000 / 123456 で入れる）
const DUMMY_USERS = [
  { studentId: "c000000", password: "123456", name: "デモ利用者" },
];

// キャンパス一覧
const CAMPUSES = [
  { id: "takiko", name: "滝子" },
  { id: "sakurayama", name: "桜山" },
  { id: "kitachikusa", name: "北千種" },
  { id: "tanabedori", name: "田辺通" },
];

// 現在ログイン中ユーザー
let currentUser = null;
// 現在選択中キャンパス
let currentCampusId = null;

// ページ切り替え
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// localStorageから予約を取得
function loadReservations() {
  const raw = localStorage.getItem("reservations");
  return raw ? JSON.parse(raw) : [];
}

// localStorageに予約を保存
function saveReservations(list) {
  localStorage.setItem("reservations", JSON.stringify(list));
}

// 指定日の予約一覧を表示
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

// 時刻文字列("HH:MM")を分に
function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// 分を時刻文字列に
function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// 重複チェック
function isTimeAvailable(dateStr, campusId, start, endWithGap) {
  const reservations = loadReservations().filter(r => {
    return r.date === dateStr && r.campusId === campusId;
  });

  const newStart = timeToMinutes(start);
  const newEnd = timeToMinutes(endWithGap);

  for (const r of reservations) {
    const s = timeToMinutes(r.start);
    const e = timeToMinutes(r.end);
    // 重なったら不可
    if (newStart < e && s < newEnd) {
      return false;
    }
  }
  return true;
}

window.addEventListener("DOMContentLoaded", () => {
  // キャンパス選択に反映
  const campusSelect = document.getElementById("campusSelect");
  CAMPUSES.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    campusSelect.appendChild(opt);
  });

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
    // ここで学籍番号を表示
    document.getElementById("loginUser").textContent =
      `${found.name} / 学籍番号: ${found.studentId}`;
    showPage("page-campus");
  });

  // キャンパスから次へ
  document.getElementById("btnCampusNext").addEventListener("click", () => {
    currentCampusId = document.getElementById("campusSelect").value;
    showPage("page-reserve");
    // 日付を今日に
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

    // 30分追加
    const endUserMin = timeToMinutes(endUser);
    const endWithGap = minutesToTime(endUserMin + 30);

    const ok = isTimeAvailable(date, currentCampusId, start, endWithGap);
    if (ok) {
      result.textContent = `予約できます。（終了として扱う時間: ${endWithGap}）`;
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

    // 30分追加
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

  // 日付を切り替えたら一覧更新
  document.getElementById("reserveDate").addEventListener("change", (e) => {
    if (currentCampusId) {
      renderReservationList(e.target.value, currentCampusId);
    }
  });
});
