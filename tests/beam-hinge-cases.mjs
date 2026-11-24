// Internal hinges and spring supports: hand results and limiting cases.
import { solveBeam } from '../js/beam.js';
export function hingeSpringChecks(check, near) {
  const EI = 10000, w = 10, P = 20;
  const udl = (a, b, q = w) => ({ type: 'dist', a, b, w1: q, w2: q }), down = (x, p = P) => ({ type: 'point', x, P: p, angle: 270 });
  // Gerber beam: fixed at 0, hinge at a = 2, roller at L = 6, UDL over all
  let s = solveBeam({ L: 6, EI, supports: [{ type: 'fixed', x: 0 }, { type: 'roller', x: 6 }], hinges: [{ x: 2 }], loads: [udl(0, 6)] });
  const Vh = (w * 4) / 2; // the suspended span 2..6 hangs on the hinge and the roller
  check('Gerber: determinate (r = 4, one hinge)', s.status === 'determinate' && s.degree === 0 && s.h === 1);
  check('Gerber: roller = w·4/2', near(s.reactions[1].Ry, Vh, 1e-9));
  check('Gerber: fixed R = w·2 + V_hinge, M = w·2²/2 + V_hinge·2', near(s.reactions[0].Ry, w * 2 + Vh, 1e-9) && near(s.reactions[0].M, (w * 4) / 2 + Vh * 2, 1e-9));
  check('Gerber: M = 0 at the hinge', Math.abs(s.internal(2, -1).M) < 1e-7 && Math.abs(s.internal(2, 1).M) < 1e-7);
  check('Gerber: midspan of the suspended span M = w·4²/8', near(s.internal(4, 1).M, (w * 16) / 8, 1e-9));
  // a hinge in a simply supported beam makes a mechanism
  check('pin + roller + hinge: mechanism', solveBeam({ L: 6, EI, supports: [{ type: 'pin', x: 0 }, { type: 'roller', x: 6 }], hinges: [{ x: 3 }], loads: [down(2)] }).status === 'mechanism');
  // two-span continuous beam with a hinge over... no: hinge inside span 1 of a 3-support beam = determinate
  s = solveBeam({ L: 8, EI, supports: [{ type: 'pin', x: 0 }, { type: 'roller', x: 4 }, { type: 'roller', x: 8 }], hinges: [{ x: 6 }], loads: [udl(0, 8)] });
  check('3 supports + 1 hinge: determinate, M(hinge) = 0', s.status === 'determinate' && Math.abs(s.internal(6, 1).M) < 1e-7);
  check('3 supports + 1 hinge: end roller carries w·2/2 of the hung part', near(s.reactions[2].Ry, (w * 2) / 2, 1e-9));
  // hinges do not change a fixed-fixed beam into a mechanism, and reduce the degree by one
  s = solveBeam({ L: 6, EI, supports: [{ type: 'fixed', x: 0 }, { type: 'fixed', x: 6 }], hinges: [{ x: 3 }], loads: [down(3)] });
  check('fixed-fixed + central hinge: degree 3 - 1 = 2, symmetric', s.degree === 2 && near(s.reactions[0].Ry, P / 2, 1e-9) && near(s.reactions[0].M, (P / 2) * 3, 1e-9));
  check('fixed-fixed + central hinge: tip deflection = (P/2)·3³/(3EI)', near(-s.dmax.v, ((P / 2) * 27) / (3 * EI), 1e-9));
  // spring supports
  const L = 6, k = 2000;
  s = solveBeam({ L, EI, supports: [{ type: 'pin', x: 0 }, { type: 'spring', x: L, k }], loads: [down(L / 2)] });
  check('pin + spring: determinate, spring carries P/2 for any k', s.status === 'determinate' && near(s.reactions[1].Ry, P / 2, 1e-9));
  check('pin + spring: midspan δ = PL³/48EI + (P/2k)/2', near(-s.defl.find((q) => Math.abs(q.x - 3) < 1e-9).v, (P * L ** 3) / (48 * EI) + P / (2 * k) / 2, 1e-9));
  const Rs = (kk) => solveBeam({ L, EI, supports: [{ type: 'pin', x: 0 }, { type: 'roller', x: L }, { type: 'spring', x: L / 2, k: kk }], loads: [udl(0, L)] }).reactions[2].Ry;
  const exact = (kk) => ((5 * w * L ** 4) / (384 * EI)) / (L ** 3 / (48 * EI) + 1 / kk);
  check('SS beam + midspan spring: R = δ0 / (L³/48EI + 1/k)', [100, 2000, 1e5].every((kk) => near(Rs(kk), exact(kk), 1e-9)));
  check('midspan spring k → ∞ approaches the 2-span value 5wL/8', near(Rs(1e12), (5 * w * L) / 8, 1e-6));
  check('midspan spring k → 0 carries nothing', Math.abs(Rs(1e-9)) < 1e-6);
  const tip = solveBeam({ L, EI, supports: [{ type: 'fixed', x: 0 }, { type: 'spring', x: L, k }], loads: [down(L)] });
  check('cantilever on a tip spring: R = P·(L³/3EI)/(L³/3EI + 1/k)', near(tip.reactions[1].Ry, (P * (L ** 3 / (3 * EI))) / (L ** 3 / (3 * EI) + 1 / k), 1e-9) && tip.degree === 1);
  check('two springs alone: horizontal mechanism', solveBeam({ L, EI, supports: [{ type: 'spring', x: 0, k }, { type: 'spring', x: L, k }], loads: [down(3)] }).status === 'mechanism');
  // random: equilibrium of the whole beam and M = 0 at every hinge
  let okEq = true, okH = true;
  const rnd = (a, b) => a + Math.random() * (b - a), pos = (a, b) => Math.round(rnd(a, b) / 0.05) * 0.05;
  for (let t = 0; t < 200; t++) {
    const sup = [{ type: 'fixed', x: 0 }, { type: t % 2 ? 'roller' : 'spring', x: pos(3, 6), k: rnd(500, 1e5) }];
    if (t % 3 === 0) sup.push({ type: 'spring', x: pos(1, 3), k: rnd(500, 1e5) });
    const hs = [{ x: pos(0.5, 2.5) }];
    const loads = [{ type: 'point', x: pos(0, 6), P: rnd(1, 30), angle: rnd(200, 340) }, udl(pos(0, 2), pos(3, 6), rnd(1, 15)), { type: 'moment', x: pos(0, 6), M: rnd(-20, 20) }];
    const r = solveBeam({ L: 6, EI, supports: sup, hinges: hs, loads });
    if (r.status === 'mechanism') continue;
    const e = r.internal(6, 1); if (Math.abs(e.V) + Math.abs(e.M) + Math.abs(e.N) > 1e-6) okEq = false;
    const hx = r.hinges[0];
    if (!loads.some((l) => l.type === 'moment' && Math.abs(l.x - hx) < 1e-9) && Math.abs(r.internal(hx, -1).M) > 1e-6) okH = false;
  }
  check('random beams with hinges and springs: equilibrium (200)', okEq);
  check('random beams: bending moment is zero at the hinge', okH);
}
