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

// ---------- Pulleys & rope tension (ideal: massless rope, frictionless pulleys) ----------
// block and tackle with n rope segments holding the moving block
export const tackleForce = (W, n, eta = 1) => W / (n * eta);
export const tackleRopeTravel = (lift, n) => lift * n;
// Atwood machine, m1 > m2
export const atwoodAccel = (m1, m2, g = 9.81) => ((m1 - m2) * g) / (m1 + m2);
export const atwoodTension = (m1, m2, g = 9.81) => (2 * m1 * m2 * g) / (m1 + m2);
// weight hanging from two symmetric cables at angle θ above horizontal
export const twoCableTension = (W, thetaDeg) => W / (2 * Math.sin(rad(thetaDeg)));
// capstan / belt friction: T_tight = T_slack · e^{μθ}
export const capstan = (Tslack, mu, thetaRad) => Tslack * Math.exp(mu * thetaRad);
// resultant on a pulley axle when the rope wraps angle β (deg) with equal tension T
export const pulleyAxleLoad = (T, wrapDeg) => 2 * T * Math.sin(rad(wrapDeg) / 2);
// block on a frictionless incline (angle α) pulled over a pulley by a hanging mass m2
export const inclineAccel = (m1, alphaDeg, m2, g = 9.81) => ((m2 - m1 * Math.sin(rad(alphaDeg))) * g) / (m1 + m2);

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

// =====================================================================
// THERMODYNAMICS & HEAT TRANSFER (SI, temperatures in K unless noted)
// =====================================================================
export const AIR_GAS = { R: 287, k: 1.4, cp: 1005, cv: 718 }; // Cengel & Boles, Table A-2
export const CP_WATER = 4180;                                  // J/kg·K, ~25 °C
export const SIGMA_SB = 5.67e-8;                               // Stefan-Boltzmann, W/m²K⁴
export const K = (c) => c + 273.15;

export const sensibleHeat = (m, c, dT) => m * c * dT;
export const firstLawDU = (Q, W) => Q - W; // W = work done BY the system
// ideal gas, mass form: P V = m R T
export const idealGasP = (m, R, T, V) => (m * R * T) / V;
export const isochoricP2 = (P1, T1, T2) => (P1 * T2) / T1;
export const isothermalWork = (P1, V1, V2) => P1 * V1 * Math.log(V2 / V1);
export const isentropicT2fromP = (T1, P1, P2, k = 1.4) => T1 * (P2 / P1) ** ((k - 1) / k);
export const isentropicT2fromV = (T1, r, k = 1.4) => T1 * r ** (k - 1); // r = V1/V2
export const isentropicP2fromV = (P1, r, k = 1.4) => P1 * r ** k;
export const polytropicWork = (P1, V1, P2, V2, n) => (P2 * V2 - P1 * V1) / (1 - n);

export const carnotEff = (TH, TC) => 1 - TC / TH;
export const copRefrigCarnot = (TC, TH) => TC / (TH - TC);
export const copHeatPumpCarnot = (TC, TH) => TH / (TH - TC);
export const ottoEff = (r, k = 1.4) => 1 - 1 / r ** (k - 1);
export const dieselEff = (r, rc, k = 1.4) => 1 - (1 / r ** (k - 1)) * ((rc ** k - 1) / (k * (rc - 1)));
export const braytonEff = (rp, k = 1.4) => 1 - 1 / rp ** ((k - 1) / k);
export const shaftPower = (T, rpm) => (T * 2 * PI * rpm) / 60;

// conduction / resistances (W, K)
export const fourier = (k, A, dT, L) => (k * A * dT) / L;
export const Rwall = (L, k, A) => L / (k * A);
export const Rcyl = (r1, r2, k, L) => Math.log(r2 / r1) / (2 * PI * k * L);
export const Rconv = (h, A) => 1 / (h * A);
// convection, lumped capacitance
export const newtonCooling = (h, A, dT) => h * A * dT;
export const timeConstant = (rho, c, V, h, A) => (rho * c * V) / (h * A);
export const lumpedT = (Tinf, Ti, t, tau) => Tinf + (Ti - Tinf) * Math.exp(-t / tau);
export const biot = (h, Lc, k) => (h * Lc) / k;
// radiation
export const radiationNet = (eps, A, Ts, Tsur) => eps * SIGMA_SB * A * (Ts ** 4 - Tsur ** 4);
// heat exchangers
export const lmtd = (dT1, dT2) => (Math.abs(dT1 - dT2) < 1e-9 ? dT1 : (dT1 - dT2) / Math.log(dT1 / dT2));
export const hxDuty = (U, A, dTlm) => U * A * dTlm;
// electronics cooling: junction temperature and required heat-sink resistance
export const junctionTemp = (Ta, P, Rs) => Ta + P * Rs.reduce((a, b) => a + b, 0);
export const requiredRsa = (TjMax, Ta, P, Rjc, Rcs) => (TjMax - Ta) / P - Rjc - Rcs;

