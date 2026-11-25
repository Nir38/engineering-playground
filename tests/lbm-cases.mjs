// Wind tunnel (lattice Boltzmann) checks: an empty tunnel stays uniform, flow past a cylinder is steady
// and symmetric at low Re, and sheds a Kármán vortex street at Re = 100 with St ≈ 0.2
// (unconfined cylinder ≈ 0.16 to 0.17; the tunnel walls here block 1/6 of the height, which raises it).
import { createTunnel, U_IN, sheddingPeriod, frontal, pointInPoly, rotatePoly } from '../js/lbm.js';
export function lbmChecks(check) {
  // empty tunnel
  let T = createTunnel(60, 30); T.setViscosity(0.02); T.reset();
  for (let s = 0; s < 300; s++) T.step();
  let dev = 0, mass = 0; for (let k = 0; k < T.N; k++) { dev = Math.max(dev, Math.abs(T.ux[k] - U_IN) + Math.abs(T.uy[k])); mass += T.rho[k]; }
  check('wind tunnel: empty tunnel stays a uniform stream', dev < 1e-5 && Math.abs(mass / T.N - 1) < 1e-5, String(dev));
  check('wind tunnel: Re sets the viscosity, with a floor for stability', (() => { const t = createTunnel(4, 4); t.setViscosity(1e-6); return t.nu === 0.006 && Math.abs(t.omega - 1 / (3 * 0.006 + 0.5)) < 1e-12; })());
  // cylinder D = 10 in a 100 × 60 tunnel
  const cyl = (Re, steps) => {
    const NX = 100, NY = 60, D = 10, t = createTunnel(NX, NY);
    for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) if ((x - 30) ** 2 + (y - 29.8) ** 2 <= (D / 2) ** 2) t.solid[y * NX + x] = 1;
    t.setViscosity((U_IN * D) / Re); t.reset();
    const hist = []; let fx = 0, fy = 0, n = 0;
    for (let s = 0; s < steps; s++) { t.step(); if (s > steps / 2) { hist.push([s, t.Fy]); fx += t.Fx; fy += t.Fy; n++; } }
    const q = 0.5 * U_IN * U_IN * frontal(t);
    return { CD: fx / n / q, CL: fy / n / q, P: sheddingPeriod(hist), D: frontal(t) };
  };
  const low = cyl(20, 3000);
  check('cylinder Re = 20: steady, no shedding, no mean lift', low.P === null && Math.abs(low.CL) < 0.02, JSON.stringify(low));
  check('cylinder Re = 20: drag coefficient of the right size (2 to 4 with the walls)', low.CD > 2 && low.CD < 4, String(low.CD));
  const hi = cyl(100, 7000), St = hi.P ? hi.D / hi.P / U_IN : 0;
  check('cylinder Re = 100: vortex shedding, St ≈ 0.2', St > 0.15 && St < 0.27, JSON.stringify({ ...hi, St }));
  check('cylinder Re = 100: lower drag than at Re = 20', hi.CD < low.CD && hi.CD > 1, String(hi.CD));
  // geometry helpers
  check('point in polygon and rotation', pointInPoly(1, 1, [[0, 0], [2, 0], [2, 2], [0, 2]]) && !pointInPoly(3, 1, [[0, 0], [2, 0], [2, 2], [0, 2]]) && Math.abs(rotatePoly([[1, 0]], 0, 0, 90)[0][1] - 1) < 1e-12);
}
