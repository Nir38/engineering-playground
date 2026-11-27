// run-tests.mjs: node tests/run-tests.mjs
// 1. formulas vs independent methods (numerical integration, brute-force rotation)
// 2. every worked example in the lessons recomputed from js/formulas.js
// 3. every generator run many times
// 4. content structure + every LaTeX string parsed by KaTeX
import { createRequire } from 'node:module';
import * as f from '../js/formulas.js';
import { generators, makeQuestion } from '../js/generators.js';
import { registry, draw } from '../js/diagrams.js';
import { domains } from '../data/catalog.js';
import { beamChecks } from './beam-cases.mjs';
import { pulleyChecks } from './pulley-cases.mjs';
import { trussChecks } from './truss-cases.mjs';
import { airfoilChecks } from './airfoil-cases.mjs';
import { lbmChecks } from './lbm-cases.mjs';
import { mohrChecks } from './mohr-cases.mjs';
import { circuitChecks } from './circuit-cases.mjs';
import { stackChecks } from './stack-cases.mjs';
import { columnsChecks } from './columns-cases.mjs';
import { acChecks } from './ac-cases.mjs';
import { homeChecks } from './home-cases.mjs';
import { machinesChecks } from './machines-cases.mjs';
import { fuzzChecks } from './fuzz-cases.mjs';
import { hydroChecks } from './hydro-cases.mjs';
import { vibChecks } from './vib-cases.mjs';
import { fbdChecks } from './fbd-cases.mjs';
import { sceneChecks } from './scene-cases.mjs';
import { hingeSpringChecks } from './beam-hinge-cases.mjs';
import { thermalChecks } from './beam-thermal-cases.mjs';
import { srsChecks } from './srs-cases.mjs';
import { fairnessChecks } from './fairness-cases.mjs';

const require = createRequire(import.meta.url);
const katex = require('../vendor/katex/katex.min.js');

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, info = '') { if (cond) pass++; else { fail++; failures.push(`✘ ${name} ${info}`); } }
const near = (a, b, rel = 1e-3) => Math.abs(a - b) <= rel * Math.max(Math.abs(a), Math.abs(b), 1e-12);
const nearAbs = (a, b, abs) => Math.abs(a - b) <= abs;

// ---------- 1. Beam deflection: closed form vs numerical double integration of EI y'' = M ----------
function integrateDeflection(Mfun, L, EI, kind) {
  const N = 20000, h = L / N;
  // integrate y'' = M/EI with y(0)=0 and y'(0)=s0 ; returns y array
  const run = (s0) => {
    let y = 0, s = s0; const ys = [0];
    for (let i = 0; i < N; i++) {
      const x = i * h;
      const k1 = Mfun(x) / EI, k2 = Mfun(x + h) / EI;
      const sNew = s + 0.5 * (k1 + k2) * h;
      y += 0.5 * (s + sNew) * h; s = sNew; ys.push(y);
    }
    return ys;
  };
  if (kind === 'cant') return run(0);
  // simply supported: choose s0 so that y(L)=0 (linear in s0)
  const a = run(0), b = run(1);
  const s0 = -a[N] / (b[N] - a[N]);
  return a.map((v, i) => v + s0 * (b[i] - a[i]));
}
for (const [kind, loadVal] of [['cant-point', 1500], ['cant-udl', 3], ['ss-center', 2000], ['ss-udl', 2]]) {
  const L = 1200, E = 200000, Iv = 312500, EI = E * Iv;
  const ys = integrateDeflection((x) => f.beamMoment[kind](loadVal, L, x), L, EI, kind.startsWith('cant') ? 'cant' : 'ss');
  const maxDefl = Math.max(...ys.map(Math.abs));
  check(`beam ${kind} deflection vs numeric`, near(maxDefl, f.beam[kind].defl(loadVal, L, E, Iv), 1e-4), `${maxDefl} vs ${f.beam[kind].defl(loadVal, L, E, Iv)}`);
  let mMax = 0; for (let i = 0; i <= 1000; i++) mMax = Math.max(mMax, Math.abs(f.beamMoment[kind](loadVal, L, (L * i) / 1000)));
  check(`beam ${kind} Mmax vs M(x)`, near(mMax, f.beam[kind].Mmax(loadVal, L), 1e-6));
}

// ---------- Mohr vs brute-force rotation ----------
for (let k = 0; k < 500; k++) {
  const sx = Math.random() * 400 - 200, sy = Math.random() * 400 - 200, txy = Math.random() * 200 - 100;
  const m = f.mohr(sx, sy, txy);
  let mx = -Infinity, mn = Infinity, tmax = 0;
  for (let i = 0; i < 3600; i++) {
    const th = (i / 3600) * Math.PI;
    const s = (sx + sy) / 2 + ((sx - sy) / 2) * Math.cos(2 * th) + txy * Math.sin(2 * th);
    const t = -((sx - sy) / 2) * Math.sin(2 * th) + txy * Math.cos(2 * th);
    mx = Math.max(mx, s); mn = Math.min(mn, s); tmax = Math.max(tmax, Math.abs(t));
  }
  if (!(near(m.s1, mx, 1e-4) || nearAbs(m.s1, mx, 1e-3))) { check('mohr s1', false, `${sx},${sy},${txy}`); break; }
  if (!(near(m.s2, mn, 1e-4) || nearAbs(m.s2, mn, 1e-3))) { check('mohr s2', false); break; }
  if (!near(m.R, tmax, 1e-4)) { check('mohr R', false); break; }
  // principal angle actually gives s1
  const th = f.rad(m.thetaP);
  const sp = (sx + sy) / 2 + ((sx - sy) / 2) * Math.cos(2 * th) + txy * Math.sin(2 * th);
  if (!nearAbs(sp, m.s1, 1e-6 * Math.max(1, Math.abs(m.s1)))) { check('mohr thetaP gives s1', false, `${sx},${sy},${txy}`); break; }
  // von Mises forms agree
  if (!near(f.vonMisesXY(sx, sy, txy), f.vonMisesPrincipal2D(m.s1, m.s2), 1e-9)) { check('von Mises xy vs principal', false); break; }
  if (!near(f.vonMises3D(m.s1, m.s2, 0), f.vonMisesPrincipal2D(m.s1, m.s2), 1e-9)) { check('von Mises 3D vs 2D', false); break; }
  if (k === 499) check('mohr + von Mises, 500 random states', true);
}

// ---------- identities ----------
check('J tube(d,0) = J circle', near(f.J.tube(40, 0), f.J.circle(40), 1e-12));
check('I tube(d,0) = I circle', near(f.I.tube(40, 0), f.I.circle(40), 1e-12));
check('J = 2I for circle', near(f.J.circle(37), 2 * f.I.circle(37), 1e-12));
check('16T/πd³ = Tr/J', near(f.solidShaftTauMax(500, 0.03), f.torsionStress(500, 0.015, f.J.circle(0.03)), 1e-12));
check('rect max shear = VQ/Ib at N.A.', near(f.rectMaxShear(1000, 30, 80), f.shearFlowStress(1000, 30 * 40 * 20, f.I.rect(30, 80), 30), 1e-12));
const lc = f.criticalSlenderness(200e3, 250);
check('Johnson = Euler at λc (tangency)', near(f.johnsonStress(250, 200e3, lc), f.eulerStress(200e3, lc), 1e-9));
check('Johnson = Sy/2 at λc', near(f.johnsonStress(250, 200e3, lc), 125, 1e-9));
check('G = E/2(1+ν) steel ≈ 77 GPa', near(f.shearModulus(200e9, 0.3), 76.92e9, 1e-3));
check('pure shear: Tresca 0.5Sy, vM 0.577Sy', near(f.trescaEquivalent(100, -100) / 2, 100, 1e-12) && near(100 / f.vonMisesPrincipal2D(100, -100), 1 / Math.sqrt(3), 1e-12));
check('hydrostatic -> von Mises 0', f.vonMises3D(50, 50, 50) === 0);
check('Goodman: Sut=∞ -> Se/σa', near(f.goodmanFactor(100, 50, 250, 1e12), 2.5, 1e-6));

