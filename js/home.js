// home.js: the electricity of a home, for the playground's home modes. Circuit breakers (thermal and
// magnetic trip), the residual current device, the apartment's circuits and appliances, faults, and what
// a meter shows at a socket or at the panel for each fault. Checked in tests/home-cases.mjs.
//
// Sources and what is only an example:
// - 230 V, 50 Hz: GRID in circuit.js (worldstandards.eu).
// - RCD 30 mA, required in a residential panel, tested with its test button: המוסד לבטיחות ולגהות, מדריך G16.
// - Connection sizes 1×40 A, 3×25 A, 3×40 A: רשות החשמל, ספר התעריפים (as in the app's home lesson).
// - Conductor colors: phase brown, neutral blue, protective earth green-yellow (תקנות החשמל, as quoted by
//   המוסד לבטיחות ולגהות; the same as IEC 60445). Three phases brown, black, grey: IEC 60445.
// - Breaker test points (IEC 60898-1): no trip at 1.13·In for 1 h, trip at 1.45·In within 1 h, at 2.55·In
//   between 1 s and 60 s (In ≤ 32 A); instant (< 0.1 s) at 5·In for type B and 10·In for type C, never
//   instant below 3·In (B) or 5·In (C). The curve between the points is an example that meets them.
// - RCD (IEC 61008-1): no trip below IΔn/2, trips at IΔn within 0.3 s, at 5·IΔn within 0.04 s.
// - Plug types in Israel: C and H (worldstandards.eu).
// - Circuit breaker sizes, cable sizes and appliance powers below: example values (marked so in the UI).
export const SRC = {
  rcd: 'המוסד לבטיחות ולגהות, מדריך G16 (ממסר פחת)',
  tariff: 'רשות החשמל, ספר התעריפים (גודל חיבור)',
  colors: 'תקנות החשמל, כפי שמובאות באתר המוסד לבטיחות ולגהות; זהה ל-IEC 60445',
  mcb: 'IEC 60898-1 (נקודות הבדיקה של מאמ"ת)',
  rcdStd: 'IEC 61008-1 (זמני ניתוק של ממסר פחת)',
  plug: 'worldstandards.eu: בישראל תקעים מסוג C ו-H',
};
export const V = 230;
export const WIRE = { L: '#8b5a2b', N: '#2563eb', PE: 'pe', L2: '#111827', L3: '#9ca3af' }; // brown, blue, green-yellow stripes
export const RCD_IDN = 0.03; // A

// ---------- circuit breaker (מאמ"ת) ----------
// thermal part: t = A / ((I/In)² − 1)^n. A and n chosen so the curve meets the IEC 60898-1 test points
const TH_N = 2.294, TH_A = 1501; // s
export const MAG = { B: [3, 5], C: [5, 10], D: [10, 20] }; // magnetic band in multiples of In
export function tripTime(I, In, curve = 'B') {
  const x = Math.abs(I) / In;
  if (x <= 1.13) return Infinity;
  if (x >= MAG[curve][1]) return 0.01; // magnetic: instant
  return TH_A / (x * x - 1) ** TH_N;
}
// thermal memory: heat accumulates as Σ dt / t(I) and the breaker trips at 1; it cools when the current is low
export function breakerStep(state, I, In, curve, dt) {
  const t = tripTime(I, In, curve);
  if (t === Infinity) state.heat = Math.max(0, state.heat - dt / 600); // cools down in about 10 minutes
  else state.heat += dt / t;
  if (state.heat >= 1) { state.tripped = true; state.heat = 0; }
  return state;
}

// ---------- RCD (ממסר פחת) ----------
// residual current = what goes out on the phase and does not come back on the neutral
export function rcdTripTime(Ileak, IDn = RCD_IDN) {
  const x = Math.abs(Ileak) / IDn;
  if (x < 0.5) return Infinity;
  if (x < 0.8) return Infinity; // between ½ and 1 IΔn a real RCD may or may not trip; here: does not (example)
  if (x >= 5) return 0.04 * 0.5;
  // between IΔn (0.3 s) and 5·IΔn (0.04 s): log interpolation, half the allowed time (example)
  const k = Math.log(x) / Math.log(5);
  return 0.5 * 0.3 * (0.04 / 0.3) ** Math.max(0, k);
}

