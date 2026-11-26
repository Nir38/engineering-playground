// Mohr's circle checks: invariants, principal stresses and angles, max shear, von Mises / Tresca,
// and that the circle and the transformation equations agree (sign convention).
import { rotate, mohr, circlePoint, thetaFromPoint } from '../js/mohr.js';
export function mohrChecks(check, near) {
  const cases = [{ sx: -20, sy: 90, txy: 60 }, { sx: 80, sy: 0, txy: 50 }, { sx: 100, sy: 50, txy: 0 }, { sx: 0, sy: 0, txy: 80 }, { sx: -60, sy: -30, txy: -25 }];
  for (const s of cases) {
    const m = mohr(s), tag = `σx ${s.sx}, σy ${s.sy}, τ ${s.txy}`;
    check(`Mohr ${tag}: σx' + σy' stays σx + σy at every θ`, [-70, -20, 15, 33, 80].every((t) => { const r = rotate(s, t); return near(r.sx + r.sy, s.sx + s.sy, 1e-12); }));
    check(`Mohr ${tag}: σ1 + σ2 = σx + σy and σ1·σ2 = σxσy − τ²`, near(m.s1 + m.s2, s.sx + s.sy, 1e-12) && near(m.s1 * m.s2, s.sx * s.sy - s.txy ** 2, 1e-9));
    const p = rotate(s, m.thetaP);
    check(`Mohr ${tag}: at θp the shear is 0 and σx' = σ1`, Math.abs(p.txy) < 1e-9 && near(p.sx, m.s1, 1e-9));
    const q = rotate(s, m.thetaS);
    check(`Mohr ${tag}: at θs = θp − 45° the shear is +τmax and σ' = center`, near(q.txy, m.tauMax, 1e-9) && near(q.sx, m.c, 1e-9));
    check(`Mohr ${tag}: every rotated face lies on the circle`, [-50, 10, 60].every((t) => { const [a, b] = circlePoint(s, t); return near(Math.hypot(a - m.c, b), m.R, 1e-9); }));
    check(`Mohr ${tag}: a point on the circle gives back its θ`, [-60, -10, 25, 70].every((t) => { const [a, b] = circlePoint(s, t); return m.R < 1e-9 || Math.abs(thetaFromPoint(s, a, b) - t) < 1e-9; }));
  }
  // classic cases
  const uni = mohr({ sx: 100, sy: 0, txy: 0 });
  check('uniaxial tension 100: σ1 = 100, τmax = 50 at 45°, von Mises = 100', near(uni.s1, 100, 1e-12) && near(uni.tauMax, 50, 1e-12) && near(rotate({ sx: 100, sy: 0, txy: 0 }, 45).txy, -50, 1e-12) && near(uni.vonMises, 100, 1e-12));
  const sh = mohr({ sx: 0, sy: 0, txy: 80 });
  check('pure shear 80: σ1 = 80, σ2 = −80 at θp = 45°, von Mises = √3·80, Tresca = 160', near(sh.s1, 80, 1e-12) && near(sh.s2, -80, 1e-12) && near(sh.thetaP, 45, 1e-12) && near(sh.vonMises, Math.sqrt(3) * 80, 1e-12) && near(sh.tresca, 160, 1e-12));
  const ex = mohr({ sx: -20, sy: 90, txy: 60 });
  check('σx −20, σy 90, τ 60: center 35, R = √(55² + 60²), σ1 = 116.4, σ2 = −46.4', near(ex.c, 35, 1e-12) && near(ex.R, Math.hypot(55, 60), 1e-12) && Math.abs(ex.s1 - 116.4) < 0.05 && Math.abs(ex.s2 + 46.4) < 0.05);
  const vessel = mohr({ sx: 100, sy: 50, txy: 0 });
  check('thin pressure vessel (σh = 2σa): in-plane τmax = 25 but absolute τmax = 50 (out of plane)', near(vessel.tauMax, 25, 1e-12) && near(vessel.tauAbs, 50, 1e-12) && vessel.S3 === 0);
  const eq = mohr({ sx: -100, sy: -100, txy: 0 });
  check('equal biaxial: the circle is a point (R = 0), every direction is principal', eq.R === 0 && eq.thetaP === 0);
  check('von Mises in principal stresses: √(σ1² − σ1σ2 + σ2²)', near(ex.vonMises, Math.sqrt(ex.s1 ** 2 - ex.s1 * ex.s2 + ex.s2 ** 2), 1e-9));
}
