// Shaft design: DE-Goodman diameter and factor, yield, and the full iterated design.
import { nDEG, dDEG, nYield, designShaft } from '../js/shaft.js';
export function shaftChecks(check, near) {
  const q = { Ma: 100, Tm: 150, Kf: 1.7, Kfs: 1.5, Se: 200, Sut: 700 };
  const d = dDEG({ ...q, n: 1.5 });
  check('shaft: DE-Goodman, Ma 100, Tm 150, Kf 1.7, Kfs 1.5, Se 200, Sut 700, n 1.5 → d = 25.8 mm (the app\'s question dx1)', Math.abs(d - 25.8) < 0.05, String(d));
  check('shaft: the factor at that diameter is back to 1.5', near(nDEG({ ...q, d }), 1.5, 1e-9));
  check('shaft: d grows as n^(1/3)', near(dDEG({ ...q, n: 3 }) / d, 2 ** (1 / 3), 1e-9));
  check('shaft: forgetting Kf and Kfs gives the smaller 21.9 mm (the wrong answer in dx1)', Math.abs(dDEG({ ...q, Kf: 1, Kfs: 1, n: 1.5 }) - 21.9) < 0.05);
  check('shaft: yield, pure torque: n = Sy/(√3·16T/πd³)', near(nYield({ d: 30, Ma: 0, Tm: 200, Kf: 1, Kfs: 1, Sy: 400 }), 400 / (Math.sqrt(3) * (16 * 200) / (Math.PI * 0.03 ** 3) / 1e6), 1e-9));
  const s = designShaft({ P: 15, rpm: 1000, F: 4000, a: 100, L: 300, Dd: 1.2, rd: 0.05, Sut: 630, Sy: 530, n: 2 });
  check('shaft: T = P/ω and M = F·a·b/L', near(s.T, 15000 / ((2 * Math.PI * 1000) / 60), 1e-9) && near(s.M, (4000 * 0.1 * 0.2) / 0.3, 1e-9));
  check('shaft: the iteration converges: the design d gives exactly n = 2 with its own kb and Kf', near(nDEG({ d: s.d, Ma: s.M, Tm: s.T, Kf: s.Kf, Kfs: s.Kfs, Se: s.Se, Sut: 630 }), 2, 1e-6));
  check('shaft: rounding up to a whole mm gives n ≥ 2, and Kf < Kt (notch sensitivity)', s.nf >= 2 && s.Kf < s.Kt && s.Kfs < s.Kts && s.dUse === Math.ceil(s.d));
  check('shaft: a sharper shoulder fillet needs a thicker shaft', designShaft({ P: 15, rpm: 1000, F: 4000, a: 100, L: 300, Dd: 1.2, rd: 0.02, Sut: 630, Sy: 530, n: 2 }).d > s.d);
  check('shaft: the same power at a lower speed needs a thicker shaft (more torque)', designShaft({ P: 15, rpm: 300, F: 4000, a: 100, L: 300, Dd: 1.2, rd: 0.05, Sut: 630, Sy: 530, n: 2 }).d > s.d);
}
