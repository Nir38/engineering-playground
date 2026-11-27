// springs.js: helical compression springs (round wire). Units: mm, N, MPa.
// Source: Shigley's Mechanical Engineering Design, 10th ed., chapter 10:
//   Ks = 1 + 0.5/C (Eq. 10-2), Bergsträsser KB = (4C + 2)/(4C − 3) (Eq. 10-5), Wahl (Eq. 10-4),
//   τ = KB·8FD/(πd³), k = d⁴G/(8D³Na) (Eq. 10-9), end types (Table 10-1), Sut = A/d^m (Table 10-4),
//   G (Table 10-5), Ssy as a fraction of Sut for static springs (Table 10-6), buckling of squared and
//   ground ends on flat plates L0 < 2.63·D/α with α = 0.5 (Eq. 10-13), surge frequency (Eq. 10-25),
//   recommended 4 ≤ C ≤ 12 and ns ≥ 1.2 at solid. Tests: tests/spring-cases.mjs.
import { springRate, springsSeries, springsParallel } from './formulas.js';

export const SRC_S = "Shigley's Mechanical Engineering Design, 10th ed., פרק 10";
export const WIRES = {
  music: { name: 'Music wire (A228)', A: 2211, m: 0.145, G: 81.7e3, ssy: 0.45 },
  hd: { name: 'Hard-drawn (A227)', A: 1783, m: 0.19, G: 80e3, ssy: 0.45 },
  ot: { name: 'Oil-tempered (A229)', A: 1855, m: 0.187, G: 77.2e3, ssy: 0.5 },
  crv: { name: 'Chrome-vanadium (A232)', A: 2005, m: 0.168, G: 77.2e3, ssy: 0.5 },
  crsi: { name: 'Chrome-silicon (A401)', A: 1974, m: 0.108, G: 77.2e3, ssy: 0.5 },
};
// active coils, solid length and free length from the pitch p (Table 10-1)
export const ENDS = {
  plain: { name: 'פשוטים', Na: (Nt) => Nt, Ls: (d, Nt) => d * (Nt + 1), L0: (p, Na, d) => p * Na + d },
  plainG: { name: 'פשוטים ומושחזים', Na: (Nt) => Nt - 1, Ls: (d, Nt) => d * Nt, L0: (p, Na) => p * (Na + 1) },
  sq: { name: 'סגורים (squared)', Na: (Nt) => Nt - 2, Ls: (d, Nt) => d * (Nt + 1), L0: (p, Na, d) => p * Na + 3 * d },
  sqG: { name: 'סגורים ומושחזים', Na: (Nt) => Nt - 2, Ls: (d, Nt) => d * Nt, L0: (p, Na, d) => p * Na + 2 * d },
};
export const ks = (C) => 1 + 0.5 / C;
export const kB = (C) => (4 * C + 2) / (4 * C - 3);
export const kW = (C) => (4 * C - 1) / (4 * C - 4) + 0.615 / C;
export const sutWire = (w, d) => WIRES[w].A / d ** WIRES[w].m;
const RHO_STEEL = 7.85e-6; // kg/mm³

// combo: 'one' | 'series' | 'parallel' (two identical springs)
export function spring({ wire, d, D, Nt, ends, L0, F, combo = 'one' }) {
  const W = WIRES[wire], E = ENDS[ends], C = D / d, Na = E.Na(Nt), Ls = E.Ls(d, Nt);
  const k1 = springRate(W.G, d, D, Na), k = combo === 'series' ? springsSeries(k1, k1) : combo === 'parallel' ? springsParallel(k1, k1) : k1;
  const Fs1 = F / (combo === 'parallel' ? 2 : 1); // force in each spring
  const KB = kB(C), tau = (KB * 8 * Fs1 * D) / (Math.PI * d ** 3);
  const Sut = sutWire(wire, d), Ssy = W.ssy * Sut;
  const y1 = Fs1 / k1, y = F / k, Fsolid1 = k1 * (L0 - Ls), tauS = (KB * 8 * Fsolid1 * D) / (Math.PI * d ** 3);
  const mass = (Math.PI ** 2 * d * d * D * Na * RHO_STEEL) / 4, fn = 0.5 * Math.sqrt((k1 * 1000) / mass); // Hz, ends on flat plates
  return {
    C, Na, Ls, k1, k, KB, Ks: ks(C), Kw: kW(C), tau, Sut, Ssy, n: Ssy / tau, y1, y, solid: L0 - y1 <= Ls, Fsolid1, tauS, ns: Ssy / tauS,
    buckle: ends === 'sqG' || ends === 'sq' ? L0 >= (2.63 * D) / 0.5 : null, Lcr: (2.63 * D) / 0.5, fn, mass, Cok: C >= 4 && C <= 12,
    p: (() => { return ends === 'plain' ? (L0 - d) / Na : ends === 'plainG' ? L0 / (Na + 1) : ends === 'sq' ? (L0 - 3 * d) / Na : (L0 - 2 * d) / Na; })(),
  };
}
