// playground-kt.js: the playground's stress-concentration mode. A hole in a plate, an elliptical hole
// (towards a crack) and a shaft shoulder, drawn to scale with the hot spot, the Kt chart with the current
// point, and Kt → Kf with notch sensitivity. Math: js/kt.js (tests/kt-cases.mjs).
import { ktHole, ktEllipse, ktShoulder, qNotch, kf, SRC_KT, SRC_Q } from './kt.js';
import { ltr, num, text, arrow, slider, chips, plot, COL, go } from './elec-ui.js';

const KEY = 'mh-pg-kt-v1';
const GEO = { hole: 'חור בפלטה', ellipse: 'חור אליפטי / סדק', shoulder: 'כתף בציר' };
const LOADS = { axial: 'מתיחה', bend: 'כפיפה', tors: 'פיתול' };
const LIM = { W: [20, 200], dW: [0.02, 0.8], t: [2, 30], P: [1, 200], a: [1, 20], ab: [0.2, 15], s0: [10, 400], d: [5, 100], Dd: [1.05, 2], rd: [0.02, 0.3], L: [1, 2000], Sut: [350, 1700] };
const defaults = () => ({ geo: 'hole', load: 'bend', W: 60, dW: 0.25, t: 10, P: 20, a: 5, ab: 3, s0: 100, d: 30, Dd: 1.5, rd: 0.1, L: 200, Sut: 700 });
let st = null;
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') for (const k of Object.keys(st)) if (typeof s[k] === typeof st[k] && (typeof s[k] !== 'number' || Number.isFinite(s[k]))) st[k] = s[k]; } catch (e) { /* ignore */ }
  if (!GEO[st.geo]) st.geo = 'hole'; if (!LOADS[st.load]) st.load = 'bend';
  for (const [k, [a, b]] of Object.entries(LIM)) st[k] = Math.min(b, Math.max(a, st[k]));
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };

// everything for the current state
function calc() {
  if (st.geo === 'hole') { const d = st.dW * st.W; return { Kt: ktHole(st.dW), snom: (st.P * 1e3) / ((st.W - d) * st.t), r: d / 2, lt: 'axial', ok: true, nomTxt: 'σnom = P / ((W − d)·t)' }; }
  if (st.geo === 'ellipse') { const b = st.a / st.ab; return { Kt: ktEllipse(st.a, b), snom: st.s0, r: (b * b) / st.a, lt: 'axial', ok: true, nomTxt: 'σnom = σ∞ (רחוק מהחור)' }; }
  const D = st.Dd * st.d, r = st.rd * st.d, k = ktShoulder(D, st.d, r, st.load), d3 = (st.d / 1000) ** 3;
  const snom = st.load === 'axial' ? (4 * st.L * 1e3) / (Math.PI * st.d * st.d) : st.load === 'bend' ? (32 * st.L) / (Math.PI * d3) / 1e6 : (16 * st.L) / (Math.PI * d3) / 1e6;
  return { ...k, snom, r, lt: st.load, nomTxt: st.load === 'axial' ? 'σnom = 4P / πd²' : st.load === 'bend' ? 'σnom = 32M / πd³' : 'τnom = 16T / πd³' };
}

