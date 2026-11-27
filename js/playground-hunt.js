// playground-hunt.js: the playground's "find the design mistakes" mode. Tap what looks wrong on the
// drawing, press check, and see what you found, what you missed and which marks were correct practice.
// Cases and scoring: js/hunt.js (tests/hunt-cases.mjs).
import { CASES, spotAt, scoreHunt } from './hunt.js';
import { esc } from './text.js';

const KEY = 'mh-pg-hunt-v1';
let st = null;
function load() {
  st = { cur: CASES[0].id, best: {} };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') { if (CASES.some((c) => c.id === s.cur)) st.cur = s.cur; if (s.best && typeof s.best === 'object') for (const c of CASES) if (Number.isFinite(s.best[c.id])) st.best[c.id] = s.best[c.id]; } } catch (e) { /* ignore */ }
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };

export function renderHunt(root, ctx = {}) {
  load();
  let marked = [], result = null, t0 = Date.now(), secs = 0;
  const C = () => CASES.find((c) => c.id === st.cur);
  root.innerHTML = `
    <div class="card pg-intro"><h2>🔍 ציד טעויות בתכן</h2><p class="small muted">בכל שרטוט יש כמה טעויות תכן אמיתיות, וגם כמה פרטים שנראים חשודים אבל הם נכונים. גע במה שנראה לך שגוי ולחץ "בדוק". סימון של פרט נכון מוריד נקודה, כמו בביקורת תכן אמיתית.</p></div>
    <div class="card" id="hnPick"></div>
    <div class="card pg-stage" id="hnStage"></div>
    <div id="hnRes"></div>`;
  const pick = root.querySelector('#hnPick'), stage = root.querySelector('#hnStage'), res = root.querySelector('#hnRes');
  const chipsHtml = () => `<div class="chips">${CASES.map((c) => `<button class="chip" data-act="case" data-v="${c.id}" aria-pressed="${c.id === st.cur}">${esc(c.title)}${st.best[c.id] != null ? ` · ${st.best[c.id]}/10` : ''}</button>`).join('')}</div>`;
  const overlay = (c) => {
    let s = '';
    if (!result) {
      marked.forEach((id, i) => { const p = c.spots.find((q) => q.id === id); s += `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="#f59e0b" fill-opacity="0.18" stroke="#f59e0b" stroke-width="2.5"/><circle cx="${p.x + p.r * 0.7}" cy="${p.y - p.r * 0.7}" r="8" fill="#f59e0b"/><text x="${p.x + p.r * 0.7}" y="${p.y - p.r * 0.7 + 3.5}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">${i + 1}</text>`; });
      return s;
    }
    const ring = (p, col, dash, sym) => `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${col}" fill-opacity="0.14" stroke="${col}" stroke-width="2.5" ${dash ? 'stroke-dasharray="5 3"' : ''}/><circle cx="${p.x + p.r * 0.7}" cy="${p.y - p.r * 0.7}" r="8" fill="${col}"/><text x="${p.x + p.r * 0.7}" y="${p.y - p.r * 0.7 + 3.5}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">${sym}</text>`;
    result.found.forEach((p) => (s += ring(p, '#16a34a', false, '✓')));
    result.missed.forEach((p) => (s += ring(p, '#ef4444', true, '!')));
    result.falseAlarms.forEach((p) => (s += ring(p, '#6b7280', false, '✗')));
    return s;
  };
  const drawStage = () => {
    const c = C();
    stage.innerHTML = `<p class="small" style="margin:28px 0 8px">${esc(c.brief)}</p>
      <svg viewBox="0 0 360 ${c.H}" class="pg-svg" id="hnSvg" role="img" aria-label="${esc(c.title)}" style="cursor:crosshair">${c.svg()}<g id="hnMarks">${overlay(c)}</g></svg>
      <div class="chips" style="margin-top:8px">${result ? '<button class="chip" data-act="again">↺ נסה שוב</button><button class="chip" data-act="next">‹ המקרה הבא</button>' : `<button class="chip" data-act="check" ${marked.length ? '' : 'disabled'}>✔ בדוק (${marked.length} סומנו)</button><button class="chip" data-act="clear" ${marked.length ? '' : 'disabled'}>נקה</button>`}</div>`;
  };
  const item = (p, cls, head) => `<div class="review-item ${cls}"><div class="small"><b>${head} ${esc(p.title)}</b></div><div class="small">${esc(p.why)}</div>${p.fix ? `<div class="small muted">תיקון: ${esc(p.fix)}</div>` : ''}</div>`;
  const drawRes = () => {
    if (!result) { res.innerHTML = ''; return; }
    const c = C(), r = result;
    res.innerHTML = `<div class="card"><div class="pg-status ${r.grade >= 8 ? 'good' : r.grade >= 6 ? 'warn' : 'bad'}">ציון ${r.grade}/10: מצאת ${r.found.length} מתוך ${r.total} טעויות${r.falseAlarms.length ? `, ו-${r.falseAlarms.length} סימונים היו על פרט תקין` : ''}. זמן: ${secs} שניות.</div>
      ${r.found.length ? `<h3 class="pg-h">מצאת</h3>${r.found.map((p) => item(p, 'good', '✓')).join('')}` : ''}
      ${r.missed.length ? `<h3 class="pg-h">פספסת</h3>${r.missed.map((p) => item(p, 'bad', '!')).join('')}` : ''}
      ${r.falseAlarms.length ? `<h3 class="pg-h">סימנת, אבל זה תקין</h3>${r.falseAlarms.map((p) => item(p, '', '✗')).join('')}` : ''}
      <p class="small muted">השרטוטים הם המחשה ולא חלקים אמיתיים. הכללים לפי: ${esc(c.source)}.</p></div>`;
  };
  const all = () => { pick.innerHTML = chipsHtml(); drawStage(); drawRes(); };
  all();
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]');
    if (b) {
      const act = b.dataset.act;
      if (act === 'case' || act === 'next') { st.cur = act === 'case' ? b.dataset.v : CASES[(CASES.findIndex((c) => c.id === st.cur) + 1) % CASES.length].id; save(); marked = []; result = null; t0 = Date.now(); all(); if (act === 'next') stage.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      else if (act === 'clear') { marked = []; drawStage(); }
      else if (act === 'again') { marked = []; result = null; t0 = Date.now(); drawStage(); drawRes(); }
      else if (act === 'check') {
        result = scoreHunt(C(), marked); secs = Math.round((Date.now() - t0) / 1000);
        if (st.best[st.cur] == null || result.grade > st.best[st.cur]) st.best[st.cur] = result.grade;
        save(); pick.innerHTML = chipsHtml(); drawStage(); drawRes();
      }
      return;
    }
    const sv = ev.target.closest('#hnSvg'); if (!sv || result) return;
    const p = sv.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(sv.getScreenCTM().inverse());
    const s = spotAt(C(), q.x, q.y);
    if (!s) { if (ctx.toast) ctx.toast('גע בדיוק על הפרט שנראה לך שגוי'); return; }
    marked = marked.includes(s.id) ? marked.filter((m) => m !== s.id) : [...marked, s.id];
    drawStage();
  });
}
