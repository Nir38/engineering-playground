// machines.js: motors, pumps and appliances for the playground's stage E modes.
// DC motor (E = kω, T = k·Ia), three-phase induction motor (synchronous speed, slip, Kloss torque curve,
// rotating field, V/f drive, star-delta start), single-phase motor with a capacitor, PWM, the pump and
// system curves with the affinity laws, and a few appliance formulas. Checked in tests/machines-cases.mjs.
// Sources: Chapman, Electric Machinery Fundamentals; Hughes, Electrical and Electronic Technology;
// Çengel & Cimbala, Fluid Mechanics; Çengel & Boles, Thermodynamics (Carnot COP). Motor and pump
// numbers in the modes are example values.
import { cx, cadd, cdiv, carg, cabs, zR, zL, zC, zSeries } from './circuit.js';

export const SRC = { ch: 'Chapman, Electric Machinery Fundamentals', hu: 'Hughes, Electrical and Electronic Technology', cc: 'Çengel & Cimbala, Fluid Mechanics', cb: 'Çengel & Boles, Thermodynamics' };
const TAU = 2 * Math.PI;
export const rpm = (w) => (w * 60) / TAU;
export const rad = (n) => (n * TAU) / 60;

// ---------- DC motor (permanent magnet / separately excited) ----------
// V = E + Ia·Ra, E = k·ω, T = k·Ia → ω = (V − T·Ra/k)/k: a straight line from no-load speed to stall torque
export function dcMotor({ V, Ra, k, T }) {
  const Ia = T / k, w = (V - Ia * Ra) / k, E = k * w;
  return { Ia, w, n: rpm(w), E, w0: V / k, Tstall: (k * V) / Ra, Istart: V / Ra, Pin: V * Ia, Pout: T * w, eta: w > 0 ? (T * w) / (V * Ia) : 0 };
}
// PWM: the motor sees the average D·V (its inductance smooths the current)
export const pwmAvg = (D, V) => D * V;

// ---------- three-phase induction motor ----------
export const syncRpm = (f, poles) => (120 * f) / poles;
export const slipOf = (ns, n) => (ns - n) / ns;
// Kloss: T(s) = 2·Tmax / (s/sm + sm/s)
export const kloss = (s, Tmax, sm) => (s <= 0 ? 0 : (2 * Tmax) / (s / sm + sm / s));
// sm from the rated point: Tn at sn with Tmax/Tn = b: s/sm + sm/s = 2b → sm = sn·(b + √(b² − 1))
export const smFromRated = (sn, b) => sn * (b + Math.sqrt(b * b - 1));
// the stable operating point (s < sm) for a load torque TL(n); bisection
export function inductionPoint({ f, poles, Tmax, sm, TL }) {
  const ns = syncRpm(f, poles);
  let lo = 1e-6, hi = sm;
  const g = (s) => kloss(s, Tmax, sm) - TL(ns * (1 - s));
  if (g(hi) < 0) return null; // the load is more than the breakdown torque: it stalls
  for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (g(m) > 0) hi = m; else lo = m; }
  const s = (lo + hi) / 2;
  return { s, n: ns * (1 - s), ns, T: kloss(s, Tmax, sm) };
}
// V/f drive: the slip speed in rpm at a given torque stays the same, so sm scales with f0/f, Tmax stays (below base speed)
export const smAt = (sm0, f0, f) => (sm0 * f0) / f;
// rotating field: three coils 120° apart in space, fed 120° apart in time: the resultant has a constant size 1.5·Bm
export function field3(t, f = 50) {
  let x = 0, y = 0;
  for (let k = 0; k < 3; k++) { const sp = (k * TAU) / 3, b = Math.cos(TAU * f * t - sp); x += b * Math.cos(sp); y += b * Math.sin(sp); }
  return { x, y, mag: Math.hypot(x, y), ang: Math.atan2(y, x) };
}
// star-delta start: each winding gets 1/√3 of the voltage, so current and torque drop to 1/3
export const starDelta = { I: 1 / 3, T: 1 / 3 };

// ---------- single-phase motor with a capacitor ----------
// main winding R + jXL, auxiliary winding with a capacitor in series: the two currents are phase shifted
export function capMotor({ V = 230, f = 50, Rm, Lm, Ra, La, C }) {
  const Im = cdiv(cx(V), zSeries(zR(Rm), zL(Lm, f))), Ia = cdiv(cx(V), C > 0 ? zSeries(zR(Ra), zL(La, f), zC(C, f)) : zSeries(zR(Ra), zL(La, f)));
  let d = carg(Ia) - carg(Im); while (d > 180) d -= 360; while (d <= -180) d += 360;
  return { Im, Ia, shift: d, Iline: cabs(cadd(Im, Ia)) };
}
// the field of two coils 90° apart in space with currents shifted by d degrees: a circle at 90°, a line at 0°
export function field2(t, d, f = 50, am = 1, aa = 1) {
  const x = am * Math.cos(TAU * f * t), y = aa * Math.cos(TAU * f * t + (d * Math.PI) / 180);
  return { x, y, mag: Math.hypot(x, y) };
}

// ---------- pump and system ----------
// pump: H = H0·r² − a·Q² (r = n/n0: the affinity laws keep this shape), system: H = Hs + k·Q²
export const pumpH = (Q, H0, a, r = 1) => H0 * r * r - a * Q * Q;
export const systemH = (Q, Hs, k) => Hs + k * Q * Q;
export function operatingPoint({ H0, a, r = 1, Hs, k }) {
  const d = H0 * r * r - Hs; if (d <= 0) return { Q: 0, H: Hs };
  const Q = Math.sqrt(d / (a + k)); return { Q, H: systemH(Q, Hs, k) };
}
// efficiency: a parabola around the best efficiency point (example shape), the BEP moves with Q ∝ r
export const pumpEta = (Q, etaMax, Qbep, r = 1) => Math.max(0, etaMax * (1 - ((Q - Qbep * r) / (Qbep * r)) ** 2));
export const hydPower = (Q, H, rho = 1000, g = 9.81) => rho * g * Q * H; // W, Q in m³/s
export const affinityLaws = (Q1, H1, P1, r) => ({ Q: Q1 * r, H: H1 * r * r, P: P1 * r ** 3 });

// ---------- appliances ----------
export const heatTime = (m, c, dT, P) => (m * c * dT) / P; // s: water heater, kettle (no losses)
export const carnotCOP = (Tc, Th) => Tc / (Th - Tc); // refrigerator, upper bound, kelvin
