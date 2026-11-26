// playground-trans.js: the playground's transients mode. A capacitor charging and discharging, a coil that
// resists change, the voltage spike when a coil is switched off (and the freewheel diode that stops it),
// and RLC resonance with a frequency slider.
// Time solver: step() in js/circuit.js (checked in tests/circuit-cases.mjs); resonance: solveAC, resonanceF, seriesQ (tests/ac-cases.mjs).
import { step, emptyState, solveAC, resonanceF, seriesQ, cabs, carg, VF } from './circuit.js';
import { esc } from './text.js';
import { ltr, si, num, slider, chips, plot, COL, go } from './elec-ui.js';

const KEY = 'mh-pg-trans-v1';
const SCEN = [['rc', 'טעינת קבל'], ['rl', 'סליל'], ['kick', 'ניתוק סליל'], ['rlc', 'תהודה RLC']];
const R_GAP = 10e3; // Ω, the open contact as a large resistor (example value: in reality the voltage rises until the air breaks down)
const LIM = { V: [1, 24], R: [1, 10000], Rrl: [1, 200], C: [10, 4700], L: [10, 5000], Rl: [1, 100], f: [1, 3.3], Rr: [1, 100], Lr: [10, 500], Cr: [1, 100] };
const defaults = () => ({ sc: 'rc', V: 12, R: 1000, Rrl: 10, C: 1000, L: 1000, Rl: 12, fw: false, f: Math.log10(159), Rr: 10, Lr: 100, Cr: 10 });
let st = null;
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') for (const k of Object.keys(st)) { if (k === 'sc' ? SCEN.some(([v]) => v === s[k]) : k === 'fw' ? typeof s[k] === 'boolean' : Number.isFinite(s[k])) st[k] = s[k]; } } catch (e) { /* ignore */ }
  for (const [k, [a, b]] of Object.entries(LIM)) st[k] = Math.min(b, Math.max(a, st[k]));
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };

// run a time simulation; phases: [{ until, set(els) }]. returns { xs (s), ch: { name: [] } }
function run(els, T, phases, probe, n = 1500) {
  const s = emptyState(), dt = T / n, xs = [], ch = {};
  let p = 0; phases[0].set(els);
  for (let k = 0; k < n; k++) {
    if (p + 1 < phases.length && s.t + dt > phases[p].until) { p++; phases[p].set(els); }
    const r = step(els, s, dt); xs.push(s.t);
    for (const [name, f] of Object.entries(probe)) (ch[name] || (ch[name] = [])).push(f(r));
  }
  return { xs, ch };
}
let id = 1;
const E = (type, a, b, p = {}) => ({ id: id++, type, a, b, ...p });

