// Column buckling (Euler / Johnson) and pipe friction (Moody) checks.
import { section, column, scrAt, ENDS } from '../js/columns.js';
import { pipe, sameFlow } from '../js/pipeflow.js';
import { eulerLoad, frictionColebrook } from '../js/formulas.js';
export function columnsChecks(check, near) {
  // ---------- buckling ----------
  const rod = { kind: 'rod', d: 0.02 }, E = 207e9, Sy = 250e6;
  let c = column({ sec: rod, L: 1.5, K: 1, E, Sy, P: 10e3 });
  check('column: round bar r = d/4', near(c.r, 0.005, 1e-12));
  check('column: long pinned bar: Euler, Pcr = π²EI/L²', c.euler && near(c.Pcr, eulerLoad(E, c.I, 1, 1.5), 1e-9));
  check('column: n = Pcr / P', near(c.n, c.Pcr / 10e3, 1e-12));
  const ff = column({ sec: rod, L: 1.5, K: ENDS.ff.K, E, Sy, P: 1 }), fr = column({ sec: rod, L: 1.5, K: ENDS.fr.K, E, Sy, P: 1 });
  check('column: fixed-fixed is 4× pinned, fixed-free is ¼ (both Euler here)', near(ff.Pcr / c.Pcr, 4, 1e-9) && near(fr.Pcr / c.Pcr, 0.25, 1e-9));
  const l1 = Math.PI * Math.sqrt((2 * E) / Sy);
  check('column: at λ1 Euler and Johnson both give Sy/2 and have the same slope (smooth join)', near(scrAt(l1 * (1 - 1e-9), E, Sy), Sy / 2, 1e-6) && near(scrAt(l1, E, Sy), Sy / 2, 1e-9) && near((scrAt(l1 - 1e-3, E, Sy) - scrAt(l1 - 2e-3, E, Sy)) / 1e-3, (scrAt(l1 + 2e-3, E, Sy) - scrAt(l1 + 1e-3, E, Sy)) / 1e-3, 1e-3));
  const sh = column({ sec: rod, L: 0.2, K: 1, E, Sy, P: 1 });
  check('column: short bar: Johnson, σcr is just under Sy', !sh.euler && sh.scr < Sy && sh.scr > 0.9 * Sy);
  check('column: very short: σcr → Sy', near(scrAt(1e-6, E, Sy), Sy, 1e-9));
  const tube = section({ kind: 'tube', D: 0.04, t: 0.003 }), di = 0.034;
  check('column: tube A and I', near(tube.A, (Math.PI / 4) * (0.04 ** 2 - di ** 2), 1e-12) && near(tube.I, (Math.PI / 64) * (0.04 ** 4 - di ** 4), 1e-12));
  const same = section({ kind: 'rod', d: Math.sqrt((4 * tube.A) / Math.PI) });
  check('column: a tube is stiffer than a solid bar with the same area (larger r)', tube.I > same.I);
  const rect = section({ kind: 'rect', b: 0.05, h: 0.01 });
  check('column: a flat bar buckles about its weak axis: I = b·t³/12', near(rect.I, (0.05 * 0.01 ** 3) / 12, 1e-12) && near(section({ kind: 'rect', b: 0.01, h: 0.05 }).I, rect.I, 1e-15));

  // ---------- pipe friction ----------
  const lam = pipe({ fluid: 'oil', eps: 0.045, D: 0.05, V: 1, L: 10 });
  check('pipe: engine oil in a 50 mm pipe at 1 m/s is laminar and f = 64/Re', lam.regime === 'laminar' && near(lam.f, 64 / lam.Re, 1e-12));
  check('pipe: laminar f does not depend on roughness', near(pipe({ fluid: 'oil', eps: 0.26, D: 0.05, V: 1, L: 10 }).f, lam.f, 1e-12));
  const w = pipe({ fluid: 'water', eps: 0.045, D: 0.05, V: 2, L: 100 });
  check('pipe: water 2 m/s in 50 mm: Re ≈ 99,600, turbulent', w.regime === 'turbulent' && Math.abs(w.Re - 99601) < 5);
  check('pipe: f satisfies Colebrook: 1/√f = −2 log(ε/3.7D + 2.51/(Re√f))', near(1 / Math.sqrt(w.f), -2 * Math.log10(w.rel / 3.7 + 2.51 / (w.Re * Math.sqrt(w.f))), 1e-9));
  check('pipe: Haaland is within 2% of Colebrook', Math.abs(w.fH / w.f - 1) < 0.02);
  check('pipe: hL = f (L/D) V²/2g and Δp = ρ g hL', near(w.hL, w.f * (100 / 0.05) * 4 / (2 * 9.81), 1e-12) && near(w.dp, w.rho * 9.81 * w.hL, 1e-9));
  check('pipe: smooth pipe at Re = 10⁵: f ≈ 0.018 (Blasius 0.316 Re^−¼ = 0.0178)', Math.abs(frictionColebrook(1e5, 0) - 0.018) < 0.0005);
  const rough = 0.01, fr0 = 1 / (-2 * Math.log10(rough / 3.7)) ** 2;
  check('pipe: fully rough (Re very high): f depends only on ε/D', Math.abs(frictionColebrook(1e9, rough) / fr0 - 1) < 0.002);
  const big = sameFlow({ fluid: 'water', eps: 0.045, D: 0.05, V: 2, L: 100 }, 0.1);
  check('pipe: same flow, double the diameter: Q stays, Δp drops 20–40× (about D^−5)', near(big.Q, w.Q, 1e-12) && w.dp / big.dp > 20 && w.dp / big.dp < 40, String(w.dp / big.dp));
  check('pipe: pumping power = Δp · Q', near(w.P, w.dp * w.Q, 1e-9));
  check('pipe: same flow in double the diameter: V drops to a quarter', near(big.V, 0.5, 1e-12) && near(big.D, 0.1, 1e-12));
}
