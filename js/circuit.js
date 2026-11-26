// circuit.js: a small circuit simulator (nodal analysis) for the playground's electricity modes,
// and the digital multimeter that measures it.
// Every two-terminal element is a conductance g in series with an EMF e: i(a→b) = g·(Va − Vb − e).
//   resistor, wire, lamp, closed switch, fuse, cable: e = 0
//   battery (a = +): e = V, g = 1/r (internal resistance)
//   capacitor (backward Euler): g = C/dt, e = v of the last step
//   inductor (backward Euler):  g = 1/(rL + L/dt), e = −i_last·L/dt (rL: its winding resistance, default 0)
//   diode (a = anode): on → g = 1/R_ON, e = VF ; off → g ≈ 0
//   AC source vac (a = the terminal that is + when sin > 0): e = √2·Vrms·sin(2πft + φ), g = 1/r
// AC in steady state: solveAC() does the same nodal analysis with phasors (complex numbers, RMS).
// Checked in tests/circuit-cases.mjs and tests/ac-cases.mjs.

export const R_WIRE = 1e-3; // Ω, a short piece of wire
export const VF = 0.7, R_ON = 0.05, G_OFF = 1e-9; // silicon diode, simple model
const G_LEAK = 1e-10; // every node to ground: floating parts settle at 0 V instead of a singular matrix
// resistivity at 20 °C [Ω·m] (CRC Handbook values, as listed on Wikipedia "Electrical resistivity and conductivity")
export const RHO = { cu: 1.68e-8, al: 2.65e-8 };
export const MAT_NAME = { cu: 'נחושת', al: 'אלומיניום' };
export const cableR = (len, areaMm2, mat = 'cu') => (RHO[mat] * len) / (areaMm2 * 1e-6);
export const lampR = (V, P) => (V * V) / P;

// conductance and EMF of one element for this step
function stamp(el, ctx) {
  const { dt, prev, zero, dc, t } = ctx;
  switch (el.type) {
    case 'vac': return [1 / Math.max(el.r ?? 0.05, 1e-6), zero || dc ? 0 : Math.SQRT2 * el.Vrms * Math.sin(2 * Math.PI * el.f * t + ((el.ph || 0) * Math.PI) / 180)];
    case 'wire': return [1 / R_WIRE, 0];
    case 'res': return [1 / Math.max(el.R, 1e-6), 0];
    case 'lamp': return [1 / lampR(el.V, el.P), 0];
    case 'cable': return [1 / Math.max(cableR(el.len, el.area, el.mat), 1e-6), 0];
    case 'sw': return el.on ? [1 / R_WIRE, 0] : [0, 0];
    case 'fuse': return el.blown ? [0, 0] : [1 / R_WIRE, 0];
    case 'bat': return [1 / Math.max(el.r ?? 0.05, 1e-6), zero ? 0 : el.V];
    case 'cap': { if (dc) return [0, 0]; const g = el.C / dt; return [g, zero ? 0 : (prev.vc.get(el.id) || 0)]; }
    // inductor with its own winding resistance rL (backward Euler): v = rL·i + L·(i − i_prev)/dt
    case 'ind': { const rL = el.rL || 0; if (dc) return [1 / Math.max(rL, R_WIRE), 0]; const g = 1 / (rL + el.L / dt), il = zero ? 0 : (prev.il.get(el.id) || 0); return [g, (-il * el.L) / dt]; }
    case 'meter': return [1 / el.R, 0];
    default: return [0, 0];
  }
}

function gauss(A, b) {
  const n = b.length;
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    const d = A[c][c]; if (Math.abs(d) < 1e-300) continue;
    for (let r = c + 1; r < n; r++) { const f = A[r][c] / d; if (!f) continue; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]; x[r] = Math.abs(A[r][r]) < 1e-300 ? 0 : s / A[r][r]; }
  return x;
}

export const emptyState = () => ({ vc: new Map(), il: new Map(), t: 0 });

