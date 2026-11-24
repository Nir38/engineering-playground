// playground-pulleys.js: the playground's pulley stage (hoist / connected bodies).
// Solvers in js/pulleys.js, checked in tests/pulley-cases.mjs.
import { tackle, connected, sideGeom, G } from './pulleys.js';
import { esc } from './text.js';

const KEY = 'mh-pg-pul-v1';
const W = 360;
const SIDE_KIND = { hang: 'תלוי', table: 'על שולחן', incline: 'על מדרון' };
const CONN_TPL = [
  { id: 'atwood', name: 'מכונת Atwood', make: () => ({ left: side('hang', 2), right: side('hang', 3), mp: 0 }) },
  { id: 'table', name: 'שולחן ומשקולת', make: () => ({ left: side('table', 4, 30, 0.3, 0.2), right: side('hang', 2), mp: 0 }) },
  { id: 'incline', name: 'מדרון ומשקולת', make: () => ({ left: side('incline', 5, 30, 0.25, 0.2), right: side('hang', 3), mp: 0 }) },
  { id: 'two', name: 'שני מדרונות', make: () => ({ left: side('incline', 4, 30, 0.1, 0.08), right: side('incline', 3, 60, 0.1, 0.08), mp: 0 }) },
];
function side(kind, m, theta = 30, mus = 0, muk = 0) { return { kind, m, theta, mus, muk }; }
const defaults = () => ({
  sub: 'hoist',
  hoist: { n: 4, m: 100, mb: 5, eta: 0.95, pull: 'down', dir: 'lift', p: 0 },
  conn: CONN_TPL[1].make(),
});
let st = null, QUIZ = false; // QUIZ: draw without the answers
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.hoist && s.conn) st = { ...defaults(), ...s }; } catch (e) { /* ignore */ }
  if (!st) st = defaults();
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };

const num = (n) => {
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n); if (a < 1e-7) return '0';
  const s = a >= 1000 ? n.toFixed(0) : a >= 100 ? n.toFixed(1) : a >= 10 ? n.toFixed(2) : n.toFixed(3);
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
};
const ltr = (s) => `<span class="ltr">${esc(s)}</span>`;
const text = (x, y, s, cls = '', anchor = 'middle') => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" class="pg-t ${cls}">${esc(s)}</text>`;
function arrow(x1, y1, x2, y2, cls, head = 7) {
  const a = Math.atan2(y2 - y1, x2 - x1), h1 = [x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45)], h2 = [x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45)];
  return `<line x1="${x1}" y1="${y1}" x2="${x2 - 0.6 * head * Math.cos(a)}" y2="${y2 - 0.6 * head * Math.sin(a)}" class="${cls}"/><polygon points="${x2},${y2} ${h1} ${h2}" class="${cls} pg-head"/>`;
}
const hatchH = (x1, y, x2, up = true) => { let s = `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="pg-ground"/>`; for (let x = x1 + 3; x <= x2; x += 6) s += `<line x1="${x}" y1="${y}" x2="${x - 5}" y2="${y + (up ? -6 : 6)}" class="pg-ground"/>`; return s; };
const field = (f, label, v, unit, extra = '') => `<label><span>${esc(label)} ${unit ? ltr(`[${unit}]`) : ''}</span><input type="number" inputmode="decimal" step="any" data-f="${f}" value="${Math.round(v * 1000) / 1000}" ${extra}></label>`;
const chips = (items, cur, act) => `<div class="chips">${items.map(([v, t]) => `<button class="chip" data-act="${act}" data-v="${v}" aria-pressed="${String(cur) === String(v)}">${t}</button>`).join('')}</div>`;
const ropeStyle = (T, Tmax) => { const r = Tmax > 0 ? Math.max(0, T) / Tmax : 0; return `stroke-width="${(1.6 + 3.2 * r).toFixed(2)}" stroke-opacity="${(0.45 + 0.55 * r).toFixed(2)}"`; };

