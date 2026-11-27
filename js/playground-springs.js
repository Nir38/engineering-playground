// playground-springs.js: the playground's spring mode. A helical compression spring (or two in series or
// in parallel) that shortens as you drag the force, to scale, with the solid length marked; the rate, the
// shear stress with the curvature factor, the wire strength, solid, buckling and surge frequency.
// Math: js/springs.js (tests/spring-cases.mjs).
import { spring, WIRES, ENDS, SRC_S } from './springs.js';
import { ltr, num, text, arrow, slider, chips, COL } from './elec-ui.js';

const KEY = 'mh-pg-springs-v1';
const COMBO = { one: 'קפיץ אחד', series: 'שניים בטור', parallel: 'שניים במקביל' };
const defaults = () => ({ wire: 'music', d: 2.5, D: 20, Nt: 12, ends: 'sqG', L0: 60, F: 50, combo: 'one' });
let st = null;
const lim = () => { const Ls = ENDS[st.ends].Ls(st.d, st.Nt); return { d: [0.5, 10], D: [4, 100], Nt: [4, 30], L0: [Math.ceil(Ls + 2), Math.ceil(Ls * 4 + 20)], F: [0, Math.max(10, Math.ceil(spring({ ...st, F: 0 }).Fsolid1 * (st.combo === 'parallel' ? 2 : 1) * 1.1))] }; };
function clamp() {
  st.d = Math.min(10, Math.max(0.5, st.d)); st.D = Math.min(100, Math.max(Math.max(4, st.d * 2.5), st.D)); st.Nt = Math.round(Math.min(30, Math.max(4, st.Nt)));
  const L = lim(); st.L0 = Math.min(L.L0[1], Math.max(L.L0[0], st.L0)); st.F = Math.min(lim().F[1], Math.max(0, st.F));
}
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') for (const k of Object.keys(st)) if (typeof s[k] === typeof st[k] && (typeof s[k] !== 'number' || Number.isFinite(s[k]))) st[k] = s[k]; } catch (e) { /* ignore */ }
  if (!WIRES[st.wire]) st.wire = 'music'; if (!ENDS[st.ends]) st.ends = 'sqG'; if (!COMBO[st.combo]) st.combo = 'one';
  clamp();
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
const S = () => spring(st);

