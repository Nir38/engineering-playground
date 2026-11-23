// Pulley and rope checks: textbook results plus each body's own equilibrium / Newton equation.
import { tackle, connected, G } from '../js/pulleys.js';
export function pulleyChecks(check, near) {
  // ideal tackle: F = W/n, rope travel n
  let ok = true;
  for (const pull of ['down', 'up']) for (let n = 1; n <= 6; n++) {
    const t = tackle({ n, m: 100, eta: 1, pull });
    if (!near(t.F, 100 * G / n, 1e-12) || t.lines.length !== (pull === 'down' ? n + 1 : n) || t.sheaves.length !== t.lines.length - 1) ok = false;
  }
  check('tackle ideal F = W/n, line and sheave counts', ok);
  // sheave counts: pull down n=4 -> 2 fixed, 2 moving, dead end at the fixed block; n=3 -> 2 fixed, 1 moving, dead end on the moving block
  let t = tackle({ n: 4, m: 50 });
  check('tackle n=4 down: 2+2 sheaves, dead end fixed', t.fixedCount === 2 && t.movingCount === 2 && t.deadEnd === 'fixed');
  t = tackle({ n: 3, m: 50 });
  check('tackle n=3 down: 2 fixed, 1 moving, dead end moving', t.fixedCount === 2 && t.movingCount === 1 && t.deadEnd === 'moving');
  t = tackle({ n: 2, m: 50, pull: 'up' });
  check('tackle n=2 up: one moving sheave, dead end at the ceiling', t.fixedCount === 0 && t.movingCount === 1 && t.deadEnd === 'fixed');
  t = tackle({ n: 1, m: 50, pull: 'up' });
  check('tackle n=1 up: direct pull, no sheaves', t.sheaves.length === 0 && near(t.F, 50 * G, 1e-12) && near(t.ceiling, 0, 1e-12));
  // closed forms with per-sheave efficiency (geometric series)
  for (const [n, eta] of [[2, 0.95], [4, 0.96], [5, 0.9]]) {
    const W = 200 * G;
    const d = tackle({ n, m: 200, eta, pull: 'down' }), u = tackle({ n, m: 200, eta, pull: 'up' });
    check(`tackle down n=${n} η=${eta}: F = W(1-η)/(η(1-ηⁿ))`, near(d.F, W * (1 - eta) / (eta * (1 - eta ** n)), 1e-12));
    check(`tackle up n=${n} η=${eta}: F = W(1-η)/(1-ηⁿ)`, near(u.F, W * (1 - eta) / (1 - eta ** n), 1e-12));
    const lo = tackle({ n, m: 200, eta, pull: 'down', dir: 'lower' });
    check(`tackle n=${n}: lowering < ideal < lifting`, lo.F < W / n && W / n < d.F);
    check(`tackle n=${n}: moving block equilibrium ΣT = W`, near(d.T.reduce((a, b) => a + b, 0), W, 1e-12) && near(u.T.reduce((a, b) => a + b, 0), W, 1e-12));
    check(`tackle n=${n}: ceiling = W + F (down), W - F (up)`, near(d.ceiling, W + d.F, 1e-12) && near(u.ceiling, W - u.F, 1e-12));
    check(`tackle n=${n}: efficiency = MA/VR < η`, d.efficiency < eta && near(d.efficiency, d.MA / n, 1e-12));
  }
  // one fixed sheave with η: F = W/η (classic)
  check('single fixed sheave: F = W/η', near(tackle({ n: 1, m: 10, eta: 0.9 }).F, 10 * G / 0.9, 1e-12));
  check('moving block mass adds to the load', near(tackle({ n: 2, m: 10, mb: 2 }).F, 12 * G / 2, 1e-12));

  // connected bodies
  const S = (kind, m, extra = {}) => ({ kind, m, mus: 0, muk: 0, theta: 30, ...extra });
  let c = connected({ left: S('hang', 2), right: S('hang', 3) });
  check('Atwood a = (m1-m2)g/(m1+m2)', near(c.a, G / 5, 1e-12));
  check('Atwood T = 2m1m2g/(m1+m2)', near(c.TL, 2 * 3 * 2 * G / 5, 1e-12) && near(c.TR, c.TL, 1e-12));
  c = connected({ left: S('hang', 2), right: S('hang', 3), mp: 2 });
  check('Atwood with disk pulley a = Δm g/(m1+m2+mp/2)', near(c.a, G / 6, 1e-12) && near(c.TR - c.TL, 1 * c.a, 1e-12));
  c = connected({ left: S('hang', 3), right: S('hang', 2) });
  check('Atwood reversed: negative a', near(c.a, -G / 5, 1e-12));
  c = connected({ left: S('table', 4, { mus: 0.3, muk: 0.2 }), right: S('hang', 2) });
  check('table + hanging: a = (m2 - μk m1)g/(m1+m2)', c.moving && near(c.a, (2 - 0.2 * 4) * G / 6, 1e-12));
  check('table + hanging: T = m2(g - a)', near(c.TR, 2 * (G - c.a), 1e-12) && near(c.TL, c.TR, 1e-12));
  c = connected({ left: S('table', 4, { mus: 0.3, muk: 0.2 }), right: S('hang', 1) });
  check('table + light hanging mass: rest, T = m2 g, friction = m2 g', !c.moving && c.unique && near(c.TL, G, 1e-12) && near(Math.abs(c.fL), G, 1e-12));
  c = connected({ left: S('incline', 2, { theta: 30 }), right: S('hang', 3) });
  check('frictionless incline: a = (m2 - m1 sinθ)g/(m1+m2)', near(c.a, (3 - 2 * 0.5) * G / 5, 1e-9));
  c = connected({ left: S('incline', 5, { theta: 30 }), right: S('hang', 1) });
  check('incline wins: block slides down, a < 0', c.moving && c.a < 0 && near(c.a, (1 - 2.5) * G / 6, 1e-9));
  // both sides with friction at rest: tension not unique, range from each body's limits
  c = connected({ left: S('table', 5, { mus: 0.5, muk: 0.4 }), right: S('incline', 2, { theta: 20, mus: 0.5, muk: 0.4 }) });
  check('two friction surfaces at rest: T is a range', !c.moving && !c.unique && c.Tmin < c.Tmax);
  // random: Newton's law for each body with the returned tensions
  let okN = true;
  for (let k = 0; k < 400; k++) {
    const r = (a, b) => a + Math.random() * (b - a), kinds = ['hang', 'table', 'incline'];
    const side = () => { const mus = r(0, 0.6); return { kind: kinds[Math.floor(r(0, 3))], m: r(0.5, 10), theta: r(5, 80), mus, muk: mus * r(0.5, 1) }; };
    const L = side(), R = side(), mp = r(0, 3);
    const s = connected({ left: L, right: R, mp });
    const geo = (q) => (q.kind === 'hang' ? [1, 0] : q.kind === 'table' ? [0, 1] : [Math.sin(q.theta * Math.PI / 180), Math.cos(q.theta * Math.PI / 180)]);
    const [sl, cl] = geo(L), [sr, cr] = geo(R);
    if (s.moving) {
      const d = s.dir;
      const resR = R.m * s.a - (R.m * G * sr - s.TR - d * R.muk * R.m * G * cr);
      const resL = L.m * s.a - (s.TL - L.m * G * sl - d * L.muk * L.m * G * cl);
      const resP = (s.TR - s.TL) - (mp / 2) * s.a;
      if (Math.abs(resR) + Math.abs(resL) + Math.abs(resP) > 1e-9) okN = false;
      if (Math.sign(s.a) !== d) okN = false; // friction never reverses the motion
    } else {
      const T = (s.Tmin + s.Tmax) / 2; // any T in the range must keep both bodies within static friction
      if (Math.abs(R.m * G * sr - T) > R.mus * R.m * G * cr + 1e-9 || Math.abs(T - L.m * G * sl) > L.mus * L.m * G * cl + 1e-9) okN = false;
    }
  }
  check('connected bodies: Newton / equilibrium of each body (400 random)', okN);
}
