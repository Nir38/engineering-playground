// formulas.js: every engineering formula in the app lives here, once.
// Units: SI base everywhere (N, m, Pa) unless a function name says otherwise.
// The tests in tests/run-tests.mjs check these against independent methods
// and against worked examples from the sources.

export const PI = Math.PI;

// ---------- Section properties ----------
export const area = {
  rect: (b, h) => b * h,
  circle: (d) => (PI * d * d) / 4,
  tube: (dOut, dIn) => (PI * (dOut * dOut - dIn * dIn)) / 4,
};

// Second moment of area about the neutral axis (bending)
export const I = {
  rect: (b, h) => (b * h ** 3) / 12,
  circle: (d) => (PI * d ** 4) / 64,
  tube: (dOut, dIn) => (PI * (dOut ** 4 - dIn ** 4)) / 64,
};

// Polar moment of area (torsion of round shafts)
export const J = {
  circle: (d) => (PI * d ** 4) / 32,
  tube: (dOut, dIn) => (PI * (dOut ** 4 - dIn ** 4)) / 32,
};

export const radiusOfGyration = (Ival, A) => Math.sqrt(Ival / A);

// ---------- Axial ----------
export const normalStress = (F, A) => F / A;
export const strain = (dL, L) => dL / L;
export const hookeStress = (E, eps) => E * eps;
export const elongation = (F, L, A, E) => (F * L) / (A * E);
export const axialStiffness = (A, E, L) => (A * E) / L;
export const thermalElongation = (alpha, dT, L) => alpha * dT * L;
export const thermalStressConstrained = (E, alpha, dT) => E * alpha * dT;
export const poissonLateralStrain = (nu, epsLong) => -nu * epsLong;
export const shearModulus = (E, nu) => E / (2 * (1 + nu));

// ---------- Stress-strain curve ----------
export const resilienceModulus = (Sy, E) => (Sy * Sy) / (2 * E); // J/m^3
export const trueStress = (sEng, epsEng) => sEng * (1 + epsEng);
export const trueStrain = (epsEng) => Math.log(1 + epsEng);
export const percentElongation = (Lf, L0) => ((Lf - L0) / L0) * 100;
export const percentReductionArea = (A0, Af) => ((A0 - Af) / A0) * 100;
// Plastic (permanent) strain left after unloading from total strain eps at stress s
export const permanentStrain = (epsTotal, s, E) => epsTotal - s / E;

// ---------- Torsion ----------
export const torsionStress = (T, r, Jval) => (T * r) / Jval;
export const twistAngle = (T, L, G, Jval) => (T * L) / (G * Jval); // rad
export const torqueFromPower = (P, rpm) => P / ((2 * PI * rpm) / 60); // P [W] -> T [N*m]
export const solidShaftTauMax = (T, d) => (16 * T) / (PI * d ** 3);

// ---------- Bending ----------
export const bendingStress = (M, c, Ival) => (M * c) / Ival;
export const sectionModulus = (Ival, c) => Ival / c;

// ---------- Transverse shear ----------
export const shearFlowStress = (V, Q, Ival, b) => (V * Q) / (Ival * b);
export const rectMaxShear = (V, b, h) => (1.5 * V) / (b * h);
export const circleMaxShear = (V, d) => (4 * V) / (3 * area.circle(d));

// ---------- Beams: reactions, max moment, max deflection ----------
// Cases: 'cant-point' (cantilever, end load P), 'cant-udl' (cantilever, w over L),
// 'ss-center' (simply supported, P at mid-span), 'ss-udl' (simply supported, w over L)
export const beam = {
  'cant-point': {
    Mmax: (P, L) => P * L,
    Vmax: (P) => P,
    defl: (P, L, E, Iv) => (P * L ** 3) / (3 * E * Iv),
    slopeTip: (P, L, E, Iv) => (P * L ** 2) / (2 * E * Iv),
  },
  'cant-udl': {
    Mmax: (w, L) => (w * L ** 2) / 2,
    Vmax: (w, L) => w * L,
    defl: (w, L, E, Iv) => (w * L ** 4) / (8 * E * Iv),
  },
  'ss-center': {
    Mmax: (P, L) => (P * L) / 4,
    Vmax: (P) => P / 2,
    defl: (P, L, E, Iv) => (P * L ** 3) / (48 * E * Iv),
  },
  'ss-udl': {
    Mmax: (w, L) => (w * L ** 2) / 8,
    Vmax: (w, L) => (w * L) / 2,
    defl: (w, L, E, Iv) => (5 * w * L ** 4) / (384 * E * Iv),
  },
};

