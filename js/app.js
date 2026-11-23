// app.js: router, views, quiz engine, progress. No framework, no build step.
import { allDomains } from '../data/catalog.js';
import { generators, makeQuestion, fmt } from './generators.js';
import { draw } from './diagrams.js';
import { esc, rich } from './text.js';

const APP_VERSION = '2.0.0';
const DOMAINS = allDomains();
const READY = DOMAINS.filter((d) => !d.soon);
const SUB = {}; // subtopicId -> { sub, domain }
READY.forEach((d) => d.subtopics.forEach((s) => (SUB[s.id] = { sub: s, domain: d })));

// ---------------- storage (wrapped: storage can be blocked) ----------------
const KEY = 'mh-state-v1';
const emptyState = () => ({ q: {}, sub: {}, history: [], reports: [], seen: {}, theme: 'auto' });
let state = emptyState();
try { state = { ...emptyState(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { /* defaults */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } };

// ---------------- helpers ----------------
const $ = (sel, el = document) => el.querySelector(sel);
const view = $('#view');
const tex = (s, display = true) => {
  try { return window.katex ? window.katex.renderToString(s, { displayMode: display, throwOnError: false }) : esc(s); } catch (e) { return esc(s); }
};
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const diagramHtml = (spec) => { const s = draw(spec); return s ? `<div class="diagram-wrap">${s}</div>` : ''; };
function mathify(el = view) {
  if (window.renderMathInElement) {
    window.renderMathInElement(el, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
  }
  fitMath(el);
}
// shrink display equations that are wider than the screen (down to 62%)
function fitMath(el = view) {
  el.querySelectorAll('.katex-display').forEach((d) => {
    const R = d.getBoundingClientRect();
    if (!R.width) return;
    const over = () => { const r = d.getBoundingClientRect(); return [...d.querySelectorAll('.base')].some((b) => { const q = b.getBoundingClientRect(); return q.right > r.right + 1 || q.left < r.left - 1; }); };
    let size = 1;
    while (over() && size > 0.62) { size -= 0.06; d.style.fontSize = `${size.toFixed(2)}em`; }
  });
}
window.__fitMath = fitMath; // used by tests/overflow-check.html
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}
const pct = (r, w) => (r + w ? Math.round((100 * r) / (r + w)) : null);
const subStats = (id) => state.sub[id] || { right: 0, wrong: 0 };

// ---------------- theme ----------------
function applyTheme() {
  const t = state.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}
$('#themeBtn').onclick = () => {
  state.theme = { auto: 'dark', dark: 'light', light: 'auto' }[state.theme] || 'auto';
  save(); applyTheme();
  toast({ auto: 'מצב תצוגה: לפי המכשיר', dark: 'מצב כהה', light: 'מצב בהיר' }[state.theme]);
};
applyTheme();
$('#searchBtn').onclick = () => (location.hash = '#/search');
$('#backBtn').onclick = () => history.back();

// ---------------- router ----------------
const routes = [
  [/^#?\/?$/, home, 'home'],
  [/^#\/learn$/, learnHome, 'learn'],
  [/^#\/learn\/([\w-]+)$/, domainView, 'learn'],
  [/^#\/learn\/([\w-]+)\/([\w-]+)$/, lessonView, 'learn'],
  [/^#\/quiz$/, quizBuilder, 'quiz'],
  [/^#\/quiz\/run$/, quizRun, 'quiz'],
  [/^#\/progress$/, progressView, 'progress'],
  [/^#\/search$/, searchView, 'learn'],
];
function router() {
  const h = location.hash || '#/';
  if (quiz && quiz.timer && h !== '#/quiz/run') { clearInterval(quiz.timer); quiz.timer = null; }
  for (const [re, fn, tab] of routes) {
    const m = h.match(re);
    if (m) {
      document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
      $('#backBtn').hidden = !(h.split('/').length > 2 || h === '#/search' || h === '#/quiz/run');
      fn(...m.slice(1));
      window.scrollTo(0, 0);
      view.focus({ preventScroll: true });
      return;
    }
  }
  location.hash = '#/';
}
window.addEventListener('hashchange', router);
const setTitle = (t) => { $('#title').textContent = t; document.title = t === 'מגרש הנדסה' ? t : `${t} · מגרש הנדסה`; };

// ---------------- views: home ----------------
function home() {
  setTitle('מגרש הנדסה');
  const totalQ = READY.reduce((n, d) => n + d.subtopics.reduce((m, s) => m + s.questions.length, 0), 0);
  const totalG = Object.keys(generators).length;
  const answered = Object.values(state.q).reduce((n, s) => n + s.right + s.wrong, 0);
  const right = Object.values(state.q).reduce((n, s) => n + s.right, 0);
  const mistakes = mistakePool().length;
  const next = nextSubtopic();
  view.innerHTML = `${quizBanner()}
    <div class="card hero">
      <h2>${greeting()} 👋</h2>
      <div class="muted">${READY.length === 1 ? 'תחום פעיל אחד' : `${READY.length} תחומים פעילים`} · ${totalQ} שאלות · ${totalG} סוגי תרגילי חישוב, עם מספרים חדשים בכל פעם</div>
    </div>
    <div class="stat-grid">
      <div class="stat"><b>${answered}</b><span>שאלות שענית</span></div>
      <div class="stat"><b>${answered ? pct(right, answered - right) + '%' : '—'}</b><span>הצלחה</span></div>
      <div class="stat"><b>${state.history.length}</b><span>בחנים</span></div>
    </div>
    <div class="section-title">מה עושים עכשיו?</div>
    ${next ? `<a class="list-item" href="#/learn/${next.domain.id}/${next.sub.id}"><span class="emoji">📖</span><div class="grow"><b>להמשיך ללמוד</b><div class="muted small">${esc(next.sub.title)}</div></div><span class="chev">‹</span></a>` : ''}
    <button class="list-item" style="width:100%" id="quick10"><span class="emoji">⚡</span><div class="grow" style="text-align:start"><b>בוחן מהיר: 10 שאלות</b><div class="muted small">מכל מה שיש, בערבוב</div></div><span class="chev">‹</span></button>
    <button class="list-item" style="width:100%" id="trivia"><span class="emoji">⏱️</span><div class="grow" style="text-align:start"><b>טריוויה: 20 שניות לשאלה</b><div class="muted small">שאלות הבנה מהירות</div></div><span class="chev">‹</span></button>
    <button class="list-item ${mistakes ? '' : 'disabled'}" style="width:100%" id="mistakes" ${mistakes ? '' : 'disabled'}><span class="emoji">🔁</span><div class="grow" style="text-align:start"><b>חזרה על טעויות</b><div class="muted small">${mistakes ? `${mistakes} שאלות מחכות לך` : 'אין עדיין טעויות לחזור עליהן'}</div></div><span class="chev">‹</span></button>
    <div class="section-title">תחומים</div>
    ${domainList()}
    <p class="muted small" style="text-align:center;margin-top:24px">גרסה ${APP_VERSION} · עובד גם בלי אינטרנט</p>`;
  $('#quick10').onclick = () => startQuiz({ subs: Object.keys(SUB), count: 10, mode: 'quiz', diff: 0 });
  $('#trivia').onclick = () => startQuiz({ subs: Object.keys(SUB), count: 10, mode: 'trivia', diff: 0 });
  if (mistakes) $('#mistakes').onclick = () => startQuiz({ subs: Object.keys(SUB), count: Math.min(10, mistakes), mode: 'mistakes', diff: 0 });
}
function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'לילה טוב' : h < 12 ? 'בוקר טוב' : h < 17 ? 'צהריים טובים' : h < 21 ? 'ערב טוב' : 'לילה טוב';
}
function quizBanner() {
  if (!quiz || quiz.i >= quiz.items.length) return '';
  return `<a class="resume-banner" href="#/quiz/run">↩ חזרה לבוחן · שאלה ${quiz.i + 1} מתוך ${quiz.items.length}</a>`;
}
function nextSubtopic() {
  for (const d of READY) for (const s of d.subtopics) if (!state.seen[s.id]) return { domain: d, sub: s };
  return null;
}
function domainList() {
  return DOMAINS.map((d) => {
    if (d.soon) return `<div class="list-item disabled"><span class="emoji">${d.icon}</span><div class="grow"><b>${esc(d.title)}</b><div class="muted small">${esc(d.summary)}</div></div><span class="badge">בקרוב</span></div>`;
    const seen = d.subtopics.filter((s) => state.seen[s.id]).length;
    return `<a class="list-item" href="#/learn/${d.id}"><span class="emoji">${d.icon}</span><div class="grow"><b>${esc(d.title)}</b><div class="muted small">${esc(d.summary)}</div>
      <div class="bar" style="margin-top:6px"><i style="width:${(100 * seen) / d.subtopics.length}%"></i></div></div><span class="badge accent">${seen}/${d.subtopics.length}</span></a>`;
  }).join('');
}

// ---------------- views: learn ----------------
function learnHome() {
  setTitle('לימוד');
  view.innerHTML = `${quizBanner()}<p class="muted">בחר תחום. כל תת-נושא כולל אינטואיציה, משוואות, שרטוט, דוגמה פתורה, השלכות מעשיות ומקורות.</p>${domainList()}`;
}
function domainView(id) {
  const d = READY.find((x) => x.id === id);
  if (!d) return (location.hash = '#/learn');
  setTitle(d.title);
  view.innerHTML = `${quizBanner()}
    <div class="card"><div class="row"><span style="font-size:2rem">${d.icon}</span><div class="grow"><h2>${esc(d.title)}</h2><div class="en">${esc(d.en)}</div></div></div>
      <div class="btn-row"><button class="btn primary" id="quizAll">בוחן על כל התחום</button></div></div>
    ${d.subtopics.map((s, i) => {
      const st = subStats(s.id); const p = pct(st.right, st.wrong);
      return `<a class="list-item" href="#/learn/${d.id}/${s.id}"><span class="emoji" style="font-size:1rem;font-weight:700;color:var(--muted)">${i + 1}</span>
        <div class="grow"><b>${esc(s.title)}</b><div class="en">${esc(s.en)}</div></div>
        ${p === null ? (state.seen[s.id] ? '<span class="badge ok">נלמד</span>' : '') : `<span class="badge ${p >= 60 ? 'ok' : ''}">${p}%</span>`}<span class="chev">‹</span></a>`;
    }).join('')}`;
  $('#quizAll').onclick = () => startQuiz({ subs: d.subtopics.map((s) => s.id), count: 10, mode: 'quiz', diff: 0 });
}
function lessonView(did, sid) {
  const entry = SUB[sid];
  if (!entry || entry.domain.id !== did) return (location.hash = `#/learn/${did}`);
  const { sub: s, domain: d } = entry;
  const L = s.lesson;
  state.seen[s.id] = state.seen[s.id] || new Date().toISOString().slice(0, 10); save();
  setTitle(s.title);
  const nQ = s.questions.length + (s.generators || []).length;
  view.innerHTML = `${quizBanner()}
    <div class="card"><h2>${esc(s.title)}</h2><div class="muted small"><span class="en">${esc(s.en)}</span> · ${rich(d.title)}</div></div>
    <div class="card lesson-text"><h3>💡 האינטואיציה</h3><p>${rich(L.intuition)}</p>${diagramHtml(L.diagram)}</div>
    ${(L.visuals || []).length ? `<div class="card"><h3>👁️ המחשה</h3>${L.visuals.map((v) => `<figure class="visual">${diagramHtml(v.spec)}<figcaption>${rich(v.caption)}</figcaption></figure>`).join('')}</div>` : ''}
    <div class="card"><h3>∑ המשוואות</h3><div class="eq-list">${L.equations.map((e) => `<div class="eq">${tex(e.tex)}<div class="label">${rich(e.label)}</div></div>`).join('')}</div></div>
    ${L.example ? `<div class="card"><h3>✍️ דוגמה פתורה</h3><p class="lesson-text">${rich(L.example.q)}</p>${diagramHtml(L.example.diagram)}
      <div class="steps" id="steps"></div>
      <div class="btn-row"><button class="btn" id="nextStep">הצעד הבא</button><button class="btn" id="allSteps">הצג הכל</button></div></div>` : ''}
    <div class="card lesson-text"><h3>🔧 השלכות מעשיות</h3><ul>${L.implications.map((x) => `<li>${rich(x)}</li>`).join('')}</ul></div>
    <div class="card"><h3>📚 מקורות</h3><ul class="sources">${L.sources.map((x) => `<li>${rich(x)}</li>`).join('')}</ul></div>
    <button class="btn primary block" id="practice">לתרגל את הנושא (${nQ} סוגי שאלות)</button>
    <div class="btn-row">${neighborLinks(d, s)}</div>`;
  if (L.example) {
    let shown = 0;
    const stepsEl = $('#steps');
    const show = (n) => {
      while (shown < Math.min(n, L.example.steps.length)) { stepsEl.insertAdjacentHTML('beforeend', `<div class="step">${tex(L.example.steps[shown])}</div>`); shown++; }
      fitMath(stepsEl);
      if (shown >= L.example.steps.length) { $('#nextStep').disabled = true; $('#allSteps').disabled = true; }
    };
    $('#nextStep').onclick = () => show(shown + 1);
    $('#allSteps').onclick = () => show(99);
  }
  $('#practice').onclick = () => startQuiz({ subs: [s.id], count: Math.min(10, nQ + 4), mode: 'quiz', diff: 0 });
  mathify();
}
function neighborLinks(d, s) {
  const i = d.subtopics.indexOf(s);
  const prev = d.subtopics[i - 1], next = d.subtopics[i + 1];
  return `${prev ? `<a class="btn" href="#/learn/${d.id}/${prev.id}">→ ${esc(prev.title)}</a>` : ''}${next ? `<a class="btn" href="#/learn/${d.id}/${next.id}">${esc(next.title)} ←</a>` : ''}`;
}

// ---------------- search ----------------
function searchView() {
  setTitle('חיפוש');
  view.innerHTML = `${quizBanner()}<input class="search-input" id="q" type="search" placeholder="חפש נושא, מושג או נוסחה (למשל: קריסה, Goodman)" autocomplete="off"><div id="res" style="margin-top:12px"></div>`;
  const input = $('#q');
  const run = () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { $('#res').innerHTML = '<p class="muted small">הקלד לפחות 2 תווים.</p>'; return; }
    const hits = [];
    Object.values(SUB).forEach(({ sub: s, domain: d }) => {
      const blob = [s.title, s.en, s.lesson.intuition, ...s.lesson.implications, ...s.lesson.equations.map((e) => e.label + ' ' + e.tex), ...s.questions.map((x) => x.q)].join(' ').toLowerCase();
      if (blob.includes(q)) hits.push(`<a class="list-item" href="#/learn/${d.id}/${s.id}"><span class="emoji">${d.icon}</span><div class="grow"><b>${esc(s.title)}</b><div class="en">${esc(s.en)}</div></div><span class="chev">‹</span></a>`);
    });
    $('#res').innerHTML = hits.length ? hits.join('') : '<p class="muted">לא נמצא במאגר. אפשר לבקש מהמנהל להוסיף את הנושא.</p>';
  };
  input.oninput = run; run(); input.focus();
}

// ---------------- quiz builder ----------------
let builder = { subs: new Set(), count: 10, mode: 'quiz', diff: 0 };
function quizBuilder() {
  setTitle('תרגול');
  const modes = [['quiz', 'בוחן'], ['trivia', 'טריוויה ⏱️'], ['mistakes', 'חזרה על טעויות']];
  view.innerHTML = `${quizBanner()}
    <div class="card"><h3>סוג תרגול</h3><div class="chips" id="modes">${modes.map(([v, l]) => `<button class="chip" data-v="${v}" aria-pressed="${builder.mode === v}">${l}</button>`).join('')}</div>
      <p class="muted small" id="modeHelp" style="margin:8px 0 0"></p></div>
    <div class="card"><div class="row"><h3 class="grow">נושאים</h3><button class="link-btn" id="selAll">בחר הכל</button></div>
      ${READY.map((d) => `<details class="domain-pick" open><summary>${d.icon} ${esc(d.title)}</summary>
        ${d.subtopics.map((s) => `<label class="check-row"><input type="checkbox" value="${s.id}" ${builder.subs.has(s.id) ? 'checked' : ''}><span class="grow">${esc(s.title)}</span>${pctBadge(s.id)}</label>`).join('')}</details>`).join('')}
      ${DOMAINS.filter((d) => d.soon).length ? `<p class="muted small">עוד ${DOMAINS.filter((d) => d.soon).length} תחומים יתווספו בהמשך.</p>` : ''}</div>
    <div class="card"><h3>מספר שאלות</h3><div class="chips" id="counts">${[5, 10, 20, 30].map((n) => `<button class="chip" data-v="${n}" aria-pressed="${builder.count === n}">${n}</button>`).join('')}</div>
      <h3 style="margin-top:14px">רמת קושי</h3><div class="chips" id="diffs">${[[0, 'הכל'], [1, 'בסיס'], [2, 'בינוני'], [3, 'מתקדם']].map(([v, l]) => `<button class="chip" data-v="${v}" aria-pressed="${builder.diff === v}">${l}</button>`).join('')}</div></div>
    <button class="btn primary block" id="go">התחל</button>`;
  const help = { quiz: 'כל סוגי השאלות, כולל תרגילי חישוב. ציון והסבר בסוף.', trivia: 'שאלות אמריקאיות ונכון/לא נכון, 20 שניות לכל שאלה.', mistakes: 'רק שאלות שטעית בהן יותר משצדקת.' };
  const refresh = () => { $('#modeHelp').textContent = help[builder.mode]; $('#go').disabled = builder.subs.size === 0; $('#go').textContent = builder.subs.size ? `התחל (${builder.subs.size === 1 ? 'תת-נושא אחד' : `${builder.subs.size} תתי-נושאים`})` : 'בחר לפחות נושא אחד'; };
  const chipGroup = (id, key, num) => $(id).querySelectorAll('.chip').forEach((c) => (c.onclick = () => {
    builder[key] = num ? Number(c.dataset.v) : c.dataset.v;
    $(id).querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', x === c)); refresh();
  }));
  chipGroup('#modes', 'mode'); chipGroup('#counts', 'count', true); chipGroup('#diffs', 'diff', true);
  view.querySelectorAll('input[type=checkbox]').forEach((cb) => (cb.onchange = () => { cb.checked ? builder.subs.add(cb.value) : builder.subs.delete(cb.value); refresh(); }));
  $('#selAll').onclick = () => { const all = builder.subs.size !== Object.keys(SUB).length; view.querySelectorAll('input[type=checkbox]').forEach((cb) => { cb.checked = all; all ? builder.subs.add(cb.value) : builder.subs.delete(cb.value); }); refresh(); };
  $('#go').onclick = () => startQuiz({ subs: [...builder.subs], count: builder.count, mode: builder.mode, diff: builder.diff });
  refresh();
}
function pctBadge(id) { const st = subStats(id); const p = pct(st.right, st.wrong); return p === null ? '' : `<span class="badge ${p >= 60 ? 'ok' : ''}">${p}%</span>`; }

// ---------------- quiz engine ----------------
let quiz = null;
function mistakePool() {
  return Object.entries(state.q).filter(([, s]) => s.wrong > s.right).map(([id]) => id);
}
function buildPool({ subs, mode, diff }) {
  const set = new Set(subs);
  const items = [];
  for (const id of set) {
    const { sub } = SUB[id] || {};
    if (!sub) continue;
    sub.questions.forEach((q) => items.push({ kind: 'static', id: q.id, sub: id, difficulty: q.difficulty, type: q.type }));
    (sub.generators || []).forEach((g) => {
      // generators can appear twice: each instance has new numbers
      items.push({ kind: 'gen', id: g, sub: id, difficulty: generators[g].difficulty, type: 'numeric' });
      items.push({ kind: 'gen', id: g, sub: id, difficulty: generators[g].difficulty, type: 'numeric' });
    });
  }
  let pool = items;
  if (diff) pool = pool.filter((x) => x.difficulty === diff);
  if (mode === 'trivia') pool = pool.filter((x) => x.type === 'mcq' || x.type === 'tf');
  if (mode === 'mistakes') { const m = new Set(mistakePool()); pool = pool.filter((x) => m.has(x.id)); pool = pool.filter((x, i) => pool.findIndex((y) => y.id === x.id) === i); }
  return pool;
}
function materialize(item) {
  if (item.kind === 'gen') return { ...makeQuestion(item.id), sub: item.sub };
  const q = SUB[item.sub].sub.questions.find((x) => x.id === item.id);
  const out = { ...q, sub: item.sub };
  if (q.type === 'mcq') { // shuffle options but remember the right one
    const order = shuffle(q.options.map((_, i) => i));
    out.options = order.map((i) => q.options[i]);
    out.answer = order.indexOf(q.answer);
  }
  return out;
}
function startQuiz(opts) {
  let pool = shuffle(buildPool(opts));
  // spread: avoid two copies of the same generator back-to-back when possible
  pool = pool.slice(0, opts.count);
  if (!pool.length) { toast(opts.mode === 'mistakes' ? 'אין שאלות לחזרה בנושאים האלה' : 'אין שאלות שמתאימות לבחירה'); return; }
  if (quiz && quiz.timer) clearInterval(quiz.timer);
  quiz = { opts, items: pool.map(materialize), i: 0, results: [], timer: null };
  if (location.hash === '#/quiz/run') router(); else location.hash = '#/quiz/run';
}
function quizRun() {
  if (!quiz) return (location.hash = '#/quiz');
  if (quiz.timer) { clearInterval(quiz.timer); quiz.timer = null; }
  if (quiz.i >= quiz.items.length) return quizSummary();
  const q = quiz.items[quiz.i];
  const n = quiz.items.length;
  setTitle(quiz.opts.mode === 'trivia' ? 'טריוויה' : quiz.opts.mode === 'mistakes' ? 'חזרה על טעויות' : 'בוחן');
  const subTitle = SUB[q.sub].sub.title;
  let body = '';
  if (q.type === 'mcq') body = `<div class="options">${q.options.map((o, i) => `<button class="option" data-i="${i}">${rich(o)}</button>`).join('')}</div>`;
  if (q.type === 'tf') body = `<div class="options"><button class="option" data-v="true">✔ נכון</button><button class="option" data-v="false">✘ לא נכון</button></div>`;
  if (q.type === 'numeric') body = `<form class="num-input" id="numForm"><input id="num" inputmode="decimal" autocomplete="off" placeholder="התשובה שלך" enterkeyhint="done">${q.unit ? `<span class="unit">${esc(q.unit)}</span>` : ''}</form>
    <div class="btn-row"><button class="btn" id="hintBtn" ${q.hint ? '' : 'hidden'}>רמז</button><button class="btn primary" id="check">בדוק</button></div><div id="hintBox"></div>`;
  if (q.type === 'open') body = `<div class="btn-row"><button class="btn primary" id="reveal">הצג תשובה לדוגמה</button></div>`;
  view.innerHTML = `
    <div class="qhead"><span class="small muted">${quiz.i + 1}/${n}</span><div class="bar"><i style="width:${(100 * quiz.i) / n}%"></i></div>
      ${quiz.opts.mode === 'trivia' ? '<span class="timer" id="timer">20</span>' : ''}<button class="icon-btn" id="quit" aria-label="יציאה">✕</button></div>
    <div class="card">
      <div class="row small muted" style="margin-bottom:6px"><span class="grow">${esc(subTitle)}</span><span>${'●'.repeat(q.difficulty || 1)}${'○'.repeat(3 - (q.difficulty || 1))}</span></div>
      <div class="qtext">${rich(q.q)}</div>
      ${diagramHtml(q.diagram)}
      ${body}
      <div id="fb"></div>
    </div>
    <div id="after"></div>`;
  $('#quit').onclick = () => { if (confirm('לצאת מהבוחן? התשובות עד עכשיו יישמרו.')) { if (quiz.results.length) finalize(); quiz = null; location.hash = '#/quiz'; } };
  if (q.type === 'mcq') view.querySelectorAll('.option').forEach((b) => (b.onclick = () => answer(Number(b.dataset.i) === q.answer, { pick: Number(b.dataset.i) })));
  if (q.type === 'tf') view.querySelectorAll('.option').forEach((b) => (b.onclick = () => answer((b.dataset.v === 'true') === q.answer, { pickTf: b.dataset.v === 'true' })));
  if (q.type === 'numeric') {
    const submit = (e) => {
      e && e.preventDefault();
      const raw = $('#num').value.trim().replace(',', '.').replace(/[^\d.eE+-]/g, '');
      const v = parseFloat(raw);
      if (!isFinite(v)) { toast('הקלד מספר'); return; }
      const ok = q.answer === 0 ? Math.abs(v) < 1e-9 : Math.abs(v - q.answer) / Math.abs(q.answer) <= (q.tol || 0.02);
      answer(ok, { value: v });
    };
    $('#numForm').onsubmit = submit; $('#check').onclick = submit;
    if (q.hint) $('#hintBtn').onclick = () => { $('#hintBox').innerHTML = `<div class="hint">💡 ${rich(q.hint)}</div>`; $('#hintBtn').hidden = true; mathify($('#hintBox')); };
    if (!quiz.results[quiz.i]) setTimeout(() => $('#num') && !$('#num').disabled && $('#num').focus(), 50);
  }
  if (q.type === 'open') $('#reveal').onclick = () => {
    $('#reveal').parentElement.remove();
    $('#fb').innerHTML = `<div class="feedback info"><h3>תשובה לדוגמה</h3><div>${rich(q.model)}</div><div class="source-line">מקור: ${rich(q.source || '')}</div></div>
      <p class="small muted" style="margin:10px 0 0">איך הייתה התשובה שלך?</p><div class="btn-row"><button class="btn" id="selfBad">לא ידעתי</button><button class="btn primary" id="selfGood">ידעתי</button></div>`;
    $('#selfGood').onclick = () => answer(true, { self: true }); $('#selfBad').onclick = () => answer(false, { self: true });
    mathify($('#fb'));
  };
  const done = quiz.results[quiz.i];
  if (done) { showAnswered(q, done.ok, done.detail); mathify(); return; } // returning to an answered question
  if (quiz.opts.mode === 'trivia') {
    let left = 20;
    quiz.timer = setInterval(() => {
      left--; const el = $('#timer'); if (el) { el.textContent = left; el.classList.toggle('low', left <= 5); }
      if (left <= 0) { clearInterval(quiz.timer); quiz.timer = null; answer(false, { timeout: true }); }
    }, 1000);
  }
  mathify();
}
function answer(ok, detail) {
  if (quiz.timer) { clearInterval(quiz.timer); quiz.timer = null; }
  const q = quiz.items[quiz.i];
  if (quiz.results[quiz.i]) return; // already answered
  quiz.results[quiz.i] = { ok, q, detail };
  const s = state.q[q.id] || { right: 0, wrong: 0 };
  ok ? s.right++ : s.wrong++; s.last = Date.now(); state.q[q.id] = s;
  const ss = state.sub[q.sub] || { right: 0, wrong: 0 };
  ok ? ss.right++ : ss.wrong++; state.sub[q.sub] = ss;
  save();
  showAnswered(q, ok, detail);
  $('#nextQ').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
// draws the "answered" state; also used when coming back to an answered question
function showAnswered(q, ok, detail) {
  if (q.type === 'open' && !$('#fb .feedback')) {
    const rv = $('#reveal'); if (rv) rv.parentElement.remove();
    $('#fb').innerHTML = `<div class="feedback info"><h3>תשובה לדוגמה</h3><div>${rich(q.model)}</div><div class="source-line">מקור: ${rich(q.source || '')}</div></div>`;
  }
  view.querySelectorAll('#selfGood, #selfBad').forEach((b) => (b.disabled = true));
  // lock inputs and mark
  view.querySelectorAll('.option').forEach((b) => {
    b.disabled = true;
    if (q.type === 'mcq') { const i = Number(b.dataset.i); if (i === q.answer) b.classList.add('correct'); else if (i === detail.pick) b.classList.add('wrong'); }
    if (q.type === 'tf') { const v = b.dataset.v === 'true'; if (v === q.answer) b.classList.add('correct'); else if (v === detail.pickTf) b.classList.add('wrong'); }
  });
  if (q.type === 'numeric') {
    if (detail.value !== undefined) $('#num').value = detail.value;
    $('#num').disabled = true; $('#check').disabled = true; const hb = $('#hintBtn'); if (hb) hb.hidden = true;
  }
  let fb = '';
  if (q.type !== 'open') {
    const head = detail.timeout ? '⏱️ נגמר הזמן' : ok ? '✔ נכון!' : '✘ לא מדויק';
    let solution = '';
    if (q.type === 'numeric') {
      solution = `<div>התשובה: <b dir="ltr">${fmt(q.answer, (q.tol || 0.02) < 0.01 ? 7 : 4)} ${esc(q.unit || '')}</b>${detail.value !== undefined ? ` <span class="muted small">(ענית <span dir="ltr">${fmt(detail.value, 4)}</span>, טווח מותר ±${(q.tol || 0.02) < 0.01 ? fmt(q.tol * Math.abs(q.answer), 2) + ' ' + (q.unit || '') : Math.round((q.tol || 0.02) * 100) + '%'})</span>` : ''}</div>
        <div class="steps">${q.steps.map((st) => `<div class="step">${tex(st)}</div>`).join('')}</div>${q.hint && !ok ? `<div class="hint">💡 ${rich(q.hint)}</div>` : ''}`;
    } else solution = `<div>${rich(q.explain || '')}</div>`;
    fb = `<div class="feedback ${ok ? 'good' : 'bad'}"><h3>${head}</h3>${solution}<div class="source-line">מקור: ${rich(q.source || '')}</div></div>`;
  }
  $('#fb').insertAdjacentHTML('beforeend', fb);
  const { domain } = SUB[q.sub];
  $('#after').innerHTML = `<button class="btn primary block" id="nextQ">${quiz.i + 1 < quiz.items.length ? 'לשאלה הבאה' : 'לסיכום'}</button>
    <div class="btn-row"><a class="btn" href="#/learn/${domain.id}/${q.sub}">📖 לחומר</a><button class="btn" id="report">⚑ דווח על טעות</button></div>`;
  $('#nextQ').onclick = () => { quiz.i++; quizRun(); window.scrollTo(0, 0); };
  $('#report').onclick = () => reportSheet(q);
  mathify($('#fb'));
}
function finalize() {
  const right = quiz.results.filter((r) => r && r.ok).length;
  state.history.unshift({ date: new Date().toISOString(), mode: quiz.opts.mode, subs: quiz.opts.subs, right, total: quiz.results.filter(Boolean).length });
  state.history = state.history.slice(0, 100);
  save();
}
function quizSummary() {
  finalize();
  const res = quiz.results;
  const right = res.filter((r) => r.ok).length, n = res.length;
  const score = Math.round((100 * right) / n);
  const grade = Math.round(score / 10);
  setTitle('סיכום');
  const C = 2 * Math.PI * 54;
  const weak = {};
  res.forEach((r) => { if (!r.ok) weak[r.q.sub] = (weak[r.q.sub] || 0) + 1; });
  view.innerHTML = `
    <div class="card" style="text-align:center">
      <svg class="score-ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="none" stroke="var(--surface-2)" stroke-width="10"/>
        <circle cx="60" cy="60" r="54" fill="none" stroke="${score >= 60 ? 'var(--good)' : 'var(--bad)'}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(C * score) / 100} ${C}" transform="rotate(-90 60 60)"/>
        <text x="60" y="58" text-anchor="middle" font-size="26" font-weight="700" fill="var(--text)">${grade}/10</text>
        <text x="60" y="80" text-anchor="middle" font-size="12" fill="var(--muted)">${right} מתוך ${n}</text></svg>
      <h2>${score >= 90 ? 'מצוין! 🎯' : score >= 60 ? 'עבר. יש על מה לעבוד 💪' : 'מתחת ל-6: כדאי לחזור לחומר 📖'}</h2>
    </div>
    ${Object.keys(weak).length ? `<div class="card"><h3>לחזור על</h3>${Object.entries(weak).map(([id, c]) => `<a class="list-item" href="#/learn/${SUB[id].domain.id}/${id}"><div class="grow"><b>${esc(SUB[id].sub.title)}</b><div class="muted small">${c} טעויות</div></div><span class="chev">‹</span></a>`).join('')}</div>` : ''}
    <div class="card"><h3>כל השאלות</h3>${res.map((r) => `<div class="review-item ${r.ok ? 'good' : 'bad'}"><div class="small">${rich(r.q.q)}</div>
      <div class="small muted">${r.q.type === 'numeric' ? `תשובה: <span dir="ltr">${fmt(r.q.answer, (r.q.tol || 0.02) < 0.01 ? 7 : 4)} ${esc(r.q.unit || '')}</span>` : r.q.type === 'mcq' ? `תשובה: ${rich(r.q.options[r.q.answer])}` : r.q.type === 'tf' ? `תשובה: ${r.q.answer ? 'נכון' : 'לא נכון'}` : ''}</div></div>`).join('')}</div>
    <div class="btn-row"><button class="btn primary" id="again">עוד סיבוב</button><a class="btn" href="#/">לבית</a></div>`;
  const opts = quiz.opts;
  $('#again').onclick = () => startQuiz(opts);
  mathify();
  quiz = null;
}

// ---------------- error reports ----------------
function reportSheet(q) {
  const m = $('#modal');
  m.innerHTML = `<div class="sheet"><h3>דיווח על טעות</h3><p class="muted small">מה לא נכון בשאלה? הדיווח נשמר במכשיר. במסך ההתקדמות אפשר להעתיק את כל הדיווחים ולשלוח אותם למנהל לתיקון.</p>
    <textarea id="rep" placeholder="למשל: התשובה צריכה להיות..., או: היחידות לא נכונות"></textarea>
    <div class="btn-row"><button class="btn" id="cancel">ביטול</button><button class="btn primary" id="send">שמור דיווח</button></div></div>`;
  m.hidden = false;
  const close = () => { m.hidden = true; m.innerHTML = ''; };
  m.onclick = (e) => { if (e.target === m) close(); };
  $('#cancel').onclick = close;
  $('#send').onclick = () => {
    const note = $('#rep').value.trim();
    state.reports.push({ id: q.id, sub: q.sub, q: q.q, answer: q.type === 'numeric' ? `${fmt(q.answer, (q.tol || 0.02) < 0.01 ? 7 : 4)} ${q.unit || ''}` : q.type === 'mcq' ? q.options[q.answer] : String(q.answer), note, date: new Date().toISOString().slice(0, 10), v: APP_VERSION });
    save(); close(); toast('הדיווח נשמר. תודה!');
  };
  setTimeout(() => $('#rep').focus(), 50);
}

// ---------------- progress ----------------
function progressView() {
  setTitle('התקדמות');
  const rows = READY.map((d) => `<div class="card"><h3>${d.icon} ${esc(d.title)}</h3>${d.subtopics.map((s) => {
    const st = subStats(s.id); const p = pct(st.right, st.wrong);
    return `<div style="margin:10px 0"><div class="row small"><span class="grow">${esc(s.title)}</span><span class="muted">${p === null ? 'לא תורגל' : `${p}% · ${st.right + st.wrong} שאלות`}</span></div>
      <div class="bar ${p === null ? '' : p >= 60 ? 'good' : 'bad'}"><i style="width:${p || 0}%"></i></div></div>`;
  }).join('')}</div>`).join('');
  const hist = state.history.slice(0, 10).map((h) => `<div class="row small" style="padding:6px 0;border-bottom:1px solid var(--border)"><span class="grow">${h.date.slice(0, 10)} · ${{ quiz: 'בוחן', trivia: 'טריוויה', mistakes: 'חזרה' }[h.mode] || ''}</span><b>${Math.round((10 * h.right) / h.total)}/10</b><span class="muted">(${h.right}/${h.total})</span></div>`).join('');
  view.innerHTML = `${quizBanner()}
    ${rows}
    <div class="card"><h3>בחנים אחרונים</h3>${hist || '<p class="muted small">עוד לא עשית בוחן.</p>'}</div>
    <div class="card"><h3>דיווחי טעויות (${state.reports.length})</h3>
      <p class="muted small">מעתיקים את הדיווחים ומדביקים בשיחה עם המנהל במחשב. הוא יבדוק, יתקן ויעדכן את האפליקציה.</p>
      <div class="btn-row"><button class="btn" id="copyRep" ${state.reports.length ? '' : 'disabled'}>העתק דיווחים</button><button class="btn" id="clearRep" ${state.reports.length ? '' : 'disabled'}>נקה</button></div></div>
    <div class="card"><h3>גיבוי</h3><p class="muted small">ההתקדמות נשמרת רק במכשיר הזה.</p>
      <div class="btn-row"><button class="btn" id="exp">העתק גיבוי</button><button class="btn" id="imp">שחזר מגיבוי</button></div>
      <button class="link-btn" id="reset" style="color:var(--bad);margin-top:8px">איפוס כל ההתקדמות</button></div>`;
  const copy = async (text, msg) => { try { await navigator.clipboard.writeText(text); toast(msg); } catch (e) { prompt('העתק את הטקסט:', text); } };
  $('#copyRep').onclick = () => copy('דיווחי טעויות ממגרש הנדסה:\n' + state.reports.map((r, i) => `${i + 1}. [${r.id} · ${r.sub}] ${r.q}\n   תשובה באפליקציה: ${r.answer}\n   הערה: ${r.note || '(אין)'}`).join('\n'), 'הועתק. הדבק בשיחה עם המנהל.');
  $('#clearRep').onclick = () => { if (confirm('למחוק את כל הדיווחים?')) { state.reports = []; save(); progressView(); } };
  $('#exp').onclick = () => copy(JSON.stringify(state), 'הגיבוי הועתק');
  $('#imp').onclick = () => { const t = prompt('הדבק כאן את טקסט הגיבוי:'); if (!t) return; try { state = { ...emptyState(), ...JSON.parse(t) }; save(); toast('שוחזר'); progressView(); } catch (e) { toast('הטקסט לא תקין'); } };
  $('#reset').onclick = () => { if (confirm('לאפס את כל ההתקדמות? אי אפשר לבטל.')) { const th = state.theme; state = emptyState(); state.theme = th; save(); progressView(); } };
}

// ---------------- boot ----------------
function boot() { router(); }
if (window.katex) boot(); else window.addEventListener('load', boot, { once: true });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
