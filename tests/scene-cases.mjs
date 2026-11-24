// Saved-scene questions: for every mode and target the answer equals an independent calculation on
// the re-drawn scene, the picture hides the answer, the numbers change, and the steps are valid TeX.
import { createRequire } from 'node:module';
import { targetsFor, makeSceneQuestion, canSave } from '../js/scenes.js';
import { solveBeam, rectSection } from '../js/beam.js';
import { methodOfJoints } from '../js/truss.js';
import { pressureAt } from '../js/hydro.js';
import * as f from '../js/formulas.js';
const katex = createRequire(import.meta.url)('../vendor/katex/katex.min.js');
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const SCENES = {
  beam: { L: 6, b: 100, h: 200, E: 200, sel: null, supports: [{ id: 1, type: 'pin', x: 0 }, { id: 2, type: 'roller', x: 4 }], loads: [{ id: 3, type: 'dist', a: 0, b: 4, w1: 10, w2: 10 }, { id: 4, type: 'point', x: 6, P: 15, angle: 270 }] },
  beamFixed: { L: 6, b: 100, h: 200, E: 200, sel: null, supports: [{ id: 1, type: 'fixed', x: 0 }, { id: 2, type: 'roller', x: 6 }], loads: [{ id: 3, type: 'dist', a: 0, b: 6, w1: 10, w2: 10 }] },
  beamGerber: { L: 8, b: 100, h: 200, E: 200, sel: null, supports: [{ id: 1, type: 'fixed', x: 0 }, { id: 2, type: 'roller', x: 5 }, { id: 3, type: 'roller', x: 8 }], hinges: [{ id: 9, type: 'hinge', x: 2.5 }], loads: [{ id: 4, type: 'dist', a: 0, b: 8, w1: 10, w2: 10 }] },
  beamSpring: { L: 6, b: 100, h: 200, E: 200, sel: null, supports: [{ id: 1, type: 'pin', x: 0 }, { id: 2, type: 'roller', x: 6 }, { id: 3, type: 'spring', x: 3, k: 1000 }], hinges: [], loads: [{ id: 4, type: 'dist', a: 0, b: 6, w1: 10, w2: 10 }] },
  beamThermal: { L: 6, b: 100, h: 200, E: 200, dT: 30, dTg: 20, alpha: 12, sel: null, supports: [{ id: 1, type: 'fixed', x: 0 }, { id: 2, type: 'pin', x: 6 }], hinges: [], loads: [{ id: 4, type: 'dist', a: 0, b: 6, w1: 10, w2: 10 }] },
  hoist: { sub: 'hoist', hoist: { n: 4, m: 100, mb: 5, eta: 0.95, pull: 'down', dir: 'lift', p: 0 }, conn: { left: { kind: 'hang', m: 2, theta: 30, mus: 0, muk: 0 }, right: { kind: 'hang', m: 3, theta: 30, mus: 0, muk: 0 }, mp: 0 } },
  conn: { sub: 'conn', hoist: { n: 4, m: 100, mb: 5, eta: 0.95, pull: 'down', dir: 'lift', p: 0 }, conn: { left: { kind: 'incline', m: 4, theta: 30, mus: 0.1, muk: 0.08 }, right: { kind: 'hang', m: 5, theta: 30, mus: 0, muk: 0 }, mp: 1 } },
  truss: { joints: [{ id: 1, x: 2, y: 1, sup: 'pin' }, { id: 2, x: 10, y: 1, sup: 'roller' }, { id: 3, x: 6, y: 4.5, sup: null }], members: [{ id: 4, a: 1, b: 3 }, { id: 5, a: 3, b: 2 }, { id: 6, a: 1, b: 2 }], loads: [{ id: 7, j: 3, P: 20, angle: 270 }], tool: 'select', sel: null, pend: null, labels: true, d: 60, E: 200, fy: 235 },
  buoy: { sub: 'buoy', buoy: { rhoF: 1000, shape: 'box', a: 30, b: 30, h: 24, r: 12, rho: 917, D: 0.8, z: 0, released: true }, pres: { Ht: 5, D: 4, theta: 60, u1: 0.6, u2: 2.6, b: 1, rho2: 1000, top: false, rho1: 900, t: 1, px: 0.8, pz: 2 } },
  pres: { sub: 'pres', buoy: { rhoF: 1000, shape: 'box', a: 30, b: 30, h: 24, r: 12, rho: 917, D: 0.8, z: 0, released: true }, pres: { Ht: 5, D: 4, theta: 60, u1: 0.6, u2: 2.6, b: 1, rho2: 1000, top: true, rho1: 900, t: 1, px: 0.8, pz: 2 } },
  vib: { m: 2, k: 200, c: 4, x0: 50, v0: 0, force: true, F0: 10, f: 1.5, speed: 1 },
};
const MODE = { beam: 'beam', beamThermal: 'beam', beamFixed: 'beam', beamGerber: 'beam', beamSpring: 'beam', hoist: 'pulley', conn: 'pulley', truss: 'truss', buoy: 'fluid', pres: 'fluid', vib: 'vib' };
// independent answers for some targets
const indep = {
  beam: (sc, key) => { const r = solveBeam({ L: sc.L, EI: rectSection(sc.b, sc.h, sc.E).EI, supports: sc.supports, hinges: sc.hinges || [], loads: sc.loads, EA: sc.E * sc.b * sc.h, thermal: sc.dT || sc.dTg ? { dT: sc.dT || 0, dTg: sc.dTg || 0, alpha: (sc.alpha || 12) * 1e-6, h: sc.h / 1000 } : null }); const i = sc.supports.findIndex((s) => `R${s.id}` === key); return i >= 0 ? r.reactions[i].Ry : null; },
  truss: (sc, key) => { if (key[0] !== 'N') return null; const mj = methodOfJoints(sc); return mj.N[sc.members.findIndex((m) => `N${m.id}` === key)]; },
  pulley: (sc, key) => { if (sc.sub !== 'hoist' || key !== 'F') return null; const h = sc.hoist, W = (h.m + h.mb) * 9.81, e = h.eta; return e === 1 ? W / h.n : (W * (1 - e)) / (e * (1 - e ** h.n)); },
  fluid: (sc, key) => (key === 'sub' ? (100 * sc.buoy.rho) / sc.buoy.rhoF : key === 'pb' ? pressureAt(sc.pres.D, { rho1: 900, t: sc.pres.t, rho2: 1000 }) / 1000 : null),
  vib: (sc, key) => (key === 'fn' ? f.naturalFreqHz(sc.k, sc.m) : key === 'zeta' ? f.dampingRatio(sc.c, sc.k, sc.m) : key === 'TR' ? f.transmissibility((2 * Math.PI * sc.f) / Math.sqrt(sc.k / sc.m), f.dampingRatio(sc.c, sc.k, sc.m)) : null),
};
const LEAKS = { beam: [/Ry /, /pg-react/], pulley: [/F = \d/, /T = \d/, /a = \d/], truss: [/pg-ten/, /pg-com/, /pg-react/], fluid: [/Fb /, /kPa/, /pg-resf/], vib: [/x = /, /pg-trace/] };

