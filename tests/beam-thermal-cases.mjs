// Thermal loads on beams: restrained expansion, free expansion, temperature gradient.
import { solveBeam } from '../js/beam.js';
export function thermalChecks(check, near) {
  const L = 6, EI = 13333.33, EA = 200 * 20000, a = 12e-6, h = 0.2; // E = 200 GPa, A = 20000 mm², steel α
  const T = (dT, dTg = 0) => ({ dT, dTg, alpha: a, h });
  const S = (supports, thermal, loads = []) => solveBeam({ L, EI, EA, supports, loads, thermal });
  const pin = (x) => ({ type: 'pin', x }), rol = (x) => ({ type: 'roller', x }), fix = (x) => ({ type: 'fixed', x });
  // uniform rise
  let s = S([pin(0), pin(L)], T(30));
  check('pin–pin, ΔT: N = −EAαΔT (compression)', near(s.Nmax, -EA * a * 30, 1e-9) && near(s.internal(3, 1).N, -EA * a * 30, 1e-9));
  check('pin–pin, ΔT: no vertical reactions, no bending', Math.abs(s.reactions[0].Ry) < 1e-9 && Math.abs(s.Mpos) < 1e-9 && Math.abs(s.Mneg) < 1e-9);
  s = S([pin(0), rol(L)], T(30));
  check('pin–roller, ΔT: free expansion, N = 0', Math.abs(s.Nmax) < 1e-9);
  check('pin–roller, ΔT: the roller moves αΔT·L', near(s.axial[s.axial.length - 1].u, a * 30 * L, 1e-9));
  s = S([fix(0), fix(L)], T(-20));
  check('fixed–fixed, cooling: N = +EAα|ΔT| (tension)', near(s.Nmax, EA * a * 20, 1e-9));
  // temperature gradient (bottom hotter): free curvature κ = αΔT/h
  const k = (a * 25) / h;
  s = S([pin(0), rol(L)], T(0, 25));
  check('simple beam, gradient: no moment, midspan δ = −κL²/8', Math.abs(s.Mpos) + Math.abs(s.Mneg) < 1e-9 && near(s.defl.find((q) => Math.abs(q.x - 3) < 1e-9).v, (-k * L * L) / 8, 1e-9));
  s = S([fix(0)], T(0, 25));
  check('cantilever, gradient: tip curls up κL²/2', near(s.defl[s.defl.length - 1].v, (k * L * L) / 2, 1e-9));
  s = S([fix(0), fix(L)], T(0, 25));
  check('fixed–fixed, gradient: constant M = −EIκ, no deflection', near(s.internal(1, 1).M, -EI * k, 1e-9) && near(s.internal(5, 1).M, -EI * k, 1e-9) && Math.abs(s.dmax.v) < 1e-12);
  s = S([fix(0), rol(L)], T(0, 25));
  check('propped cantilever, gradient: roller R = −3EIκ/(2L)', near(s.reactions[1].Ry, (-3 * EI * k) / (2 * L), 1e-9));
  check('propped cantilever, gradient: fixed-end M = 3EIκ/2 (hogging inside)', near(s.internal(0, 1).M, (-3 * EI * k) / 2, 1e-9));
  // superposition with a mechanical load
  const P = [{ type: 'dist', a: 0, b: L, w1: 10, w2: 10 }];
  const m = S([fix(0), rol(L)], null, P), t = S([fix(0), rol(L)], T(15, 25)), both = S([fix(0), rol(L)], T(15, 25), P);
  check('superposition: thermal + load = sum of both', near(both.reactions[1].Ry, m.reactions[1].Ry + t.reactions[1].Ry, 1e-9) && near(both.reactions[0].M, m.reactions[0].M + t.reactions[0].M, 1e-9));
  // hinge relieves a thermal moment: fixed–hinge–fixed under a gradient
  s = solveBeam({ L, EI, EA, supports: [fix(0), fix(L)], hinges: [{ x: 3 }], loads: [], thermal: T(0, 25) });
  check('a hinge in a fixed–fixed beam reduces the thermal moment', Math.abs(s.internal(3, 1).M) < 1e-6 && Math.abs(s.internal(0, 1).M) < EI * k);
}