function simulate() {
  if (st.sc === 'rc') {
    const tau = st.R * st.C * 1e-6, sw1 = E('sw', 'p', 'x', { on: true }), sw2 = E('sw', 'x', 'g', { on: false }), R = E('res', 'x', 'c', { R: st.R }), C = E('cap', 'c', 'g', { C: st.C * 1e-6 });
    const els = [E('bat', 'p', 'g', { V: st.V, r: 1e-3 }), sw1, sw2, R, C];
    const out = run(els, 10 * tau, [{ until: 5 * tau, set: () => { sw1.on = true; sw2.on = false; } }, { until: Infinity, set: () => { sw1.on = false; sw2.on = true; } }], { v: (r) => r.Vd.get(C.id), i: (r) => r.I.get(R.id) });
    return { ...out, tau, unit: 's', marks: [{ x: tau, label: 'τ' }, { x: 5 * tau, label: 'פריקה' }, { x: 6 * tau, label: 'τ' }], series: [{ ys: out.ch.v, col: COL.v, label: 'vC' }, { ys: out.ch.i, col: COL.i, label: 'i', axis: 'r' }], units: { l: 'V', r: 'A' } };
  }
  if (st.sc === 'rl') {
    const L = st.L / 1000, tau = L / st.Rrl, sw1 = E('sw', 'p', 'x', { on: true }), sw2 = E('sw', 'x', 'g', { on: false }), R = E('res', 'x', 'm', { R: st.Rrl }), Li = E('ind', 'm', 'g', { L });
    const els = [E('bat', 'p', 'g', { V: st.V, r: 1e-3 }), sw1, sw2, R, Li];
    const out = run(els, 10 * tau, [{ until: 5 * tau, set: () => { sw1.on = true; sw2.on = false; } }, { until: Infinity, set: () => { sw1.on = false; sw2.on = true; } }], { v: (r) => r.Vd.get(Li.id), i: (r) => r.I.get(Li.id) });
    return { ...out, tau, marks: [{ x: tau, label: 'τ' }, { x: 5 * tau, label: 'עקיפה' }], series: [{ ys: out.ch.i, col: COL.i, label: 'iL' }, { ys: out.ch.v, col: COL.v, label: 'vL', axis: 'r' }], units: { l: 'A', r: 'V' } };
  }
  if (st.sc === 'kick') {
    const L = st.L / 1000, tau = L / st.Rl, sw = E('sw', 'p', 'x', { on: true }), Li = E('ind', 'x', 'm', { L }), Rc = E('res', 'm', 'g', { R: st.Rl });
    const els = [E('bat', 'p', 'g', { V: st.V, r: 1e-3 }), sw, E('res', 'p', 'x', { R: R_GAP }), Li, Rc];
    if (st.fw) els.push(E('diode', 'g', 'x'));
    // start from the steady current V/R: the coil has been on for a long time
    const s0 = emptyState(); s0.il.set(Li.id, st.V / st.Rl);
    // without the diode the current dies with L/(R_gap + R): far faster than τ, so small steps right after opening
    const T = 4 * tau, dt = T / 1500, tg = L / (R_GAP + st.Rl), xs = [], v = [], i = [], t0 = 0.5 * tau;
    while (s0.t < T - 1e-12) {
      let h = !st.fw && s0.t >= t0 - 1e-12 && s0.t < t0 + 10 * tg ? Math.min(dt, tg / 20) : dt;
      if (s0.t < t0 - 1e-12) h = Math.min(h, t0 - s0.t);
      sw.on = s0.t < t0 - 1e-12; const r = step(els, s0, h); xs.push(s0.t); v.push(r.v('x') - r.v('g')); i.push(r.I.get(Li.id));
    }
    return { xs, ch: { v, i }, tau, zoom: st.fw ? null : [t0 - 4 * tg, t0 + 12 * tg], marks: [{ x: t0, label: 'פתיחה' }], series: [{ ys: v, col: COL.v, label: 'vL' }, { ys: i, col: COL.i, label: 'i', axis: 'r' }], units: { l: 'V', r: 'A' } };
  }
  return null;
}

function rlcParts(f) {
  const s = E('vac', 'p', 'g', { Vrms: st.V, f, r: 1e-6 }), R = E('res', 'p', 'x', { R: st.Rr }), L = E('ind', 'x', 'y', { L: st.Lr / 1000 }), C = E('cap', 'y', 'g', { C: st.Cr * 1e-6 });
  const r = solveAC([s, R, L, C], f);
  return { I: r.I.get(R.id), VL: r.Vd.get(L.id), VC: r.Vd.get(C.id) };
}
function rlcSvg(cur) {
  const fs = [], Is = []; const f0 = resonanceF(st.Lr / 1000, st.Cr * 1e-6);
  for (let k = 0; k <= 200; k++) { const f = 10 ** (1 + (2.3 * k) / 200); fs.push(Math.log10(f)); Is.push(cabs(rlcParts(f).I)); }
  return plot({ xs: fs, series: [{ ys: Is, col: COL.i, label: 'I (RMS)' }], units: { x: 'log f', l: 'A' }, cursor: Math.log10(cur), marks: [{ x: Math.log10(f0), label: `f0=${num(f0, 0)} Hz`, col: COL.p }] });
}