const glow = (x, y, rr = 9) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr}" fill="${COL.s}" opacity="0.35"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${COL.s}"/>`;
// force-flow lines that bend around a hole of half-height hh at (cx, cy)
function flow(cx, cy, hh, x0, x1, y0, y1, n = 9) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const y = y0 + ((i + 0.5) * (y1 - y0)) / n, side = y < cy ? -1 : 1, dist = Math.abs(y - cy);
    let p = '';
    for (let x = x0; x <= x1; x += 6) { const g = Math.exp(-(((x - cx) / (hh * 1.6 + 12)) ** 2)), push = dist < hh + 4 ? (hh + 6 - dist) : (hh * hh) / (dist * 3); p += `${x},${(y + side * push * g).toFixed(1)} `; }
    s += `<polyline points="${p}" fill="none" stroke="${COL.v}" stroke-width="1" opacity="0.45"/>`;
  }
  return s;
}
function drawing() {
  const W = 360, H = 200;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="הגאומטריה והנקודה החמה">`;
  if (st.geo !== 'shoulder') {
    const x0 = 50, x1 = 310, y0 = 40, y1 = 170, cx = 180, cy = 105, half = (y1 - y0) / 2;
    s += `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="var(--surface-2)" stroke="var(--text)" stroke-width="1.5"/>`;
    const ry = st.geo === 'hole' ? st.dW * half : Math.min(half * 0.8, 10 + st.a * 2.2), rx = st.geo === 'hole' ? ry : ry / st.ab;
    s += flow(cx, cy, ry, x0 + 4, x1 - 4, y0 + 2, y1 - 2);
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${Math.max(rx, 0.8).toFixed(1)}" ry="${ry.toFixed(1)}" fill="var(--surface)" stroke="var(--text)" stroke-width="1.5"/>`;
    s += glow(cx, cy - ry) + glow(cx, cy + ry);
    for (const y of [70, 105, 140]) s += arrow(x0 - 4, y, x0 - 34, y, COL.i, 2, 6) + arrow(x1 + 4, y, x1 + 34, y, COL.i, 2, 6);
    s += text(cx, 26, st.geo === 'hole' ? `d/W = ${num(st.dW, 2)}` : `a/b = ${num(st.ab, 2)}`, '', 'middle');
  } else {
    const xs = 190, cy = 110, Dpx = 110, dpx = Dpx / st.Dd, rpx = Math.min(st.rd * dpx, 40), x0 = 40, x1 = 330;
    const yD = cy - Dpx / 2, yd = cy - dpx / 2;
    s += `<path d="M${x0},${yD} L${xs},${yD} L${xs},${yd - rpx} Q${xs},${yd} ${xs + rpx},${yd} L${x1},${yd} L${x1},${cy + dpx / 2} L${xs + rpx},${cy + dpx / 2} Q${xs},${cy + dpx / 2} ${xs},${cy + dpx / 2 + rpx} L${xs},${cy + Dpx / 2} L${x0},${cy + Dpx / 2} Z" fill="var(--surface-2)" stroke="var(--text)" stroke-width="1.5"/>`;
    s += `<line x1="${x0 - 8}" y1="${cy}" x2="${x1 + 8}" y2="${cy}" stroke="var(--muted)" stroke-dasharray="8 3 2 3"/>`;
    const hx = xs + rpx * 0.3, hy = yd - rpx * 0.3;
    s += glow(hx, hy) + glow(hx, 2 * cy - hy);
    if (st.load === 'axial') s += arrow(x0 - 2, cy, x0 - 30, cy, COL.i, 2.5, 7) + arrow(x1 + 2, cy, x1 + 28, cy, COL.i, 2.5, 7);
    else s += text(x0 - 6, cy - Dpx / 2 - 8, st.load === 'bend' ? 'M ↻' : 'T ⟲', COL.i, 'start') + text(x1 + 4, cy - dpx / 2 - 8, st.load === 'bend' ? '↺ M' : '⟳ T', COL.i, 'end');
    s += text(xs - 50, yD - 8, `D = ${num(st.Dd * st.d, 1)}`, '', 'middle') + text(xs + 70, yd - 8, `d = ${num(st.d, 0)}, r = ${num(st.rd * st.d, 1)}`, '', 'middle');
  }
  return s + '</svg>';
}
function chart(c) {
  const xs = [], ys = [], extra = [];
  if (st.geo === 'hole') { for (let i = 0; i <= 40; i++) { const x = (0.8 * i) / 40; xs.push(x); ys.push(ktHole(x)); } return plot({ xs, series: [{ ys, col: COL.s, label: 'Kt' }], units: { x: 'd/W', l: 'Kt' }, marks: [{ x: st.dW, label: `Kt = ${num(c.Kt, 2)}`, col: COL.s }], H: 140, zero: false }); }
  if (st.geo === 'ellipse') { for (let i = 0; i <= 40; i++) { const x = (15 * i) / 40; xs.push(x); ys.push(ktEllipse(x, 1)); } return plot({ xs, series: [{ ys, col: COL.s, label: 'Kt = 1 + 2a/b' }], units: { x: 'a/b', l: 'Kt' }, marks: [{ x: st.ab, label: `Kt = ${num(c.Kt, 1)}`, col: COL.s }], H: 140 }); }
  for (const Dd of [st.Dd, 1.1, 2]) { const row = []; for (let i = 0; i <= 40; i++) { const rd = 0.02 + (0.28 * i) / 40; if (Dd === st.Dd) xs.push(rd); const k = ktShoulder(Dd, 1, rd, st.load); row.push(k.ok ? k.Kt : NaN); } extra.push(row); }
  return plot({ xs, series: [{ ys: extra[0], col: COL.s, label: `D/d ${num(st.Dd, 2)}` }, { ys: extra[1], col: COL.v, label: 'D/d 1.1', dash: '4 3', w: 1.2 }, { ys: extra[2], col: COL.q, label: 'D/d 2', dash: '4 3', w: 1.2 }], units: { x: 'r/d', l: 'Kt' }, marks: [{ x: st.rd, label: `Kt = ${num(c.Kt, 2)}`, col: COL.s }], H: 150, zero: false });
}

