// kt.js: theoretical stress concentration factors and notch sensitivity.
// - Circular hole in a finite-width plate, tension, net section: Pilkey, Formulas for Stress, Strain, and
//   Structural Matrices, 2nd ed. (curve fits of Peterson's charts).
// - Elliptical hole in a wide plate (Inglis): Kt = 1 + 2a/b = 1 + 2√(a/ρ), exact.
// - Stepped round shaft with a shoulder fillet, tension / bending / torsion: Pilkey (as above),
//   Kt = C1 + C2(2h/D) + C3(2h/D)² + C4(2h/D)³, h = (D − d)/2, nominal stress on d.
// - Notch sensitivity (Neuber constant, steels): Shigley 10th ed. Eq. 6-33 to 6-35b.
// Tests: tests/kt-cases.mjs.
export const SRC_KT = 'Pilkey, Formulas for Stress, Strain, and Structural Matrices (לפי Peterson)';
export const SRC_Q = "Shigley's Mechanical Engineering Design, 10th ed., סעיף 6-10";

export const ktHole = (dW) => 3 - 3.14 * dW + 3.667 * dW ** 2 - 1.527 * dW ** 3;
export const ktEllipse = (a, b) => 1 + (2 * a) / b;

const SH = {
  axial: { range: [0.1, 20], c: [
    { to: 2, k: [[0.926, 1.157, -0.099], [0.012, -3.036, 0.961], [-0.302, 3.977, -1.744], [0.365, -2.098, 0.878]] },
    { to: 20, k: [[1.2, 0.86, -0.022], [-1.805, -0.346, -0.038], [2.198, -0.486, 0.165], [-0.593, -0.028, -0.106]] }] },
  bend: { range: [0.1, 20], c: [
    { to: 2, k: [[0.947, 1.206, -0.131], [0.022, -3.405, 0.915], [0.869, 1.777, -0.555], [-0.81, 0.422, -0.26]] },
    { to: 20, k: [[1.232, 0.832, -0.008], [-3.813, 0.968, -0.26], [7.423, -4.868, 0.869], [-3.839, 3.07, -0.6]] }] },
  tors: { range: [0.25, 4], c: [
    { to: 4, k: [[0.905, 0.783, -0.075], [-0.437, -1.969, 0.553], [1.557, 1.073, -0.578], [-1.061, 0.171, 0.086]] }] },
};
// D, d, r in any one unit; load: 'axial' | 'bend' | 'tors'. ok = inside the range of the fit
export function ktShoulder(D, d, r, load) {
  const h = (D - d) / 2, hr = h / r, x = (2 * h) / D, L = SH[load], seg = L.c.find((s) => hr <= s.to) || L.c[L.c.length - 1];
  const C = seg.k.map(([a, b, c]) => a + b * Math.sqrt(hr) + c * hr);
  return { Kt: C[0] + C[1] * x + C[2] * x * x + C[3] * x ** 3, hr, ok: hr >= L.range[0] && hr <= L.range[1], range: L.range };
}

// Neuber constant √a [√in] for steels, Sut in kpsi (valid about 50–250 kpsi)
export function sqrtA(SutMPa, load) {
  const S = SutMPa / 6.89476;
  return load === 'tors' ? 0.19 - 2.51e-3 * S + 1.35e-5 * S * S - 2.67e-8 * S ** 3 : 0.246 - 3.08e-3 * S + 1.51e-5 * S * S - 2.67e-8 * S ** 3;
}
// notch sensitivity q = 1 / (1 + √a/√r), r in mm
export const qNotch = (SutMPa, rMM, load) => 1 / (1 + sqrtA(SutMPa, load) / Math.sqrt(rMM / 25.4));
export const kf = (Kt, q) => 1 + q * (Kt - 1);