// one solve. opts: dt, prev (state), zero (sources off), dc (steady DC: capacitors open, inductors short), inject [{node, I}] (current into node)
export function solve(elements, opts = {}) {
  const ctx = { dt: opts.dt || 1e-3, prev: opts.prev || emptyState(), zero: !!opts.zero, dc: !!opts.dc };
  ctx.t = opts.t ?? ctx.prev.t + ctx.dt; // backward Euler: sources at the end of the step
  const nodes = [...new Set(elements.flatMap((e) => [e.a, e.b]).concat((opts.inject || []).map((q) => q.node)))];
  const idx = new Map(nodes.map((k, i) => [k, i]));
  // ground: the − terminal of the first battery or AC source, else the first node
  const bat = elements.find((e) => e.type === 'bat' || e.type === 'vac');
  const gnd = idx.get(bat ? bat.b : nodes[0]) ?? 0;
  const diodes = elements.filter((e) => e.type === 'diode'), on = new Map(diodes.map((d) => [d.id, (opts.diodeGuess || 1) > 0]));
  let V = [], ge = new Map();
  for (let it = 0; it < 30; it++) {
    const n = nodes.length, A = Array.from({ length: n }, () => new Array(n).fill(0)), b = new Array(n).fill(0);
    ge = new Map();
    for (const el of elements) {
      const [g, e] = el.type === 'diode' ? (on.get(el.id) ? [1 / R_ON, VF] : [G_OFF, 0]) : stamp(el, ctx);
      ge.set(el.id, [g, e]);
      if (!g) continue;
      const i = idx.get(el.a), j = idx.get(el.b);
      A[i][i] += g; A[j][j] += g; A[i][j] -= g; A[j][i] -= g; b[i] += g * e; b[j] -= g * e;
    }
    for (let k = 0; k < n; k++) A[k][k] += G_LEAK;
    for (const q of opts.inject || []) b[idx.get(q.node)] += q.I;
    // ground row
    A[gnd] = new Array(n).fill(0); A[gnd][gnd] = 1; b[gnd] = 0;
    V = n ? gauss(A, b) : [];
    // diode states consistent?
    let changed = false;
    for (const d of diodes) {
      const vd = V[idx.get(d.a)] - V[idx.get(d.b)], isOn = on.get(d.id);
      const want = isOn ? vd - VF > -1e-12 : vd > VF;
      if (want !== isOn) { on.set(d.id, want); changed = true; }
    }
    if (!changed) break;
  }
  const v = (k) => V[idx.get(k)] ?? 0;
  const I = new Map(), Vd = new Map();
  for (const el of elements) { const [g, e] = ge.get(el.id), vd = v(el.a) - v(el.b); Vd.set(el.id, vd); I.set(el.id, g * (vd - e)); }
  // the injected current returns through ground: so the ground node is not really grounded there
  return { nodes, v, I, Vd, gnd: nodes[gnd] };
}

// one time step of the live circuit: solve, update capacitor voltages / inductor currents, blow fuses
export function step(elements, state, dt) {
  const r = solve(elements, { dt, prev: state });
  for (const el of elements) {
    if (el.type === 'cap') state.vc.set(el.id, r.Vd.get(el.id));
    if (el.type === 'ind') state.il.set(el.id, r.I.get(el.id));
  }
  state.t += dt;
  const blown = elements.filter((el) => el.type === 'fuse' && !el.blown && Math.abs(r.I.get(el.id)) > el.I);
  return { ...r, blown };
}