// ---------- fluids: independent cross-checks ----------
{
  // laminar Darcy with f=64/Re equals Hagen-Poiseuille (two separate derivations)
  const mu = 0.2, rho = 900, D = 0.015, V = 0.4, L = 12, Q = f.area.circle(D) * V;
  check('laminar: Darcy(64/Re) = Hagen-Poiseuille', near(f.darcyPressureDrop(f.frictionLaminar(f.reynolds(rho, V, D, mu)), L, D, V, rho), f.poiseuilleDrop(mu, L, Q, D), 1e-12));
  // Colebrook residual ~ 0 and Haaland within 2.5% over the turbulent range
  let worst = 0, resid = 0;
  for (const Re of [4e3, 1e4, 1e5, 1e6, 1e7, 1e8]) for (const e of [0, 1e-5, 1e-4, 1e-3, 1e-2, 0.05]) {
    const fc = f.frictionColebrook(Re, e);
    resid = Math.max(resid, Math.abs(1 / Math.sqrt(fc) + 2 * Math.log10(e / 3.7 + 2.51 / (Re * Math.sqrt(fc)))));
    worst = Math.max(worst, Math.abs(f.frictionHaaland(Re, e) - fc) / fc);
  }
  check('Colebrook solved (residual < 1e-9)', resid < 1e-9, `resid ${resid}`);
  check('Haaland within 2.5% of Colebrook', worst < 0.025, `worst ${worst}`);
  // smooth pipe vs Blasius at Re = 1e5 (Moody chart reading ≈ 0.018)
  check('smooth f(Re=1e5) ≈ 0.018 and ≈ Blasius', near(f.frictionColebrook(1e5, 0), 0.018, 0.01) && near(f.frictionColebrook(1e5, 0), 0.316 * 1e5 ** -0.25, 0.02));
  // venturi: recover Q from Δp computed independently with continuity + Bernoulli
  const d1 = 0.1, d2 = 0.05, Qv = 0.0123;
  const V1 = Qv / f.area.circle(d1), V2 = Qv / f.area.circle(d2);
  const dp = 1000e3 - f.bernoulliP2(1000e3, V1, 0, V2, 0, 1000);
  check('venturi formula inverts Bernoulli+continuity', near(f.venturiQ(d1, d2, dp, 1000), Qv, 1e-12));
  // pitot = stagnation Bernoulli
  check('pitot = Bernoulli to V=0', near(f.pitotVelocity(f.bernoulliP2(0, 17, 0, 0, 0, 1.2), 1.2), 17, 1e-12));
  // Torricelli = free fall from h, and = Bernoulli from surface to jet
  check('Torricelli = free fall', near(f.torricelli(3.2), 9.81 * Math.sqrt((2 * 3.2) / 9.81), 1e-12));
  // plane wall: integrate ρ g y w dy numerically, force and centre of pressure
  let Fn = 0, Mn = 0; const hw = 2.5, w = 3, N = 20000;
  for (let i = 0; i < N; i++) { const y = (i + 0.5) * (hw / N); const dF = 1000 * 9.81 * y * w * (hw / N); Fn += dF; Mn += dF * y; }
  check('wall force = integral of ρgy', near(f.planeWallForce(1000, hw / 2, hw * w), Fn, 1e-6));
  check('centre of pressure = moment integral', near(f.centerOfPressure(hw / 2, (w * hw ** 3) / 12, hw * w), Mn / Fn, 1e-6));
  // affinity laws consistent with P = ρgQH/η at constant η
  const a = f.affinity(0.02, 30, f.pumpShaftPower(1000, 0.02, 30, 0.7), 1450, 2900);
  check('affinity P = ρgQH/η at new point', near(a.P, f.pumpShaftPower(1000, a.Q, a.H, 0.7), 1e-12));
  // drag power ∝ V³
  check('drag power ∝ V³', near(f.dragPower(1.2, 40, 0.3, 2) / f.dragPower(1.2, 20, 0.3, 2), 8, 1e-12));
  check('ν water ≈ 1.0e-6', near(f.kinematicViscosity(f.WATER.mu, f.WATER.rho), 1.004e-6, 1e-3));
}

