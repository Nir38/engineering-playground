// playground-fluid.js: the playground's fluids stage (buoyancy / pressure on a gate).
// Solvers in js/hydro.js, checked in tests/hydro-cases.mjs.
import { bodyForces, equilibrium, metacentric, bodyHeight, bodyVolume, pressureAt, gateForce, G, P_ATM } from './hydro.js';
import { esc } from './text.js';

const KEY = 'mh-pg-fluid-v1';
const W = 360;
const FLUIDS = [[1000, 'מים'], [1025, 'מי ים'], [13600, 'כספית']];
const SOLIDS = [[917, 'קרח'], [1050, 'ABS'], [2700, 'אלומיניום'], [7850, 'פלדה']];
const SHAPES = [['box', 'תיבה'], ['cyl', 'גליל'], ['sphere', 'כדור']];
const defaults = () => ({
  sub: 'buoy',
  buoy: { rhoF: 1000, shape: 'box', a: 30, b: 30, h: 24, r: 12, rho: 917, D: 0.8, z: -0.05, released: false },
  pres: { Ht: 5, D: 4, theta: 60, u1: 0.6, u2: 2.6, b: 1, rho2: 1000, top: false, rho1: 900, t: 1, px: 0.8, pz: 2 },
});
let st = null;
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.buoy && s.pres) st = { ...defaults(), ...s, buoy: { ...defaults().buoy, ...s.buoy }, pres: { ...defaults().pres, ...s.pres } }; } catch (e) { /* ignore */ }
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
const field = (f, label, v, unit, extra = '') => `<label><span>${esc(label)} ${unit ? ltr(`[${unit}]`) : ''}</span><input type="number" inputmode="decimal" step="any" data-f="${f}" value="${Math.round(v * 1000) / 1000}" ${extra}></label>`;
const chips = (items, cur, act) => `<div class="chips">${items.map(([v, t]) => `<button class="chip" data-act="${act}" data-v="${v}" aria-pressed="${String(cur) === String(v)}">${t}</button>`).join('')}</div>`;
const kN = (N) => (Math.abs(N) >= 1000 ? `${num(N / 1000)} kN` : `${num(N)} N`);

