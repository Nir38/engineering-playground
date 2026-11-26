// Property checks on random circuits (seeded, so every run is the same): Kirchhoff's current law at every
// node and the power balance (Tellegen) for the DC and the phasor solver, and the time solver settling to
// the phasor amplitude. These catch solver bugs that hand-made cases might miss.
import { solve, solveAC, step, emptyState, cabs, cadd, cx } from '../js/circuit.js';
export function fuzzChecks(check) {
  let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  // a ring through all nodes (so everything is connected) plus random chords
  const make = (ac) => {
    const n = 3 + Math.floor(rnd() * 4), nodes = Array.from({ length: n }, (_, i) => `n${i}`), els = []; let id = 1;
    els.push(ac ? { id: id++, type: 'vac', a: 'n1', b: 'n0', Vrms: 5 + rnd() * 50, f: 50, r: 0.1 + rnd() } : { id: id++, type: 'bat', a: 'n1', b: 'n0', V: 1 + rnd() * 20, r: 0.1 + rnd() });
    const part = (a, b) => { const t = ac ? pick(['res', 'res', 'cap', 'ind']) : 'res'; return t === 'res' ? { id: id++, type: t, a, b, R: 1 + rnd() * 1000 } : t === 'cap' ? { id: id++, type: t, a, b, C: (1 + rnd() * 100) * 1e-6 } : { id: id++, type: t, a, b, L: 0.01 + rnd() * 0.5, rL: 1 + rnd() * 10 }; };
    for (let i = 1; i < n; i++) els.push(part(nodes[i], nodes[(i + 1) % n]));
    for (let k = 0; k < n; k++) { const a = pick(nodes), b = pick(nodes); if (a !== b) els.push(part(a, b)); }
    return { els, nodes };
  };
  let okKcl = true, okPow = true, okKclAC = true, okPowAC = true, worst = 0;
  for (let t = 0; t < 60; t++) {
    const { els, nodes } = make(false), r = solve(els, { dc: true });
    for (const nd of nodes) { const s = els.reduce((q, e) => q + (e.a === nd ? r.I.get(e.id) : 0) - (e.b === nd ? r.I.get(e.id) : 0), 0); if (Math.abs(s) > 1e-6) okKcl = false; }
    const p = els.reduce((q, e) => q + r.Vd.get(e.id) * r.I.get(e.id), 0), scale = els.reduce((q, e) => q + Math.abs(r.Vd.get(e.id) * r.I.get(e.id)), 0) || 1;
    if (Math.abs(p) / scale > 1e-6) okPow = false;
    const g = make(true), ra = solveAC(g.els, 50);
    for (const nd of g.nodes) { const s = g.els.reduce((q, e) => cadd(q, e.a === nd ? ra.I.get(e.id) : e.b === nd ? cx(-ra.I.get(e.id).re, -ra.I.get(e.id).im) : cx(0)), cx(0)); if (cabs(s) > 1e-6) okKclAC = false; }
    const S = g.els.reduce((q, e) => cadd(q, ra.S.get(e.id)), cx(0)), sc = g.els.reduce((q, e) => q + cabs(ra.S.get(e.id)), 0) || 1;
    if (cabs(S) / sc > 1e-6) okPowAC = false; worst = Math.max(worst, cabs(S) / sc);
  }
  check('fuzz: 60 random DC networks: KCL holds at every node', okKcl);
  check('fuzz: 60 random DC networks: power balance Σ V·I = 0', okPow);
  check('fuzz: 60 random AC networks (R, L, C): KCL with phasors at every node', okKclAC);
  check('fuzz: 60 random AC networks: complex power balance Σ S = 0', okPowAC, String(worst));
  // time solver vs phasor: 8 random RLC networks, compare the source current amplitude after settling
  let okT = true, msg = '';
  for (let t = 0; t < 8; t++) {
    const { els } = make(true), src = els[0], A = cabs(solveAC(els, 50).I.get(src.id)) * Math.SQRT2;
    const st = emptyState(), dt = 0.02 / 400; let pk = 0;
    for (let k = 0; k < 400 * 40; k++) { const r = step(els, st, dt); if (k >= 400 * 38) pk = Math.max(pk, Math.abs(r.I.get(src.id))); }
    if (A > 1e-6 && Math.abs(pk - A) / A > 0.02) { okT = false; msg = `${pk} vs ${A}`; }
  }
  check('fuzz: 8 random RLC networks: the time solver settles to the phasor amplitude (2%)', okT, msg);
}
