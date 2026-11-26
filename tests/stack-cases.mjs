// Tolerance stack-up and fatigue (Goodman diagram) checks.
import { stack, center, monteCarlo, rejectFrac, phi } from '../js/stack.js';
import { analyze, ka, kb, gerberFactor, REL } from '../js/fatigue.js';
export function stackChecks(check, near) {
  // ---------- stack-up ----------
  const gap = [{ nom: 50, up: 0.1, lo: -0.1, dir: 1 }, { nom: 20, up: 0.05, lo: -0.05, dir: -1 }, { nom: 29.8, up: 0.05, lo: -0.05, dir: -1 }];
  let s = stack(gap);
  check('stack: gap = 50 − 20 − 29.8 = 0.2', near(s.nom, 0.2, 1e-9));
  check('stack: worst case ±(0.1 + 0.05 + 0.05) = ±0.2, so the gap can close to 0', near(s.wc, 0.2, 1e-12) && Math.abs(s.wcMin) < 1e-9);
  check('stack: RSS ±√(0.1² + 0.05² + 0.05²) = ±0.1225', near(s.rss, Math.sqrt(0.015), 1e-12));
  check('stack: RSS is never more than worst case, and equal for one part', s.rss <= s.wc && near(stack([gap[0]]).rss, stack([gap[0]]).wc, 1e-12));
  check('stack: contributions add to 100% (both methods), the ±0.1 part is 2/3 of the RSS variance', near(s.parts.reduce((a, p) => a + p.rssPct, 0), 100, 1e-9) && near(s.parts.reduce((a, p) => a + p.wcPct, 0), 100, 1e-9) && near(s.parts[0].rssPct, 100 * 0.01 / 0.015, 1e-9));
  const c = center({ nom: 10, up: 0.1, lo: 0 });
  check('stack: 10 +0.1/0 becomes 10.05 ±0.05 (mean shift)', near(c.mean, 10.05, 1e-12) && near(c.t, 0.05, 1e-12));
  check('stack: a minus dimension with +0.1/0 makes the gap smaller on average', near(stack([{ nom: 30, up: 0, lo: 0, dir: 1 }, { nom: 10, up: 0.1, lo: 0, dir: -1 }]).mean, 19.95, 1e-12));
  const eight = Array.from({ length: 8 }, () => ({ nom: 5, up: 0.05, lo: -0.05, dir: 1 }));
  check('stack: 8 equal parts: worst case 8t, RSS √8·t (RSS gains more with more parts)', near(stack(eight).wc, 0.4, 1e-12) && near(stack(eight).rss, Math.sqrt(8) * 0.05, 1e-12));
  check('stack: Φ(0) = 0.5, Φ(3) = 0.99865, Φ(−1) = 0.1587', near(phi(0), 0.5, 1e-7) && Math.abs(phi(3) - 0.99865) < 1e-5 && Math.abs(phi(-1) - 0.158655) < 1e-6);
  check('stack: with the spec at the RSS limit, about 0.135% of assemblies are out (3σ)', Math.abs(rejectFrac(s, s.rssMin, null) - 0.00135) < 1e-5);
  const mc = monteCarlo(gap, 100000, 7);
  check('stack: Monte Carlo mean = nominal and σ = RSS/3 (within 1.5%)', Math.abs(mc.mean - s.mean) < 0.001 && Math.abs(mc.sd / s.sigma - 1) < 0.015, `${mc.mean} ${mc.sd}`);
  check('stack: Monte Carlo reject rate below 0.05 matches the normal formula', Math.abs(mc.frac(0.05, null) - rejectFrac(s, 0.05, null)) < 0.003, `${mc.frac(0.05, null)} ${rejectFrac(s, 0.05, null)}`);
  check('stack: Monte Carlo is repeatable with the same seed', monteCarlo(gap, 500, 3).mean === monteCarlo(gap, 500, 3).mean);

  // ---------- fatigue ----------
  check('fatigue: ka machined, Sut 520 MPa = 4.51·520^−0.265 = 0.860 (Shigley Ex. 6-3)', Math.abs(ka(520, 'machined') - 0.860) < 0.0015);
  check('fatigue: kb is continuous at 51 mm, and 1 for axial load', Math.abs(kb(51, 'bend') - kb(51.0001, 'bend')) < 0.002 && kb(80, 'axial') === 1);
  check('fatigue: a bigger part has a lower kb', kb(10, 'bend') > kb(40, 'bend') && kb(40, 'bend') > kb(150, 'bend'));
  check('fatigue: reliability 99% gives ke = 0.814', REL[99] === 0.814);
  const base = { Sut: 630, Sy: 530, surf: 'machined', d: 25, load: 'bend', rel: 50 };
  const rev = analyze({ ...base, smax: 150, smin: -150 });
  check('fatigue: fully reversed (R = −1): σm = 0 and all criteria give n = Se/σa', near(rev.sm, 0, 1e-12) && near(rev.R, -1, 1e-12) && ['goodman', 'soderberg', 'gerber'].every((k) => near(rev.n[k], rev.Se / 150, 1e-9)));
  check('fatigue: Se = ka·kb·kc·kd·ke·0.5·Sut', near(rev.Se, ka(630, 'machined') * kb(25, 'bend') * 0.5 * 630, 1e-9));
  const a = analyze({ ...base, smax: 300, smin: 60 });
  check('fatigue: σm = 180, σa = 120 from 300 / 60', near(a.sm, 180, 1e-12) && near(a.sa, 120, 1e-12));
  check('fatigue: the Goodman point n·(σm, σa) lies on the line σa/Se + σm/Sut = 1', near((a.n.goodman * a.sa) / a.Se + (a.n.goodman * a.sm) / 630, 1, 1e-12));
  check('fatigue: the Gerber point lies on the parabola σa/Se + (σm/Sut)² = 1', near((a.n.gerber * a.sa) / a.Se + ((a.n.gerber * a.sm) / 630) ** 2, 1, 1e-9));
  check('fatigue: with tension mean stress, Gerber ≥ Goodman ≥ Soderberg', a.n.gerber > a.n.goodman && a.n.goodman > a.n.soderberg);
  check('fatigue: Langer n = Sy/(σa + σm)', near(a.n.langer, 530 / 300, 1e-12));
  const k2 = analyze({ ...base, smax: 300, smin: 60, Kf: 2 });
  check('fatigue: Kf = 2 doubles the local stresses and halves the Goodman n', near(k2.sa, 240, 1e-12) && near(k2.n.goodman, a.n.goodman / 2, 1e-9));
  const comp = analyze({ ...base, smax: 50, smin: -250 });
  check('fatigue: compressive mean stress: fatigue n = Se/σa (the mean does not help or hurt)', comp.sm < 0 && near(comp.n.goodman, comp.Se / comp.sa, 1e-12));
  check('fatigue: Gerber with no alternating stress: n = Sut/σm', near(gerberFactor(0, 200, 300, 600), 3, 1e-12));
  const better = analyze({ ...base, surf: 'ground', smax: 300, smin: 60 }), worse = analyze({ ...base, surf: 'forged', smax: 300, smin: 60 });
  check('fatigue: a ground surface lasts longer than a forged one', better.Se > a.Se && a.Se > worse.Se);
}
