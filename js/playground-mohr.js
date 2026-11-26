// playground-mohr.js: the playground's Mohr's circle mode. Plane stress at a point: turn the element
// and watch its point move on the circle; principal stresses, max shear, von Mises and Tresca.
// Math: js/mohr.js (checked in tests/mohr-cases.mjs).
import { rotate, mohr, circlePoint, thetaFromPoint } from './mohr.js';
import { esc } from './text.js';

const KEY = 'mh-pg-mohr-v1';
const PRESETS = [
  { id: 'uni', name: 'מתיחה חד-צירית', set: { sx: 100, sy: 0, txy: 0, th: 45 } },
  { id: 'shear', name: 'גזירה טהורה (פיתול)', set: { sx: 0, sy: 0, txy: 80, th: 0 } },
  { id: 'shaft', name: 'ציר: כפיפה + פיתול', set: { sx: 80, sy: 0, txy: 50, th: 0 } },
  { id: 'vessel', name: 'מכל לחץ דק', set: { sx: 100, sy: 50, txy: 0, th: 0 } },
  { id: 'gen', name: 'מצב כללי', set: { sx: -20, sy: 90, txy: 60, th: 0 } },
  { id: 'hydro', name: 'לחיצה שווה', set: { sx: -100, sy: -100, txy: 0, th: 0 } },
];
const LIM = { sx: [-200, 200], sy: [-200, 200], txy: [-150, 150], th: [-90, 90], fy: [100, 1000] };
const defaults = () => ({ sx: 80, sy: 0, txy: 50, th: 0, fy: 235 });
let st = null;
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') for (const k of Object.keys(st)) if (Number.isFinite(s[k])) st[k] = s[k]; } catch (e) { /* ignore */ }
  for (const [k, [a, b]] of Object.entries(LIM)) st[k] = Math.min(b, Math.max(a, st[k]));
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
const num = (n, d = 1) => { if (!Number.isFinite(n)) return '—'; const r = Math.round(n * 10 ** d) / 10 ** d; return Object.is(r, -0) || r === 0 ? '0' : String(r); };
const ltr = (s) => `<span class="ltr">${esc(s)}</span>`;
const S = () => ({ sx: st.sx, sy: st.sy, txy: st.txy });
const RAD = Math.PI / 180;
const C = { x: '#3b82f6', y: '#ef4444', p: '#16a34a', s: '#d97706' };

function arrow(x1, y1, x2, y2, col, w = 2, head = 6) {
  const a = Math.atan2(y2 - y1, x2 - x1), h1 = [x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45)], h2 = [x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45)];
  return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${(x2 - 0.6 * head * Math.cos(a)).toFixed(1)}" y2="${(y2 - 0.6 * head * Math.sin(a)).toFixed(1)}" stroke="${col}" stroke-width="${w}"/><polygon points="${x2.toFixed(1)},${y2.toFixed(1)} ${h1.map((v) => v.toFixed(1))} ${h2.map((v) => v.toFixed(1))}" fill="${col}"/>`;
}
const text = (x, y, s, col, anchor = 'middle', cls = '') => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" class="pg-t ${cls}" ${col ? `fill="${col}"` : ''}>${esc(s)}</text>`;

