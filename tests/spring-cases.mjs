// Helical compression springs: rate, stress factors, ends, strength, solid, buckling, combinations.
import { spring, ks, kB, kW, sutWire, ENDS } from '../js/springs.js';
export function springChecks(check, near) {
  const base = { wire: 'music', d: 2.5, D: 20, Nt: 12, ends: 'sqG', L0: 60, F: 50 };
  const s = spring(base);
  check('spring: C = D/d = 8, active coils Na = Nt − 2 for squared and ground ends', near(s.C, 8, 1e-12) && s.Na === 10);
  check('spring: k = d⁴G/(8D³Na) = 2.5⁴·81700/(8·20³·10) ≈ 4.99 N/mm', near(s.k, (2.5 ** 4 * 81.7e3) / (8 * 20 ** 3 * 10), 1e-12) && Math.abs(s.k - 4.987) < 0.002);
  check('spring: KB, Wahl and Ks: KB ≈ Kw (within 1%), Ks smaller (no curvature)', Math.abs(kB(8) / kW(8) - 1) < 0.01 && ks(8) < kB(8));
  check('spring: τ = KB·8FD/(πd³)', near(s.tau, (kB(8) * 8 * 50 * 20) / (Math.PI * 2.5 ** 3), 1e-9));
  check('spring: music wire Sut = 2211/d^0.145, 1936 MPa at d = 2.5 mm, and Ssy = 0.45·Sut', Math.abs(sutWire('music', 2.5) - 1935.9) < 0.5 && near(s.Ssy, 0.45 * s.Sut, 1e-12));
  check('spring: thinner wire is stronger per mm² (Sut grows as d shrinks)', sutWire('music', 1) > sutWire('music', 4));
  check('spring: end types: solid length and active coils follow Table 10-1', ENDS.plain.Na(10) === 10 && ENDS.plainG.Na(10) === 9 && near(ENDS.sq.Ls(2, 10), 22, 1e-12) && near(ENDS.sqG.Ls(2, 10), 20, 1e-12));
  check('spring: two identical in series: k/2, in parallel: 2k, each spring in parallel takes F/2', near(spring({ ...base, combo: 'series' }).k, s.k / 2, 1e-12) && near(spring({ ...base, combo: 'parallel' }).k, 2 * s.k, 1e-12) && near(spring({ ...base, combo: 'parallel' }).tau, s.tau / 2, 1e-9));
  check('spring: force to solid = k·(L0 − Ls), and a large force reaches solid', near(s.Fsolid1, s.k1 * (60 - 30), 1e-9) && spring({ ...base, F: 400 }).solid === true && s.solid === false);
  check('spring: buckling limit for squared and ground ends L0 < 2.63·D/0.5 = 105 mm', near(s.Lcr, 105.2, 1e-9) && s.buckle === false && spring({ ...base, L0: 120 }).buckle === true);
  check('spring: index check 4 ≤ C ≤ 12', s.Cok && !spring({ ...base, D: 40 }).Cok);
  check('spring: surge frequency drops for a heavier, softer spring', spring({ ...base, Nt: 20 }).fn < s.fn);
  check('spring: pitch from free length (squared and ground: L0 = p·Na + 2d)', near(s.p * s.Na + 2 * 2.5, 60, 1e-12));
}