// ---------- 2. Worked examples in the lessons ----------
const ex = [
  ['stress-strain example σ', f.normalStress(31400, f.area.circle(20)), 100, 2e-3],
  ['curve example Ur [J/m³]', f.resilienceModulus(250e6, 200e9), 156250, 1e-9],
  ['axial example ΔL [mm]', f.elongation(20000, 1000, f.area.circle(20), 200000), 0.318, 2e-3],
  ['torsion example ω', (2 * Math.PI * 1450) / 60, 151.8, 1e-3],
  ['torsion example T', f.torqueFromPower(10000, 1450), 65.9, 1e-3],
  ['torsion example τ', f.solidShaftTauMax(f.torqueFromPower(10000, 1450) * 1000, 25), 21.5, 2e-3],
  ['bending example I', f.I.rect(40, 100), 3.333e6, 1e-3],
  ['bending example σ', f.bendingStress(5e6, 50, f.I.rect(40, 100)), 75, 1e-9],
  ['shear example τ', f.rectMaxShear(20000, 40, 100), 7.5, 1e-9],
  ['deflection example I', f.I.rect(30, 50), 312500, 1e-9],
  ['deflection example δ', f.beam['cant-point'].defl(1000, 1000, 200000, 312500), 5.33, 1e-3],
  ['mohr example C', f.mohr(80, 20, 30).C, 50, 1e-9],
  ['mohr example R', f.mohr(80, 20, 30).R, 42.4, 1e-3],
  ['mohr example σ1', f.mohr(80, 20, 30).s1, 92.4, 1e-3],
  ['mohr example σ2', f.mohr(80, 20, 30).s2, 7.6, 1e-2],
  ['mohr example 2θp', 2 * f.mohr(80, 20, 30).thetaP, 45, 1e-9],
  ['failure example vM', f.vonMisesXY(100, 0, 40), 121.7, 1e-3],
  ['failure example n vM', 350 / f.vonMisesXY(100, 0, 40), 2.88, 2e-3],
  ['failure example Tresca', f.trescaEquivalent(f.mohr(100, 0, 40).s1, f.mohr(100, 0, 40).s2), 128.1, 1e-3],
  ['failure example n Tresca', 350 / f.trescaEquivalent(f.mohr(100, 0, 40).s1, f.mohr(100, 0, 40).s2), 2.73, 2e-3],
  ['buckling example I', f.I.circle(30), 39761, 1e-4],
  ['buckling example Pcr [kN]', f.eulerLoad(200000, f.I.circle(30), 1, 2000) / 1000, 19.6, 2e-3],
  ['buckling example λ', 2000 / (30 / 4), 267, 2e-3],
  ['buckling λc (source: 126)', f.criticalSlenderness(200e3, 250), 126, 3e-3],
  ['kt example σnom', 20000 / 450, 44.4, 1e-3],
  ['kt example σmax', f.peakStress(2.4, 20000 / 450), 106.7, 1e-3],
  ['fatigue example Goodman n (source)', f.goodmanFactor(100, 150, 250, 500), 1.43, 2e-3],
  ['fatigue example Langer n (source: 1.40)', f.langerFactor(100, 150, 350), 1.40, 1e-9],
  ['safety example σ (bolt tensile area A_t)', 20000 / f.BOLT_AT.M16, 127.4, 1e-3],
  ['safety example n', 640 / (20000 / f.BOLT_AT.M16), 5.0, 1e-2],
  // fluids lessons
  ['f-props example τ', f.newtonShear(0.1, 2 / 0.001), 200, 1e-12],
  ['f-statics example F [kN]', f.planeWallForce(1000, 1, 6) / 1000, 58.9, 1e-3],
  ['f-statics example y_p', f.centerOfPressure(1, (3 * 2 ** 3) / 12, 6), 1.33, 3e-3],
  ['f-statics 10 m ≈ 98 kPa', f.hydrostaticPressure(1000, 10) / 1000, 98.1, 1e-3],
  ['f-statics diver 30 m ≈ 4 bar abs', (f.PATM + f.hydrostaticPressure(1025, 30)) / 1e5, 4, 0.04],
  ['f-buoy example', f.submergedFraction(600, 1000), 0.6, 1e-12],
  ['f-buoy ice ≈ 90%', f.submergedFraction(917, 1000), 0.9, 0.02],
  ['f-continuity example Q [L/s]', f.flowRate(f.area.circle(0.05), 2) * 1000, 3.93, 2e-3],
  ['f-continuity example V2', 2 * (50 / 25) ** 2, 8, 1e-12],
  ['f-bernoulli example P2 [kPa]', f.bernoulliP2(200e3, 2, 0, 8, 0, 1000) / 1000, 170, 1e-12],
  ['f-reynolds example Re', f.reynolds(998, 2, 0.05, 1.002e-3), 99600, 1e-4],
  ['f-pipe example f', f.frictionColebrook(f.reynolds(998, 2, 0.05, 1.002e-3), 0.045 / 50), 0.0218, 3e-3],
  ['f-pipe example h_f', f.darcyHeadLoss(f.frictionColebrook(f.reynolds(998, 2, 0.05, 1.002e-3), 0.045 / 50), 100, 0.05, 2), 8.9, 3e-3],
  ['f-pipe example ΔP [kPa]', f.darcyPressureDrop(f.frictionColebrook(f.reynolds(998, 2, 0.05, 1.002e-3), 0.045 / 50), 100, 0.05, 2, 998) / 1000, 87, 3e-3],
  ['f-pumps example P [kW]', f.pumpShaftPower(1000, 0.02, 30, 0.75) / 1000, 7.85, 1e-3],
  ['f-pumps VFD -20% saves ~50%', 1 - f.affinity(1, 1, 1, 1, 0.8).P, 0.49, 0.01],
  ['f-drag example V', f.kmh(100), 27.8, 2e-3],
  ['f-drag example F [N]', f.dragForce(1.204, f.kmh(100), 0.3, 2.2), 307, 2e-3],
  ['f-drag example P [kW]', f.dragPower(1.204, f.kmh(100), 0.3, 2.2) / 1000, 8.5, 2e-2],
  ['f-drag example 120 km/h [kW]', f.dragPower(1.204, f.kmh(120), 0.3, 2.2) / 1000, 14.7, 2e-3],
  ['f-drag +73% from 100 to 120', f.dragPower(1, f.kmh(120), 1, 1) / f.dragPower(1, f.kmh(100), 1, 1) - 1, 0.73, 1e-2],
  ['f-momentum example ṁ', 1000 * f.area.circle(0.02) * 20, 6.28, 1e-3],
  ['f-momentum example F', f.jetForceFlatPlate(1000, f.area.circle(0.02), 20), 126, 3e-3],
  // pulleys lesson
  ['pulleys example F', f.tackleForce(200 * 9.81, 4), 490.5, 1e-9],
  ['pulleys example rope travel', f.tackleRopeTravel(1, 4), 4, 1e-12],
  ['pulleys example two cables 30°', f.twoCableTension(1000, 30), 1000, 1e-9],
  ['pulleys visual: 15° ≈ 2W', f.twoCableTension(1, 15), 1.93, 3e-3],
  ['pulleys visual: 5° ≈ 6W', f.twoCableTension(1, 5), 5.74, 2e-3],
  ['pulleys visual: capstan 2 turns μ=0.3 ≈ 43', Math.exp(0.3 * 4 * Math.PI), 43.4, 2e-3],
  ['pulleys pl6: one turn μ=0.3 ≈ 6.6', Math.exp(0.3 * 2 * Math.PI), 6.6, 1e-2],
  ['pulleys pl5: axle 180° = 2T', f.pulleyAxleLoad(1, 180), 2, 1e-12],
  ['pulleys pl5: axle 90° = √2 T', f.pulleyAxleLoad(1, 90), Math.SQRT2, 1e-12],
  ['pulleys pl4: sin60/sin10 ≈ 5', f.twoCableTension(1, 10) / f.twoCableTension(1, 60), 5, 0.01],
  // numbers shown in lesson illustrations
  ['visual: deflection cantilever/ss = 16', f.beam['cant-point'].defl(1, 1, 1, 1) / f.beam['ss-center'].defl(1, 1, 1, 1), 16, 1e-12],
  ['visual: buckling fixed-pinned 1/K² = 2.04', 1 / 0.7 ** 2, 2.04, 1e-3],
  ['visual: buckling fixed-free 1/K² = 0.25', 1 / 2 ** 2, 0.25, 1e-12],
  ['visual: pump 80% speed → 51.2% power', f.affinity(1, 1, 100, 1, 0.8).P, 51.2, 1e-9],
  ['visual: pump 60% speed → 21.6% power', f.affinity(1, 1, 100, 1, 0.6).P, 21.6, 1e-9],
  ['visual: drag 80 km/h [kW]', f.dragPower(1.204, f.kmh(80), 0.3, 2.2) / 1000, 4.4, 1e-2],
  ['visual: drag 140 km/h [kW]', f.dragPower(1.204, f.kmh(140), 0.3, 2.2) / 1000, 23.4, 2e-3],
  ['visual: 100 → 140 km/h ≈ ×3', (140 / 100) ** 3, 2.74, 2e-3],
  // materials lessons
  ['m-structure example Wp', f.pearliteFraction(0.4), 0.51, 1e-2],
  ['m-structure example Wα', f.proeutectoidFerrite(0.4), 0.49, 1e-2],
  ['m-structure: 0.76% C is all pearlite', f.pearliteFraction(0.76), 1, 1e-12],
  ['m-structure: hyper side meets at 0.76', f.pearliteFractionHyper(0.76), 1, 1e-12],
  ['m-hardness example HB (standard table: d=4.00 → 229)', f.brinell(3000, 10, 4), 229, 2e-3],
  ['m-hardness Brinell table d=3.00 → 415', f.brinell(3000, 10, 3), 415, 3e-3],
  ['m-hardness Brinell table d=5.00 → 143', f.brinell(3000, 10, 5), 143, 5e-3], // tables round to the nearest integer
  ['m-hardness example TS', f.utsFromHB(f.brinell(3000, 10, 4)), 790, 2e-3],
  ['m-hardness Vickers constant 1.854', f.vickers(1, 1), 1.8544, 1e-4],
  ['m-stainless PREN 304', f.pren({ Cr: 18 }), 18, 1e-12],
  ['m-stainless PREN 316', f.pren({ Cr: 17, Mo: 2.5 }), 25.3, 2e-3],
  ['m-aluminum 6061 Sy/ρ', 275 / 2.70, 102, 2e-3],
  ['m-aluminum 7075 Sy/ρ', 503 / 2.81, 179, 2e-3],
  ['m-selection E/ρ steel', f.specificStiffness(200, 7.85), 25.5, 2e-3],
  ['m-selection E/ρ Al', f.specificStiffness(69, 2.70), 25.6, 2e-3],
  ['m-selection E/ρ Ti', f.specificStiffness(114, 4.43), 25.7, 2e-3],
  ['m-selection beam mass Al/steel', f.massRatio(f.ashbyIndex.beam(69, 2.70), f.ashbyIndex.beam(200, 7.85)), 0.59, 1e-2],
  ['m-selection tie mass Al/steel', f.massRatio(f.ashbyIndex.tie(69, 2.70), f.ashbyIndex.tie(200, 7.85)), 1.0, 1e-2],
  ['m-welding example CE', f.carbonEquivalent({ C: 0.45, Mn: 0.75 }), 0.575, 1e-9],
  ['m-welding example mismatch', f.thermalMismatch(23e-6, 12e-6, 50, 1000), 0.55, 1e-9],
  ['m-welding SS expands ~40% more than steel', 17 / 12 - 1, 0.4, 0.06],
  ['m-coatings example shaft', f.anodizedShaftDiameter(20, 0.05), 20.05, 1e-12],
  ['m-coatings hole 10 mm, 50 µm', f.anodizedHoleDiameter(10, 0.05), 9.95, 1e-12],
];

// ---------- pulleys: independent cross-checks ----------
{
  // Atwood from Newton's 2nd law on each mass, solved as a linear system
  const m1 = 6.3, m2 = 2.1, g = 9.81;
  // m1 g - T = m1 a ; T - m2 g = m2 a  ->  a = (m1-m2)g/(m1+m2)
  const a = f.atwoodAccel(m1, m2), T = f.atwoodTension(m1, m2);
  check('Atwood satisfies both equations', near(m1 * g - T, m1 * a, 1e-12) && near(T - m2 * g, m2 * a, 1e-12));
  // two cables: vector equilibrium
  const W = 750, th = 22, Tc = f.twoCableTension(W, th);
  check('two cables: ΣFy = 0', near(2 * Tc * Math.sin(f.rad(th)), W, 1e-12));
  // capstan: integrate dT/dθ = μT numerically
  let Tn = 100; const mu = 0.27, total = 3 * Math.PI, N = 200000;
  for (let i = 0; i < N; i++) Tn += mu * Tn * (total / N);
  check('capstan = integral of dT = μT dθ', near(Tn, f.capstan(100, mu, total), 1e-4));
  // pulley axle load = vector sum of two equal tensions
  const beta = 120, T0 = 500;
  const vx = T0 + T0 * Math.cos(Math.PI - f.rad(beta)), vy = T0 * Math.sin(Math.PI - f.rad(beta));
  check('axle load = |T1 + T2|', near(Math.hypot(vx, vy), f.pulleyAxleLoad(T0, beta), 1e-9));
  // incline: equations of motion
  const ma = 10, al = 30, mb = 8, ai = f.inclineAccel(ma, al, mb), Ti = mb * (g - ai);
  check('incline: block equation', near(Ti - ma * g * Math.sin(f.rad(al)), ma * ai, 1e-9));
}

// ---------- text: every $math$ ends up inside an LTR-isolated span ----------
{
  const { rich } = await import('../js/text.js');
  const all = [];
  for (const d of domains.filter((x) => x.module)) for (const s of d.module.subtopics) {
    all.push(s.lesson.intuition, ...s.lesson.implications, ...(s.lesson.visuals || []).map((v) => v.caption));
    for (const q of s.questions) all.push(q.q, q.explain || '', q.model || '', ...(q.options || []));
  }
  for (const id of Object.keys(generators)) for (let i = 0; i < 20; i++) { const q = makeQuestion(id); all.push(q.q, q.hint || ''); }
  let bad = '';
  for (const t of all) {
    const h = rich(t).replace(/<span class="ltr">[^<]*<\/span>/g, '');
    if (h.includes('$')) { bad = t; break; }
  }
  check('rich(): every math segment is LTR-isolated', !bad, bad.slice(0, 80));
  check('rich(): "$E=200$ GPa" keeps the unit with the number', rich('($E=200$ GPa)').includes('<span class="ltr">$E=200$ GPa</span>'));
  check('rich(): "650-1100 MPa" isolated as one run', rich('של 650-1100 MPa אחרי').includes('<span class="ltr">650-1100 MPa</span>'));
  check('rich(): "400/230 V" stays one run', rich('מוריד ל-400/230 V לבניינים').includes('<span class="ltr">400/230 V</span>'));
  check('rich(): "12.6/22/33 kV" stays one run', rich('מתחים 12.6/22/33 kV').includes('<span class="ltr">12.6/22/33 kV</span>'));
  check('rich(): Hebrew after math is not swallowed', rich('$x$ ואחר כך').includes('<span class="ltr">$x$</span> ואחר'));
}

