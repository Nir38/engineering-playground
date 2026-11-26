// circuit.js: a small circuit simulator (nodal analysis) for the playground's electricity modes,
// and the digital multimeter that measures it.
// Every two-terminal element is a conductance g in series with an EMF e: i(a→b) = g·(Va − Vb − e).
//   resistor, wire, lamp, closed switch, fuse, cable: e = 0
//   battery (a = +): e = V, g = 1/r (internal resistance)
//   capacitor (backward Euler): g = C/dt, e = v of the last step
//   inductor (backward Euler):  g = dt/L, e = −i_last/g
//   diode (a = anode): on → g = 1/R_ON, e = VF ; off → g ≈ 0
// Checked in tests/circuit-cases.mjs.

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
  const { dt, prev, zero, dc } = ctx;
  switch (el.type) {
    case 'wire': return [1 / R_WIRE, 0];
    case 'res': return [1 / Math.max(el.R, 1e-6), 0];
    case 'lamp': return [1 / lampR(el.V, el.P), 0];
    case 'cable': return [1 / Math.max(cableR(el.len, el.area, el.mat), 1e-6), 0];
    case 'sw': return el.on ? [1 / R_WIRE, 0] : [0, 0];
    case 'fuse': return el.blown ? [0, 0] : [1 / R_WIRE, 0];
    case 'bat': return [1 / Math.max(el.r ?? 0.05, 1e-6), zero ? 0 : el.V];
    case 'cap': { if (dc) return [0, 0]; const g = el.C / dt; return [g, zero ? 0 : (prev.vc.get(el.id) || 0)]; }
    case 'ind': { if (dc) return [1 / R_WIRE, 0]; const g = dt / el.L, il = zero ? 0 : (prev.il.get(el.id) || 0); return [g, -il / g]; }
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
  const nodes = [...new Set(elements.flatMap((e) => [e.a, e.b]).concat((opts.inject || []).map((q) => q.node)))];
  const idx = new Map(nodes.map((k, i) => [k, i]));
  // ground: the − terminal of the first battery, else the first node
  const bat = elements.find((e) => e.type === 'bat');
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
export const METER = { rV: 10e6, rA: 0.01, rmA: 1, fuseA: 10, fusemA: 0.4, beep: 30, ohmI: 1e-3, diodeOL: 2, ohmOL: 60e6 };
export const DIAL = [
  { id: 'off', label: 'OFF' }, { id: 'vac', label: 'V~' }, { id: 'vdc', label: 'V⎓' }, { id: 'mv', label: 'mV' },
  { id: 'ohm', label: 'Ω 🔊' }, { id: 'diode', label: '▶|' }, { id: 'cap', label: '⊣⊢' }, { id: 'hz', label: 'Hz' },
  { id: 'a', label: 'A' }, { id: 'ma', label: 'mA' },
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
export function meterReading(elements, live, m, state = emptyState()) {
  if (m.dial === 'off') return { text: '', unit: '' };
  const probes = m.red && m.black;
  const inA = m.jack === 'a' || m.jack === 'ma';
  const out = (o) => ({ warn: '', beep: false, ...o });
  if (inA) {
    if (m.fuseOK === false) return out({ ...fmt(0, m.dial === 'ma' ? 'mA' : 'A'), warn: 'הנתיך של המד נשרף. אין זרם דרך שקע ה-A.' });
    const i = probes && live && live.I.has('meter') ? live.I.get('meter') : 0;
    if (m.dial === 'a') return out(m.jack === 'a' ? (Math.abs(i) > 10 ? { text: 'OL', unit: 'A' } : fmt(i, 'A')) : { ...fmt(0, 'A'), warn: 'הבורר על A, אבל הפרוב האדום בשקע mA. העבר אותו לשקע A.' });
    if (m.dial === 'ma') return out(m.jack === 'ma' ? (Math.abs(i) > 0.4 ? { text: 'OL', unit: 'mA' } : fmt(i * 1000, 'mA')) : { ...fmt(0, 'mA'), warn: 'הבורר על mA, אבל הפרוב האדום בשקע A. העבר אותו לשקע mA.' });
    const vd = probes && live ? live.v(m.red) - live.v(m.black) : 0;
    return out({ ...fmt(m.dial === 'mv' ? vd * 1000 : vd, m.dial === 'mv' ? 'mV' : m.dial === 'ohm' ? 'Ω' : 'V'), warn: '⚠ הפרוב האדום בשקע הזרם, אבל הבורר לא על זרם. כך המד הוא כמעט קצר בין הפרובים: מדידת מתח במצב הזה עלולה לשרוף את הנתיך של המד, ובמתח גבוה גם לגרום לקשת חשמלית.' });
  }
  // red in the V Ω jack
  if (m.dial === 'a' || m.dial === 'ma') return out({ ...fmt(0, m.dial === 'a' ? 'A' : 'mA'), warn: 'למדידת זרם מעבירים את הפרוב האדום לשקע A או mA, ומחברים את המד בטור: פותחים את המעגל ומכניסים את המד לתוך הפתח.' });
  if (!probes) return out(m.dial === 'ohm' || m.dial === 'diode' ? { text: 'OL', unit: m.dial === 'ohm' ? 'MΩ' : 'V' } : fmt(0, { vdc: 'V', vac: 'V', mv: 'mV', cap: 'nF', hz: 'Hz' }[m.dial]));
  const vd = live ? live.v(m.red) - live.v(m.black) : 0;
  if (m.dial === 'vdc') return out(Math.abs(vd) > 1000 ? { text: 'OL', unit: 'V' } : fmt(vd, 'V'));
  if (m.dial === 'mv') return out(Math.abs(vd) > 0.6 ? { text: 'OL', unit: 'mV' } : fmt(vd * 1000, 'mV'));
  if (m.dial === 'vac') return out({ ...fmt(0, 'V'), warn: 'במעגל הזה יש רק סוללות, כלומר מתח ישר (DC). מצב V~ מודד רק את הרכיב המתחלף, ולכן מראה 0. עבור ל-V⎓.' });
  if (m.dial === 'hz') return out({ ...fmt(0, 'Hz'), warn: 'מתח ישר לא מחליף כיוון, ולכן התדר 0.' });
  // passive measurements: the meter pushes its own small current. First check the circuit is dead.
  const others = elements;
  const liveRun = solve(others, { dt: 1e-3, prev: state });
  const vOpen = liveRun.v(m.red) - liveRun.v(m.black), energized = others.some((e) => e.type === 'bat' && Math.abs(liveRun.I.get(e.id)) > 1e-6);
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