// ---------- the multimeter ----------
// typical values of a hand-held digital multimeter; real ones differ between models
export const METER = { rV: 10e6, rA: 0.01, rmA: 1, fuseA: 10, fusemA: 0.4, beep: 30, ohmI: 1e-3, diodeOL: 2, ohmOL: 60e6, hzMin: 0.5 };
export const DIAL = [
  { id: 'off', label: 'OFF' }, { id: 'vac', label: 'V~' }, { id: 'vdc', label: 'V⎓' }, { id: 'mv', label: 'mV' },
  { id: 'ohm', label: 'Ω 🔊' }, { id: 'diode', label: '▶|' }, { id: 'cap', label: '⊣⊢' }, { id: 'hz', label: 'Hz %' },
  { id: 'ua', label: 'µA' }, { id: 'ma', label: 'mA' }, { id: 'a', label: 'A' },
];
// the meter as a part of the live circuit (or null): the A jacks are a shunt whatever the dial says
export function meterElement(m) {
  if (!m.red || !m.black || m.red === m.black) return null;
  if (m.jack === 'a' || m.jack === 'ma') return m.fuseOK === false ? null : { id: 'meter', type: 'meter', a: m.red, b: m.black, R: m.jack === 'a' ? METER.rA : METER.rmA };
  return { id: 'meter', type: 'meter', a: m.red, b: m.black, R: METER.rV };
}
const fmt = (x, unit) => {
  const a = Math.abs(x);
  const d = a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 2 : 3;
  return { text: (Object.is(x, -0) ? 0 : x).toFixed(d), unit };
};
// what the display shows. live: the last step result with the meter in it (or null)
// the full meter: SELECT gives AC on mV and on the current ranges, and %duty on Hz; µA shares the mA jack
export function meterReading(elements, live, m, state = emptyState()) {
  const out = (o) => ({ warn: '', beep: false, ...o });
  const cur = ['a', 'ma', 'ua'].includes(m.dial), scale = { a: [1, 'A', 10], ma: [1e3, 'mA', 400], ua: [1e6, 'µA', 6000] }[m.dial];
  if (m.dial === 'ua' && !m.ac) {
    const r = meterBase(elements, live, { ...m, dial: 'ma' }, state);
    if (!/^-?\d/.test(r.text)) return { ...r, unit: r.unit === 'mA' ? 'µA' : r.unit };
    const v = parseFloat(r.text) * 1000; return out({ ...(Math.abs(v) > 6000 ? { text: 'OL', unit: 'µA' } : fmt(v, 'µA')), warn: r.warn });
  }
  if (cur && m.ac) { // true-RMS AC current through the meter's shunt
    const jackOk = m.jack === (m.dial === 'a' ? 'a' : 'ma');
    if (!jackOk || m.fuseOK === false || !(m.red && m.black)) return meterBase(elements, live, { ...m, dial: m.dial === 'ua' ? 'ma' : m.dial }, state);
    const me = meterElement(m), q = acMeasure([...elements, me], { el: 'meter' }), v = q.rms * scale[0];
    if (!acFreqs(elements).length) return out({ ...fmt(0, scale[1]), warn: 'במעגל הזה רק זרם ישר. לחץ SELECT כדי לחזור ל-DC.' });
    return out(v > scale[2] ? { text: 'OL', unit: scale[1] } : fmt(v, scale[1]));
  }
  if (m.dial === 'mv' && m.ac && m.jack === 'v' && m.red && m.black) {
    if (!acFreqs(elements).length) return out({ ...fmt(0, 'mV'), warn: 'במעגל הזה רק מתח ישר. לחץ SELECT כדי לחזור ל-mV⎓.' });
    const me = meterElement(m), q = acMeasure(me ? [...elements, me] : elements, { a: m.red, b: m.black }), v = q.rms * 1000;
    return out(v > 600 ? { text: 'OL', unit: 'mV' } : fmt(v, 'mV'));
  }
  if (m.dial === 'hz' && m.duty && m.jack === 'v' && m.red && m.black) {
    const r = meterBase(elements, live, m, state); if (r.unit !== 'Hz' || !(parseFloat(r.text) > 0)) return { ...r, unit: '%' };
    const me = meterElement(m), q = acMeasure(me ? [...elements, me] : elements, { a: m.red, b: m.black });
    return out(fmt(q.duty ?? 50, '%'));
  }
  return meterBase(elements, live, m, state);
}
function meterBase(elements, live, m, state = emptyState()) {
  if (m.dial === 'off') return { text: '', unit: '' };
  const probes = m.red && m.black;
  const inA = m.jack === 'a' || m.jack === 'ma';
  const out = (o) => ({ warn: '', beep: false, ...o });
  // with an AC source the instant value jumps all the time: the meter shows the average (DC) or the RMS (AC)
  const hasAC = acFreqs(elements).length > 0, me = meterElement(m), withMeter = me ? [...elements, me] : elements;
  const acV = () => acMeasure(withMeter, { a: m.red, b: m.black });
  if (inA) {
    if (m.fuseOK === false) return out({ ...fmt(0, m.dial === 'ma' ? 'mA' : 'A'), warn: 'הנתיך של המד נשרף. אין זרם דרך שקע ה-A.' });
    let i = probes && live && live.I.has('meter') ? live.I.get('meter') : 0;
    if (hasAC && probes && me && (m.dial === 'a' || m.dial === 'ma')) {
      const q = acMeasure(withMeter, { el: 'meter' }); i = q.mean;
      if (q.rms > 1e-4 && m.dial === m.jack) { const r = out(m.dial === m.jack ? (m.dial === 'a' ? fmt(i, 'A') : fmt(i * 1000, 'mA')) : fmt(0, m.dial === 'a' ? 'A' : 'mA')); r.warn = `יש כאן זרם חילופין, בערך ${q.rms.toPrecision(3)} A RMS. במצב DC המד מראה רק את הממוצע, ולכן כמעט 0. לחץ SELECT כדי למדוד זרם חילופין (RMS), או השתמש בצבת בלי לפתוח את המעגל.`; return r; }
    }
    if (m.dial === 'a') return out(m.jack === 'a' ? (Math.abs(i) > 10 ? { text: 'OL', unit: 'A' } : fmt(i, 'A')) : { ...fmt(0, 'A'), warn: 'הבורר על A, אבל הפרוב האדום בשקע mA. העבר אותו לשקע A.' });
    if (m.dial === 'ma') return out(m.jack === 'ma' ? (Math.abs(i) > 0.4 ? { text: 'OL', unit: 'mA' } : fmt(i * 1000, 'mA')) : { ...fmt(0, 'mA'), warn: 'הבורר על mA, אבל הפרוב האדום בשקע A. העבר אותו לשקע mA.' });
    const vd = probes && live ? live.v(m.red) - live.v(m.black) : 0;
    return out({ ...fmt(m.dial === 'mv' ? vd * 1000 : vd, m.dial === 'mv' ? 'mV' : m.dial === 'ohm' ? 'Ω' : 'V'), warn: '⚠ הפרוב האדום בשקע הזרם, אבל הבורר לא על זרם. כך המד הוא כמעט קצר בין הפרובים: מדידת מתח במצב הזה עלולה לשרוף את הנתיך של המד, ובמתח גבוה גם לגרום לקשת חשמלית.' });
  }
  // red in the V Ω jack
  if (m.dial === 'a' || m.dial === 'ma') return out({ ...fmt(0, m.dial === 'a' ? 'A' : 'mA'), warn: 'למדידת זרם מעבירים את הפרוב האדום לשקע A או mA, ומחברים את המד בטור: פותחים את המעגל ומכניסים את המד לתוך הפתח.' });
  if (!probes) return out(m.dial === 'ohm' || m.dial === 'diode' ? { text: 'OL', unit: m.dial === 'ohm' ? 'MΩ' : 'V' } : fmt(0, { vdc: 'V', vac: 'V', mv: 'mV', cap: 'nF', hz: 'Hz' }[m.dial]));
  let vd = live ? live.v(m.red) - live.v(m.black) : 0;
  if (hasAC && ['vdc', 'mv', 'vac', 'hz'].includes(m.dial)) {
    const q = acV();
    if (m.dial === 'vac') { const r = out(q.rms > 1000 ? { text: 'OL', unit: 'V' } : fmt(q.rms, 'V')); if (Math.abs(q.mean) > 0.05) r.warn = `יש כאן גם מתח ישר של ${q.mean.toFixed(2)} V. מצב V~ מודד רק את החלק המתחלף (RMS שלו). את הממוצע רואים ב-V⎓.`; return r; }
    if (m.dial === 'hz') return q.rms < METER.hzMin ? out({ ...fmt(0, 'Hz'), warn: `המתח המתחלף בין הפרובים קטן מדי (פחות מ-${METER.hzMin} V, ערך לדוגמה), והמד לא מצליח לספור מחזורים.` }) : out(fmt(q.f, 'Hz'));
    vd = q.mean;
    const r = out(m.dial === 'vdc' ? (Math.abs(vd) > 1000 ? { text: 'OL', unit: 'V' } : fmt(vd, 'V')) : Math.abs(vd) > 0.6 || q.rms > 0.6 ? { text: 'OL', unit: 'mV' } : fmt(vd * 1000, 'mV'));
    if (q.rms > 0.05) r.warn = `יש כאן מתח חילופין (בערך ${q.rms.toPrecision(3)} V RMS). במצב V⎓ המד מראה רק את הממוצע שלו. למתח החילופין עבור ל-V~.`;
    return r;
  }
  if (m.dial === 'vdc') return out(Math.abs(vd) > 1000 ? { text: 'OL', unit: 'V' } : fmt(vd, 'V'));
  if (m.dial === 'mv') return out(Math.abs(vd) > 0.6 ? { text: 'OL', unit: 'mV' } : fmt(vd * 1000, 'mV'));
  if (m.dial === 'vac') return out({ ...fmt(0, 'V'), warn: 'במעגל הזה יש רק סוללות, כלומר מתח ישר (DC). מצב V~ מודד רק את הרכיב המתחלף, ולכן מראה 0. עבור ל-V⎓.' });
  if (m.dial === 'hz') return out({ ...fmt(0, 'Hz'), warn: 'מתח ישר לא מחליף כיוון, ולכן התדר 0.' });
  // passive measurements: the meter pushes its own small current. First check the circuit is dead.
  const others = elements;
  const liveRun = solve(others, { dt: 1e-3, prev: state });
  const vOpen = hasAC ? Math.max(Math.abs(liveRun.v(m.red) - liveRun.v(m.black)), acMeasure(others, { a: m.red, b: m.black }).rms) : liveRun.v(m.red) - liveRun.v(m.black), energized = others.some((e) => e.type === 'bat' && Math.abs(liveRun.I.get(e.id)) > 1e-6) || others.some((e) => e.type === 'vac' && e.Vrms > 0 && acMeasure(others, { el: e.id }).rms > 1e-6) || (hasAC && acMeasure(others, { a: m.red, b: m.black }).rms > 0.05);
  const charged = others.some((e) => e.type === 'cap' && Math.abs(state.vc.get(e.id) || 0) > 0.05);
  if (energized || Math.abs(vOpen) > 0.05 || charged) return out({ text: '----', unit: m.dial === 'ohm' ? 'Ω' : m.dial === 'cap' ? 'nF' : 'V', warn: `⚠ יש מתח במעגל (${Math.abs(vOpen).toFixed(2)} V בין הפרובים${charged ? ', או קבל טעון' : ''}). מודדים התנגדות, דיודה או קיבול רק כשהמעגל כבוי: פותחים מתג או מנתקים את הסוללה, ופורקים קבלים. המד מזרים זרם קטן משלו, וכל מתח חיצוני משבש את המדידה, ובמתח גבוה גם עלול להזיק למד.` });
  if (m.dial === 'ohm' || m.dial === 'diode') {
    const r = solve(others, { zero: true, dc: true, inject: [{ node: m.red, I: METER.ohmI }, { node: m.black, I: -METER.ohmI }], diodeGuess: m.dial === 'diode' ? -1 : -1 });
    const v = r.v(m.red) - r.v(m.black);
    if (m.dial === 'diode') return out(v > METER.diodeOL ? { text: 'OL', unit: 'V' } : fmt(v, 'V'));
    const R = v / METER.ohmI;
    if (R > METER.ohmOL) return out({ text: 'OL', unit: 'MΩ' });
    const beep = R < METER.beep;
    return out({ ...(R >= 1e6 ? fmt(R / 1e6, 'MΩ') : R >= 1e3 ? fmt(R / 1e3, 'kΩ') : fmt(R, 'Ω')), beep });
  }
  if (m.dial === 'cap') {
    // charge from zero with a constant current for two step lengths: a capacitor's voltage grows with time
    const I0 = 1e-6, run = (dt) => { const r = solve(others, { dt, zero: true, inject: [{ node: m.red, I: I0 }, { node: m.black, I: -I0 }] }); return r.v(m.red) - r.v(m.black); };
    const v1 = run(1e-3), v2 = run(2e-3);
    if (v2 - v1 < 0.2 * Math.abs(v1) || v2 - v1 < 1e-12) return out({ ...fmt(0, 'nF'), warn: 'אין קבל בין הפרובים: המתח לא עלה עם הזמן.' });
    const C = (I0 * 1e-3) / (v2 - v1);
    return out(C >= 1e-6 ? fmt(C * 1e6, 'µF') : fmt(C * 1e9, 'nF'));
  }
  return out({ text: '', unit: '' });
}