export function sceneChecks(check, near) {
  for (const [name, scene] of Object.entries(SCENES)) {
    const mode = MODE[name];
    check(`scene ${name}: can be saved`, canSave(mode, scene));
    for (const { key } of targetsFor(mode, scene)) {
      const rnd = rng(name.length * 977 + key.length * 31), answers = new Set();
      let okI = true, okLeak = true, okTex = true, okFinite = true;
      for (let i = 0; i < 25; i++) {
        const q = makeSceneQuestion({ id: 'x', mode, scene, target: key, name: 't' }, rnd);
        if (!Number.isFinite(q.answer)) okFinite = false;
        answers.add(q.answer.toPrecision(6));
        const ind = indep[mode] && indep[mode](q.scene, key);
        if (ind != null && !near(q.answer, ind, 1e-6) && Math.abs(q.answer - ind) > 1e-9) okI = false;
        if (!q.svg.startsWith('<svg') || LEAKS[mode].some((re) => re.test(q.svg))) okLeak = false;
        try { q.steps.forEach((s) => katex.renderToString(s, { throwOnError: true })); } catch (e) { okTex = false; }
      }
      check(`scene ${name}/${key}: finite answers`, okFinite);
      check(`scene ${name}/${key}: answer = independent calculation`, okI);
      check(`scene ${name}/${key}: picture hides the answer`, okLeak);
      check(`scene ${name}/${key}: steps are valid TeX`, okTex);
      check(`scene ${name}/${key}: numbers change between questions`, answers.size > 3 || (key === 'MA' && answers.size > 1) || [...answers].every((a) => Number(a) === 0), `${answers.size} distinct`); // an always-zero answer (zero-force member, Rx under vertical loads) is a valid question
    }
  }
}
