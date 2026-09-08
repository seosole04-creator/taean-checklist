/* =========================================================
   1) 친구들과 함께 보고 저장하려면 아래 두 줄만 채우세요.
      (설정방법.md 참고 — 구글 시트 + Apps Script 주소)
      비워두면 "내 브라우저에만 저장"으로 동작합니다.
   ========================================================= */
const API_URL = "https://script.google.com/macros/s/AKfycbyj6s_MHu8qo7c3OdL6VLGNMnGfpVm92SbsFWx2oiPgJAHSDdraLQFLL6J57vKK6laZhA/exec";
const TRIP_KEY = "taean-0912";   // 이 여행의 이름표 (친구들과 같은 값이어야 함)

/* =========================================================
   2) 여행 정보 / 체크리스트 내용 — 여기만 고쳐도 됩니다.
   ========================================================= */
const CATEGORIES = [
  { id: "essential", label: "필수 준비물",      icon: "🧳", badge: "가장 중요해요!",  theme: "pink" },
  { id: "wear",      label: "의류 & 세면도구",  icon: "👕", badge: "1박이니까!",     theme: "blue" },
  { id: "health",    label: "건강 & 안전",      icon: "✚",  badge: "미리미리!",       theme: "green" },
  { id: "plan",      label: "여행 준비 사항",   icon: "📍", badge: "잊지말고!",       theme: "orange" },
  { id: "extra",     label: "컨텐츠 준비물",    icon: "☆",  badge: "나만의 리스트!",  theme: "lilac" }
];

const DEFAULT_DATA = {
  members: [{ id: 1, name: "나" }, { id: 2, name: "지현" }],
  memo: "",
  nextId: 300,
  items: [
    { id: 1, c: "essential", t: "신분증 / 운전면허증", who: 0, done: true },
    { id: 2, c: "essential", t: "현금 / 신용카드", who: 0, done: true },
    { id: 3, c: "essential", t: "펜션 예약 확인서 (힐마레)", who: 2, done: false },
    { id: 4, c: "essential", t: "휴대폰 · 충전기", who: 0, done: false },
    { id: 5, c: "essential", t: "보조배터리", who: 1, done: false },
    { id: 6, c: "essential", t: "차량 통행료 카드", who: 1, done: false },

    { id: 10, c: "wear", t: "1박 여분 옷 · 속옷", who: 0, done: false },
    { id: 11, c: "wear", t: "잠옷", who: 0, done: false },
    { id: 12, c: "wear", t: "바람막이 (해변 바람)", who: 0, done: false },
    { id: 13, c: "wear", t: "편한 운동화 / 샌들", who: 0, done: true },
    { id: 14, c: "wear", t: "세면도구 · 수건", who: 2, done: false },
    { id: 15, c: "wear", t: "모자 · 선글라스", who: 0, done: false },

    { id: 20, c: "health", t: "상비약 (진통제, 소화제)", who: 2, done: false },
    { id: 21, c: "health", t: "멀미약", who: 2, done: false },
    { id: 22, c: "health", t: "자외선차단제", who: 1, done: false },
    { id: 23, c: "health", t: "밴드 · 물티슈", who: 0, done: false },
    { id: 24, c: "health", t: "벌레퇴치제", who: 1, done: false },

    { id: 40, c: "plan", t: "출발 시간 확정 (토 07:00)", who: 0, done: true },
    { id: 41, c: "plan", t: "펜션 체크인/아웃 시간 확인", who: 2, done: false },
    { id: 42, c: "plan", t: "저녁 바비큐 장비 신청", who: 2, done: false },
    { id: 43, c: "plan", t: "점심 맛집 예약 (게국지)", who: 1, done: false },
    { id: 44, c: "plan", t: "노을 시간 · 물때 확인", who: 0, done: false },
    { id: 45, c: "plan", t: "이틀 날씨 체크", who: 0, done: false },

    { id: 50, c: "extra", t: "고기 · 바비큐 재료", who: 2, done: false },
    { id: 51, c: "extra", t: "간식 · 생수 · 음료", who: 2, done: false },
    { id: 52, c: "extra", t: "쓰레기봉투", who: 0, done: false },
    { id: 53, c: "extra", t: "돗자리 / 무릎담요", who: 1, done: false },
    { id: 54, c: "extra", t: "보드게임 · 카드", who: 1, done: false }
  ],
  expenses: [
    { id: 1, t: "힐마레 펜션 1박", payer: 2, amt: 180000 },
    { id: 2, t: "왕복 기름값 · 통행료", payer: 1, amt: 82000 },
    { id: 3, t: "바비큐 재료 · 장비", payer: 2, amt: 64000 },
    { id: 4, t: "점심 (게국지 2인)", payer: 1, amt: 46000 },
    { id: 5, t: "카페 · 간식", payer: 1, amt: 24000 }
  ]
};