// ---------- thermo: worked examples and independent cross-checks ----------
{
  const ex2 = [
    ['t-laws example Q [kJ]', f.sensibleHeat(1.5, 4180, 80) / 1000, 502, 2e-3],
    ['t-laws example t [s]', f.sensibleHeat(1.5, 4180, 80) / 2000, 251, 2e-3],
    ['t-laws c water/steel ≈ 10', 4.18 / 0.43, 9.7, 1e-2],
    ['t-gas example T2 [K]', f.isentropicT2fromV(300, 10), 754, 2e-3],
    ['t-gas example P2 [kPa]', f.isentropicP2fromV(100, 10), 2512, 2e-3],
    ['t-gas tire 220 gauge = 321 abs', 220 + 101.3, 321, 2e-3],
    ['t-second example η', f.carnotEff(800, 300), 0.625, 1e-12],
    ['t-second example COP', f.copRefrigCarnot(f.K(5), f.K(35)), 9.3, 5e-3], // lesson rounds 9.27 to 9.3
    ['t-engines Otto r=10', f.ottoEff(10), 0.602, 2e-3],
    ['t-engines Diesel r=18 rc=2', f.dieselEff(18, 2), 0.632, 2e-3],
    ['t-engines power [kW]', f.shaftPower(300, 3000) / 1000, 94.2, 1e-3],
    ['t-brayton rp=10', f.braytonEff(10), 0.482, 2e-3],
    ['t-conduction R brick', f.Rwall(0.2, 0.72, 10), 0.028, 1e-2],
    ['t-conduction R insulation', f.Rwall(0.05, 0.04, 10), 0.125, 1e-12],
    ['t-conduction brick only [W]', 20 / f.Rwall(0.2, 0.72, 10), 720, 1e-9],
    ['t-conduction with insulation [W]', 20 / (f.Rwall(0.2, 0.72, 10) + f.Rwall(0.05, 0.04, 10)), 131, 2e-3],
    ['t-conduction saving 82%', 1 - (20 / (f.Rwall(0.2, 0.72, 10) + f.Rwall(0.05, 0.04, 10))) / 720, 0.82, 1e-2],
    ['t-conduction Cu/SS ≈ 27', 401 / 14.9, 27, 1e-2],
    ['t-convection τ [s]', f.timeConstant(8000, 450, Math.PI / 6 * 0.01 ** 3, 50, Math.PI * 0.01 ** 2), 120, 1e-9],
    ['t-convection T(60) [°C]', f.lumpedT(25, 300, 60, 120), 192, 3e-3],
    ['t-convection e^-1 = 37%', Math.exp(-1), 0.37, 1e-2],
    ['t-convection 3τ ≈ 5%', Math.exp(-3), 0.05, 1e-2],
    ['t-radiation example [W]', f.radiationNet(0.9, 1, 400, 300), 893, 1e-3],
    ['t-radiation bar 100°C [kW/m²]', f.SIGMA_SB * f.K(100) ** 4 / 1000, 1.1, 1e-2],
    ['t-radiation bar 300°C [kW/m²]', f.SIGMA_SB * f.K(300) ** 4 / 1000, 6.1, 1e-2],
    ['t-radiation bar 600°C [kW/m²]', f.SIGMA_SB * f.K(600) ** 4 / 1000, 33.0, 2e-3],
    ['t-radiation 600 vs 100 ≈ ×30', (f.K(600) / f.K(100)) ** 4, 30, 1e-2],
    ['t-hx counter LMTD', f.lmtd(50, 40), 44.8, 2e-3],
    ['t-hx parallel LMTD', f.lmtd(80, 10), 33.7, 2e-3],
    ['t-hx parallel needs 33% more area', f.lmtd(50, 40) / f.lmtd(80, 10) - 1, 0.33, 1e-2],
    ['t-electronics R_tot max', (125 - 40) / 20, 4.25, 1e-12],
    ['t-electronics R_sa', f.requiredRsa(125, 40, 20, 0.8, 0.3), 3.15, 1e-9],
    ['t-electronics visual Tj', f.junctionTemp(25, 10, [0.5, 0.2, 3]), 62, 1e-12],
  ];
  ex2.forEach(([n, got, want, tol]) => check(n, near(got, want, tol), `got ${got}, lesson says ${want}`));
  // cycle efficiencies re-derived from the four state temperatures
  const k = 1.4, T1 = 300;
  { const r = 9, T2 = T1 * r ** (k - 1), T3 = 1900, T4 = T3 / r ** (k - 1);
    check('Otto formula = 1 - (T4-T1)/(T3-T2)', near(f.ottoEff(r), 1 - (T4 - T1) / (T3 - T2), 1e-12)); }
  { const r = 17, rc = 2.2, T2 = T1 * r ** (k - 1), T3 = T2 * rc, T4 = T3 * (rc / r) ** (k - 1);
    check('Diesel formula = 1 - (T4-T1)/(k(T3-T2))', near(f.dieselEff(r, rc), 1 - (T4 - T1) / (k * (T3 - T2)), 1e-12)); }
  { const rp = 12, T2 = T1 * rp ** ((k - 1) / k), T3 = 1400, T4 = T3 / rp ** ((k - 1) / k);
    check('Brayton formula = 1 - (T4-T1)/(T3-T2)', near(f.braytonEff(rp), 1 - (T4 - T1) / (T3 - T2), 1e-12)); }
  check('Diesel → Otto as rc → 1', near(f.dieselEff(10, 1.000001), f.ottoEff(10), 1e-5));
  check('COP_HP = COP_R + 1', near(f.copHeatPumpCarnot(270, 310), f.copRefrigCarnot(270, 310) + 1, 1e-12));
  check('Carnot: Otto never beats it', f.ottoEff(12) < f.carnotEff(2000, 300));
  // isothermal work = ∫P dV numerically
  let Wn = 0; const P1 = 200, V1 = 0.1, V2 = 0.35, N = 100000;
  for (let i = 0; i < N; i++) { const V = V1 + (V2 - V1) * (i + 0.5) / N; Wn += (P1 * V1 / V) * (V2 - V1) / N; }
  check('isothermal work = ∫P dV', near(Wn, f.isothermalWork(P1, V1, V2), 1e-8));
  // lumped cooling = Euler integration of dT/dt = -(T - T∞)/τ
  let T = 300; const tau = 120, dt = 0.001;
  for (let tt = 0; tt < 60; tt += dt) T += -(T - 25) / tau * dt;
  check('lumped solution = ODE integration', near(T, f.lumpedT(25, 300, 60, tau), 1e-4));
  // counter-flow LMTD: integrate dQ = U dA ΔT for balanced streams (ΔT const) and an unbalanced case
  check('LMTD of equal end differences = that difference', near(f.lmtd(30, 30), 30, 1e-12));
  { // hot stream cools 100→60, cold heats 20→50 in counter-flow; march along the exchanger
    const C_h = 1, C_c = 40 / 30, UAtot = 1; // Q = 40 (units), C_c chosen so cold rises 30
    let Th = 100, Tc = 50, Q = 0, A = 0; const dA = 1e-5; // start at hot inlet / cold outlet
    while (Th > 60) { const dq = UAtot * (Th - Tc) * dA; Th -= dq / C_h; Tc -= dq / C_c; Q += dq; A += dA; }
    check('counter-flow area from marching = Q / (U ΔTlm)', near(A, Q / f.lmtd(50, 40), 2e-3));
  }
  check('Rcyl ≈ Rwall for a thin shell', near(f.Rcyl(1, 1.001, 50, 2), f.Rwall(0.001, 50, 2 * Math.PI * 1.0005 * 2), 1e-6));
}

