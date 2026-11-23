// playground-vib.js: the playground's vibration stage. A hanging mass on a spring and a damper,
// moving in real time from the analytical solution (js/vibration.js, checked against RK4).
import { params, response, steady, magnification, transmissibility } from './vibration.js';
import { esc } from './text.js';

const KEY = 'mh-pg-vib-v1';
const W = 360, H = 262, YEQ = 112, MH = 36, MX0 = 28, MX1 = 112, PX0 = 132, PX1 = 350;
const PRESETS = [
  { id: 'free', name: 'בלי ריסון', set: { zeta: 0, force: false, x0: 50 } },
  { id: 'under', name: 'תת-קריטי', set: { zeta: 0.1, force: false, x0: 50 } },
  { id: 'crit', name: 'קריטי', set: { zeta: 1, force: false, x0: 50 } },
  { id: 'over', name: 'על-קריטי', set: { zeta: 2.5, force: false, x0: 50 } },
  { id: 'res', name: 'תהודה', set: { zeta: 0.05, force: true, r: 1, x0: 0 } },
  { id: 'iso', name: 'בידוד רעידות', set: { zeta: 0.1, force: true, r: 3, x0: 0 } },
];
const defaults = () => ({ m: 2, k: 200, c: 4, x0: 50, v0: 0, force: false, F0: 10, f: 1.5, speed: 1 });
let st = null;
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.m > 0 && s.k > 0) st = { ...defaults(), ...s }; } catch (e) { /* ignore */ }
  if (!st) st = defaults();
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };

const num = (n) => {
  if (!Number.isFinite(n)) return '∞';
  const a = Math.abs(n); if (a < 1e-9) return '0';
  const s = a >= 1000 ? n.toFixed(0) : a >= 100 ? n.toFixed(1) : a >= 10 ? n.toFixed(2) : n.toFixed(3);
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
};
const ltr = (s) => `<span class="ltr">${esc(s)}</span>`;
const text = (x, y, s, cls = '', anchor = 'middle') => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" class="pg-t ${cls}">${esc(s)}</text>`;
const field = (f, label, v, unit, extra = '') => `<label><span>${esc(label)} ${unit ? ltr(`[${unit}]`) : ''}</span><input type="number" inputmode="decimal" step="any" data-f="${f}" value="${Math.round(v * 10000) / 10000}" ${extra}></label>`;
const chips = (items, cur, act) => `<div class="chips">${items.map(([v, t]) => `<button class="chip" data-act="${act}" data-v="${v}" aria-pressed="${String(cur) === String(v)}">${t}</button>`).join('')}</div>`;
function arrow(x1, y1, x2, y2, cls, head = 7) {
  const a = Math.atan2(y2 - y1, x2 - x1), h1 = [x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45)], h2 = [x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45)];
  return `<line x1="${x1}" y1="${y1}" x2="${x2 - 0.6 * head * Math.cos(a)}" y2="${y2 - 0.6 * head * Math.sin(a)}" class="${cls}"/><polygon points="${x2},${y2} ${h1} ${h2}" class="${cls} pg-head"/>`;
}

const model = () => ({ m: st.m, k: st.k, c: st.c, x0: st.x0 / 1000, v0: st.v0, F0: st.force ? st.F0 : 0, w: 2 * Math.PI * st.f });
function scaleFor() { // px per metre so that the motion over the next ~10 s fits ±62 px
  const md = model(), p = params(md.m, md.k, md.c), T = Math.min(12, Math.max(10 * p.Tn, 2));
  let A = 1e-6; for (let i = 0; i <= 600; i++) A = Math.max(A, Math.abs(response((T * i) / 600, md).x));
  return 62 / A;
}
const windowFor = () => { const p = params(st.m, st.k, st.c); return Math.min(12, Math.max(1.5, 4 * p.Tn)); };