// Bending moment M(x) for each case (sagging positive). Used by the
// numerical cross-check in the tests and by the diagrams.
export const beamMoment = {
  'cant-point': (P, L, x) => -P * (L - x), // x from the wall
  'cant-udl': (w, L, x) => (-w * (L - x) ** 2) / 2,
  'ss-center': (P, L, x) => (x <= L / 2 ? (P * x) / 2 : (P * (L - x)) / 2),
  'ss-udl': (w, L, x) => (w * x * (L - x)) / 2,
};

// ---------- Plane stress / Mohr's circle ----------
export function mohr(sx, sy, txy) {
  const C = (sx + sy) / 2;
  const R = Math.sqrt(((sx - sy) / 2) ** 2 + txy ** 2);
  const s1 = C + R;
  const s2 = C - R;
  // angle of principal plane from x-axis (degrees), tan(2θp) = 2τ/(σx-σy)
  const thetaP = (0.5 * Math.atan2(2 * txy, sx - sy) * 180) / PI;
  return { C, R, s1, s2, tauMax: R, thetaP };
}

// ---------- Failure theories ----------
export const vonMisesPrincipal2D = (s1, s2) => Math.sqrt(s1 * s1 - s1 * s2 + s2 * s2);
export const vonMisesXY = (sx, sy, txy) => Math.sqrt(sx * sx - sx * sy + sy * sy + 3 * txy * txy);
export const vonMises3D = (s1, s2, s3) =>
  Math.sqrt(((s1 - s2) ** 2 + (s2 - s3) ** 2 + (s3 - s1) ** 2) / 2);
// Tresca in plane stress: include the third principal stress = 0
export function trescaEquivalent(s1, s2) {
  const p = [s1, s2, 0];
  return Math.max(...p) - Math.min(...p);
}
export const safetyFactor = (strength, stress) => strength / stress;

// ---------- Buckling ----------
export const K_EFFECTIVE = { 'pinned-pinned': 1, 'fixed-pinned': 0.7, 'fixed-fixed': 0.5, 'fixed-free': 2 };
export const eulerLoad = (E, Iv, K, L) => (PI ** 2 * E * Iv) / (K * L) ** 2;
export const eulerStress = (E, slenderness) => (PI ** 2 * E) / slenderness ** 2;
export const criticalSlenderness = (E, Sy) => PI * Math.sqrt((2 * E) / Sy);
// Johnson parabola for intermediate columns (Shigley, ch. 4)
export const johnsonStress = (Sy, E, slenderness) =>
  Sy - (1 / E) * ((Sy * slenderness) / (2 * PI)) ** 2;

// ---------- Stress concentration ----------
export const peakStress = (Kt, sNom) => Kt * sNom;

// ---------- Fatigue ----------
export const meanStress = (sMax, sMin) => (sMax + sMin) / 2;
export const altStress = (sMax, sMin) => (sMax - sMin) / 2;
export const stressRatio = (sMax, sMin) => sMin / sMax;
// Shigley rotating-beam endurance estimate for steels (MPa)
export const enduranceEstimateSteel = (Sut) => (Sut <= 1400 ? 0.5 * Sut : 700);
// Modified Goodman: 1/n = σa/Se + σm/Sut
export const goodmanFactor = (sa, sm, Se, Sut) => 1 / (sa / Se + sm / Sut);
// Langer first-cycle yield line: n = Sy / (σa + σm)
export const langerFactor = (sa, sm, Sy) => Sy / (sa + sm);
export const soderbergFactor = (sa, sm, Se, Sy) => 1 / (sa / Se + sm / Sy);

// ---------- Helpers ----------
export const deg = (rad) => (rad * 180) / PI;
export const rad = (d) => (d * PI) / 180;
