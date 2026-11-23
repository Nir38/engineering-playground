// Vibration checks: analytical response vs RK4, and the classic results of the lesson formulas.
import { params, free, response, steady, magnification, transmissibility } from '../js/vibration.js';
import * as f from '../js/formulas.js';
export function vibChecks(check, near) {
  const rk4 = (m, k, c, x0, v0, F0, w, T, dt = 1e-5) => {
    let x = x0, v = v0, t = 0; const a = (x, v, t) => (F0 * Math.sin(w * t) - c * v - k * x) / m;
    while (t < T - 1e-12) {
      const h = Math.min(dt, T - t);
      const k1x = v, k1v = a(x, v, t), k2x = v + h / 2 * k1v, k2v = a(x + h / 2 * k1x, v + h / 2 * k1v, t + h / 2);
      const k3x = v + h / 2 * k2v, k3v = a(x + h / 2 * k2x, v + h / 2 * k2v, t + h / 2), k4x = v + h * k3v, k4v = a(x + h * k3x, v + h * k3v, t + h);
      x += h / 6 * (k1x + 2 * k2x + 2 * k3x + k4x); v += h / 6 * (k1v + 2 * k2v + 2 * k3v + k4v); t += h;
    }
    return { x, v };
  };
  const m = 5, k = 20000, cc = 2 * Math.sqrt(k * m);
  const p = params(m, k, 40);
  check('vib: fn = √(k/m)/2π = lesson formula', near(p.fn, f.naturalFreqHz(k, m), 1e-12) && near(p.fn, 10.07, 1e-3));
  check('vib: ζ = c/(2√km) = lesson formula', near(p.zeta, f.dampingRatio(40, k, m), 1e-12));
  check('vib: log decrement = 2πζ/√(1-ζ²) and inverts with the lesson formula', near(f.zetaFromLogDec(p.logDec), p.zeta, 1e-12));
  // analytical free response vs RK4 for under / critical / over damping (non-zero v0)
  for (const [z, name] of [[0, 'undamped'], [0.05, 'underdamped'], [1, 'critical'], [2.5, 'overdamped']]) {
    const c = z * cc, T = 0.37;
    const a = free(T, 0.01, 0.4, m, k, c), n = rk4(m, k, c, 0.01, 0.4, 0, 0, T);
    check(`vib: ${name} free response = RK4`, Math.abs(a.x - n.x) < 1e-9 && Math.abs(a.v - n.v) < 1e-7, `${a.x} vs ${n.x}`);
    check(`vib: ${name} type`, params(m, k, c).type === { undamped: 'undamped', underdamped: 'under', critical: 'critical', overdamped: 'over' }[name]);
  }
  // forced response (transient + steady) vs RK4, below / at / above resonance
  for (const r of [0.5, 1, 3]) {
    const w = r * Math.sqrt(k / m), c = 0.05 * cc, T = 0.53;
    const a = response(T, { m, k, c, x0: 0.002, v0: -0.1, F0: 100, w }), n = rk4(m, k, c, 0.002, -0.1, 100, w, T);
    check(`vib: forced response r=${r} = RK4`, Math.abs(a.x - n.x) < 1e-9 && Math.abs(a.v - n.v) < 1e-7);
  }
  { // undamped exact resonance grows linearly
    const w = Math.sqrt(k / m), T = 0.3, a = response(T, { m, k, c: 0, F0: 100, w }), n = rk4(m, k, 0, 0, 0, 100, w, T);
    check('vib: undamped resonance (secular term) = RK4', Math.abs(a.x - n.x) < 1e-9);
  }
  // steady amplitude: X = (F0/k) M(r, ζ); M(1) = 1/(2ζ); TR(√2) = 1
  const c = 0.1 * cc, wn = Math.sqrt(k / m);
  check('vib: X = (F0/k)·M(r,ζ)', [0.3, 1, 2].every((r) => near(steady(100, r * wn, m, k, c).X, (100 / k) * magnification(r, 0.1), 1e-12)));
  check('vib: M(1) = 1/(2ζ), same as the lesson', near(magnification(1, 0.1), 5, 1e-12) && near(magnification(1.7, 0.1), f.magnification(1.7, 0.1), 1e-12));
  check('vib: phase 90° at resonance', near(steady(100, wn, m, k, c).phi, Math.PI / 2, 1e-12));
  check('vib: TR(√2) = 1 for any ζ, same as the lesson', [0, 0.1, 0.7].every((z) => near(transmissibility(Math.SQRT2, z), 1, 1e-12)) && near(transmissibility(3, 0.05), f.transmissibility(3, 0.05), 1e-12));
  // measured log decrement from successive peaks of the analytical response
  const zz = 0.08, pk = params(m, k, zz * cc), t1 = Math.atan(Math.sqrt(1 - zz * zz) / zz) / pk.wd; // first peak after release from x0 with v0 = 0 sits at t = 0
  const x1 = free(0, 0.01, 0, m, k, zz * cc).x, x2 = free(pk.Td, 0.01, 0, m, k, zz * cc).x;
  check('vib: ln(x1/x2) over one damped period = δ', near(Math.log(x1 / x2), pk.logDec, 1e-9) && t1 > 0);
}