/* ========================= 여기부터는 동작 코드 ========================= */

const DOTS = ["#D94E7C", "#4A7FC4", "#3E8A5E", "#6B5AB4", "#C07D22"];
const LS_KEY = "trip-checklist:" + TRIP_KEY;
const won = n => "₩" + Math.round(n).toLocaleString("en-US");
const $ = id => document.getElementById(id);

let data = JSON.parse(JSON.stringify(DEFAULT_DATA));
let saveTimer = null;
let saving = false;
let localTouchedAt = 0;

/* ---------- 저장 / 불러오기 ---------- */
function status(msg, isError) {
  let el = document.querySelector(".sync");
  if (!el) {
    el = document.createElement("div");
    el.className = "sync";
    document.body.appendChild(el);
  }
  el.classList.toggle("err", !!isError);
  if (!msg) { el.hidden = true; return; }
  el.hidden = false;
  el.textContent = msg;
  if (!isError) setTimeout(() => { el.hidden = true; }, 1600);
}

async function loadData() {
  if (!API_URL) {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { try { data = Object.assign(data, JSON.parse(raw)); } catch (e) {} }
    return;
  }
  try {
    const res = await fetch(API_URL + "?trip=" + encodeURIComponent(TRIP_KEY));
    const json = await res.json();
    if (json && json.ok && json.data) data = json.data;
  } catch (e) {
    status("불러오기 실패 — 인터넷을 확인해 주세요", true);
  }
}

function scheduleSave() {
  localTouchedAt = Date.now();
  localStorage.setItem(LS_KEY, JSON.stringify(data));   // 항상 내 브라우저에도 백업
  if (!API_URL) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(pushSave, 700);
}

async function pushSave() {
  if (!API_URL || saving) return;
  saving = true;
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // 이게 있어야 브라우저가 막지 않습니다
      body: JSON.stringify({ trip: TRIP_KEY, data: data })
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "save failed");
    status("저장됨 ✓");
  } catch (e) {
    status("저장 실패 — 잠시 후 다시 시도합니다", true);
    setTimeout(pushSave, 4000);
  } finally {
    saving = false;
  }
}

/* 친구가 바꾼 내용 가져오기 (12초마다, 내가 방금 만진 직후엔 건너뜀) */
function startPolling() {
  if (!API_URL) return;
  setInterval(async () => {
    if (saving || Date.now() - localTouchedAt < 5000) return;
    try {
      const res = await fetch(API_URL + "?trip=" + encodeURIComponent(TRIP_KEY));
      const json = await res.json();
      if (json && json.ok && json.data && JSON.stringify(json.data) !== JSON.stringify(data)) {
        data = json.data;
        render();
      }
    } catch (e) {}
  }, 12000);
}

/* ---------- 도우미 ---------- */
const memberIndex = id => data.members.findIndex(m => m.id === id);
const memberName = id => (id === 0 ? "공용" : (data.members.find(m => m.id === id) || {}).name || "공용");
const dotColor = id => { const i = memberIndex(id); return i < 0 ? "#8C8085" : DOTS[i % DOTS.length]; };
const nextWho = cur => {
  const ids = [0].concat(data.members.map(m => m.id));
  return ids[(ids.indexOf(cur) + 1) % ids.length];
};
const initial = name => ((name || "?").trim()[0] || "?");