// =====================================================================
// buoyancy: tank 1.2 m wide × 1.0 m high, 200 px/m
const K = 200, TX0 = 60, TX1 = 300, TB = 236, TT = 36;
const body = () => { const b = st.buoy; return { shape: b.shape, a: b.a / 100, b: b.b / 100, h: b.h / 100, r: b.r / 100, rho: b.rho }; };
function buoySvg() {
  const b = st.buoy, bd = body(), H = bodyHeight(bd), ys = TB - b.D * K, yb = ys + b.z * K, yt = yb - H * K, cx = (TX0 + TX1) / 2;
  const f = bodyForces(bd, b.rhoF, b.z), eq = equilibrium(bd, b.rhoF, b.D);
  const onBottom = b.released && eq.state === 'bottom';
  const w = (bd.shape === 'box' ? bd.a : 2 * bd.r) * K;
  let shape;
  if (bd.shape === 'box') shape = `<rect x="${cx - w / 2}" y="${yt}" width="${w}" height="${H * K}" rx="2"/>`;
  else if (bd.shape === 'cyl') shape = `<rect x="${cx - w / 2}" y="${yt}" width="${w}" height="${H * K}" rx="${Math.min(10, w / 4)}"/>`;
  else shape = `<circle cx="${cx}" cy="${yt + bd.r * K}" r="${bd.r * K}"/>`;
  let s = `<svg viewBox="0 0 ${W} 262" class="pg-svg" id="pgBuoy" role="img" aria-label="גוף במכל נוזל">`;
  s += `<defs><clipPath id="pgFluidClip"><rect x="${TX0}" y="${ys}" width="${TX1 - TX0}" height="${TB - ys}"/></clipPath></defs>`;
  s += `<rect x="${TX0}" y="${ys}" width="${TX1 - TX0}" height="${TB - ys}" class="pg-fluid"/>`;
  s += `<polyline points="${TX0},${TT} ${TX0},${TB} ${TX1},${TB} ${TX1},${TT}" class="pg-tank"/>`;
  s += `<line x1="${TX0}" y1="${ys}" x2="${TX1}" y2="${ys}" class="pg-surf"/><path d="M${TX1 - 22},${ys - 9} l8,0 l-4,7 z" class="pg-surfmark"/>`;
  s += `<g data-body="1" class="pg-bodyg"><g class="pg-body">${shape}</g><g class="pg-body pg-bodysub" clip-path="url(#pgFluidClip)">${shape}</g><rect x="${cx - Math.max(w, 40) / 2 - 10}" y="${yt - 10}" width="${Math.max(w, 40) + 20}" height="${H * K + 20}" class="pg-hit"/></g>`;
  // forces: W at G (centre), Fb at B (centroid of the submerged part), holding force or floor reaction
  const Fs = Math.max(f.W, b.rhoF * G * bodyVolume(bd), 1e-9), L = (F) => 12 + (62 * F) / Fs;
  const yG = yt + (H * K) / 2;
  s += arrow(cx - 14, yG, cx - 14, yG + L(f.W), 'pg-wgt') + text(cx - 20, yG + L(f.W) + 12, `W ${kN(f.W)}`, 'pg-tw', 'end');
  if (f.Fb > 1e-9) { const yB = yb - f.zB * K; s += arrow(cx + 14, yB, cx + 14, yB - L(f.Fb), 'pg-buoyf') + text(cx + 20, yB - L(f.Fb) - 4, `Fb ${kN(f.Fb)}`, 'pg-tb', 'start'); }
  if (onBottom && eq.N > 1e-9) s += arrow(cx + 40, TB, cx + 40, TB - L(eq.N), 'pg-react') + text(cx + 46, TB - L(eq.N) / 2, `N ${kN(eq.N)}`, 'pg-tr', 'start');
  else if (!b.released && Math.abs(f.hold) > 1e-6 * f.W) {
    s += f.hold > 0 ? arrow(cx, yt - 4, cx, yt - 4 - L(f.hold), 'pg-load') : arrow(cx, yt - 4 - L(-f.hold), cx, yt - 4, 'pg-load');
    s += `<text x="${cx + 8}" y="${Math.max(12, yt - 8 - L(Math.abs(f.hold)) / 2).toFixed(1)}" direction="rtl" text-anchor="end" class="pg-t pg-tl">${f.hold > 0 ? 'מחזיקים' : 'דוחפים'} ⁦${esc(kN(Math.abs(f.hold)))}⁩</text>`;
  }
  return s + '</svg>';
}
function buoyEditor() {
  const b = st.buoy;
  return `<h3 class="pg-h">הנוזל</h3>${chips(FLUIDS.map(([v, n]) => [v, `${n} ${v}`]), b.rhoF, 'rhoF')}
    <div class="pg-form">${field('rhoF', 'צפיפות הנוזל', b.rhoF, 'kg/m³')}${field('D', 'עומק הנוזל', b.D, 'm', 'min="0.2" max="1"')}</div>
    <h3 class="pg-h">הגוף</h3>${chips(SHAPES, b.shape, 'shape')}
    <div class="pg-form">${b.shape === 'box' ? field('a', 'רוחב a', b.a, 'cm') + field('b', 'עומק b', b.b, 'cm') + field('h', 'גובה h', b.h, 'cm') : b.shape === 'cyl' ? field('r', 'רדיוס r', b.r, 'cm') + field('h', 'גובה h', b.h, 'cm') : field('r', 'רדיוס r', b.r, 'cm')}</div>
    ${chips(SOLIDS.map(([v, n]) => [v, `${n} ${v}`]), b.rho, 'rho')}
    <div class="pg-form">${field('rho', 'צפיפות הגוף', b.rho, 'kg/m³')}</div>
    <div class="btn-row"><button class="btn primary" data-act="release">⬇ שחרר</button></div>
    <p class="small muted">גרור את הגוף למעלה ולמטה. החץ הכתום הוא הכוח שצריך כדי להחזיק אותו במקום. "שחרר" מראה איפה הוא ייעצר.</p>`;
}
function buoyResults() {
  const b = st.buoy, bd = body(), f = bodyForces(bd, b.rhoF, b.z), eq = equilibrium(bd, b.rhoF, b.D), V = bodyVolume(bd), H = bodyHeight(bd);
  const verdict = eq.state === 'float' ? `<div class="pg-status good">יצוף: ${ltr(`${num((100 * eq.s) / H)}%`)} מהגובה מתחת לפני הנוזל</div>`
    : eq.state === 'neutral' ? '<div class="pg-status warn">ציפה ניטרלית: ירחף בכל עומק</div>'
      : `<div class="pg-status bad">ישקע לקרקעית${H > b.D ? ' (וייצא חלקית מהנוזל)' : ''}</div>`;
  let stab = '';
  if (eq.state === 'float') {
    const m = metacentric(bd, eq.s);
    stab = bd.shape === 'sphere'
      ? '<p class="small muted">כדור אחיד: מרכז הכובד ומרכז העילוי תמיד על אותו אנך דרך המרכז, ולכן היציבות ניטרלית.</p>'
      : `<h3 class="pg-h">יציבות (גובה מטאצנטרי)</h3><div class="pg-max">
          <div><span>${ltr('KB')} (מרכז עילוי)</span><b>${ltr(`${num(m.KB * 100)} cm`)}</b></div><div><span>${ltr('BM = I/V')}</span><b>${ltr(`${num(m.BM * 100)} cm`)}</b></div>
          <div><span>${ltr('KG')} (מרכז כובד)</span><b>${ltr(`${num(m.KG * 100)} cm`)}</b></div><div><span>${ltr('GM')}</span><b class="${m.GM > 0 ? 'pg-okc' : 'pg-over'}">${ltr(`${num(m.GM * 100)} cm`)}</b></div></div>
          <p class="small">${m.GM > 0 ? '✓ יציב: אם הגוף נוטה, העילוי מחזיר אותו.' : '⚠ לא יציב: הגוף יתהפך לצד ויצוף שוכב.'} ${ltr('GM = KB + BM − KG')}, עם ${bd.shape === 'box' ? 'ההטיה סביב הציר הצר (הגרוע)' : `${ltr('I = πr⁴/4')}`}.</p>`;
  }
  return `${verdict}<div class="pg-max">
      <div><span>משקל W</span><b>${ltr(kN(f.W))}</b></div><div><span>עילוי Fb בעומק הנוכחי</span><b>${ltr(kN(f.Fb))}</b></div>
      <div><span>${f.hold >= 0 ? 'כוח החזקה (למעלה)' : 'כוח דחיפה (למטה)'}</span><b>${ltr(kN(Math.abs(f.hold)))}</b></div><div><span>נפח שקוע</span><b>${ltr(`${num((100 * f.Vsub) / V)}%`)}</b></div>
      <div><span>${ltr('ρ גוף / ρ נוזל')}</span><b>${ltr(num(b.rho / b.rhoF))}</b></div><div><span>עילוי מקסימלי (שקוע כולו)</span><b>${ltr(kN(b.rhoF * G * V))}</b></div>
    </div>${eq.state === 'bottom' ? `<p class="small">על הקרקעית: ${ltr(`N = W − Fb = ${kN(eq.N)}`)}. זה גם "המשקל הנראה" אם שוקלים את הגוף בתוך הנוזל.</p>` : ''}
    ${stab}<p class="small muted">ארכימדס: ${ltr('Fb = ρ_f g V_sub')}. גוף צף שוקע עד ש-${ltr('Fb = W')}, כלומר ${ltr('V_sub/V = ρ_o/ρ_f')}.</p>`;
}