// ---------- the apartment (all ratings, cable sizes and appliances are example values) ----------
// pf: power factor (motors and compressors < 1); kind: what it is for the drawings
export const CIRCUITS = [
  { id: 'light', name: 'תאורה', In: 10, curve: 'B', mm2: 1.5, color: '#eab308', apps: [
    { id: 'l1', name: 'תאורה בסלון', P: 60, kind: 'lamp', room: 'salon' }, { id: 'l2', name: 'תאורה בחדר שינה', P: 40, kind: 'lamp', room: 'bed' },
    { id: 'l3', name: 'תאורה במטבח', P: 40, kind: 'lamp', room: 'kitchen' }, { id: 'l4', name: 'תאורה באמבטיה', P: 20, kind: 'lamp', room: 'bath' }] },
  { id: 'sock', name: 'שקעים', In: 16, curve: 'B', mm2: 2.5, color: '#3b82f6', apps: [
    { id: 's1', name: 'טלוויזיה', P: 150, kind: 'tv', room: 'salon' }, { id: 's2', name: 'מחשב', P: 300, kind: 'pc', room: 'bed' },
    { id: 's3', name: 'מפזר חום', P: 2000, kind: 'heater', room: 'salon' }, { id: 's4', name: 'מפזר חום שני', P: 2000, kind: 'heater', room: 'bed' }] },
  { id: 'kitchen', name: 'מטבח', In: 16, curve: 'B', mm2: 2.5, color: '#16a34a', apps: [
    { id: 'k1', name: 'קומקום', P: 2000, kind: 'kettle', room: 'kitchen' }, { id: 'k2', name: 'מיקרוגל', P: 1200, pf: 0.95, kind: 'micro', room: 'kitchen' },
    { id: 'k3', name: 'מדיח כלים', P: 2000, kind: 'dish', room: 'kitchen' }, { id: 'k4', name: 'מקרר', P: 150, pf: 0.8, kind: 'fridge', room: 'kitchen', on: true }] },
  { id: 'ac', name: 'מזגן', In: 16, curve: 'C', mm2: 2.5, color: '#06b6d4', apps: [{ id: 'a1', name: 'מזגן', P: 1500, pf: 0.9, kind: 'ac', room: 'salon' }] },
  { id: 'boiler', name: 'דוד', In: 16, curve: 'B', mm2: 2.5, color: '#ef4444', apps: [{ id: 'b1', name: 'דוד חשמלי', P: 2500, kind: 'boiler', room: 'bath' }] },
  { id: 'oven', name: 'תנור', In: 20, curve: 'B', mm2: 4, color: '#a855f7', apps: [{ id: 'o1', name: 'תנור אפייה', P: 3000, kind: 'oven', room: 'kitchen' }] },
];
export const MAIN = { In: 40, curve: 'C' }; // 1×40 A connection (tariff book); main breaker rating = the connection, example curve
export const appCurrent = (a) => a.P / (V * (a.pf || 1));
// RMS currents add as phasors; for a quick home estimate the app adds magnitudes (a little conservative)
export const circuitCurrent = (c, on) => c.apps.reduce((s, a) => s + (on[a.id] ? appCurrent(a) : 0), 0);
export const totalCurrent = (on, open = {}) => CIRCUITS.reduce((s, c) => s + (open[c.id] ? 0 : circuitCurrent(c, on)), 0);

// prospective short-circuit current at a socket: 230 V over the loop (supply + cable out and back)
export const RHO_CU = 1.68e-8; // Ω·m at 20 °C (as RHO.cu in circuit.js)
export const loopR = (len, mm2, Rsupply = 0.3) => Rsupply + (2 * RHO_CU * len) / (mm2 * 1e-6); // Rsupply: example value
export const shortCurrent = (len, mm2, Rsupply) => V / loopR(len, mm2, Rsupply);