// ---------- AC: phasors (complex numbers, RMS values) ----------
// Israeli grid: 230 V single phase, 400 V between phases, 50 Hz, 4 wires (3 phases + neutral).
// Source: WorldStandards, "Plug, socket & voltage by country" (Israel: 230 V, 50 Hz) and
// "Three-phase electric power" (Israel: 400 V, 50 Hz, 4 wires), worldstandards.eu, read 2026-11-26.
export const GRID = { V: 230, VL: 400, f: 50, src: 'worldstandards.eu: Israel 230 V / 400 V, 50 Hz' };
export const cx = (re, im = 0) => ({ re, im });
export const cadd = (a, b) => cx(a.re + b.re, a.im + b.im);
export const csub = (a, b) => cx(a.re - b.re, a.im - b.im);
export const cmul = (a, b) => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
export const cdiv = (a, b) => { const d = b.re * b.re + b.im * b.im || 1e-300; return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
export const cconj = (a) => cx(a.re, -a.im);
export const cabs = (a) => Math.hypot(a.re, a.im);
export const carg = (a) => (Math.atan2(a.im, a.re) * 180) / Math.PI; // degrees
export const polar = (r, deg) => cx(r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180));
const cinv = (a) => cdiv(cx(1), a);

function cgauss(A, b) {
  const n = b.length;
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (cabs(A[r][c]) > cabs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    const d = A[c][c]; if (cabs(d) < 1e-300) continue;
    for (let r = c + 1; r < n; r++) { const f = cdiv(A[r][c], d); if (!f.re && !f.im) continue; for (let k = c; k < n; k++) A[r][k] = csub(A[r][k], cmul(f, A[c][k])); b[r] = csub(b[r], cmul(f, b[c])); }
  }
  const x = new Array(n).fill(cx(0));
  for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < n; k++) s = csub(s, cmul(A[r][k], x[k])); x[r] = cabs(A[r][r]) < 1e-300 ? cx(0) : cdiv(s, A[r][r]); }
  return x;
}

