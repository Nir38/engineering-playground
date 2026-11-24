// Free-body diagram checks: the answer key grades 100 %, typical mistakes are caught,
// and every solved diagram is in equilibrium (ΣF = 0; ΣM = 0 where points of action are exact).
import { SCENARIOS, grade, answerKey } from '../js/fbd.js';
export function fbdChecks(check, near) {
  const momentOK = { lamp: true, ladder: true, beam: true, spring: true };
  for (const [id, S] of Object.entries(SCENARIOS)) {
    let okKey = true, okEq = true, okM = true;
    for (let t = 0; t < 40; t++) {
      const sc = S.make(S.rand());
      if (!grade(sc, answerKey(sc)).allOk) okKey = false;
      const { values } = sc.solve();
      let Fx = 0, Fy = 0, M = 0;
      sc.expected.forEach((e) => {
        const a = ((e.dir ?? e.axis) * Math.PI) / 180, v = values[e.key];
        const fx = v * Math.cos(a), fy = v * Math.sin(a); Fx += fx; Fy += fy;
        if (e.pt) M += e.pt[0] * fy - (-e.pt[1]) * fx; // r × F with y up
      });
      const scale = Math.max(...Object.values(values).map(Math.abs));
      if (Math.abs(Fx) > 1e-9 * scale || Math.abs(Fy) > 1e-9 * scale) okEq = false;
      if (momentOK[id] && Math.abs(M) > 1e-7 * scale * 400) okM = false;
    }
    check(`FBD ${id}: answer key grades 100%`, okKey);
    check(`FBD ${id}: solution satisfies ΣFx = ΣFy = 0`, okEq);
    if (momentOK[id]) check(`FBD ${id}: solution satisfies ΣM = 0`, okM);
  }
  // the drawn solution: no two arrows lie on top of each other (same line, overlapping lengths)
  {
    const AL = 46, len = (t) => (t === 'W' ? 30 : AL);
    const seg = (q) => { const a = (q.ang * Math.PI) / 180, d = [Math.cos(a), -Math.sin(a)], L = len(q.type); return q.type === 'N' ? [[q.x - d[0] * L, q.y - d[1] * L], [q.x, q.y]] : [[q.x, q.y], [q.x + d[0] * L, q.y + d[1] * L]]; };
    const overlap = (A, B) => {
      const dA = [A[1][0] - A[0][0], A[1][1] - A[0][1]], LA = Math.hypot(...dA), u = [dA[0] / LA, dA[1] / LA];
      const off = (p) => Math.abs((p[0] - A[0][0]) * u[1] - (p[1] - A[0][1]) * u[0]); // distance from A's line
      if (off(B[0]) > 4 || off(B[1]) > 4) return false;
      const t = (p) => (p[0] - A[0][0]) * u[0] + (p[1] - A[0][1]) * u[1], b0 = t(B[0]), b1 = t(B[1]);
      return Math.min(LA, Math.max(b0, b1)) - Math.max(0, Math.min(b0, b1)) > 4;
    };
    let ok = true, where = '';
    for (const [id, S] of Object.entries(SCENARIOS)) for (let k = 0; k < 20; k++) {
      const key = answerKey(S.make(S.rand())).map(seg);
      for (let i = 0; i < key.length; i++) for (let j = i + 1; j < key.length; j++) if (overlap(key[i], key[j])) { ok = false; where = id; }
    }
    check('FBD: no two arrows of a drawn solution lie on top of each other', ok, where);
  }
  // typical mistakes on the incline
  const sc = SCENARIOS.incline.make({ m: 10, th: 30 }), key = answerKey(sc);
  let g = grade(sc, key.filter((q) => q.type !== 'f'));
  check('FBD: a missing friction force is reported', g.items.find((i) => i.key === 'f').status === 'missing' && !g.allOk);
  g = grade(sc, key.map((q) => (q.type === 'N' ? { ...q, ang: 90 } : q)));
  check('FBD: vertical N on an incline is a wrong direction', g.items.find((i) => i.key === 'N').status === 'dir');
  g = grade(sc, key.map((q) => (q.type === 'f' ? { ...q, ang: 210 } : q)));
  check('FBD: friction down the slope is a wrong direction', g.items.find((i) => i.key === 'f').status === 'dir');
  g = grade(sc, [...key, { id: 7, type: 'P', x: 200, y: 150, ang: 30 }]);
  check('FBD: an invented "motion force" is an extra with an explanation', g.extras.length === 1 && g.extras[0].msg.includes('כוח התנועה') && !g.allOk);
  g = grade(sc, key.map((q) => (q.type === 'W' ? { ...q, x: q.x + 80 } : q)));
  check('FBD: weight away from the centre of gravity is a wrong place', g.items.find((i) => i.key === 'W').status === 'place');
  check('FBD: direction tolerance is 20°', grade(sc, key.map((q) => (q.type === 'W' ? { ...q, ang: 285 } : q))).allOk && !grade(sc, key.map((q) => (q.type === 'W' ? { ...q, ang: 295 } : q))).allOk);
  // unknown-sign reactions: either direction along the axis is accepted
  const bm = SCENARIOS.beam.make({ P: 20, c: 2 });
  check('FBD: reaction drawn the opposite way along its axis is accepted', grade(bm, answerKey(bm).map((q) => (q.type === 'R' ? { ...q, ang: q.ang + 180 } : q))).allOk);
  check('FBD: forgetting the horizontal pin reaction is reported', grade(bm, answerKey(bm).filter((q, i) => bm.expected[i].key !== 'Ax')).items.find((i) => i.key === 'Ax').status === 'missing');
  // ladder: no friction at the smooth wall
  const ld = SCENARIOS.ladder.make({ m: 10, be: 60 }), top = ld.expected.find((e) => e.key === 'N2').pt;
  const gl = grade(ld, [...answerKey(ld), { id: 9, type: 'f', x: top[0], y: top[1], ang: 90 }]);
  check('FBD: friction at a smooth wall is an extra', gl.extras.length === 1 && !gl.allOk);
  check('FBD ladder: N₂ = W/(2 tanβ)', near(ld.solve().values.N2, 10 * 9.81 / (2 * Math.tan(Math.PI / 3)), 1e-12));
  check('FBD pull: N = mg − T sinα and f = T cosα', (() => { const p = SCENARIOS.pull.make({ m: 20, al: 30, mu: 0.3 }).solve().values; return near(p.f, p.T * Math.cos(Math.PI / 6), 1e-12) && near(p.N, 20 * 9.81 - p.T * 0.5, 1e-12); })());
}