// =====================================================================
// pressure on a gate in an inclined wall
const P = { X0: 40, B: 230, WB: 100, HT: 190 }; // left wall x, bottom y, bottom width (px), tank height (px)
function presGeom() {
  const p = st.pres, k = P.HT / p.Ht, th = (p.theta * Math.PI) / 180, xB = P.X0 + P.WB;
  const wall = (u) => [xB + u * k * Math.cos(th), P.B - u * k * Math.sin(th)];
  return { k, th, xB, wall, ys: P.B - p.D * k, uS: p.D / Math.sin(th) };
}
function presSvg(res) {
  const p = st.pres, g = presGeom(), { k, wall, ys } = g, layers = { rho1: p.top ? p.rho1 : 0, t: p.top ? p.t : 0, rho2: p.rho2 };
  const [sx, sy] = wall(g.uS), top = wall(p.Ht / Math.sin(g.th));
  let s = `<svg viewBox="0 0 ${W} 250" class="pg-svg" id="pgPres" role="img" aria-label="מכל עם דופן משופעת ושער">`;
  s += `<polygon points="${P.X0},${ys} ${P.X0},${P.B} ${g.xB},${P.B} ${sx},${sy}" class="pg-fluid"/>`;
  if (p.top && p.t > 0) {
    const yi = ys + p.t * k, [ix, iy] = wall((p.D - p.t) / Math.sin(g.th));
    s += `<polygon points="${P.X0},${ys} ${P.X0},${yi} ${ix},${iy} ${sx},${sy}" class="pg-oil"/>`;
  }
  s += `<polyline points="${P.X0},${P.B - P.HT} ${P.X0},${P.B} ${g.xB},${P.B} ${top}" class="pg-tank"/>`;
  s += `<line x1="${P.X0}" y1="${ys}" x2="${sx}" y2="${sy}" class="pg-surf"/>`;
  s += `<g data-drag="surf"><circle cx="${P.X0 + 16}" cy="${ys}" r="16" class="pg-hit"/><path d="M${P.X0 + 10},${ys - 11} l12,0 l-6,9 z" class="pg-surfmark pg-handlefill"/></g>`;
  // pressure arrows on the gate (normal to the wall, from the liquid side)
  const nOut = [Math.sin(g.th), Math.cos(g.th)], pmax = Math.max(1, pressureAt(p.D, layers)), Ls = 54 / pmax;
  const [ax, ay] = wall(p.u1), [bx, by] = wall(p.u2);
  let env = '';
  for (let i = 0; i <= 10; i++) {
    const u = p.u1 + ((p.u2 - p.u1) * i) / 10, [x, y] = wall(u), pr = pressureAt(p.D - u * Math.sin(g.th), layers), l = pr * Ls;
    if (l > 2) s += arrow(x - nOut[0] * l, y - nOut[1] * l, x - nOut[0] * 2, y - nOut[1] * 2, 'pg-parrow', 4.5);
    env += `${(x - nOut[0] * l).toFixed(1)},${(y - nOut[1] * l).toFixed(1)} `;
  }
  s += `<polyline points="${env}" class="pg-penv"/>`;
  s += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" class="pg-gate"/>`;
  if (res.F > 0) {
    const [cx, cy] = wall(res.ucp);
    s += arrow(cx + nOut[0] * 4, cy + nOut[1] * 4, cx + nOut[0] * 38, cy + nOut[1] * 38, 'pg-resf', 8) + text(cx + nOut[0] * 44, cy + nOut[1] * 44 + 4, `F ${kN(res.F)}`, 'pg-tl', 'start');
  }
  s += `<g data-drag="u1"><circle cx="${ax}" cy="${ay}" r="15" class="pg-hit"/><circle cx="${ax}" cy="${ay}" r="5.5" class="pg-handle"/></g>`;
  s += `<g data-drag="u2"><circle cx="${bx}" cy="${by}" r="15" class="pg-hit"/><circle cx="${bx}" cy="${by}" r="5.5" class="pg-handle"/></g>`;
  // probe
  const qx = P.X0 + p.px * k, qy = ys + p.pz * k, pp = pressureAt(p.pz, layers);
  s += `<g data-drag="probe"><circle cx="${qx}" cy="${qy}" r="16" class="pg-hit"/><circle cx="${qx}" cy="${qy}" r="5" class="pg-probe"/></g>`;
  s += text(Math.min(W - 40, qx + 9), qy - 8, `${num(pp / 1000)} kPa`, 'pg-tp', 'start');
  s += text(P.X0 + 4, P.B - P.HT - 6, `H = ${num(p.Ht)} m`, 'pg-tm', 'start') + text(g.xB + 2, P.B + 14, `θ = ${num(p.theta)}°`, 'pg-tm', 'start');
  return s + '</svg>';
}
function presChart() {
  const p = st.pres, layers = { rho1: p.top ? p.rho1 : 0, t: p.top ? p.t : 0, rho2: p.rho2 };
  const Wc = W, Hc = 120, x0 = 40, x1 = Wc - 20, y0 = 12, y1 = Hc - 18, pm = Math.max(1, pressureAt(p.D, layers));
  const X = (v) => x0 + ((x1 - x0) * v) / pm, Y = (z) => y0 + ((y1 - y0) * z) / p.D;
  let pts = ''; for (let i = 0; i <= 40; i++) { const z = (p.D * i) / 40; pts += `${X(pressureAt(z, layers)).toFixed(1)},${Y(z).toFixed(1)} `; }
  let s = `<svg viewBox="0 0 ${Wc} ${Hc}" class="pg-svg pg-plot">`;
  s += `<line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}" class="pg-axis"/><line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" class="pg-axis"/>`;
  s += `<polygon points="${x0},${y0} ${pts}${x0},${y1}" class="pg-area-p"/>`;
  if (p.top && p.t > 0 && p.t < p.D) s += `<line x1="${x0}" y1="${Y(p.t)}" x2="${x1}" y2="${Y(p.t)}" class="pg-guide"/>`;
  s += text(x0 - 4, y1 + 4, `${num(p.D)} m`, 'pg-tm', 'end') + text(x0 - 4, y0 + 4, '0', 'pg-tm', 'end') + text(X(pm), y1 + 14, `${num(pm / 1000)} kPa`, 'pg-tv', 'end');
  return s + '</svg>';
}
function presEditor() {
  const p = st.pres;
  return `<h3 class="pg-h">המכל והשער</h3><div class="pg-form">${field('theta', 'זווית הדופן θ', p.theta, '°', 'min="45" max="90"')}${field('b', 'רוחב השער b', p.b, 'm')}${field('Ht', 'גובה המכל', p.Ht, 'm')}${field('D', 'עומק הנוזל', p.D, 'm')}</div>
    <h3 class="pg-h">הנוזל</h3>${chips(FLUIDS.map(([v, n]) => [v, `${n} ${v}`]), p.rho2, 'rho2')}<div class="pg-form">${field('rho2', 'צפיפות', p.rho2, 'kg/m³')}</div>
    ${chips([['0', 'שכבה אחת'], ['1', 'שכבה עליונה (למשל שמן)']], p.top ? '1' : '0', 'top')}
    ${p.top ? `<div class="pg-form">${field('rho1', 'צפיפות השכבה העליונה', p.rho1, 'kg/m³')}${field('t', 'עובי השכבה', p.t, 'm')}</div>` : ''}
    <p class="small muted">גרור את ▽ כדי לשנות את המפלס, את העיגולים הכתומים כדי להזיז את קצות השער, ואת הנקודה הכחולה כדי למדוד לחץ.</p>`;
}
function presResults(res) {
  const p = st.pres, layers = { rho1: p.top ? p.rho1 : 0, t: p.top ? p.t : 0, rho2: p.rho2 }, sn = Math.sin((p.theta * Math.PI) / 180);
  const pp = pressureAt(p.pz, layers), pb = pressureAt(p.D, layers);
  const zTop = p.D - p.u2 * sn, zBot = p.D - p.u1 * sn, hc = (zTop + zBot) / 2;
  const simple = !p.top && zTop >= 0 && res.F > 0;
  return `<div class="pg-max">
      <div><span>לחץ מד בנקודה (עומק ${ltr(`${num(p.pz)} m`)})</span><b>${ltr(`${num(pp / 1000)} kPa`)}</b></div>
      <div><span>לחץ מוחלט בנקודה</span><b>${ltr(`${num((pp + P_ATM) / 1000)} kPa`)}</b></div>
      <div><span>לחץ מד בקרקעית</span><b>${ltr(`${num(pb / 1000)} kPa`)}</b></div>
      <div><span>שטח השער</span><b>${ltr(`${num(res.area)} m²`)}</b></div>
      <div><span>כוח שקול על השער F</span><b>${ltr(kN(res.F))}</b></div>
      <div><span>עומק מרכז הלחץ</span><b>${res.F > 0 ? ltr(`${num(res.zcp)} m`) : '—'}</b></div>
      <div><span>מרכז הלחץ מהקצה התחתון</span><b>${res.F > 0 ? ltr(`${num(res.ucp - p.u1)} m`) : '—'}</b></div>
      <div><span>עומק מרכז השער ${ltr('h_c')}</span><b>${ltr(`${num(hc)} m`)}</b></div>
    </div>
    ${simple ? `<p class="small">בדיקה: ${ltr(`F = ρ g h_c A = ${kN(p.rho2 * G * hc * res.area)}`)}, ומרכז הלחץ נמוך ממרכז השער: ${ltr('y_cp = y_c + I/(y_c A)')}.</p>` : `<p class="small muted">${p.top ? 'עם שתי שכבות' : 'כשהשער יוצא מעל פני הנוזל'} הנוסחה ${ltr('ρ g h_c A')} לא חלה ישירות, והכוח מחושב באינטגרציה של הלחץ לאורך השער.</p>`}
    <h3 class="pg-h">לחץ מול עומק</h3>${presChart()}
    <p class="small muted">הכוח מחושב מלחץ מד: הלחץ האטמוספרי ${ltr('p0 = 101.325 kPa')} פועל משני צדי השער ומתקזז. ${ltr('p = ρ g h')}, ובשכבות: מוסיפים שכבה אחרי שכבה.</p>`;
}