// =====================================================================
// hoist
const PX_PER_M = 90; // rope pulled: 90 px = 1 m
function hoistSolve() { const h = st.hoist; return tackle({ n: h.n, m: h.m, mb: h.mb, eta: h.eta, pull: h.pull, dir: h.dir }); }
function hoistSvg(t) {
  const h = st.hoist, Lc = t.lines.length, gap = 22, r = 11;
  const x = (j) => W / 2 - ((Lc - 1) * gap) / 2 + j * gap + (h.pull === 'up' ? 18 : 0);
  const Yc = 16, Yf = 58, rise = h.p / h.n, Ym = 172 - rise;
  const Tmax = Math.max(...t.lines);
  let s = `<svg viewBox="0 0 ${W} 300" class="pg-svg" id="pgHoist" role="img" aria-label="מערכת גלגלות להרמה">`;
  s += hatchH(40, Yc, W - 40, true);
  // which line touches which block at its ends
  const top = [], bot = [];
  for (let j = 0; j < Lc; j++) {
    const before = t.sheaves[j - 1], after = t.sheaves[j];
    const kinds = [before, after].filter(Boolean);
    top[j] = kinds.includes('fixed') ? Yf : null; bot[j] = kinds.includes('moving') ? Ym : null;
  }
  const last = Lc - 1, eff = 0;
  // dead end
  if (t.deadEnd === 'fixed') top[last] = t.fixedCount ? Yf + 13 : Yc; else bot[last] = t.movingCount ? Ym + 13 : Ym;
  // effort end
  // the hand moves by the rope pulled (p), the load by p/n
  const handDown = h.pull === 'down';
  if (handDown) bot[eff] = 186 + h.p; else { top[eff] = 112 - h.p; if (Lc === 1) bot[0] = Ym; }
  // blocks
  const fx = t.sheaves.map((k, j) => (k === 'fixed' ? (x(j) + x(j + 1)) / 2 : null)).filter((v) => v != null);
  const mx = t.sheaves.map((k, j) => (k === 'moving' ? (x(j) + x(j + 1)) / 2 : null)).filter((v) => v != null);
  if (t.deadEnd === 'fixed' && t.fixedCount) fx.push(x(last));
  if (t.deadEnd === 'moving' && t.movingCount) mx.push(x(last));
  if (t.fixedCount) {
    const a = Math.min(...fx) - 14, b = Math.max(...fx) + 14;
    s += `<line x1="${(a + b) / 2}" y1="${Yc}" x2="${(a + b) / 2}" y2="${Yf - 13}" class="pg-strap"/><rect x="${a}" y="${Yf - 13}" width="${b - a}" height="26" rx="6" class="pg-block"/>`;
  }
  let boxX;
  if (t.movingCount) {
    const a = Math.min(...mx) - 14, b = Math.max(...mx) + 14; boxX = (a + b) / 2;
    s += `<rect x="${a}" y="${Ym - 13}" width="${b - a}" height="26" rx="6" class="pg-block"/><line x1="${boxX}" y1="${Ym + 13}" x2="${boxX}" y2="${Ym + 24}" class="pg-strap"/>`;
  } else boxX = x(last);
  const boxTop = t.movingCount ? Ym + 24 : Ym;
  s += `<rect x="${boxX - 32}" y="${boxTop}" width="64" height="40" rx="4" class="pg-mass"/>${text(boxX, boxTop + 25, `${num(h.m)} kg`)}`;
  // rope lines and sheaves
  t.lines.forEach((T, j) => {
    const y1 = top[j] ?? Yc, y2 = bot[j] ?? Ym;
    s += `<line x1="${x(j)}" y1="${y1}" x2="${x(j)}" y2="${y2}" class="pg-rope" ${ropeStyle(T, Tmax)}/>`;
  });
  t.sheaves.forEach((k, j) => {
    const cx = (x(j) + x(j + 1)) / 2, cy = k === 'fixed' ? Yf : Ym, T = (t.lines[j] + t.lines[j + 1]) / 2;
    const arc = k === 'fixed' ? `M${x(j)},${cy} A${r},${r} 0 0 1 ${x(j + 1)},${cy}` : `M${x(j)},${cy} A${r},${r} 0 0 0 ${x(j + 1)},${cy}`;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" class="pg-sheave"/><circle cx="${cx}" cy="${cy}" r="2.2" class="pg-axle"/><path d="${arc}" class="pg-rope pg-nofill" ${ropeStyle(T, Tmax)}/>`;
  });
  // segment numbers (match the table in the results)
  t.lines.forEach((T, j) => { const y1 = top[j] ?? Yc, y2 = bot[j] ?? Ym; s += text(x(j), (y1 + y2) / 2 + 4 + (j % 2 ? 14 : -14), String(j + (handDown ? 0 : 1)), 'pg-tn'); });
  // hand (effort) with a drag handle
  const xh = x(eff), yh = handDown ? bot[eff] : top[eff];
  s += `<g data-hand="1"><circle cx="${xh}" cy="${yh}" r="26" class="pg-hit"/><circle cx="${xh}" cy="${yh}" r="7" class="pg-handle"/></g>`;
  s += handDown ? arrow(xh, yh + 6, xh, yh + 30, 'pg-load') : arrow(xh, yh - 6, xh, yh - 28, 'pg-load');
  s += text(xh - 12, handDown ? yh + 22 : yh - 12, QUIZ ? 'F = ?' : `F = ${num(t.F)} N`, 'pg-tl', 'end');
  if (!QUIZ) s += `<text x="${W - 10}" y="292" direction="rtl" text-anchor="start" class="pg-t pg-tm">משכת ⁦${num(h.p / PX_PER_M)} m⁩ חבל · המשא עלה ⁦${num(h.p / PX_PER_M / h.n)} m⁩</text>`;
  return s + '</svg>';
}
function hoistEditor() {
  const h = st.hoist;
  return `<h3 class="pg-h">מערכת ההרמה</h3>
    <div class="pg-stepper"><span>קטעי חבל שנושאים את המשא</span><div><button class="btn" data-act="n" data-v="-1" aria-label="פחות">−</button><b id="pgN">${h.n}</b><button class="btn" data-act="n" data-v="1" aria-label="יותר">+</button></div></div>
    ${chips([['down', 'משיכה למטה (דרך גלגלת קבועה)'], ['up', 'משיכה למעלה (מהבלוק הנע)']], h.pull, 'pull')}
    <div style="height:8px"></div>${chips([['lift', 'הרמה'], ['lower', 'הורדה']], h.dir, 'dir')}
    <div class="pg-form">${field('m', 'מסת המשא', h.m, 'kg')}${field('mb', 'מסת הבלוק הנע', h.mb, 'kg')}${field('eta', 'יעילות לכל גלגלת η', h.eta, '', 'min="0.5" max="1" step="0.01"')}</div>
    <p class="small muted">גרור את העיגול הכתום (היד) כדי למשוך חבל ולראות כמה המשא עולה. η טיפוסי: 0.95 עד 0.98 לגלגלת עם מיסב.</p>`;
}
function hoistResults(t) {
  const h = st.hoist;
  const rows = t.lines.map((T, j) => `<tr><td>${j + (h.pull === 'down' ? 0 : 1)}</td><td>${j === 0 ? 'יד (משיכה)' : 'נושא'}</td><td>${ltr(`${num(T)} N`)}</td></tr>`).join('');
  return `<div class="pg-max">
      <div><span>כוח משיכה F</span><b>${ltr(`${num(t.F)} N`)}</b></div>
      <div><span>אידיאלי (בלי חיכוך) W/n</span><b>${ltr(`${num(t.ideal)} N`)}</b></div>
      <div><span>יתרון מכני MA = W/F</span><b>${ltr(num(t.MA))}</b></div>
      <div><span>יחס מהירויות VR</span><b>${ltr(String(t.VR))}</b></div>
      <div><span>יעילות המערכת MA/VR</span><b>${ltr(`${num(100 * t.efficiency)}%`)}</b></div>
      <div><span>חבל למטר הרמה</span><b>${ltr(`${t.ropePerMeter} m`)}</b></div>
      <div><span>כוח על התקרה</span><b>${ltr(`${num(t.ceiling)} N`)}</b></div>
      <div><span>משקל כולל W</span><b>${ltr(`${num(t.W)} N`)}</b></div>
    </div>
    <h3 class="pg-h">מתיחות בכל קטע</h3>
    <table class="pg-table"><thead><tr><th>#</th><th>קטע</th><th>מתיחות</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="small muted">${h.dir === 'lift' ? 'בהרמה כל גלגלת מוסיפה חיכוך, ולכן הקטע הקרוב ליד מתוח יותר. היעילות הכוללת קטנה מ-η של גלגלת אחת.' : 'בהורדה החיכוך עוזר להחזיק את המשא, ולכן צריך פחות כוח מהאידיאלי.'} ${h.pull === 'down' ? 'משיכה למטה נוחה, אבל התקרה נושאת גם את F.' : 'במשיכה למעלה קטע היד עצמו נושא חלק מהמשא.'}</p>`;
}