// a person touching a live metal case. Body resistance hand to feet: example value (it depends on
// voltage, skin, path and wetness: IEC 60479 gives ranges, not one number).
export const R_BODY = 1000, R_FLOOR = 1000;
// Phase to case fault. With PE: the fault current goes back on the PE conductor (Rpe, about as thick as the
// phase), so it is large and the breaker trips at once; the case is at If·Rpe meanwhile, about half of 230 V.
// Without PE: the only path is through the person, and only the RCD can save them.
export function touch({ earthed, rcd = true, Rl = 0.27, Rpe = 0.27, Rsup = 0.3, In = 16, curve = 'B' }) {
  if (earthed) {
    const If = V / (Rsup + Rl + Rpe), Vcase = If * Rpe, Ibody = Vcase / (R_BODY + R_FLOOR);
    return { If, Vcase, Ibody, leak: If + Ibody, mcbTime: tripTime(If, In, curve), rcdTrips: rcd && rcdTripTime(If + Ibody) < Infinity };
  }
  const Ibody = V / (Rsup + Rl + R_BODY + R_FLOOR);
  return { If: 0, Vcase: Ibody * (R_BODY + R_FLOOR), Ibody, leak: Ibody, mcbTime: tripTime(Ibody, In, curve), rcdTrips: rcd && rcdTripTime(Ibody) < Infinity };
}

// ---------- the fault-finding game: what a meter shows ----------
// points: 'socket' or 'panel' (the breaker's output). pairs: LN, LPE, NPE (V~), and PE continuity to the earth bar (Ω, power off).
export const FAULTS = [
  { id: 'ok', name: 'הכל תקין', fix: 'אין תקלה.' },
  { id: 'mcb', name: 'המאמ"ת של המעגל קפץ', fix: 'בודקים למה (עומס? קצר?), מתקנים, ורק אז מרימים.' },
  { id: 'brokenL', name: 'פאזה מנותקת בדרך לשקע', fix: 'חיבור רופף של הפאזה בקופסה או בשקע הקודם.' },
  { id: 'brokenN', name: 'אפס מנותק בדרך לשקע', fix: 'חיבור רופף של האפס. מסוכן: האפס בשקע "חי" דרך המכשירים.' },
  { id: 'brokenPE', name: 'הארקה מנותקת', fix: 'המכשירים עובדים, אבל אין הגנה בדליפה לגוף. מוצאים את הנתק בבדיקת רציפות.' },
  { id: 'swap', name: 'פאזה ואפס הפוכים בשקע', fix: 'מחברים מחדש: פאזה (חום) לפאזה, אפס (כחול) לאפס.' },
];
// with a device plugged in on the circuit (so a broken neutral shows up)
export function readings(fault, point = 'socket') {
  const r = { LN: 230, LPE: 230, NPE: 0.5, PEohm: 0.4 }; // NPE: a small drop on the neutral from the load current (example); PEohm: example
  const at = point === 'socket';
  switch (fault) {
    case 'mcb': return { LN: 0, LPE: 0, NPE: 0, PEohm: 0.4 };
    case 'brokenL': return at ? { LN: 0, LPE: 0, NPE: 0, PEohm: 0.4 } : r;
    case 'brokenN': return at ? { LN: 0, LPE: 230, NPE: 230, PEohm: 0.4 } : r;
    case 'brokenPE': return at ? { LN: 230, LPE: null, NPE: null, PEohm: Infinity } : r; // null = unstable reading, a floating conductor
    case 'swap': return at ? { LN: 230, LPE: 0.5, NPE: 230, PEohm: 0.4 } : r;
    default: return r;
  }
}
// which faults fit a set of measurements (each entry: { point, pair, value })
export function consistent(meas) {
  const same = (a, b) => (a === null || b === null ? a === b : a === Infinity || b === Infinity ? a === b : Math.abs(a - b) < 5);
  return FAULTS.filter((f) => meas.every((m) => same(readings(f.id, m.point)[m.pair], m.value))).map((f) => f.id);
}

// ---------- wiring boxes ----------
// two-way switching (מחליף, staircase): each switch connects its common to traveler 1 or 2; the lamp is on when both pick the same
export const twoWay = (s1, s2) => s1 === s2;
// intermediate (מצליב) between two two-way switches: crosses the travelers
export const withCross = (s1, x, s2) => (x ? s1 !== s2 : s1 === s2);
// boiler: double-pole switch, then the Shabbat clock contact, then the thermostat
export const boilerOn = ({ sw, clock, clockOn, thermo }) => sw && (!clock || clockOn) && thermo;
