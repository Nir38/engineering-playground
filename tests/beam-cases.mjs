// Textbook beam cases (Gere & Goodno, Hibbeler appendix tables) used by run-tests.mjs.
import { solveBeam, rectSection, bendingStress } from '../js/beam.js';
export function beamChecks(check, near) {
  const L = 6, EI = 10000, w = 10, P = 20;
  const S = (supports, loads, l = L) => solveBeam({ L: l, EI, supports, loads });
  const pin = (x) => ({ type: 'pin', x }), rol = (x) => ({ type: 'roller', x }), fix = (x) => ({ type: 'fixed', x });
  const down = (x, p = P) => ({ type: 'point', x, P: p, angle: 270 }), udl = (a, b, q = w) => ({ type: 'dist', a, b, w1: q, w2: q });
  const R = (s, i, k = 'Ry') => s.reactions[i][k];
  let s;
  // simply supported, UDL
  s = S([pin(0), rol(L)], [udl(0, L)]);
  check('beam SS-UDL status', s.status === 'determinate' && s.degree === 0);
  check('beam SS-UDL R = wL/2', near(R(s, 0), w * L / 2, 1e-9) && near(R(s, 1), w * L / 2, 1e-9));
  check('beam SS-UDL Mmax = wL²/8', near(s.Mmax.M, w * L * L / 8, 1e-9) && near(s.Mmax.x, L / 2, 1e-9));
  check('beam SS-UDL δ = 5wL⁴/384EI', near(-s.dmax.v, 5 * w * L ** 4 / (384 * EI), 1e-9));
  check('beam SS-UDL V(0+) = wL/2', near(s.internal(0, 1).V, w * L / 2, 1e-9));
  // simply supported, central point load
  s = S([pin(0), rol(L)], [down(L / 2)]);
  check('beam SS-P Mmax = PL/4', near(s.Mmax.M, P * L / 4, 1e-9));
  check('beam SS-P δ = PL³/48EI', near(-s.dmax.v, P * L ** 3 / (48 * EI), 1e-9));
  // simply supported, off-centre point load: R1 = Pb/L, M = Pab/L
  s = S([pin(0), rol(L)], [down(2)]);
  check('beam SS-P(a) R1 = Pb/L', near(R(s, 0), P * 4 / L, 1e-9));
  check('beam SS-P(a) M = Pab/L', near(s.Mmax.M, P * 2 * 4 / L, 1e-9));
  // simply supported, triangular load 0 -> w: R1 = wL/6, R2 = wL/3, Mmax = wL²/(9√3) at L/√3
  s = S([pin(0), rol(L)], [{ type: 'dist', a: 0, b: L, w1: 0, w2: w }], L);
  check('beam SS-tri R1 = wL/6, R2 = wL/3', near(R(s, 0), w * L / 6, 1e-9) && near(R(s, 1), w * L / 3, 1e-9));
  const Mt = Math.max(...Array.from({ length: 2001 }, (_, i) => s.internal(i * L / 2000, 1).M));
  check('beam SS-tri Mmax = wL²/(9√3)', near(Mt, w * L * L / (9 * Math.sqrt(3)), 1e-6));
  check('beam SS-tri δmax = 0.00652 wL⁴/EI', near(Math.max(...s.defl.map((p) => -p.v)), 0.00652 * w * L ** 4 / EI, 2e-3));
  // simply supported, couple M0 at the left end: R = M0/L, δ at mid = M0L²/16EI
  s = S([pin(0), rol(L)], [{ type: 'moment', x: 0, M: 30 }]);
  check('beam SS-couple R = M0/L', near(Math.abs(R(s, 0)), 30 / L, 1e-9));
  check('beam SS-couple δ(L/2) = M0L²/16EI', near(Math.abs(s.defl.find((p) => Math.abs(p.x - L / 2) < 1e-9).v), 30 * L * L / (16 * EI), 1e-9));
  // cantilever, end load
  s = S([fix(0)], [down(L)]);
  check('beam cantilever-P R = P, M = PL', near(R(s, 0), P, 1e-9) && near(R(s, 0, 'M'), P * L, 1e-9));
  check('beam cantilever-P Mmax = -PL (hogging)', near(s.Mmax.M, -P * L, 1e-9));
  check('beam cantilever-P δ = PL³/3EI', near(-s.dmax.v, P * L ** 3 / (3 * EI), 1e-9));
  // cantilever, UDL
  s = S([fix(0)], [udl(0, L)]);
  check('beam cantilever-UDL M = wL²/2, δ = wL⁴/8EI', near(R(s, 0, 'M'), w * L * L / 2, 1e-9) && near(-s.dmax.v, w * L ** 4 / (8 * EI), 1e-9));
  // cantilever fixed at the right end (mirror)
  s = S([fix(L)], [down(0)]);
  check('beam cantilever (right) M = -PL', near(R(s, 0, 'M'), -P * L, 1e-9) && near(R(s, 0), P, 1e-9));
  // propped cantilever, UDL: R_roller = 3wL/8, M_fixed = wL²/8, M+ = 9wL²/128
  s = S([fix(0), rol(L)], [udl(0, L)]);
  check('beam propped status', s.status === 'indeterminate' && s.degree === 1);
  check('beam propped R = 3wL/8', near(R(s, 1), 3 * w * L / 8, 1e-9));
  check('beam propped M = wL²/8', near(R(s, 0, 'M'), w * L * L / 8, 1e-9));
  check('beam propped M+ = 9wL²/128', near(s.Mpos, 9 * w * L * L / 128, 1e-6));
  // fixed-fixed, UDL: M_end = wL²/12, M_mid = wL²/24, δ = wL⁴/384EI
  s = S([fix(0), fix(L)], [udl(0, L)]);
  check('beam fixed-fixed UDL', near(s.Mneg, -w * L * L / 12, 1e-9) && near(s.Mpos, w * L * L / 24, 1e-9) && near(-s.dmax.v, w * L ** 4 / (384 * EI), 1e-9));
  // fixed-fixed, central point: M = PL/8, δ = PL³/192EI
  s = S([fix(0), fix(L)], [down(L / 2)]);
  check('beam fixed-fixed P', near(s.Mpos, P * L / 8, 1e-9) && near(-s.dmax.v, P * L ** 3 / (192 * EI), 1e-9));
  check('beam fixed-fixed degree 3', s.degree === 3);
  // two equal spans, UDL: middle reaction 5wl/4, end reactions 3wl/8, M over support -wl²/8
  s = S([pin(0), rol(L / 2), rol(L)], [udl(0, L)]);
  const l = L / 2;
  check('beam 2-span R = 3wl/8, 5wl/4', near(R(s, 0), 3 * w * l / 8, 1e-9) && near(R(s, 1), 5 * w * l / 4, 1e-9) && near(R(s, 2), 3 * w * l / 8, 1e-9));
  check('beam 2-span M support = -wl²/8', near(s.Mneg, -w * l * l / 8, 1e-9));
  // overhang: supports at 0 and 4 on a 6 m beam, load at the tip: R2 = P·6/4, R1 = -P·2/4
  s = S([pin(0), rol(4)], [down(6)]);
  check('beam overhang reactions', near(R(s, 1), P * 6 / 4, 1e-9) && near(R(s, 0), -P * 2 / 4, 1e-9) && near(s.Mmax.M, -P * 2, 1e-9));
  // inclined force: horizontal part goes to the pin only
  s = S([pin(0), rol(L)], [{ type: 'point', x: 3, P: 10, angle: 300 }]);
  check('beam inclined force Rx', near(R(s, 0, 'Rx'), -10 * Math.cos(300 * Math.PI / 180), 1e-9) && R(s, 1, 'Rx') === 0);
  check('beam inclined force: N = -Rx(pin) between the pin and the load', near(s.internal(1, 1).N, -R(s, 0, 'Rx'), 1e-9) && Math.abs(s.internal(5, 1).N) < 1e-9);
  // mechanisms
  check('beam mechanism: single pin', S([pin(0)], [down(3)]).status === 'mechanism');
  check('beam mechanism: two rollers', S([rol(0), rol(L)], [down(3)]).status === 'mechanism');
  check('beam mechanism: pin+roller same point', S([pin(2), rol(2)], [down(3)]).status === 'mechanism');
  check('beam mechanism: no supports', S([], [down(3)]).status === 'mechanism');
  check('beam unstable count but 3 reactions: 3 rollers', S([rol(0), rol(3), rol(L)], [down(2)]).status === 'mechanism');
  // random equilibrium: ΣFy = 0, ΣM = 0, V and M vanish beyond the right end, mesh independence
  let okEq = true, okMesh = true;
  for (let t = 0; t < 300; t++) { // positions snap to 5 cm, as in the app
    const rnd = (a, b) => a + Math.random() * (b - a), pos = (a, b) => Math.round(rnd(a, b) / 0.05) * 0.05, types = ['pin', 'roller', 'fixed'];
    const sup = [{ type: types[t % 3], x: pos(0, 2) }, { type: 'roller', x: pos(3, L) }];
    if (t % 4 === 0) sup.push({ type: 'roller', x: pos(2, 3) });
    const a = pos(0, 3), b = pos(3, L);
    const lds = [{ type: 'point', x: pos(0, L), P: rnd(1, 30), angle: rnd(200, 340) }, { type: 'dist', a, b, w1: rnd(0, 10), w2: rnd(0, 10) }, { type: 'moment', x: pos(0, L), M: rnd(-20, 20) }];
    const s1 = solveBeam({ L, EI, supports: sup, loads: lds }), s2 = solveBeam({ L, EI, supports: sup, loads: lds }, { divisions: 37 });
    if (s1.status === 'mechanism') continue;
    const end = s1.internal(L, 1);
    if (Math.abs(end.V) > 1e-7 || Math.abs(end.M) > 1e-7 || Math.abs(end.N) > 1e-7) okEq = false;
    s1.reactions.forEach((q, i) => { ['Rx', 'Ry', 'M'].forEach((k) => { if (Math.abs(q[k] - s2.reactions[i][k]) > 1e-7 * (1 + Math.abs(q[k]))) okMesh = false; }); });
  }
  check('beam random: V, M, N vanish past the end (300 cases)', okEq);
  check('beam random: reactions independent of the mesh (exact elements)', okMesh);
  // section helpers
  const sec = rectSection(100, 200, 200);
  check('rect I = bh³/12', near(sec.I, 100 * 200 ** 3 / 12, 1e-12));
  check('rect EI in kN·m²', near(sec.EI, 13333.33, 1e-6));
  check('σ = Mc/I', near(bendingStress(45, 200, sec.I), 45e6 * 100 / sec.I, 1e-12) && near(bendingStress(45, 200, sec.I), 67.5, 1e-9));
}