// =====================================================================
// connected bodies
const C = { x: W / 2, y: 64 }, PR = 14;
function geomSide(sd, sg) {
  const t = sd.kind === 'hang' ? Math.PI / 2 : sd.kind === 'table' ? 0 : (sd.theta * Math.PI) / 180;
  const d = [sg * Math.cos(t), Math.sin(t)], n = [sg * Math.sin(t), -Math.cos(t)];
  const P0 = [C.x + PR * n[0], C.y + PR * n[1]];
  const D = sd.kind === 'hang' ? 78 : 96;
  const B = [P0[0] + d[0] * D, P0[1] + d[1] * D];
  return { t, d, n, P0, B, D };
}
function connSvg(res) {
  const { left, right } = st.conn;
  let s = `<svg viewBox="0 0 ${W} 250" class="pg-svg" id="pgConn" role="img" aria-label="שתי מסות מחוברות בחבל דרך גלגלת">`;
  const parts = [[left, -1, 'L'], [right, 1, 'R']].map(([sd, sg, k]) => ({ sd, sg, k, g: geomSide(sd, sg) }));
  // supports (table / incline bodies)
  parts.forEach(({ sd, g, k }) => {
    if (sd.kind === 'hang') return;
    const q0 = [g.P0[0] - g.n[0] * 12, g.P0[1] - g.n[1] * 12], q1 = [q0[0] + g.d[0] * (g.D + 56), q0[1] + g.d[1] * (g.D + 56)];
    s += `<polygon points="${q0} ${q1} ${q1[0]},244 ${q0[0]},244" class="pg-solid"/><line x1="${q0[0]}" y1="${q0[1]}" x2="${q1[0]}" y2="${q1[1]}" class="pg-surface"/>`;
    if (sd.kind === 'incline') {
      s += `<g data-angle="${k}"><circle cx="${q1[0]}" cy="${q1[1]}" r="26" class="pg-hit"/><circle cx="${q1[0]}" cy="${q1[1]}" r="6.5" class="pg-handle"/></g>`;
      const ax = q1[0] - g.d[0] * 34, ay = q1[1];
      s += text(ax + (g.d[0] > 0 ? -6 : 6), ay - 4, `${num(sd.theta)}°`, 'pg-tm', g.d[0] > 0 ? 'end' : 'start');
    }
  });
  if (left.kind === 'hang' && right.kind === 'hang') s += hatchH(C.x - 40, 18, C.x + 40, true) + `<line x1="${C.x}" y1="18" x2="${C.x}" y2="${C.y}" class="pg-strap"/>`;
  else s += `<line x1="${C.x}" y1="${C.y}" x2="${C.x}" y2="${C.y + 24}" class="pg-strap"/>`;
  const Tm = Math.max(1e-9, res.TL ?? res.Tmax ?? 0, res.TR ?? res.Tmax ?? 0);
  // ropes and labels
  parts.forEach(({ g, k }) => {
    const T = k === 'L' ? (res.TL ?? (res.Tmin + res.Tmax) / 2) : (res.TR ?? (res.Tmin + res.Tmax) / 2);
    s += `<line x1="${g.P0[0]}" y1="${g.P0[1]}" x2="${g.B[0]}" y2="${g.B[1]}" class="pg-rope" ${ropeStyle(T, Tm)}/>`;
    const mxp = (g.P0[0] + g.B[0]) / 2 + g.n[0] * 14, myp = (g.P0[1] + g.B[1]) / 2 + g.n[1] * 14 + 4;
    const lab = QUIZ ? 'T' : res.moving || res.unique ? `T = ${num(T)} N` : `T ${num(res.Tmin)}…${num(res.Tmax)} N`;
    s += text(Math.min(W - 40, Math.max(40, mxp)), Math.max(12, myp), lab, 'pg-tr');
  });
  s += `<path d="M${parts[0].g.P0} A${PR},${PR} 0 0 1 ${parts[1].g.P0}" class="pg-rope pg-nofill" stroke-width="2"/>`;
  s += `<circle cx="${C.x}" cy="${C.y}" r="${PR}" class="pg-sheave"/><circle cx="${C.x}" cy="${C.y}" r="2.5" class="pg-axle"/>`;
  // blocks and motion arrows
  parts.forEach(({ sd, g, k, sg }) => {
    const w = 40, hgt = 28, rot = sd.kind === 'hang' ? 0 : (sg * g.t * 180) / Math.PI;
    const cx = g.B[0] + g.d[0] * (sd.kind === 'hang' ? hgt / 2 : w / 2), cy = g.B[1] + g.d[1] * (sd.kind === 'hang' ? hgt / 2 : w / 2);
    s += `<g transform="translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${rot.toFixed(1)})"><rect x="${-w / 2}" y="${-hgt / 2}" width="${w}" height="${hgt}" rx="4" class="pg-mass"/></g>`;
    s += text(cx, cy + 4, `${num(sd.m)} kg`);
    if (res.moving && !QUIZ) {
      const away = k === 'R' ? res.dir : -res.dir; // +1: this body moves away from the pulley
      const ex = cx + g.d[0] * away * 46, ey = cy + g.d[1] * away * 46;
      const ox = sd.kind === 'hang' ? (k === 'R' ? 30 : -30) : -g.n[0] * 22, oy = sd.kind === 'hang' ? 0 : -g.n[1] * 22;
      s += arrow(cx + ox, cy + oy, ex + ox, ey + oy, 'pg-accel', 6);
    }
  });
  if (res.moving && !QUIZ) s += text(W / 2, 244, `a = ${num(Math.abs(res.a))} m/s²`, 'pg-ta');
  return s + '</svg>';
}
function sideEditor(k) {
  const sd = st.conn[k === 'L' ? 'left' : 'right'];
  return `<div class="pg-side"><h3 class="pg-h">${k === 'L' ? 'צד שמאל' : 'צד ימין'}</h3>
    ${chips(Object.entries(SIDE_KIND), sd.kind, `kind${k}`)}
    <div class="pg-form">${field(`m${k}`, 'מסה', sd.m, 'kg')}${sd.kind === 'incline' ? field(`th${k}`, 'זווית θ', sd.theta, '°') : ''}
    ${sd.kind !== 'hang' ? field(`mus${k}`, 'חיכוך סטטי μs', sd.mus, '') + field(`muk${k}`, 'חיכוך קינטי μk', sd.muk, '') : ''}</div></div>`;
}
function connEditor() {
  return `${sideEditor('L')}${sideEditor('R')}<div class="pg-form">${field('mp', 'מסת הגלגלת (דיסקה)', st.conn.mp, 'kg')}</div>
    <p class="small muted">גרור את העיגול שבקצה המדרון כדי לשנות את הזווית. גלגלת עם מסה "גוזלת" חלק מהכוח לסיבוב: ${ltr('I/r² = m_p/2')}.</p>`;
}
function connResults(res) {
  const { left, right } = st.conn;
  let status;
  if (!res.moving) status = '<div class="pg-status good">● במנוחה: החיכוך הסטטי מחזיק</div>';
  else status = `<div class="pg-status warn">${res.dir > 0 ? '→ הצד הימני יורד' : '← הצד השמאלי יורד'}</div>`;
  if (res.slack) status += '<p class="small" style="color:var(--bad)">⚠ החבל רפוי בצד אחד: ההנחה של חבל מתוח לא מתקיימת.</p>';
  const fr = (f, sd, N) => (sd.kind === 'hang' ? '—' : `${ltr(`${num(Math.abs(f ?? NaN))} N`)} <small class="muted">${res.moving ? '(קינטי)' : `(מתוך ${ltr(`${num(sd.mus * N)} N`)} אפשריים)`}</small>`);
  const tBlock = res.moving || res.unique
    ? `<div><span>מתיחות בצד שמאל</span><b>${ltr(`${num(res.TL)} N`)}</b></div><div><span>מתיחות בצד ימין</span><b>${ltr(`${num(res.TR)} N`)}</b></div>`
    : `<div style="grid-column:1/-1"><span>מתיחות (לא נקבעת ביחידות)</span><b>${ltr(`${num(res.Tmin)} … ${num(res.Tmax)} N`)}</b></div>`;
  return `${status}<div class="pg-max">
      <div><span>תאוצה</span><b>${ltr(`${num(Math.abs(res.a))} m/s²`)}</b></div>
      <div><span>מהירות אחרי 1 m</span><b>${ltr(`${num(Math.sqrt(2 * Math.abs(res.a)))} m/s`)}</b></div>
      ${tBlock}
      <div><span>נורמלי שמאל</span><b>${ltr(`${num(res.NL)} N`)}</b></div>
      <div><span>נורמלי ימין</span><b>${ltr(`${num(res.NR)} N`)}</b></div>
      <div><span>חיכוך שמאל</span><b>${fr(res.fL, left, res.NL)}</b></div>
      <div><span>חיכוך ימין</span><b>${fr(res.fR, right, res.NR)}</b></div>
    </div>
    <p class="small muted">כוח מניע: ${ltr(`${num(Math.abs(res.drive))} N`)} מול חיכוך סטטי מרבי ${ltr(`${num(res.Fs)} N`)}. ${res.moving ? `תאוצה: ${ltr('a = (F_drive − F_k)/(m₁ + m₂ + m_p/2)')}.` : res.unique ? '' : 'יש חיכוך בשני הצדדים, ולכן אפשר לחלק אותו ביניהם בכמה דרכים: זו בעיה לא מסוימת.'}</p>
    <p class="small muted">הנחות: חבל חסר מסה ולא נמתח, מסב הגלגלת בלי חיכוך, ${ltr('g = 9.81 m/s²')}.</p>`;
}