// the element turned by θ, with the stresses on its faces
function elementSvg() {
  const W = 360, H = 220, cx = 180, cy = 112, h = 42, r = rotate(S(), st.th), m = mohr(S());
  const big = Math.max(1, Math.abs(r.sx), Math.abs(r.sy), Math.abs(r.txy), Math.abs(m.s1), Math.abs(m.s2));
  const L = (v) => 12 + (34 * Math.abs(v)) / big; // arrow length by size
  const t = st.th * RAD, ex = [Math.cos(t), -Math.sin(t)], ey = [-Math.sin(t), -Math.cos(t)]; // screen directions of x', y'
  const P = (a, b) => [cx + a * ex[0] + b * ey[0], cy + a * ex[1] + b * ey[1]];
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="אלמנט מסובב בזווית θ עם המאמצים על הפאות">`;
  // fixed x, y axes and the turned x' axis
  s += `<line x1="${cx}" y1="${cy}" x2="${cx + 120}" y2="${cy}" class="pg-ruler" stroke-dasharray="3 3"/><line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 95}" class="pg-ruler" stroke-dasharray="3 3"/>`;
  s += text(cx + 126, cy + 4, 'x', '', 'start') + text(cx, cy - 97, 'y', '', 'middle');
  const corners = [P(-h, -h), P(h, -h), P(h, h), P(-h, h)];
  s += `<polygon points="${corners.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" class="pg-elem"/>`;
  if (Math.abs(st.th) >= 1) {
    const a = Math.min(0, -t), b = Math.max(0, -t), R = 52;
    s += `<path d="M${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)} A${R},${R} 0 0 1 ${(cx + R * Math.cos(b)).toFixed(1)},${(cy + R * Math.sin(b)).toFixed(1)}" fill="none" stroke="${C.s}" stroke-width="1.6"/>`;
  }
  // normal stresses: out of the face for tension, into it for compression
  const normal = (sign, e, v, col, lab) => {
    if (Math.abs(v) < 1e-9) return '';
    const base = [cx + sign * (h + 4) * e[0], cy + sign * (h + 4) * e[1]], tip = [base[0] + sign * L(v) * e[0], base[1] + sign * L(v) * e[1]];
    const a = v > 0 ? arrow(base[0], base[1], tip[0], tip[1], col) : arrow(tip[0], tip[1], base[0], base[1], col);
    return a + (sign > 0 ? text(tip[0] + 14 * e[0], tip[1] + 14 * e[1] + 4, lab, col, 'middle', 'pg-b') : '');
  };
  s += normal(1, ex, r.sx, C.x, `σx'=${num(r.sx, 0)}`) + normal(-1, ex, r.sx, C.x) + normal(1, ey, r.sy, C.y, `σy'=${num(r.sy, 0)}`) + normal(-1, ey, r.sy, C.y);
  // shear: on the +x' face along +y', on the +y' face along +x' (and opposite on the far faces)
  if (Math.abs(r.txy) > 1e-9) {
    const k = Math.sign(r.txy), l = Math.min(h * 1.6, L(r.txy));
    const sh = (face, along) => { const o = [cx + face[0] * (h + 7), cy + face[1] * (h + 7)], a = [o[0] - (k * along[0] * l) / 2, o[1] - (k * along[1] * l) / 2], b = [o[0] + (k * along[0] * l) / 2, o[1] + (k * along[1] * l) / 2]; return arrow(a[0], a[1], b[0], b[1], C.p, 1.8, 5); };
    const neg = (v) => [-v[0], -v[1]];
    s += sh(ex, ey) + sh(neg(ex), neg(ey)) + sh(ey, ex) + sh(neg(ey), neg(ex));
    const lp = P(-h - 8, h + 18); s += text(Math.min(W - 40, Math.max(40, lp[0])), Math.min(H - 6, Math.max(12, lp[1])), `τ'=${num(r.txy, 0)}`, C.p, 'middle', 'pg-b');
  }
  s += text(8, H - 8, 'MPa', '', 'start', 'pg-tz') + text(W - 8, H - 8, `θ = ${num(st.th, 0)}°`, C.s, 'end', 'pg-b');
  return s + '</svg>';
}