// ---------- electricity: worked examples and independent cross-checks ----------
{
  const ex3 = [
    ['e-basics I', 2000 / 230, 8.7, 3e-3], ['e-basics R', 230 ** 2 / 2000, 26.5, 2e-3],
    ['e-basics R cable', f.wireR(f.RHO_CU, 40, 2.5e-6), 0.27, 1e-2], ['e-basics ΔV', 16 * f.wireR(f.RHO_CU, 40, 2.5e-6), 4.3, 1e-2],
    ['e-circuits series', f.seriesR(100, 100), 200, 1e-12], ['e-circuits parallel', f.parallelR(100, 100), 50, 1e-12],
    ['e-circuits ec2 parallel 100‖1', f.parallelR(100, 1), 0.99, 1e-2], ['e-circuits divider', f.divider(12, 10, 4.7), 3.84, 2e-3],
    ['e-ac peak', f.vPeak(230), 325, 2e-3], ['e-ac line voltage', f.lineFromPhase(230), 400, 5e-3], ['e-ac motor I', f.threePhaseCurrent(11000, 400, 0.85), 18.7, 2e-3],
    ['e-magnet ratio', 22000 / 400, 55, 1e-12], ['e-magnet I1', f.transformerI2(550, 400, 22000), 10, 1e-12],
    ['e-dcmotor start', f.dcStartCurrent(24, 0.2), 120, 1e-12], ['e-dcmotor running', f.dcCurrent(24, 0.1, 200, 0.2), 20, 1e-9],
    ['e-acmotor Ns', f.syncSpeed(50, 4), 1500, 1e-12], ['e-acmotor slip', f.slip(1500, 1450), 0.033, 1.1e-2], ['e-acmotor 2-pole', f.syncSpeed(50, 2), 3000, 1e-12],
    ['e-drives resolution [μm]', f.leadScrewResolution(5, 200, 16) * 1000, 1.6, 2.5e-2], ['e-drives step angle', f.stepAngle(200), 1.8, 1e-12],
    ['e-drives gear torque', f.gearOutTorque(2, 10, 0.9), 18, 1e-12],
    ['e-home 1×40 (tariff 9.24)', f.connectionKVA(40, 1), 9.24, 1e-3], ['e-home 3×25 (tariff 17.32)', f.connectionKVA(25, 3), 17.32, 1e-3],
    ['e-home 3×40', f.connectionKVA(40, 3), 27.7, 2e-3], ['e-home 0.23 kVA per A', f.connectionKVA(1, 1), 0.23, 5e-3], ['e-home 16 A circuit', 230 * 16, 3680, 1e-12],
    ['e-grid I at 22 kV', f.threePhaseCurrent(1e6, 22000), 26, 1e-2], ['e-grid loss 22 kV [kW]', f.lineLoss3ph(1e6, 22000, 1) / 1000, 2.1, 2e-2],
    ['e-grid I at 400 V', f.threePhaseCurrent(1e6, 400), 1443, 1e-3], ['e-grid loss 400 V [MW]', f.lineLoss3ph(1e6, 400, 1) / 1e6, 6.25, 1e-9],
    ['e-grid loss ratio', f.lineLoss3ph(1e6, 400, 1) / f.lineLoss3ph(1e6, 22000, 1), 3025, 1e-9], ['e-grid sag', f.cableSag(15, 300, 20000), 8.4, 1e-2],
  ];
  ex3.forEach(([n, got, want, tol]) => check(n, near(got, want, tol), `got ${got}, lesson says ${want}`));
  // star-delta: line current in star is 1/3 of delta for the same windings (impedance Z)
  const VL = 400, Z = 10, Istar = (VL / Math.sqrt(3)) / Z, Idelta = Math.sqrt(3) * (VL / Z);
  check('star-delta: starting current ÷3', near(Istar / Idelta, 1 / 3, 1e-12));
  // balanced three-phase: instantaneous sum is zero; total power = 3·Vph·I = √3·VL·I
  let maxSum = 0; for (let k = 0; k < 100; k++) { const w = k * 0.0637; maxSum = Math.max(maxSum, Math.abs(Math.sin(w) + Math.sin(w - 2 * Math.PI / 3) + Math.sin(w + 2 * Math.PI / 3))); }
  check('three phases sum to zero', maxSum < 1e-12);
  check('3·Vph·I = √3·VL·I', near(3 * 230.94 * 10, f.threePhasePower(400, 10), 1e-4));
  // DC motor power balance: V·I = E·I + I²R
  { const V = 48, k = 0.2, w = 150, Ra = 0.3, I = f.dcCurrent(V, k, w, Ra);
    check('DC motor: V·I = E·I + I²R', near(V * I, k * w * I + I * I * Ra, 1e-12));
    check('DC motor: mechanical power = T·ω = E·I', near(f.dcTorque(k, I) * w, k * w * I, 1e-12)); }
  // ideal transformer conserves power
  check('transformer: V1·I1 = V2·I2', near(22000 * f.transformerI2(550, 400, 22000), 400 * 550, 1e-12));
  // parallel is always below the smallest resistor
  check('parallel < smallest resistor', [[3, 7], [1, 1000], [50, 50]].every(([a, b]) => f.parallelR(a, b) < Math.min(a, b)));
  // RMS of a sine = peak/√2 by numerical integration
  let ms = 0; const N = 100000; for (let i = 0; i < N; i++) ms += (325.27 * Math.sin((2 * Math.PI * (i + 0.5)) / N)) ** 2 / N;
  check('RMS of 325 V peak sine = 230 V', near(Math.sqrt(ms), 230, 1e-3));
  // parabolic sag vs exact catenary
  { const w = 15, L = 300, H = 20000, exact = (H / w) * (Math.cosh((w * L) / (2 * H)) - 1);
    check('parabolic sag within 0.5% of catenary', near(f.cableSag(w, L, H), exact, 5e-3)); }
}

// ---------- machine design: worked examples and independent cross-checks ----------
{
  const ex4 = [
    ['d-shafts σ\'', f.shaftVonMises(200e3, 300e3, 30), 123.7, 1e-3], ['d-shafts d', f.shaftDiameterStatic(200e3, 300e3, 400, 2), 25.6, 2e-3],
    ['d-shafts load ×2 → d ×1.26', Math.cbrt(2), 1.26, 1e-3], ['d-shafts critical 0.1 mm ≈ 3000 rpm', f.criticalSpeedRpm(1e-4), 3000, 5e-3],
    ['d-bearings L10 rev', f.bearingL10Rev(20, 4), 125e6, 1e-12], ['d-bearings hours', f.bearingL10Hours(20, 4, 1500), 1389, 1e-3],
    ['d-bearings C req', f.bearingRequiredC(3, 20000, 1000), 31.9, 2e-3],
    ['d-bolts Fi [kN]', f.boltPreload(84.3, 600) / 1000, 37.9, 2e-3], ['d-bolts T [N·m]', f.boltTorque(0.2, f.boltPreload(84.3, 600), 12) / 1000, 91, 2e-3],
    ['d-bolts Fb [kN]', f.boltLoad(0.2, 10, 37.9), 39.9, 1e-3], ['d-bolts 8.8', f.boltClass('8.8').Sy, 640, 1e-12], ['d-bolts 12.9', f.boltClass('12.9').Sy, 1080, 1e-12],
    ['d-gears a', f.gearCenterDistance(2, 20, 60), 80, 1e-12], ['d-gears Wt', f.gearTangentialForce(50e3, 40), 2500, 1e-12], ['d-gears σ', f.lewisStress(2500, 20, 2, 0.322), 194, 2e-3],
    ['d-springs k', f.springRate(79300, 3, 24, 10), 5.81, 1e-3], ['d-springs Ks', f.springKs(8), 1.0625, 1e-12], ['d-springs τ', f.springShear(100, 24, 3), 240, 3e-3],
    ['d-keys F', f.keyForce(200e3, 40), 10000, 1e-12], ['d-keys τ', f.keyShear(200e3, 40, 12, 40), 20.8, 2e-3], ['d-keys σb', f.keyBearing(200e3, 40, 12, 40), 41.7, 2e-3],
    ['d-keys press p', f.pressFitPressure(207000, 0.02, 20, 40), 77.6, 1e-3],
    ['d-welds throat', 0.707 * 6, 4.24, 1e-3], ['d-welds τ', f.filletShear(10000, 6, 100), 23.6, 2e-3],
    ['d-belts V', f.beltSpeed(100, 1450), 7.59, 1e-3], ['d-belts P [kW]', f.beltPower(800, 200, f.beltSpeed(100, 1450)) / 1000, 4.56, 2e-3],
  ];
  ex4.forEach(([n, got, want, tol]) => check(n, near(got, want, tol), `got ${got}, lesson says ${want}`));
  // shaft von Mises = general plane-stress von Mises with σ = 32M/πd³, τ = 16T/πd³
  { const M = 180e3, T = 260e3, d = 28; const s = (32 * M) / (Math.PI * d ** 3), tau = (16 * T) / (Math.PI * d ** 3);
    check('shaft σ\' = √(σ² + 3τ²)', near(f.shaftVonMises(M, T, d), f.vonMisesXY(s, 0, tau), 1e-12));
    const dd = f.shaftDiameterStatic(M, T, 380, 2.2);
    check('shaft diameter gives exactly n', near(380 / f.shaftVonMises(M, T, dd), 2.2, 1e-12)); }
  // bearing: required C gives back the target life
  check('bearing C → life round trip', near(f.bearingL10Hours(f.bearingRequiredC(2.5, 30000, 900), 2.5, 900), 30000, 1e-9));
  // spring rate re-derived as a torsion bar: wire length πD·N, T = F·D/2, y = φ·D/2
  { const G = 79300, d = 2.6, D = 21, N = 9, F = 1; const Lw = Math.PI * D * N, Jw = f.J.circle(d);
    const phi = ((F * D) / 2) * Lw / (G * Jw), y = (phi * D) / 2;
    check('spring rate = torsion-bar derivation', near(F / y, f.springRate(G, d, D, N), 1e-12)); }
  // press fit: Lamé displacements of hub and solid shaft add up to the interference
  { const E = 207000, nu = 0.3, R = 20, ro = 40, delta = 0.02, p = f.pressFitPressure(E, delta, R, ro);
    const uHub = (p * R) / E * ((ro * ro + R * R) / (ro * ro - R * R) + nu), uShaft = -(p * R) / E * (1 - nu);
    check('press fit pressure = Lamé solution', near(uHub - uShaft, delta, 1e-12)); }
  // bolted joint: at the separation load the member force is zero
  check('joint: member force zero at P0', Math.abs(f.memberLoad(0.22, f.separationLoad(0.22, 30), 30)) < 1e-12);
  // belt power = torque × ω
  { const d = 125, n = 1450, F1 = 700, F2 = 150, T = ((F1 - F2) * d) / 2000, w = (2 * Math.PI * n) / 60;
    check('belt power = T·ω', near(f.beltPower(F1, F2, f.beltSpeed(d, n)), T * w, 1e-12)); }
  // Lewis Y grows with tooth count (sanity on the table)
  const ys = Object.keys(f.LEWIS_Y).map(Number).sort((a, b) => a - b).map((k) => f.LEWIS_Y[k]);
  check('Lewis Y increases with N', ys.every((y, i) => i === 0 || y > ys[i - 1]));
}