// =====================================================================
export function renderPulleys(root, { toast }) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>🪢 גלגלות וחבלים</h2>
      ${chips([['hoist', 'מערכת הרמה'], ['conn', 'מסות מחוברות']], st.sub, 'sub')}
      <div class="pg-templates" id="pgConnTpl" ${st.sub === 'conn' ? '' : 'hidden'}>${CONN_TPL.map((t) => `<button class="chip" data-tpl="${t.id}">${esc(t.name)}</button>`).join('')}</div></div>
    <div class="card pg-stage"><div id="pgPulCanvas"></div></div>
    <div class="card" id="pgPulEdit"></div>
    <div class="card" id="pgPulResults"></div>`;
  const cv = root.querySelector('#pgPulCanvas'), ed = root.querySelector('#pgPulEdit'), out = root.querySelector('#pgPulResults');
  const live = () => {
    if (st.sub === 'hoist') { const t = hoistSolve(); cv.innerHTML = hoistSvg(t); out.innerHTML = hoistResults(t); }
    else { const r = connected(st.conn); cv.innerHTML = connSvg(r); out.innerHTML = connResults(r); }
  };
  const all = () => { live(); ed.innerHTML = st.sub === 'hoist' ? hoistEditor() : connEditor(); root.querySelector('#pgConnTpl').hidden = st.sub !== 'conn'; };
  all();

  root.addEventListener('click', (ev) => {
    const tp = ev.target.closest('[data-tpl]');
    if (tp) { st.conn = CONN_TPL.find((q) => q.id === tp.dataset.tpl).make(); save(); all(); return; }
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act, v = b.dataset.v, h = st.hoist;
    if (a === 'sub') { st.sub = v; root.querySelectorAll('[data-act="sub"]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.v === v))); }
    else if (a === 'n') { h.n = Math.min(6, Math.max(1, h.n + Number(v))); h.p = 0; }
    else if (a === 'pull') { h.pull = v; h.p = 0; }
    else if (a === 'dir') h.dir = v;
    else if (a === 'kindL' || a === 'kindR') {
      const sd = st.conn[a === 'kindL' ? 'left' : 'right']; sd.kind = v;
      if (v === 'table' || v === 'incline') { if (!sd.mus && !sd.muk) { sd.mus = 0.3; sd.muk = 0.2; } }
    } else return;
    save(); all();
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!f) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    const h = st.hoist, c = st.conn;
    if (st.sub === 'hoist') {
      if (f === 'eta') { if (v < 0.5 || v > 1) return; h.eta = v; } else if (v >= 0 && (f === 'm' || f === 'mb')) { if (f === 'm' && v <= 0) return; h[f] = v; } else return;
    } else {
      const k = f.endsWith('L') ? 'left' : f.endsWith('R') ? 'right' : null;
      if (f === 'mp') { if (v < 0) return; c.mp = v; }
      else if (f.startsWith('m') && !f.startsWith('mu')) { if (v <= 0) return; c[k].m = v; }
      else if (f.startsWith('th')) { if (v < 1 || v > 89) return; c[k].theta = v; }
      else if (f.startsWith('mus')) { if (v < 0) return; c[k].mus = v; if (c[k].muk > v) c[k].muk = v; }
      else if (f.startsWith('muk')) { if (v < 0) return; c[k].muk = Math.min(v, c[k].mus); }
      else return;
    }
    save(); live();
  });
  ed.addEventListener('change', () => { ed.innerHTML = st.sub === 'hoist' ? hoistEditor() : connEditor(); });

  // drags: the hand (hoist) and incline angle handles (connected bodies)
  let drag = null;
  const pt = (ev) => { const svg = cv.querySelector('svg'), p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
  cv.addEventListener('pointerdown', (ev) => {
    const hand = ev.target.closest('[data-hand]'), ang = ev.target.closest('[data-angle]');
    if (!hand && !ang) return;
    ev.preventDefault();
    drag = { pid: ev.pointerId, hand: !!hand, side: ang?.dataset.angle, y0: pt(ev).y, p0: st.hoist.p };
    try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
    if (!sessionGet('pgPulHint')) { toast(hand ? `משוך את היד: על כל מטר חבל המשא עולה רק 1/n מטר` : 'גרור למעלה או למטה כדי לשנות את הזווית'); sessionSet('pgPulHint'); }
  });
  cv.addEventListener('pointermove', (ev) => {
    if (!drag || ev.pointerId !== drag.pid) return;
    const p = pt(ev);
    if (drag.hand) {
      const dy = p.y - drag.y0, h = st.hoist;
      const maxP = h.pull === 'down' ? 80 : 74; // keeps the hand inside the drawing; the load rises p/n
      h.p = Math.max(0, Math.min(maxP, drag.p0 + (h.pull === 'down' ? dy : -dy)));
    } else {
      const sd = st.conn[drag.side === 'L' ? 'left' : 'right'], g = geomSide(sd, drag.side === 'L' ? -1 : 1);
      const q0 = [g.P0[0] - g.n[0] * 12, g.P0[1] - g.n[1] * 12];
      const th = (Math.atan2(p.y - q0[1], Math.abs(p.x - q0[0])) * 180) / Math.PI;
      sd.theta = Math.round(Math.min(80, Math.max(5, th)));
    }
    live();
  });
  const end = (ev) => { if (!drag || ev.pointerId !== drag.pid) return; drag = null; save(); all(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
}
function sessionGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return '1'; } }
function sessionSet(k) { try { sessionStorage.setItem(k, '1'); } catch (e) { /* ignore */ } }
export { G, sideGeom };

// static picture of a pulley scene for a saved question
export function pulleySnapshot(scene) {
  const prev = st; st = JSON.parse(JSON.stringify(scene)); st.hoist.p = 0; QUIZ = true;
  try { return st.sub === 'hoist' ? hoistSvg(hoistSolve()) : connSvg(connected(st.conn)); } finally { st = prev; QUIZ = false; }
}
export const pulleyScene = () => st;
