// fatigue.js: endurance limit with the Marin factors, and the mean-stress criteria
// (modified Goodman, Soderberg, Gerber, Langer first-cycle yield). Stresses in MPa, d in mm.
// Source: Shigley's Mechanical Engineering Design, 10th ed., chapter 6
// (Eq. 6-8 Se', Table 6-2 surface factor, Eq. 6-20 size factor, Eq. 6-26 load factor, Table 6-5 reliability,
// Table 6-7 / Eq. 6-41..6-46 the criteria). Checked in tests/fatigue-cases.mjs.
import { enduranceEstimateSteel, goodmanFactor, soderbergFactor, langerFactor } from './formulas.js';

export const SRC_F = "Shigley's Mechanical Engineering Design, 10th ed., פרק 6";
// ka = a·Sut^b (Sut in MPa)
export const SURF = {
  ground: { a: 1.58, b: -0.085, name: 'מושחז' },
  machined: { a: 4.51, b: -0.265, name: 'מעובד שבבית' },
  hot: { a: 57.7, b: -0.718, name: 'מעורגל בחם' },
  forged: { a: 272, b: -0.995, name: 'מחושל' },
};
export const ka = (Sut, surf) => SURF[surf].a * Sut ** SURF[surf].b;
// size factor, rotating round bar in bending (or torsion); axial load: 1
export function kb(d, load) {
  if (load === 'axial') return 1;
  return d <= 51 ? 1.24 * d ** -0.107 : 1.51 * d ** -0.157;
}
export const LOAD = { bend: { kc: 1, name: 'כפיפה (ציר מסתובב)' }, axial: { kc: 0.85, name: 'עומס צירי' } };
export const kc = (load) => LOAD[load].kc;
export const REL = { 50: 1, 90: 0.897, 95: 0.868, 99: 0.814, 99.9: 0.753, 99.99: 0.702 };
export const ke = (rel) => REL[rel];
// Shigley Table A-20 (minimum values): hot-rolled (HR) and cold-drawn (CD) carbon steels
export const STEELS = { '1020HR': { Sut: 380, Sy: 210, name: '1020 HR' }, '1045CD': { Sut: 630, Sy: 530, name: '1045 CD' }, '1050CD': { Sut: 690, Sy: 580, name: '1050 CD' } };

// Gerber: n·σa/Se + (n·σm/Sut)² = 1, solved for n (σm > 0)
export function gerberFactor(sa, sm, Se, Sut) {
  if (sm <= 0) return Se / sa;
  if (sa <= 0) return Sut / sm;
  return 0.5 * (Sut / sm) ** 2 * (sa / Se) * (-1 + Math.sqrt(1 + ((2 * sm * Se) / (Sut * sa)) ** 2));
}
// with a compressive mean stress the fatigue line is flat: σa = Se/n (Shigley 6-12)
const fat = (fn) => (sa, sm, Se, S) => (sm <= 0 ? Se / sa : fn(sa, sm, Se, S));

// everything for one load case. smax, smin: nominal stresses; Kf multiplies them (local stress at the notch)
export function analyze({ Sut, Sy, smax, smin, Kf = 1, surf = 'machined', d = 25, load = 'bend', rel = 50 }) {
  const Se1 = enduranceEstimateSteel(Sut), f = { ka: ka(Sut, surf), kb: kb(d, load), kc: kc(load), kd: 1, ke: ke(rel), kf: 1 };
  const Se = f.ka * f.kb * f.kc * f.kd * f.ke * f.kf * Se1;
  const sm = (Kf * (smax + smin)) / 2, sa = (Kf * Math.abs(smax - smin)) / 2;
  const n = {
    goodman: fat(goodmanFactor)(sa, sm, Se, Sut),
    soderberg: fat(soderbergFactor)(sa, sm, Se, Sy),
    gerber: gerberFactor(sa, sm, Se, Sut),
    langer: langerFactor(sa, Math.abs(sm), Sy),
  };
  // the load line from the origin meets the Goodman line at (n·σm, n·σa)
  const R = smax !== 0 ? smin / smax : NaN;
  return { Se1, f, Se, sm, sa, n, R, gov: Math.min(n.goodman, n.langer), mode: n.goodman <= n.langer ? 'fatigue' : 'yield' };
}