// =====================================================================
// ELECTRICITY & DRIVES (SI)
// =====================================================================
export const RHO_CU = 1.68e-8; // Ω·m, copper at 20 °C
export const RHO_AL = 2.65e-8; // Ω·m, aluminium at 20 °C
export const ohmI = (V, R) => V / R;
export const wireR = (rho, L, A) => (rho * L) / A;
export const powerVI = (V, I) => V * I;
export const powerI2R = (I, R) => I * I * R;
export const energyKWh = (P_W, hours) => (P_W * hours) / 1000;
export const seriesR = (...R) => R.reduce((a, b) => a + b, 0);
export const parallelR = (...R) => 1 / R.reduce((a, b) => a + 1 / b, 0);
export const divider = (Vin, R1, R2) => (Vin * R2) / (R1 + R2);
// AC
export const vPeak = (Vrms) => Math.SQRT2 * Vrms;
export const lineFromPhase = (Vph) => Math.sqrt(3) * Vph;
export const threePhasePower = (VL, I, pf = 1) => Math.sqrt(3) * VL * I * pf;
export const threePhaseCurrent = (P, VL, pf = 1) => P / (Math.sqrt(3) * VL * pf);
export const singlePhasePower = (V, I, pf = 1) => V * I * pf;
// magnetism & transformers
export const lorentzForce = (B, I, L) => B * I * L;
export const transformerV2 = (V1, N1, N2) => (V1 * N2) / N1;
export const transformerI2 = (I1, N1, N2) => (I1 * N1) / N2;
// DC motor (armature resistance Ra, constant k = ke = kt in SI)
export const dcStartCurrent = (V, Ra) => V / Ra;
export const dcCurrent = (V, k, omega, Ra) => (V - k * omega) / Ra;
export const dcTorque = (k, I) => k * I;
export const dcNoLoadSpeed = (V, k) => V / k; // rad/s
// AC induction motor
export const syncSpeed = (f, poles) => (120 * f) / poles; // rpm
export const slip = (Ns, N) => (Ns - N) / Ns;
export const rotorSpeed = (Ns, s) => Ns * (1 - s);
// drives
export const stepAngle = (stepsPerRev) => 360 / stepsPerRev;
export const leadScrewResolution = (lead, stepsPerRev, micro = 1) => lead / (stepsPerRev * micro);
export const gearOutTorque = (Tin, ratio, eta = 1) => Tin * ratio * eta;
export const gearOutSpeed = (nin, ratio) => nin / ratio;
// supply & grid
// Israeli tariff book: 1×40 A = 9.24 kVA, 3×25 A = 17.32 kVA, i.e. Vph = 400/√3
export const connectionKVA = (amps, phases, Vph = 400 / Math.sqrt(3)) => (amps * phases * Vph) / 1000;
export const lineLoss3ph = (P, VL, R) => 3 * threePhaseCurrent(P, VL) ** 2 * R;
// sag of a span (parabolic approximation): w = weight per length, H = horizontal tension
export const cableSag = (w, L, H) => (w * L * L) / (8 * H);

// =====================================================================
// MACHINE DESIGN (Shigley). Units: N, mm, MPa unless noted.
// =====================================================================
// shafts: von Mises for bending M + torsion T on a solid round shaft
export const shaftVonMises = (M, T, d) => (16 / (PI * d ** 3)) * Math.sqrt(4 * M * M + 3 * T * T);
export const shaftDiameterStatic = (M, T, Sy, n) => Math.cbrt((16 * n * Math.sqrt(4 * M * M + 3 * T * T)) / (PI * Sy));
// first critical speed from static deflection (single mass / Rayleigh), rpm
export const criticalSpeedRpm = (deltaStatic_m, g = 9.81) => (60 / (2 * PI)) * Math.sqrt(g / deltaStatic_m);

// rolling bearings: L10 in revolutions, a = 3 ball, 10/3 roller
export const bearingL10Rev = (C, P, a = 3) => (C / P) ** a * 1e6;
export const bearingL10Hours = (C, P, rpm, a = 3) => bearingL10Rev(C, P, a) / (60 * rpm);
export const bearingRequiredC = (P, hours, rpm, a = 3) => P * ((hours * 60 * rpm) / 1e6) ** (1 / a);

