// diagrams.js: original SVG drawings, drawn in code so they are sharp on a
// phone, follow light/dark mode, and can be drawn to the numbers of a question.
// Colors come from CSS classes defined in style.css (d-*), never hard-coded.

const svg = (w, h, body, label = '') =>
  `<svg class="diagram" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${defs}${body}</svg>`;

const defs = `<defs>
<marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-load-fill"/></marker>
<marker id="arrm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-muted-fill"/></marker>
<marker id="arra" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-accent-fill"/></marker>
<pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="d-muted" stroke-width="1.2"/></pattern>
</defs>`;

const t = (x, y, s, cls = 'd-text', anchor = 'middle') =>
  `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${s}</text>`;
const line = (x1, y1, x2, y2, cls = 'd-line', extra = '') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" ${extra}/>`;
const arrow = (x1, y1, x2, y2, cls = 'd-load', m = 'arr') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" marker-end="url(#${m})"/>`;

const wall = (x, y1, y2, side = 'left') => {
  const w = 12;
  const rx = side === 'left' ? x - w : x;
  return `<rect x="${rx}" y="${y1}" width="${w}" height="${y2 - y1}" fill="url(#hatch)"/>` + line(x, y1, x, y2, 'd-line');
};
const pin = (x, y) =>
  `<path d="M${x},${y} L${x - 9},${y + 14} L${x + 9},${y + 14} Z" class="d-support"/>` +
  line(x - 13, y + 16, x + 13, y + 16, 'd-line');
const roller = (x, y) =>
  `<path d="M${x},${y} L${x - 9},${y + 12} L${x + 9},${y + 12} Z" class="d-support"/>` +
  `<circle cx="${x - 5}" cy="${y + 15}" r="2.6" class="d-support"/><circle cx="${x + 5}" cy="${y + 15}" r="2.6" class="d-support"/>` +
  line(x - 13, y + 18.5, x + 13, y + 18.5, 'd-line');

const udl = (x1, x2, yTop, yBeam, n = 8) => {
  let s = line(x1, yTop, x2, yTop, 'd-load');
  for (let i = 0; i <= n; i++) {
    const x = x1 + ((x2 - x1) * i) / n;
    s += arrow(x, yTop, x, yBeam - 2);
  }
  return s;
};

// ---------- Beams ----------
// type: cant-point | cant-udl | ss-center | ss-udl ; opts.diagrams adds V and M plots
export function beam(type, opts = {}) {
  const L = opts.L || 'L';
  const load = opts.load || (type.endsWith('udl') ? 'w' : 'P');
  const x0 = 40, x1 = 280, yb = 60, bh = 10;
  let s = `<rect x="${x0}" y="${yb}" width="${x1 - x0}" height="${bh}" class="d-beam"/>`;
  if (type.startsWith('cant')) {
    s += wall(x0, yb - 30, yb + 40);
  } else {
    s += pin(x0, yb + bh) + roller(x1, yb + bh);
  }
  if (type === 'cant-point') { s += arrow(x1, yb - 38, x1, yb - 2) + t(x1, yb - 43, load, 'd-text-load'); }
  if (type === 'ss-center') { const xm = (x0 + x1) / 2; s += arrow(xm, yb - 38, xm, yb - 2) + t(xm, yb - 43, load, 'd-text-load'); }
  if (type.endsWith('udl')) { s += udl(x0, x1, yb - 26, yb) + t((x0 + x1) / 2, yb - 32, load, 'd-text-load'); }
  // dimension line
  const yd = yb + 44;
  s += arrow((x0 + x1) / 2, yd, x0, yd, 'd-muted', 'arrm') + arrow((x0 + x1) / 2, yd, x1, yd, 'd-muted', 'arrm');
  s += `<rect x="${(x0 + x1) / 2 - 22}" y="${yd - 10}" width="44" height="16" class="d-bg"/>` + t((x0 + x1) / 2, yd + 4, L);
  let h = 120;
  if (opts.diagrams) {
    const plot = (yAxis, fn, name, fill) => {
      let p = `M${x0},${yAxis}`;
      const N = 80;
      let maxAbs = 0;
      const vals = [];
      for (let i = 0; i <= N; i++) { const v = fn(i / N); vals.push(v); maxAbs = Math.max(maxAbs, Math.abs(v)); }
      vals.forEach((v, i) => { p += ` L${x0 + ((x1 - x0) * i) / N},${yAxis - (v / (maxAbs || 1)) * 28}`; });
      p += ` L${x1},${yAxis} Z`;
      return `<path d="${p}" class="${fill}"/>` + line(x0, yAxis, x1, yAxis, 'd-muted') + t(x0 - 8, yAxis + 4, name, 'd-text', 'end');
    };
    const V = {
      'cant-point': () => 1, 'cant-udl': (u) => 1 - u,
      'ss-center': (u) => (u < 0.5 ? 0.5 : -0.5), 'ss-udl': (u) => 0.5 - u,
    }[type];
    const M = {
      'cant-point': (u) => -(1 - u), 'cant-udl': (u) => -((1 - u) ** 2),
      'ss-center': (u) => (u <= 0.5 ? u : 1 - u), 'ss-udl': (u) => u * (1 - u),
    }[type];
    s += plot(165, V, 'V', 'd-area-v') + plot(235, M, 'M', 'd-area-m');
    h = 270;
  }
  return svg(320, h, s, 'beam');
}

// ---------- Axial bar ----------
export function axialBar(opts = {}) {
  const F = opts.F || 'F';
  let s = wall(40, 30, 90);
  s += `<rect x="40" y="48" width="200" height="24" class="d-beam"/>`;
  s += `<rect x="40" y="48" width="${200 + 18}" height="24" class="d-ghost"/>`;
  s += arrow(242, 60, 300, 60) + t(290, 48, F, 'd-text-load');
  s += arrow(140, 105, 40, 105, 'd-muted', 'arrm') + arrow(140, 105, 240, 105, 'd-muted', 'arrm') + `<rect x="125" y="96" width="30" height="16" class="d-bg"/>` + t(140, 109, opts.L || 'L');
  s += arrow(240, 85, 258, 85, 'd-accent', 'arra') + t(249, 99, 'ΔL', 'd-text-accent');
  s += t(140, 40, opts.A || 'A, E');
  return svg(320, 120, s, 'axial bar');
}

// ---------- Torsion shaft ----------
export function shaft(opts = {}) {
  let s = wall(40, 25, 95);
  s += `<rect x="40" y="45" width="210" height="30" rx="3" class="d-beam"/>`;
  s += `<ellipse cx="250" cy="60" rx="7" ry="15" class="d-beam"/>`;
  // twist line
  s += `<path d="M40,52 Q150,52 250,68" class="d-accent" fill="none"/>` + line(40, 52, 250, 52, 'd-muted', 'stroke-dasharray="4 3"');
  s += t(258, 50, 'φ', 'd-text-accent', 'start');
  s += `<path d="M275,40 A14,22 0 1,1 275,80" class="d-load" fill="none" marker-end="url(#arr)"/>` + t(300, 32, opts.T || 'T', 'd-text-load');
  s += arrow(145, 110, 40, 110, 'd-muted', 'arrm') + arrow(145, 110, 250, 110, 'd-muted', 'arrm') + `<rect x="130" y="101" width="30" height="16" class="d-bg"/>` + t(145, 114, opts.L || 'L');
  return svg(320, 125, s, 'shaft in torsion');
}

// ---------- Cross sections ----------
export function section(kind, opts = {}) {
  let s = '';
  const cx = 90, cy = 75;
  if (kind === 'rect') {
    s += `<rect x="${cx - 30}" y="${cy - 50}" width="60" height="100" class="d-section"/>`;
    s += t(cx, cy + 68, opts.b || 'b') + t(cx - 42, cy + 4, opts.h || 'h');
  } else if (kind === 'circle') {
    s += `<circle cx="${cx}" cy="${cy}" r="48" class="d-section"/>` + line(cx - 48, cy + 62, cx + 48, cy + 62, 'd-muted') + t(cx, cy + 76, opts.d || 'd');
  } else if (kind === 'tube') {
    s += `<circle cx="${cx}" cy="${cy}" r="48" class="d-section"/><circle cx="${cx}" cy="${cy}" r="32" class="d-bg-stroke"/>`;
    s += t(cx, cy + 66, opts.d || 'd₀ , dᵢ');
  } else if (kind === 'I') {
    s += `<path d="M${cx - 40},${cy - 50} h80 v12 h-34 v76 h34 v12 h-80 v-12 h34 v-76 h-34 z" class="d-section"/>`;
  }
  // neutral axis
  s += line(cx - 60, cy, cx + 60, cy, 'd-accent', 'stroke-dasharray="6 4"') + t(cx + 64, cy + 4, 'N.A.', 'd-text-accent', 'start');
  // bending stress distribution
  if (opts.stress !== false) {
    const sx = 230;
    s += line(sx, cy - 50, sx, cy + 50, 'd-muted');
    s += `<path d="M${sx},${cy - 50} L${sx - 40},${cy - 50} L${sx + 40},${cy + 50} L${sx},${cy + 50} Z" class="d-area-m"/>`;
    s += t(sx - 44, cy - 54, 'σ (−)', 'd-text', 'middle') + t(sx + 44, cy + 64, 'σ (+)', 'd-text', 'middle');
    s += t(sx + 8, cy + 4, '0', 'd-text', 'start');
    if (opts.shear) {
      s += `<path d="M${sx + 70},${cy - 50} Q${sx + 120},${cy} ${sx + 70},${cy + 50} Z" class="d-area-v"/>` + t(sx + 92, cy - 54, 'τ', 'd-text');
    }
  }
  return svg(320, 160, s, 'cross section');
}

// ---------- Stress-strain curve (schematic, ductile steel vs aluminum) ----------
export function stressStrain(opts = {}) {
  const ox = 40, oy = 170;
  let s = arrow(ox, oy, 305, oy, 'd-muted', 'arrm') + arrow(ox, oy, ox, 12, 'd-muted', 'arrm');
  s += t(300, oy + 16, 'ε') + t(ox - 14, 18, 'σ');
  // steel: linear, upper/lower yield, plateau, hardening, UTS, necking
  const steel = `M${ox},${oy} L${ox + 30},${oy - 100} L${ox + 33},${oy - 108} L${ox + 36},${oy - 96} L${ox + 70},${oy - 97} Q${ox + 140},${oy - 150} ${ox + 175},${oy - 152} Q${ox + 215},${oy - 148} ${ox + 240},${oy - 118}`;
  s += `<path d="${steel}" class="d-curve" fill="none"/>`;
  s += `<circle cx="${ox + 240}" cy="${oy - 118}" r="3.5" class="d-load-fill"/>`;
  if (opts.labels !== false) {
    s += t(ox + 36, oy - 114, 'Sy', 'd-text-accent');
    s += line(ox + 175, oy - 152, ox + 175, oy, 'd-muted', 'stroke-dasharray="3 3"') + t(ox + 175, oy - 158, 'Su (UTS)', 'd-text-accent');
    s += t(ox + 248, oy - 122, 'שבר', 'd-text', 'start');
    s += t(ox + 214, oy - 92, 'necking', 'd-text');
    s += t(ox + 112, oy - 112, 'strain hardening', 'd-text');
    s += t(ox + 6, oy - 40, 'E', 'd-text-accent', 'start');
  }
  if (opts.offset) {
    // aluminum style curve + 0.2% offset line
    const al = `M${ox},${oy} L${ox + 25},${oy - 70} Q${ox + 45},${oy - 98} ${ox + 110},${oy - 112} Q${ox + 160},${oy - 116} ${ox + 190},${oy - 104}`;
    s += `<path d="${al}" class="d-curve2" fill="none"/>`;
    s += line(ox + 10, oy, ox + 40, oy - 84, 'd-accent', 'stroke-dasharray="5 3"');
    s += t(ox + 10, oy + 14, '0.2%', 'd-text-accent');
  }
  return svg(320, 195, s, 'stress-strain curve');
}

// ---------- Stress element ----------
export function stressElement(sx, sy, txy) {
  const c = 110, h = 34;
  let s = `<rect x="${c - h}" y="${80 - h}" width="${2 * h}" height="${2 * h}" class="d-section"/>`;
  const dir = (v) => (v >= 0 ? 1 : -1);
  // σx on right/left faces
  s += arrow(c + h + 2, 80, c + h + 2 + 30 * dir(sx), 80) + arrow(c - h - 2, 80, c - h - 2 - 30 * dir(sx), 80);
  s += t(c + h + 40, 76, `σx=${sx}`, 'd-text-load', 'start');
  // σy on top/bottom
  s += arrow(c, 80 - h - 2, c, 80 - h - 2 - 26 * dir(sy)) + arrow(c, 80 + h + 2, c, 80 + h + 2 + 26 * dir(sy));
  s += t(c + 8, 80 - h - 22, `σy=${sy}`, 'd-text-load', 'start');
  // τxy
  if (txy !== 0) {
    const d = dir(txy);
    s += arrow(c + h + 8, 80 + 22 * d, c + h + 8, 80 - 22 * d, 'd-accent', 'arra');
    s += arrow(c - h - 8, 80 - 22 * d, c - h - 8, 80 + 22 * d, 'd-accent', 'arra');
    s += arrow(c - 22 * d, 80 - h - 8, c + 22 * d, 80 - h - 8, 'd-accent', 'arra');
    s += arrow(c + 22 * d, 80 + h + 8, c - 22 * d, 80 + h + 8, 'd-accent', 'arra');
    s += t(c - h - 14, 80 + 4, `τ=${txy}`, 'd-text-accent', 'end');
  }
  return svg(320, 160, s, 'stress element');
}

// ---------- Mohr's circle, to scale ----------
export function mohrCircle(sx, sy, txy) {
  const C = (sx + sy) / 2, R = Math.sqrt(((sx - sy) / 2) ** 2 + txy ** 2);
  const s1 = C + R, s2 = C - R;
  const minS = Math.min(0, s2), maxS = Math.max(0, s1);
  const span = Math.max(maxS - minS, 1e-9);
  const W = 300, x0 = 20, scale = (W - 2 * x0) / span;
  const X = (v) => x0 + (v - minS) * scale;
  const cy = 20 + R * scale + 10;
  const Y = (tau) => cy + tau * scale; // τ positive drawn downward (common convention)
  const H = cy + R * scale + 30;
  let s = arrow(X(minS) - 10, cy, W + 10, cy, 'd-muted', 'arrm') + t(W + 8, cy - 6, 'σ', 'd-text', 'end');
  s += line(X(0), 8, X(0), H - 10, 'd-muted') + t(X(0) + 4, 16, 'τ', 'd-text', 'start');
  s += `<circle cx="${X(C)}" cy="${cy}" r="${R * scale}" class="d-circle"/>`;
  s += line(X(sx), Y(txy), X(sy), Y(-txy), 'd-accent');
  s += `<circle cx="${X(sx)}" cy="${Y(txy)}" r="3.5" class="d-accent-fill"/><circle cx="${X(sy)}" cy="${Y(-txy)}" r="3.5" class="d-accent-fill"/>`;
  s += `<circle cx="${X(s1)}" cy="${cy}" r="3.5" class="d-load-fill"/><circle cx="${X(s2)}" cy="${cy}" r="3.5" class="d-load-fill"/>`;
  s += t(X(s1), cy + 16, 'σ₁', 'd-text-load') + t(X(s2), cy + 16, 'σ₂', 'd-text-load') + t(X(C), cy + 16, 'C');
  s += line(X(C), cy, X(C), cy - R * scale, 'd-muted', 'stroke-dasharray="3 3"') + t(X(C) + 4, cy - R * scale + 12, 'τmax', 'd-text', 'start');
  s += t(X(sx) + 6, Y(txy) + 4, 'x', 'd-text-accent', 'start');
  return svg(W + 20, H, s, 'Mohr circle');
}

// ---------- Columns: the four end conditions ----------
export function columns() {
  const cases = [['pinned-pinned', 1], ['fixed-pinned', 0.7], ['fixed-fixed', 0.5], ['fixed-free', 2]];
  let s = '';
  cases.forEach(([name, K], i) => {
    const x = 42 + i * 78, top = 30, bot = 150;
    const fixedBot = name.startsWith('fixed');
    const fixedTop = name === 'fixed-fixed';
    const freeTop = name === 'fixed-free';
    // buckled shape
    let path;
    if (name === 'pinned-pinned') path = `M${x},${bot} Q${x + 30},${(top + bot) / 2} ${x},${top}`;
    else if (name === 'fixed-free') path = `M${x},${bot} Q${x},${top + 30} ${x + 26},${top}`;
    else if (name === 'fixed-fixed') path = `M${x},${bot} C${x},${bot - 40} ${x + 26},${bot - 40} ${x + 22},${(top + bot) / 2} S${x},${top + 40} ${x},${top}`;
    else path = `M${x},${bot} C${x},${bot - 50} ${x + 28},${top + 40} ${x},${top}`;
    s += line(x, top, x, bot, 'd-muted', 'stroke-dasharray="4 3"');
    s += `<path d="${path}" class="d-curve" fill="none"/>`;
    s += fixedBot ? `<rect x="${x - 14}" y="${bot}" width="28" height="9" fill="url(#hatch)"/>` + line(x - 14, bot, x + 14, bot) : pin(x, bot);
    if (fixedTop) s += `<rect x="${x - 14}" y="${top - 9}" width="28" height="9" fill="url(#hatch)"/>` + line(x - 14, top, x + 14, top);
    else if (!freeTop) s += `<path d="M${x},${top} L${x - 8},${top - 12} L${x + 8},${top - 12} Z" class="d-support"/>`;
    const px = freeTop ? x + 26 : x;
    s += arrow(px, top - 26, px, top - 4);
    s += t(x, bot + 26, `K=${K}`, 'd-text-accent');
  });
  return svg(320, 185, s, 'column end conditions');
}

// ---------- Plate with a hole (stress concentration) ----------
export function plateHole() {
  let s = `<rect x="60" y="30" width="200" height="100" class="d-section"/><circle cx="160" cy="80" r="18" class="d-bg-stroke"/>`;
  for (let y = 40; y <= 120; y += 20) { s += arrow(58, y, 22, y) + arrow(262, y, 298, y); }
  // peak stress marks at the hole edge
  s += `<path d="M160,62 L160,30" class="d-accent" stroke-dasharray="3 2"/>`;
  s += `<path d="M178,62 Q170,40 166,32" class="d-curve2" fill="none"/>`;
  s += t(160, 22, 'σmax = Kt·σnom', 'd-text-accent');
  s += t(160, 150, 'Kt ≈ 3 (חור עגול בפלטה רחבה)');
  return svg(320, 160, s, 'plate with hole');
}

// ---------- S-N curve ----------
export function snCurve() {
  const ox = 46, oy = 150;
  let s = arrow(ox, oy, 305, oy, 'd-muted', 'arrm') + arrow(ox, oy, ox, 12, 'd-muted', 'arrm');
  s += t(300, oy + 16, 'log N') + t(ox - 8, 22, 'S', 'd-text', 'end');
  s += `<path d="M${ox + 10},30 Q${ox + 90},60 ${ox + 150},92 L${ox + 250},92" class="d-curve" fill="none"/>`;
  s += `<path d="M${ox + 10},40 Q${ox + 110},80 ${ox + 250},125" class="d-curve2" fill="none"/>`;
  s += t(ox + 250, 86, 'פלדה: Se', 'd-text-accent', 'end') + t(ox + 250, 140, 'אלומיניום: אין גבול', 'd-text', 'end');
  s += line(ox + 150, 92, ox + 150, oy, 'd-muted', 'stroke-dasharray="3 3"') + t(ox + 150, oy + 16, '~10⁶');
  return svg(320, 175, s, 'S-N curve');
}

// ---------- Goodman diagram, to scale ----------
export function goodman(Se, Sut, Sy, sm, sa) {
  const W = 260, H = 170, ox = 44, oy = 180;
  const maxX = Sut * 1.08, maxY = Math.max(Se, Sy || 0) * 1.15;
  const X = (v) => ox + (v / maxX) * W, Y = (v) => oy - (v / maxY) * H;
  let s = arrow(ox, oy, ox + W + 10, oy, 'd-muted', 'arrm') + arrow(ox, oy, ox, 6, 'd-muted', 'arrm');
  s += t(ox + W + 8, oy + 16, 'σm', 'd-text', 'end') + t(ox - 6, 16, 'σa', 'd-text', 'end');
  s += line(X(0), Y(Se), X(Sut), Y(0), 'd-curve');
  s += t(X(0) - 4, Y(Se) + 4, 'Se', 'd-text-accent', 'end') + t(X(Sut), oy + 16, 'Sut', 'd-text-accent');
  if (Sy) {
    s += line(X(0), Y(Sy), X(Sy), Y(0), 'd-curve2', 'stroke-dasharray="6 4"');
    s += t(X(0) - 4, Y(Sy) + 4, 'Sy', 'd-text', 'end') + t(X(Sy), oy + 16, 'Sy');
    s += t(ox + W - 10, 46, 'Langer (כניעה)', 'd-text', 'end');
  }
  if (sm !== undefined) {
    s += line(X(0), Y(0), X(sm * 3), Y(sa * 3), 'd-muted', 'stroke-dasharray="2 3"');
    s += `<circle cx="${X(sm)}" cy="${Y(sa)}" r="4.5" class="d-load-fill"/>` + t(X(sm) + 8, Y(sa) - 6, 'A', 'd-text-load', 'start');
  }
  s += t(ox + W - 10, 30, 'Goodman', 'd-text-accent', 'end');
  return svg(320, 205, s, 'Goodman diagram');
}

// ---------- Thermal: constrained bar ----------
export function constrainedBar() {
  let s = wall(40, 30, 90) + wall(280, 30, 90, 'right');
  s += `<rect x="40" y="48" width="240" height="24" class="d-beam"/>`;
  s += t(160, 40, 'ΔT ↑', 'd-text-load') + arrow(120, 60, 60, 60, 'd-accent', 'arra') + arrow(200, 60, 260, 60, 'd-accent', 'arra');
  s += t(160, 108, 'הקירות מונעים התארכות ← לחיצה');
  return svg(320, 120, s, 'constrained bar');
}

export const registry = { beam, axialBar, shaft, section, stressStrain, stressElement, mohrCircle, columns, plateHole, snCurve, goodman, constrainedBar };

// content uses {fn:'beam', args:['ss-udl',{diagrams:true}]}
export function draw(spec) {
  if (!spec) return '';
  if (typeof spec === 'string') return spec;
  const fn = registry[spec.fn];
  return fn ? fn(...(spec.args || [])) : '';
}
