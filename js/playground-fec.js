// playground-fec.js: the playground's Fe–C phase diagram. Drag the point (carbon, temperature): the phases,
// their compositions on the tie line and their fractions (lever rule); slow cooling animation; the
// microstructure after slow cooling with a sketch. Math: js/fec.js (tests/fec-cases.mjs).
import { phasesAt, phaseName, micro, tA3, tAcm, TM, TCM, SRC_FC } from './fec.js';
import { FE_C } from './formulas.js';
import { ltr, num, text, chips, COL } from './elec-ui.js';

const KEY = 'mh-pg-fec-v1';
const VIEWS = { steel: { name: 'פלדות (עד 2.2% C)', C: [0, 2.2], T: [400, 1200] }, all: { name: 'כל הדיאגרמה', C: [0, 6.7], T: [400, 1600] } };
const I = (t) => `⁦${t}⁩`;
const PRESETS = [[0.2, I('1020 (0.20%)')], [0.45, I('1045 (0.45%)')], [0.76, `אוטקטואידית ${I('(0.76%)')}`], [1.2, I('1.2% C')], [3.5, `ברזל יציקה ${I('(3.5%)')}`]];
const PCOL = { L: '#ef4444', g: '#f59e0b', a: '#3b82f6', c: '#6b7280' };
let st = null;
function load() {
  st = { C: 0.45, T: 760, view: 'steel' };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && Number.isFinite(s.C) && Number.isFinite(s.T)) { st.C = s.C; st.T = s.T; if (VIEWS[s.view]) st.view = s.view; } } catch (e) { /* ignore */ }
  clamp();
}
function clamp() { const v = VIEWS[st.view]; st.C = Math.min(v.C[1], Math.max(0, st.C)); st.T = Math.min(v.T[1], Math.max(v.T[0], st.T)); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };

