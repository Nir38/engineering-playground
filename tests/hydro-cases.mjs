// Hydrostatics checks: Archimedes, floating draft, spherical cap vs integration, metacentric height,
// F = ρ g h_c A and y_cp = y_c + I/(y_c A), and layered fluids vs numerical integration.
import { submerged, bodyForces, equilibrium, metacentric, pressureAt, gateForce, bodyVolume, G } from '../js/hydro.js';
export function hydroChecks(check, near) {
  // floating box: draft = h ρo/ρf
  const box = { shape: 'box', a: 0.4, b: 0.3, h: 0.2, rho: 600 };
  let e = equilibrium(box, 1000, 1);
  check('box floats with draft h·ρo/ρf', e.state === 'float' && near(e.s, 0.2 * 0.6, 1e-9));
  check('floating: buoyancy = weight', near(bodyForces(box, 1000, e.z).Fb, bodyForces(box, 1000, e.z).W, 1e-9));
  // ice in sea water: 917/1025 below the surface
  const ice = { shape: 'cyl', r: 0.1, h: 0.5, rho: 917 };
  e = equilibrium(ice, 1025, 1);
  check('ice in sea water: submerged fraction 917/1025 = 0.895', near(e.s / 0.5, 917 / 1025, 1e-9) && near(917 / 1025, 0.8946, 1e-4));
  // sphere at half density floats exactly half submerged
  const sph = { shape: 'sphere', r: 0.1, rho: 500 };
  e = equilibrium(sph, 1000, 1);
  check('sphere with ρo = ρf/2 floats at its centre', near(e.s, 0.1, 1e-9));
  // spherical cap volume and centroid vs numerical integration
  let ok = true;
  for (const s of [0.01, 0.05, 0.1, 0.13, 0.2]) {
    const n = 20000, dz = s / n; let V = 0, Mz = 0;
    for (let i = 0; i < n; i++) { const z = (i + 0.5) * dz, A = Math.PI * (2 * 0.1 * z - z * z); V += A * dz; Mz += A * z * dz; }
    const c = submerged(sph, s);
    if (!near(c.V, V, 1e-6) || !near(c.zc, Mz / V, 1e-6)) ok = false;
  }
  check('spherical cap: volume and centroid = integration', ok);
  // sinking: steel block rests on the bottom, N = W - Fb
  const steel = { shape: 'box', a: 0.1, b: 0.1, h: 0.1, rho: 7850 };
  e = equilibrium(steel, 1000, 0.5);
  check('steel sinks, N = (ρs - ρw) g V', e.state === 'bottom' && near(e.N, (7850 - 1000) * G * 1e-3, 1e-9));
  check('apparent weight under water = W - ρ g V', near(bodyForces(steel, 1000, 0.3).hold, (7850 - 1000) * G * 1e-3, 1e-9));
  check('above the surface: no buoyancy', bodyForces(steel, 1000, -0.05).Fb === 0);
  // Archimedes for each shape fully submerged
  check('fully submerged: Fb = ρ g V (all shapes)', [box, ice, sph].every((b) => near(bodyForces(b, 1000, 5).Fb, 1000 * G * bodyVolume(b), 1e-12)));
  // metacentric height: wide flat box stable, tall narrow box unstable
  let m = metacentric({ shape: 'box', a: 1, b: 0.4, h: 0.2 }, 0.1);
  check('flat box: GM = d/2 + b²/(12d) - h/2 = 0.0833 m (stable)', near(m.GM, 0.05 + 0.16 / 1.2 - 0.1, 1e-9) && m.GM > 0);
  m = metacentric({ shape: 'box', a: 0.1, b: 0.1, h: 0.5 }, 0.25);
  check('tall box: GM < 0 (tips over)', near(m.GM, 0.125 + 0.01 / 3 - 0.25, 1e-9) && m.GM < 0);
  m = metacentric({ shape: 'cyl', r: 0.2, h: 0.3 }, 0.1);
  check('cylinder: BM = r²/(4d)', near(m.BM, 0.04 / 0.4, 1e-9));
  // pressure
  check('p = ρ g h (10 m of water = 98.1 kPa)', near(pressureAt(10, { rho2: 1000 }), 98100, 1e-12));
  check('two layers: p = ρ1 g t + ρ2 g (z - t)', near(pressureAt(3, { rho1: 900, t: 1, rho2: 1000 }), 900 * G + 2000 * G, 1e-12));
  // vertical gate fully submerged, one fluid: F = ρ g h_c A, y_cp = y_c + I/(y_c A)
  const L1 = { rho1: 0, t: 0, rho2: 1000 };
  let g = gateForce({ D: 5, theta: 90, u1: 1, u2: 3, b: 2, layers: L1 }); // gate depths 2..4 m, h_c = 3
  check('vertical gate: F = ρ g h_c A', near(g.F, 1000 * G * 3 * 4, 1e-12));
  check('vertical gate: z_cp = h_c + I/(h_c A)', near(g.zcp, 3 + (2 * 8 / 12) / (3 * 4), 1e-12));
  // inclined gate (60°): distances measured along the wall from the surface
  g = gateForce({ D: 4, theta: 60, u1: 0.5, u2: 2.5, b: 1.5, layers: L1 });
  const sn = Math.sin(Math.PI / 3), yTop = (4 - 2.5 * sn) / sn, Lg = 2, yc = yTop + Lg / 2, A = 1.5 * Lg;
  check('inclined gate: F = ρ g h_c A', near(g.F, 1000 * G * yc * sn * A, 1e-12));
  check('inclined gate: y_cp = y_c + I/(y_c A) along the wall', near((4 / sn) - g.ucp, yc + (1.5 * Lg ** 3 / 12) / (yc * A), 1e-12));
  // gate reaching above the surface, and two layers: compare with numerical integration
  const numeric = (D, th, u1, u2, b, layers) => {
    const s = Math.sin(th * Math.PI / 180), n = 200000, du = (u2 - u1) / n; let F = 0, M = 0;
    for (let i = 0; i < n; i++) { const u = u1 + (i + 0.5) * du, p = pressureAt(D - u * s, layers); F += p * du; M += p * u * du; }
    return { F: F * b, ucp: M / F };
  };
  ok = true;
  for (const [D, th, u1, u2, layers] of [[2, 90, 0, 3, L1], [3, 45, 0.5, 5, { rho1: 900, t: 1, rho2: 1000 }], [4, 70, 1, 3.5, { rho1: 800, t: 2.5, rho2: 13600 }]]) {
    const a = gateForce({ D, theta: th, u1, u2, b: 1, layers }), n = numeric(D, th, u1, u2, 1, layers);
    if (!near(a.F, n.F, 1e-6) || !near(a.ucp, n.ucp, 1e-6)) ok = false;
  }
  check('gate above the surface / two layers: exact = numerical integration', ok);
  check('gate fully above the liquid: no force', gateForce({ D: 1, theta: 90, u1: 2, u2: 3, b: 1, layers: L1 }).F === 0);
}
