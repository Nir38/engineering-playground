// truss.js: 2D pin-jointed truss solver for the playground. Units: kN, m.
// Direct stiffness method with bar elements (equal EA unless given): member forces are
// exact; for statically determinate trusses they do not depend on EA at all.
//
// model = {
//   joints:  [{ id, x, y, sup: null | 'pin' | 'roller' }]   // roller: vertical reaction only
//   members: [{ id, a, b }]                                  // joint ids
//   loads:   [{ id, j, P, angle }]                           // P > 0 (kN), angle from +x, CCW (270 = down)
// }
// Results: N > 0 tension, N < 0 compression; reactions up/right positive.

export const SUP_REACTIONS = { pin: 2, roller: 1 };

function solveScaled(A, b) { // Jacobi-scaled Gaussian elimination; null if singular
  const n = b.length; if (!n) return [];
  const D = A.map((row, i) => (row[i] > 0 ? 1 / Math.sqrt(row[i]) : 0));
  if (D.some((v) => !v)) return null;
  const M = A.map((row, i) => [...row.map((v, j) => v * D[i] * D[j]), b[i] * D[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-10) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const y = Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let t = M[r][n]; for (let k = r + 1; k < n; k++) t -= M[r][k] * y[k]; y[r] = t / M[r][r]; }
  return y.map((v, i) => v * D[i]);
}

export function solveTruss(model, { EA = 1 } = {}) {
  const J = model.joints, idx = new Map(J.map((j, i) => [j.id, i]));
  const mem = model.members.filter((m) => idx.has(m.a) && idx.has(m.b) && m.a !== m.b);
  const j = J.length, m = mem.length;
  const r = J.reduce((n, q) => n + (SUP_REACTIONS[q.sup] || 0), 0);
  const count = { j, m, r, degree: m + r - 2 * j };
  const geo = mem.map((q) => {
    const A = J[idx.get(q.a)], B = J[idx.get(q.b)], dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy);
    return { ...q, i: idx.get(q.a), k: idx.get(q.b), L, c: L ? dx / L : 0, s: L ? dy / L : 0 };
  });
  const loose = J.filter((q, i) => !geo.some((g) => g.i === i || g.k === i)).map((q) => q.id);
  const base = { ...count, loose };
  if (!j || geo.some((g) => g.L < 1e-9)) return { ...base, status: 'mechanism' };

  const n = 2 * j, K = Array.from({ length: n }, () => new Float64Array(n)), F = new Float64Array(n);
  for (const g of geo) {
    const kk = (g.EA ?? EA) / g.L, t = [g.c * g.c, g.c * g.s, g.s * g.s];
    const blk = [[t[0], t[1]], [t[1], t[2]]], d = [2 * g.i, 2 * g.i + 1, 2 * g.k, 2 * g.k + 1];
    for (let p = 0; p < 4; p++) for (let q = 0; q < 4; q++) {
      const sgn = (p < 2) === (q < 2) ? 1 : -1;
      K[d[p]][d[q]] += sgn * kk * blk[p % 2][q % 2];
    }
  }
  for (const l of model.loads || []) {
    if (!idx.has(l.j)) continue;
    const t = (l.angle * Math.PI) / 180, i = idx.get(l.j);
    F[2 * i] += l.P * Math.cos(t); F[2 * i + 1] += l.P * Math.sin(t);
  }
  const fixed = new Set();
  J.forEach((q, i) => { if (q.sup === 'pin') { fixed.add(2 * i); fixed.add(2 * i + 1); } else if (q.sup === 'roller') fixed.add(2 * i + 1); });
  const free = []; for (let d = 0; d < n; d++) if (!fixed.has(d)) free.push(d);
  const sol = solveScaled(free.map((a) => free.map((b) => K[a][b])), free.map((a) => F[a]));
  if (!sol) return { ...base, status: 'mechanism' };
  const u = new Float64Array(n); free.forEach((d, i) => (u[d] = sol[i]));

  const tiny = (v, ref) => (Math.abs(v) < 1e-9 * Math.max(1, ref) ? 0 : v);
  const Fmax = Math.max(1, ...[...F].map(Math.abs));
  const forces = geo.map((g) => {
    const N = ((g.EA ?? EA) / g.L) * (g.c * (u[2 * g.k] - u[2 * g.i]) + g.s * (u[2 * g.k + 1] - u[2 * g.i + 1]));
    return { id: g.id, a: g.a, b: g.b, L: g.L, N: tiny(N, Fmax) };
  });
  const reactions = J.map((q, i) => {
    if (!q.sup) return null;
    const R = [0, 1].map((o) => { const d = 2 * i + o; if (!fixed.has(d)) return 0; let v = -F[d]; for (let k = 0; k < n; k++) v += K[d][k] * u[k]; return tiny(v, Fmax); });
    return { id: q.id, sup: q.sup, Rx: R[0], Ry: R[1] };
  }).filter(Boolean);
  return { ...base, status: count.degree > 0 ? 'indeterminate' : 'determinate', forces, reactions, u };
}

// method of joints, written as the equilibrium matrix: unknowns = member forces + reactions.
// Used by the tests as an independent check for determinate trusses (square system).
export function methodOfJoints(model) {
  const J = model.joints, idx = new Map(J.map((j, i) => [j.id, i]));
  const unk = [];
  model.members.forEach((q) => unk.push({ kind: 'N', q }));
  J.forEach((q, i) => { if (q.sup === 'pin') unk.push({ kind: 'Rx', i }, { kind: 'Ry', i }); else if (q.sup === 'roller') unk.push({ kind: 'Ry', i }); });
  const n = 2 * J.length; if (unk.length !== n) return null;
  const A = Array.from({ length: n }, () => Array(n).fill(0)), b = Array(n).fill(0);
  unk.forEach((x, c) => {
    if (x.kind === 'N') {
      const i = idx.get(x.q.a), k = idx.get(x.q.b), dx = J[k].x - J[i].x, dy = J[k].y - J[i].y, L = Math.hypot(dx, dy);
      // tension pulls joint i toward k and joint k toward i
      A[2 * i][c] += dx / L; A[2 * i + 1][c] += dy / L; A[2 * k][c] -= dx / L; A[2 * k + 1][c] -= dy / L;
    } else A[2 * x.i + (x.kind === 'Ry' ? 1 : 0)][c] += 1;
  });
  (model.loads || []).forEach((l) => { const i = idx.get(l.j), t = (l.angle * Math.PI) / 180; b[2 * i] -= l.P * Math.cos(t); b[2 * i + 1] -= l.P * Math.sin(t); });
  // plain Gaussian elimination with partial pivoting
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let t = M[r][n]; for (let k = r + 1; k < n; k++) t -= M[r][k] * x[k]; x[r] = t / M[r][r]; }
  return { N: model.members.map((q, c) => x[c]) };
}

// solid round bar: d in mm, E in GPa, fy in MPa -> utilisation of one member
export function roundBarCheck(N, L, d, E_GPa, fy) {
  const A = (Math.PI * d * d) / 4, I = (Math.PI * d ** 4) / 64; // mm², mm⁴
  const sigma = (N * 1e3) / A; // MPa (N in kN)
  const Pcr = (Math.PI ** 2 * E_GPa * 1e3 * I) / (L * 1e3) ** 2 / 1e3; // kN, pinned-pinned (K = 1)
  const uY = Math.abs(sigma) / fy, uB = N < 0 ? -N / Pcr : 0;
  return { A, I, sigma, Pcr, uY, uB, util: Math.max(uY, uB), mode: uB > uY ? 'buckling' : 'yield' };
}
