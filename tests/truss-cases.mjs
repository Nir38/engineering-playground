// Truss checks: hand results (method of joints / sections, Hibbeler-style),
// stiffness solution vs the equilibrium matrix, mechanisms and indeterminate trusses.
import { solveTruss, methodOfJoints, roundBarCheck } from '../js/truss.js';
export function trussChecks(check, near) {
  const J = (id, x, y, sup = null) => ({ id, x, y, sup });
  const Mb = (id, a, b) => ({ id, a, b });
  const down = (j, P = 10) => ({ id: 100 + j, j, P, angle: 270 });
  const force = (s, a, b) => s.forces.find((f) => (f.a === a && f.b === b) || (f.a === b && f.b === a)).N;
  // simple triangle (45°): rafters -P/(2 sin45), tie +P/(2 tan45)
  let model = { joints: [J(1, 0, 0, 'pin'), J(2, 4, 0, 'roller'), J(3, 2, 2)], members: [Mb(1, 1, 3), Mb(2, 3, 2), Mb(3, 1, 2)], loads: [down(3)] };
  let s = solveTruss(model);
  check('truss triangle: determinate', s.status === 'determinate' && s.degree === 0);
  check('truss triangle: rafters = -P/(2 sin45°)', near(force(s, 1, 3), -10 / (2 * Math.SQRT1_2), 1e-9) && near(force(s, 3, 2), -10 / (2 * Math.SQRT1_2), 1e-9));
  check('truss triangle: tie = P/(2 tan45°)', near(force(s, 1, 2), 5, 1e-9));
  check('truss triangle: reactions P/2', near(s.reactions[0].Ry, 5, 1e-9) && near(s.reactions[1].Ry, 5, 1e-9) && s.reactions[0].Rx === 0);
  // Pratt, 4 panels 2 m, height 2 m, 10 kN at L1, L2, L3
  const L = [0, 1, 2, 3, 4].map((i) => J(i + 1, 2 * i, 0, i === 0 ? 'pin' : i === 4 ? 'roller' : null));
  const U = [1, 2, 3].map((i) => J(10 + i, 2 * i, 2));
  const pairs = [[1, 2], [2, 3], [3, 4], [4, 5], [11, 12], [12, 13], [1, 11], [13, 5], [2, 11], [3, 12], [4, 13], [11, 3], [13, 3]];
  model = { joints: [...L, ...U], members: pairs.map(([a, b], i) => Mb(i + 1, a, b)), loads: [down(2), down(3), down(4)] };
  s = solveTruss(model);
  check('Pratt: m + r = 2j, determinate', s.m === 13 && s.r === 3 && s.j === 8 && s.status === 'determinate');
  check('Pratt (sections): top chord U1U2 = -M/h = -20 kN', near(force(s, 11, 12), -20, 1e-9));
  check('Pratt (sections): bottom chord L1L2 = L2L3 = +15 kN', near(force(s, 2, 3), 15, 1e-9) && near(force(s, 3, 4), 15, 1e-9));
  check('Pratt: diagonal U1L2 = +V/sin45 = 7.07 kN (tension)', near(force(s, 11, 3), 5 / Math.SQRT1_2, 1e-9));
  check('Pratt: middle vertical L2U2 is a zero-force member', force(s, 3, 12) === 0);
  check('Pratt: vertical L1U1 = +P', near(force(s, 2, 11), 10, 1e-9));
  const mj = methodOfJoints(model);
  check('Pratt: stiffness = method of joints', mj && s.forces.every((f, i) => Math.abs(f.N - mj.N[i]) < 1e-9));
  // cantilever from a wall (two pins)
  model = { joints: [J(1, 0, 0, 'pin'), J(2, 0, 2, 'pin'), J(3, 2, 0)], members: [Mb(1, 1, 3), Mb(2, 2, 3)], loads: [down(3)] };
  s = solveTruss(model);
  check('wall cantilever: tie = P√2, strut = -P', near(force(s, 2, 3), 10 * Math.SQRT2, 1e-9) && near(force(s, 1, 3), -10, 1e-9) && s.status === 'determinate');
  // roller on a surface inclined θ = 30°: ΣM_A → R·cosθ·4 = 10·2 → R = 5/cos30°, Rx_B = −5·tan30°,
  // pin A balances it: Ax = +5·tan30°; joint B: N_BC = −5√2, N_AB = 5 − 5·tan30°
  {
    const t = Math.PI / 6, inc = { joints: [J(1, 0, 0, 'pin'), { ...J(2, 4, 0, 'roller'), theta: 30 }, J(3, 2, 2)], members: [Mb(1, 1, 3), Mb(2, 3, 2), Mb(3, 1, 2)], loads: [down(3)] };
    s = solveTruss(inc);
    const B = s.reactions.find((r) => r.id === 2), A = s.reactions.find((r) => r.id === 1);
    check('inclined roller 30°: R = 5/cosθ, normal to the surface', near(B.R, 5 / Math.cos(t), 1e-9) && near(B.Ry, 5, 1e-9) && near(B.Rx, -5 * Math.tan(t), 1e-9));
    check('inclined roller 30°: pin takes Ax = +5·tanθ, Ay = 5', near(A.Rx, 5 * Math.tan(t), 1e-9) && near(A.Ry, 5, 1e-9));
    check('inclined roller 30°: tie N_AB = 5 − 5·tanθ, N_BC = −5√2', near(force(s, 1, 2), 5 - 5 * Math.tan(t), 1e-9) && near(force(s, 3, 2), -5 * Math.SQRT2, 1e-9));
    const mj2 = methodOfJoints(inc);
    check('inclined roller: stiffness = method of joints', mj2 && s.forces.every((f, i) => Math.abs(f.N - mj2.N[i]) < 1e-9));
    check('flat roller (θ = 0) unchanged', near(solveTruss({ ...inc, joints: [J(1, 0, 0, 'pin'), { ...J(2, 4, 0, 'roller'), theta: 0 }, J(3, 2, 2)] }).reactions[1].Ry, 5, 1e-9));
  }
  // mechanisms
  const sq =[J(1, 0, 0, 'pin'), J(2, 2, 0, 'roller'), J(3, 2, 2), J(4, 0, 2)];
  check('square without a diagonal is a mechanism', solveTruss({ joints: sq, members: [Mb(1, 1, 2), Mb(2, 2, 3), Mb(3, 3, 4), Mb(4, 4, 1)], loads: [down(3)] }).status === 'mechanism');
  check('m + r < 2j is a mechanism', solveTruss({ joints: sq, members: [Mb(1, 1, 2), Mb(2, 2, 3), Mb(3, 3, 4)], loads: [] }).status === 'mechanism');
  check('two rollers only: mechanism', solveTruss({ joints: [J(1, 0, 0, 'roller'), J(2, 4, 0, 'roller'), J(3, 2, 2)], members: [Mb(1, 1, 3), Mb(2, 3, 2), Mb(3, 1, 2)], loads: [down(3)] }).status === 'mechanism');
  check('three joints in a line with a side load: mechanism', solveTruss({ joints: [J(1, 0, 0, 'pin'), J(2, 2, 0), J(3, 4, 0, 'roller')], members: [Mb(1, 1, 2), Mb(2, 2, 3)], loads: [down(2)] }).status === 'mechanism');
  check('a loose joint is reported', solveTruss({ joints: [...sq, J(9, 5, 5)], members: [Mb(1, 1, 2), Mb(2, 2, 3), Mb(3, 3, 4), Mb(4, 4, 1), Mb(5, 1, 3)], loads: [] }).loose.includes(9));
  // indeterminate: square with both diagonals (degree 1), joint equilibrium holds and EA scale does not matter
  model = { joints: sq, members: [Mb(1, 1, 2), Mb(2, 2, 3), Mb(3, 3, 4), Mb(4, 4, 1), Mb(5, 1, 3), Mb(6, 2, 4)], loads: [{ id: 1, j: 3, P: 10, angle: 0 }] };
  s = solveTruss(model);
  const s2 = solveTruss(model, { EA: 1e5 });
  check('square with both diagonals: indeterminate degree 1', s.status === 'indeterminate' && s.degree === 1);
  check('indeterminate: forces independent of a common EA', s.forces.every((f, i) => near(f.N, s2.forces[i].N, 1e-9) || Math.abs(f.N - s2.forces[i].N) < 1e-9));
  // force method (virtual work): release member 2-4 (redundant X), solve the determinate truss for the
  // load (N0) and for a unit tension pair along 2-4 (n1); compatibility: Σ(N0 + X n1) n1 L = 0 (incl. the released bar, n = 1)
  {
    const rel = { joints: sq, members: model.members.filter((q) => q.id !== 6) };
    const N0 = methodOfJoints({ ...rel, loads: model.loads }).N;
    // unit tension in 2-4 pulls joint 2 toward 4 (135°) and joint 4 toward 2 (315°)
    const n1 = methodOfJoints({ ...rel, loads: [{ id: 1, j: 2, P: 1, angle: 135 }, { id: 2, j: 4, P: 1, angle: 315 }] }).N;
    const len = (q) => { const A = sq.find((j) => j.id === q.a), B = sq.find((j) => j.id === q.b); return Math.hypot(B.x - A.x, B.y - A.y); };
    let d10 = 0, d11 = 2 * Math.SQRT2; // released bar: n = 1, L = 2√2
    rel.members.forEach((q, i) => { d10 += N0[i] * n1[i] * len(q); d11 += n1[i] * n1[i] * len(q); });
    const X = -d10 / d11;
    check('indeterminate square: stiffness = force method (redundant 2-4)', near(force(s, 2, 4), X, 1e-9) && rel.members.every((q, i) => Math.abs(force(s, q.a, q.b) - (N0[i] + X * n1[i])) < 1e-9));
  }
  // random simple trusses (each new joint on two members): stiffness = method of joints; random extra members: joint equilibrium
  let okDet = true, okEq = true;
  for (let t = 0; t < 200; t++) {
    const js = [J(1, 0, 0, 'pin'), J(2, 4 + 4 * Math.random(), 0, 'roller'), J(3, 1 + 2 * Math.random(), 1 + 2 * Math.random())];
    const ms = [Mb(1, 1, 2), Mb(2, 2, 3), Mb(3, 1, 3)];
    for (let k = 4; k <= 7; k++) {
      const a = 1 + Math.floor(Math.random() * (k - 1)); let b = 1 + Math.floor(Math.random() * (k - 1)); if (b === a) b = a === 1 ? 2 : a - 1;
      // a new joint hung on two members that are almost in line is nearly a mechanism (huge forces,
      // ill-conditioned): like a designer would, keep the angle between the two members above ~12°
      let x, y, tries = 0;
      do {
        x = -1 + 10 * Math.random(); y = 0.5 + 4 * Math.random(); tries++;
        const A = js[a - 1], B = js[b - 1], ua = [A.x - x, A.y - y], ub = [B.x - x, B.y - y];
        const sin = Math.abs(ua[0] * ub[1] - ua[1] * ub[0]) / (Math.hypot(...ua) * Math.hypot(...ub) || 1);
        if (sin > 0.2 && Math.hypot(...ua) > 0.5 && Math.hypot(...ub) > 0.5) break;
      } while (tries < 200);
      js.push(J(k, x, y));
      ms.push(Mb(ms.length + 1, a, k), Mb(ms.length + 2, b, k));
    }
    const loads = [3, 4, 5, 6, 7].map((k) => ({ id: k, j: k, P: 5 + 20 * Math.random(), angle: 180 + 180 * Math.random() }));
    const md = { joints: js, members: ms, loads };
    const st = solveTruss(md), mj2 = methodOfJoints(md);
    if (st.status !== 'mechanism' && mj2) {
      if (!st.forces.every((f, i) => Math.abs(f.N - mj2.N[i]) < 1e-6 * (1 + Math.abs(f.N)))) okDet = false;
    }
    // add two extra members and check every joint is in equilibrium
    const mx = { ...md, members: [...ms, Mb(90, 1, 7), Mb(91, 2, 6)] };
    const sx = solveTruss(mx);
    if (sx.status === 'mechanism') continue;
    const res = js.map(() => [0, 0]);
    const idx = new Map(js.map((q, i) => [q.id, i]));
    sx.forces.forEach((f) => { const A = js[idx.get(f.a)], B = js[idx.get(f.b)], dx = B.x - A.x, dy = B.y - A.y, l = Math.hypot(dx, dy); res[idx.get(f.a)][0] += f.N * dx / l; res[idx.get(f.a)][1] += f.N * dy / l; res[idx.get(f.b)][0] -= f.N * dx / l; res[idx.get(f.b)][1] -= f.N * dy / l; });
    loads.forEach((l) => { const i = idx.get(l.j), a = l.angle * Math.PI / 180; res[i][0] += l.P * Math.cos(a); res[i][1] += l.P * Math.sin(a); });
    sx.reactions.forEach((q) => { const i = idx.get(q.id); res[i][0] += q.Rx; res[i][1] += q.Ry; });
    if (res.some(([x, y]) => Math.abs(x) + Math.abs(y) > 1e-6)) okEq = false;
  }
  check('random simple trusses: stiffness = method of joints (200)', okDet);
  check('random indeterminate trusses: every joint in equilibrium (200)', okEq);
  // round bar design check
  const rb = roundBarCheck(10, 2, 20, 200, 235);
  check('round bar: A = πd²/4, σ = N/A', near(rb.A, 314.159, 1e-5) && near(rb.sigma, 31.831, 1e-4));
  check('round bar: Euler Pcr = π²EI/L² (K = 1)', near(rb.Pcr, 3.8758, 1e-4));
  const rc = roundBarCheck(-3, 2, 20, 200, 235);
  check('compression member: buckling governs a slender bar', rc.mode === 'buckling' && near(rc.util, 3 / rb.Pcr, 1e-9));
  // θ between a diagonal and the chord: raising the truss (bigger θ) lowers every member force.
  // Pratt 2 panels of 2.5 m, end diagonal carries the shear: N = −V/sinθ; middle top chord = −M/h.
  const pratt = (h) => ({ joints: [J(1, 0, 0, 'pin'), J(2, 2.5, 0), J(3, 5, 0, 'roller'), J(4, 2.5, h)], members: [Mb(1, 1, 2), Mb(2, 2, 3), Mb(3, 1, 4), Mb(4, 4, 3), Mb(5, 2, 4)], loads: [down(2, 20)] });
  const diag = [30, 45, 60].map((deg) => { const h = 2.5 * Math.tan((deg * Math.PI) / 180), s2 = solveTruss(pratt(h)); return { deg, h, N: force(s2, 1, 4), T: force(s2, 1, 2) }; });
  check('truss θ: end diagonal = −V/sinθ at 30°, 45°, 60°', diag.every(({ deg, N }) => near(N, -10 / Math.sin((deg * Math.PI) / 180), 1e-9)), JSON.stringify(diag));
  check('truss θ: bottom chord = M/h = V·a/h', diag.every(({ h, T }) => near(T, (10 * 2.5) / h, 1e-9)));
  check('truss θ: bigger θ, smaller forces', diag[0].N < diag[1].N && diag[1].N < diag[2].N && diag[0].T > diag[2].T);
}
