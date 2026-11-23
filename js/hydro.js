// hydro.js: hydrostatics for the playground (SI units). Checked in tests/hydro-cases.mjs.
export const G = 9.81, P_ATM = 101325; // standard atmosphere, Pa

// ---------- immersed bodies ----------
// body = { shape: 'box'|'cyl'|'sphere', a, b, h (box, m), r, h (cyl), r (sphere), rho }
export const bodyHeight = (b) => (b.shape === 'sphere' ? 2 * b.r : b.h);
export function bodyVolume(b) {
  if (b.shape === 'box') return b.a * b.b * b.h;
  if (b.shape === 'cyl') return Math.PI * b.r * b.r * b.h;
  return (4 / 3) * Math.PI * b.r ** 3;
}
// volume below a plane at height s above the body's bottom, and the centroid height of that part
export function submerged(b, s) {
  const H = bodyHeight(b); s = Math.min(H, Math.max(0, s));
  if (b.shape === 'box') return { V: b.a * b.b * s, zc: s / 2 };
  if (b.shape === 'cyl') return { V: Math.PI * b.r * b.r * s, zc: s / 2 };
  const r = b.r; if (s <= 0) return { V: 0, zc: 0 };
  return { V: (Math.PI * s * s * (3 * r - s)) / 3, zc: (s * (8 * r - 3 * s)) / (4 * (3 * r - s)) }; // spherical cap from the pole
}
// forces when the body's bottom is at depth z below the free surface (z < 0: above the surface)
export function bodyForces(b, rhoF, z) {
  const sub = submerged(b, z), W = b.rho * bodyVolume(b) * G, Fb = rhoF * sub.V * G;
  return { W, Fb, hold: W - Fb, s: Math.min(bodyHeight(b), Math.max(0, z)), Vsub: sub.V, zB: sub.zc };
}
// where the body ends up when released in a tank of fluid depth D
export function equilibrium(b, rhoF, D) {
  const H = bodyHeight(b), W = b.rho * bodyVolume(b) * G;
  const FbAt = (s) => rhoF * submerged(b, s).V * G;
  if (W >= FbAt(Math.min(H, D)) - 1e-9 * W) { // sinks (or is just neutral when fully submerged)
    const neutral = Math.abs(W - FbAt(H)) <= 1e-9 * W && H <= D;
    const N = Math.max(0, W - FbAt(Math.min(H, D)));
    return { state: neutral ? 'neutral' : 'bottom', z: neutral ? (D + H) / 2 : D, s: Math.min(H, D), N };
  }
  let lo = 0, hi = Math.min(H, D);
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (FbAt(mid) < W) lo = mid; else hi = mid; }
  return { state: 'float', z: (lo + hi) / 2, s: (lo + hi) / 2, N: 0 };
}
// metacentric height of a floating body with draft s (box: tipping about the axis that is worst, width = min(a, b))
export function metacentric(b, s) {
  if (b.shape === 'sphere') return { GM: 0, KB: null, BM: null, KG: b.r };
  const V = submerged(b, s).V;
  const I = b.shape === 'box' ? (Math.max(b.a, b.b) * Math.min(b.a, b.b) ** 3) / 12 : (Math.PI * b.r ** 4) / 4;
  const KB = s / 2, BM = I / V, KG = b.h / 2;
  return { KB, BM, KG, GM: KB + BM - KG };
}

// ---------- pressure in layered fluid ----------
// layers: top layer thickness t (density rho1, may be 0) over the main fluid (rho2); depth z from the free surface
export function pressureAt(z, { rho1 = 0, t = 0, rho2 }) {
  if (z <= 0) return 0;
  return z <= t ? rho1 * G * z : rho1 * G * t + rho2 * G * (z - t);
}
// rectangular gate on a wall inclined at theta (deg, from horizontal) through the bottom corner.
// u = distance along the wall from the bottom corner; gate spans u1..u2, width b; liquid depth D.
// Returns the gauge resultant F (N) and the centre of pressure (u_cp along the wall, z_cp depth).
export function gateForce({ D, theta, u1, u2, b, layers }) {
  const sn = Math.sin((theta * Math.PI) / 180);
  const zAt = (u) => D - u * sn;
  // break points where p(u) changes slope: the surface (z = 0) and the layer interface (z = t)
  const cuts = [u1, u2];
  [D / sn, (D - layers.t) / sn].forEach((u) => { if (u > u1 && u < u2) cuts.push(u); });
  cuts.sort((p, q) => p - q);
  let F = 0, M = 0;
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i], c = cuts[i + 1]; if (c - a < 1e-15) continue;
    // p is linear on [a, c]: p = pa + k (u - a)
    const pa = pressureAt(zAt(a), layers), pc = pressureAt(zAt(c), layers), L = c - a, k = (pc - pa) / L;
    F += pa * L + (k * L * L) / 2;
    M += pa * (c * c - a * a) / 2 + k * ((c ** 3 - a ** 3) / 3 - (a * (c * c - a * a)) / 2);
  }
  F *= b; M *= b;
  const ucp = F > 0 ? M / F : (u1 + u2) / 2;
  return { F, ucp, zcp: zAt(ucp), area: b * (u2 - u1) };
}