function spring(x, y1, y2) {
  const n = 9, w = 12, L = y2 - y1, lead = 8; let d = `M${x},${y1} L${x},${y1 + lead}`;
  for (let i = 0; i < n; i++) d += ` L${x + (i % 2 ? -w : w)},${y1 + lead + ((L - 2 * lead) * (i + 0.5)) / n}`;
  return `<path d="${d} L${x},${y2 - lead} L${x},${y2}" class="pg-spring"/>`;
}
function svg(t, S, hist) {
  const md = model(), p = params(md.m, md.k, md.c), x = response(t, md).x, clampPx = (v) => Math.max(-74, Math.min(74, v));
  const yTop = YEQ + clampPx(x * S), cx = (MX0 + MX1) / 2;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" id="pgVib" role="img" aria-label="מסה על קפיץ ומרסן עם גרף תזוזה בזמן">`;
  // ceiling, spring, damper
  s += `<line x1="${MX0 - 8}" y1="14" x2="${MX1 + 8}" y2="14" class="pg-ground"/>`;
  for (let xx = MX0 - 4; xx <= MX1 + 8; xx += 6) s += `<line x1="${xx}" y1="14" x2="${xx - 5}" y2="8" class="pg-ground"/>`;
  s += spring(MX0 + 20, 14, yTop);
  const dx = MX1 - 20;
  s += `<line x1="${dx}" y1="14" x2="${dx}" y2="34" class="pg-strap"/><path d="M${dx - 10},34 L${dx - 10},78 L${dx + 10},78 L${dx + 10},34" class="pg-dashpot"/>`;
  const piston = Math.min(74, Math.max(40, yTop - 32));
  s += `<line x1="${dx - 7}" y1="${piston}" x2="${dx + 7}" y2="${piston}" class="pg-strap"/><line x1="${dx}" y1="${piston}" x2="${dx}" y2="${yTop}" class="pg-strap"/>`;
  s += text(MX0 + 20 - 16, 44, 'k', 'pg-tm', 'end') + text(dx + 14, 60, 'c', 'pg-tm', 'start');
  // equilibrium line and the trace (pen at the mass, paper moving to the right)
  const yC = (xv) => YEQ + MH / 2 + clampPx(xv * S);
  s += `<line x1="${MX0 - 10}" y1="${YEQ + MH / 2}" x2="${PX1}" y2="${YEQ + MH / 2}" class="pg-guide"/>`;
  const win = windowFor();
  if (hist.length > 1) s += `<polyline points="${hist.map(([tt, xv]) => `${(PX0 + ((t - tt) / win) * (PX1 - PX0)).toFixed(1)},${yC(xv).toFixed(1)}`).join(' ')}" class="pg-trace"/>`;
  if (!md.F0 && p.zeta > 0 && p.zeta < 1) { // envelope of the free decay
    const A = Math.hypot(md.x0, (md.v0 + p.zeta * p.wn * md.x0) / p.wd);
    for (const sg of [1, -1]) {
      let pts = ''; for (let i = 0; i <= 40; i++) { const tt = t - (win * i) / 40; if (tt < 0) break; pts += `${(PX0 + ((t - tt) / win) * (PX1 - PX0)).toFixed(1)},${yC(sg * A * Math.exp(-p.zeta * p.wn * tt)).toFixed(1)} `; }
      if (pts) s += `<polyline points="${pts}" class="pg-env"/>`;
    }
  }
  s += `<line x1="${MX1}" y1="${yC(x)}" x2="${PX0}" y2="${yC(x)}" class="pg-pen"/><circle cx="${PX0}" cy="${yC(x)}" r="3" class="pg-pendot"/>`;
  // the mass and the driving force
  s += `<g data-mass="1"><rect x="${MX0 - 6}" y="${yTop - 8}" width="${MX1 - MX0 + 12}" height="${MH + 16}" class="pg-hit"/><rect x="${MX0}" y="${yTop}" width="${MX1 - MX0}" height="${MH}" rx="4" class="pg-mass"/>${text(cx, yTop + 23, `${num(st.m)} kg`)}</g>`;
  if (md.F0) {
    const Fv = md.F0 * Math.sin(md.w * t), L = 26 * (Fv / md.F0);
    // x and F are positive downward: a positive force points down, a negative one pushes up
    if (Math.abs(L) > 2) s += L > 0 ? arrow(cx, yTop + MH + 4, cx, yTop + MH + 4 + L, 'pg-load', 6) : arrow(cx, yTop + MH + 4 - L, cx, yTop + MH + 4, 'pg-load', 6);
    s += text(cx + 10, Math.min(H - 4, yTop + MH + 16), `F(t)`, 'pg-tl', 'start');
  }
  s += text(PX1, H - 6, `חלון ${num(win)} s · t = ${num(t)} s`, 'pg-tm', 'end');
  s += text(PX0 + 4, 16, `x = ${num(x * 1000)} mm`, 'pg-tv', 'start');
  return s + '</svg>';
}
function editor(playing) {
  const p = params(st.m, st.k, st.c);
  return `<div class="btn-row"><button class="btn primary" data-act="play">${playing ? '⏸ עצור' : '▶ נגן'}</button><button class="btn" data-act="reset">⟲ מההתחלה</button></div>
    ${chips([['1', 'מהירות רגילה'], ['0.25', 'הילוך איטי ×¼']], String(st.speed), 'speed')}
    <h3 class="pg-h">המערכת</h3><div class="pg-form">${field('m', 'מסה m', st.m, 'kg')}${field('k', 'קשיחות k', st.k, 'N/m')}${field('c', 'ריסון c', st.c, 'N·s/m')}${field('zeta', 'יחס ריסון ζ', p.zeta, '')}</div>
    ${chips([[0, 'ζ = 0'], [0.05, '0.05'], [0.2, '0.2'], [1, '1'], [2.5, '2.5']], Math.round(p.zeta * 1000) / 1000, 'zeta')}
    <h3 class="pg-h">תנאי התחלה</h3><div class="pg-form">${field('x0', 'תזוזה התחלתית x₀', st.x0, 'mm')}${field('v0', 'מהירות התחלתית v₀', st.v0, 'm/s')}</div>
    <h3 class="pg-h">כוח מחזורי</h3>${chips([['0', 'בלי'], ['1', `${'F₀ sin(ωt)'}`]], st.force ? '1' : '0', 'force')}
    ${st.force ? `<div class="pg-form">${field('F0', 'משרעת F₀', st.F0, 'N')}${field('f', 'תדר הכוח f', st.f, 'Hz')}</div>${chips([[0.5, 'r = 0.5'], [1, 'r = 1'], [1.414, 'r = √2'], [3, 'r = 3']], Math.round((st.f / p.fn) * 1000) / 1000, 'r')}` : ''}
    <p class="small muted">גרור את המסה למטה או למעלה ושחרר. הגרף ממשיך ימינה מהמסה, כמו רשם רעידות. x נמדד משיווי המשקל.</p>`;
}
function frChart(r, z) {
  const Wc = W, Hc = 130, x0 = 34, x1 = Wc - 12, y0 = 10, y1 = Hc - 20, rMax = 3, Mmax = Math.min(12, Math.max(3, magnification(1, Math.max(z, 0.04)) * 1.1));
  const X = (v) => x0 + ((x1 - x0) * v) / rMax, Y = (v) => y1 - ((y1 - y0) * Math.min(v, Mmax)) / Mmax;
  let s = `<svg viewBox="0 0 ${Wc} ${Hc}" class="pg-svg pg-plot">`;
  s += `<line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}" class="pg-axis"/><line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}" class="pg-axis"/>`;
  s += `<line x1="${X(1)}" y1="${y0}" x2="${X(1)}" y2="${y1}" class="pg-guide"/><line x1="${X(Math.SQRT2)}" y1="${y0}" x2="${X(Math.SQRT2)}" y2="${y1}" class="pg-guide"/>`;
  for (const [fn, cls] of [[(v) => magnification(v, z), 'pg-curve'], [(v) => transmissibility(v, z), 'pg-curve2']]) {
    let pts = ''; for (let i = 0; i <= 150; i++) { const v = (rMax * i) / 150; pts += `${X(v).toFixed(1)},${Y(fn(v)).toFixed(1)} `; }
    s += `<polyline points="${pts}" class="${cls}"/>`;
  }
  if (r != null) s += `<circle cx="${X(Math.min(r, rMax))}" cy="${Y(magnification(r, z))}" r="5" class="pg-pendot"/>`;
  s += text(X(1), Hc - 6, '1', 'pg-tm') + text(X(Math.SQRT2) + 2, Hc - 6, '√2', 'pg-tm', 'start') + text(x1, Hc - 6, 'r = ω/ωn', 'pg-tm', 'end') + text(x0 - 4, y0 + 8, num(Mmax), 'pg-tm', 'end') + text(x0 - 4, Y(1) + 4, '1', 'pg-tm', 'end');
  return s + '</svg>';
}
function results() {
  const p = params(st.m, st.k, st.c), md = model();
  const kind = { undamped: ['warn', 'בלי ריסון: נע לנצח'], under: ['good', 'ריסון תת-קריטי: מתנדנד ודועך'], critical: ['good', 'ריסון קריטי: חוזר הכי מהר בלי לעבור את שיווי המשקל'], over: ['warn', 'ריסון על-קריטי: זוחל חזרה לאט, בלי תנודה'] }[p.type];
  let forced = '';
  if (md.F0) {
    const r = md.w / p.wn, ss = steady(md.F0, md.w, md.m, md.k, md.c);
    forced = `<h3 class="pg-h">תגובה לכוח המחזורי (מצב מתמיד)</h3><div class="pg-max">
      <div><span>יחס תדרים ${ltr('r = ω/ωn')}</span><b>${ltr(num(r))}</b></div><div><span>מקדם הגברה M</span><b>${ltr(num(magnification(r, p.zeta)))}</b></div>
      <div><span>משרעת X</span><b>${ltr(`${num(ss.X * 1000)} mm`)}</b></div><div><span>פאזה φ</span><b>${ltr(`${num((ss.phi * 180) / Math.PI)}°`)}</b></div>
      <div><span>הסטה סטטית ${ltr('F₀/k')}</span><b>${ltr(`${num((md.F0 / md.k) * 1000)} mm`)}</b></div><div><span>מקדם העברה TR</span><b>${ltr(num(transmissibility(r, p.zeta)))}</b></div></div>
      <p class="small">${Math.abs(r - 1) < 0.15 ? '⚠ קרוב לתהודה: המשרעת מוגבלת רק על ידי הריסון.' : r > Math.SQRT2 ? '✓ מעל √2: הבידוד עובד, לתקרה עובר פחות כוח מ-F₀.' : r < 0.5 ? 'הרבה מתחת לתהודה: המסה זזה כמעט כמו בהסטה סטטית.' : 'בין 0.5 ל-√2: אזור הגברה.'}</p>`;
  }
  return `<div class="pg-status ${kind[0]}">${kind[1]}</div><div class="pg-max">
      <div><span>תדר טבעי ${ltr('ωn = √(k/m)')}</span><b>${ltr(`${num(p.wn)} rad/s`)}</b></div><div><span>${ltr('fn')} / זמן מחזור</span><b>${ltr(`${num(p.fn)} Hz · ${num(p.Tn)} s`)}</b></div>
      <div><span>יחס ריסון ζ</span><b>${ltr(num(p.zeta))}</b></div><div><span>ריסון קריטי ${ltr('cc = 2√(km)')}</span><b>${ltr(`${num(p.cc)} N·s/m`)}</b></div>
      ${p.type === 'under' ? `<div><span>תדר מרוסן ${ltr('fd')}</span><b>${ltr(`${num(p.wd / (2 * Math.PI))} Hz`)}</b></div><div><span>דקרמנט לוגריתמי δ</span><b>${ltr(num(p.logDec))}</b></div>` : ''}
      <div><span>זמן שקיעה (2%, בקירוב)</span><b>${ltr(Number.isFinite(p.settle) ? `${num(p.settle)} s` : '∞')}</b></div><div><span>שקיעה סטטית ${ltr('mg/k')}</span><b>${ltr(`${num((st.m * 9.81 * 1000) / st.k)} mm`)}</b></div>
    </div>${forced}
    <h3 class="pg-h">הגברה ומקדם העברה מול r</h3>${frChart(md.F0 ? md.w / p.wn : null, p.zeta)}
    <p class="small muted">סגול = ${ltr('M = X/(F₀/k)')}, ירוק = ${ltr('TR')} (הכוח שעובר לתקרה). כל העקומות של TR נחתכות ב-${ltr('r = √2')}. זמן השקיעה ${ltr('4/(ζωn)')} מבוסס על המעטפת.</p>`;
}

