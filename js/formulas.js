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

// =====================================================================
// FLUIDS (SI: Pa, m, m/s, kg/m^3, Pa*s)
// =====================================================================
export const G0 = 9.81;
// Reference properties, Cengel & Cimbala appendix tables (20 °C, 1 atm)
export const WATER = { rho: 998, mu: 1.002e-3, pv: 2339 };
export const AIR = { rho: 1.204, mu: 1.825e-5 };
export const PATM = 101325;

export const kinematicViscosity = (mu, rho) => mu / rho;
export const newtonShear = (mu, dudy) => mu * dudy;
export const hydrostaticPressure = (rho, h, g = G0) => rho * g * h;
export const buoyancy = (rhoFluid, Vdisp, g = G0) => rhoFluid * g * Vdisp;
export const hydraulicPressForce = (F1, A1, A2) => (F1 * A2) / A1;
// resultant on a submerged plane wall: pressure at the centroid times area
export const planeWallForce = (rho, hc, A, g = G0) => rho * g * hc * A;
// depth of the centre of pressure below the surface: hc + I_xc / (hc A)
export const centerOfPressure = (hc, Ixc, A) => hc + Ixc / (hc * A);
// fraction of a floating body's volume that is submerged
export const submergedFraction = (rhoBody, rhoFluid) => rhoBody / rhoFluid;

export const flowRate = (A, V) => A * V;
export const massFlow = (rho, A, V) => rho * A * V;

// Bernoulli between 1 and 2 along a streamline: returns p2
export const bernoulliP2 = (p1, V1, z1, V2, z2, rho, g = G0) =>
  p1 + 0.5 * rho * (V1 * V1 - V2 * V2) + rho * g * (z1 - z2);
export const torricelli = (h, g = G0) => Math.sqrt(2 * g * h);
export const pitotVelocity = (dp, rho) => Math.sqrt((2 * dp) / rho);
export const dynamicPressure = (rho, V) => 0.5 * rho * V * V;
// ideal venturi (Cd = 1): Q = A2 sqrt(2Δp / (ρ (1-β⁴))), β = d2/d1
export const venturiQ = (d1, d2, dp, rho, Cd = 1) => {
  const beta = d2 / d1;
  return Cd * area.circle(d2) * Math.sqrt((2 * dp) / (rho * (1 - beta ** 4)));
};

export const reynolds = (rho, V, D, mu) => (rho * V * D) / mu;
export const flowRegime = (Re) => (Re < 2300 ? 'laminar' : Re <= 4000 ? 'transitional' : 'turbulent');

export const frictionLaminar = (Re) => 64 / Re;
// Haaland explicit approximation (within ~2% of Colebrook)
export const frictionHaaland = (Re, relRough) =>
  1 / (-1.8 * Math.log10((relRough / 3.7) ** 1.11 + 6.9 / Re)) ** 2;
// Colebrook, solved by fixed-point iteration
export function frictionColebrook(Re, relRough) {
  let f = frictionHaaland(Re, relRough);
  for (let i = 0; i < 60; i++) {
    const rhs = -2 * Math.log10(relRough / 3.7 + 2.51 / (Re * Math.sqrt(f)));
    f = 1 / (rhs * rhs);
  }
  return f;
}
export const frictionFactor = (Re, relRough) => (Re < 2300 ? frictionLaminar(Re) : frictionColebrook(Re, relRough));
export const darcyHeadLoss = (f, L, D, V, g = G0) => f * (L / D) * (V * V) / (2 * g);
export const darcyPressureDrop = (f, L, D, V, rho) => f * (L / D) * 0.5 * rho * V * V;
export const minorHeadLoss = (K, V, g = G0) => (K * V * V) / (2 * g);
// Hagen-Poiseuille (laminar, round pipe)
export const poiseuilleDrop = (mu, L, Q, D) => (128 * mu * L * Q) / (PI * D ** 4);

export const pumpHydraulicPower = (rho, Q, H, g = G0) => rho * g * Q * H;
export const pumpShaftPower = (rho, Q, H, eta, g = G0) => (rho * g * Q * H) / eta;
// affinity laws, same pump, speed N1 -> N2
export const affinity = (Q1, H1, P1, N1, N2) => {
  const r = N2 / N1;
  return { Q: Q1 * r, H: H1 * r * r, P: P1 * r ** 3 };
};
// NPSH available: zs = height of the liquid surface ABOVE the pump inlet (negative if below)
export const npshAvailable = (pSurface, pv, rho, zs, hLoss, g = G0) =>
  (pSurface - pv) / (rho * g) + zs - hLoss;

