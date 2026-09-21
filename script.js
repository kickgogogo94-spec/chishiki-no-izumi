const SAVE_KEY = "chishiki-no-izumi-saved-v1";

let ARTICLES = [];
let DAYS = [];        // [{date, items:[...]}] sorted desc
let currentArticleId = null;
let lastMainView = "latest";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

init();

function init() {
  const raw = window.RAW_DATA || [];

  ARTICLES = raw.map((a, i) => ({ id: String(i), ...a }));

  const byDate = {};
  for (const a of ARTICLES) {
    (byDate[a.date] ||= []).push(a);
  }
  DAYS = Object.keys(byDate)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((date) => ({ date, items: byDate[date] }));

  renderLatest();
  renderArchive();
  renderSaved();
  bindTabs();
  bindArticleNav();

  showView("latest");
}

function catClass(cat) {
  if (cat.indexOf("AI") === 0) return "cat-AI";
  if (cat === "マーケット情報") return "cat-マーケット情報";
  return "cat-ニュース";
}

function formatDate(d) {
  const dt = new Date(d + "T00:00:00+09:00");
  const w = ["日", "月", "火", "水", "木", "金", "土"][dt.getDay()];
  const [y, m, day] = d.split("-");
  return `${y}.${m}.${day} (${w})`;
}

function shortDate(d) {
  const dt = new Date(d + "T00:00:00+09:00");
  const w = ["日", "月", "火", "水", "木", "金", "土"][dt.getDay()];
  const [, m, day] = d.split("-");
  return `${parseInt(m)}月${parseInt(day)}日(${w})`;
}

/* ---------------- 最新号 ---------------- */
function renderLatest() {
  if (!DAYS.length) return;
  const today = DAYS[0];
  $("#latest-date").textContent = formatDate(today.date);
  $("#latest-count").textContent = today.items.length;

  const hero = today.items[0];
  const heroEl = $("#latest-hero");
  heroEl.innerHTML = `
    <span class="hero-tag">${escapeHtml(hero.source)}</span>
    <h2 class="hero-title">${escapeHtml(hero.title)}</h2>
    <p class="hero-summary">${escapeHtml(firstLine(hero.summary) || "今日の一本です。詳しくは記事をご覧ください。")}</p>
  `;
  heroEl.onclick = () => openArticle(hero.id);

  const list = $("#latest-list");
  list.innerHTML = "";
  today.items.forEach((a, idx) => {
    const li = document.createElement("li");
    li.className = "story-item";
    li.innerHTML = `
      <span class="story-num">${String(idx + 1).padStart(2, "0")}</span>
      <div>
        <div class="story-headline">${escapeHtml(a.title)}</div>
        <div class="story-tags">
          <span class="tag ${catClass(a.category)}">${escapeHtml(a.category)}</span>
          <span class="tag src">${escapeHtml(a.source)}</span>
        </div>
      </div>
    `;
    li.onclick = () => openArticle(a.id);
    list.appendChild(li);
  });
}

/* ---------------- バックナンバー ---------------- */
function renderArchive() {
  const wrap = $("#archive-list");
  wrap.innerHTML = "";
  DAYS.forEach((day) => {
    const card = document.createElement("div");
    card.className = "day-card";
    card.innerHTML = `
      <div class="day-card-header">
        <span class="day-date">${shortDate(day.date)}</span>
        <span class="day-count">${day.items.length} STORIES</span>
      </div>
      ${day.items
        .map(
          (a) =>
            `<div class="day-headline" data-id="${a.id}">${escapeHtml(a.title)}</div>`
        )
        .join("")}
    `;
    wrap.appendChild(card);
  });
  wrap.querySelectorAll(".day-headline").forEach((el) => {
    el.onclick = () => openArticle(el.dataset.id);
  });
}

/* ---------------- 保存 ---------------- */
function getSaved() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) || "[]");
  } catch {
    return [];
  }
}
function setSaved(ids) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(ids));
}
function isSaved(id) {
  return getSaved().includes(id);
}
function toggleSaved(id) {
  const s = getSaved();
  const i = s.indexOf(id);
  if (i >= 0) s.splice(i, 1);
  else s.push(id);
  setSaved(s);
  renderSaved();
}

function renderSaved() {
  const ids = getSaved();
  const wrap = $("#saved-list");
  const empty = $("#saved-empty");
  wrap.innerHTML = "";
  const items = ARTICLES.filter((a) => ids.includes(a.id));
  if (!items.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  const card = document.createElement("div");
  card.className = "day-card";
  card.innerHTML = items
    .map(
      (a) =>
        `<div class="day-headline" data-id="${a.id}">${escapeHtml(a.title)}<br><span style="color:#8a8474;font-size:11px;">${escapeHtml(a.source)}・${shortDate(a.date)}</span></div>`
    )
    .join("");
  wrap.appendChild(card);
  wrap.querySelectorAll(".day-headline").forEach((el) => {
    el.onclick = () => openArticle(el.dataset.id);
  });
}

/* ---------------- 記事詳細 ---------------- */
function openArticle(id) {
  const a = ARTICLES.find((x) => x.id === id);
  if (!a) return;
  currentArticleId = id;

  $("#article-eyebrow").textContent = `${a.category} ／ ${a.source}`;
  $("#article-title").textContent = a.title;
  $("#article-meta").textContent = formatDate(a.date);
  $("#article-banner").textContent = "";

  const briefing = $("#article-briefing");
  const lines = (a.summary || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length) {
    briefing.innerHTML = lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("");
  } else {
    briefing.innerHTML = `<p class="empty">要点はまだ登録されていません。元記事のリンクからご確認ください。</p>`;
  }

  $("#article-source-link").href = a.url;

  const nextIndex = (parseInt(id, 10) + 1) % ARTICLES.length;
  const next = ARTICLES[nextIndex];
  if (next) {
    $("#next-fab-label").textContent = next.title;
    $("#btn-next").onclick = () => openArticle(next.id);
  }

  const saveBtn = $("#btn-save");
  saveBtn.classList.toggle("saved", isSaved(id));

  showView("article");
  window.scrollTo(0, 0);
}

function bindArticleNav() {
  $("#btn-back").onclick = () => showView("latest-return");
  $("#btn-save").onclick = () => {
    if (currentArticleId) toggleSaved(currentArticleId);
    $("#btn-save").classList.toggle("saved", isSaved(currentArticleId));
  };
}

/* ---------------- タブ / 画面切替 ---------------- */
function bindTabs() {
  $$(".tab").forEach((btn) => {
    btn.onclick = () => showView(btn.dataset.view);
  });
}

function showView(name) {
  if (name === "latest-return") name = lastMainView;
  if (name === "latest" || name === "archive" || name === "saved") {
    lastMainView = name;
  }

  ["latest", "archive", "saved", "article"].forEach((v) => {
    $(`#view-${v}`).classList.toggle("hidden", v !== name);
  });

  $("#tabbar").classList.toggle("hidden", name === "article");

  $$(".tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === name);
  });
}

/* ---------------- utils ---------------- */
function firstLine(text) {
  if (!text) return "";
  return text.split("\n").map((s) => s.trim()).filter(Boolean)[0] || "";
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
