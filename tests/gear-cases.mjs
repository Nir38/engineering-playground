// Spur gears: geometry, ratio, power, forces, Lewis, interference and contact ratio.
import { gearPair, lewisY, nMinPinion, contactRatio, KV } from '../js/gears.js';
export function gearChecks(check, near) {
  const g = gearPair({ m: 3, N1: 20, N2: 60, P: 10, n1: 1500, F: 36, finish: 'hobbed', Sy: 400 });
  check('gears: d = m·N, center distance m(N1 + N2)/2 = 120 mm, ratio 3', near(g.d1, 60, 1e-12) && near(g.d2, 180, 1e-12) && near(g.a, 120, 1e-12) && near(g.i, 3, 1e-12) && near(g.n2, 500, 1e-12));
  check('gears: torque goes up by the ratio and the power is the same (no losses)', near(g.T2, 3 * g.T1, 1e-9) && near(g.T1 * 1500, g.T2 * g.n2, 1e-6));
  check('gears: Wt = P/V, and Wr = Wt·tan 20°', near(g.Wt, 10e3 / g.V, 1e-6) && near(g.Wr, g.Wt * Math.tan(Math.PI / 9), 1e-9));
  check('gears: pitch line velocity V = π·d1·n1/60000 = 4.71 m/s', Math.abs(g.V - 4.712) < 0.001);
  check('gears: Lewis Y from the table: Y(20) = 0.322, Y(100) = 0.447, interpolated Y(25) ≈ 0.3415', lewisY(20) === 0.322 && lewisY(100) === 0.447 && Math.abs(lewisY(25) - 0.3415) < 1e-9);
  check('gears: Lewis σ = Kv·Wt/(F·m·Y), the pinion (fewer teeth) has the higher stress', near(g.s1, (g.Kv * g.Wt) / (36 * 3 * 0.322), 1e-9) && g.s1 > g.s2);
  check('gears: Barth Kv: 1 at V = 0, larger for a rougher finish', near(KV.cut.f(0), 1, 1e-12) && KV.cast.f(5) > KV.cut.f(5) && KV.cut.f(5) > KV.hobbed.f(5) && KV.hobbed.f(5) > KV.ground.f(5));
  check('gears: smallest pinion with no interference: 13 for 1:1, about 17 with a rack (20°)', Math.ceil(nMinPinion(1)) === 13 && Math.abs(nMinPinion(1e6) - 2 / Math.sin(Math.PI / 9) ** 2) < 0.01);
  check('gears: smallest pinion for a 4:1 pair is 16 (Shigley Ex. 13-2 order)', Math.ceil(nMinPinion(4)) === 16);
  check('gears: contact ratio of standard gears is between 1.2 and 2, and grows with tooth count', (() => { const a = contactRatio(3, 20, 40), b = contactRatio(3, 40, 80); return a > 1.2 && a < 2 && b > a; })());
  check('gears: a 12-tooth pinion with a 60-tooth gear is flagged for undercut', gearPair({ m: 3, N1: 12, N2: 60, P: 1, n1: 1000, F: 30 }).undercut === true && g.undercut === false);
}