// Mohr's circle: σ to the right, τ positive downward
let view = null; // last drawing scale, for dragging
function circleSvg() {
  const W = 360, H = 270, m = mohr(S()), three = m.tauAbs > m.R + 1e-9;
  const lo = Math.min(m.s2, three ? 0 : m.s2, 0), hi = Math.max(m.s1, three ? 0 : m.s1, 0), tR = Math.max(three ? m.tauAbs : m.R, 1);
  const k = Math.min((W - 60) / Math.max(hi - lo, 1), (H - 50) / (2 * tR));
  const ox = 30 + ((W - 60) - (hi - lo) * k) / 2 - lo * k, oy = H / 2;
  const X = (sg) => ox + sg * k, Y = (tau) => oy + tau * k; // τ down
  view = { ox, oy, k };
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg pg-mohr" id="pgMohrCircle" role="img" aria-label="מעגל Mohr">`;
  s += `<line x1="6" y1="${oy}" x2="${W - 6}" y2="${oy}" class="pg-ruler"/><line x1="${X(0)}" y1="6" x2="${X(0)}" y2="${H - 6}" class="pg-ruler"/>`;
  s += text(W - 8, oy - 6, 'σ', '', 'end', 'pg-b') + text(X(0) + 6, H - 8, 'τ+ ↓', '', 'start', 'pg-b');
  if (three) { // the two other circles of the 3D state (σz = 0)
    for (const [a, b] of [[m.S1, m.S3], [m.S2, m.S3], [m.S1, m.S2]]) if (Math.abs(a - b) > 1e-9 && !(Math.abs(a - m.s1) < 1e-9 && Math.abs(b - m.s2) < 1e-9)) s += `<circle cx="${X((a + b) / 2)}" cy="${oy}" r="${(Math.abs(a - b) / 2) * k}" fill="none" class="pg-ruler" stroke-dasharray="4 3"/>`;
  }
  s += `<circle cx="${X(m.c)}" cy="${oy}" r="${Math.max(m.R * k, 1.5)}" class="pg-mcirc"/>`;
  // original diameter X–Y (faint) and the turned one X'–Y'
  s += `<line x1="${X(st.sx)}" y1="${Y(st.txy)}" x2="${X(st.sy)}" y2="${Y(-st.txy)}" class="pg-ruler" stroke-dasharray="3 3"/>`;
  s += `<circle cx="${X(st.sx)}" cy="${Y(st.txy)}" r="3.5" fill="none" stroke="${C.x}" stroke-width="1.5"/>${text(X(st.sx) + 8, Y(st.txy) - 6, 'X', C.x, 'start')}`;
  const [a1, b1] = circlePoint(S(), st.th), [a2, b2] = circlePoint(S(), st.th + 90);
  s += `<line x1="${X(a1)}" y1="${Y(b1)}" x2="${X(a2)}" y2="${Y(b2)}" stroke="${C.s}" stroke-width="2"/>`;
  // 2θ arc at the center, from X to X'
  if (Math.abs(st.th) >= 1 && m.R > 1e-9) {
    const g0 = Math.atan2(Y(st.txy) - oy, X(st.sx) - X(m.c)), g1 = Math.atan2(Y(b1) - oy, X(a1) - X(m.c)), r = Math.min(m.R * k * 0.45, 28);
    let d = g1 - g0; while (d > Math.PI) d -= 2 * Math.PI; while (d <= -Math.PI) d += 2 * Math.PI;
    s += `<path d="M${(X(m.c) + r * Math.cos(g0)).toFixed(1)},${(oy + r * Math.sin(g0)).toFixed(1)} A${r},${r} 0 0 ${d > 0 ? 1 : 0} ${(X(m.c) + r * Math.cos(g1)).toFixed(1)},${(oy + r * Math.sin(g1)).toFixed(1)}" fill="none" stroke="${C.s}" stroke-width="1.4"/>`;
    s += text(X(m.c) + (r + 14) * Math.cos(g0 + d / 2), oy + (r + 14) * Math.sin(g0 + d / 2) + 4, `2θ`, C.s, 'middle', 'pg-b');
  }
  // principal and max-shear points
  s += `<circle cx="${X(m.s1)}" cy="${oy}" r="3.5" fill="${C.p}"/><circle cx="${X(m.s2)}" cy="${oy}" r="3.5" fill="${C.p}"/>`;
  s += text(X(m.s1) + 4, oy + 15, `σ1=${num(m.s1, 0)}`, C.p, 'start', 'pg-b') + text(X(m.s2) - 4, oy - 7, `σ2=${num(m.s2, 0)}`, C.p, 'end', 'pg-b');
  if (m.R > 1e-9) s += `<circle cx="${X(m.c)}" cy="${Y(m.R)}" r="3" fill="${C.p}"/>${text(X(m.c) - 8, Math.min(H - 20, Y(m.R) + 14), `τmax=${num(m.R, 0)}`, C.p, 'end')}`;
  s += `<circle cx="${X(m.c)}" cy="${oy}" r="2.2" class="pg-mc"/>${text(X(m.c), oy - 6, 'C', '', 'middle')}`;
  // the turned face, draggable
  s += `<circle cx="${X(a1)}" cy="${Y(b1)}" r="11" fill="${C.s}" fill-opacity=".18" class="pg-mdrag"/><circle cx="${X(a1)}" cy="${Y(b1)}" r="5" fill="${C.s}"/>${text(X(a1) + (a1 >= m.c ? 12 : -12), Y(b1) + (b1 >= 0 ? 16 : -9), "X'", C.s, a1 >= m.c ? 'start' : 'end', 'pg-b')}`;
  s += `<circle cx="${X(a2)}" cy="${Y(b2)}" r="4" fill="none" stroke="${C.s}" stroke-width="1.6"/>${text(X(a2) + (a2 >= m.c ? 9 : -9), Y(b2) + (b2 >= 0 ? 15 : -8), "Y'", C.s, a2 >= m.c ? 'start' : 'end')}`;
  return s + '</svg>';
}

