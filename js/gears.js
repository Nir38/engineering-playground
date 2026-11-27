// gears.js: a pair of standard spur gears (metric module, 20° full-depth teeth).
// Source: Shigley's Mechanical Engineering Design, 10th ed.:
//   geometry and the smallest pinion without interference (chapter 13, Eq. 13-11),
//   contact ratio from the base and addendum circles (chapter 13), forces Wt = P/V, Wr = Wt·tanφ (Eq. 13-36),
//   Lewis bending stress σ = Kv·Wt/(F·m·Y) with the Lewis form factor Y (Table 14-2) and the Barth
//   velocity factor Kv (Eq. 14-4). Tests: tests/gear-cases.mjs.
import { gearPitchDia, gearCenterDistance, gearTangentialForce } from './formulas.js';

export const SRC_G = "Shigley's Mechanical Engineering Design, 10th ed., פרקים 13 ו-14";
export const PHI = (20 * Math.PI) / 180;
export const MODULES = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6];
// Lewis form factor Y, 20° full depth (Shigley Table 14-2)
const YT = [[12, 0.245], [13, 0.261], [14, 0.277], [15, 0.29], [16, 0.296], [17, 0.303], [18, 0.309], [19, 0.314], [20, 0.322], [21, 0.328], [22, 0.331], [24, 0.337], [26, 0.346], [28, 0.353], [30, 0.359], [34, 0.371], [38, 0.384], [43, 0.397], [50, 0.409], [60, 0.422], [75, 0.435], [100, 0.447], [150, 0.46], [300, 0.472], [400, 0.48]];
export function lewisY(N) {
  if (N <= YT[0][0]) return YT[0][1];
  if (N >= YT[YT.length - 1][0]) return YT[YT.length - 1][1];
  const i = YT.findIndex(([n]) => n >= N); const [n0, y0] = YT[i - 1], [n1, y1] = YT[i];
  return y0 + ((y1 - y0) * (N - n0)) / (n1 - n0);
}
// Barth velocity factor, V in m/s
export const KV = { cast: { f: (V) => (3.05 + V) / 3.05, name: 'יצוק' }, cut: { f: (V) => (6.1 + V) / 6.1, name: 'מכורסם / חתוך' }, hobbed: { f: (V) => (3.56 + Math.sqrt(V)) / 3.56, name: 'Hobbing' }, ground: { f: (V) => (5.56 + Math.sqrt(V)) / 5.56, name: 'מושחז' } };

// smallest pinion that meshes with a gear of ratio mG = N2/N1 without interference (k = 1 full depth)
export function nMinPinion(mG, phi = PHI) {
  const s2 = Math.sin(phi) ** 2;
  return (2 / ((1 + 2 * mG) * s2)) * (mG + Math.sqrt(mG * mG + (1 + 2 * mG) * s2));
}
// contact ratio of two standard gears (addendum = m)
export function contactRatio(m, N1, N2, phi = PHI) {
  const r1 = (m * N1) / 2, r2 = (m * N2) / 2, a = r1 + r2;
  const ra1 = r1 + m, ra2 = r2 + m, rb1 = r1 * Math.cos(phi), rb2 = r2 * Math.cos(phi);
  return (Math.sqrt(ra1 * ra1 - rb1 * rb1) + Math.sqrt(ra2 * ra2 - rb2 * rb2) - a * Math.sin(phi)) / (Math.PI * m * Math.cos(phi));
}

// m [mm], N1 pinion (driver), N2 gear, P [kW], n1 [rpm], F face width [mm], Sy [MPa]
export function gearPair({ m, N1, N2, P, n1, F, finish = 'hobbed', Sy = 400 }) {
  const d1 = gearPitchDia(m, N1), d2 = gearPitchDia(m, N2), a = gearCenterDistance(m, N1, N2), i = N2 / N1, n2 = n1 / i;
  const V = (Math.PI * d1 * n1) / 60000, T1 = (P * 1000) / ((2 * Math.PI * n1) / 60), T2 = T1 * i; // N·m
  const Wt = gearTangentialForce(T1 * 1000, d1), Wr = Wt * Math.tan(PHI), W = Wt / Math.cos(PHI);
  const Kv = KV[finish].f(V), Y1 = lewisY(N1), Y2 = lewisY(N2);
  const s1 = (Kv * Wt) / (F * m * Y1), s2 = (Kv * Wt) / (F * m * Y2);
  const mc = contactRatio(m, N1, N2), nmin = Math.ceil(nMinPinion(i) - 1e-9);
  return { d1, d2, a, i, n2, V, T1, T2, Wt, Wr, W, Kv, Y1, Y2, s1, s2, n1f: Sy / s1, n2f: Sy / s2, mc, nmin, undercut: N1 < nmin, Fm: F / m };
}
