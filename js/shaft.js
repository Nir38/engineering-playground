// shaft.js: diameter of a rotating shaft at a shoulder by the DE-Goodman criterion, with the yield check.
// Source: Shigley's Mechanical Engineering Design, 10th ed., chapter 7: DE-Goodman Eq. 7-7 (n) and 7-8 (d),
// von Mises maximum stress for first-cycle yield Eq. 7-15/7-16, the iteration because kb and the notch
// depend on d. Kt at the shoulder: js/kt.js (Pilkey/Peterson), q: Shigley 6-35, Marin: js/fatigue.js.
// Units: N·m for moments, MPa for strength, mm for d. Tests: tests/shaft-cases.mjs.
import { ka, kb } from './fatigue.js';
import { enduranceEstimateSteel } from './formulas.js';
import { ktShoulder, qNotch, kf } from './kt.js';

export const SRC_SH = "Shigley's Mechanical Engineering Design, 10th ed., פרק 7";
const vm = (M, T, Kf, Kfs) => Math.sqrt(4 * (Kf * M) ** 2 + 3 * (Kfs * T) ** 2); // N·m

// factor of safety for a given d [mm]
export function nDEG({ d, Ma, Mm = 0, Ta = 0, Tm, Kf, Kfs, Se, Sut }) {
  const c = 16 / (Math.PI * (d / 1000) ** 3) / 1e6; // MPa per N·m
  return 1 / (c * (vm(Ma, Ta, Kf, Kfs) / Se + vm(Mm, Tm, Kf, Kfs) / Sut));
}
// diameter [mm] for a factor of safety n
export function dDEG({ n, Ma, Mm = 0, Ta = 0, Tm, Kf, Kfs, Se, Sut }) {
  const s = ((16 * n) / Math.PI) * (vm(Ma, Ta, Kf, Kfs) / (Se * 1e6) + vm(Mm, Tm, Kf, Kfs) / (Sut * 1e6));
  return s ** (1 / 3) * 1000;
}
// first-cycle yield: von Mises of the maximum stresses
export function nYield({ d, Ma, Mm = 0, Ta = 0, Tm, Kf, Kfs, Sy }) {
  const d3 = Math.PI * (d / 1000) ** 3, s = (32 * Kf * (Mm + Ma)) / d3 / 1e6, t = (16 * Kfs * (Tm + Ta)) / d3 / 1e6;
  return Sy / Math.sqrt(s * s + 3 * t * t);
}

// the whole design: P [kW], rpm, F [N] at a from the left bearing, span L [mm], shoulder D/d and r/d,
// steel Sut/Sy, surface, reliability factor ke. Iterates d (kb, Kt, q all depend on d)
export function designShaft({ P, rpm, F, a, L, Dd, rd, Sut, Sy, surf = 'machined', ke = 1, n = 2 }) {
  const T = (P * 1000) / ((2 * Math.PI * rpm) / 60), M = (F * (a / 1000) * ((L - a) / 1000)) / (L / 1000);
  let d = 30, r = {};
  for (let k = 0; k < 30; k++) {
    const Kt = ktShoulder(Dd * d, d, rd * d, 'bend').Kt, Kts = ktShoulder(Dd * d, d, rd * d, 'tors').Kt;
    const q = qNotch(Sut, rd * d, 'bend'), qs = qNotch(Sut, rd * d, 'tors'), Kf = kf(Kt, q), Kfs = kf(Kts, qs);
    const f = { ka: ka(Sut, surf), kb: kb(d, 'bend'), ke }, Se = f.ka * f.kb * ke * enduranceEstimateSteel(Sut);
    const dn = dDEG({ n, Ma: M, Tm: T, Kf, Kfs, Se, Sut });
    r = { Kt, Kts, q, qs, Kf, Kfs, f, Se };
    if (Math.abs(dn - d) < 1e-6) { d = dn; break; }
    d = dn;
  }
  const dUse = Math.ceil(d);
  return { T, M, d, dUse, ...r, nf: nDEG({ d: dUse, Ma: M, Tm: T, Kf: r.Kf, Kfs: r.Kfs, Se: r.Se, Sut }), ny: nYield({ d: dUse, Ma: M, Tm: T, Kf: r.Kf, Kfs: r.Kfs, Sy }) };
}
