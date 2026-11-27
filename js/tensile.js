// tensile.js: a tensile test for the playground. The key values (E, Sy, Sut, elongation) are from tables;
// the shape of the curve between them is a model (illustration):
//   up to the maximum load: Ramberg–Osgood, ε = σ/E + 0.002·(σ/Sy)^N, with N chosen so that the curve
//   passes through Sy at 0.2% offset (by definition) and reaches Sut at the uniform strain εu;
//   after the maximum (necking): the engineering stress falls smoothly to 0.85·Sut at fracture.
// εu is taken as 0.6 of the elongation at fracture (model choice, not a table value).
// Sources: steels: Shigley 10th ed. Table A-20 (hot-rolled / cold-drawn, minimum values), E 207 GPa;
// annealed metals: Callister, Tables 6.1 (E) and 6.2 (Sy, Sut, elongation). Tests: tests/tensile-cases.mjs.
export const SRC_T = "Shigley Table A-20; Callister Tables 6.1, 6.2";
export const MATS = {
  s1020: { name: 'פלדה 1020 HR', E: 207, Sy: 210, Sut: 380, el: 25, src: 'Shigley A-20' },
  s1045: { name: 'פלדה 1045 CD', E: 207, Sy: 530, Sut: 630, el: 12, src: 'Shigley A-20' },
  s1095: { name: 'פלדה 1095 HR', E: 207, Sy: 460, Sut: 830, el: 10, src: 'Shigley A-20' },
  al: { name: 'אלומיניום (מחושל)', E: 69, Sy: 35, Sut: 90, el: 40, src: 'Callister 6.1, 6.2' },
  cu: { name: 'נחושת (מחושלת)', E: 110, Sy: 69, Sut: 200, el: 45, src: 'Callister 6.1, 6.2' },
  brass: { name: 'פליז (מחושל)', E: 97, Sy: 75, Sut: 300, el: 68, src: 'Callister 6.1, 6.2' },
  ti: { name: 'טיטניום (מחושל)', E: 107, Sy: 450, Sut: 520, el: 25, src: 'Callister 6.1, 6.2' },
};
const U = 0.6, NECK = 0.85;

export function model(key) {
  const m = MATS[key], E = m.E * 1e3, ef = m.el / 100, eu = U * ef;
  const N = Math.log((eu - m.Sut / E) / 0.002) / Math.log(m.Sut / m.Sy);
  const epsOf = (s) => s / E + 0.002 * (s / m.Sy) ** N; // up to Sut
  // stress at strain ε (engineering)
  const sigma = (e) => {
    if (e <= 0) return 0;
    if (e <= eu) { let lo = 0, hi = m.Sut; for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (epsOf(mid) < e) lo = mid; else hi = mid; } return (lo + hi) / 2; }
    if (e <= ef) { const x = (e - eu) / (ef - eu); return m.Sut * (1 - (1 - NECK) * x * x); }
    return 0;
  };
  // energy per volume [MJ/m³ = MPa]: resilience (elastic, up to Sy) and toughness (area to fracture)
  const Ur = (m.Sy * m.Sy) / (2 * E);
  let Ut = 0; const n = 400; for (let i = 0; i < n; i++) { const a = (ef * i) / n, b = (ef * (i + 1)) / n; Ut += ((sigma(a) + sigma(b)) / 2) * (b - a); }
  return { ...m, Emod: E, ef, eu, N, epsOf, sigma, Ur, Ut };
}
// unloading from strain ε: elastic, parallel to E. Returns the permanent (plastic) strain
export const permanent = (md, e) => Math.max(0, e - md.sigma(e) / md.Emod);
// true stress and strain (valid up to necking)
export const trueSS = (s, e) => ({ s: s * (1 + e), e: Math.log(1 + e) });
