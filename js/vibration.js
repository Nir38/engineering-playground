// vibration.js: single-degree-of-freedom mass-spring-damper, m x'' + c x' + k x = F0 sin(w t).
// Analytical solution (free response for all damping cases + steady-state particular solution).
// Checked against RK4 in tests/vib-cases.mjs.
export function params(m, k, c) {
  const wn = Math.sqrt(k / m), cc = 2 * Math.sqrt(k * m), zeta = c / cc;
  const wd = zeta < 1 ? wn * Math.sqrt(1 - zeta * zeta) : 0;
  return {
    wn, fn: wn / (2 * Math.PI), Tn: (2 * Math.PI) / wn, cc, zeta, wd, Td: wd ? (2 * Math.PI) / wd : Infinity,
    type: zeta === 0 ? 'undamped' : zeta < 1 ? 'under' : Math.abs(zeta - 1) < 1e-12 ? 'critical' : 'over',
    logDec: zeta > 0 && zeta < 1 ? (2 * Math.PI * zeta) / Math.sqrt(1 - zeta * zeta) : null,
    settle: zeta > 0 ? 4 / (zeta * wn) : Infinity, // 2 % criterion (envelope approximation)
  };
}
// free response with x(0) = x0, x'(0) = v0
export function free(t, x0, v0, m, k, c) {
  const { wn, zeta, wd } = params(m, k, c);
  if (zeta < 1 - 1e-9) {
    const e = Math.exp(-zeta * wn * t), B = (v0 + zeta * wn * x0) / wd;
    return { x: e * (x0 * Math.cos(wd * t) + B * Math.sin(wd * t)), v: e * ((-zeta * wn) * (x0 * Math.cos(wd * t) + B * Math.sin(wd * t)) + wd * (-x0 * Math.sin(wd * t) + B * Math.cos(wd * t))) };
  }
  if (zeta <= 1 + 1e-9) { // critical
    const e = Math.exp(-wn * t), B = v0 + wn * x0;
    return { x: e * (x0 + B * t), v: e * (B - wn * (x0 + B * t)) };
  }
  const s = wn * Math.sqrt(zeta * zeta - 1), r1 = -zeta * wn + s, r2 = -zeta * wn - s;
  const A = (v0 - r2 * x0) / (r1 - r2), B = x0 - A;
  return { x: A * Math.exp(r1 * t) + B * Math.exp(r2 * t), v: A * r1 * Math.exp(r1 * t) + B * r2 * Math.exp(r2 * t) };
}
// steady state for F0 sin(w t): x_p = X sin(w t - phi)
export function steady(F0, w, m, k, c) {
  const d = Math.abs(k - m * w * w) < 1e-12 * k ? 0 : k - m * w * w, den = Math.hypot(d, c * w);
  return { X: den ? F0 / den : Infinity, phi: Math.atan2(c * w, d) };
}
// full response (transient + steady)
export function response(t, { m, k, c, x0 = 0, v0 = 0, F0 = 0, w = 0 }) {
  if (!F0) return free(t, x0, v0, m, k, c);
  const { X, phi } = steady(F0, w, m, k, c);
  if (!Number.isFinite(X)) { // undamped exact resonance: x_p = -(F0/(2 m w)) t cos(w t)
    const xp = (tt) => (-F0 / (2 * m * w)) * tt * Math.cos(w * tt), vp = (tt) => (-F0 / (2 * m * w)) * (Math.cos(w * tt) - w * tt * Math.sin(w * tt));
    const h = free(t, x0 - xp(0), v0 - vp(0), m, k, c);
    return { x: h.x + xp(t), v: h.v + vp(t) };
  }
  const h = free(t, x0 + X * Math.sin(phi), v0 - X * w * Math.cos(phi), m, k, c);
  return { x: h.x + X * Math.sin(w * t - phi), v: h.v + X * w * Math.cos(w * t - phi) };
}
export const magnification = (r, z) => 1 / Math.sqrt((1 - r * r) ** 2 + (2 * z * r) ** 2);
export const transmissibility = (r, z) => Math.sqrt(1 + (2 * z * r) ** 2) / Math.sqrt((1 - r * r) ** 2 + (2 * z * r) ** 2);
