// beam.js: 2D beam solver for the playground. Units: kN, m (EI in kN·m²).
// Euler-Bernoulli frame elements with consistent nodal loads: nodal displacements and
// reactions are exact for point loads, couples and linear distributed loads.
// Shear and moment are then taken directly from equilibrium (forces left of the cut).
//
// model = {
//   L, EI, EA?,
//   supports: [{ type: 'pin'|'roller'|'fixed', x }],
//   loads: [
//     { type: 'point', x, P, angle }      // P > 0, angle in degrees from +x, CCW (270 = straight down)
//     { type: 'dist', a, b, w1, w2 }      // downward intensity (kN/m), linear from a to b
//     { type: 'moment', x, M }            // CCW positive (kN·m)
//   ] }
// Sign convention of results: forces up/right positive, reaction moment CCW positive,
// shear V = sum of upward forces left of the cut, bending moment M > 0 = sagging.

export const REACTION_COUNT = { pin: 2, roller: 1, fixed: 3 };
const FIXED_DOFS = { pin: [0, 1], roller: [1], fixed: [0, 1, 2] };

// Gaussian elimination on a Jacobi-scaled copy (unit diagonal); returns null when singular
function solveDense(A, b) {
  const n = b.length; if (!n) return [];
  const D = A.map((row, i) => (row[i] > 0 ? 1 / Math.sqrt(row[i]) : 0));
  if (D.some((v) => !v)) return null; // a free DOF with no stiffness at all
  const M = A.map((row, i) => [...row.map((v, j) => v * D[i] * D[j]), b[i] * D[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-10) return null; // singular: mechanism
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c]; if (!f) continue;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const y = Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let t = M[r][n]; for (let k = r + 1; k < n; k++) t -= M[r][k] * y[k]; y[r] = t / M[r][r]; }
  return y.map((v, i) => v * D[i]);
}

const distIntensity = (d, x) => (d.b === d.a ? d.w1 : d.w1 + ((d.w2 - d.w1) * (x - d.a)) / (d.b - d.a));
// resultant (downward) of a linear load from a up to c, and its moment about the point x
function distLeftOf(d, x) {
  const c = Math.min(x, d.b); if (c <= d.a) return { W: 0, Mx: 0 };
  const T = c - d.a, k = d.b === d.a ? 0 : (d.w2 - d.w1) / (d.b - d.a), D = x - d.a;
  return { W: d.w1 * T + (k * T * T) / 2, Mx: d.w1 * (D * T - (T * T) / 2) + k * ((D * T * T) / 2 - (T ** 3) / 3) };
}