// admittance Y and EMF phasor E of one element at frequency f (Hz): i(a→b) = Y·(Va − Vb − E)
function admit(el, f) {
  const w = 2 * Math.PI * f, real = (g) => [cx(g), cx(0)];
  switch (el.type) {
    case 'vac': return [cx(1 / Math.max(el.r ?? 0.05, 1e-6)), f > 0 && Math.abs(el.f - f) < 1e-9 ? polar(el.Vrms, el.ph || 0) : cx(0)];
    case 'bat': return real(1 / Math.max(el.r ?? 0.05, 1e-6)); // a battery has no AC part: only its internal resistance
    case 'cap': return [cx(0, w * el.C), cx(0)];
    case 'ind': return f > 0 ? [cinv(cx(el.rL || 0, w * el.L)), cx(0)] : real(1 / Math.max(el.rL || 0, R_WIRE));
    case 'z': return [cinv(el.Z), cx(0)]; // any impedance, for the AC modes
    case 'diode': return real(G_OFF);
    default: { const [g] = stamp(el, { dt: 1, prev: emptyState(), zero: true, dc: true, t: 0 }); return real(g); }
  }
}

// steady state at one frequency. Returns phasors (RMS): v(node), I (a→b), Vd, S (complex power taken by each element = Vd·I*)
export function solveAC(elements, f) {
  const nodes = [...new Set(elements.flatMap((e) => [e.a, e.b]))];
  const idx = new Map(nodes.map((k, i) => [k, i])), n = nodes.length;
  const src = elements.find((e) => e.type === 'bat' || e.type === 'vac');
  const gnd = idx.get(src ? src.b : nodes[0]) ?? 0;
  const A = Array.from({ length: n }, () => new Array(n).fill(cx(0))), b = new Array(n).fill(cx(0)), ye = new Map();
  for (const el of elements) {
    const [Y, E] = admit(el, f); ye.set(el.id, [Y, E]);
    const i = idx.get(el.a), j = idx.get(el.b), YE = cmul(Y, E);
    A[i][i] = cadd(A[i][i], Y); A[j][j] = cadd(A[j][j], Y); A[i][j] = csub(A[i][j], Y); A[j][i] = csub(A[j][i], Y);
    b[i] = cadd(b[i], YE); b[j] = csub(b[j], YE);
  }
  for (let k = 0; k < n; k++) A[k][k] = cadd(A[k][k], cx(G_LEAK));
  if (n) { A[gnd] = new Array(n).fill(cx(0)); A[gnd][gnd] = cx(1); b[gnd] = cx(0); }
  const V = n ? cgauss(A, b) : [];
  const v = (k) => V[idx.get(k)] ?? cx(0);
  const I = new Map(), Vd = new Map(), S = new Map();
  for (const el of elements) { const [Y, E] = ye.get(el.id), vd = csub(v(el.a), v(el.b)), i = cmul(Y, csub(vd, E)); Vd.set(el.id, vd); I.set(el.id, i); S.set(el.id, cmul(vd, cconj(i))); }
  return { nodes, v, I, Vd, S, f, nonlinear: elements.some((e) => e.type === 'diode') };
}

