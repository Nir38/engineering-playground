// playground-air.js: the playground's wing mode. Ideal flow around a Joukowski airfoil (js/airfoil.js):
// pressure map, moving streamlines, lift, and the pressure distribution along the chord.
import { makeAirfoil, paramsFrom, RHO_AIR } from './airfoil.js';
import { esc } from './text.js';

const KEY = 'mh-pg-air-v1';
const W = 360, H = 230, S = 50; // drawing: 1 unit = S px; the chord is about 4 units
const MU_AIR = 1.789e-5; // Pa·s, ISA sea level
const PRESETS = [
  { id: 'cam', name: 'כנף קמורה', set: { tc: 0.12, fc: 0.04, aoa: 4 } },
  { id: 'sym', name: 'כנף סימטרית', set: { tc: 0.12, fc: 0, aoa: 5 } },
  { id: 'thin', name: 'דקה, כמו מפרש', set: { tc: 0.04, fc: 0.03, aoa: 3 } },
  { id: 'high', name: 'זווית גבוהה', set: { tc: 0.12, fc: 0.04, aoa: 15 } },
  { id: 'race', name: 'כנף מכונית מירוץ', set: { tc: 0.12, fc: -0.04, aoa: -6, V: 60, c: 0.3 } },
];
const defaults = () => ({ tc: 0.12, fc: 0.04, aoa: 4, V: 50, c: 1.5 });
let st = null;
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') for (const k of Object.keys(st)) if (Number.isFinite(s[k])) st[k] = s[k]; } catch (e) { /* ignore */ }
  clampAll();
}
const LIM = { aoa: [-10, 18], tc: [0.02, 0.2], fc: [-0.08, 0.08], V: [5, 90], c: [0.2, 3] };
function clampAll() { for (const [k, [a, b]] of Object.entries(LIM)) st[k] = Math.min(b, Math.max(a, st[k])); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };

const num = (n, d = 3) => {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) < 1e-9) return '0';
  const s = Number(n.toPrecision(d)); return Math.abs(s) >= 1e4 ? s.toLocaleString('en-US') : String(s);
};
const ltr = (s) => `<span class="ltr">${esc(s)}</span>`;
const deg = (r) => (r * 180) / Math.PI;

// the wing for the current sliders: α in the slider is measured from the chord line
function build() {
  const p = paramsFrom(st.tc, st.fc);
  const shape = makeAirfoil({ ...p, alphaDeg: 0 });
  const phi = deg(Math.atan2(shape.te[1] - shape.le.y, shape.te[0] - shape.le.x)); // chord angle in the model plane
  const a = makeAirfoil({ ...p, alphaDeg: st.aoa + phi });
  a.phiDeg = phi; a.aoa0 = a.alpha0Deg - phi; // zero-lift angle, from the chord
  return a;
}

function colors() {
  const cs = getComputedStyle(document.documentElement), g = (k, f) => (cs.getPropertyValue(k) || '').trim() || f;
  return { text: g('--text', '#111'), muted: g('--muted', '#666'), load: g('--load', '#c2410c'), good: g('--good', '#15803d'), surf: g('--surface-2', '#eee'), accent: g('--accent', '#0f766e') };
}