function commit() { scheduleSave(); render(); }

/* ---------- 화면 그리기 ---------- */
function renderMembers() {
  const row = $("memberRow");
  row.innerHTML = "";
  data.members.forEach((m, i) => {
    const mine = data.items.filter(t => t.who === m.id);
    const el = document.createElement("div");
    el.className = "member";
    el.innerHTML =
      '<span class="dot" style="background:' + DOTS[i % DOTS.length] + '">' + initial(m.name) + "</span>" +
      '<input value="" placeholder="이름" />' +
      '<span class="tally">' + mine.filter(t => t.done).length + "/" + mine.length + "</span>" +
      '<button class="x-btn" title="삭제">×</button>';
    const input = el.querySelector("input");
    input.value = m.name;
    input.addEventListener("input", e => {
      m.name = e.target.value;
      el.querySelector(".dot").textContent = initial(m.name);
      scheduleSave();
    });
    el.querySelector(".x-btn").addEventListener("click", () => {
      data.members = data.members.filter(x => x.id !== m.id);
      data.items.forEach(t => { if (t.who === m.id) t.who = 0; });
      data.expenses = data.expenses.filter(e => e.payer !== m.id);
      commit();
    });
    row.appendChild(el);
  });
}

function renderCards() {
  const wrap = $("cards");
  wrap.innerHTML = "";
  CATEGORIES.forEach(cat => {
    const items = data.items.filter(i => i.c === cat.id);
    const done = items.filter(i => i.done).length;
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.theme = cat.theme;
    card.innerHTML =
      '<div class="card-head">' +
        '<span class="card-icon">' + cat.icon + "</span>" +
        "<h3>" + cat.label + "</h3>" +
        '<span class="card-badge">' + cat.badge + "</span>" +
      "</div>" +
      '<div class="progress">' +
        '<div class="track"><div class="fill" style="width:' + (items.length ? (done / items.length) * 100 : 0) + '%"></div></div>' +
        '<span class="num">' + done + " / " + items.length + "</span>" +
      "</div>" +
      '<ul class="items"></ul>' +
      '<div class="card-add"><input placeholder="항목 추가" /><button>추가</button></div>';

    const ul = card.querySelector(".items");
    items.forEach(it => {
      const li = document.createElement("li");
      const who = memberName(it.who);
      li.innerHTML =
        '<button class="check' + (it.done ? " on" : "") + '">' + (it.done ? "✓" : "") + "</button>" +
        '<span class="item-text">' + it.t + "</span>" +
        '<button class="who">' + who + "</button>" +
        '<button class="x-btn">×</button>';
      if (it.who !== 0) {
        const c = dotColor(it.who);
        const chip = li.querySelector(".who");
        chip.style.background = c;
        chip.style.borderColor = c;
        chip.style.color = "#fff";
      }
      li.querySelector(".check").addEventListener("click", () => { it.done = !it.done; commit(); });
      li.querySelector(".who").addEventListener("click", () => { it.who = nextWho(it.who); commit(); });
      li.querySelector(".x-btn").addEventListener("click", () => {
        data.items = data.items.filter(x => x.id !== it.id);
        commit();
      });
      ul.appendChild(li);
    });

    const input = card.querySelector(".card-add input");
    const add = () => {
      const v = input.value.trim();
      if (!v) return;
      data.items.push({ id: data.nextId++, c: cat.id, t: v, who: 0, done: false });
      commit();
    };
    card.querySelector(".card-add button").addEventListener("click", add);
    input.addEventListener("keydown", e => { if (e.key === "Enter") add(); });

    wrap.appendChild(card);
  });
}

