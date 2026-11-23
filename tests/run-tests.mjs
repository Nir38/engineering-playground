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
  ['safety example σ', 20000 / f.area.circle(16), 99.5, 1e-3],
  ['safety example n', 640 / (20000 / f.area.circle(16)), 6.4, 1e-2],
];
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
    if (id !== 'g-mohr' && q.answer <= 0) { ok = false; why = `answer ${q.answer} <= 0`; break; }
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
    const texts = [L.intuition, ...L.implications, ...L.equations.map((e) => e.label), L.example?.q || ''];
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
