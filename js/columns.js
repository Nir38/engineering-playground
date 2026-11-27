// columns.js: column buckling. Section properties, effective length (K), slenderness, and the critical
// stress by Euler (long columns) or the Johnson parabola (intermediate columns). SI units (m, Pa, N).
// Source: Shigley's Mechanical Engineering Design, 10th ed., section 4-12 (Eq. 4-43..4-48), and
// Table A-5 for E. Tests: tests/columns-cases.mjs.
import { eulerStress, criticalSlenderness, johnsonStress } from './formulas.js';

export const SRC_C = "Shigley's Mechanical Engineering Design, 10th ed., סעיף 4-12";
// theoretical effective-length factors
export const ENDS = {
  pp: { K: 1, name: 'פרק-פרק' },
  ff: { K: 0.5, name: 'קבוע-קבוע' },
  fp: { K: 0.7, name: 'קבוע-פרק' },
  fr: { K: 2, name: 'קבוע-חופשי' },
};
// Shigley Table A-5
export const MATS = { steel: { E: 207e9, name: 'פלדה' }, al: { E: 71.7e9, name: 'אלומיניום' } };

// section: { kind: 'rod' | 'tube' | 'rect', d, D, t, b, h } in metres. I is the smaller one (buckling axis)
export function section(s) {
  if (s.kind === 'tube') { const di = Math.max(0, s.D - 2 * s.t); return { A: (Math.PI / 4) * (s.D ** 2 - di ** 2), I: (Math.PI / 64) * (s.D ** 4 - di ** 4) }; }
  if (s.kind === 'rect') { const lo = Math.min(s.b, s.h), hi = Math.max(s.b, s.h); return { A: lo * hi, I: (hi * lo ** 3) / 12 }; }
  return { A: (Math.PI / 4) * s.d ** 2, I: (Math.PI / 64) * s.d ** 4 };
}

export function column({ sec, L, K, E, Sy, P }) {
  const { A, I } = section(sec), r = Math.sqrt(I / A), lam = (K * L) / r, lam1 = criticalSlenderness(E, Sy);
  const euler = lam >= lam1, scr = euler ? eulerStress(E, lam) : johnsonStress(Sy, E, lam), Pcr = scr * A;
  return { A, I, r, lam, lam1, euler, scr, Pcr, sigma: P / A, n: P > 0 ? Pcr / P : Infinity, Py: Sy * A };
}
// the σcr curve used for the chart: Johnson below λ1, Euler above
export const scrAt = (lam, E, Sy) => (lam >= criticalSlenderness(E, Sy) ? eulerStress(E, lam) : johnsonStress(Sy, E, lam));