export const dragForce = (rho, V, Cd, A) => 0.5 * rho * V * V * Cd * A;
export const liftForce = (rho, V, Cl, A) => 0.5 * rho * V * V * Cl * A;
export const dragPower = (rho, V, Cd, A) => dragForce(rho, V, Cd, A) * V;
// jet hitting a fixed flat plate head-on: F = ρ Q V = ρ A V²
export const jetForceFlatPlate = (rho, A, V) => rho * A * V * V;
export const kmh = (v) => v / 3.6; // km/h -> m/s

// =====================================================================
// MATERIALS
// =====================================================================
// Fe-Fe3C key points (Callister, ch. 9): wt% C, °C
export const FE_C = { eutectoidC: 0.76, eutectoidT: 727, ferriteMaxC: 0.022, cementiteC: 6.7, austeniteMaxC: 2.14, eutecticC: 4.3, eutecticT: 1147, A3pure: 912 };
// lever rule: fraction of phase/constituent "b" between compositions a and b at overall C0
export const leverRule = (C0, Ca, Cb) => (C0 - Ca) / (Cb - Ca);
// hypoeutectoid steel just below 727 °C (Callister eq. 9.20-9.21)
export const pearliteFraction = (C0) => leverRule(C0, FE_C.ferriteMaxC, FE_C.eutectoidC);
export const proeutectoidFerrite = (C0) => 1 - pearliteFraction(C0);
// hypereutectoid: pearlite and proeutectoid cementite
export const pearliteFractionHyper = (C1) => (FE_C.cementiteC - C1) / (FE_C.cementiteC - FE_C.eutectoidC);

// Hardness. Brinell: P [kgf], D, d [mm]. Vickers: F [kgf], d = mean diagonal [mm].
export const brinell = (P, D, d) => (2 * P) / (PI * D * (D - Math.sqrt(D * D - d * d)));
export const vickers = (F, d) => (2 * F * Math.sin(rad(68))) / (d * d); // = 1.8544 F/d²
// steels: tensile strength from Brinell (Callister eq. 6.20a), MPa
export const utsFromHB = (HB) => 3.45 * HB;

// Selection (Ashby). Inputs in any consistent units.
export const specificStiffness = (E, rho) => E / rho;
export const specificStrength = (S, rho) => S / rho;
// mass of a component meeting a stiffness target is proportional to 1/index
export const ashbyIndex = {
  tie: (E, rho) => E / rho,                  // stiff tie, fixed length
  beam: (E, rho) => Math.sqrt(E) / rho,      // stiff beam, square section free
  panel: (E, rho) => Math.cbrt(E) / rho,     // stiff panel, thickness free
  strongBeam: (S, rho) => S ** (2 / 3) / rho,
};
export const massRatio = (indexA, indexB) => indexB / indexA; // mass A / mass B

// Coatings: hard anodize (Type III) grows ~50% outward, ~50% inward
export const anodizeOutwardGrowth = (t) => t / 2;
export const anodizedShaftDiameter = (d, t) => d + 2 * anodizeOutwardGrowth(t);
export const anodizedHoleDiameter = (d, t) => d - 2 * anodizeOutwardGrowth(t);

// IIW carbon equivalent (weldability), wt%
export const carbonEquivalent = ({ C = 0, Mn = 0, Cr = 0, Mo = 0, V = 0, Ni = 0, Cu = 0 }) =>
  C + Mn / 6 + (Cr + Mo + V) / 5 + (Ni + Cu) / 15;
// pitting resistance equivalent number for stainless steels, wt%
export const pren = ({ Cr = 0, Mo = 0, N = 0 }) => Cr + 3.3 * Mo + 16 * N;

// thermal mismatch between two parts of the same length
export const thermalMismatch = (a1, a2, dT, L) => Math.abs(a1 - a2) * dT * L;

// ---------- Helpers ----------
export const deg = (rad) => (rad * 180) / PI;
export const rad = (d) => (d * PI) / 180;