// a coil seen from the side: a zig-zag between two plates, x along the axis
function coil(x0, len, cy, R, n, wire, col) {
  let p = `${x0},${cy}`;
  for (let i = 0; i < n; i++) { const a = x0 + (len * (i + 0.25)) / n, b = x0 + (len * (i + 0.75)) / n; p += ` ${a.toFixed(1)},${(cy - R).toFixed(1)} ${b.toFixed(1)},${(cy + R).toFixed(1)}`; }
  p += ` ${x0 + len},${cy}`;
  return `<polyline points="${p}" fill="none" stroke="${col}" stroke-width="${wire.toFixed(1)}" stroke-linejoin="round"/>`;
}
function drawing(s) {
  const W = 360, H = 190, x0 = 24, maxLen = st.combo === 'series' ? 2 * st.L0 : st.L0, k = Math.min(260 / maxLen, 60 / st.D), R = (st.D * k) / 2, wire = Math.min(4, Math.max(1.2, st.d * k * 0.55));
  const len1 = Math.max(st.L0 - s.y1, s.Ls) * k, col = s.solid ? COL.s : COL.v;
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="הקפיץ תחת עומס">`;
  svg += `<rect x="${x0 - 8}" y="40" width="8" height="120" fill="var(--muted)" opacity="0.5"/>`;
  const rows = st.combo === 'parallel' ? [70, 130] : [100];
  let xEnd = x0;
  for (const cy of rows) {
    if (st.combo === 'series') { svg += coil(x0, len1, cy, R, st.Nt, wire, col) + `<rect x="${x0 + len1}" y="${cy - R - 6}" width="4" height="${2 * R + 12}" fill="var(--muted)"/>` + coil(x0 + len1 + 4, len1, cy, R, st.Nt, wire, col); xEnd = x0 + 2 * len1 + 4; }
    else { svg += coil(x0, len1, cy, R, st.Nt, wire, col); xEnd = x0 + len1; }
  }
  svg += `<rect x="${xEnd}" y="40" width="8" height="120" fill="var(--muted)" opacity="0.8"/>`;
  if (st.F > 0) svg += arrow(xEnd + 48, 100, xEnd + 10, 100, COL.i, 3, 8) + text(xEnd + 30, 92, `F = ${num(st.F, 0)} N`, COL.i, 'middle');
  // free length and solid length marks (single spring row)
  const free = x0 + (st.combo === 'series' ? 2 * st.L0 * k + 4 : st.L0 * k), solid = x0 + (st.combo === 'series' ? 2 * s.Ls * k + 4 : s.Ls * k);
  svg += `<line x1="${free}" y1="34" x2="${free}" y2="166" stroke="var(--muted)" stroke-dasharray="4 3"/>` + text(free, 30, 'L0', 'var(--muted)');
  svg += `<line x1="${solid}" y1="34" x2="${solid}" y2="166" stroke="${COL.s}" stroke-dasharray="2 3"/>` + text(solid, 180, 'אורך מוצק', COL.s);
  svg += text(x0, 180, `y = ${num(Math.min(s.y, (st.L0 - s.Ls) * (st.combo === 'series' ? 2 : 1)), 1)} mm`, '', 'start');
  return svg + '</svg>';
}

export function renderSprings(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>🌀 קפיצים</h2><p class="small muted">קפיץ לחיצה הוא בעצם מוט שמתפתל: החוט עובד בפיתול, והמאמץ הגבוה הוא בצד הפנימי של הסליל. גרור את הכוח וראה את הקפיץ מתקצר, עד שהכריכות נוגעות זו בזו (אורך מוצק).</p></div>
    <div class="card pg-stage"><div id="spDraw" style="margin-top:22px"></div></div>
    <div class="card" id="spEd"></div>
    <div class="card" id="spRes"></div>`;
  const dv = root.querySelector('#spDraw'), ed = root.querySelector('#spEd'), out = root.querySelector('#spRes');
  const editor = () => { const L = lim(); return `${chips(Object.entries(COMBO), st.combo, 'combo')}
    ${slider('F', 'כוח F', ltr(`${num(st.F, 0)} N`), L.F, 1, st.F)}
    <h3 class="pg-h">הקפיץ</h3>${chips(Object.entries(WIRES).map(([k, v]) => [k, v.name]), st.wire, 'wire')}
    ${slider('d', 'קוטר החוט d', ltr(`${num(st.d, 2)} mm`), L.d, 0.1, st.d)}${slider('D', 'קוטר ממוצע של הסליל D', ltr(`${num(st.D, 1)} mm`), L.D, 0.5, st.D)}
    ${slider('Nt', 'מספר כריכות כולל Nt', ltr(String(st.Nt)), L.Nt, 1, st.Nt)}${slider('L0', 'אורך חופשי L0', ltr(`${num(st.L0, 0)} mm`), L.L0, 1, st.L0)}
    <h3 class="pg-h">קצוות</h3>${chips(Object.entries(ENDS).map(([k, v]) => [k, v.name]), st.ends, 'ends')}`; };
  const results = (s) => {
    const msgs = [];
    if (s.solid) msgs.push(['bad', 'הקפיץ הגיע לאורך מוצק: הכריכות נוגעות, והוא כבר לא קפיץ אלא גוש.']);
    if (s.n < 1) msgs.push(['bad', `המאמץ גבוה מ-${ltr('Ssy')}: הקפיץ יקבל שקיעה קבועה (set).`]);
    if (s.ns < 1.2) msgs.push(['warn', `בדחיסה עד מוצק ${ltr(`ns = ${num(s.ns, 2)}`)} (מומלץ לפחות 1.2): אם מישהו ילחץ אותו עד הסוף, הוא יתעוות.`]);
    if (s.buckle) msgs.push(['warn', `הקפיץ ארוך ודק מדי ועלול לקרוס הצידה (${ltr(`L0 ≥ 2.63·D/α = ${num(s.Lcr, 0)} mm`)}). פתרון: מוט מוביל או שרוול.`]);
    if (!s.Cok) msgs.push(['warn', `מקדם הסליל ${ltr(`C = ${num(s.C, 1)}`)} מחוץ ל-4 עד 12: ${s.C < 4 ? 'קשה לליפוף ומאמץ גבוה בצד הפנימי' : 'הקפיץ רופס ונוטה להסתבך'}.`]);
    if (!msgs.length) msgs.push(['good', `הקפיץ תקין. מקדם ביטחון ${ltr(`n = ${num(s.n, 2)}`)}, ובדחיסה עד מוצק ${ltr(`ns = ${num(s.ns, 2)}`)}.`]);
    return `${msgs.map(([c, t]) => `<div class="pg-status ${c}">${t}</div>`).join('')}<div class="pg-max">
      <div><span>מקדם הסליל</span><b>${ltr(`C = D/d = ${num(s.C, 2)}`)}</b></div><div><span>כריכות פעילות</span><b>${ltr(`Na = ${s.Na}`)}</b></div>
      <div><span>קשיחות קפיץ אחד</span><b>${ltr(`k = d⁴G/(8D³Na) = ${num(s.k1, 2)} N/mm`)}</b></div><div><span>קשיחות כוללת</span><b>${ltr(`${num(s.k, 2)} N/mm`)}</b></div>
      <div><span>התקצרות</span><b>${ltr(`y = F/k = ${num(s.y, 1)} mm`)}</b></div><div><span>אורך מוצק</span><b>${ltr(`Ls = ${num(s.Ls, 1)} mm`)}</b></div>
      <div><span>מקדם עקמומיות</span><b>${ltr(`KB = ${num(s.KB, 3)} (Wahl ${num(s.Kw, 3)})`)}</b></div><div><span>מאמץ גזירה</span><b>${ltr(`τ = KB·8FD/πd³ = ${num(s.tau, 0)} MPa`)}</b></div>
      <div><span>חוזק החוט</span><b>${ltr(`Sut = A/d^m = ${num(s.Sut, 0)} MPa`)}</b></div><div><span>גזירה מותרת</span><b>${ltr(`Ssy = ${num(s.Ssy, 0)} MPa`)}</b></div>
      <div><span>תדירות עצמית</span><b>${ltr(`f = ${num(s.fn, 0)} Hz`)}</b></div><div><span>פסיעה</span><b>${ltr(`p = ${num(s.p, 2)} mm`)}</b></div></div>
      <p class="small">${ltr('k')} תלוי ב-${ltr('d⁴')} ובחזקה ${ltr('1/D³')}: הגדלה קטנה של קוטר החוט מקשיחה מאוד. ${ltr('KB')} מוסיף על מאמץ הפיתול את העקמומיות של הסליל, והמאמץ הגבוה הוא בצד הפנימי. חוט דק חזק יותר לכל ${ltr('mm²')} (${ltr('Sut = A/d^m')}), כי הוא עבר יותר משיכה.</p>
      <p class="small"><b>מה כדאי לנסות:</b> הגדל את F עד שהקפיץ נהיה אדום (מוצק). שנה ל"שניים בטור" (קשיחות חצי, התקצרות כפולה) ול"במקביל" (קשיחות כפולה, כל קפיץ מקבל חצי מהכוח). הארך את L0 עד אזהרת הקריסה. הקטן את D עד ש-${ltr('C < 4')}.</p>
      <p class="small muted">הקפיץ במנוחה בין שני משטחים שטוחים. ${ltr('Ssy')} לקפיץ סטטי לפני הסרת שקיעה. בקפיץ שעובד במחזורים צריך בדיקת עייפות נפרדת. התדירות העצמית צריכה להיות גבוהה בהרבה מתדירות ההפעלה. המקור: ${SRC_S}.</p>`;
  };
  const refresh = (full = true) => {
    const s = S(); dv.innerHTML = drawing(s); out.innerHTML = results(s);
    if (full) ed.innerHTML = editor();
    else { const tmp = document.createElement('div'); tmp.innerHTML = editor(); const nb = tmp.querySelectorAll('.pg-range b'); ed.querySelectorAll('.pg-range b').forEach((b, i) => { if (nb[i]) b.innerHTML = nb[i].innerHTML; }); }
  };
  refresh();
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]'); if (!b || !['combo', 'wire', 'ends'].includes(b.dataset.act)) return;
    st[b.dataset.act] = b.dataset.v; clamp(); save(); refresh();
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!['F', 'd', 'D', 'Nt', 'L0'].includes(f)) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    st[f] = v; clamp(); save(); refresh(false);
  });
  root.addEventListener('change', (ev) => { if (['d', 'D', 'Nt', 'L0'].includes(ev.target.dataset.f)) refresh(); }); // the slider ranges follow
}