export function renderAir(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>✈ כנף וזרימת אוויר</h2><p class="small muted">זרימה אידאלית סביב כנף Joukowski: מפת לחץ, קווי זרימה שזזים, ועילוי מחושב מ-Kutta–Joukowski.</p>
      <div class="pg-templates">${PRESETS.map((q) => `<button class="chip" data-preset="${q.id}">${esc(q.name)}</button>`).join('')}</div></div>
    <div class="card pg-stage"><canvas id="pgAirCanvas" class="pg-air-cv" aria-label="כנף בזרימת אוויר: מפת לחץ וקווי זרימה" role="img"></canvas>
      <p class="small muted pg-hint">כחול = לחץ נמוך (יניקה), אדום = לחץ גבוה. הנקודות יוצאות יחד בטורים: מעל הכנף הן מקדימות, כי שם האוויר מהיר יותר. גרור למעלה או למטה על השרטוט כדי לשנות את זווית ההתקפה.</p></div>
    <div class="card" id="pgAirEdit"></div>
    <div class="card" id="pgAirRes"></div>`;
  const cv = root.querySelector('#pgAirCanvas'), ed = root.querySelector('#pgAirEdit'), out = root.querySelector('#pgAirRes');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const heat = document.createElement('canvas'), CELL = 3; heat.width = Math.ceil(W / CELL); heat.height = Math.ceil(H / CELL);
  let a = null, rot = [1, 0], lines = [], body = [], col = colors(), raf = 0;

  // drawing frame: the model plane turned by −α so that the wind blows from the left, level
  const toD = (x, y) => [x * rot[0] + y * rot[1], -x * rot[1] + y * rot[0]];
  const fromD = (x, y) => [x * rot[0] - y * rot[1], x * rot[1] + y * rot[0]];
  const scr = ([x, y]) => [W / 2 + x * S, H / 2 - y * S];

  function rebuild() {
    a = build(); rot = [Math.cos(a.alpha), Math.sin(a.alpha)]; col = colors();
    // pressure map
    const hc = heat.getContext('2d'), img = hc.createImageData(heat.width, heat.height);
    for (let j = 0; j < heat.height; j++) for (let i = 0; i < heat.width; i++) {
      const X = ((i + 0.5) * CELL - W / 2) / S, Y = (H / 2 - (j + 0.5) * CELL) / S, cp = a.cpAt(fromD(X, Y)), o = 4 * (j * heat.width + i);
      if (cp == null) continue;
      const [r, gg, b, al] = cp < 0 ? [59, 130, 246, Math.min(1, -cp / 1.6)] : [239, 68, 68, Math.min(1, cp)];
      img.data[o] = r; img.data[o + 1] = gg; img.data[o + 2] = b; img.data[o + 3] = Math.round(200 * al);
    }
    hc.putImageData(img, 0, 0);
    // streamlines from a line far upstream (drawing frame)
    lines = [];
    for (let k = -7; k <= 7; k++) {
      const z0 = fromD(-4.6, k * 0.3), zeta0 = a.inverse(z0); if (!zeta0) continue;
      const pts = a.streamline(zeta0, { h: 0.04, box: [-4.6, 4.6, -3, 3], maxSteps: 900 }).map(([x, y, t]) => [...scr(toD(x, y)), t]);
      lines.push(pts);
    }
    body = a.outline.map((p) => scr(toD(p.x, p.y)));
  }
  const at = (pts, t) => { // position along a streamline at time t
    let lo = 0, hi = pts.length - 1; if (t <= pts[0][2] || t >= pts[hi][2]) return null;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m][2] <= t) lo = m; else hi = m; }
    const p = pts[lo], q = pts[hi], f = (t - p[2]) / (q[2] - p[2] || 1); return [p[0] + f * (q[0] - p[0]), p[1] + f * (q[1] - p[1])];
  };
  function arrow(x1, y1, x2, y2, color, w = 2.4) {
    const an = Math.atan2(y2 - y1, x2 - x1), h = 8;
    g.strokeStyle = color; g.fillStyle = color; g.lineWidth = w;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2 - 0.6 * h * Math.cos(an), y2 - 0.6 * h * Math.sin(an)); g.stroke();
    g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - h * Math.cos(an - 0.45), y2 - h * Math.sin(an - 0.45)); g.lineTo(x2 - h * Math.cos(an + 0.45), y2 - h * Math.sin(an + 0.45)); g.closePath(); g.fill();
  }
  function draw(now) {
    g.clearRect(0, 0, W, H);
    g.imageSmoothingEnabled = true; g.drawImage(heat, 0, 0, heat.width * CELL, heat.height * CELL);
    // streamlines
    g.lineWidth = 1; g.strokeStyle = col.muted; g.globalAlpha = 0.55;
    for (const pts of lines) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
    g.globalAlpha = 1;
    // moving dots: one every τ time units, all starting together far upstream
    const tau = 0.45, phase = ((now / 1000) * 0.7) % tau; g.fillStyle = col.text;
    for (const pts of lines) for (let t = phase; t < pts[pts.length - 1][2]; t += tau) { const p = at(pts, t); if (p) { g.beginPath(); g.arc(p[0], p[1], 1.7, 0, 7); g.fill(); } }
    // the wing
    g.beginPath(); body.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    g.fillStyle = col.surf; g.fill(); g.lineWidth = 1.6; g.strokeStyle = col.text; g.stroke();
    // chord line and the angle of attack, at the trailing edge
    const L = scr(toD(a.le.x, a.le.y)), T = scr(toD(a.te[0], a.te[1]));
    g.setLineDash([4, 3]); g.lineWidth = 1; g.strokeStyle = col.load;
    const cl = Math.hypot(T[0] - L[0], T[1] - L[1]), ux = (T[0] - L[0]) / cl, uy = (T[1] - L[1]) / cl;
    g.beginPath(); g.moveTo(L[0], L[1]); g.lineTo(T[0] + 46 * ux, T[1] + 46 * uy); g.stroke();
    g.beginPath(); g.moveTo(T[0], T[1]); g.lineTo(T[0] + 50, T[1]); g.stroke(); g.setLineDash([]);
    if (Math.abs(st.aoa) >= 0.5) {
      const ca = Math.atan2(uy, ux); g.beginPath(); g.arc(T[0], T[1], 34, Math.min(0, ca), Math.max(0, ca)); g.stroke();
      g.fillStyle = col.load; g.font = 'bold 12px system-ui, sans-serif'; g.textAlign = 'left';
      g.fillText(`α=${num(st.aoa)}°`, Math.min(W - 52, T[0] + 38), T[1] + (ca > 0 ? 22 : -10));
    }
    // wind and lift
    arrow(8, H - 14, 52, H - 14, col.accent, 2); g.fillStyle = col.accent; g.font = 'bold 12px system-ui, sans-serif'; g.textAlign = 'left'; g.fillText(`V = ${num(st.V)} m/s`, 58, H - 10);
    const q = scr(toD(a.le.x + 0.25 * (a.te[0] - a.le.x), a.le.y + 0.25 * (a.te[1] - a.le.y))), len = Math.max(-80, Math.min(80, 40 * a.CL));
    if (Math.abs(len) > 4) { arrow(q[0], q[1], q[0], q[1] - len, col.good, 3); g.fillStyle = col.good; g.textAlign = 'right'; g.fillText(a.CL >= 0 ? 'L' : 'L (כלפי מטה)', q[0] - 6, q[1] - len + (len > 0 ? 10 : -2)); }
  }
  const loop = (now) => { if (!root.isConnected) return; draw(now); raf = requestAnimationFrame(loop); };

  const slider = (f, label, v, shown, min, max, step) => `<label class="pg-range"><span>${label} <b>${shown}</b></span><input type="range" data-f="${f}" min="${min}" max="${max}" step="${step}" value="${v}" aria-label="${esc(label.replace(/<[^>]+>/g, ''))}"></label>`;
  function editor() {
    return `<h3 class="pg-h">הכנף והזרימה</h3>
      ${slider('aoa', 'זווית התקפה α', st.aoa, ltr(`${num(st.aoa)}°`), LIM.aoa[0], LIM.aoa[1], 0.5)}
      ${slider('tc', 'עובי', st.tc, ltr(`t/c = ${Math.round(a.tc * 100)}%`), LIM.tc[0], LIM.tc[1], 0.01)}
      ${slider('fc', 'קימור', st.fc, ltr(`f/c = ${num(a.fc * 100, 2)}%`), LIM.fc[0], LIM.fc[1], 0.005)}
      ${slider('V', 'מהירות', st.V, ltr(`${num(st.V)} m/s = ${Math.round(st.V * 3.6)} km/h`), LIM.V[0], LIM.V[1], 1)}
      ${slider('c', 'אורך המיתר', st.c, ltr(`c = ${num(st.c)} m`), LIM.c[0], LIM.c[1], 0.1)}
      <p class="small muted">קימור שלילי = כנף הפוכה, כמו בכנף אחורית של מכונית מירוץ.</p>`;
  }
  function cpChart() {
    const w = 340, h = 150, x0 = 30, x1 = w - 8, y0 = 10, y1 = h - 22;
    const all = a.outline.map((p) => -p.cp), top = Math.max(1, Math.ceil(Math.max(...all))), bot = Math.min(-1, Math.floor(Math.min(...all)));
    const X = (x) => x0 + ((x - a.xmin) / (a.xmax - a.xmin)) * (x1 - x0), Y = (v) => y0 + ((top - v) / (top - bot)) * (y1 - y0);
    const path = (arr) => arr.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(-p.cp).toFixed(1)}`).join('');
    let s = `<svg viewBox="0 0 ${w} ${h}" class="pg-svg" role="img" aria-label="פילוג הלחץ לאורך המיתר">`;
    for (let v = bot; v <= top; v++) s += `<line x1="${x0}" x2="${x1}" y1="${Y(v)}" y2="${Y(v)}" class="pg-ruler" ${v ? 'stroke-dasharray="2 3"' : ''}/><text x="${x0 - 4}" y="${Y(v) + 4}" text-anchor="end" class="pg-t">${v}</text>`;
    s += `<path d="${path(a.upper)}" fill="none" stroke="#3b82f6" stroke-width="2"/><path d="${path(a.lower)}" fill="none" stroke="#ef4444" stroke-width="2"/>`;
    s += `<text x="${x0}" y="${h - 6}" class="pg-t">0</text><text x="${x1}" y="${h - 6}" text-anchor="end" class="pg-t">x/c = 1</text><text x="${(x0 + x1) / 2}" y="${h - 6}" text-anchor="middle" class="pg-t">−Cp</text>`;
    return s + '</svg>';
  }
  function results() {
    const q = 0.5 * RHO_AIR * st.V ** 2, Lp = q * st.c * a.CL, thin = 2 * Math.PI * ((st.aoa - a.aoa0) * Math.PI) / 180;
    const Re = (RHO_AIR * st.V * st.c) / MU_AIR, vmax = st.V * Math.sqrt(Math.max(0, 1 - a.cpMin));
    const stall = Math.abs(st.aoa) > 12;
    return `<h3 class="pg-h">תוצאות</h3>
      <div class="pg-max">
        <div><span>מקדם עילוי</span><b>${ltr(`C_L = ${num(a.CL)}`)}</b></div>
        <div><span>עילוי לכל מטר מוטה</span><b>${ltr(`${num(Lp)} N/m`)}</b><small class="muted">${Lp >= 0 ? 'כמו להרים' : 'לוחץ למטה כמו'} ${ltr(`${num(Math.abs(Lp) / 9.81)} kg`)}</small></div>
        <div><span>זווית בלי עילוי</span><b>${ltr(`α₀ = ${(Math.round(a.aoa0 * 10) / 10 || 0).toFixed(1)}°`)}</b></div>
        <div><span>מהירות מרבית על הכנף</span><b>${ltr(`${num(vmax)} m/s`)}</b></div>
      </div>
      ${stall ? `<p class="small" style="color:var(--bad)">⚠ בכנף אמיתית, בזוויות של בערך 12° עד 15° הזרימה מתנתקת מגב הכנף (stall) והעילוי צונח. המודל כאן אידאלי, בלי צמיגות, ולכן לא רואה את זה וממשיך להראות עילוי עולה.</p>` : ''}
      <p class="small">${ltr(`L' = ½ ρ V² c C_L`)}, עם ${ltr(`ρ = ${RHO_AIR} kg/m³`)} (אוויר בגובה פני הים, ב-${ltr('15 °C')}) ו-${ltr(`½ρV² = ${num(q)} Pa`)}.</p>
      <p class="small">תורת הכנף הדקה נותנת ${ltr(`C_L ≈ 2π(α − α₀) = ${num(thin)}`)}. העובי מוסיף עוד קצת עילוי, ולכן המודל המלא נותן ${ltr(num(a.CL))}.</p>
      <h3 class="pg-h">פילוג הלחץ לאורך המיתר</h3>${cpChart()}
      <p class="small muted">כחול = גב הכנף, אדום = בטן הכנף. נהוג לצייר ${ltr('−Cp')} כלפי מעלה, כך שיניקה נמצאת למעלה. השטח בין שני הקווים הוא העילוי. ${ltr('Cp = 1')} בנקודת העצירה באף.</p>
      <h3 class="pg-h">מה המודל לא רואה</h3>
      <p class="small muted">זו זרימה אידאלית, בלי צמיגות. לכן הגרר יוצא אפס (הפרדוקס של d'Alembert), ואין הזדקרות. בפועל ${ltr(`Re = ρVc/μ ≈ ${num(Re, 2)}`)}, ולכן יש שכבת גבול דקה שיוצרת גרר חיכוך. העילוי עד זוויות בינוניות קרוב מאוד למציאות.</p>`;
  }
  const refresh = (full = true) => { rebuild(); if (full) ed.innerHTML = editor(); else updateLabels(); out.innerHTML = results(); };
  function updateLabels() { // keep the slider being dragged; only change the shown values
    const tmp = document.createElement('div'); tmp.innerHTML = editor();
    const nb = tmp.querySelectorAll('.pg-range b'); ed.querySelectorAll('.pg-range b').forEach((b, i) => { b.innerHTML = nb[i].innerHTML; });
  }
  refresh(); raf = requestAnimationFrame(loop);

  root.addEventListener('click', (ev) => {
    const pr = ev.target.closest('[data-preset]'); if (!pr) return;
    Object.assign(st, defaults(), PRESETS.find((q) => q.id === pr.dataset.preset).set); clampAll(); save(); refresh();
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!f || !(f in LIM)) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    st[f] = v; clampAll(); save(); refresh(false);
  });
  // drag on the drawing: up = more angle of attack
  let drag = null;
  cv.addEventListener('pointerdown', (ev) => { ev.preventDefault(); drag = { y: ev.clientY, a0: st.aoa, id: ev.pointerId }; try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ } });
  cv.addEventListener('pointermove', (ev) => {
    if (!drag || ev.pointerId !== drag.id) return;
    const v = Math.round((drag.a0 + (drag.y - ev.clientY) / 6) * 2) / 2;
    if (v !== st.aoa) { st.aoa = v; clampAll(); refresh(false); const r = ed.querySelector('[data-f="aoa"]'); if (r) r.value = st.aoa; }
  });
  const end = (ev) => { if (!drag || ev.pointerId !== drag.id) return; drag = null; save(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  return () => cancelAnimationFrame(raf);
}