// ---------- tolerances & GD&T ----------
{
  // ISO 286 table vs the standard's own formulas (rounded per the standard: allow ±1 µm, IT ±1.2)
  const ranges = { '6-10': [6, 10], '10-18': [10, 18], '18-30': [18, 30], '30-50': [30, 50] };
  for (const [rk, [a, b]] of Object.entries(ranges)) {
    const D = Math.sqrt(a * b), i = f.toleranceUnit(D), row = f.ISO286[rk];
    for (const g of [6, 7, 8]) check(`ISO 286 IT${g} ${rk} vs 0.45∛D formula`, Math.abs(row[`IT${g}`] - f.IT_FACTOR[g] * i) <= 1.2, `${row[`IT${g}`]} vs ${(f.IT_FACTOR[g] * i).toFixed(1)}`);
    check(`ISO 286 g ${rk} vs −2.5·D^0.34`, Math.abs(row.g + 2.5 * D ** 0.34) <= 1);
    check(`ISO 286 f ${rk} vs −5.5·D^0.41`, Math.abs(row.f + 5.5 * D ** 0.41) <= 1);
    check(`ISO 286 n ${rk} vs 5·D^0.34`, Math.abs(row.n - 5 * D ** 0.34) <= 1);
    check(`ISO 286 k ${rk} vs 0.6·∛D`, Math.abs(row.k - 0.6 * Math.cbrt(D)) <= 1);
    check(`ISO 286 p ${rk} = IT7 + 0…5`, row.p - row.IT7 >= 0 && row.p - row.IT7 <= 5);
    check(`ISO 286 s ${rk} = IT8 + 1…4`, row.s - row.IT8 >= 1 && row.s - row.IT8 <= 4);
  }
  const ex5 = [
    ['tol-fits H7/g6 Ø25 max', f.fit(25, 7, 'g', 6).maxClearance, 41, 1e-12], ['tol-fits H7/g6 Ø25 min', f.fit(25, 7, 'g', 6).minClearance, 7, 1e-12],
    ['tol-basics 2768-m 50 mm', f.iso2768('m', 50), 0.3, 1e-12], ['tol-basics 2768-m 20 mm', f.iso2768('m', 20), 0.2, 1e-12],
    ['tol-stack WC', f.stackWorst([0.1, 0.05, 0.1]), 0.25, 1e-12], ['tol-stack RSS', f.stackRSS([0.1, 0.05, 0.1]), 0.15, 1e-12],
    ['tol-stack xs2', f.stackWorst([0.1, 0.05, 0.05]), 0.2, 1e-12],
    ['tol-position example', f.positionDia(0.03, 0.04), 0.1, 1e-9], ['tol-position circle around ±0.05 square', f.positionDia(0.05, 0.05), 0.141, 3e-3],
    ['tol-position area ratio π/2 ≈ 1.57', Math.PI * (Math.SQRT2 * 0.05) ** 2 / (0.1 * 0.1), 1.57, 1e-3],
    ['tol-mmc bonus example', f.mmcAllowed(0.1, 10.0, 10.15), 0.25, 1e-9], ['tol-mmc VC hole', f.virtualConditionHole(10.0, 0.1), 9.9, 1e-12],
    ['tol-standards thermal [µm]', f.thermalSizeChange(200, 23e-6, 10) * 1000, 46, 1e-9],
    // IT7 in the 180-250 mm range from the formula: i(√(180·250)) × 16 ≈ 46 µm, as the lesson says
    ['tol-standards IT7 at 200 mm ≈ 46 µm', 16 * f.toleranceUnit(Math.sqrt(180 * 250)), 46, 1.5e-2],
    ['tol-surface N7 = 1.6 µm, N8 = 2×N7', 3.2 / 1.6, 2, 1e-12],
  ];
  ex5.forEach(([n, got, want, tol]) => check(n, near(got, want, tol), `got ${got}, lesson says ${want}`));
  // fit kinds named in the lessons
  check('H7/k6 is a transition fit', f.fit(25, 7, 'k', 6).maxClearance > 0 && f.fit(25, 7, 'k', 6).minClearance < 0);
  check('H7/p6 is an interference fit', f.fit(25, 7, 'p', 6).maxClearance <= 0);
  check('H7/s6 is an interference fit', f.fit(25, 7, 's', 6).maxClearance < 0);
  check('H7/h6 has zero minimum clearance', f.fit(25, 7, 'h', 6).minClearance === 0);
  check('H8/f7 is a clearance fit', f.fit(40, 8, 'f', 7).minClearance > 0);
  // fastener formulas: fixed = half of floating, and both reproduce a fit at the limit
  check('fixed fastener = floating / 2', near(f.fixedFastenerT(10.5, 10), f.floatingFastenerT(10.5, 10) / 2, 1e-12));
  // RSS ≤ worst case always
  check('RSS ≤ worst case', [[0.1, 0.1], [0.3, 0.01, 0.02], [0.05, 0.05, 0.05, 0.05]].every((t) => f.stackRSS(t) <= f.stackWorst(t) + 1e-12));
}

// ---------- manufacturing ----------
{
  const ex6 = [
    ['mf-machining rpm', f.spindleRpm(200, 50), 1273, 1e-3], ['mf-machining vf', f.millFeedRate(0.05, 4, f.spindleRpm(200, 50)), 255, 2e-3],
    ['mf-machining Ra', f.turnRa(0.2, 0.8), 1.56, 3e-3], ['mf-machining f×2 → Ra×4', f.turnRa(0.4, 0.8) / f.turnRa(0.2, 0.8), 4, 1e-12],
    ['mf-sheet BA', f.bendAllowance(90, 2, 0.4, 2), 4.40, 1e-3], ['mf-sheet flat', f.flatLength(40, 30, 90, 2, 0.4, 2), 74.4, 1e-3],
    ['mf-molding clamp [ton]', f.clampForce(8000, 40) / 9810, 32.6, 2e-3], ['mf-molding clamp [kN]', f.clampForce(8000, 40) / 1000, 320, 1e-12],
    ['mf-molding cooling 2→3', f.coolingTimeRatio(3, 2), 2.25, 1e-12],
    ['mf-dfm efficiency', f.dfaEfficiency(4, 60), 0.2, 1e-12],
    ['mf-quality Cp', f.cp(10.05, 9.95, 0.01), 1.67, 3e-3], ['mf-quality Cpk', f.cpk(10.05, 9.95, 10.02, 0.01), 1.0, 1e-9],
    ['mf-quality ppm (≈1350)', f.ppmOutOfSpec(10.05, 9.95, 10.02, 0.01), 1350, 2e-3],
    ['mf-quality Cpk 1.0 ≈ 1350 ppm one side', 1e6 * (1 - f.normCdf(3)), 1350, 2e-3],
    ['mf-cost break-even', f.breakEven(0, 30, 20000, 2), 714, 1e-3],
  ];
  ex6.forEach(([n, got, want, tol]) => check(n, near(got, want, tol), `got ${got}, lesson says ${want}`));
  // normal CDF against known values
  check('normCdf(1.96) = 0.9750', near(f.normCdf(1.96), 0.975, 1e-4));
  check('normCdf(3) = 0.99865', near(f.normCdf(3), 0.99865, 1e-5));
  check('±3σ two-sided ≈ 2700 ppm', near(f.ppmOutOfSpec(3, -3, 0, 1), 2700, 1e-3));
  check('±4σ (Cpk 1.33) ≈ 63 ppm', near(f.ppmOutOfSpec(4, -4, 0, 1), 63.3, 1e-2));
  // turning roughness: simulate the scallop left by a circular nose of radius r at feed f, compute Ra numerically
  { const fd = 0.2, rn = 0.8, N = 20000; const zs = [];
    for (let i = 0; i < N; i++) { const x = -fd / 2 + (fd * (i + 0.5)) / N; zs.push(rn - Math.sqrt(rn * rn - x * x)); }
    const mean = zs.reduce((a, b) => a + b, 0) / N; const Ra = (zs.reduce((a, z) => a + Math.abs(z - mean), 0) / N) * 1000;
    // f²/32r is the usual approximation; the exact parabolic result is f²/(18√3·r) ≈ f²/31.2r (≈3% higher)
    check('turning Ra ≈ f²/32r (vs simulated nose profile, within 4%)', near(Ra, f.turnRa(fd, rn), 0.04), `simulated ${Ra.toFixed(3)}`);
    check('simulated Ra matches exact parabolic f²/(18√3 r)', near(Ra, (fd * fd) / (18 * Math.sqrt(3) * rn) * 1000, 0.01), `simulated ${Ra.toFixed(3)}`); }
  // bend allowance = arc length of the neutral circle
  check('BA = arc of radius R + K·T', near(f.bendAllowance(60, 3, 0.33, 1.5), (Math.PI / 3) * (3 + 0.33 * 1.5), 1e-12));
  // break-even: unit costs equal at N*
  { const N = f.breakEven(0, 30, 20000, 2); check('break-even: equal unit cost', near(f.unitCost(0, 30, N), f.unitCost(20000, 2, N), 1e-12)); }
  check('Cpk = Cp when centred', near(f.cpk(10.05, 9.95, 10, 0.01), f.cp(10.05, 9.95, 0.01), 1e-12));
}