export const acFreqs = (elements) => [...new Set(elements.filter((e) => e.type === 'vac' && e.Vrms > 0 && e.f > 0).map((e) => e.f))].sort((a, b) => a - b);
const measCache = new Map();
// what a true-RMS instrument sees: the average (DC part), the RMS of the AC part, and the main frequency.
// what: { a, b } for the voltage a − b, or { el: id } for the current through an element (a → b).
// Linear circuits: superposition of DC and each source frequency. With diodes: a time simulation.
export function acMeasure(elements, what) {
  const fs = acFreqs(elements), pick = (r, cplx) => (what.el !== undefined ? (cplx ? r.I.get(what.el) || cx(0) : r.I.get(what.el) || 0) : cplx ? csub(r.v(what.a), r.v(what.b)) : r.v(what.a) - r.v(what.b));
  if (!elements.some((e) => e.type === 'diode')) {
    const mean = pick(solve(elements, { dc: true }), false);
    let s2 = 0, best = 0, f = 0, ph = null;
    for (const fr of fs) { const p = pick(solveAC(elements, fr), true), m = cabs(p); s2 += m * m; if (m > best) { best = m; f = fr; ph = p; } }
    const rms = Math.sqrt(s2);
    return { mean, rms, f: rms > 1e-9 ? f : 0, phasor: fs.length === 1 ? ph : null, duty: rms > 1e-9 ? 50 : 0 }; // a sum of sines spends half the time above its mean (a single sine exactly)
  }
  const key = JSON.stringify([elements, what]);
  if (measCache.has(key)) return measCache.get(key);
  const out = timeMeasure(elements, what, fs.length ? fs[0] : 50, pick);
  if (measCache.size > 12) measCache.delete(measCache.keys().next().value);
  measCache.set(key, out);
  return out;
}
// simulate until steady, then look at the last two periods of the lowest frequency
function timeMeasure(elements, what, f0, pick, cycles = 30, per = 200) {
  const T = 1 / f0, dt = T / per, st = emptyState(), xs = [];
  for (let k = 0; k < cycles * per; k++) { const r = step(elements, st, dt); if (k >= (cycles - 2) * per) xs.push(pick(r, false)); }
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length, rms = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length);
  // frequency: rising crossings of the mean, with a little hysteresis
  let n = 0, armed = false; const hy = 0.2 * rms;
  for (const x of xs) { if (x < mean - hy) armed = true; else if (armed && x > mean + hy) { n++; armed = false; } }
  return { mean, rms, f: rms > 1e-6 ? n / (2 * T) : 0, phasor: null, duty: rms > 1e-6 ? (100 * xs.filter((x) => x > mean).length) / xs.length : 0 };
}