// bolts. ISO metric coarse tensile stress areas At [mm²] (Shigley Table 8-1)
export const BOLT_AT = { M6: 20.1, M8: 36.6, M10: 58.0, M12: 84.3, M16: 157, M20: 245, M24: 353 };
// property class "a.b": Sut ≈ 100·a MPa, Sy ≈ 10·a·b MPa (nominal, ISO 898-1 naming)
export const boltClass = (cls) => { const [a, b] = cls.split('.').map(Number); return { Sut: 100 * a, Sy: 10 * a * b }; };
export const boltPreload = (At, Sp, frac = 0.75) => frac * At * Sp;     // Fi = 0.75 At Sp (reusable)
export const boltTorque = (K, Fi, d) => K * Fi * d;                       // T = K Fi d, K ≈ 0.2
export const jointConstant = (kb, km) => kb / (kb + km);
export const boltLoad = (C, P, Fi) => C * P + Fi;
export const memberLoad = (C, P, Fi) => (1 - C) * P - Fi;                 // negative = still clamped
export const separationLoad = (C, Fi) => Fi / (1 - C);

// gears (metric)
export const gearPitchDia = (m, N) => m * N;
export const gearCenterDistance = (m, N1, N2) => (m * (N1 + N2)) / 2;
export const gearRatio = (N1, N2) => N2 / N1;
export const gearTangentialForce = (T_Nmm, d_mm) => (2 * T_Nmm) / d_mm;
export const lewisStress = (Wt, F, m, Y) => Wt / (F * m * Y);
// Lewis form factor Y, 20° full-depth teeth (Shigley Table 14-2)
export const LEWIS_Y = { 20: 0.322, 25: 0.34, 30: 0.359, 40: 0.389, 50: 0.409, 60: 0.422, 100: 0.447 };

// helical compression springs
export const springIndex = (D, d) => D / d;
export const springRate = (G, d, D, Na) => (G * d ** 4) / (8 * D ** 3 * Na);
export const springKs = (C) => 1 + 0.5 / C;
export const springShear = (F, D, d) => springKs(D / d) * (8 * F * D) / (PI * d ** 3);
export const springsSeries = (k1, k2) => (k1 * k2) / (k1 + k2);
export const springsParallel = (k1, k2) => k1 + k2;

// keys and press fits
export const keyForce = (T, d) => (2 * T) / d;                      // force at shaft surface
export const keyShear = (T, d, w, L) => keyForce(T, d) / (w * L);
export const keyBearing = (T, d, h, L) => keyForce(T, d) / (L * h / 2);
// interference fit, same material, solid shaft: radial interference delta, hub outer radius ro
export const pressFitPressure = (E, delta, R, ro) => (E * delta * (ro * ro - R * R)) / (2 * R * ro * ro);
export const pressFitTorque = (f, p, R, L) => f * p * 2 * PI * R * L * R;

// fillet weld: throat 0.707 h
export const filletShear = (F, h, L) => F / (0.707 * h * L);

// belts: power from tight/slack tensions, V in m/s
export const beltPower = (F1, F2, V) => (F1 - F2) * V;
export const beltSpeed = (d_mm, rpm) => (PI * d_mm * rpm) / 60000;

// =====================================================================
// TOLERANCES & GD&T (mm unless noted; deviations in µm)
// =====================================================================
// ISO 286 tables (µm) for a few size ranges: IT grades and shaft fundamental deviations
export const ISO286 = {
  '6-10':  { IT6: 9,  IT7: 15, IT8: 22, f: -13, g: -5, h: 0, k: 1, n: 10, p: 15, s: 23 },
  '10-18': { IT6: 11, IT7: 18, IT8: 27, f: -16, g: -6, h: 0, k: 1, n: 12, p: 18, s: 28 },
  '18-30': { IT6: 13, IT7: 21, IT8: 33, f: -20, g: -7, h: 0, k: 2, n: 15, p: 22, s: 35 },
  '30-50': { IT6: 16, IT7: 25, IT8: 39, f: -25, g: -9, h: 0, k: 2, n: 17, p: 26, s: 43 },
};
export const sizeRange = (D) => (D <= 10 ? '6-10' : D <= 18 ? '10-18' : D <= 30 ? '18-30' : '30-50');
// ISO 286-1 tolerance unit i [µm], D = geometric mean of the size range
export const toleranceUnit = (D) => 0.45 * Math.cbrt(D) + 0.001 * D;
export const IT_FACTOR = { 6: 10, 7: 16, 8: 25 };
// hole H<grade> and shaft <letter><grade> limits in µm relative to nominal
export function holeH(D, grade) { const r = ISO286[sizeRange(D)]; return { lo: 0, hi: r[`IT${grade}`] }; }
export function shaftLimits(D, letter, grade) {
  const r = ISO286[sizeRange(D)], IT = r[`IT${grade}`];
  // f, g, h: the upper deviation (es) is the fundamental one; k, n, p, s: the lower (ei)
  return ['f', 'g', 'h'].includes(letter) ? { lo: r[letter] - IT, hi: r[letter] } : { lo: r[letter], hi: r[letter] + IT };
}
// fit: positive = clearance, negative = interference (µm)
export function fit(D, holeGrade, letter, shaftGrade) {
  const h = holeH(D, holeGrade), s = shaftLimits(D, letter, shaftGrade);
  return { maxClearance: h.hi - s.lo, minClearance: h.lo - s.hi };
}

