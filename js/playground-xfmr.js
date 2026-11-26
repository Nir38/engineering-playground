// playground-xfmr.js: the playground's transformer mode. Turns ratio, voltage and current on both sides,
// the load seen from the primary, and a simple power supply: transformer, diode bridge (or one diode),
// smoothing capacitor and the ripple.
// Math: transformer(), bridgePeak(), rippleFull/Half() and the time solver step() in js/circuit.js (tests/ac-cases.mjs).
import { GRID, transformer, bridgePeak, rippleFull, rippleHalf, step, emptyState, VF } from './circuit.js';
import { ltr, si, num, slider, chips, plot, text, COL, SAFETY } from './elec-ui.js';

const KEY = 'mh-pg-xfmr-v1';
const LIM = { V1: [100, 250], N1: [100, 2000], N2: [10, 2000], RL: [1, 200], C: [100, 4700], Rs: [20, 1000] };
const defaults = () => ({ view: 'ideal', V1: GRID.V, N1: 1000, N2: 52, RL: 10, rect: 'bridge', C: 2200, Rs: 100 });
let st = null;
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') for (const k of Object.keys(st)) { if (k === 'view' ? ['ideal', 'supply'].includes(s[k]) : k === 'rect' ? ['bridge', 'half'].includes(s[k]) : Number.isFinite(s[k])) st[k] = s[k]; } } catch (e) { /* ignore */ }
  for (const [k, [a, b]] of Object.entries(LIM)) st[k] = Math.min(b, Math.max(a, st[k]));
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
const T = () => transformer({ V1: st.V1, N1: st.N1, N2: st.N2, RL: st.RL });