export function renderMohr(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>◯ מעגל Mohr</h2><p class="small muted">מצב מאמצים מישורי בנקודה. מסובבים את האלמנט ורואים איך הנקודה שלו זזה על המעגל: סיבוב של θ באלמנט הוא ${ltr('2θ')} על המעגל.</p>
      <div class="pg-templates">${PRESETS.map((p) => `<button class="chip" data-preset="${p.id}">${esc(p.name)}</button>`).join('')}</div></div>
    <div class="card pg-stage"><div id="pgMohrEl"></div><div id="pgMohrCv"></div><p class="small muted pg-hint">גרור את הנקודה הכתומה ${ltr("X'")} על המעגל כדי לסובב את האלמנט.</p></div>
    <div class="card" id="pgMohrEd"></div>
    <div class="card" id="pgMohrRes"></div>`;
  const el = root.querySelector('#pgMohrEl'), cv = root.querySelector('#pgMohrCv'), ed = root.querySelector('#pgMohrEd'), out = root.querySelector('#pgMohrRes');
  const slider = (f, label, shown, step) => `<label class="pg-range"><span>${label} <b>${shown}</b></span><input type="range" data-f="${f}" min="${LIM[f][0]}" max="${LIM[f][1]}" step="${step}" value="${st[f]}" aria-label="${esc(label)}"></label>`;
  const editor = () => `<h3 class="pg-h">המאמצים על האלמנט המקורי</h3>
      ${slider('sx', 'σx', ltr(`${num(st.sx, 0)} MPa`), 5)}${slider('sy', 'σy', ltr(`${num(st.sy, 0)} MPa`), 5)}${slider('txy', 'τxy', ltr(`${num(st.txy, 0)} MPa`), 5)}
      <h3 class="pg-h">סיבוב האלמנט</h3>${slider('th', 'θ (נגד כיוון השעון חיובי)', ltr(`${num(st.th, 0)}°`), 1)}
      <div class="chips"><button class="chip" data-go="p">לכיוון הראשי θp</button><button class="chip" data-go="s">לגזירה מרבית θs</button><button class="chip" data-go="0">חזרה ל-0°</button></div>
      <h3 class="pg-h">החומר</h3>${slider('fy', 'מאמץ כניעה σy', ltr(`${num(st.fy, 0)} MPa`), 5)}
      <p class="small muted">מתיחה חיובית, לחיצה שלילית. ${ltr('τxy')} חיובי פועל על הפאה החיובית של x בכיוון y החיובי.</p>`;
  function results() {
    const m = mohr(S()), r = rotate(S(), st.th), nVm = st.fy / Math.max(m.vonMises, 1e-9), nTr = st.fy / Math.max(m.tresca, 1e-9);
    const fs = (n) => (n >= 1 ? `<b style="color:var(--good)">${ltr(num(n, 2))}</b>` : `<b style="color:var(--bad)">${ltr(num(n, 2))} ⚠ כניעה</b>`);
    const three = m.tauAbs > m.R + 1e-9;
    return `<h3 class="pg-h">על האלמנט המסובב ב-${ltr(`θ = ${num(st.th, 0)}°`)}</h3>
      <div class="pg-max"><div><span>σx'</span><b>${ltr(`${num(r.sx)} MPa`)}</b></div><div><span>σy'</span><b>${ltr(`${num(r.sy)} MPa`)}</b></div><div><span>τx'y'</span><b>${ltr(`${num(r.txy)} MPa`)}</b></div><div><span>σx' + σy'</span><b>${ltr(`${num(r.sx + r.sy)} = σx + σy`)}</b></div></div>
      <h3 class="pg-h">מאמצים ראשיים</h3>
      <div class="pg-max"><div><span>σ1</span><b>${ltr(`${num(m.s1)} MPa`)}</b></div><div><span>σ2</span><b>${ltr(`${num(m.s2)} MPa`)}</b></div><div><span>כיוון σ1</span><b>${ltr(`θp = ${num(m.thetaP)}°`)}</b></div><div><span>גזירה מרבית במישור</span><b>${ltr(`τmax = R = ${num(m.R)} MPa`)}</b><small class="muted">${ltr(`בזווית θs = ${num(m.thetaS)}°`)}</small></div></div>
      <p class="small">${ltr('C = (σx + σy)/2')} = ${ltr(num(m.c))}, ${ltr('R = √(((σx − σy)/2)² + τxy²)')} = ${ltr(num(m.R))}, ${ltr('σ1,2 = C ± R')}, ${ltr('tan 2θp = 2τxy / (σx − σy)')}.</p>
      ${three ? `<p class="small" style="color:var(--warn, #d97706)">שים לב: יש גם ${ltr('σ3 = σz = 0')}. כש-σ1 ו-σ2 באותו סימן, הגזירה המרבית האמיתית היא מחוץ למישור: ${ltr(`τabs = (σmax − σmin)/2 = ${num(m.tauAbs)} MPa`)}, יותר מ-R. העיגולים המקווקווים הם המעגלים של שני המישורים האחרים. זה בדיוק המקרה של מכל לחץ.</p>` : ''}
      <h3 class="pg-h">כניעה ומקדם ביטחון</h3>
      <div class="pg-max"><div><span>von Mises</span><b>${ltr(`σvm = ${num(m.vonMises)} MPa`)}</b></div><div><span>n לפי von Mises</span>${fs(nVm)}</div><div><span>Tresca</span><b>${ltr(`σ1 − σ3 = ${num(m.tresca)} MPa`)}</b></div><div><span>n לפי Tresca</span>${fs(nTr)}</div></div>
      <p class="small">${ltr('σvm = √(σx² − σxσy + σy² + 3τxy²)')}. Tresca תמיד שמרני יותר או שווה. בגזירה טהורה ההבדל הכי גדול: von Mises נותן כניעה ב-${ltr('τ = σy/√3 ≈ 0.577σy')}, ו-Tresca ב-${ltr('τ = 0.5σy')}.</p>
      <h3 class="pg-h">איך זה עוזר בתכן</h3>
      <p class="small muted">חומר משיך (פלדה, אלומיניום) נכשל בגזירה, ולכן בודקים von Mises או Tresca. חומר פריך (יציקת ברזל, קרמיקה) נשבר במתיחה, בניצב ל-σ1: זו הסיבה שגיר שמסובבים נשבר בספירלה של 45°, ומוט פלדה בפיתול נשבר ישר. במדי עיבור (strain gauge rosette) מודדים בשלוש זוויות ומחשבים בדיוק כך את המאמצים הראשיים.</p>`;
  }
  const refresh = (full = true) => {
    el.innerHTML = elementSvg(); cv.innerHTML = circleSvg(); out.innerHTML = results();
    if (full) ed.innerHTML = editor();
    else { const tmp = document.createElement('div'); tmp.innerHTML = editor(); const nb = tmp.querySelectorAll('.pg-range b'); ed.querySelectorAll('.pg-range b').forEach((b, i) => { b.innerHTML = nb[i].innerHTML; }); }
  };
  refresh();
  root.addEventListener('click', (ev) => {
    const pr = ev.target.closest('[data-preset]');
    if (pr) { Object.assign(st, PRESETS.find((q) => q.id === pr.dataset.preset).set); save(); refresh(); return; }
    const go = ev.target.closest('[data-go]');
    if (go) { const m = mohr(S()); st.th = Math.round(go.dataset.go === 'p' ? m.thetaP : go.dataset.go === 's' ? m.thetaS : 0); if (st.th <= -90) st.th += 180; save(); refresh(); }
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!f || !(f in LIM)) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    st[f] = Math.min(LIM[f][1], Math.max(LIM[f][0], v)); save(); refresh(false);
  });
  // drag X' around the circle
  let drag = null;
  const setFrom = (ev) => {
    const sv = cv.querySelector('svg'); if (!sv || !view) return;
    const p = sv.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(sv.getScreenCTM().inverse());
    if (mohr(S()).R < 1e-9) return;
    const th = Math.round(thetaFromPoint(S(), (q.x - view.ox) / view.k, (q.y - view.oy) / view.k));
    if (th !== st.th) { st.th = th; refresh(false); const r = ed.querySelector('[data-f="th"]'); if (r) r.value = th; }
  };
  cv.addEventListener('pointerdown', (ev) => { if (!ev.target.closest('#pgMohrCircle')) return; ev.preventDefault(); drag = ev.pointerId; try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ } setFrom(ev); });
  cv.addEventListener('pointermove', (ev) => { if (drag === ev.pointerId) setFrom(ev); });
  const end = (ev) => { if (drag !== ev.pointerId) return; drag = null; save(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
}