export function renderKt(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>✱ ריכוזי מאמץ</h2><p class="small muted">חור, חריץ או כתף "דוחסים" את קווי הכוח, והמאמץ המקומי קופץ פי ${ltr('Kt')}. הנקודות האדומות הן המקום שבו סדק יתחיל. הקווים הכחולים מראים איך הכוח עוקף את המכשול.</p></div>
    <div class="card pg-stage"><div id="ktDraw" style="margin-top:22px"></div><div id="ktChart"></div></div>
    <div class="card" id="ktEd"></div>
    <div class="card" id="ktRes"></div>`;
  const dv = root.querySelector('#ktDraw'), cv = root.querySelector('#ktChart'), ed = root.querySelector('#ktEd'), out = root.querySelector('#ktRes');
  const editor = () => {
    let g = '';
    if (st.geo === 'hole') g = slider('W', 'רוחב הפלטה W', ltr(`${num(st.W, 0)} mm`), LIM.W, 1, st.W) + slider('dW', 'קוטר החור יחסית לרוחב d/W', ltr(`${num(st.dW, 2)} (d = ${num(st.dW * st.W, 1)} mm)`), LIM.dW, 0.01, st.dW) + slider('t', 'עובי t', ltr(`${num(st.t, 0)} mm`), LIM.t, 1, st.t) + slider('P', 'כוח מתיחה P', ltr(`${num(st.P, 0)} kN`), LIM.P, 1, st.P);
    else if (st.geo === 'ellipse') g = slider('ab', 'יחס הצירים a/b (a ניצב לכוח)', ltr(num(st.ab, 2)), LIM.ab, 0.05, st.ab) + slider('a', 'חצי האורך a', ltr(`${num(st.a, 1)} mm`), LIM.a, 0.5, st.a) + slider('s0', 'מאמץ רחוק σ∞', ltr(`${num(st.s0, 0)} MPa`), LIM.s0, 5, st.s0);
    else g = chips(Object.entries(LOADS), st.load, 'load') + slider('d', 'קוטר קטן d', ltr(`${num(st.d, 0)} mm`), LIM.d, 1, st.d) + slider('Dd', 'יחס הקטרים D/d', ltr(num(st.Dd, 2)), LIM.Dd, 0.01, st.Dd) + slider('rd', 'רדיוס הפילט r/d', ltr(num(st.rd, 3)), LIM.rd, 0.005, st.rd) + slider('L', st.load === 'axial' ? 'כוח P' : st.load === 'bend' ? 'מומנט כפיפה M' : 'מומנט פיתול T', ltr(st.load === 'axial' ? `${num(st.L, 0)} kN` : `${num(st.L, 0)} N·m`), LIM.L, 1, st.L);
    return `${chips(Object.entries(GEO), st.geo, 'geo')}${g}${slider('Sut', 'חוזק מתיחה של הפלדה Sut (לרגישות לחריץ)', ltr(`${num(st.Sut, 0)} MPa`), LIM.Sut, 10, st.Sut)}`;
  };
  const results = (c) => {
    const q = qNotch(st.Sut, c.r, c.lt), Kf = kf(c.Kt, q), tau = st.geo === 'shoulder' && st.load === 'tors', sg = tau ? 'τ' : 'σ';
    const warn = c.ok ? '' : `<div class="pg-status warn">${ltr(`h/r = ${num(c.hr, 2)}`)} מחוץ לתחום שבו הנוסחה נבדקה (${ltr(`${c.range[0]} עד ${c.range[1]}`)}). הערך כאן הוא הערכה בלבד.</div>`;
    return `${warn}<div class="pg-max">
      <div><span>מקדם ריכוז מאמץ</span><b>${ltr(`Kt = ${num(c.Kt, 2)}`)}</b></div><div><span>מאמץ נומינלי</span><b>${ltr(`${c.nomTxt} = ${num(c.snom, 1)} MPa`)}</b></div>
      <div><span>מאמץ שיא (סטטי, אלסטי)</span><b>${ltr(`${sg}max = Kt·${sg}nom = ${num(c.Kt * c.snom, 0)} MPa`)}</b></div><div><span>רדיוס החריץ</span><b>${ltr(`r = ${num(c.r, 2)} mm`)}</b></div>
      <div><span>רגישות לחריץ</span><b>${ltr(`q = ${num(q, 2)}`)}</b></div><div><span>מקדם לעייפות</span><b>${ltr(`Kf = 1 + q(Kt − 1) = ${num(Kf, 2)}`)}</b></div></div>
      <p class="small">${ltr('Kt')} תלוי רק בגאומטריה. ${ltr('Kf')} הוא מה שהחומר "מרגיש" בעייפות: ברדיוס קטן מאוד ובפלדה רכה ${ltr('q')} קטן, וחלק מהשיא "נבלע". פלדה חזקה רגישה יותר לחריצים (${ltr('q')} גבוה), ולכן אצלה גימור ורדיוס חשובים יותר. את ${ltr('Kf')} מכניסים לבדיקת עייפות ב-${go('fat', '⟳ עייפות')}.</p>
      <p class="small"><b>מה כדאי לנסות:</b> חור קטן בפלטה רחבה נותן ${ltr('Kt = 3')} בלי קשר לגודלו. באליפסה הגדל את ${ltr('a/b')}: חור ארוך וצר ניצב לכוח מתנהג כמו סדק, ו-${ltr('Kt')} גדל בלי גבול. לכן קודחים חור בקצה סדק (stop hole), כדי להפוך אותו לעגול. בכתף, הגדלת רדיוס הפילט היא הדרך הכי יעילה להוריד את ${ltr('Kt')}, יותר מהקטנת ${ltr('D/d')}.</p>
      <p class="small muted">בחומר רקיע בעומס סטטי בדרך כלל לא מכפילים ב-${ltr('Kt')}, כי כניעה מקומית מחלקת את המאמץ מחדש. בעייפות ובחומר שביר הוא קריטי. בחור, המאמץ הנומינלי מחושב על החתך נטו. המקורות: ${SRC_KT}, ואליפסה לפי Inglis. רגישות לחריץ לפי ${SRC_Q} (נוסחת Neuber לפלדות).</p>`;
  };
  const refresh = (full = true) => {
    const c = calc(); dv.innerHTML = drawing(); cv.innerHTML = chart(c); out.innerHTML = results(c);
    if (full) ed.innerHTML = editor();
    else { const tmp = document.createElement('div'); tmp.innerHTML = editor(); const nb = tmp.querySelectorAll('.pg-range b'); ed.querySelectorAll('.pg-range b').forEach((b, i) => { if (nb[i]) b.innerHTML = nb[i].innerHTML; }); }
  };
  refresh();
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]'); if (!b || !['geo', 'load'].includes(b.dataset.act)) return;
    st[b.dataset.act] = b.dataset.v; save(); refresh();
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!f || !(f in LIM)) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    st[f] = Math.min(LIM[f][1], Math.max(LIM[f][0], v)); save(); refresh(false);
  });
}
