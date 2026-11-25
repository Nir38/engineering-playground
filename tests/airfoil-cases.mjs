// Wing (Joukowski airfoil) checks: lift from Kutta–Joukowski vs integrating the surface pressure,
// zero drag (d'Alembert), the Kutta condition, thin-airfoil theory and streamlines.
import { makeAirfoil, paramsFrom } from '../js/airfoil.js';
export function airfoilChecks(check, near) {
  // pressure force on the surface, per ½ρV²: F = −∮ Cp n ds (outward normal n), in wind axes
  const pressureForce = (a) => {
    const P = a.surface(20000); let fx = 0, fy = 0;
    for (let i = 0; i < P.length; i++) {
      const p = P[i], q = P[(i + 1) % P.length], dx = q.x - p.x, dy = q.y - p.y, cp = (p.cp + q.cp) / 2;
      // counter-clockwise outline: outward normal · ds = (dy, −dx)
      fx -= cp * dy; fy -= cp * -dx;
    }
    const c = Math.cos(a.alpha), s = Math.sin(a.alpha);
    return { drag: fx * c + fy * s, lift: -fx * s + fy * c };
  };
  for (const [tc, fc, al] of [[0.12, 0, 5], [0.12, 0.04, 3], [0.06, 0.02, -4], [0.15, -0.03, 8]]) {
    const a = makeAirfoil({ ...paramsFrom(tc, fc), alphaDeg: al });
    const F = pressureForce(a);
    check(`wing t/c ${tc}, f/c ${fc}, α ${al}°: pressure lift = Kutta–Joukowski`, near(F.lift / a.chord, a.CL, 2e-3), `${F.lift / a.chord} vs ${a.CL}`);
    check(`wing t/c ${tc}, f/c ${fc}, α ${al}°: no drag in ideal flow (d'Alembert)`, Math.abs(F.drag / a.chord) < 2e-3 * Math.max(1, Math.abs(a.CL)), String(F.drag / a.chord));
  }
  const sym = makeAirfoil({ ...paramsFrom(0.12, 0), alphaDeg: 0 });
  check('symmetric wing at α = 0: no lift', Math.abs(sym.CL) < 1e-12 && Math.abs(sym.alpha0Deg) < 1e-12);
  const thin = makeAirfoil({ eps: 1e-4, eta: 0, alphaDeg: 5 });
  check('thin flat wing: C_L = 2π sin α', near(thin.CL, 2 * Math.PI * Math.sin((5 * Math.PI) / 180), 2e-3));
  const cam = makeAirfoil({ ...paramsFrom(0.12, 0.04), alphaDeg: 0 });
  check('cambered wing: lift at α = 0, zero-lift angle below 0', cam.CL > 0 && cam.alpha0Deg < 0 && near(makeAirfoil({ ...paramsFrom(0.12, 0.04), alphaDeg: cam.alpha0Deg }).CL + 1, 1, 1e-9));
  check('slider shape is close to the asked t/c and f/c', Math.abs(cam.tc - 0.12) < 0.012 && Math.abs(cam.fc - 0.04) < 0.006, `${cam.tc} ${cam.fc}`);
  const inv = makeAirfoil({ ...paramsFrom(0.12, -0.04), alphaDeg: -4 });
  check('upside-down wing (race car): negative lift = downforce', inv.CL < 0);
  // Kutta condition: finite speed at the trailing edge; one stagnation point Cp = 1 near the nose
  const w = makeAirfoil({ ...paramsFrom(0.12, 0.02), alphaDeg: 6 });
  const P = w.surface(4000), te = [P[0], P[P.length - 1]];
  check('Kutta: speed at the trailing edge stays finite', te.every((p) => p.cp > -3 && p.cp < 1.0001));
  check('stagnation point: Cp max = 1', near(Math.max(...P.map((p) => p.cp)), 1, 1e-3));
  check('suction on top: lowest Cp on the upper surface', w.upper.some((p) => p.cp === w.cpMin) || Math.min(...w.upper.map((p) => p.cp)) <= Math.min(...w.lower.map((p) => p.cp)));
  // far field: the free stream; streamlines keep ψ constant and never enter the body
  const far = w.velocity(w.inverse([60, 30]));
  check('far away the flow is the free stream (speed 1, at α)', near(Math.hypot(...far), 1, 1e-2) && Math.abs(Math.atan2(far[1], far[0]) - w.alpha) < 1e-2);
  const z0 = [-6 * Math.cos(w.alpha) - 0.6 * -Math.sin(w.alpha), -6 * Math.sin(w.alpha) + 0.6 * Math.cos(w.alpha)], zeta0 = w.inverse(z0), line = w.streamline(zeta0);
  const psis = line.map(([x, y]) => w.psi(w.inverse([x, y]))), spread = Math.max(...psis) - Math.min(...psis);
  check('streamline: ψ stays constant along it', spread < 2e-3, String(spread));
  check('streamline: reaches the far side, outside the body', line[line.length - 1][0] > 3.6 && line.every(([x, y]) => w.inverse([x, y]) !== null));
  check('inside the wing: no flow', w.cpAt([0, 0.01]) === null && w.cpAt([0, 1.5]) !== null);
}
