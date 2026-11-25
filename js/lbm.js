// lbm.js: a small 2D wind tunnel, lattice Boltzmann method (D2Q9, BGK collision).
// Lattice units: cell size 1, time step 1, inlet speed U (0.1), density ≈ 1, pressure p = ρ/3.
// Viscosity ν = (1/ω − ½)/3, so the Reynolds number Re = U·L/ν picks ω.
// Inlet (left), top and bottom: free stream (equilibrium at U). Outlet (right): zero gradient.
// Solid cells: half-way bounce-back; the force on them comes from the momentum exchange.
// Checked in tests/lbm-cases.mjs.

const EX = [0, 1, 0, -1, 0, 1, -1, -1, 1], EY = [0, 0, 1, 0, -1, 1, 1, -1, -1];
const WT = [4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36];
const OPP = [0, 3, 4, 1, 2, 7, 8, 5, 6];
export const U_IN = 0.1, NU_MIN = 0.006; // below NU_MIN plain BGK becomes unstable at this resolution

export function createTunnel(NX, NY) {
  const N = NX * NY;
  let F = Array.from({ length: 9 }, () => new Float32Array(N)), G = Array.from({ length: 9 }, () => new Float32Array(N));
  const rho = new Float32Array(N), ux = new Float32Array(N), uy = new Float32Array(N);
  const solid = new Uint8Array(N);
  const T = { NX, NY, N, rho, ux, uy, solid, omega: 1, nu: 1 / 6, steps: 0, Fx: 0, Fy: 0 };
  const feq = (i, r, u, v) => { const cu = 3 * (EX[i] * u + EY[i] * v); return WT[i] * r * (1 + cu + 0.5 * cu * cu - 1.5 * (u * u + v * v)); };
  const FS = Array.from({ length: 9 }, (_, i) => feq(i, 1, U_IN, 0)); // free-stream populations
  const OFF = EX.map((ex, i) => -(ex + EY[i] * NX)); // pull from k + OFF[i]
  let inner = new Int32Array(0); // fluid cells away from the borders
  T.setViscosity = (nu) => { T.nu = Math.max(NU_MIN, nu); T.omega = 1 / (3 * T.nu + 0.5); };
  T.reset = () => {
    for (let k = 0; k < N; k++) { for (let i = 0; i < 9; i++) F[i][k] = FS[i]; rho[k] = 1; ux[k] = solid[k] ? 0 : U_IN; uy[k] = 0; }
    const list = []; for (let y = 1; y < NY - 1; y++) for (let x = 1; x < NX - 1; x++) if (!solid[y * NX + x]) list.push(y * NX + x);
    inner = Int32Array.from(list); T.steps = 0;
  };
  T.step = () => {
    const om = T.omega, [f0, f1, f2, f3, f4, f5, f6, f7, f8] = F, w0 = 4 / 9, w1 = 1 / 9, w2 = 1 / 36;
    // collide every fluid cell and keep the macroscopic fields
    for (let k = 0; k < N; k++) {
      if (solid[k]) continue;
      const a0 = f0[k], a1 = f1[k], a2 = f2[k], a3 = f3[k], a4 = f4[k], a5 = f5[k], a6 = f6[k], a7 = f7[k], a8 = f8[k];
      const r = a0 + a1 + a2 + a3 + a4 + a5 + a6 + a7 + a8, ir = 1 / r;
      const u = (a1 - a3 + a5 - a6 - a7 + a8) * ir, v = (a2 - a4 + a5 + a6 - a7 - a8) * ir;
      rho[k] = r; ux[k] = u; uy[k] = v;
      const q = 1 - 1.5 * (u * u + v * v), u3 = 3 * u, v3 = 3 * v, r1 = w1 * r, r2 = w2 * r;
      const p5 = u3 + v3, p6 = v3 - u3;
      f0[k] = a0 + om * (w0 * r * q - a0);
      f1[k] = a1 + om * (r1 * (q + u3 + 0.5 * u3 * u3) - a1);
      f3[k] = a3 + om * (r1 * (q - u3 + 0.5 * u3 * u3) - a3);
      f2[k] = a2 + om * (r1 * (q + v3 + 0.5 * v3 * v3) - a2);
      f4[k] = a4 + om * (r1 * (q - v3 + 0.5 * v3 * v3) - a4);
      f5[k] = a5 + om * (r2 * (q + p5 + 0.5 * p5 * p5) - a5);
      f7[k] = a7 + om * (r2 * (q - p5 + 0.5 * p5 * p5) - a7);
      f6[k] = a6 + om * (r2 * (q + p6 + 0.5 * p6 * p6) - a6);
      f8[k] = a8 + om * (r2 * (q - p6 + 0.5 * p6 * p6) - a8);
    }
    // stream (pull) with bounce-back on solid neighbours; sum the momentum given to the solid
    let Fx = 0, Fy = 0;
    for (let i = 0; i < 9; i++) {
      const src = F[i], dst = G[i], back = F[OPP[i]], off = OFF[i], ex = 2 * EX[OPP[i]], ey = 2 * EY[OPP[i]];
      for (let n = 0; n < inner.length; n++) {
        const k = inner[n], s = k + off;
        if (solid[s]) { const fo = back[k]; dst[k] = fo; Fx += ex * fo; Fy += ey * fo; } else dst[k] = src[s];
      }
    }
    // borders: free stream at the inlet, top and bottom; zero gradient at the outlet
    for (let i = 0; i < 9; i++) {
      const d = G[i], fs = FS[i];
      for (let y = 0; y < NY; y++) { d[y * NX] = fs; d[y * NX + NX - 1] = d[y * NX + NX - 2]; }
      for (let x = 0; x < NX; x++) { d[x] = fs; d[(NY - 1) * NX + x] = fs; }
    }
    [F, G] = [G, F];
    T.Fx = Fx; T.Fy = Fy; T.steps++;
  };
  // obstacles changed without restarting the flow: new solid cells stop, freed cells get free stream
  T.updateSolid = () => {
    for (let k = 0; k < N; k++) if (solid[k]) { ux[k] = 0; uy[k] = 0; } else if (rho[k] === 1 && ux[k] === 0 && uy[k] === 0) for (let i = 0; i < 9; i++) F[i][k] = FS[i];
    const list = []; for (let y = 1; y < NY - 1; y++) for (let x = 1; x < NX - 1; x++) if (!solid[y * NX + x]) list.push(y * NX + x);
    inner = Int32Array.from(list);
  };
  T.curl = (k) => (uy[k + 1] - uy[k - 1]) - (ux[k + NX] - ux[k - NX]);
  T.reset();
  return T;
}

// obstacles in grid cells
export const pointInPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
export function rotatePoly(P, cx, cy, deg) { const t = (deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t); return P.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); }
// frontal height (what the wind sees) of the solid cells
export function frontal(T) { let lo = Infinity, hi = -Infinity; for (let k = 0; k < T.N; k++) if (T.solid[k]) { const y = Math.floor(k / T.NX); lo = Math.min(lo, y); hi = Math.max(hi, y); } return hi >= lo ? hi - lo + 1 : 0; }

// lift sign changes -> shedding period (in steps), from a list of [step, Fy]
export function sheddingPeriod(hist) {
  if (hist.length < 50) return null;
  const mean = hist.reduce((s, [, v]) => s + v, 0) / hist.length, amp = Math.max(...hist.map(([, v]) => Math.abs(v - mean)));
  if (amp < 1e-4) return null;
  const ups = []; for (let i = 1; i < hist.length; i++) if (hist[i - 1][1] < mean && hist[i][1] >= mean) ups.push(hist[i][0]);
  if (ups.length < 3) return null;
  return (ups[ups.length - 1] - ups[0]) / (ups.length - 1);
}