export function renderVib(root, { toast }) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>〰 מסה, קפיץ ומרסן</h2><p class="small muted">${ltr('m ẍ + c ẋ + k x = F₀ sin(ωt)')}: תנועה אמיתית, מחושבת מהפתרון האנליטי.</p>
      <div class="pg-templates">${PRESETS.map((q) => `<button class="chip" data-preset="${q.id}">${esc(q.name)}</button>`).join('')}</div></div>
    <div class="card pg-stage"><div id="pgVibCanvas"></div></div>
    <div class="card" id="pgVibEdit"></div>
    <div class="card" id="pgVibRes"></div>`;
  const cv = root.querySelector('#pgVibCanvas'), ed = root.querySelector('#pgVibEdit'), out = root.querySelector('#pgVibRes');
  let t = 0, playing = true, S = scaleFor(), hist = [], last = performance.now(), raf = 0, dragging = null;
  const sample = () => { hist.push([t, response(t, model()).x]); const win = windowFor(); while (hist.length > 2 && t - hist[0][0] > win) hist.shift(); };
  const draw = () => { cv.innerHTML = svg(t, S, hist); };
  const restart = () => { t = 0; hist = []; S = scaleFor(); sample(); draw(); };
  const all = () => { ed.innerHTML = editor(playing); out.innerHTML = results(); };
  const loop = (now) => {
    if (!root.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (playing && !dragging) {
      const steps = 4; for (let i = 0; i < steps; i++) { t += (dt * st.speed) / steps; sample(); }
      draw();
    }
    raf = requestAnimationFrame(loop);
  };
  restart(); all(); raf = requestAnimationFrame(loop);

  const changed = (resetMotion = true) => { save(); if (resetMotion) restart(); out.innerHTML = results(); };
  root.addEventListener('click', (ev) => {
    const pr = ev.target.closest('[data-preset]');
    if (pr) {
      const q = PRESETS.find((z) => z.id === pr.dataset.preset).set, p0 = params(st.m, st.k, 0);
      st.c = q.zeta * p0.cc; st.force = q.force; st.x0 = q.x0; st.v0 = 0; if (q.r) st.f = q.r * p0.fn;
      playing = true; changed(); all(); return;
    }
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act, v = b.dataset.v, p0 = params(st.m, st.k, st.c);
    if (a === 'play') { playing = !playing; last = performance.now(); all(); return; }
    if (a === 'reset') { playing = true; restart(); all(); return; }
    if (a === 'speed') st.speed = Number(v);
    else if (a === 'zeta') st.c = Number(v) * p0.cc;
    else if (a === 'force') { st.force = v === '1'; if (st.force && st.x0 === 50) st.x0 = 0; }
    else if (a === 'r') st.f = Number(v) * p0.fn;
    else return;
    changed(a !== 'speed'); all();
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!f) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    if (['m', 'k', 'f', 'F0'].includes(f) && v <= 0) return;
    if ((f === 'c' || f === 'zeta') && v < 0) return;
    if (f === 'zeta') st.c = v * params(st.m, st.k, 0).cc; else st[f] = v;
    changed();
    const z = ed.querySelector('[data-f="zeta"]'); if (z && f !== 'zeta') z.value = Math.round(params(st.m, st.k, st.c).zeta * 10000) / 10000;
    const c = ed.querySelector('[data-f="c"]'); if (c && f === 'zeta') c.value = Math.round(st.c * 10000) / 10000;
  });
  ed.addEventListener('change', all);

  // drag the mass to set x0 (v0 = 0), release to let it go
  const pt = (ev) => { const sv = cv.querySelector('svg'), q = sv.createSVGPoint(); q.x = ev.clientX; q.y = ev.clientY; return q.matrixTransform(sv.getScreenCTM().inverse()); };
  cv.addEventListener('pointerdown', (ev) => {
    if (!ev.target.closest('[data-mass]')) return;
    ev.preventDefault();
    dragging = { pid: ev.pointerId, y0: pt(ev).y, x0: response(t, model()).x };
    try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
    if (!sessionGet('pgVibHint')) { toast('גרור ושחרר: המסה תתחיל לנוע'); sessionSet('pgVibHint'); }
  });
  cv.addEventListener('pointermove', (ev) => {
    if (!dragging || ev.pointerId !== dragging.pid) return;
    const xm = Math.max(-74 / S, Math.min(74 / S, dragging.x0 + (pt(ev).y - dragging.y0) / S));
    st.x0 = Math.round(xm * 10000) / 10; st.v0 = 0; t = 0; hist = [[0, xm]]; draw();
  });
  const end = (ev) => {
    if (!dragging || ev.pointerId !== dragging.pid) return;
    dragging = null; playing = true; last = performance.now(); save(); restart(); all();
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
}
function sessionGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return '1'; } }
function sessionSet(k) { try { sessionStorage.setItem(k, '1'); } catch (e) { /* ignore */ } }