// the same for every element at once (voltage across it and current through it): one time run for circuits with diodes
export function acMeasureAll(elements) {
  const out = new Map(), fs = acFreqs(elements), stat = (xs) => { const mean = xs.reduce((s, x) => s + x, 0) / xs.length; return { mean, rms: Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length) }; };
  if (!elements.some((e) => e.type === 'diode')) {
    const dc = solve(elements, { dc: true }), ac = fs.map((f) => solveAC(elements, f));
    for (const e of elements) {
      const r2 = (m) => Math.sqrt(ac.reduce((s, r) => s + cabs(m(r)) ** 2, 0));
      out.set(e.id, { V: { mean: dc.Vd.get(e.id), rms: r2((r) => r.Vd.get(e.id)) }, I: { mean: dc.I.get(e.id), rms: r2((r) => r.I.get(e.id)) }, P: dc.Vd.get(e.id) * dc.I.get(e.id) + ac.reduce((s, r) => s + r.S.get(e.id).re, 0) });
    }
    return out;
  }
  const f0 = fs.length ? fs[0] : 50, per = 200, cycles = 30, dt = 1 / f0 / per, st = emptyState(), rec = new Map(elements.map((e) => [e.id, { v: [], i: [], p: [] }]));
  for (let k = 0; k < cycles * per; k++) {
    const r = step(elements, st, dt); if (k < (cycles - 2) * per) continue;
    for (const e of elements) { const q = rec.get(e.id), v = r.Vd.get(e.id), i = r.I.get(e.id); q.v.push(v); q.i.push(i); q.p.push(v * i); }
  }
  for (const e of elements) { const q = rec.get(e.id); out.set(e.id, { V: stat(q.v), I: stat(q.i), P: q.p.reduce((s, x) => s + x, 0) / q.p.length }); }
  return out;
}