// =====================================================================
export function renderFluid(root, { toast }) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>💧 ציפה ולחץ</h2>${chips([['buoy', 'ציפה (ארכימדס)'], ['pres', 'לחץ על דופן ושער']], st.sub, 'sub')}</div>
    <div class="card pg-stage"><div id="pgFlCanvas"></div></div>
    <div class="card" id="pgFlEdit"></div>
    <div class="card" id="pgFlRes"></div>`;
  const cv = root.querySelector('#pgFlCanvas'), ed = root.querySelector('#pgFlEdit'), out = root.querySelector('#pgFlRes');
  const presSolve = () => { const p = st.pres; return gateForce({ D: p.D, theta: p.theta, u1: p.u1, u2: p.u2, b: p.b, layers: { rho1: p.top ? p.rho1 : 0, t: p.top ? p.t : 0, rho2: p.rho2 } }); };
  const live = () => {
    if (st.sub === 'buoy') { cv.innerHTML = buoySvg(); out.innerHTML = buoyResults(); }
    else { const r = presSolve(); cv.innerHTML = presSvg(r); out.innerHTML = presResults(r); }
  };
  const all = () => { live(); ed.innerHTML = st.sub === 'buoy' ? buoyEditor() : presEditor(); };
  const clampBuoy = () => {
    const b = st.buoy, H = bodyHeight(body()), ys = TB - b.D * K;
    b.z = Math.min(b.D, Math.max((TT + 4 + H * K - ys) / K, b.z));
  };
  const clampPres = () => {
    const p = st.pres, sn = Math.sin((p.theta * Math.PI) / 180), uMax = p.Ht / sn;
    p.D = Math.min(p.Ht, Math.max(0.1, p.D)); p.t = Math.min(p.D, Math.max(0, p.t));
    p.u1 = Math.min(uMax - 0.1, Math.max(0, p.u1)); p.u2 = Math.min(uMax, Math.max(p.u1 + 0.1, p.u2));
    p.pz = Math.min(p.D, Math.max(0, p.pz)); p.px = Math.min(P.WB / (P.HT / p.Ht), Math.max(0.05 * p.Ht, p.px));
  };
  clampBuoy(); clampPres(); all();

  let anim = 0;
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act, v = b.dataset.v, B = st.buoy, Pp = st.pres;
    if (a === 'sub') { st.sub = v; root.querySelectorAll('[data-act="sub"]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.v === v))); }
    else if (a === 'rhoF') B.rhoF = Number(v);
    else if (a === 'rho') B.rho = Number(v);
    else if (a === 'shape') { B.shape = v; B.released = false; clampBuoy(); }
    else if (a === 'rho2') Pp.rho2 = Number(v);
    else if (a === 'top') Pp.top = v === '1';
    else if (a === 'release') {
      const eq = equilibrium(body(), B.rhoF, B.D), z0 = B.z, t0 = performance.now();
      cancelAnimationFrame(anim); B.released = true;
      const step = (t) => { const f = Math.min(1, (t - t0) / 700), e = 1 - (1 - f) ** 3; B.z = z0 + (eq.z - z0) * e; live(); if (f < 1) anim = requestAnimationFrame(step); else { save(); all(); } };
      anim = requestAnimationFrame(step); return;
    } else return;
    if (a !== 'sub' && a !== 'top' && a !== 'shape') B.released = false;
    save(); all();
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!f) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v) || v <= 0) return;
    if (st.sub === 'buoy') {
      const B = st.buoy;
      if (f === 'D') { if (v < 0.2 || v > 1) return; B.D = v; } else if (['a', 'b', 'h', 'r'].includes(f)) { if (v > (f === 'r' ? 25 : 50) || v < 1) return; B[f] = v; } else B[f] = v;
      B.released = false; clampBuoy();
    } else {
      const Pp = st.pres;
      if (f === 'theta') { if (v < 45 || v > 90) return; Pp.theta = v; } else if (f === 'Ht') { if (v < 0.5 || v > 100) return; Pp.Ht = v; } else Pp[f] = v;
      clampPres();
    }
    save(); live();
  });
  ed.addEventListener('change', () => { ed.innerHTML = st.sub === 'buoy' ? buoyEditor() : presEditor(); });

  // drags
  let drag = null;
  const pt = (ev) => { const sv = cv.querySelector('svg'), q = sv.createSVGPoint(); q.x = ev.clientX; q.y = ev.clientY; return q.matrixTransform(sv.getScreenCTM().inverse()); };
  cv.addEventListener('pointerdown', (ev) => {
    const g = ev.target.closest('[data-body],[data-drag]'); if (!g) return;
    ev.preventDefault(); cancelAnimationFrame(anim);
    const p0 = pt(ev);
    drag = { pid: ev.pointerId, kind: g.dataset.body ? 'body' : g.dataset.drag, y0: p0.y, z0: st.buoy.z };
    try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
    if (drag.kind === 'body') { st.buoy.released = false; if (!sessionGet('pgFlHint')) { toast('גרור את הגוף לתוך הנוזל והחוצה'); sessionSet('pgFlHint'); } }
  });
  cv.addEventListener('pointermove', (ev) => {
    if (!drag || ev.pointerId !== drag.pid) return;
    const q = pt(ev);
    if (drag.kind === 'body') { st.buoy.z = Math.round((drag.z0 + (q.y - drag.y0) / K) * 1000) / 1000; clampBuoy(); }
    else {
      const p = st.pres, g = presGeom(), k = g.k;
      if (drag.kind === 'surf') p.D = Math.round(((P.B - q.y) / k) * 10) / 10;
      else if (drag.kind === 'probe') { p.pz = Math.round(((q.y - g.ys) / k) * 10) / 10; p.px = (q.x - P.X0) / k; }
      else { // project onto the wall
        const d = [Math.cos(g.th), -Math.sin(g.th)], u = Math.round((((q.x - g.xB) * d[0] + (q.y - P.B) * d[1]) / k) * 10) / 10;
        if (drag.kind === 'u1') p.u1 = Math.min(u, p.u2 - 0.1); else p.u2 = Math.max(u, p.u1 + 0.1);
      }
      clampPres();
    }
    live();
  });
  const end = (ev) => { if (!drag || ev.pointerId !== drag.pid) return; drag = null; save(); all(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
}
function sessionGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return '1'; } }
function sessionSet(k) { try { sessionStorage.setItem(k, '1'); } catch (e) { /* ignore */ } }