export function renderTrans(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>⏱ מעברים</h2><p class="small muted">מה קורה ברגע שסוגרים או פותחים מתג: קבל לא מקבל קפיצה במתח, סליל לא מקבל קפיצה בזרם.</p>
      <div class="pg-templates">${SCEN.map(([v, t]) => `<button class="chip" data-sc="${v}" aria-pressed="${st.sc === v}">${esc(t)}</button>`).join('')}</div></div>
    <div class="card pg-stage"><div id="trPlot"></div><p class="small muted pg-hint" id="trHint"></p></div>
    <div class="card" id="trEd"></div>
    <div class="card" id="trRes"></div>`;
  const pv = root.querySelector('#trPlot'), hint = root.querySelector('#trHint'), ed = root.querySelector('#trEd'), out = root.querySelector('#trRes');
  let sim = null, raf = 0, t0 = 0;
  const fNow = () => Math.round(10 ** st.f);
  const editor = () => {
    const head = `<h3 class="pg-h">ערכים</h3>`;
    if (st.sc === 'rc') return head + slider('V', 'מתח הסוללה', ltr(`${st.V} V`), LIM.V, 1, st.V) + slider('R', 'R', ltr(si(st.R, 'Ω')), LIM.R, 10, st.R) + slider('C', 'C', ltr(`${st.C} µF`), LIM.C, 10, st.C);
    if (st.sc === 'rl') return head + slider('V', 'מתח הסוללה', ltr(`${st.V} V`), LIM.V, 1, st.V) + slider('Rrl', 'R', ltr(si(st.Rrl, 'Ω')), LIM.Rrl, 1, st.Rrl) + slider('L', 'L', ltr(si(st.L / 1000, 'H')), LIM.L, 10, st.L);
    if (st.sc === 'kick') return head + slider('V', 'מתח הסוללה', ltr(`${st.V} V`), LIM.V, 1, st.V) + slider('L', 'L של הסליל (ממסר, מגען)', ltr(si(st.L / 1000, 'H')), LIM.L, 10, st.L) + slider('Rl', 'התנגדות הסליל', ltr(`${st.Rl} Ω`), LIM.Rl, 1, st.Rl) + chips([['0', 'בלי דיודה'], ['1', 'עם דיודת freewheel']], st.fw ? '1' : '0', 'fw');
    return head + slider('V', 'מתח המקור (RMS)', ltr(`${st.V} V`), LIM.V, 1, st.V) + slider('f', 'תדר', ltr(`${fNow()} Hz`), LIM.f, 0.005, st.f) + slider('Rr', 'R', ltr(`${st.Rr} Ω`), LIM.Rr, 1, st.Rr) + slider('Lr', 'L', ltr(`${st.Lr} mH`), LIM.Lr, 1, st.Lr) + slider('Cr', 'C', ltr(`${st.Cr} µF`), LIM.Cr, 1, st.Cr) + '<div class="chips"><button class="chip" data-act="tof0">קפוץ ל-f0</button></div>';
  };
  function results() {
    if (st.sc === 'rc') {
      const tau = st.R * st.C * 1e-6;
      return `<h3 class="pg-h">טעינה ופריקה של קבל</h3><div class="pg-max"><div><span>קבוע זמן</span><b>${ltr(`τ = RC = ${si(tau, 's')}`)}</b></div><div><span>אחרי τ</span><b>${ltr(`${num(st.V * (1 - Math.exp(-1)), 2)} V = 63.2%`)}</b></div><div><span>זרם התחלתי</span><b>${ltr(`V/R = ${si(st.V / st.R, 'A')}`)}</b></div><div><span>אנרגיה בקבל המלא</span><b>${ltr(`½CV² = ${si(0.5 * st.C * 1e-6 * st.V ** 2, 'J')}`)}</b></div></div>
        <p class="small">טעינה: ${ltr('vC = V(1 − e^(−t/RC))')}, פריקה: ${ltr('vC = V·e^(−t/RC)')}. ברגע הסגירה הקבל ריק ומתנהג כמו קצר, ולכן הזרם מקסימלי. אחרי בערך ${ltr('5τ')} הוא מלא והזרם כמעט 0: במתח ישר יציב, קבל הוא מעגל פתוח. בפריקה הזרם הפוך.</p>
        <p class="small muted">איפה רואים את זה: ספק כוח שנשאר טעון אחרי ניתוק (לכן פורקים לפני מדידה), השהיה בטיימר, החלקת מתח אחרי מיישר.</p>`;
    }
    if (st.sc === 'rl') {
      const L = st.L / 1000, tau = L / st.Rrl;
      return `<h3 class="pg-h">סליל מתנגד לשינוי</h3><div class="pg-max"><div><span>קבוע זמן</span><b>${ltr(`τ = L/R = ${si(tau, 's')}`)}</b></div><div><span>זרם סופי</span><b>${ltr(`V/R = ${si(st.V / st.Rrl, 'A')}`)}</b></div><div><span>אנרגיה בשדה</span><b>${ltr(`½LI² = ${si(0.5 * L * (st.V / st.Rrl) ** 2, 'J')}`)}</b></div></div>
        <p class="small">${ltr('vL = L·di/dt')}: כדי לשנות זרם בסליל צריך מתח. ברגע החיבור הזרם 0 וכל המתח על הסליל, ואז הזרם עולה: ${ltr('i = (V/R)(1 − e^(−t/τ))')}. כשעוקפים את הסוללה, הסליל ממשיך לדחוף את אותו זרם ודועך באותו τ. המתח על הסליל מתהפך.</p>
        <p class="small muted">זו "האינרציה" של הזרם, בדיוק כמו מסה שמתנגדת לשינוי במהירות: L מקביל ל-m, ו-${ltr('½LI²')} מקביל ל-${ltr('½mv²')}.</p>`;
    }
    if (st.sc === 'kick') {
      const I0 = st.V / st.Rl, vpk = sim ? Math.max(...sim.ch.v.map((x) => Math.abs(x))) : 0;
      return `<h3 class="pg-h">${st.fw ? 'עם דיודת freewheel' : 'ניצוץ בניתוק סליל'}</h3><div class="pg-max"><div><span>זרם לפני הניתוק</span><b>${ltr(`I0 = ${si(I0, 'A')}`)}</b></div><div><span>מתח שיא על הסליל</span><b style="color:${st.fw ? 'var(--good)' : 'var(--bad)'}">${ltr(si(vpk, 'V'))}</b></div><div><span>${st.fw ? 'דעיכה דרך הדיודה' : 'הדעיכה'}</span><b>${ltr(st.fw ? `τ = L/R = ${si(st.L / 1000 / st.Rl, 's')}` : `τ ≈ L/R_gap = ${si(st.L / 1000 / R_GAP, 's')}`)}</b></div></div>
        ${st.fw ? `<p class="small">הדיודה מחוברת הפוך, במקביל לסליל. כשהמתג סגור היא חוסמת. כשפותחים, הסליל ממשיך לדחוף את הזרם, והדיודה נותנת לו מסלול סגור: המתח על הסליל רק בערך ${ltr(`−${VF} V`)}, והאנרגיה ${ltr('½LI²')} נשרפת לאט בהתנגדות של הסליל.</p>
          <p class="small muted">לכן כל סליל של ממסר שמופעל מטרנזיסטור מקבל דיודה כזו. החיסרון: הממסר משתחרר קצת יותר לאט.</p>`
        : `<p class="small">הסליל לא מוכן שהזרם ייפסק מיד. ${ltr('v = L·di/dt')}, וכשמנסים לעצור את הזרם בבת אחת, ${ltr('di/dt')} עצום ולכן גם המתח. כאן המגע הפתוח הוא נגד של ${ltr(si(R_GAP, 'Ω'))} (ערך לדוגמה), כך שהמתח קופץ ל-${ltr('I0·R_gap')}. במציאות המתח עולה עד שהאוויר בין המגעים נפרץ ונוצר ניצוץ (קשת).</p>
          <p class="small muted">הניצוץ שוחק מגעים של מתגים וממסרים, וקוצים כאלה שורפים טרנזיסטורים. כך עובד גם סליל ההצתה ברכב. נסה להוסיף את הדיודה.</p>`}`;
    }
    const f = fNow(), f0 = resonanceF(st.Lr / 1000, st.Cr * 1e-6), Q = seriesQ(st.Rr, st.Lr / 1000, st.Cr * 1e-6), p = rlcParts(f);
    return `<h3 class="pg-h">תהודה ב-RLC טורי</h3><div class="pg-max"><div><span>תדר תהודה</span><b>${ltr(`f0 = 1/(2π√(LC)) = ${num(f0, 1)} Hz`)}</b></div><div><span>מקדם איכות</span><b>${ltr(`Q = (1/R)√(L/C) = ${num(Q, 2)}`)}</b></div><div><span>רוחב פס</span><b>${ltr(`f0/Q = ${num(f0 / Q, 1)} Hz`)}</b></div><div><span>בתדר ${ltr(`${f} Hz`)}</span><b>${ltr(`I = ${si(cabs(p.I), 'A')}, φ = ${num(-carg(p.I), 1)}°`)}</b></div><div><span>מתח על הסליל</span><b>${ltr(si(cabs(p.VL), 'V'))}</b></div><div><span>מתח על הקבל</span><b>${ltr(si(cabs(p.VC), 'V'))}</b></div></div>
      <p class="small">ב-${ltr('f0')}: ${ltr('XL = XC')}, הם מבטלים זה את זה, נשאר רק R, והזרם הכי גדול (${ltr(`V/R = ${si(st.V / st.Rr, 'A')}`)}). המתח על הסליל ועל הקבל בתהודה גדול פי Q ממתח המקור, למרות שהם בטור. מתחת ל-${ltr('f0')} המעגל קיבולי (הזרם מקדים), מעליו השראי.</p>
      <p class="small muted">זה בדיוק כמו תהודה במערכת קפיץ ומסה (במצב ${go('vib', '〰 רטט')}): L כמו מסה, 1/C כמו קשיחות, R כמו ריסון. ${ltr('ω0 = 1/√(LC)')} מקביל ל-${ltr('ω0 = √(k/m)')}.</p>`;
  }
  const draw = (cursor = null) => {
    if (st.sc === 'rlc') { pv.innerHTML = rlcSvg(fNow()); hint.textContent = 'הזרם לפי התדר (ציר לוגריתמי). הקו האנכי הוא התדר שבחרת.'; return; }
    if (!sim) sim = simulate();
    pv.innerHTML = plot({ xs: sim.xs, series: sim.series, units: { x: 's', ...sim.units }, marks: sim.marks, cursor });
    if (sim.zoom) {
      const [a, b] = sim.zoom, t0 = sim.marks[0].x, k = sim.xs.map((x, j) => (x > t0 + 1e-12 && x <= b ? j : -1)).filter((j) => j >= 0), before = k[0] - 1;
      const xs = [a, ...k.map((j) => sim.xs[j])].map((x) => (x - t0) * 1e6);
      pv.innerHTML += `<p class="small muted">מקרוב: ${ltr(si(b - a, 's'))} סביב רגע הפתיחה (0 = הפתיחה)</p>` + plot({ xs, series: sim.series.map((q) => ({ ...q, ys: [q.ys[before], ...k.map((j) => q.ys[j])] })), units: { x: 'µs', ...sim.units }, marks: [{ x: 0, label: '' }] });
    }
    hint.textContent = st.sc === 'kick' ? 'הסליל היה מחובר זמן רב, ואז פותחים את המתג.' : 'קודם המתג מחבר את הסוללה, ובחצי הזמן מעבירים אותו למצב שעוקף אותה.';
  };
  const refresh = (full = true) => {
    sim = null; draw(); out.innerHTML = results();
    root.querySelectorAll('[data-sc]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sc === st.sc)));
    if (full) ed.innerHTML = editor();
    else { const tmp = document.createElement('div'); tmp.innerHTML = editor(); const nb = tmp.querySelectorAll('.pg-range b'); ed.querySelectorAll('.pg-range b').forEach((b, i) => { if (nb[i]) b.innerHTML = nb[i].innerHTML; }); }
  };
  refresh();
  // a cursor that walks along the time plot
  const tick = (now) => {
    if (!root.isConnected) return;
    if (sim && st.sc !== 'rlc') { if (!t0) t0 = now; const T = sim.xs[sim.xs.length - 1], c = (((now - t0) / 5000) % 1) * T; const cur = pv.querySelector('.pg-cur'); if (cur) { const x = 34 + (c / T) * (360 - 34 - 34); cur.setAttribute('x1', x.toFixed(1)); cur.setAttribute('x2', x.toFixed(1)); } else draw(c); }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  root.addEventListener('click', (ev) => {
    const sc = ev.target.closest('[data-sc]');
    if (sc) { st.sc = sc.dataset.sc; save(); refresh(); return; }
    const b = ev.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'fw') st.fw = b.dataset.v === '1';
    else if (b.dataset.act === 'tof0') st.f = Math.log10(resonanceF(st.Lr / 1000, st.Cr * 1e-6));
    else return;
    save(); refresh();
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!f || !(f in LIM)) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    st[f] = Math.min(LIM[f][1], Math.max(LIM[f][0], v)); save(); refresh(false);
  });
  return () => cancelAnimationFrame(raf);
}
