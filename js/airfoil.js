// airfoil.js: ideal (potential) flow around a Joukowski airfoil, for the playground's wing mode.
// A circle in the ζ-plane, centre μ = (−ε, η), passing through ζ = 1, is mapped by z = ζ + 1/ζ
// to an airfoil with a sharp trailing edge at z = 2 (chord ≈ 4). Free stream speed 1 at angle α.
// The Kutta condition (smooth flow off the trailing edge) fixes the circulation:
//   Γ = 4π R sin(α + β),  R = |1 − μ|,  β = atan2(η, 1 + ε)
// and Kutta–Joukowski gives the lift per span L' = ρ V Γ, so C_L = 2Γ / c.
// Exact for inviscid flow: no drag (d'Alembert), no stall. Checked in tests/airfoil-cases.mjs.

// complex numbers as [re, im]
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const div = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
const cis = (t) => [Math.cos(t), Math.sin(t)];
const abs = (a) => Math.hypot(a[0], a[1]);
const csqrt = (a) => { const r = abs(a), re = Math.sqrt((r + a[0]) / 2), im = Math.sign(a[1] || 1) * Math.sqrt(Math.max(0, (r - a[0]) / 2)); return [re, im]; };
export const C = { add, sub, mul, div, cis, abs };

// the slider values (thickness and camber as fractions of the chord) -> circle parameters.
// Classic thin-section results: t/c ≈ (3√3/4)·ε, f/c ≈ η/2. The model reports the true values.
export const paramsFrom = (tc, fc) => ({ eps: tc / ((3 * Math.sqrt(3)) / 4), eta: 2 * fc });

export function makeAirfoil({ eps, eta, alphaDeg }) {
  const mu = [-eps, eta], R = Math.hypot(1 + eps, eta), beta = Math.atan2(eta, 1 + eps);
  const alpha = (alphaDeg * Math.PI) / 180, G = 4 * Math.PI * R * Math.sin(alpha + beta);
  const eA = cis(-alpha), eB = cis(alpha);
  const map = (zeta) => add(zeta, div([1, 0], zeta));
  const dmap = (zeta) => sub([1, 0], div([1, 0], mul(zeta, zeta))); // dz/dζ
  // dw/dζ for w = (ζ−μ)e^{−iα} + R² e^{iα}/(ζ−μ) + iΓ/(2π) ln(ζ−μ)
  const dwdzeta = (zeta) => { const s = sub(zeta, mu); return add(sub(eA, div(mul([R * R, 0], eB), mul(s, s))), div([0, G / (2 * Math.PI)], s)); };
  // velocity (u, v) in the airfoil plane at the point that ζ maps to; |V∞| = 1
  const velocity = (zeta) => { const J = dmap(zeta); if (abs(J) < 1e-9) return [0, 0]; const q = div(dwdzeta(zeta), J); return [q[0], -q[1]]; };
  // the point outside the circle that maps to z (null inside the body)
  const inverse = (z) => {
    const s = csqrt(sub(mul(z, z), [4, 0])), a = mul([0.5, 0], add(z, s)), b = mul([0.5, 0], sub(z, s));
    const oa = abs(sub(a, mu)) >= R, ob = abs(sub(b, mu)) >= R;
    if (oa && ob) return abs(a) >= abs(b) ? a : b;
    return oa ? a : ob ? b : null;
  };
  // surface: n points around the circle, starting just after the trailing edge, counter-clockwise
  function surface(n = 240) {
    const pts = [];
    for (let k = 0; k < n; k++) {
      const th = -beta + ((k + 0.5) / n) * 2 * Math.PI, zeta = add(mu, [R * Math.cos(th), R * Math.sin(th)]);
      const z = map(zeta), u = velocity(zeta), q2 = u[0] * u[0] + u[1] * u[1];
      pts.push({ x: z[0], y: z[1], zeta, cp: 1 - q2 });
    }
    return pts;
  }
  const outline = surface(400);
  const xs = outline.map((p) => p.x), xmin = Math.min(...xs), xmax = Math.max(...xs);
  const le = outline.reduce((m, p) => (p.x < m.x ? p : m)), te = [2, 0];
  const chord = Math.hypot(te[0] - le.x, te[1] - le.y);
  const CL = (2 * G) / chord;
  // thickness and camber measured on the shape, as fractions of the chord (along x)
  let tMax = 0, fMax = 0;
  const iLe = outline.indexOf(le), upper = outline.slice(0, iLe + 1), lower = outline.slice(iLe);
  const yAt = (arr, x) => { for (let i = 1; i < arr.length; i++) { const a = arr[i - 1], b = arr[i]; if ((a.x - x) * (b.x - x) <= 0 && a.x !== b.x) return a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y); } return null; };
  for (let k = 1; k < 60; k++) {
    const x = xmin + ((xmax - xmin) * k) / 60, yu = yAt(upper, x), yl = yAt(lower, x);
    if (yu == null || yl == null) continue;
    tMax = Math.max(tMax, yu - yl); fMax = Math.max(fMax, Math.abs((yu + yl) / 2));
  }
  const cpMin = Math.min(...outline.map((p) => p.cp));
  return {
    eps, eta, R, beta, alpha, alphaDeg, G, mu, CL, chord, le, te, xmin, xmax,
    tc: tMax / chord, fc: (Math.sign(eta) || 1) * (fMax / chord), alpha0Deg: (-beta * 180) / Math.PI, cpMin,
    map, velocity, inverse, dwdzeta, surface, outline, upper, lower,
    cpAt(z) { const zeta = inverse(z); if (!zeta) return null; const u = velocity(zeta); return 1 - u[0] * u[0] - u[1] * u[1]; },
    // stream function (constant along a streamline)
    psi(zeta) { const s = sub(zeta, mu), w = add(add(mul(s, eA), div(mul([R * R, 0], eB), s)), mul([0, G / (2 * Math.PI)], [Math.log(abs(s)), Math.atan2(s[1], s[0])])); return w[1]; },
    // a streamline from a far upstream point: z points with their arrival times (speed 1 far away)
    streamline(zeta0, { h = 0.03, box = [-3.6, 3.6, -2.4, 2.4], maxSteps = 1600 } = {}) {
      let zeta = zeta0, t = 0; const out = [];
      for (let k = 0; k < maxSteps; k++) {
        const z = map(zeta); out.push([z[0], z[1], t]);
        if (z[0] > box[1] + 0.3) break;
        // dζ/dt = conj(dw/dζ) / |dz/dζ|²; step so that the move in z is about h (midpoint rule)
        const rate = (zz) => { const J = dmap(zz), d = dwdzeta(zz), j2 = J[0] * J[0] + J[1] * J[1]; return [d[0] / j2, -d[1] / j2]; };
        const v1 = rate(zeta), sp = Math.max(0.05, abs(v1) * abs(dmap(zeta))), dt = h / sp;
        const mid = add(zeta, mul([dt / 2, 0], v1)), v2 = rate(mid);
        let nz = add(zeta, mul([dt, 0], v2));
        if (abs(sub(nz, mu)) < R) nz = add(mu, mul([R * 1.0005, 0], cis(Math.atan2(nz[1] - mu[1], nz[0] - mu[0])))); // stay outside the body
        zeta = nz; t += dt;
      }
      return out;
    },
  };
}
export const RHO_AIR = 1.225; // kg/m³, ISA sea level, 15 °C