export function solveBeam(model, { divisions = 40 } = {}) {
  const L = model.L, EI = model.EI, EA = model.EA || (EI * 1e4) / (L * L);
  const eps = 1e-9 * L;
  const clamp = (x) => Math.min(L, Math.max(0, x));
  const supports = model.supports.map((s) => ({ ...s, x: clamp(s.x) }));
  const loads = model.loads.map((l) => (l.type === 'dist'
    ? { ...l, a: clamp(Math.min(l.a, l.b)), b: clamp(Math.max(l.a, l.b)), w1: l.a <= l.b ? l.w1 : l.w2, w2: l.a <= l.b ? l.w2 : l.w1 }
    : { ...l, x: clamp(l.x) }));
  const r = supports.reduce((n, s) => n + REACTION_COUNT[s.type], 0);

  // nodes: grid + every key point
  // key points (ends, supports, load points) are nodes; points closer than 1e-4·L are merged.
  // grid points fill the gaps but keep clear of key points, so no element gets tiny.
  const special = [0, L];
  supports.forEach((s) => special.push(s.x));
  loads.forEach((l) => (l.type === 'dist' ? special.push(l.a, l.b) : special.push(l.x)));
  special.sort((p, q) => p - q);
  const keys = []; special.forEach((x) => { if (!keys.length || x - keys[keys.length - 1] > 1e-4 * L) keys.push(x); });
  const gap = (0.3 * L) / divisions;
  for (let i = 1; i < divisions; i++) { const g = (i * L) / divisions; if (keys.every((k) => Math.abs(k - g) > gap)) keys.push(g); }
  keys.sort((p, q) => p - q);
  const xs = keys;
  const node = (x) => { let best = 0; xs.forEach((v, i) => { if (Math.abs(v - x) < Math.abs(xs[best] - x)) best = i; }); return best; };

  const n = xs.length * 3;
  const K = Array.from({ length: n }, () => new Float64Array(n));
  const F = new Float64Array(n);
  for (let e = 0; e < xs.length - 1; e++) {
    const h = xs[e + 1] - xs[e], i = 3 * e, j = 3 * (e + 1);
    const ka = EA / h; K[i][i] += ka; K[i][j] -= ka; K[j][i] -= ka; K[j][j] += ka;
    const c = EI / h ** 3, idx = [i + 1, i + 2, j + 1, j + 2];
    const kb = [[12, 6 * h, -12, 6 * h], [6 * h, 4 * h * h, -6 * h, 2 * h * h], [-12, -6 * h, 12, -6 * h], [6 * h, 2 * h * h, -6 * h, 4 * h * h]];
    for (let p = 0; p < 4; p++) for (let q = 0; q < 4; q++) K[idx[p]][idx[q]] += c * kb[p][q];
    // consistent loads of linear distributed loads that cover this element
    for (const d of loads) {
      if (d.type !== 'dist' || xs[e] < d.a - eps || xs[e + 1] > d.b + eps || d.b - d.a < eps) continue;
      const p1 = -distIntensity(d, xs[e]), p2 = -distIntensity(d, xs[e + 1]); // upward intensity
      F[i + 1] += (h * (7 * p1 + 3 * p2)) / 20; F[i + 2] += (h * h * (3 * p1 + 2 * p2)) / 60;
      F[j + 1] += (h * (3 * p1 + 7 * p2)) / 20; F[j + 2] -= (h * h * (2 * p1 + 3 * p2)) / 60;
    }
  }
  const pointF = []; // {x, Fx, Fy} applied
  const couples = []; // {x, M}
  for (const l of loads) {
    const k = 3 * node(l.x ?? 0);
    if (l.type === 'point') {
      const t = (l.angle * Math.PI) / 180, Fx = l.P * Math.cos(t), Fy = l.P * Math.sin(t);
      F[k] += Fx; F[k + 1] += Fy; pointF.push({ x: xs[node(l.x)], Fx, Fy });
    } else if (l.type === 'moment') { F[k + 2] += l.M; couples.push({ x: xs[node(l.x)], M: l.M }); }
  }

  const fixed = new Map(); // dof -> support index (first one wins)
  supports.forEach((s, si) => FIXED_DOFS[s.type].forEach((o) => { const dof = 3 * node(s.x) + o; if (!fixed.has(dof)) fixed.set(dof, si); }));
  const free = []; for (let d = 0; d < n; d++) if (!fixed.has(d)) free.push(d);
  const base = { r, degree: r - 3, xs };
  if (!supports.length) return { ...base, status: 'mechanism' };
  // axial (u) and bending (v, θ) are uncoupled for a straight beam: solve them apart
  const d = new Float64Array(n);
  for (const part of [free.filter((x) => x % 3 === 0), free.filter((x) => x % 3 !== 0)]) {
    const sol = solveDense(part.map((a) => part.map((b) => K[a][b])), part.map((a) => F[a]));
    if (!sol) return { ...base, status: 'mechanism' };
    part.forEach((dof, i) => (d[dof] = sol[i]));
  }

  const reactions = supports.map((s) => ({ type: s.type, x: xs[node(s.x)], Rx: 0, Ry: 0, M: 0 }));
  for (const [dof, si] of fixed) {
    let R = -F[dof]; for (let k = 0; k < n; k++) R += K[dof][k] * d[k];
    if (Math.abs(R) < 1e-9 * (1 + Math.abs(F[dof]))) R = Math.abs(R) < 1e-9 ? 0 : R;
    reactions[si][['Rx', 'Ry', 'M'][dof % 3]] += R;
  }

  // internal forces from equilibrium of the part left of the cut
  const allF = [...pointF, ...reactions.map((q) => ({ x: q.x, Fx: q.Rx, Fy: q.Ry }))];
  const allC = [...couples, ...reactions.map((q) => ({ x: q.x, M: q.M }))];
  const dists = loads.filter((l) => l.type === 'dist');
  const internal = (x, side) => { // side -1: just left of x, +1: just right
    const inc = (xi) => (side < 0 ? xi < x - eps : xi <= x + eps);
    let V = 0, M = 0, N = 0;
    for (const f of allF) if (inc(f.x)) { V += f.Fy; M += f.Fy * (x - f.x); N -= f.Fx; }
    for (const c of allC) if (inc(c.x)) M -= c.M;
    for (const q of dists) { const { W, Mx } = distLeftOf(q, x); V -= W; M -= Mx; }
    return { V, M, N };
  };
  const diag = [];
  xs.forEach((x) => { const a = internal(x, -1), b = internal(x, 1); diag.push({ x, ...a }); if (Math.abs(a.V - b.V) + Math.abs(a.M - b.M) > 1e-9) diag.push({ x, ...b }); });
  const ext = (key) => diag.reduce((m, p) => (Math.abs(p[key]) > Math.abs(m[key]) ? p : m), diag[0]);
  const defl = xs.map((x, i) => ({ x, v: d[3 * i + 1] }));
  const dmax = defl.reduce((m, p) => (Math.abs(p.v) > Math.abs(m.v) ? p : m), defl[0]);
  return {
    ...base, status: r - 3 > 0 ? 'indeterminate' : 'determinate',
    reactions, diag, defl, internal,
    Vmax: ext('V'), Mmax: ext('M'), Mpos: Math.max(0, ...diag.map((p) => p.M)), Mneg: Math.min(0, ...diag.map((p) => p.M)), dmax,
  };
}

// rectangular section b×h in mm, E in GPa -> EI (kN·m²), I (mm⁴)
export function rectSection(b, h, E_GPa) {
  const I = (b * h ** 3) / 12; // mm^4
  return { I, EI: E_GPa * 1e6 * I * 1e-12 }; // E[kN/m²] = E_GPa·1e6, I[m⁴] = I·1e-12
}
// bending stress (MPa) from M (kN·m), h (mm), I (mm⁴)
export const bendingStress = (M, h, I) => (Math.abs(M) * 1e6 * (h / 2)) / I;