function renderBudget() {
  const spend = data.expenses.reduce((a, e) => a + e.amt, 0);
  const n = Math.max(data.members.length, 1);
  $("total").textContent = won(spend);
  $("perPerson").textContent = won(spend / n);

  const bl = $("balances");
  bl.innerHTML = "";
  data.members.forEach((m, i) => {
    const paid = data.expenses.filter(e => e.payer === m.id).reduce((a, e) => a + e.amt, 0);
    const diff = paid - spend / n;
    const cls = Math.abs(diff) < 1 ? "zero" : diff > 0 ? "plus" : "minus";
    const el = document.createElement("div");
    el.className = "balance";
    el.innerHTML =
      '<span class="dot dot-sm" style="background:' + DOTS[i % DOTS.length] + '">' + initial(m.name) + "</span>" +
      '<span class="name">' + (m.name || "이름 없음") + "</span>" +
      '<span class="paid">낸 돈 ' + won(paid) + "</span>" +
      '<span class="diff ' + cls + '">' + (diff >= 0 ? "+" : "−") + won(Math.abs(diff)) + "</span>";
    bl.appendChild(el);
  });

  const list = $("expenses");
  list.innerHTML = "";
  data.expenses.forEach(e => {
    const li = document.createElement("li");
    li.innerHTML =
      '<span class="label">' + e.t + "</span>" +
      '<button class="who">' + memberName(e.payer) + "</button>" +
      '<span class="amt">' + won(e.amt) + "</span>" +
      '<button class="x-btn">×</button>';
    if (e.payer !== 0) {
      const c = dotColor(e.payer);
      const chip = li.querySelector(".who");
      chip.style.background = c;
      chip.style.borderColor = c;
      chip.style.color = "#fff";
    }
    li.querySelector(".who").addEventListener("click", () => { e.payer = nextWho(e.payer); commit(); });
    li.querySelector(".x-btn").addEventListener("click", () => {
      data.expenses = data.expenses.filter(x => x.id !== e.id);
      commit();
    });
    list.appendChild(li);
  });
}

function render() {
  renderMembers();
  renderCards();
  renderBudget();
  const memo = $("memo");
  if (document.activeElement !== memo) memo.value = data.memo || "";
}

/* ---------- 고정 버튼들 ---------- */
function wireStatic() {
  $("addMember").addEventListener("click", () => {
    data.members.push({ id: data.nextId++, name: "" });
    commit();
  });

  const addExp = () => {
    const name = $("expName").value.trim();
    const amt = parseInt($("expAmt").value.replace(/[^0-9]/g, ""), 10);
    if (!name || !amt) return;
    data.expenses.push({ id: data.nextId++, t: name, payer: data.members[0] ? data.members[0].id : 0, amt: amt });
    $("expName").value = "";
    $("expAmt").value = "";
    commit();
  };
  $("addExp").addEventListener("click", addExp);
  $("expAmt").addEventListener("keydown", e => { if (e.key === "Enter") addExp(); });

  $("memo").addEventListener("input", e => { data.memo = e.target.value; scheduleSave(); });

  $("resetBtn").addEventListener("click", () => {
    if (!confirm("처음 상태로 되돌릴까요? 지금 체크한 내용은 사라집니다.")) return;
    data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    commit();
  });

  // 사진: 고른 이미지를 이 브라우저에 저장 (친구에게는 공유되지 않습니다)
  const photo = document.querySelector(".hero-photo");
  const img = $("heroImg");
  const saved = localStorage.getItem(LS_KEY + ":photo");
  if (saved) { img.src = saved; photo.classList.add("filled"); }
  $("heroInput").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    compressImage(file, 1280, 0.75).then(dataUrl => {
      img.src = dataUrl;
      photo.classList.add("filled");
      try {
        localStorage.setItem(LS_KEY + ":photo", dataUrl);
      } catch (err) {
        alert("사진 용량이 너무 커서 저장하지 못했어요. 다른 사진으로 다시 시도해 주세요.");
      }
    }).catch(() => {
      alert("사진을 불러오지 못했어요. 다른 사진으로 다시 시도해 주세요.");
    });
  });

  function compressImage(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const im = new Image();
        im.onload = () => {
          let w = im.width, h = im.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
            else { w = Math.round(w * maxDim / h); h = maxDim; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d").drawImage(im, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        im.onerror = reject;
        im.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

(async function start() {
  wireStatic();
  render();
  await loadData();
  render();
  startPolling();
})();