// ---------- AC formulas (each one checked in tests/ac-cases.mjs) ----------
export const peakToRms = (Vp) => Vp / Math.SQRT2;
export const zR = (R) => cx(R);
export const zL = (L, f) => cx(0, 2 * Math.PI * f * L);
export const zC = (C, f) => cx(0, -1 / (2 * Math.PI * f * C));
export const zSeries = (...zs) => zs.reduce(cadd, cx(0));
export const zParallel = (...zs) => cinv(zs.reduce((s, z) => cadd(s, cinv(z)), cx(0)));
// a load Z on a voltage V (RMS): current, angle (φ > 0 = inductive, current lags), P, Q, S, power factor
export function acLoad(V, Z) {
  const I = V / cabs(Z), phi = carg(Z), S = V * I;
  return { I, phi, S, P: S * Math.cos((phi * Math.PI) / 180), Q: S * Math.sin((phi * Math.PI) / 180), pf: Math.cos((phi * Math.PI) / 180) };
}
// capacitor in parallel that raises the power factor from pf1 to pf2: C = P·(tan φ1 − tan φ2) / (ω·V²)
export const pfCapacitor = (P, V, f, pf1, pf2) => (P * (Math.tan(Math.acos(pf1)) - Math.tan(Math.acos(pf2)))) / (2 * Math.PI * f * V * V);
export const resonanceF = (L, C) => 1 / (2 * Math.PI * Math.sqrt(L * C));
export const seriesQ = (R, L, C) => Math.sqrt(L / C) / R; // series RLC: Q = (1/R)·√(L/C), bandwidth = f0/Q
// ideal transformer: V2/V1 = N2/N1, I1/I2 = N2/N1, the load seen from the primary is (N1/N2)²·RL
export function transformer({ V1, N1, N2, RL }) {
  const a = N1 / N2, V2 = V1 / a, I2 = V2 / RL, I1 = I2 / a;
  return { a, V2, I2, I1, Rin: a * a * RL, P1: V1 * I1, P2: V2 * I2 };
}
// simple supply: peak after a bridge (two diodes conduct) and the ripple of a capacitor filter
export const bridgePeak = (V2rms, n = 2) => Math.SQRT2 * V2rms - n * VF;
export const rippleFull = (I, f, C) => I / (2 * f * C); // full wave: the capacitor feeds the load for about half a period
export const rippleHalf = (I, f, C) => I / (f * C);
// three-phase: phase voltages Va = V∠0°, Vb = V∠−120°, Vc = V∠+120°
export const phaseV = (V) => [polar(V, 0), polar(V, -120), polar(V, 120)];
// loads Z = [Za, Zb, Zc] (complex). star: with neutral (or without: the star point floats). delta: Zab, Zbc, Zca.
export function threePhase({ V, Z, conn = 'star', neutral = true }) {
  const [Va, Vb, Vc] = phaseV(V), Vs = [Va, Vb, Vc];
  if (conn === 'star') {
    const Y = Z.map(cinv), Vn = neutral ? cx(0) : cdiv(Vs.reduce((s, v, k) => cadd(s, cmul(v, Y[k])), cx(0)), Y.reduce(cadd, cx(0)));
    const Vload = Vs.map((v) => csub(v, Vn)), Iline = Vload.map((v, k) => cmul(v, Y[k])), In = Iline.reduce(cadd, cx(0));
    const S = Vload.reduce((s, v, k) => cadd(s, cmul(v, cconj(Iline[k]))), cx(0));
    return { Vline: [csub(Va, Vb), csub(Vb, Vc), csub(Vc, Va)], Vload, Iload: Iline, Iline, In, Vn, P: S.re, Q: S.im };
  }
  const Vl = [csub(Va, Vb), csub(Vb, Vc), csub(Vc, Va)], Iph = Vl.map((v, k) => cdiv(v, Z[k]));
  const Iline = [csub(Iph[0], Iph[2]), csub(Iph[1], Iph[0]), csub(Iph[2], Iph[1])];
  const S = Vl.reduce((s, v, k) => cadd(s, cmul(v, cconj(Iph[k]))), cx(0));
  return { Vline: Vl, Vload: Vl, Iload: Iph, Iline, In: cx(0), Vn: cx(0), P: S.re, Q: S.im };
}

// ---------- the other instruments ----------
// clamp meter (AC current only). whole = the jaws around the whole cable (out and back): the fields cancel.
export function clampReading(elements, elId, whole = false) {
  const out = (o) => ({ warn: '', ...o });
  if (elId == null || !elements.some((e) => e.id === elId)) return out({ text: '0.000', unit: 'A', warn: 'לחץ על חוט או רכיב במעגל כדי לחבק אותו בלסתות.' });
  if (!acFreqs(elements).length) return out({ text: '0.000', unit: 'A', warn: 'הצבת הזו מודדת רק זרם חילופין (AC). במעגל של סוללות בלבד הזרם ישר, והיא מראה 0.' });
  if (whole) return out({ text: '0.000', unit: 'A', warn: 'חיבקת את הכבל כולו: אותו זרם הולך במוליך אחד וחוזר בשני, השדות המגנטיים שלהם מבטלים זה את זה, והצבת רואה 0. מחבקים מוליך אחד בלבד.' });
  const q = acMeasure(elements, { el: elId }), a = q.rms;
  return out(a > 400 ? { text: 'OL', unit: 'A' } : fmt(a, 'A'));
}
// two-pole voltage tester: LEDs at fixed steps (example values; real testers differ between models)
export const TESTER = [12, 24, 50, 120, 230, 400];
export function testerReading(elements, red, black) {
  if (!red || !black || red === black) return { V: 0, leds: 0, ac: false, sign: 0 };
  const q = acMeasure(elements, { a: red, b: black }), V = Math.sqrt(q.mean * q.mean + q.rms * q.rms);
  return { V, leds: TESTER.filter((s) => V >= 0.85 * s).length, ac: q.rms > 0.5 * V && V > 1, sign: q.rms > 0.5 * V ? 0 : Math.sign(q.mean) };
}
// phase of the voltage a − b relative to the current in element id (degrees, + = voltage leads = inductive)
export function phaseShift(elements, f, a, b, elId) {
  const r = solveAC(elements, f), V = csub(r.v(a), r.v(b)), I = r.I.get(elId) || cx(0);
  if (cabs(V) < 1e-12 || cabs(I) < 1e-12) return null;
  let d = carg(V) - carg(I); while (d > 180) d -= 360; while (d <= -180) d += 360;
  return d;
}