// ---------- dynamics & vibration ----------
{
  const ex7 = [
    ['dy-kinematics d', f.brakingDistance(f.kmh(100), 7), 55.1, 2e-3], ['dy-kinematics t', f.stoppingTime(f.kmh(100), 7), 4.0, 1e-2],
    ['dy-newton F', 0.4 * 10, 4, 1e-12], ['dy-energy P [kW]', f.shaftPower(300, 3000) / 1000, 94.2, 1e-3],
    ['dy-energy ≈128 PS (metric hp = 735.5 W)', f.shaftPower(300, 3000) / 735.5, 128, 3e-3], ['dy-energy impact', f.impactSpeed(2), 6.26, 1e-3],
    ['dy-rotation I', f.inertia.disk(20, 0.2), 0.4, 1e-12], ['dy-rotation E [kJ]', f.rotationalEnergy(0.4, f.rpmToRad(3000)) / 1000, 19.7, 2e-3],
    ['dy-sdof fn', f.naturalFreqHz(20000, 5), 10.1, 5e-3], /* lesson rounds 10.07 to 10.1 */ ['dy-sdof fn from 1 mm', f.freqFromStaticDeflection(0.001), 15.8, 3e-3],
    ['dy-sdof 15.76 constant', Math.sqrt(9810) / (2 * Math.PI), 15.76, 1e-3],
    ['dy-damping ζ', f.dampingRatio(40, 20000, 5), 0.063, 4e-3], ['dy-damping δ', f.logDecrement(10, 8), 0.223, 2e-3], ['dy-damping ζ from δ', f.zetaFromLogDec(f.logDecrement(10, 8)), 0.036, 2e-2],
    ['dy-forced M at r=1, ζ=0.05', f.magnification(1, 0.05), 10, 1e-12], ['dy-isolation T', f.transmissibility(3, 0.05), 0.13, 1e-2],
    ['dy-unbalance F', f.unbalanceForce(0.01, 0.1, f.rpmToRad(3000)), 98.7, 1e-3], ['dy-testing Grms', f.grmsFlat(0.04, 20, 2000), 8.9, 1e-3],
  ];
  ex7.forEach(([n, got, want, tol]) => check(n, near(got, want, tol), `got ${got}, lesson says ${want}`));
  check('T(r=√2) = 1 for any ζ', [0.01, 0.1, 0.5].every((z) => near(f.transmissibility(Math.SQRT2, z), 1, 1e-12)));
  check('M(r=1) = 1/(2ζ)', [0.02, 0.1, 0.3].every((z) => near(f.magnification(1, z), 1 / (2 * z), 1e-12)));
  // simulate m x'' + c x' + k x = 0 (RK4), measure damped period and log decrement
  const sim = (m, c, k, F0 = 0, w = 0, T = 3, dt = 1e-5) => {
    let x = F0 ? 0 : 1, v = 0, tt = 0; const peaks = [], xs = [];
    const acc = (x, v, t) => (F0 * Math.sin(w * t) - c * v - k * x) / m;
    let prevV = v;
    while (tt < T) {
      const k1x = v, k1v = acc(x, v, tt);
      const k2x = v + 0.5 * dt * k1v, k2v = acc(x + 0.5 * dt * k1x, v + 0.5 * dt * k1v, tt + dt / 2);
      const k3x = v + 0.5 * dt * k2v, k3v = acc(x + 0.5 * dt * k2x, v + 0.5 * dt * k2v, tt + dt / 2);
      const k4x = v + dt * k3v, k4v = acc(x + dt * k3x, v + dt * k3v, tt + dt);
      x += (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x); v += (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v); tt += dt;
      if (prevV > 0 && v <= 0) peaks.push([tt, x]); prevV = v; xs.push(x);
    }
    return { peaks, xs };
  };
  { const m = 5, k = 20000, c = 40; const { peaks } = sim(m, c, k);
    const Td = peaks[2][0] - peaks[1][0], wd = (2 * Math.PI) / Td;
    check('simulated ωd = ωn√(1−ζ²)', near(wd, f.dampedOmega(f.naturalOmega(k, m), f.dampingRatio(c, k, m)), 1e-3), `${wd}`);
    const delta = Math.log(peaks[1][1] / peaks[2][1]);
    check('simulated decrement → ζ', near(f.zetaFromLogDec(delta), f.dampingRatio(c, k, m), 1e-3), `${f.zetaFromLogDec(delta)}`); }
  // forced response: steady-state amplitude / static deflection = M
  { const m = 2, k = 8000, c = 2 * 0.1 * Math.sqrt(k * m), F0 = 10, r = 0.8, w = r * Math.sqrt(k / m);
    const { xs } = sim(m, c, k, F0, w, 4, 2e-5); const tail = xs.slice(Math.floor(xs.length * 0.75));
    const amp = (Math.max(...tail) - Math.min(...tail)) / 2;
    check('simulated forced amplitude = M · F0/k', near(amp / (F0 / k), f.magnification(r, 0.1), 5e-3), `${amp / (F0 / k)}`); }
}

// ---------- FEA & CAD ----------
{
  const k1 = f.barElementK(200000, 100, 500), k2 = f.barElementK(200000, 50, 500);
  const u = f.barChainFEA([k1, k2], [0, 10000]);
  const ex8 = [
    ['fe-1d k1', k1, 40000, 1e-12], ['fe-1d k2', k2, 20000, 1e-12], ['fe-1d u1', u[0], 0.25, 1e-9], ['fe-1d u2', u[1], 0.75, 1e-9],
    ['fe-mesh Richardson', f.richardson(105, 100), 106.7, 1e-3], ['fe-mesh 3D halving ×8', f.meshCountFactor(2, 3), 8, 1e-12],
    ['fe-types buckling', f.bucklingLoad(2.3, 10), 23, 1e-12],
    ['cad-mass m', f.massFromVolume(85, 2.70), 229.5, 1e-9], ['cad-mass x̄', f.centroid1D([[2, 0], [1, 150], [0.5, 300]]), 85.7, 1e-3],
  ];
  ex8.forEach(([n, got, want, tol]) => check(n, near(got, want, tol), `got ${got}, lesson says ${want}`));
  // independent: series springs carrying the same end force, and a 3-element chain with loads at every node
  for (let t = 0; t < 50; t++) {
    const ks = [1, 2, 3].map(() => 1000 + Math.random() * 50000), P = [0, 0, 5000 + Math.random() * 1e4];
    const uu = f.barChainFEA(ks, P); let acc = 0;
    const hand = ks.map((k) => (acc += P[2] / k));
    if (!hand.every((h, i) => near(h, uu[i], 1e-9))) { check('FEA chain = series springs', false, JSON.stringify({ ks, uu, hand })); break; }
    if (t === 49) check('FEA chain = series springs (50 random)', true);
  }
  { // loads at every node: element force = sum of loads beyond it
    const ks = [30000, 10000, 20000], P = [1000, 2000, 4000], uu = f.barChainFEA(ks, P);
    const N = [P[0] + P[1] + P[2], P[1] + P[2], P[2]]; let acc = 0; const hand = ks.map((k, i) => (acc += N[i] / k));
    check('FEA chain with distributed nodal loads', hand.every((h, i) => near(h, uu[i], 1e-9)), JSON.stringify({ uu, hand }));
  }
  check('Richardson exact for p=2 error', near(f.richardson(10 + 1 / 16, 10 + 1 / 4), 10, 1e-12));
  check('pctDiff sign', f.pctDiff(95, 100) === -5 && f.pctDiff(110, 100) === 10);
}
// ---------- playground beam solver vs textbook tables ----------
beamChecks(check, near);
pulleyChecks(check, near);
trussChecks(check, near);
airfoilChecks(check, near);
mohrChecks(check, near);
circuitChecks(check, near);
stackChecks(check, near);
columnsChecks(check, near);
acChecks(check, near);
homeChecks(check, near);
machinesChecks(check, near);
fuzzChecks(check, near);
lbmChecks(check);
hydroChecks(check, near);
vibChecks(check, near);
fbdChecks(check, near);
sceneChecks(check, near);
hingeSpringChecks(check, near);
thermalChecks(check, near);
srsChecks(check);
fairnessChecks(check);