const coil = (x, y0, y1, n, dir) => { let d = `M${x},${y0}`; const h = (y1 - y0) / n; for (let k = 0; k < n; k++) d += ` a${h / 2},${h / 2} 0 0 ${dir} 0,${h}`; return `<path d="${d}" fill="none" class="pg-cw"/>`; };
function xfmrSvg() {
  const t = T(), W = 360, H = 190;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="שנאי עם עומס">`;
  // primary source, coils, core
  s += `<circle cx="34" cy="95" r="16" class="pg-csym"/><path d="M24,95 q5,-10 10,0 q5,10 10,0" fill="none" class="pg-cw"/>`;
  s += `<path d="M34,79 L34,40 L120,40 L120,55 M34,111 L34,150 L120,150 L120,135" fill="none" class="pg-cw"/>` + coil(120, 55, 135, Math.max(2, Math.min(8, Math.round(st.N1 / 150))), 0);
  s += `<line x1="146" y1="35" x2="146" y2="155" class="pg-cw" style="stroke-width:3"/><line x1="152" y1="35" x2="152" y2="155" class="pg-cw" style="stroke-width:3"/>`;
  s += coil(178, 55, 135, Math.max(1, Math.min(8, Math.round(st.N2 / 150))), 1) + `<path d="M178,55 L178,40 L300,40 L300,70 M178,135 L178,150 L300,150 L300,120" fill="none" class="pg-cw"/><rect x="292" y="70" width="16" height="50" rx="2" class="pg-csym"/>`;
  s += text(108, 100, `N1=${st.N1}`, '', 'end', 'pg-tn') + text(192, 100, `N2=${st.N2}`, '', 'start', 'pg-tn') + text(318, 98, `RL=${st.RL} Ω`, '', 'start', 'pg-tn');
  s += text(70, 30, `V1 = ${num(st.V1, 0)} V`, COL.v, 'middle', 'pg-b') + text(70, 170, `I1 = ${si(t.I1, 'A')}`, COL.i, 'middle', 'pg-b');
  s += text(240, 30, `V2 = ${si(t.V2, 'V')}`, COL.v, 'middle', 'pg-b') + text(240, 170, `I2 = ${si(t.I2, 'A')}`, COL.i, 'middle', 'pg-b');
  s += text(149, 182, `a = N1/N2 = ${num(t.a, 2)}`, '', 'middle', 'pg-tn');
  return s + '</svg>';
}

// the supply, simulated: settles a few periods from a charged capacitor, keeps the last three
let cache = null;
function supply() {
  const key = JSON.stringify([st.V1, st.N1, st.N2, st.rect, st.C, st.Rs]);
  if (cache && cache.key === key) return cache;
  let id = 1; const E = (type, a, b, p = {}) => ({ id: id++, type, a, b, ...p });
  const V2 = T().V2, f = GRID.f, per = 200, dt = 1 / f / per;
  const src = E('vac', 'a1', 'a2', { Vrms: V2, f, r: 0.2 }), C = E('cap', 'P', 'N', { C: st.C * 1e-6 }), R = E('res', 'P', 'N', { R: st.Rs });
  const els = st.rect === 'bridge' ? [src, E('diode', 'a1', 'P'), E('diode', 'a2', 'P'), E('diode', 'N', 'a1'), E('diode', 'N', 'a2'), C, R] : [src, E('diode', 'a1', 'P'), E('wire', 'a2', 'N'), C, R];
  const s = emptyState(); s.vc.set(C.id, Math.max(0, bridgePeak(V2, st.rect === 'bridge' ? 2 : 1)));
  const xs = [], vs = [], vo = [], cyc = 12;
  for (let k = 0; k < cyc * per; k++) { const r = step(els, s, dt); if (k >= (cyc - 3) * per) { xs.push(s.t * 1000); vs.push(r.v('a1') - r.v('a2')); vo.push(r.v('P') - r.v('N')); } }
  const vmax = Math.max(...vo), vmin = Math.min(...vo), mean = vo.reduce((a, b) => a + b, 0) / vo.length;
  cache = { key, xs, vs, vo, vmax, vmin, mean, V2 };
  return cache;
}
const diodeSym = (x1, y1, x2, y2, on) => {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, a = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI, col = on ? '#f59e0b' : 'var(--text)';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${on ? 3 : 2}"/><g transform="translate(${mx} ${my}) rotate(${a.toFixed(1)})"><polygon points="-6,-7 -6,7 6,0" fill="${on ? '#f59e0b' : 'var(--surface)'}" stroke="${col}" stroke-width="2"/><line x1="6" y1="-7" x2="6" y2="7" stroke="${col}" stroke-width="2"/></g>`;
};
function supplySvg(pos) {
  const W = 360, H = 180;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="ספק מתח: שנאי, מיישר, קבל ועומס">`;
  s += `<circle cx="34" cy="90" r="16" class="pg-csym"/><path d="M24,90 q5,-10 10,0 q5,10 10,0" fill="none" class="pg-cw"/>` + text(34, 125, `${num(T().V2, 1)} V~`, COL.v, 'middle', 'pg-tn');
  if (st.rect === 'bridge') {
    const top = [150, 40], bot = [150, 140], P = [200, 90], N = [100, 90];
    s += `<path d="M34,74 L34,40 L150,40 M34,106 L34,140 L150,140 M100,90 L100,165 L320,165 M200,90 L260,90 L320,90" fill="none" class="pg-cw"/>`;
    s += diodeSym(...top, ...P, pos === 1) + diodeSym(...bot, ...P, pos === -1) + diodeSym(...N, ...top, pos === -1) + diodeSym(...N, ...bot, pos === 1);
    for (const p of [top, bot, P, N]) s += `<circle cx="${p[0]}" cy="${p[1]}" r="3" class="pg-cnode"/>`;
  } else {
    s += `<path d="M34,74 L34,40 L100,40 M200,40 L260,40 L260,90 M34,106 L34,165 L320,165 M260,90 L320,90" fill="none" class="pg-cw"/>` + diodeSym(100, 40, 200, 40, pos === 1);
  }
  s += `<line x1="260" y1="90" x2="260" y2="122" class="pg-cw"/><line x1="248" y1="122" x2="272" y2="122" class="pg-cw"/><line x1="248" y1="130" x2="272" y2="130" class="pg-cw"/><line x1="260" y1="130" x2="260" y2="165" class="pg-cw"/>`;
  s += `<line x1="320" y1="90" x2="320" y2="104" class="pg-cw"/><rect x="312" y="104" width="16" height="44" rx="2" class="pg-csym"/><line x1="320" y1="148" x2="320" y2="165" class="pg-cw"/>`;
  s += text(244, 118, `${st.C} µF`, '', 'end', 'pg-tn') + text(334, 130, `${st.Rs} Ω`, '', 'start', 'pg-tn') + text(290, 84, '+', 'var(--bad)', 'middle', 'pg-b');
  return s + '</svg>';
}

export function renderXfmr(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>🔁 שנאי</h2><p class="small muted">שני סלילים על ליבת ברזל אחת. זרם חילופין בראשוני יוצר שטף מתחלף, והשטף משרה מתח במשני. היחס בין המתחים הוא היחס בין מספרי הכריכות.</p>
      <div class="chips"><button class="chip" data-act="view" data-v="ideal" aria-pressed="${st.view === 'ideal'}">שנאי ועומס</button><button class="chip" data-act="view" data-v="supply" aria-pressed="${st.view === 'supply'}">ספק מתח פשוט</button></div></div>
    <div class="card pg-stage"><div id="xfDraw"></div><div id="xfPlot"></div></div>
    <div class="card" id="xfEd"></div>
    <div class="card" id="xfRes"></div>`;
  const dr = root.querySelector('#xfDraw'), pv = root.querySelector('#xfPlot'), ed = root.querySelector('#xfEd'), out = root.querySelector('#xfRes');
  let raf = 0, t0 = 0, lastPos = 2;
  const editor = () => `<h3 class="pg-h">השנאי</h3>${slider('V1', 'מתח ראשוני (RMS)', ltr(`${st.V1} V`), LIM.V1, 1, st.V1)}${slider('N1', 'כריכות ראשוני N1', ltr(String(st.N1)), LIM.N1, 10, st.N1)}${slider('N2', 'כריכות משני N2', ltr(String(st.N2)), LIM.N2, 1, st.N2)}
      ${st.view === 'ideal' ? slider('RL', 'עומס במשני RL', ltr(`${st.RL} Ω`), LIM.RL, 1, st.RL) : `<h3 class="pg-h">הספק</h3>${chips([['bridge', 'גשר דיודות'], ['half', 'דיודה אחת']], st.rect, 'rect')}${slider('C', 'קבל החלקה', ltr(`${st.C} µF`), LIM.C, 10, st.C)}${slider('Rs', 'עומס', ltr(`${st.Rs} Ω`), LIM.Rs, 1, st.Rs)}`}
      <p class="small muted">ברשת בישראל ${ltr('230 V, 50 Hz')} (מקור: ${ltr(GRID.src)}). מספרי הכריכות הם ערכים לדוגמה.</p>`;
  function results() {
    const t = T();
    if (st.view === 'ideal') return `<h3 class="pg-h">שנאי אידיאלי</h3>
      <div class="pg-max"><div><span>יחס כריכות</span><b>${ltr(`a = N1/N2 = ${num(t.a, 2)}`)}</b></div><div><span>מתח משני</span><b>${ltr(`V2 = V1·N2/N1 = ${si(t.V2, 'V')}`)}</b></div><div><span>זרם משני</span><b>${ltr(`I2 = V2/RL = ${si(t.I2, 'A')}`)}</b></div><div><span>זרם ראשוני</span><b>${ltr(`I1 = I2·N2/N1 = ${si(t.I1, 'A')}`)}</b></div><div><span>הספק</span><b>${ltr(`V1·I1 = V2·I2 = ${si(t.P2, 'W')}`)}</b></div><div><span>העומס כפי שהראשוני רואה</span><b>${ltr(`a²·RL = ${si(t.Rin, 'Ω')}`)}</b></div></div>
      <p class="small">${t.a > 1 ? 'שנאי מוריד' : t.a < 1 ? 'שנאי מעלה' : 'שנאי 1:1 (בידוד)'}: מה שמרוויחים במתח משלמים בזרם, כי ההספק נשמר (בשנאי אידיאלי, בלי הפסדים). זה כמו תיבת הילוכים: מומנט מול מהירות.</p>
      <p class="small">שנאי עובד רק בזרם חילופין: הוא צריך שטף <b>משתנה</b>. במתח ישר אין השראה במשני, והראשוני הוא רק סליל עם התנגדות נמוכה, כלומר כמעט קצר.</p>
      <p class="small muted">בשנאי אמיתי יש הפסדים בנחושת (${ltr('I²R')}) ובליבה (היסטרזיס וזרמי מערבולת, ולכן הליבה עשויה פחים מבודדים), וזרם מגנוט קטן גם בלי עומס. לכן בתעשיית הרשת מעלים את המתח להולכה: באותו הספק הזרם קטן, וההפסד ${ltr('I²R')} בקווים קטן בריבוע.</p>${SAFETY}`;
    const q = supply(), I = q.mean / st.Rs, n = st.rect === 'bridge' ? 2 : 1, rf = st.rect === 'bridge' ? rippleFull(I, GRID.f, st.C * 1e-6) : rippleHalf(I, GRID.f, st.C * 1e-6);
    return `<h3 class="pg-h">ספק מתח: שנאי, מיישר, קבל</h3>
      <div class="pg-max"><div><span>שיא אחרי המיישר</span><b>${ltr(`√2·V2 − ${n}·VF = ${num(bridgePeak(q.V2, n), 2)} V`)}</b><small class="muted">בסימולציה: ${ltr(`${num(q.vmax, 2)} V`)} (קצת פחות: התנגדות הליפופים והדיודות)</small></div><div><span>מתח ממוצע ביציאה</span><b>${ltr(`${num(q.mean, 2)} V`)}</b></div><div><span>גלים (ripple) מהנוסחה</span><b>${ltr(`ΔV ≈ I/(${n === 2 ? '2' : ''}fC) = ${num(rf, 2)} V`)}</b></div><div><span>גלים בסימולציה</span><b>${ltr(`${num(q.vmax - q.vmin, 2)} V`)}</b></div><div><span>זרם עומס</span><b>${ltr(si(I, 'A'))}</b></div><div><span>תדר הגלים</span><b>${ltr(`${n === 2 ? 2 * GRID.f : GRID.f} Hz`)}</b></div></div>
      <p class="small">${st.rect === 'bridge' ? 'בגשר, בכל חצי מחזור זוג דיודות אחר מוליך (הן נצבעות בכתום), כך ששני חצאי הגל יוצאים חיוביים: יישור גל מלא. הזרם עובר תמיד דרך שתי דיודות, ולכן מאבדים בערך 1.4 V.' : 'דיודה אחת מעבירה רק את חצי הגל החיובי: יישור חצי גל. הקבל צריך להחזיק את העומס מחזור שלם, ולכן הגלים כפולים.'}</p>
      <p class="small">הקבל נטען כמעט עד השיא, ובין השיאים מזין את העומס ונפרק. קבל גדול יותר או עומס קטן יותר: פחות גלים. הנוסחה ${ltr('ΔV ≈ I/(2fC)')} מניחה שהקבל נפרק בזרם קבוע כמעט כל חצי מחזור, ולכן היא קצת שמרנית.</p>
      <p class="small muted">נסה למדוד את זה במצב ⚡ מעגלים, בתבנית "גשר דיודות": במולטימטר ${ltr('V⎓')} רואים את הממוצע, ${ltr('V~')} את הגלים, ו-Hz מראה ${ltr('100 Hz')}.</p>${SAFETY}`;
  }
  const draw = (frac = 0) => {
    if (st.view === 'ideal') {
      dr.innerHTML = xfmrSvg();
      const t = T(), xs = [], v1 = [], v2 = []; for (let k = 0; k <= 120; k++) { const tt = (k / 120) * 0.04; xs.push(tt * 1000); v1.push(st.V1 * Math.SQRT2 * Math.sin(2 * Math.PI * GRID.f * tt)); v2.push(t.V2 * Math.SQRT2 * Math.sin(2 * Math.PI * GRID.f * tt)); }
      pv.innerHTML = plot({ xs, series: [{ ys: v1, col: COL.v, label: 'v1' }, { ys: v2, col: COL.p, label: 'v2', axis: 'r' }], units: { x: 'ms', l: 'V', r: 'V' }, sym: true });
      return;
    }
    const q = supply(), k = Math.min(q.xs.length - 1, Math.floor(frac * q.xs.length)), pos = q.vs[k] > 0.5 ? 1 : q.vs[k] < -0.5 ? -1 : 0;
    if (pos !== lastPos || !dr.firstChild) { dr.innerHTML = supplySvg(pos); lastPos = pos; }
    const vsAbs = st.rect === 'bridge' ? q.vs.map((v) => Math.max(0, Math.abs(v) - 2 * VF)) : q.vs;
    pv.innerHTML = plot({ xs: q.xs.map((x) => x - q.xs[0]), series: [{ ys: vsAbs, col: COL.v, label: st.rect === 'bridge' ? '|v2| − 1.4' : 'v2', dash: '4 3', w: 1.4 }, { ys: q.vo, col: COL.p, label: 'vout' }], units: { x: 'ms', l: 'V' }, cursor: q.xs[k] - q.xs[0], marks: [] });
  };
  const refresh = (full = true) => {
    lastPos = 2; draw(); out.innerHTML = results();
    root.querySelectorAll('[data-act="view"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === st.view)));
    if (full) ed.innerHTML = editor();
    else { const tmp = document.createElement('div'); tmp.innerHTML = editor(); const nb = tmp.querySelectorAll('.pg-range b'); ed.querySelectorAll('.pg-range b').forEach((b, i) => { if (nb[i]) b.innerHTML = nb[i].innerHTML; }); }
  };
  refresh();
  const tick = (now) => {
    if (!root.isConnected) return;
    if (st.view === 'supply') { if (!t0) t0 = now; draw(((now - t0) / 6000) % 1); }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'view') st.view = b.dataset.v; else if (b.dataset.act === 'rect') st.rect = b.dataset.v; else return;
    save(); refresh();
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!f || !(f in LIM)) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    st[f] = Math.min(LIM[f][1], Math.max(LIM[f][0], v)); save(); refresh(false);
  });
  return () => cancelAnimationFrame(raf);
}
