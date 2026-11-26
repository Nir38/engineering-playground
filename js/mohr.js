// mohr.js: plane stress at a point. Stress transformation, principal stresses, Mohr's circle,
// von Mises and Tresca. Sign convention (Hibbeler): θ counter-clockwise positive; on Mohr's circle
// σ to the right and τ positive DOWNWARD, so turning the element by θ turns the point by 2θ the same way.
// Checked in tests/mohr-cases.mjs.

const RAD = Math.PI / 180;

// stresses on the faces of the element turned by θ (degrees)
export function rotate({ sx, sy, txy }, thetaDeg) {
  const t = 2 * thetaDeg * RAD, a = (sx + sy) / 2, b = (sx - sy) / 2, c = Math.cos(t), s = Math.sin(t);
  return { sx: a + b * c + txy * s, sy: a - b * c - txy * s, txy: -b * s + txy * c };
}

export function mohr({ sx, sy, txy }) {
  const c = (sx + sy) / 2, b = (sx - sy) / 2, R = Math.hypot(b, txy);
  const s1 = c + R, s2 = c - R;
  // angle from x to the σ1 direction, in (−90°, 90°]
  let thetaP = (0.5 * Math.atan2(2 * txy, sx - sy)) / RAD;
  if (R < 1e-12) thetaP = 0;
  const thetaS = thetaP - 45; // max in-plane shear (positive τ'), 45° from the principal directions
  // plane stress: the third principal stress is σz = 0
  const all = [s1, s2, 0].sort((p, q) => q - p), [S1, S2, S3] = all;
  const vm = Math.sqrt(sx * sx - sx * sy + sy * sy + 3 * txy * txy);
  return { c, R, s1, s2, thetaP, thetaS, tauMax: R, S1, S2, S3, tauAbs: (S1 - S3) / 2, vonMises: vm, tresca: S1 - S3 };
}

// point of the rotated x face on Mohr's circle, in (σ, τ) with τ positive downward
export function circlePoint(state, thetaDeg) { const r = rotate(state, thetaDeg); return [r.sx, r.txy]; }

// θ (degrees) of the element whose x face sits at the circle point closest to (σ, τ)
export function thetaFromPoint(state, sigma, tau) {
  const { c } = mohr(state), b = (state.sx - state.sy) / 2;
  const a0 = Math.atan2(state.txy, b), a1 = Math.atan2(tau, sigma - c); // angles on the circle (τ down)
  let d = (a0 - a1) / RAD / 2; // turning by θ moves the point by −2θ in these coordinates
  while (d > 90) d -= 180; while (d <= -90) d += 180;
  return d;
}