// ---------- bar charts in lessons: values read from the content, checked against formulas ----------
{
  const sub = (id) => domains.flatMap((d) => (d.module ? d.module.subtopics : [])).find((s) => s.id === id);
  const barsOf = (id, i = 0) => { const L = sub(id).lesson; const specs = [L.diagram, ...(L.visuals || []).map((v) => v.spec)].filter((x) => x && x.fn === 'bars'); return specs[i].args[0].data; };
  const all = (name, rows, fn, tol) => check(name, rows.every(([n, v]) => near(v, fn(n), tol)), JSON.stringify(rows));
  all('chart t-radiation σT⁴', barsOf('t-radiation'), (n) => f.SIGMA_SB * f.K(parseInt(n)) ** 4 / 1000, 1.2e-2);
  all('chart f-drag power', barsOf('f-drag'), (n) => f.dragPower(1.204, f.kmh(parseInt(n)), 0.3, 2.2) / 1000, 1.2e-2);
  all('chart f-pumps power', barsOf('f-pumps'), (n) => 100 * (parseInt(n) / 100) ** 3, 1e-9);
  all('chart buckling 1/K²', barsOf('buckling'), (n) => 1 / f.K_EFFECTIVE[n] ** 2, 3e-3);
  all('chart deflection ratio', barsOf('deflection'), (n) => (n.startsWith('שלוחה') ? 16 : 1), 1e-12);
  all('chart m-selection E/ρ', barsOf('m-selection'), (n) => ({ 'פלדה': 200 / 7.85, 'Al 6061': 69 / 2.7, 'Ti-6Al-4V': 114 / 4.43 }[n]), 3e-3);
}

// ---------- materials: independent cross-checks ----------
{
  // Ashby beam index derived directly: square beam, same EI -> b ∝ E^(-1/4), m ∝ ρ b²
  const b = (E) => (1 / E) ** 0.25; const m = (E, rho) => rho * b(E) ** 2;
  check('Ashby beam index = direct square-beam mass', near(m(69, 2.7) / m(200, 7.85), f.massRatio(f.ashbyIndex.beam(69, 2.7), f.ashbyIndex.beam(200, 7.85)), 1e-12));
  // lever rule: mass balance Wα·0.022 + Wp·0.76 = C0
  const C0 = 0.37, Wp = f.pearliteFraction(C0);
  check('lever rule mass balance', near((1 - Wp) * 0.022 + Wp * 0.76, C0, 1e-12));
  // Vickers: projected geometry — HV = F / (contact area), area = d² / (2 sin 68°)
  check('Vickers = F / contact area', near(f.vickers(30, 0.5), 30 / (0.5 ** 2 / (2 * Math.sin(f.rad(68)))), 1e-12));
  // Brinell: HB = P / spherical-cap area, cap depth h = (D - √(D²-d²))/2
  const D = 10, dd = 3.7, h = (D - Math.sqrt(D * D - dd * dd)) / 2;
  check('Brinell = P / cap area', near(f.brinell(3000, D, dd), 3000 / (Math.PI * D * h), 1e-12));
}
ex.forEach(([n, got, want, tol]) => check(n, near(got, want, tol), `got ${got}, lesson says ${want}`));

// ---------- 3. Generators ----------
// control characters, or a LaTeX command name with no backslash before it
function lostBackslash(s) {
  return /[\t\n\r\f\v]/.test(s) || /(^|[^\\a-zA-Z])(cdot|frac|sqrt|sigma|tau|varepsilon|varphi|omega|lambda|times|quad|text)(?![a-zA-Z])/.test(s);
}
const subIds = new Set();
domains.filter((d) => d.module).forEach((d) => d.module.subtopics.forEach((s) => subIds.add(s.id)));
for (const id of Object.keys(generators)) {
  let ok = true, why = '';
  for (let i = 0; i < 300; i++) {
    const q = makeQuestion(id);
    if (!isFinite(q.answer)) { ok = false; why = 'answer not finite'; break; }
    if (!['g-mohr', 'gt-firstlaw', 'gx-fit', 'gfe-verify', 'gp-incline'].includes(id) && q.answer <= 0) { ok = false; why = `answer ${q.answer} <= 0`; break; }
    if (!q.steps || !q.steps.length || !q.source || !q.q) { ok = false; why = 'missing steps/source/q'; break; }
    if (!subIds.has(q.subtopic)) { ok = false; why = `unknown subtopic ${q.subtopic}`; break; }
    // a lost backslash in a JS string turns \t into a TAB and \c into "c": catch both
    const lost = [...q.steps, q.q, q.hint || ''].find(lostBackslash);
    if (lost) { ok = false; why = `lost backslash: ${JSON.stringify(lost).slice(0, 90)}`; break; }
    try {
      q.steps.forEach((s) => katex.renderToString(s, { throwOnError: true }));
      mathSegments(q.q).forEach((s) => katex.renderToString(s, { throwOnError: true }));
      if (q.hint) mathSegments(q.hint).forEach((s) => katex.renderToString(s, { throwOnError: true }));
    } catch (e) { ok = false; why = `KaTeX: ${e.message}`; break; }
    if (q.diagram && !draw(q.diagram).startsWith('<svg')) { ok = false; why = 'diagram failed'; break; }
  }
  check(`generator ${id} (300 runs)`, ok, why);
}

// ---------- 4. Content structure + LaTeX ----------
function mathSegments(text) {
  const out = []; const re = /\$([^$]+)\$/g; let m;
  while ((m = re.exec(text))) out.push(m[1]);
  const dollars = (text.match(/\$/g) || []).length;
  if (dollars % 2) out.push('\\unbalanced{'); // forces a failure
  return out;
}
const seenIds = new Set();
for (const d of domains.filter((x) => x.module)) {
  for (const s of d.module.subtopics) {
    const L = s.lesson;
    check(`${s.id}: lesson parts`, L.intuition && L.equations.length && L.implications.length && L.sources.length);
    const texts = [L.intuition, ...L.implications, ...L.equations.map((e) => e.label), L.example?.q || '', ...(L.visuals || []).map((v) => v.caption)];
    (L.visuals || []).forEach((v, i) => check(`${s.id}: visual ${i} renders`, !!registry[v.spec.fn] && draw(v.spec).startsWith('<svg') && !!v.caption));
    if (L.example?.diagram) check(`${s.id}: example diagram renders`, draw(L.example.diagram).startsWith('<svg'));
    const pure = [...L.equations.map((e) => e.tex), ...(L.example?.steps || [])];
    const qs = s.questions;
    qs.forEach((q) => {
      check(`unique id ${q.id}`, !seenIds.has(q.id)); seenIds.add(q.id);
      check(`${q.id}: has source`, !!q.source);
      if (q.type === 'mcq') check(`${q.id}: mcq answer in range`, Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length && q.options.length >= 3);
      if (q.type === 'tf') check(`${q.id}: tf boolean`, typeof q.answer === 'boolean');
      if (q.type === 'open') check(`${q.id}: open has model answer`, !!q.model);
      if (q.type !== 'open') check(`${q.id}: has explanation`, !!q.explain);
      check(`${q.id}: difficulty 1-3`, [1, 2, 3].includes(q.difficulty));
      texts.push(q.q, q.explain || '', q.model || '', ...(q.options || []));
    });
    (s.generators || []).forEach((g) => check(`${s.id}: generator ${g} exists`, !!generators[g] && generators[g].subtopic === s.id));
    if (L.diagram) check(`${s.id}: diagram renders`, draw(L.diagram).startsWith('<svg') && !!registry[L.diagram.fn]);
    let texOk = true, bad = '';
    for (const p of pure) { try { katex.renderToString(p, { throwOnError: true, displayMode: true }); } catch (e) { texOk = false; bad = p + ' :: ' + e.message; break; } }
    for (const t of texts) { if (!texOk) break; for (const m of mathSegments(t)) { try { katex.renderToString(m, { throwOnError: true }); } catch (e) { texOk = false; bad = m + ' :: ' + e.message; break; } } }
    check(`${s.id}: all LaTeX renders`, texOk, bad);
    const lostS = [...pure, ...texts.flatMap((t) => mathSegments(t))].find(lostBackslash);
    check(`${s.id}: no lost backslashes`, !lostS, JSON.stringify(lostS || '').slice(0, 90));
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log(failures.join('\n')); process.exit(1); }