let view = null;
function diagram() {
  const v = VIEWS[st.view], W = 360, H = 270, pl = 40, pr = 12, pt = 30, pb = 26;
  const X = (c) => pl + ((c - v.C[0]) / (v.C[1] - v.C[0])) * (W - pl - pr), Y = (t) => H - pb - ((t - v.T[0]) / (v.T[1] - v.T[0])) * (H - pt - pb);
  view = { v, W, H, pl, pr, pt, pb };
  const P = (pts, col, w = 2) => `<polyline clip-path="url(#fcClip)" points="${pts.map(([c, t]) => `${X(c).toFixed(1)},${Y(t).toFixed(1)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="${w}"/>`;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" id="pgFec" role="img" aria-label="דיאגרמת ברזל-פחמן"><defs><clipPath id="fcClip"><rect x="${pl}" y="${pt}" width="${W - pl - pr}" height="${H - pt - pb}"/></clipPath></defs>`;
  s += `<rect x="${pl}" y="${pt}" width="${W - pl - pr}" height="${H - pt - pb}" fill="var(--surface-2)" opacity="0.5"/>`;
  const E = FE_C.eutectoidC, AF = FE_C.ferriteMaxC, GM = FE_C.austeniteMaxC, EU = FE_C.eutecticC;
  const col = 'var(--text)';
  s += P([[0, 912], [E, 727]], col) + P([[E, 727], [GM, 1147]], col) + P([[0, 912], [AF, 727], [0, 0]], col, 1.4) + P([[AF, 727], [6.7, 727]], col, 1.4);
  s += P([[0, TM], [GM, 1147]], col) + P([[GM, 1147], [6.7, 1147]], col, 1.4) + P([[0, TM], [EU, 1147], [6.7, TCM]], col);
  s += `<line x1="${X(Math.min(6.7, v.C[1]))}" y1="${pt}" x2="${X(Math.min(6.7, v.C[1]))}" y2="${H - pb}" stroke="${col}" stroke-width="1.4"/>`;
  // region labels
  const lab = (c, t, s2) => (c <= v.C[1] && t >= v.T[0] && t <= v.T[1] ? text(X(c), Y(t), s2, 'var(--muted)', 'middle') : '');
  s += lab(0.9, 1000, 'γ') + lab(0.35, 800, 'α+γ') + lab(1.4, 870, 'γ+Fe₃C') + lab(1, 560, 'α + Fe₃C') + lab(3.5, 1000, 'γ+Fe₃C') + lab(2.5, 1300, 'L+γ') + lab(1.2, 1500, 'L') + lab(5.6, 1250, 'L+Fe₃C');
  // axes ticks
  for (const t of [400, 600, 727, 800, 912, 1000, 1147, 1200, 1400, 1538, 1600]) if (t >= v.T[0] && t <= v.T[1]) s += text(pl - 3, Y(t) + 3, String(t), [727, 912, 1147, 1538].includes(t) ? COL.s : 'var(--muted)', 'end');
  for (const c of st.view === 'steel' ? [0, 0.5, 0.76, 1, 1.5, 2, 2.14] : [0, 1, 2.14, 3, 4.3, 5, 6.7]) s += text(X(c), H - pb + 12, String(c), [0.76, 2.14, 4.3].includes(c) ? COL.s : 'var(--muted)');
  s += text(W - pr, H - 2, 'C [wt%]', '', 'end') + text(pl + 70, pt - 8, 'T [°C]', '', 'start');
  // tie line and the point
  const ph = phasesAt(st.C, st.T);
  if (ph.length === 2) s += `<line x1="${X(Math.min(ph[0].C, v.C[1]))}" y1="${Y(st.T)}" x2="${X(Math.min(ph[1].C, v.C[1]))}" y2="${Y(st.T)}" stroke="${COL.p}" stroke-width="2.5"/>` + ph.map((p) => (p.C <= v.C[1] ? `<circle cx="${X(p.C)}" cy="${Y(st.T)}" r="4" fill="${PCOL[p.ph]}"/>` : '')).join('');
  s += `<circle data-k="pt" cx="${X(st.C).toFixed(1)}" cy="${Y(st.T).toFixed(1)}" r="9" fill="${COL.i}" stroke="#fff" stroke-width="2"/>`;
  return s + '</svg>';
}
// a sketch of the slow-cooled microstructure: grains coloured by constituent
function microSvg(m) {
  if (!m.parts.length) return '<p class="small muted">מעל 2.14% C זה ברזל יציקה. המבנה שלו (לדבוריט, או גרפיט בברזל יציקה אפור) לא מוצג כאן.</p>';
  const W = 360, H = 120, n = 48, cols = 12;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="מבנה מיקרו אחרי קירור איטי"><defs><pattern id="pearl" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="6" height="6" fill="#bfdbfe"/><rect width="2" height="6" fill="#374151"/></pattern></defs>`;
  const wp = m.kind === 'hypo' ? m.parts[1].W : m.kind === 'hyper' ? 1 : m.kind === 'eut' ? 1 : 0, nP = Math.round(wp * n);
  // spread the pearlite grains through the field with a fixed pattern
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => ((a * 37) % n) - ((b * 37) % n));
  const isP = new Set(order.slice(0, nP));
  for (let i = 0; i < n; i++) { const x = (i % cols) * 30, y = Math.floor(i / cols) * 30; s += `<rect x="${x + 1}" y="${y + 1}" width="28" height="28" rx="6" fill="${isP.has(i) ? 'url(#pearl)' : '#dbeafe'}" stroke="${m.kind === 'hyper' ? '#111827' : '#9ca3af'}" stroke-width="${m.kind === 'hyper' ? 2.5 : 1}"/>`; }
  return s + '</svg>';
}

export function renderFec(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>🔥 דיאגרמת ברזל-פחמן</h2><p class="small muted">כל נקודה היא הרכב (כמה פחמן) וטמפרטורה. גרור את הנקודה וראה אילו פאזות יש שם, ממה הן עשויות וכמה מכל אחת (כלל המנוף). זו דיאגרמת שיווי משקל: קירור איטי מאוד.</p></div>
    <div class="card pg-stage"><div id="fcDia" style="margin-top:22px"></div><div class="chips"><button class="chip" data-act="cool">❄ קירור איטי מכאן</button></div></div>
    <div class="card" id="fcEd"></div>
    <div class="card" id="fcRes"></div>`;
  const dv = root.querySelector('#fcDia'), ed = root.querySelector('#fcEd'), out = root.querySelector('#fcRes');
  const editor = () => `${chips(Object.entries(VIEWS).map(([k, v]) => [k, v.name]), st.view, 'view')}<h3 class="pg-h">פלדות לדוגמה</h3>${chips(PRESETS.map(([c, n]) => [c, n]), st.C, 'preset')}`;
  const results = () => {
    const ph = phasesAt(st.C, st.T), m = micro(st.C);
    const rows = ph.map((p) => `<tr><td><span style="color:${PCOL[p.ph]}">●</span> ${phaseName(p.ph)}</td><td>${ltr(`${num(p.C, 3)}% C`)}</td><td>${ltr(`${num(p.W * 100, 1)}%`)}</td></tr>`).join('');
    const lever = ph.length === 2 ? `<p class="small">${ltr(`W(${ph[1].ph === 'c' ? 'Fe₃C' : ph[1].ph}) = (C0 − C1)/(C2 − C1)`)} ${ltr(`= (${num(st.C, 3)} − ${num(ph[0].C, 3)}) / (${num(ph[1].C, 3)} − ${num(ph[0].C, 3)})`)} ${ltr(`= ${num(ph[1].W, 3)}`)}. הקו הירוק הוא קו המנוף (tie line): הקצוות שלו הם ההרכבים של שתי הפאזות.</p>` : '<p class="small">פאזה אחת: ההרכב שלה הוא ההרכב הכולל.</p>';
    return `<div class="pg-status good">${ltr(`${num(st.C, 3)}% C, ${num(st.T, 0)} °C`)}: ${ph.map((p) => phaseName(p.ph)).join(' + ')}</div>
      <table class="pg-table"><thead><tr><th>פאזה</th><th>הרכב</th><th>חלק במשקל</th></tr></thead><tbody>${rows}</tbody></table>${lever}
      <h3 class="pg-h">אחרי קירור איטי (ממש מתחת ל-727°C)</h3>${m.parts.length ? `<div class="pg-max">${m.parts.map((p) => `<div><span>${p.name}</span><b>${ltr(`${num(p.W * 100, 1)}%`)}</b></div>`).join('')}</div>` : ''}${microSvg(m)}
      <p class="small">${m.kind === 'hypo' ? 'פלדה תת-אוטקטואידית: בקירור דרך α+γ נוצר קודם פריט רך (בהיר), ובשאר הגרעינים האוסטניט הופך ב-727°C לפרליט (שכבות פריט וצמנטיט). יותר פחמן = יותר פרליט = חזקה וקשה יותר ופחות רקיעה.' : m.kind === 'hyper' ? 'פלדה על-אוטקטואידית: בקירור דרך γ+Fe₃C צמנטיט קשה ושביר נוצר על גבולות הגרעינים (הקווים העבים), והשאר הופך לפרליט.' : m.kind === 'eut' ? 'פלדה אוטקטואידית: כל האוסטניט הופך ב-727°C לפרליט.' : m.kind === 'ferrite' ? 'כמעט ברזל טהור: פריט בלבד, רך ורקיע.' : ''}</p>
      <p class="small"><b>טיפול תרמי:</b> הדיאגרמה מתארת קירור איטי. בהקשיה מחממים לאוסטניט (מעל A3, הקו מ-912 ל-727) ומקררים מהר במים או בשמן, והפחמן לא מספיק לצאת: נוצר מרטנזיט קשה ושביר, שלא מופיע בדיאגרמה. אחר כך מרפים (tempering) כדי להחזיר קשיחות. ליבון (annealing) הוא חימום וקירור איטי בתנור, ונותן את המבנה שבדיאגרמה.</p>
      <p class="small muted">נקודות המפתח לפי ${SRC_FC}: 0.76% ו-727°C, 0.022%, 2.14% ו-1147°C, 4.3%, 6.7%. הקווים בין הנקודות ישרים (בדיאגרמה האמיתית הם מעט מעוקלים), אזור הפריט δ מעל 1394°C לא מוצג, וקצה הנוזל של הצמנטיט (1227°C) משוער. השרטוט של המבנה הוא המחשה של היחסים ולא תמונת מיקרוסקופ.</p>`;
  };
  const refresh = (full = true) => { clamp(); dv.innerHTML = diagram(); out.innerHTML = results(); if (full) ed.innerHTML = editor(); };
  refresh();
  let anim = 0;
  const cool = () => {
    cancelAnimationFrame(anim); let last = 0;
    const tick = (t) => { if (!root.isConnected) return; if (last) { st.T -= ((t - last) / 1000) * 60; if (st.T <= Math.max(VIEWS[st.view].T[0], 450)) { st.T = Math.max(VIEWS[st.view].T[0], 450); refresh(false); save(); return; } refresh(false); } last = t; anim = requestAnimationFrame(tick); };
    if (st.T < 1000 && st.C <= 2.14) st.T = Math.min(VIEWS[st.view].T[1], Math.max(st.T, tA3(Math.min(st.C, 0.76)) + 40, st.C > 0.76 ? tAcm(st.C) + 40 : 0));
    anim = requestAnimationFrame(tick);
  };
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'view') { st.view = b.dataset.v; if (st.C > VIEWS.steel.C[1] && st.view === 'steel') st.C = 0.45; }
    else if (act === 'preset') { st.C = Number(b.dataset.v); if (st.C > VIEWS.steel.C[1]) st.view = 'all'; }
    else if (act === 'cool') { cool(); return; }
    else return;
    cancelAnimationFrame(anim); save(); refresh();
  });
  let drag = null;
  const setFrom = (ev) => {
    const sv = dv.querySelector('svg'); if (!sv || !view) return;
    const p = sv.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(sv.getScreenCTM().inverse()), v = view.v;
    st.C = Math.round((v.C[0] + ((q.x - view.pl) / (view.W - view.pl - view.pr)) * (v.C[1] - v.C[0])) * 100) / 100;
    st.T = Math.round(v.T[0] + ((view.H - view.pb - q.y) / (view.H - view.pt - view.pb)) * (v.T[1] - v.T[0]));
    refresh(false);
  };
  dv.addEventListener('pointerdown', (ev) => { if (!ev.target.closest('#pgFec')) return; ev.preventDefault(); cancelAnimationFrame(anim); drag = ev.pointerId; try { dv.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ } setFrom(ev); });
  dv.addEventListener('pointermove', (ev) => { if (drag === ev.pointerId) setFrom(ev); });
  const end = (ev) => { if (drag !== ev.pointerId) return; drag = null; save(); };
  dv.addEventListener('pointerup', end); dv.addEventListener('pointercancel', end);
}
