// pulleys.js: solvers for the playground's pulley stage. SI units (kg, N, m, s).
// Assumptions: massless inextensible rope, frictionless pulley bearings except the
// per-sheave efficiency η of the hoist, g = 9.81 m/s².
export const G = 9.81;

// ---------- block and tackle (hoist) ----------
// n   : rope segments that hold the moving block (1..6)
// pull: 'down' = effort comes down off a fixed sheave; 'up' = effort pulls up straight from the moving block
// dir : 'lift' or 'lower' (constant speed). Each sheave multiplies the tension by η going from
//       the effort into the system when lifting (by 1/η when lowering: friction then helps).
// Rope path (from the effort end): lines 0..L-1 are vertical rope lines; the sheave between
// line j and j+1 is fixed or moving (see sheaveKind). The last line ends at a dead end.
export function tackle({ n, m, mb = 0, eta = 1, pull = 'down', dir = 'lift' }) {
  const W = (m + mb) * G;
  const e = dir === 'lift' ? eta : 1 / eta;
  const k0 = pull === 'down' ? 1 : 0; // pulling down, the effort passes one fixed sheave first
  const ratios = Array.from({ length: n }, (_, i) => e ** (i + k0));
  const F = W / ratios.reduce((a, b) => a + b, 0);
  const T = ratios.map((r) => F * r); // supporting segments, from the effort side
  const lines = pull === 'down' ? [F, ...T] : T; // every vertical rope line, effort first
  const sheaveKind = (j) => (pull === 'down' ? (j % 2 === 0 ? 'fixed' : 'moving') : (j % 2 === 0 ? 'moving' : 'fixed'));
  const sheaves = Array.from({ length: lines.length - 1 }, (_, j) => sheaveKind(j));
  const lastFrom = sheaves.length ? sheaves[sheaves.length - 1] : 'none';
  const deadEnd = lastFrom === 'fixed' || lastFrom === 'none' ? 'moving' : 'fixed';
  const MA = W / F;
  return {
    W, F, T, lines, sheaves, deadEnd,
    fixedCount: sheaves.filter((k) => k === 'fixed').length,
    movingCount: sheaves.filter((k) => k === 'moving').length,
    ideal: W / n, MA, VR: n, efficiency: MA / n, ropePerMeter: n,
    ceiling: pull === 'down' ? W + F : W - F,
  };
}

// ---------- two bodies over one pulley ----------
// side = { kind: 'hang'|'table'|'incline', theta (deg, incline only), m, mus, muk }
// Positive motion: the right body moves away from the pulley (down its side),
// the left body moves toward the pulley.
// mp: pulley mass (solid disk, I/r² = mp/2).
export function sideGeom(side) {
  if (side.kind === 'hang') return { s: 1, c: 0 };
  if (side.kind === 'table') return { s: 0, c: 1 };
  const t = (side.theta * Math.PI) / 180; return { s: Math.sin(t), c: Math.cos(t) };
}
export function connected({ left, right, mp = 0 }) {
  const gl = sideGeom(left), gr = sideGeom(right);
  const NL = left.m * G * gl.c, NR = right.m * G * gr.c;
  const pullR = right.m * G * gr.s, pullL = left.m * G * gl.s; // gravity along each side, away from the pulley
  const drive = pullR - pullL;
  const Fs = left.mus * NL + right.mus * NR, Fk = left.muk * NL + right.muk * NR;
  const Ip = mp / 2, M = left.m + right.m + Ip;
  const base = { NL, NR, drive, Fs, Fk, Ip };
  if (Math.abs(drive) <= Fs + 1e-12) {
    // at rest: each body is in equilibrium with |friction| <= μs N; T is unique only if one side has no friction
    const lo = Math.max(0, pullR - right.mus * NR, pullL - left.mus * NL);
    const hi = Math.min(pullR + right.mus * NR, pullL + left.mus * NL);
    const unique = hi - lo < 1e-9;
    const T = unique ? (lo + hi) / 2 : null;
    return {
      ...base, moving: false, a: 0, TL: T, TR: T, Tmin: lo, Tmax: hi, unique,
      fR: T == null ? null : pullR - T, fL: T == null ? null : T - pullL, // friction on each body, + = toward the pulley side's "positive" direction resisted
    };
  }
  const dir = Math.sign(drive);
  const a = (dir * (Math.abs(drive) - Fk)) / M; // signed
  const TR = pullR - dir * right.muk * NR - right.m * a;
  const TL = left.m * a + pullL + dir * left.muk * NL;
  return { ...base, moving: true, dir, a, TL, TR, fR: dir * right.muk * NR, fL: dir * left.muk * NL, slack: TL < 0 || TR < 0 };
}