// stack-up
export const stackWorst = (tols) => tols.reduce((a, b) => a + Math.abs(b), 0);
export const stackRSS = (tols) => Math.sqrt(tols.reduce((a, b) => a + b * b, 0));
// position: diameter of the zone needed for a measured deviation dx, dy
export const positionDia = (dx, dy) => 2 * Math.hypot(dx, dy);
// MMC bonus: allowed geometric tolerance = stated + departure from MMC
export const mmcAllowed = (stated, mmcSize, actualSize) => stated + Math.abs(actualSize - mmcSize);
export const virtualConditionPin = (mmc, tol) => mmc + tol;
export const virtualConditionHole = (mmc, tol) => mmc - tol;
// fastener formulas (ASME Y14.5): T = position tolerance diameter
export const floatingFastenerT = (H, F) => H - F;       // both parts have clearance holes
export const fixedFastenerT = (H, F) => (H - F) / 2;    // one part threaded (split between the two)
// ISO 2768 general tolerances, ± mm (class f / m / c / v) by nominal size
export function iso2768(cls, L) {
  const ranges = [[0.5, 3, 0.05, 0.1, 0.2, null], [3, 6, 0.05, 0.1, 0.3, 0.5], [6, 30, 0.1, 0.2, 0.5, 1], [30, 120, 0.15, 0.3, 0.8, 1.5], [120, 400, 0.2, 0.5, 1.2, 2.5], [400, 1000, 0.3, 0.8, 2, 4]];
  const row = ranges.find(([a, b]) => L > a && L <= b) || ranges[ranges.length - 1];
  return row[{ f: 2, m: 3, c: 4, v: 5 }[cls]];
}
// thermal size change when measured away from the 20 °C reference
export const thermalSizeChange = (L, alpha, dT) => L * alpha * dT;

// =====================================================================
// MANUFACTURING & DFM (mm, min, m/min)
// =====================================================================
// machining
export const spindleRpm = (Vc_m_min, D_mm) => (1000 * Vc_m_min) / (PI * D_mm);
export const cuttingSpeed = (D_mm, rpm) => (PI * D_mm * rpm) / 1000;
export const millFeedRate = (fz, z, rpm) => fz * z * rpm;                 // mm/min
export const millMRR = (ae, ap, vf) => ae * ap * vf;                       // mm³/min
export const turnMRR = (Vc_m_min, f_mm_rev, ap) => Vc_m_min * 1000 * f_mm_rev * ap; // mm³/min
export const turnRa = (f, rNose) => (f * f) / (32 * rNose) * 1000;         // µm, theoretical
export const machiningTime = (L, vf) => L / vf;                            // min
// sheet metal (θ in degrees, inside radius R, thickness T)
export const bendAllowance = (thetaDeg, R, K, T) => rad(thetaDeg) * (R + K * T);
export const flatLength = (L1, L2, thetaDeg, R, K, T) => L1 + L2 + bendAllowance(thetaDeg, R, K, T); // legs to bend tangents
// molding & casting
export const clampForce = (projectedArea_mm2, cavityPressure_MPa) => projectedArea_mm2 * cavityPressure_MPa; // N
export const coolingTimeRatio = (t2, t1) => (t2 / t1) ** 2;               // cooling ∝ wall²
export const patternSize = (part, shrink) => part * (1 + shrink);
// additive
export const printTimeHours = (volume_cm3, rate_cm3_h) => volume_cm3 / rate_cm3_h;
// DFA (Boothroyd-Dewhurst): 3 s ideal time per essential part
export const dfaEfficiency = (Nmin, totalTime_s) => (3 * Nmin) / totalTime_s;
// process capability
export const cp = (USL, LSL, sigma) => (USL - LSL) / (6 * sigma);
export const cpk = (USL, LSL, mean, sigma) => Math.min(USL - mean, mean - LSL) / (3 * sigma);
export const rpn = (S, O, D) => S * O * D;
// normal CDF (Abramowitz-Stegun 7.1.26, |err| < 1.5e-7) for out-of-spec fractions
export function normCdf(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}
export const ppmOutOfSpec = (USL, LSL, mean, sigma) => 1e6 * (normCdf((LSL - mean) / sigma) + 1 - normCdf((USL - mean) / sigma));
// cost
export const unitCost = (fixed, variable, N) => fixed / N + variable;
export const breakEven = (F1, v1, F2, v2) => (F2 - F1) / (v1 - v2);

// ---------- Helpers ----------
export const deg = (rad) => (rad * 180) / PI;
export const rad = (d) => (d * PI) / 180;
