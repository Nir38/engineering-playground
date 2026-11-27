// bolt.js: a preloaded bolted joint in tension (one bolt, its share of the external load).
// Source: Shigley's Mechanical Engineering Design, 10th ed., chapter 8:
//   bolt stiffness Eq. 8-17, member stiffness with the 30° frustum for two members of the same material
//   Eq. 8-23, joint constant C, bolt and member loads Eq. 8-24/8-25, preload 0.75/0.90·Fp (Eq. 8-31),
//   torque T = K·Fi·d (Eq. 8-27) with K from Table 8-15, the load factors Eq. 8-28 to 8-30, and the
//   fatigue factor with Goodman Eq. 8-38 using the fully corrected endurance strength of Table 8-17.
// Proof / tensile / yield strength by property class: ISO 898-1 (Shigley Table 8-11).
// Tensile stress areas: BOLT_AT in formulas.js (Shigley Table 8-1). Tests: tests/bolt-cases.mjs.
import { BOLT_AT } from './formulas.js';

export const SRC_B = "Shigley's Mechanical Engineering Design, 10th ed., פרק 8";
export const SIZES = Object.keys(BOLT_AT); // M6 … M24
export const dOf = (size) => Number(size.slice(1));
// ISO 898-1: [Sp, Sut, Sy] MPa. 8.8 differs below/above M16
export function grade(cls, d) {
  if (cls === '8.8') return d <= 16 ? { Sp: 580, Sut: 800, Sy: 640 } : { Sp: 600, Sut: 830, Sy: 660 };
  if (cls === '10.9') return { Sp: 830, Sut: 1040, Sy: 940 };
  return { Sp: 970, Sut: 1220, Sy: 1100 }; // 12.9
}
// fully corrected endurance strength, rolled threads (Shigley Table 8-17)
export const SE = { '8.8': 129, '10.9': 162, '12.9': 190 };
// torque coefficient K (Shigley Table 8-15)
export const KTQ = { black: { K: 0.3, name: 'שחור, לא מצופה' }, zinc: { K: 0.2, name: 'מגולוון' }, lube: { K: 0.18, name: 'משומן' } };
// E of the clamped members (Shigley Table A-5), GPa
export const MEMBER = { steel: { E: 207, name: 'פלדה' }, ci: { E: 100, name: 'ברזל יציקה אפור' }, al: { E: 71.7, name: 'אלומיניום' } };

export const kBolt = (Ad, At, ld, lt, E) => (Ad * At * E) / (Ad * lt + At * ld);
export const kMember = (E, d, l) => (0.5774 * Math.PI * E * d) / (2 * Math.log((5 * (0.5774 * l + 0.5 * d)) / (0.5774 * l + 2.5 * d)));

// units: mm, N, MPa (= N/mm²). P = external load per bolt (N); cyclic: P varies 0 → P
export function joint({ size, cls, l, ld, member, frac = 0.75, tq = 'zinc', P = 0 }) {
  const d = dOf(size), At = BOLT_AT[size], Ad = (Math.PI / 4) * d * d, g = grade(cls, d), E = 207e3, Em = MEMBER[member].E * 1e3;
  const ldc = Math.min(Math.max(ld, 0), l), lt = l - ldc;
  const kb = kBolt(Ad, At, ldc, lt, E), km = kMember(Em, d, l), C = kb / (kb + km);
  const Fp = g.Sp * At, Fi = frac * Fp, T = KTQ[tq].K * Fi * d / 1000; // N·m
  const P0 = Fi / (1 - C), sep = P > P0;
  const Fb = sep ? P : Fi + C * P, Fm = sep ? 0 : Fi - (1 - C) * P;
  const np = Fp / Fb, nL = P > 0 ? (Fp - Fi) / (C * P) : Infinity, n0 = P > 0 ? Fi / (P * (1 - C)) : Infinity;
  // fatigue, P cycling 0 → P (Goodman, Eq. 8-38)
  const si = Fi / At, sa = (C * P) / (2 * At), sm = sa + si, Se = SE[cls];
  const nf = sa > 0 ? (Se * (g.Sut - si)) / (g.Sut * sa + Se * (sm - si)) : Infinity;
  return { d, At, Ad, lt, ld: ldc, kb, km, C, Fp, Fi, T, P0, sep, Fb, Fm, np, nL, n0, sa, sm, si, Se, nf, ...g };
}
