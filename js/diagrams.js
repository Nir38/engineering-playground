// diagrams.js: original SVG drawings, drawn in code so they are sharp on a
// phone, follow light/dark mode, and can be drawn to the numbers of a question.
// Colors come from CSS classes defined in style.css (d-*), never hard-coded.
import { frictionColebrook, FE_C, holeH, shaftLimits, fit, magnification, transmissibility, PI } from './formulas.js';

const svg = (w, h, body, label = '') =>
  `<svg class="diagram" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${defs}${body}</svg>`;

const defs = `<defs>
<marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-load-fill"/></marker>
<marker id="arrm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-muted-fill"/></marker>
<marker id="arra" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-accent-fill"/></marker>
<pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="d-muted" stroke-width="1.2"/></pattern>
</defs>`;

// Labels with Hebrew get an RTL base direction so mixed Hebrew/Latin reads correctly.
// In RTL, text-anchor "start" is the right edge, so start/end are swapped to keep
// the same visual anchor the caller asked for.
const HEB = /[֐-׿]/;
const SUB = (s) => String(s).replace(/([A-Za-zτσα])_([A-Za-z0-9]+)/g, '$1<tspan baseline-shift="sub" font-size="8">$2</tspan>');
// inside an RTL label, isolate every Latin/number run (LRI … PDI) so "20 ms (50 Hz)" stays in order
const LTR_RUN = /[0-9A-Za-zµμΩ°%₀-₉²³τσαηεφθνρΔ√Ø][^֐-׿]*[0-9A-Za-zµμΩ°%₀-₉²³)τσαηεφθνρ]|[0-9A-Za-zµμΩ₀-₉]/g;
const t = (x, y, s, cls = 'd-text', anchor = 'middle') => {
  s = String(s);
  if (HEB.test(s)) s = s.replace(LTR_RUN, (m) => {
    // keep brackets balanced inside the isolated run; an unmatched ')' stays outside
    let tail = '';
    const n = (c) => m.split(c).length - 1;
    while (m.endsWith(')') && n(')') > n('(')) { m = m.slice(0, -1); tail = ')' + tail; }
    return `⁦${m}⁩${tail}`;
  });
  s = SUB(s);
  if (!HEB.test(s))return `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${s}</text>`;
  const a = anchor === 'start' ? 'end' : anchor === 'end' ? 'start' : 'middle';
  return `<text x="${x}" y="${y}" class="${cls}" text-anchor="${a}" direction="rtl">${s}</text>`;
};
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
    s += t(c - h - 18, 80 + h + 22, `τ=${txy}`, 'd-text-accent', 'end');
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

// =====================================================================
// FLUIDS
// =====================================================================
const water = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="d-water"/>`;
const tankWalls = (x, y, w, h) => `<path d="M${x},${y} L${x},${y + h} L${x + w},${y + h} L${x + w},${y}" class="d-line" fill="none"/>`;

// open tank: pressure grows linearly with depth
export function tank(opts = {}) {
  let s = water(40, 40, 130, 110) + tankWalls(40, 20, 130, 130);
  s += line(40, 40, 170, 40, 'd-accent') + `<path d="M100,34 l6,6 l6,-6" class="d-accent" fill="none"/>` + t(178, 44, 'Patm', 'd-text-accent', 'start');
  s += arrow(30, 40, 30, 148, 'd-muted', 'arrm') + t(22, 100, opts.h || 'h', 'd-text', 'end');
  // pressure distribution triangle on the right wall
  s += `<path d="M170,40 L170,150 L250,150 Z" class="d-area-m"/>`;
  for (let y = 60; y <= 140; y += 20) s += arrow(170 + ((y - 40) / 110) * 80, y, 172, y);
  s += t(250, 165, 'ρgh', 'd-text-load');
  return svg(320, 175, s, 'hydrostatic pressure');
}

export function hydraulicPress() {
  let s = water(30, 80, 260, 50);
  s += `<path d="M30,40 L30,130 L290,130 L290,40 M60,40 L60,80 L210,80 L210,40" class="d-line" fill="none"/>`;
  s += `<rect x="31" y="70" width="28" height="10" class="d-support"/><rect x="211" y="60" width="78" height="10" class="d-support"/>`;
  s += water(31, 80, 28, 0) + water(211, 70, 78, 10);
  s += arrow(45, 30, 45, 68) + t(45, 24, 'F₁', 'd-text-load');
  s += arrow(250, 56, 250, 20) + t(250, 14, 'F₂', 'd-text-load');
  s += t(45, 150, 'A₁') + t(250, 150, 'A₂') + t(150, 110, 'P זהה בכל הנוזל', 'd-text-accent');
  return svg(320, 160, s, 'hydraulic press');
}

export function floating(opts = {}) {
  const frac = opts.frac ?? 0.6;
  const h = 70, top = 90 - h * frac;
  let s = water(30, 90, 260, 70) + line(30, 90, 290, 90, 'd-accent');
  s += `<rect x="120" y="${top}" width="80" height="${h}" class="d-section"/>`;
  s += arrow(178, top + h / 2 - 6, 178, top + h / 2 + 34) + t(186, top + h / 2 + 34, 'W', 'd-text-load', 'start');
  s += arrow(142, top + h + 2, 142, top + h / 2 - 20, 'd-accent', 'arra') + t(134, top + h / 2 - 16, 'F<tspan baseline-shift="sub" font-size="8">B</tspan>', 'd-text-accent', 'end');
  s += t(240, 125, 'ρ<tspan baseline-shift="sub" font-size="8">f</tspan> g V<tspan baseline-shift="sub" font-size="8">disp</tspan>', 'd-text-accent');
  return svg(320, 170, s, 'buoyancy');
}

// pipe with a contraction; venturi:true draws a manometer
export function pipeContraction(opts = {}) {
  const top1 = 40, bot1 = 100, top2 = 58, bot2 = 82;
  let s = `<path d="M20,${top1} L120,${top1} L170,${top2} L230,${top2} L290,${top1} M20,${bot1} L120,${bot1} L170,${bot2} L230,${bot2} L290,${bot1}" class="d-line" fill="none"/>`;
  s += `<path d="M20,${top1} L120,${top1} L170,${top2} L230,${top2} L290,${top1} L290,${bot1} L230,${bot2} L170,${bot2} L120,${bot1} L20,${bot1} Z" class="d-water"/>`;
  s += arrow(40, 70, 80, 70, 'd-accent', 'arra') + t(60, 62, 'V₁', 'd-text-accent');
  s += arrow(180, 70, 222, 70, 'd-accent', 'arra') + t(212, 52, 'V₂', 'd-text-accent', 'start');
  s += t(60, 118, opts.a1 || 'A₁, P₁') + t(200, 100, opts.a2 || 'V₂ > V₁ ,  P₂ < P₁');
  if (opts.venturi) {
    s += `<path d="M70,${top1} L70,10 L70,10 M200,${top2} L200,10" class="d-muted" fill="none"/>`;
    s += `<rect x="66" y="16" width="8" height="${top1 - 16}" class="d-water"/><rect x="196" y="34" width="8" height="${top2 - 34}" class="d-water"/>`;
    s += arrow(240, 18, 240, 36, 'd-muted', 'arrm') + arrow(240, 36, 240, 18, 'd-muted', 'arrm') + t(248, 30, 'Δh', 'd-text', 'start');
  }
  return svg(320, 128, s, 'pipe contraction');
}

export function torricelliTank() {
  let s = water(40, 40, 120, 110) + tankWalls(40, 20, 120, 130);
  s += line(40, 40, 160, 40, 'd-accent');
  s += arrow(28, 40, 28, 138, 'd-muted', 'arrm') + t(20, 92, 'h', 'd-text', 'end');
  s += `<path d="M160,140 Q230,142 280,170" class="d-curve" fill="none" stroke-width="5"/>`;
  s += t(232, 132, 'V = √(2gh)', 'd-text-accent');
  return svg(320, 180, s, 'Torricelli');
}

export function pitot() {
  let s = `<rect x="20" y="40" width="280" height="80" class="d-water"/>` + line(20, 40, 300, 40) + line(20, 120, 300, 120);
  for (let y = 58; y <= 104; y += 22) s += arrow(30, y, 70, y, 'd-accent', 'arra');
  s += `<path d="M120,80 L190,80 L190,10" class="d-load" fill="none" stroke-width="3"/>` + t(122, 96, 'P₀ (עצירה)', 'd-text-load', 'start');
  s += `<path d="M240,40 L240,10" class="d-muted" fill="none" stroke-width="3"/>` + t(248, 22, 'P (סטטי)', 'd-text', 'start');
  s += t(160, 140, 'V = √(2(P₀−P)/ρ)', 'd-text-accent');
  return svg(320, 150, s, 'Pitot tube');
}

export function velocityProfiles() {
  let s = '';
  const prof = (x0, fn, title) => {
    let p = `M${x0},30`;
    for (let i = 0; i <= 40; i++) { const r = -1 + (2 * i) / 40; p += ` L${x0 + fn(r) * 90},${30 + (i / 40) * 100}`; }
    let q = line(x0, 30, x0 + 110, 30) + line(x0, 130, x0 + 110, 130) + line(x0, 30, x0, 130, 'd-muted');
    for (let i = 1; i < 8; i++) { const r = -1 + (2 * i) / 8; q += arrow(x0, 30 + (i / 8) * 100, x0 + fn(r) * 90 - 1, 30 + (i / 8) * 100, 'd-muted', 'arrm'); }
    return q + `<path d="${p}" class="d-curve" fill="none"/>` + t(x0 + 55, 150, title);
  };
  s += prof(20, (r) => 1 - r * r, 'למינרית: פרבולה');
  s += prof(180, (r) => Math.pow(1 - Math.abs(r), 1 / 7), 'טורבולנטית: שטוח');
  return svg(320, 160, s, 'velocity profiles');
}

// Moody chart computed from Colebrook (to scale, log-log)
export function moody(opts = {}) {
  const x0 = 46, y0 = 170, W = 260, H = 150;
  const lx = (Re) => x0 + ((Math.log10(Re) - 3) / 5) * W; // Re 1e3..1e8
  const ly = (fv) => y0 - ((Math.log10(fv) - Math.log10(0.005)) / (Math.log10(0.1) - Math.log10(0.005))) * H;
  let s = arrow(x0, y0, x0 + W + 8, y0, 'd-muted', 'arrm') + arrow(x0, y0, x0, 12, 'd-muted', 'arrm');
  [1e3, 1e4, 1e5, 1e6, 1e7, 1e8].forEach((Re, i) => { s += t(lx(Re), y0 + 14, `10${['³', '⁴', '⁵', '⁶', '⁷', '⁸'][i]}`); });
  [0.01, 0.02, 0.04, 0.08].forEach((fv) => { s += t(x0 - 4, ly(fv) + 4, String(fv), 'd-text', 'end') + line(x0, ly(fv), x0 + W, ly(fv), 'd-grid'); });
  s += t(x0 + W, y0 + 28, 'Re', 'd-text', 'end') + t(x0 - 4, 14, 'f', 'd-text', 'end');
  // laminar
  let p = ''; for (let i = 0; i <= 20; i++) { const Re = 600 * 10 ** ((i / 20) * Math.log10(2300 / 600)); const fv = Math.min(64 / Re, 0.1); p += `${i ? 'L' : 'M'}${lx(Math.max(Re, 1000))},${ly(fv)} `; }
  s += `<path d="${p}" class="d-curve2" fill="none"/>` + t(lx(1300), ly(0.07), '64/Re', 'd-text', 'start');
  // turbulent curves
  const eps = opts.curves || [0, 1e-4, 1e-3, 0.01, 0.05];
  eps.forEach((e) => {
    let q = '';
    for (let i = 0; i <= 50; i++) { const Re = 4000 * 10 ** ((i / 50) * Math.log10(1e8 / 4000)); q += `${i ? 'L' : 'M'}${lx(Re)},${ly(frictionColebrook(Re, e))} `; }
    s += `<path d="${q}" class="d-curve" fill="none" stroke-width="1.6"/>` + t(x0 + W + 2, ly(frictionColebrook(1e8, e)) + 4, e === 0 ? 'חלק' : String(e), 'd-text', 'start');
  });
  s += t(x0 + W - 4, 24, 'ε/D', 'd-text-accent', 'end');
  if (opts.point) { const [Re, fv] = opts.point; s += `<circle cx="${lx(Re)}" cy="${ly(fv)}" r="4.5" class="d-load-fill"/>`; }
  return svg(340, 205, s, 'Moody chart');
}

// pump curve H = H0 - aQ², system curve H = Hs + kQ², to scale
export function pumpCurve(opts = {}) {
  const H0 = opts.H0 ?? 40, a = opts.a ?? 0.04, Hs = opts.Hs ?? 15, k = opts.k ?? 0.02;
  const Qop = Math.sqrt((H0 - Hs) / (a + k)), Hop = Hs + k * Qop * Qop;
  const Qmax = Math.sqrt(H0 / a);
  const x0 = 40, y0 = 160, W = 250, Hh = 140;
  const X = (q) => x0 + (q / Qmax) * W, Y = (h) => y0 - (h / (H0 * 1.1)) * Hh;
  let s = arrow(x0, y0, x0 + W + 8, y0, 'd-muted', 'arrm') + arrow(x0, y0, x0, 12, 'd-muted', 'arrm');
  s += t(x0 + W + 6, y0 + 16, 'Q', 'd-text', 'end') + t(x0 - 6, 18, 'H', 'd-text', 'end');
  let p = '', q2 = '';
  for (let i = 0; i <= 40; i++) { const q = (Qmax * i) / 40; p += `${i ? 'L' : 'M'}${X(q)},${Y(H0 - a * q * q)} `; const hs = Hs + k * q * q; if (hs <= H0 * 1.1) q2 += `${q2 ? 'L' : 'M'}${X(q)},${Y(hs)} `; }
  s += `<path d="${p}" class="d-curve" fill="none"/>` + `<path d="${q2}" class="d-curve2" fill="none"/>`;
  s += t(X(Qmax * 0.15), Y(H0) - 6, 'משאבה', 'd-text-accent', 'start') + t(X(Qmax * 0.92), Y(Hs + k * (Qmax * 0.85) ** 2) - 8, 'מערכת', 'd-text', 'end');
  s += line(x0, Y(Hs), x0 + 8, Y(Hs), 'd-muted') + t(x0 + 10, Y(Hs) + 12, 'עומד סטטי', 'd-text', 'start');
  s += line(X(Qop), Y(Hop), X(Qop), y0, 'd-muted', 'stroke-dasharray="3 3"') + `<circle cx="${X(Qop)}" cy="${Y(Hop)}" r="5" class="d-load-fill"/>` + t(X(Qop) + 8, Y(Hop) - 8, 'נקודת עבודה', 'd-text-load', 'start');
  return svg(320, 180, s, 'pump and system curves');
}

export function dragCar() {
  let s = '';
  for (let i = 0; i < 5; i++) {
    const y = 30 + i * 14;
    s += `<path d="M10,${y} C80,${y} 110,${y - 26 + i * 4} 170,${y - 24 + i * 4} S260,${y} 310,${y + 6}" class="d-muted" fill="none" stroke-dasharray="${i % 2 ? '5 4' : '0'}"/>`;
  }
  s += `<path d="M70,130 L70,112 Q80,98 110,96 L140,76 Q170,66 210,70 L245,96 Q275,100 280,112 L280,130 Z" class="d-section"/>`;
  s += `<circle cx="110" cy="132" r="13" class="d-support"/><circle cx="240" cy="132" r="13" class="d-support"/>` + line(10, 146, 310, 146, 'd-muted');
  s += arrow(14, 110, 60, 110, 'd-accent', 'arra') + t(36, 102, 'V', 'd-text-accent');
  s += arrow(290, 104, 318, 104) + t(300, 92, 'F<tspan baseline-shift="sub" font-size="8">D</tspan>', 'd-text-load');
  s += `<path d="M282,112 q14,6 6,16 q-10,6 -4,14" class="d-curve2" fill="none"/>` + t(296, 160, 'wake', 'd-text');
  return svg(320, 165, s, 'drag on a car');
}

export function jetPlate() {
  let s = `<rect x="20" y="62" width="50" height="16" class="d-support"/>` + `<rect x="70" y="64" width="160" height="12" class="d-water"/>`;
  s += arrow(90, 70, 220, 70, 'd-accent', 'arra') + t(150, 56, 'ρ, A, V', 'd-text-accent');
  s += `<rect x="232" y="10" width="10" height="120" class="d-section"/>`;
  s += `<path d="M230,64 Q226,40 228,14 M230,76 Q226,100 228,126" class="d-water-line" fill="none"/>`;
  s += arrow(244, 70, 300, 70) + t(270, 60, 'F = ρAV²', 'd-text-load');
  return svg(320, 140, s, 'jet on a plate');
}

// =====================================================================
// MATERIALS
// =====================================================================
// Steel corner of the Fe-Fe3C diagram (0-2.2 wt% C, 500-1600 °C). Straight-line
// schematic through the key points in Callister ch. 9; opts.c0 marks an alloy.
export function ironCarbon(opts = {}) {
  const x0 = 46, y0 = 190, W = 250, H = 175;
  const X = (c) => x0 + (c / 2.2) * W, Y = (T) => y0 - ((T - 500) / 1100) * H;
  let s = arrow(x0, y0, x0 + W + 8, y0, 'd-muted', 'arrm') + arrow(x0, y0, x0, 8, 'd-muted', 'arrm');
  [0, 0.76, 1.5, 2.14].forEach((c) => (s += t(X(c), y0 + 14, String(c))));
  [600, 727, 912, 1147, 1400].forEach((T) => (s += t(x0 - 4, Y(T) + 4, String(T), 'd-text', 'end')));
  s += t(x0 + W, y0 + 28, 'wt% C', 'd-text', 'end') + t(x0 - 4, 12, '°C', 'd-text', 'end');
  const L = (a, b, cls = 'd-curve') => line(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), cls);
  s += L([0, 912], [0.76, 727]);                 // A3
  s += L([0.76, 727], [2.14, 1147]);             // Acm
  s += L([0.022, 727], [2.2, 727]);              // A1 (eutectoid line)
  s += L([0, 912], [0.022, 727], 'd-curve2');    // α / α+γ
  s += L([0.17, 1493], [2.14, 1147]);            // solidus (γ)
  const liqAt = (c) => 1493 - ((c - 0.53) / (FE_C.eutecticC - 0.53)) * (1493 - FE_C.eutecticT);
  s += L([0.53, 1493], [2.2, liqAt(2.2)], 'd-curve2'); // liquidus, straight toward 4.3% / 1147 °C
  s += `<circle cx="${X(0.76)}" cy="${Y(727)}" r="4" class="d-load-fill"/>`;
  s += t(X(0.95), Y(1000), 'γ (austenite)', 'd-text-accent') + t(X(0.12), Y(800), 'α+γ', 'd-text', 'start');
  s += t(X(1.75), Y(880), 'γ+Fe₃C', 'd-text') + t(X(1.2), Y(600), 'α + Fe₃C (pearlite)', 'd-text');
  s += t(X(1.7), Y(1480), 'L', 'd-text') + t(X(1.55), Y(1330), 'L+γ', 'd-text');
  s += t(X(0.8), Y(727) - 5, 'eutectoid', 'd-text-load', 'start');
  if (opts.c0 !== undefined) s += line(X(opts.c0), Y(1500), X(opts.c0), y0, 'd-load', 'stroke-dasharray="5 4"') + t(X(opts.c0), Y(1500) - 6, `C₀=${opts.c0}`, 'd-text-load');
  return svg(320, 225, s, 'iron-carbon phase diagram');
}

export function hardness() {
  let s = '';
  // Brinell: ball
  s += `<rect x="20" y="90" width="130" height="50" class="d-section"/><circle cx="85" cy="62" r="30" class="d-support"/>`;
  s += `<path d="M64,90 Q85,106 106,90" class="d-bg-stroke"/>` + arrow(85, 8, 85, 28) + t(98, 18, 'P', 'd-text-load', 'start');
  s += line(64, 118, 106, 118, 'd-accent') + t(85, 132, 'd', 'd-text-accent') + t(85, 158, 'Brinell: כדור D', 'd-text');
  // Vickers: diamond pyramid
  s += `<rect x="170" y="90" width="130" height="50" class="d-section"/><path d="M235,90 L215,52 L255,52 Z" class="d-support"/>`;
  s += `<path d="M219,90 L235,104 L251,90" class="d-bg-stroke"/>` + arrow(235, 8, 235, 48) + t(248, 22, 'F', 'd-text-load', 'start');
  s += line(219, 118, 251, 118, 'd-accent') + t(235, 132, 'd', 'd-text-accent') + t(235, 158, 'Vickers: פירמידה 136°', 'd-text');
  return svg(320, 168, s, 'hardness tests');
}

export function galvanicSeries(opts = {}) {
  const items = ['Mg', 'Zn', 'Al', 'פלדה', 'פליז/Cu', 'נירוסטה', 'Ti', 'גרפיט'];
  const x0 = 20, W = 280;
  let s = `<defs><linearGradient id="gs" x1="0" x2="1"><stop offset="0" class="gs-a"/><stop offset="1" class="gs-n"/></linearGradient></defs>`;
  s += `<rect x="${x0}" y="40" width="${W}" height="14" rx="7" fill="url(#gs)"/>`;
  items.forEach((n, i) => {
    const x = x0 + 10 + (i * (W - 20)) / (items.length - 1);
    s += `<circle cx="${x}" cy="47" r="4" class="d-support"/>` + t(x, i % 2 ? 80 : 30, n, (opts.hi || []).includes(n) ? 'd-text-load' : 'd-text');
  });
  s += t(x0, 104, 'אנודי: מתאכל', 'd-text-load', 'start') + t(x0 + W, 104, 'קתודי: מוגן', 'd-text-accent', 'end');
  return svg(320, 112, s, 'galvanic series');
}

// temperature-time sketches for the main heat treatments
export function heatTreat(kind = 'qt') {
  const x0 = 36, y0 = 150, W = 270;
  let s = arrow(x0, y0, x0 + W, y0, 'd-muted', 'arrm') + arrow(x0, y0, x0, 10, 'd-muted', 'arrm');
  s += t(x0 + W - 4, y0 + 14, 'זמן', 'd-text', 'end') + t(x0 - 4, 16, 'T', 'd-text', 'end');
  const A1 = 82, A3 = 58;
  s += line(x0, A1, x0 + W, A1, 'd-grid', 'stroke-dasharray="4 3"') + t(x0 + W, A1 - 4, 'A1 727°C', 'd-text', 'end');
  s += line(x0, A3, x0 + W, A3, 'd-grid', 'stroke-dasharray="4 3"') + t(x0 + W, A3 - 4, 'A3', 'd-text', 'end');
  const paths = {
    anneal: [`M${x0},${y0} L80,40 L130,40 Q240,60 300,145`, 'Annealing: קירור איטי בתנור'],
    normalize: [`M${x0},${y0} L80,40 L130,40 Q170,120 210,145`, 'Normalizing: קירור באוויר'],
    qt: [`M${x0},${y0} L70,40 L110,40 L120,145 L150,145 L165,105 L230,105 L250,145`, 'Quench + Temper'],
    relief: [`M${x0},${y0} L80,100 L170,100 Q240,110 300,145`, 'Stress relief: מתחת ל-A1'],
  };
  const [d, label] = paths[kind] || paths.qt;
  s += `<path d="${d}" class="d-curve" fill="none"/>` + t(170, 172, label, 'd-text-accent');
  if (kind === 'qt') s += t(113, 36, 'austenitize', 'd-text', 'middle') + t(122, 132, 'quench', 'd-text-load', 'start') + t(197, 100, 'temper', 'd-text');
  return svg(320, 180, s, 'heat treatment');
}

// bar chart of a property per material (to scale)
export function bars(opts = {}) {
  const data = opts.data || [];
  const max = Math.max(...data.map((d) => d[1])) * 1.1;
  const x0 = 92, W = 200, rowH = 26;
  let s = '';
  data.forEach(([n, v], i) => {
    const y = 14 + i * rowH;
    s += t(x0 - 6, y + 13, n, 'd-text', 'end') + `<rect x="${x0}" y="${y}" width="${(v / max) * W}" height="17" rx="4" class="d-bar"/>`;
    s += t(x0 + (v / max) * W + 4, y + 13, String(v), 'd-text', 'start');
  });
  s += t(x0 + W / 2, 14 + data.length * rowH + 10, opts.label || '', 'd-text-accent');
  return svg(320, 30 + data.length * rowH + 6, s, 'bar chart');
}

// =====================================================================
// PULLEYS & ROPES
// =====================================================================
const wheel = (x, y, r = 14) => `<circle cx="${x}" cy="${y}" r="${r}" class="d-support"/><circle cx="${x}" cy="${y}" r="2.5" class="d-line"/>`;
const rope = (x1, y1, x2, y2) => line(x1, y1, x2, y2, 'd-rope');
const ceiling = (x1, x2, y) => `<rect x="${x1}" y="${y - 8}" width="${x2 - x1}" height="8" fill="url(#hatch)"/>` + line(x1, y, x2, y);

// block and tackle: n rope segments (1..6) hold the moving block. The rope runs
// free end -> over a top sheave -> down/up between the blocks -> dead end.
export function tackle(n = 4, opts = {}) {
  n = Math.max(1, Math.min(6, n));
  const r = 12, gap = 2 * r, x0 = 92, yT = 46, yB = 128;
  const X = (j) => x0 + j * gap; // segment j (j = -1 is the free end)
  let s = ceiling(40, 240, 18);
  // fixed block frame and moving block frame
  s += `<rect x="${X(-1) - 6}" y="${yT - 16}" width="${X(n - 1) - X(-1) + 12}" height="32" rx="6" class="d-ghost"/>` + line((X(-1) + X(n - 1)) / 2, 18, (X(-1) + X(n - 1)) / 2, yT - 16, 'd-muted');
  s += `<rect x="${X(0) - 6}" y="${yB - 16}" width="${Math.max(X(n - 1) - X(0), gap) + 12}" height="32" rx="6" class="d-ghost"/>`;
  // sheaves: free end -> segment 0 over the top; then pairs alternate bottom/top
  s += wheel((X(-1) + X(0)) / 2, yT, r);
  for (let j = 0; j < n - 1; j++) s += wheel((X(j) + X(j + 1)) / 2, j % 2 === 0 ? yB : yT, r);
  // rope segments between the blocks
  for (let j = 0; j < n; j++) s += rope(X(j), yT, X(j), yB);
  // dead end: tie to the block on the side the last segment ends
  const lastTop = n % 2 === 1 ? false : true; // n even -> last wheel bottom -> segment ends at top
  s += `<circle cx="${X(n - 1)}" cy="${lastTop ? yT - 4 : yB + 4}" r="3" class="d-load-fill"/>`;
  // free end pulled down
  s += rope(X(-1), yT, X(-1), yB + 30) + arrow(X(-1), yB + 30, X(-1), yB + 52) + t(X(-1) - 8, yB + 50, opts.F || 'F', 'd-text-load', 'end');
  // load
  const cx = (X(0) + Math.max(X(n - 1), X(0) + gap)) / 2;
  s += line(cx, yB + 16, cx, yB + 30) + `<rect x="${cx - 22}" y="${yB + 30}" width="44" height="26" class="d-section"/>` + t(cx, yB + 48, opts.W || 'W', 'd-text-load');
  s += t(258, 78, `n = ${n}`, 'd-text-accent', 'start') + t(258, 96, 'F = W/n', 'd-text-accent', 'start') + t(258, 114, 'חבל: פי n', 'd-text', 'start');
  return svg(320, 196, s, 'block and tackle');
}

export function atwood() {
  let s = ceiling(110, 210, 16) + line(160, 16, 160, 36, 'd-muted') + wheel(160, 50, 22);
  s += rope(138, 50, 138, 130) + rope(182, 50, 182, 100);
  s += `<rect x="120" y="130" width="36" height="40" class="d-section"/>` + t(138, 155, 'm₁', 'd-text');
  s += `<rect x="166" y="100" width="32" height="30" class="d-section"/>` + t(182, 120, 'm₂', 'd-text');
  s += arrow(108, 140, 108, 172, 'd-accent', 'arra') + t(100, 160, 'a', 'd-text-accent', 'end');
  s += arrow(212, 128, 212, 96, 'd-accent', 'arra') + t(220, 116, 'a', 'd-text-accent', 'start');
  s += t(138, 92, 'T', 'd-text-load') + t(182, 80, 'T', 'd-text-load');
  return svg(320, 180, s, 'Atwood machine');
}

export function twoCables(theta = 30) {
  const cx = 160, top = 24, L = 110, th = (theta * Math.PI) / 180;
  const dx = L * Math.cos(th), dy = L * Math.sin(th);
  let s = ceiling(cx - dx - 20, cx + dx + 20, top);
  s += rope(cx - dx, top, cx, top + dy) + rope(cx + dx, top, cx, top + dy);
  s += line(cx, top + dy, cx, top + dy + 18) + `<rect x="${cx - 18}" y="${top + dy + 18}" width="36" height="26" class="d-section"/>` + t(cx, top + dy + 36, 'W', 'd-text-load');
  s += `<path d="M${cx - dx + 30},${top} A30,30 0 0,1 ${cx - dx + 30 * Math.cos(th) - 0},${top + 30 * Math.sin(th)}" class="d-accent" fill="none"/>`;
  s += t(cx - dx + 38, top + 16, `θ=${theta}°`, 'd-text-accent', 'start');
  s += t(cx - dx / 2 - 10, top + dy / 2 + 14, 'T', 'd-text-load', 'end') + t(cx + dx / 2 + 10, top + dy / 2 + 14, 'T', 'd-text-load', 'start');
  s += t(cx, top + dy + 64, 'T = W / (2 sin θ)', 'd-text-accent');
  return svg(320, Math.max(150, top + dy + 74), s, 'two cables');
}

export function capstanDrum() {
  let s = `<circle cx="160" cy="80" r="40" class="d-section"/><circle cx="160" cy="80" r="4" class="d-line"/>`;
  s += `<path d="M120,80 A40,40 0 1,1 160,120" class="d-rope-arc" fill="none"/>`;
  s += rope(120, 80, 120, 150) + arrow(120, 150, 120, 172) + t(108, 168, 'T₁ (גדול)', 'd-text-load', 'end');
  s += rope(160, 120, 260, 120) + arrow(260, 120, 290, 120) + t(286, 110, 'T₂', 'd-text-load', 'end');
  s += `<path d="M160,62 A18,18 0 1,1 142,80" class="d-accent" fill="none" stroke-dasharray="3 3"/>` + t(160, 36, 'θ (רדיאנים)', 'd-text-accent');
  s += t(220, 160, 'T₁ = T₂·e^(μθ)', 'd-text-accent');
  return svg(320, 180, s, 'capstan');
}

// =====================================================================
// INTUITION VISUALS
// =====================================================================
export function poissonBar() {
  let s = `<rect x="50" y="40" width="160" height="40" class="d-ghost"/>`;
  s += `<rect x="40" y="46" width="180" height="28" class="d-beam"/>`;
  s += arrow(40, 60, 12, 60) + arrow(220, 60, 248, 60);
  s += arrow(130, 30, 130, 44, 'd-accent', 'arra') + arrow(130, 90, 130, 76, 'd-accent', 'arra');
  s += t(130, 108, 'נמתח לאורך ← מתכווץ לרוחב', 'd-text') + t(262, 64, 'ν ≈ 0.3', 'd-text-accent', 'start');
  return svg(320, 118, s, 'Poisson effect');
}

export function torsionDistribution() {
  const prof = (cx, inner, title) => {
    let s = `<circle cx="${cx}" cy="70" r="44" class="d-section"/>` + (inner ? `<circle cx="${cx}" cy="70" r="${inner}" class="d-bg-stroke"/>` : '');
    s += line(cx, 70, cx + 44, 70, 'd-muted');
    s += `<path d="M${cx + (inner || 0)},70 L${cx + 44},70 L${cx + 44},${70 - 40} L${cx + (inner || 0)},${70 - (40 * (inner || 0)) / 44} Z" class="d-area-m"/>`;
    return s + t(cx, 136, title) + t(cx + 46, 26, 'τmax', 'd-text-load', 'start');
  };
  return svg(320, 146, prof(80, 0, 'מלא: המרכז כמעט לא עובד') + prof(230, 26, 'חלול: כל החומר עובד'), 'torsion distribution');
}

export function bendingFibers() {
  let s = `<path d="M40,56 Q160,96 280,56 L280,96 Q160,136 40,96 Z" class="d-beam"/>`;
  s += `<path d="M40,76 Q160,116 280,76" class="d-accent" fill="none" stroke-dasharray="6 4"/>` + t(284, 80, 'N.A.', 'd-text-accent', 'start');
  s += arrow(46, 48, 84, 58, 'd-load') + arrow(274, 48, 236, 58, 'd-load');
  s += arrow(84, 116, 46, 106, 'd-accent', 'arra') + arrow(236, 116, 274, 106, 'd-accent', 'arra');
  s += t(160, 26, 'למעלה: לחיצה, הסיבים מתקצרים', 'd-text-load');
  s += t(160, 152, 'למטה: מתיחה, הסיבים מתארכים', 'd-text-accent');
  return svg(320, 162, s, 'bending fibers');
}

// load vs strength scatter: two bell curves; overlap = failure probability
export function safetyDistributions() {
  const x0 = 20, y0 = 120, W = 280;
  const bell = (mu, sd, h) => { let p = ''; for (let i = 0; i <= 80; i++) { const x = mu - 4 * sd + (8 * sd * i) / 80; p += `${i ? 'L' : 'M'}${x0 + x * W},${y0 - h * Math.exp(-0.5 * ((x - mu) / sd) ** 2)} `; } return p; };
  let s = line(x0, y0, x0 + W, y0, 'd-muted');
  s += `<path d="${bell(0.32, 0.07, 80)}" class="d-curve2" fill="none"/>` + t(x0 + 0.32 * W, y0 - 86, 'עומס (מאמץ)', 'd-text');
  s += `<path d="${bell(0.68, 0.08, 80)}" class="d-curve" fill="none"/>` + t(x0 + 0.68 * W, y0 - 86, 'חוזק', 'd-text-accent');
  s += `<rect x="${x0 + 0.47 * W}" y="${y0 - 14}" width="${0.06 * W}" height="14" class="d-area-m"/>` + t(x0 + 0.5 * W, y0 + 16, 'חפיפה = סיכוי לכשל', 'd-text-load');
  s += line(x0 + 0.32 * W, y0 + 26, x0 + 0.68 * W, y0 + 26, 'd-accent') + t(x0 + 0.5 * W, y0 + 40, 'n = חוזק ממוצע / עומס ממוצע', 'd-text-accent');
  return svg(320, 168, s, 'safety factor distributions');
}

export function fractureSurface() {
  let s = `<circle cx="110" cy="80" r="62" class="d-section"/>`;
  for (let r = 12; r <= 66; r += 9) s += `<path d="M${110 - r},${142} A${r},${r} 0 0,1 ${110 + r},${142}" class="d-muted" fill="none" transform="translate(0,0)" clip-path="url(#fs)"/>`;
  s += `<defs><clipPath id="fs"><circle cx="110" cy="80" r="62"/></clipPath></defs>`;
  s += `<path d="M64,38 Q110,30 156,38 Q170,60 168,72 L52,72 Q50,60 64,38 Z" class="d-area-m"/>`;
  s += `<circle cx="110" cy="142" r="4" class="d-load-fill"/>` + t(110, 162, 'נקודת התחלה', 'd-text-load');
  s += t(200, 60, 'אזור גס: שבר סופי', 'd-text', 'start') + t(200, 110, 'קווי חוף: הסדק גדל', 'd-text-accent', 'start');
  s += t(200, 126, 'בכל מחזור קצת', 'd-text-accent', 'start');
  return svg(320, 172, s, 'fatigue fracture surface');
}

export function streamlinesHole() {
  let s = `<rect x="20" y="20" width="280" height="120" class="d-section"/><circle cx="160" cy="80" r="20" class="d-bg-stroke"/>`;
  for (const y of [32, 46, 60, 100, 114, 128]) {
    const bend = y < 80 ? -1 : 1, dist = Math.abs(y - 80);
    const k = Math.max(0, 34 - dist) * 0.9;
    s += `<path d="M20,${y} C110,${y} 130,${y + bend * k} 160,${y + bend * k} S210,${y} 300,${y}" class="d-curve" fill="none" stroke-width="1.4"/>`;
  }
  s += t(160, 156, 'קווי הכוח נדחסים סביב החור ← מאמץ שיא בשפה', 'd-text-load');
  return svg(320, 164, s, 'force flow around a hole');
}

export function couette() {
  let s = `<rect x="40" y="30" width="240" height="10" class="d-support"/><rect x="40" y="120" width="240" height="10" fill="url(#hatch)"/>` + line(40, 120, 280, 120);
  s += arrow(220, 22, 270, 22, 'd-load') + t(214, 26, 'V', 'd-text-load', 'end');
  s += `<rect x="40" y="40" width="240" height="80" class="d-water"/>`;
  for (let i = 1; i <= 6; i++) { const y = 120 - i * 11.4; s += arrow(60, y, 60 + i * 26, y, 'd-accent', 'arra'); }
  s += line(60, 120, 60 + 7 * 26 * 0.98, 40, 'd-muted', 'stroke-dasharray="3 3"');
  s += t(290, 84, 'h', 'd-text', 'start') + t(160, 146, 'השכבות מחליקות זו על זו', 'd-text') + t(160, 162, 'τ = μ·V/h', 'd-text-accent');
  return svg(320, 170, s, 'Couette flow');
}

// Bernoulli as stacked energy bars at two points: total stays equal
export function energyBars(opts = {}) {
  const pts = opts.points || [{ n: '1 (רחב)', P: 60, K: 10, Z: 20 }, { n: '2 (צר)', P: 30, K: 40, Z: 20 }];
  let s = '';
  const H = 110, base = 140, scale = H / 100;
  pts.forEach((p, i) => {
    const x = 70 + i * 120; let y = base;
    const seg = (v, cls, lbl) => { const h = v * scale; y -= h; return `<rect x="${x}" y="${y}" width="60" height="${h}" class="${cls}"/>` + (h > 12 ? t(x + 30, y + h / 2 + 4, lbl, 'd-text') : ''); };
    s += seg(p.Z, 'd-bar-z', 'ρgz') + seg(p.K, 'd-bar-k', '½ρV²') + seg(p.P, 'd-bar-p', 'P');
    s += t(x + 30, base + 16, p.n);
  });
  s += line(60, base - 90 * scale, 260, base - 90 * scale, 'd-load', 'stroke-dasharray="5 4"') + t(160, base - 90 * scale - 6, 'הסכום זהה בשתי הנקודות', 'd-text-load');
  return svg(320, 165, s, 'Bernoulli energy bars');
}

export function jominy() {
  const x0 = 40, y0 = 140, W = 250, H = 120;
  let s = arrow(x0, y0, x0 + W + 6, y0, 'd-muted', 'arrm') + arrow(x0, y0, x0, 10, 'd-muted', 'arrm');
  s += t(x0 + W, y0 + 16, 'מרחק מהקצה המצונן', 'd-text', 'end') + t(x0 - 4, 16, 'HRC', 'd-text', 'end');
  s += `<path d="M${x0},${y0 - 110} C${x0 + 40},${y0 - 110} ${x0 + 60},${y0 - 30} ${x0 + W},${y0 - 22}" class="d-curve2" fill="none"/>` + t(x0 + 70, y0 - 46, 'פלדת פחמן (1040)', 'd-text', 'start');
  s += `<path d="M${x0},${y0 - 112} C${x0 + 150},${y0 - 108} ${x0 + 190},${y0 - 80} ${x0 + W},${y0 - 66}" class="d-curve" fill="none"/>` + t(x0 + 120, y0 - 112, 'פלדת סגסוגת (4140)', 'd-text-accent', 'start');
  s += t(x0 + W / 2, y0 + 32, 'אותה קשיות בקצה, אבל הסגסוגת מוקשית לעומק', 'd-text-load');
  return svg(320, 180, s, 'Jominy hardenability');
}

export function caseProfile() {
  let s = `<circle cx="80" cy="80" r="56" class="d-area-m"/><circle cx="80" cy="80" r="44" class="d-section"/>` + t(80, 84, 'ליבה רקיעה') + t(80, 152, 'קליפה קשה', 'd-text-load');
  const x0 = 170, y0 = 130;
  s += arrow(x0, y0, 305, y0, 'd-muted', 'arrm') + arrow(x0, y0, x0, 20, 'd-muted', 'arrm') + t(300, y0 + 14, 'עומק', 'd-text', 'end') + t(x0 - 4, 26, 'HRC', 'd-text', 'end');
  s += `<path d="M${x0},40 L${x0 + 30},42 C${x0 + 50},44 ${x0 + 60},96 ${x0 + 90},100 L${x0 + 130},101" class="d-curve" fill="none"/>`;
  s += t(x0 + 6, 34, '60', 'd-text-load', 'start') + t(x0 + 128, 94, '~30', 'd-text', 'end');
  return svg(320, 165, s, 'case hardening profile');
}

export function anodizeGrowth() {
  let s = `<rect x="40" y="70" width="240" height="70" class="d-section"/>` + t(160, 115, 'אלומיניום');
  s += line(40, 70, 280, 70, 'd-load', 'stroke-dasharray="5 4"') + t(160, 156, 'הקו המקווקו: פני השטח לפני הציפוי', 'd-text-load');
  s += `<rect x="40" y="50" width="240" height="40" class="d-coat"/>`;
  s += t(160, 64, '50% צומח החוצה', 'd-text') + t(160, 85, '50% חודר פנימה', 'd-text');
  s += arrow(296, 50, 296, 90, 'd-muted', 'arrm') + arrow(296, 90, 296, 50, 'd-muted', 'arrm') + t(300, 74, 't', 'd-text', 'start');
  s += t(160, 30, 'פין: d+t   קדח: d−t', 'd-text-accent');
  return svg(320, 164, s, 'anodize growth');
}

export function passiveLayer() {
  const panel = (x, title, scratched, healed) => {
    let s = `<rect x="${x}" y="60" width="86" height="56" class="d-section"/>`;
    s += line(x, 58, x + 86, 58, 'd-accent', `stroke-width="4"${scratched ? ` stroke-dasharray="34 14"` : ''}`);
    if (healed) s += line(x + 34, 58, x + 48, 58, 'd-accent', 'stroke-width="2"');
    return s + t(x + 43, 136, title);
  };
  let s = panel(14, 'שכבת Cr₂O₃', false, false) + panel(117, 'שריטה', true, false) + panel(220, 'מתחדשת בחמצן', true, true);
  s += t(160, 30, 'נירוסטה: מעל 10.5% Cr השכבה מתחדשת לבד', 'd-text-accent');
  s += arrow(102, 88, 114, 88, 'd-muted', 'arrm') + arrow(205, 88, 217, 88, 'd-muted', 'arrm');
  return svg(320, 146, s, 'passive layer');
}

export function hazProfile() {
  let s = `<rect x="20" y="40" width="280" height="40" class="d-section"/><path d="M145,40 L160,26 L175,40 L175,80 L145,80 Z" class="d-area-m"/>` + t(160, 20, 'תפר', 'd-text-load');
  s += `<rect x="105" y="40" width="40" height="40" class="d-haz"/><rect x="175" y="40" width="40" height="40" class="d-haz"/>` + t(125, 96, 'HAZ') + t(195, 96, 'HAZ');
  const y0 = 170;
  s += line(20, y0, 300, y0, 'd-muted') + t(24, y0 - 52, 'Sy', 'd-text', 'start');
  s += `<path d="M20,${y0 - 50} L100,${y0 - 50} C120,${y0 - 50} 125,${y0 - 24} 145,${y0 - 22} L175,${y0 - 22} C195,${y0 - 24} 200,${y0 - 50} 220,${y0 - 50} L300,${y0 - 50}" class="d-curve" fill="none"/>`;
  s += t(160, y0 - 28, '6061-T6: בערך חצי', 'd-text-load') + t(60, y0 - 56, '275 MPa', 'd-text-accent');
  return svg(320, 180, s, 'HAZ strength profile');
}

export function galvanicCell() {
  let s = `<rect x="20" y="90" width="280" height="40" class="d-water"/>` + t(120, 120, 'אלקטרוליט: לחות, מי מלח');
  s += `<rect x="40" y="40" width="200" height="50" class="d-section"/>` + t(140, 70, 'קתודה גדולה (נירוסטה)');
  s += `<rect x="240" y="50" width="34" height="80" class="d-anode"/>` + t(257, 44, 'אנודה', 'd-text-load');
  s += t(257, 150, 'בורג קטן', 'd-text-load');
  s += `<path d="M250,96 l4,6 l4,-6 M262,110 l4,6 l4,-6" class="d-load" fill="none"/>`;
  s += arrow(236, 60, 200, 60, 'd-accent', 'arra') + t(214, 54, 'e⁻', 'd-text-accent');
  s += t(160, 18, 'אנודה קטנה + קתודה גדולה = קורוזיה מהירה', 'd-text-load');
  return svg(320, 158, s, 'galvanic cell');
}

// =====================================================================
// THERMODYNAMICS & HEAT TRANSFER
// =====================================================================
const axes = (x0, y0, W, H, xl, yl) =>
  arrow(x0, y0, x0 + W + 6, y0, 'd-muted', 'arrm') + arrow(x0, y0, x0, y0 - H - 6, 'd-muted', 'arrm') +
  t(x0 + W + 4, y0 + 16, xl, 'd-text', 'end') + t(x0 - 6, y0 - H, yl, 'd-text', 'end');

// P-v diagram of an ideal air-standard cycle, computed from the process equations (k = 1.4)
export function pvCycle(kind = 'otto', opts = {}) {
  const k = 1.4, r = opts.r ?? 8, rc = opts.rc ?? 2, rp = opts.rp ?? 8;
  const iso = (P1, v1, v2, n = 30) => { const pts = []; for (let i = 0; i <= n; i++) { const v = v1 + ((v2 - v1) * i) / n; pts.push([v, P1 * (v1 / v) ** k]); } return pts; };
  let pts = [], labels = [];
  if (kind === 'otto') {
    const v1 = 1, v2 = 1 / r, P1 = 1, P2 = P1 * r ** k, P3 = P2 * 2.2, P4 = P3 / r ** k;
    pts = [...iso(P1, v1, v2), [v2, P3], ...iso(P3, v2, v1), [v1, P1]];
    labels = [[v1, P1, '1'], [v2, P2, '2'], [v2, P3, '3'], [v1, P4, '4']];
  } else if (kind === 'diesel') {
    const v1 = 1, v2 = 1 / r, v3 = v2 * rc, P1 = 1, P2 = P1 * r ** k, P4 = P2 * (v3 / v1) ** k;
    pts = [...iso(P1, v1, v2), [v3, P2], ...iso(P2, v3, v1), [v1, P1]];
    labels = [[v1, P1, '1'], [v2, P2, '2'], [v3, P2, '3'], [v1, P4, '4']];
  } else { // brayton
    const P1 = 1, P2 = rp, v1 = 1, v2 = v1 / rp ** (1 / k), v3 = v2 * 2.4, v4 = v3 * rp ** (1 / k);
    pts = [...iso(P1, v1, v2), [v3, P2], ...iso(P2, v3, v4), [v1, P1]];
    labels = [[v1, P1, '1'], [v2, P2, '2'], [v3, P2, '3'], [v4, P1, '4']];
  }
  const vmax = Math.max(...pts.map((p) => p[0])) * 1.05, pmax = Math.max(...pts.map((p) => p[1])) * 1.08;
  const x0 = 40, y0 = 170, W = 260, H = 150;
  const X = (v) => x0 + (v / vmax) * W, Y = (P) => y0 - (P / pmax) * H;
  let s = axes(x0, y0, W, H, 'v', 'P');
  s += `<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0])},${Y(p[1])}`).join(' ')} Z" class="d-cycle"/>`;
  labels.forEach(([v, P, n]) => (s += `<circle cx="${X(v)}" cy="${Y(P)}" r="3" class="d-load-fill"/>` + t(X(v) + 6, n === '1' ? Y(P) + 14 : Y(P) - 6, n, 'd-text-load', 'start')));
  const name = { otto: 'Otto: חום בנפח קבוע', diesel: 'Diesel: חום בלחץ קבוע', brayton: 'Brayton: חום ופליטה בלחץ קבוע' }[kind];
  s += t(x0 + W, 26, name, 'd-text-accent', 'end') + t(x0 + W, 42, 'השטח הכלוא = עבודה נטו', 'd-text', 'end');
  return svg(320, 190, s, `${kind} P-v diagram`);
}

export function tsCarnot() {
  const x0 = 40, y0 = 160, W = 250, H = 140;
  let s = axes(x0, y0, W, H, 's', 'T');
  s += `<rect x="90" y="40" width="160" height="80" class="d-cycle"/>`;
  s += `<rect x="90" y="120" width="160" height="${y0 - 120}" class="d-area-v"/>`;
  s += t(170, 34, 'T_H: קליטת חום', 'd-text-load') + t(170, 116, 'T_C: פליטת חום', 'd-text-accent');
  s += t(170, 84, 'עבודה נטו', 'd-text') + t(170, 146, 'חום שנפלט', 'd-text');
  return svg(320, 180, s, 'Carnot T-s');
}

export function heatEngine(kind = 'engine') {
  const fridge = kind === 'fridge';
  let s = `<rect x="90" y="10" width="140" height="30" rx="8" class="d-hot"/>` + t(160, 30, fridge ? 'חם (המטבח / בחוץ)' : 'מאגר חם T_H', 'd-text');
  s += `<rect x="90" y="140" width="140" height="30" rx="8" class="d-cold"/>` + t(160, 160, fridge ? 'קר (בתוך המקרר)' : 'מאגר קר T_C', 'd-text');
  s += `<circle cx="160" cy="90" r="28" class="d-section"/>` + t(160, 94, fridge ? 'מקרר' : 'מנוע');
  if (!fridge) {
    s += arrow(160, 40, 160, 60) + t(170, 54, 'Q_H', 'd-text-load', 'start');
    s += arrow(160, 118, 160, 138, 'd-accent', 'arra') + t(170, 132, 'Q_C', 'd-text-accent', 'start');
    s += arrow(188, 90, 250, 90) + t(256, 94, 'W', 'd-text-load', 'start');
    s += t(30, 90, 'η = W/Q_H', 'd-text-accent', 'start');
  } else {
    s += arrow(160, 138, 160, 118, 'd-accent', 'arra') + t(170, 132, 'Q_L', 'd-text-accent', 'start');
    s += arrow(160, 60, 160, 40) + t(170, 54, 'Q_H', 'd-text-load', 'start');
    s += arrow(250, 90, 190, 90) + t(256, 94, 'W', 'd-text-load', 'start');
    s += t(30, 90, 'COP = Q_L/W', 'd-text-accent', 'start');
  }
  return svg(320, 180, s, fridge ? 'refrigerator' : 'heat engine');
}

// vapour-compression loop (fridge / AC)
export function fridgeLoop() {
  const box = (x, y, w, h, label, cls = 'd-section') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="${cls}"/>` + t(x + w / 2, y + h / 2 + 4, label);
  let s = box(90, 14, 140, 30, 'מעבה: פולט חום', 'd-hot') + box(90, 136, 140, 30, 'מאייד: סופג חום', 'd-cold');
  s += box(250, 74, 60, 34, 'מדחס') + box(10, 74, 66, 34, 'שסתום');
  s += `<path d="M280,74 L280,29 L230,29" class="d-curve" fill="none" marker-end="url(#arra)"/>` + `<path d="M90,29 L43,29 L43,74" class="d-curve" fill="none" marker-end="url(#arra)"/>`;
  s += `<path d="M43,108 L43,151 L90,151" class="d-curve2" fill="none" marker-end="url(#arra)"/>` + `<path d="M230,151 L280,151 L280,108" class="d-curve2" fill="none" marker-end="url(#arra)"/>`;
  s += t(160, 64, 'לחץ גבוה', 'd-text-load') + t(160, 122, 'לחץ נמוך', 'd-text-accent');
  return svg(320, 176, s, 'vapour-compression cycle');
}

export function rankineLoop() {
  const box = (x, y, w, h, label, cls = 'd-section') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="${cls}"/>` + t(x + w / 2, y + h / 2 + 4, label);
  let s = box(90, 14, 140, 30, 'דוד: מים → קיטור', 'd-hot') + box(90, 136, 140, 30, 'מעבה: קיטור → מים', 'd-cold');
  s += box(250, 74, 60, 34, 'טורבינה') + box(10, 74, 66, 34, 'משאבה');
  s += `<path d="M230,29 L280,29 L280,74" class="d-curve" fill="none" marker-end="url(#arra)"/>` + `<path d="M280,108 L280,151 L230,151" class="d-curve" fill="none" marker-end="url(#arra)"/>`;
  s += `<path d="M90,151 L43,151 L43,108" class="d-curve2" fill="none" marker-end="url(#arra)"/>` + `<path d="M43,74 L43,29 L90,29" class="d-curve2" fill="none" marker-end="url(#arra)"/>`;
  s += t(160, 70, 'הטורבינה מפיקה הרבה יותר', 'd-text-load') + t(160, 88, 'ממה שהמשאבה צורכת', 'd-text-load') + t(160, 106, 'כי שואבים נוזל, לא גז', 'd-text');
  return svg(320, 176, s, 'Rankine cycle');
}

// composite wall: temperature drops in proportion to each layer's resistance
export function wallProfile(opts = {}) {
  const layers = opts.layers || [{ n: 'לבנה', R: 0.028, w: 90 }, { n: 'בידוד', R: 0.125, w: 50 }];
  const Ti = opts.Ti ?? 20, To = opts.To ?? 0, Rtot = layers.reduce((a, l) => a + l.R, 0);
  const x0 = 70, top = 30, H = 120;
  const Y = (T) => top + ((Ti - T) / (Ti - To)) * H;
  let s = '', x = x0, T = Ti, pts = [[x0, Y(Ti)]];
  layers.forEach((l, i) => {
    s += `<rect x="${x}" y="${top}" width="${l.w}" height="${H}" class="${i % 2 ? 'd-coat' : 'd-section'}"/>` + t(x + l.w / 2, top + H + 16, l.n);
    T -= ((Ti - To) * l.R) / Rtot; x += l.w; pts.push([x, Y(T)]);
  });
  s += `<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')}" class="d-load" fill="none" stroke-width="3"/>`;
  s += t(x0 - 6, Y(Ti) + 4, `${Ti}°C`, 'd-text-load', 'end') + t(x + 6, Y(To) + 4, `${To}°C`, 'd-text-accent', 'start');
  s += t(160, 18, 'הטמפרטורה יורדת בעיקר בשכבה עם ההתנגדות הגדולה', 'd-text');
  return svg(320, 172, s, 'composite wall');
}

export function resistanceChain(opts = {}) {
  const items = opts.items || [['R_jc', 'צומת → מארז'], ['R_cs', 'משחה תרמית'], ['R_sa', 'גוף קירור → אוויר']];
  let s = `<circle cx="22" cy="60" r="8" class="d-load-fill"/>` + t(22, 40, 'Tj', 'd-text-load') + t(22, 90, 'P [W]', 'd-text-load');
  let x = 30;
  items.forEach(([name, desc]) => {
    s += line(x, 60, x + 12, 60) + `<path d="M${x + 12},60 l6,-10 l10,20 l10,-20 l10,20 l10,-20 l10,20 l6,-10" class="d-line" fill="none"/>`;
    s += t(x + 41, 40, name, 'd-text-accent') + t(x + 41, 88, desc, 'd-text');
    x += 82;
  });
  s += line(x, 60, x + 8, 60) + `<circle cx="${x + 12}" cy="60" r="5" class="d-accent-fill"/>` + t(x + 4, 40, 'Ta', 'd-text-accent');
  s += t(160, 116, 'Tj = Ta + P·(R_jc + R_cs + R_sa)', 'd-text-load');
  return svg(320, 126, s, 'thermal resistance chain');
}

// hot/cold temperature along a heat exchanger, computed for given end temperatures
export function hxProfiles(type = 'counter', opts = {}) {
  const Th1 = opts.Th1 ?? 100, Th2 = opts.Th2 ?? 60, Tc1 = opts.Tc1 ?? 20, Tc2 = opts.Tc2 ?? 50;
  const x0 = 40, y0 = 150, W = 250, H = 120, Tmax = Math.max(Th1, Tc2) * 1.05;
  const X = (u) => x0 + u * W, Y = (T) => y0 - (T / Tmax) * H;
  let s = axes(x0, y0, W, H, 'אורך', 'T');
  const curve = (a, b, cls) => { let p = ''; for (let i = 0; i <= 30; i++) { const u = i / 30, T = a + (b - a) * (1 - Math.exp(-2 * u)) / (1 - Math.exp(-2)); p += `${i ? 'L' : 'M'}${X(u)},${Y(T)} `; } return `<path d="${p}" class="${cls}" fill="none"/>`; };
  s += curve(Th1, Th2, 'd-curve-hot');
  s += type === 'counter' ? curve(Tc2, Tc1, 'd-curve') : curve(Tc1, Tc2, 'd-curve');
  s += t(X(0) + 4, Y(Th1) - 6, `חם: נכנס ${Th1}, יוצא ${Th2}`, 'd-text-load', 'start');
  s += t(X(1), Y(type === 'counter' ? Tc1 : Tc2) + 16, `קר: נכנס ${Tc1}, יוצא ${Tc2}`, 'd-text-accent', 'end');
  s += t(X(0.5), 12, type === 'counter' ? 'זרימה נגדית: הפרש אחיד יותר' : 'זרימה מקבילה: הפרש גדול רק בהתחלה', 'd-text');
  return svg(320, 176, s, `${type}-flow heat exchanger`);
}

export function coolingCurve(opts = {}) {
  const Ti = opts.Ti ?? 300, Tinf = opts.Tinf ?? 25, tau = opts.tau ?? 120, tmax = 5 * tau;
  const x0 = 46, y0 = 150, W = 250, H = 120;
  const X = (tt) => x0 + (tt / tmax) * W, Y = (T) => y0 - ((T - Tinf * 0.9) / (Ti - Tinf * 0.9)) * H;
  let s = axes(x0, y0, W, H, 't', 'T');
  let p = ''; for (let i = 0; i <= 60; i++) { const tt = (tmax * i) / 60; p += `${i ? 'L' : 'M'}${X(tt)},${Y(Tinf + (Ti - Tinf) * Math.exp(-tt / tau))} `; }
  s += `<path d="${p}" class="d-curve-hot" fill="none"/>` + line(x0, Y(Tinf), x0 + W, Y(Tinf), 'd-muted', 'stroke-dasharray="4 3"');
  const T1 = Tinf + (Ti - Tinf) * Math.exp(-1);
  s += line(X(tau), Y(T1), X(tau), y0, 'd-accent', 'stroke-dasharray="3 3"') + `<circle cx="${X(tau)}" cy="${Y(T1)}" r="4" class="d-accent-fill"/>` + t(X(tau) + 6, Y(T1) - 6, 'τ: נשאר 37% מההפרש', 'd-text-accent', 'start');
  s += t(x0 + W, Y(Tinf) - 6, 'T∞', 'd-text', 'end');
  return svg(320, 172, s, 'lumped cooling curve');
}

export function heatModes() {
  let s = `<rect x="20" y="70" width="90" height="60" class="d-hot"/>` + t(65, 104, 'חם');
  // conduction: rod into the block
  s += `<rect x="110" y="92" width="70" height="16" class="d-section"/>` + arrow(118, 100, 172, 100) + t(145, 124, 'הולכה', 'd-text-load');
  // convection: rising air
  s += `<path d="M50,64 q-8,-12 0,-22 q8,-10 0,-22" class="d-curve" fill="none"/><path d="M80,64 q-8,-12 0,-22 q8,-10 0,-22" class="d-curve" fill="none"/>` + t(65, 14, 'הסעה', 'd-text-accent');
  // radiation: wavy arrows
  for (const y of [70, 100, 128]) s += `<path d="M200,${y} q8,-8 16,0 t16,0 t16,0 t16,0" class="d-curve2" fill="none"/>` + arrow(264, y, 290, y, 'd-curve2');
  s += t(245, 154, 'קרינה (גם בוואקום)', 'd-text');
  return svg(320, 162, s, 'three modes of heat transfer');
}

export function psychro() {
  const x0 = 40, y0 = 150, W = 250, H = 120;
  let s = axes(x0, y0, W, H, 'T יבש', 'ω');
  let p = ''; for (let i = 0; i <= 40; i++) { const u = i / 40; p += `${i ? 'L' : 'M'}${x0 + u * W},${y0 - H * (Math.exp(3 * u) - 1) / (Math.exp(3) - 1)} `; }
  s += `<path d="${p}" class="d-curve" fill="none"/>` + t(x0 + W * 0.98, y0 - H * 1.02, 'רוויה 100%', 'd-text-accent', 'end');
  const cx = x0 + W * 0.78, cy = y0 - H * 0.22;
  s += `<circle cx="${cx}" cy="${cy}" r="4" class="d-load-fill"/>`;
  s += arrow(cx, cy, cx + 40, cy) + t(cx + 20, cy + 16, 'חימום', 'd-text');
  s += arrow(cx, cy, cx - 46, cy, 'd-accent', 'arra') + t(cx - 24, cy + 16, 'קירור', 'd-text-accent');
  s += arrow(cx, cy, cx, cy - 34, 'd-curve2') + t(cx + 6, cy - 26, 'הוספת לחות', 'd-text', 'start');
  s += t(x0 + W / 2, y0 + 30, 'קירור עד קו הרוויה (נקודת הטל): המים מתחילים להתעבות', 'd-text');
  return svg(320, 188, s, 'psychrometric processes');
}

// =====================================================================
// ELECTRICITY & DRIVES
// =====================================================================
const resistor = (x, y, w = 40, vertical = false) => vertical
  ? `<path d="M${x},${y} l0,6 l-7,4 l14,6 l-14,6 l14,6 l-14,6 l7,4 l0,${w - 38}" class="d-line" fill="none"/>`
  : `<path d="M${x},${y} l6,0 l4,-7 l6,14 l6,-14 l6,14 l6,-14 l4,7 l${w - 38},0" class="d-line" fill="none"/>`;
const battery = (x, y) => line(x - 10, y, x + 10, y, 'd-line', 'stroke-width="3"') + line(x - 5, y + 7, x + 5, y + 7, 'd-line', 'stroke-width="3"') + t(x + 16, y - 2, '+', 'd-text-load', 'start');

// water analogy: pressure = voltage, flow = current, narrow pipe = resistance
export function waterAnalogy() {
  let s = `<rect x="20" y="30" width="60" height="90" class="d-cold"/>` + `<rect x="20" y="30" width="60" height="30" class="d-bg"/>` + t(50, 22, 'לחץ = מתח V', 'd-text-load');
  s += `<path d="M80,105 L150,105 L160,100 L220,100 L230,105 L300,105 L300,120 L230,120 L220,116 L160,116 L150,120 L80,120 Z" class="d-water"/>`;
  s += t(190, 92, 'צינור צר = התנגדות R', 'd-text');
  for (const x of [100, 180, 260]) s += arrow(x, 112, x + 22, 112, 'd-accent', 'arra');
  s += t(190, 140, 'ספיקה = זרם I', 'd-text-accent');
  s += t(160, 160, 'יותר לחץ או צינור רחב יותר ← יותר זרימה: I = V/R', 'd-text');
  return svg(320, 170, s, 'water analogy');
}

export function circuits() {
  let s = battery(30, 60) + line(30, 60, 30, 26) + line(30, 67, 30, 100) + line(30, 26, 60, 26) + resistor(60, 26, 44) + resistor(104, 26, 44) + line(148, 26, 148, 100) + line(30, 100, 148, 100);
  s += t(82, 16, 'R₁', 'd-text-accent') + t(126, 16, 'R₂', 'd-text-accent') + t(89, 120, 'טור: R = R₁+R₂', 'd-text-load') + t(89, 136, 'אותו זרם, המתח מתחלק', 'd-text');
  const x0 = 180;
  s += battery(x0, 60) + line(x0, 60, x0, 26) + line(x0, 67, x0, 100) + line(x0, 26, 300, 26) + line(x0, 100, 300, 100);
  s += line(240, 26, 240, 42) + resistor(240, 42, 44, true) + line(240, 86, 240, 100) + line(290, 26, 290, 42) + resistor(290, 42, 44, true) + line(290, 86, 290, 100);
  s += t(226, 66, 'R₁', 'd-text-accent', 'end') + t(276, 66, 'R₂', 'd-text-accent', 'end');
  s += t(245, 120, 'מקביל: 1/R = 1/R₁+1/R₂', 'd-text-load') + t(245, 136, 'אותו מתח, הזרם מתחלק', 'd-text');
  return svg(320, 146, s, 'series and parallel');
}

export function sineWave(opts = {}) {
  const x0 = 30, y0 = 80, W = 270, A = 55;
  let s = line(x0, y0, x0 + W, y0, 'd-muted') + arrow(x0, 140, x0, 14, 'd-muted', 'arrm');
  let p = ''; for (let i = 0; i <= 120; i++) { const u = i / 120; p += `${i ? 'L' : 'M'}${x0 + u * W},${y0 - A * Math.sin(u * 4 * Math.PI)} `; }
  s += `<path d="${p}" class="d-curve" fill="none"/>`;
  s += line(x0, y0 - A, x0 + W, y0 - A, 'd-muted', 'stroke-dasharray="3 3"') + t(x0 + W, y0 - A - 4, opts.peak || 'שיא: 325 V', 'd-text', 'end');
  s += line(x0, y0 - A / Math.SQRT2, x0 + W, y0 - A / Math.SQRT2, 'd-load', 'stroke-dasharray="6 3"') + t(x0 + W, y0 - A / Math.SQRT2 + 14, opts.rms || 'RMS: 230 V', 'd-text-load', 'end');
  s += line(x0 + W / 2, y0 + A + 6, x0 + W, y0 + A + 6, 'd-accent') + t(x0 + (3 * W) / 4, y0 + A + 20, 'מחזור אחד: 20 ms (50 Hz)', 'd-text-accent');
  return svg(320, 162, s, 'AC sine wave');
}

export function threePhase() {
  const x0 = 20, y0 = 75, W = 280, A = 50;
  let s = line(x0, y0, x0 + W, y0, 'd-muted');
  ['d-curve', 'd-curve2', 'd-curve-hot'].forEach((cls, k) => {
    let p = ''; for (let i = 0; i <= 120; i++) { const u = i / 120; p += `${i ? 'L' : 'M'}${x0 + u * W},${y0 - A * Math.sin(u * 4 * Math.PI - (k * 2 * Math.PI) / 3)} `; }
    s += `<path d="${p}" class="${cls}" fill="none"/>`;
  });
  s += t(160, 148, 'שלוש פאזות, מוזזות 120° זו מזו: L1, L2, L3', 'd-text');
  s += t(160, 164, 'בין פאזה לאפס 230 V, בין שתי פאזות 400 V', 'd-text-accent');
  return svg(320, 172, s, 'three-phase');
}

export function transformer(opts = {}) {
  let s = `<path d="M100,30 h120 v110 h-120 Z M120,50 h80 v70 h-80 Z" class="d-section" fill-rule="evenodd"/>`;
  for (let i = 0; i < 5; i++) s += `<path d="M92,${56 + i * 12} h36" class="d-load" stroke-width="3"/>`;
  for (let i = 0; i < 9; i++) s += `<path d="M192,${52 + i * 7} h36" class="d-curve2" stroke-width="2.4"/>`;
  s += line(40, 56, 92, 56, 'd-load') + line(40, 104, 92, 104, 'd-load') + t(36, 84, opts.V1 || 'V₁', 'd-text-load', 'end');
  s += line(228, 52, 280, 52, 'd-curve2') + line(228, 108, 280, 108, 'd-curve2') + t(284, 84, opts.V2 || 'V₂', 'd-text', 'start');
  s += t(110, 156, opts.N1 || 'N₁', 'd-text-load') + t(210, 156, opts.N2 || 'N₂', 'd-text');
  s += t(160, 22, 'V₂/V₁ = N₂/N₁  ,  I₂/I₁ = N₁/N₂', 'd-text-accent');
  return svg(320, 166, s, 'transformer');
}

export function dcMotorCurve() {
  const x0 = 40, y0 = 150, W = 250, H = 120;
  let s = axes(x0, y0, W, H, 'מהירות', 'T, I');
  s += line(x0, y0 - H, x0 + W, y0, 'd-curve') + t(x0 + 6, y0 - H + 4, 'מומנט וזרם התנעה מקסימליים', 'd-text-load', 'start');
  s += `<circle cx="${x0 + W}" cy="${y0}" r="4" class="d-accent-fill"/>` + t(x0 + W, y0 - 10, 'מהירות בלי עומס', 'd-text-accent', 'end');
  s += `<circle cx="${x0 + W * 0.8}" cy="${y0 - H * 0.2}" r="4" class="d-load-fill"/>` + t(x0 + W * 0.8 - 6, y0 - H * 0.2 - 8, 'נקודת עבודה', 'd-text', 'end');
  s += t(x0 + W / 2, y0 + 30, 'כשהמנוע מאיץ, ה-back EMF גדל והזרם יורד', 'd-text');
  return svg(320, 188, s, 'DC motor torque-speed');
}

export function inductionCurve() {
  const x0 = 40, y0 = 150, W = 250, H = 120;
  let s = axes(x0, y0, W, H, '', 'T');
  // Kloss-style curve: T ∝ 2 Tmax / (s/sk + sk/s), sk = 0.2
  const sk = 0.2; let p = '';
  for (let i = 0; i <= 80; i++) { const n = i / 80; const sl = Math.max(1 - n, 1e-4); const T = 2 / (sl / sk + sk / sl); p += `${i ? 'L' : 'M'}${x0 + n * W},${y0 - T * H * 0.92} `; }
  s += `<path d="${p}" class="d-curve" fill="none"/>`;
  s += line(x0 + W, y0, x0 + W, y0 - 10, 'd-muted') + t(x0 + W, y0 + 14, 'Ns', 'd-text-accent', 'end');
  const nOp = 0.965, slOp = 1 - nOp, Top = 2 / (slOp / sk + sk / slOp);
  s += `<circle cx="${x0 + nOp * W}" cy="${y0 - Top * H * 0.92}" r="4" class="d-load-fill"/>` + t(x0 + nOp * W - 8, y0 - Top * H * 0.92 + 4, 'עבודה (החלקה של כמה %)', 'd-text-load', 'end');
  s += t(x0 + W * 0.8, y0 - H - 2, 'מומנט מקסימלי', 'd-text', 'middle');
  return svg(320, 170, s, 'induction motor torque-speed');
}

export function leadScrew() {
  let s = `<rect x="16" y="50" width="56" height="44" rx="6" class="d-section"/>` + t(44, 76, 'מנוע');
  s += `<rect x="72" y="64" width="16" height="16" class="d-support"/>` + t(80, 104, 'מצמד', 'd-text');
  s += `<rect x="88" y="68" width="210" height="8" class="d-beam"/>`;
  for (let x = 92; x < 296; x += 8) s += line(x, 68, x + 5, 76, 'd-muted');
  s += `<rect x="170" y="52" width="56" height="40" rx="4" class="d-coat"/>` + t(198, 46, 'עגלה', 'd-text-accent');
  s += arrow(232, 120, 286, 120, 'd-accent', 'arra') + t(160, 124, 'סיבוב אחד = התקדמות של lead', 'd-text');
  s += t(160, 146, 'רזולוציה = lead / (צעדים × מיקרו-צעדים)', 'd-text-load');
  return svg(320, 156, s, 'lead screw drive');
}

export function gears(opts = {}) {
  const gear = (cx, cy, r, n, cls) => { let p = ''; for (let i = 0; i < n * 2; i++) { const a = (i * Math.PI) / n, rr = i % 2 ? r : r + 6; p += `${i ? 'L' : 'M'}${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)} `; } return `<path d="${p}Z" class="${cls}"/><circle cx="${cx}" cy="${cy}" r="4" class="d-line"/>`; };
  let s = gear(90, 80, 26, 10, 'd-section') + gear(186, 80, 64, 24, 'd-coat');
  s += t(60, 132, 'קטן: מהיר,', 'd-text-load') + t(60, 148, 'מומנט נמוך', 'd-text-load') + t(186, 162, 'גדול: איטי, מומנט גבוה', 'd-text-accent');
  s += t(290, 30, `i = ${opts.i || 'N₂/N₁'}`, 'd-text-accent', 'end');
  return svg(320, 172, s, 'gear reduction');
}

export function homePanel() {
  let s = `<rect x="10" y="10" width="300" height="150" rx="8" class="d-ghost"/>`;
  const dev = (x, y, w, label, sub, cls = 'd-section') => `<rect x="${x}" y="${y}" width="${w}" height="44" rx="4" class="${cls}"/>` + t(x + w / 2, y + 20, label) + t(x + w / 2, y + 36, sub, 'd-text');
  s += dev(20, 24, 66, 'מפסק ראשי', 'מנתק הכל', 'd-hot') + dev(96, 24, 74, 'ממסר פחת', '30 mA', 'd-cold');
  s += arrow(86, 46, 94, 46, 'd-muted', 'arrm') + arrow(170, 46, 178, 46, 'd-muted', 'arrm');
  const brk = [['תאורה', '10A'], ['שקעים', '16A'], ['מזגן', '16A'], ['דוד', '16A']];
  brk.forEach(([n, a], i) => (s += dev(180 + (i % 2) * 64, 24 + Math.floor(i / 2) * 52, 58, a, n)));
  s += t(240, 136, 'מאמ"תים: מעגל לכל צרכן', 'd-text-accent');
  s += t(100, 96, 'פס הארקה ואפס', 'd-text') + line(30, 106, 170, 106, 'd-curve2', 'stroke-width="5"');
  s += t(100, 136, 'הערכים להמחשה בלבד', 'd-text');
  return svg(320, 170, s, 'home electrical panel');
}

export function gridChain() {
  const rows = [
    ['תחנת כוח', 'ייצור', 'd-hot'],
    ['שנאי העלאה', 'מעלה את המתח', 'd-section'],
    ['קווי מתח עליון', '400 kV / 161 kV', 'd-section'],
    ['תחנת משנה', 'מוריד ל-22 kV', 'd-section'],
    ['קווי מתח גבוה', 'עמודים, או כבל תת-קרקעי', 'd-section'],
    ['שנאי חלוקה', 'מוריד ל-400/230 V', 'd-cold'],
  ];
  let s = '';
  rows.forEach(([n, v, cls], i) => {
    const y = 8 + i * 34;
    s += `<rect x="196" y="${y}" width="116" height="26" rx="5" class="${cls}"/>` + t(254, y + 17, n);
    s += t(188, y + 17, v, i === 2 || i === 3 || i === 5 ? 'd-text-load' : 'd-text', 'end');
    if (i < rows.length - 1) s += arrow(254, y + 26, 254, y + 33, 'd-muted', 'arrm');
  });
  // tower and pole sketches
  s += `<path d="M90,270 L106,216 L122,270 M96,254 L116,254 M100,238 L112,238 M84,222 L128,222" class="d-line" fill="none"/>` + t(106, 284, 'עמוד סריג (מתח עליון)', 'd-text');
  s += `<path d="M230,270 L230,228 M218,232 L242,232" class="d-line" fill="none" stroke-width="2.5"/>` + t(230, 284, 'עמוד חלוקה', 'd-text');
  s += t(160, 306, 'מתח גבוה = זרם נמוך = הפסדים קטנים', 'd-text-accent');
  return svg(320, 314, s, 'power grid chain');
}

export function cableSagSketch() {
  let s = line(30, 40, 30, 150, 'd-line', 'stroke-width="3"') + line(290, 40, 290, 150, 'd-line', 'stroke-width="3"');
  s += `<path d="M30,40 Q160,120 290,40" class="d-rope" fill="none"/>` + `<path d="M30,40 Q160,96 290,40" class="d-curve" fill="none" stroke-dasharray="4 3"/>`;
  s += line(30, 40, 290, 40, 'd-muted', 'stroke-dasharray="3 3"') + arrow(160, 40, 160, 80, 'd-load') + t(166, 64, 'sag', 'd-text-load', 'start');
  s += t(160, 30, 'L', 'd-text') + t(160, 140, 'בקיץ הכבל מתארך ושוקע יותר', 'd-text') + t(160, 158, 'sag ≈ wL² / 8H', 'd-text-accent');
  return svg(320, 168, s, 'cable sag');
}

// =====================================================================
// MACHINE DESIGN
// =====================================================================
export function shaftLayout() {
  let s = `<rect x="20" y="70" width="280" height="16" rx="3" class="d-beam"/>`;
  // bearings
  for (const x of [50, 250]) s += `<rect x="${x - 12}" y="62" width="24" height="32" class="d-support"/><circle cx="${x - 5}" cy="70" r="3" class="d-line"/><circle cx="${x + 5}" cy="86" r="3" class="d-line"/>` + t(x, 112, 'מיסב', 'd-text');
  // gear and pulley
  s += `<rect x="128" y="36" width="20" height="84" rx="3" class="d-coat"/>` + t(124, 30, 'גלגל שיניים', 'd-text', 'end');
  s += `<rect x="282" y="52" width="14" height="52" rx="2" class="d-section"/>` + t(289, 46, 'גלגלת', 'd-text');
  s += arrow(138, 6, 138, 34) + t(150, 18, 'W', 'd-text-load', 'start');
  s += `<path d="M300,60 A10,18 0 1,1 300,96" class="d-load" fill="none" marker-end="url(#arr)"/>` + t(312, 64, 'T', 'd-text-load', 'start');
  s += t(160, 140, 'כפיפה (M) מהכוחות + פיתול (T) מההנעה', 'd-text-accent');
  s += t(160, 156, 'כתפיים, שגמים וחריצים = ריכוזי מאמצים', 'd-text');
  return svg(320, 164, s, 'shaft layout');
}

export function bearingLife() {
  const x0 = 46, y0 = 150, W = 250, H = 125;
  let s = axes(x0, y0, W, H, 'עומס P', 'חיים L10');
  let p = '', q = '';
  for (let i = 0; i <= 50; i++) { const u = 0.25 + (i / 50) * 1.75; p += `${i ? 'L' : 'M'}${x0 + ((u - 0.25) / 1.75) * W},${y0 - Math.min(1, (1 / u ** 3) / 64) * H} `; q += `${i ? 'L' : 'M'}${x0 + ((u - 0.25) / 1.75) * W},${y0 - Math.min(1, (1 / u ** (10 / 3)) / 101.6) * H} `; }
  s += `<path d="${p}" class="d-curve" fill="none"/><path d="${q}" class="d-curve2" fill="none" stroke-dasharray="5 3"/>`;
  s += t(x0 + W * 0.42, y0 - H * 0.5, 'L ∝ (C/P)³ כדורי', 'd-text-accent', 'start') + t(x0 + W * 0.42, y0 - H * 0.36, 'L ∝ (C/P)^(10/3) גלילי', 'd-text', 'start');
  s += t(x0 + W / 2, y0 + 30, 'עומס כפול ← חיים קטנים פי 8', 'd-text-load');
  return svg(320, 188, s, 'bearing life');
}

export function boltJoint() {
  let s = `<rect x="70" y="50" width="180" height="30" class="d-section"/><rect x="70" y="80" width="180" height="30" class="d-coat"/>`;
  s += `<rect x="148" y="32" width="24" height="96" class="d-support"/>` + `<rect x="134" y="20" width="52" height="14" rx="2" class="d-line-fill"/>` + `<rect x="134" y="128" width="52" height="14" rx="2" class="d-line-fill"/>`;
  for (let y = 36; y < 126; y += 7) s += line(148, y, 172, y + 4, 'd-muted');
  s += arrow(160, 14, 160, 2, 'd-accent', 'arra') + arrow(160, 148, 160, 160, 'd-accent', 'arra');
  s += t(192, 44, 'הבורג נמתח (Fi)', 'd-text-load', 'start') + t(192, 124, 'החלקים נלחצים', 'd-text-accent', 'start');
  s += arrow(40, 65, 68, 65) + arrow(40, 95, 68, 95) + t(36, 84, 'P', 'd-text-load', 'end');
  s += t(160, 178, 'הבורג מרגיש רק C·P מהעומס החיצוני', 'd-text-accent');
  return svg(320, 186, s, 'bolted joint');
}

// joint diagram: bolt and member force-deflection lines (to scale for C)
export function jointDiagram(opts = {}) {
  const C = opts.C ?? 0.25; const kb = C, km = 1 - C; // relative stiffnesses
  const x0 = 30, y0 = 150, H = 110, Fi = 0.7;
  const db = Fi / kb, dm = Fi / km; // deflections to reach Fi
  const scale = 240 / (db + dm);
  const xb = x0 + db * scale;
  let s = line(x0, y0, x0 + 260, y0, 'd-muted') + arrow(x0, y0, x0, 20, 'd-muted', 'arrm') + t(x0 - 4, 26, 'F', 'd-text', 'end');
  s += line(x0, y0, xb, y0 - Fi * H, 'd-curve') + line(xb, y0 - Fi * H, xb + dm * scale, y0, 'd-curve2');
  s += line(x0, y0 - Fi * H, xb, y0 - Fi * H, 'd-muted', 'stroke-dasharray="3 3"') + t(x0 + 4, y0 - Fi * H - 6, 'Fi', 'd-text-load', 'start');
  s += t((x0 + xb) / 2 - 12, y0 - (Fi * H) / 2, 'בורג (k_b)', 'd-text-accent', 'end') + t(xb + (dm * scale) / 2 + 10, y0 - (Fi * H) / 2, 'חלקים (k_m)', 'd-text', 'start');
  s += t(160, y0 + 20, 'חלקים קשיחים מהבורג ← C קטן ← הבורג "מוגן"', 'd-text');
  return svg(320, 180, s, 'bolt joint diagram');
}

export function helicalSpring() {
  let p = 'M160,20';
  for (let i = 0; i < 8; i++) { const y = 28 + i * 14; p += ` L${i % 2 ? 110 : 210},${y} `; }
  p += ' L160,150';
  let s = `<path d="${p}" class="d-rope" fill="none" stroke-width="5"/>`;
  s += line(100, 20, 220, 20, 'd-line', 'stroke-width="3"') + line(100, 150, 220, 150, 'd-line', 'stroke-width="3"');
  s += arrow(160, 4, 160, 18) + t(172, 10, 'F', 'd-text-load', 'start');
  s += arrow(160, 168, 110, 168, 'd-muted', 'arrm') + arrow(160, 168, 210, 168, 'd-muted', 'arrm') + t(160, 182, 'D (קוטר ממוצע)', 'd-text');
  s += t(240, 70, 'd = קוטר תיל', 'd-text-accent', 'start') + t(240, 88, 'N = כריכות', 'd-text-accent', 'start') + t(240, 106, 'C = D/d', 'd-text-accent', 'start');
  s += t(56, 84, 'k = Gd⁴/8D³N', 'd-text-load', 'middle');
  return svg(320, 190, s, 'helical spring');
}

export function stribeck() {
  const x0 = 40, y0 = 150, W = 260, H = 120;
  let s = axes(x0, y0, W, H, 'μN/P', 'f');
  const fr = (u) => 0.12 / (1 + Math.exp((u - 0.32) * 18)) + 0.012 + 0.09 * Math.max(0, u - 0.42);
  let p = '', umin = 0; for (let i = 0; i <= 600; i++) { const u = i / 600; if (fr(u) < fr(umin)) umin = u; if (i % 10 === 0) p += `${i ? 'L' : 'M'}${x0 + u * W},${y0 - (fr(u) / 0.15) * H} `; }
  s += `<path d="${p}" class="d-curve" fill="none"/>`;
  s += line(x0 + 0.24 * W, y0, x0 + 0.24 * W, 30, 'd-grid', 'stroke-dasharray="3 3"') + line(x0 + 0.42 * W, y0, x0 + 0.42 * W, 30, 'd-grid', 'stroke-dasharray="3 3"');
  s += t(x0 + 0.12 * W, 24, 'גבולי', 'd-text') + t(x0 + 0.33 * W, 24, 'מעורב', 'd-text') + t(x0 + 0.7 * W, 24, 'הידרודינמי', 'd-text');
  s += `<circle cx="${x0 + umin * W}" cy="${y0 - (fr(umin) / 0.15) * H}" r="4" class="d-load-fill"/>` + t(x0 + W, y0 - 6, 'מינימום: במעבר לשכבה מלאה', 'd-text-load', 'end');
  return svg(320, 170, s, 'Stribeck curve');
}

export function keySection() {
  let s = `<circle cx="120" cy="90" r="60" class="d-coat"/><circle cx="120" cy="90" r="36" class="d-section"/>`;
  s += `<rect x="112" y="46" width="16" height="16" class="d-load-fill" opacity="0.85"/>` + t(160, 50, 'שגם (w × h)', 'd-text-load', 'start');
  s += t(120, 96, 'ציר') + t(120, 140, 'רכזת (hub)', 'd-text');
  s += `<path d="M150,94 A30,30 0 0,1 120,124" class="d-accent" fill="none" marker-end="url(#arra)"/>` + t(160, 128, 'T', 'd-text-accent', 'start');
  s += t(160, 178, 'נבדק בגזירה ובלחיצה (bearing) על הדפנות', 'd-text');
  return svg(320, 186, s, 'key in shaft');
}

export function filletWeld() {
  let s = `<rect x="30" y="100" width="260" height="20" class="d-section"/><rect x="150" y="20" width="20" height="80" class="d-section"/>`;
  s += `<path d="M150,100 L150,76 L126,100 Z" class="d-area-m"/><path d="M170,100 L170,76 L194,100 Z" class="d-area-m"/>`;
  s += line(170, 100, 182, 88, 'd-accent', 'stroke-width="2.4"') + t(196, 84, 'גרון t = 0.707h', 'd-text-accent', 'start');
  s += t(118, 70, 'h', 'd-text-load', 'end');
  s += arrow(160, 18, 160, 2, 'd-load') + t(172, 10, 'F', 'd-text-load', 'start');
  s += t(160, 146, 'τ = F / (0.707·h·L)', 'd-text-load') + t(160, 162, 'הכשל בדרך כלל דרך הגרון, בגזירה', 'd-text');
  return svg(320, 170, s, 'fillet weld');
}

export function beltDrive() {
  let s = `<circle cx="80" cy="80" r="30" class="d-section"/><circle cx="240" cy="80" r="50" class="d-section"/>`;
  s += line(80, 50, 240, 30, 'd-rope') + line(80, 110, 240, 130, 'd-rope');
  s += t(160, 30, 'F₁ (צד מתוח)', 'd-text-load') + t(160, 140, 'F₂ (צד רפוי)', 'd-text-accent');
  s += `<path d="M66,62 A22,22 0 0,1 100,64" class="d-load" fill="none" marker-end="url(#arr)"/>` + t(80, 84, 'מניע');
  s += t(240, 84, 'מונע');
  s += t(160, 166, 'P = (F₁ − F₂)·V ,  F₁/F₂ ≤ e^(fφ)', 'd-text-accent');
  return svg(320, 174, s, 'belt drive');
}

export function pressFit() {
  let s = `<circle cx="110" cy="85" r="66" class="d-coat"/><circle cx="110" cy="85" r="34" class="d-section"/>`;
  for (let a = 0; a < 12; a++) { const th = (a * Math.PI) / 6; s += arrow(110 + 44 * Math.cos(th), 85 + 44 * Math.sin(th), 110 + 36 * Math.cos(th), 85 + 36 * Math.sin(th), 'd-load'); }
  s += t(110, 89, 'ציר') + t(110, 166, 'רכזת', 'd-text');
  s += t(200, 50, 'הציר גדול מהחור ב-δ', 'd-text', 'start') + t(200, 70, 'לחץ מגע p בממשק', 'd-text-load', 'start') + t(200, 90, 'מומנט = f·p·(2πRL)·R', 'd-text-accent', 'start');
  return svg(320, 174, s, 'press fit');
}

// =====================================================================
// TOLERANCES & GD&T
// =====================================================================
// classic fit diagram: hole and shaft tolerance zones around the zero line, to scale
export function fitDiagram(D = 25, holeGrade = 7, letter = 'g', shaftGrade = 6) {
  const h = holeH(D, holeGrade), sh = shaftLimits(D, letter, shaftGrade);
  const vals = [h.lo, h.hi, sh.lo, sh.hi, 0];
  const top = Math.max(...vals) + 6, bot = Math.min(...vals) - 6;
  const y0 = 20, H = 140, Y = (v) => y0 + ((top - v) / (top - bot)) * H;
  let s = line(30, Y(0), 300, Y(0), 'd-line', 'stroke-width="2"') + t(304, Y(0) + 4, '0', 'd-text', 'start') + t(36, Y(0) - 6, `Ø${D}`, 'd-text', 'start');
  s += `<rect x="90" y="${Y(h.hi)}" width="60" height="${Y(h.lo) - Y(h.hi)}" class="d-hole"/>` + t(120, Y(h.hi) - 6, `H${holeGrade}`, 'd-text-accent');
  s += `<rect x="180" y="${Y(sh.hi)}" width="60" height="${Y(sh.lo) - Y(sh.hi)}" class="d-shaft"/>` + t(210, Y(sh.lo) + 14, `${letter}${shaftGrade}`, 'd-text-load');
  [[h.hi, 150], [h.lo, 150], [sh.hi, 240], [sh.lo, 240]].forEach(([v, x]) => (s += t(x + 6, Y(v) + 4, `${v > 0 ? '+' : ''}${v}`, 'd-text', 'start')));
  const f0 = fit(D, holeGrade, letter, shaftGrade);
  const kind = f0.minClearance >= 0 ? 'מרווח' : f0.maxClearance <= 0 ? 'לחיצה' : 'מעבר';
  s += t(160, y0 + H + 18, `התאמת ${kind} (µm)`, 'd-text-accent');
  return svg(320, 186, s, 'ISO fit diagram');
}

export function stackChain(opts = {}) {
  const parts = opts.parts || [['A', 30, 0.1], ['B', 20, 0.05], ['C', 40, 0.1]];
  const total = parts.reduce((a, p) => a + p[1], 0), W = 260, x0 = 30;
  let x = x0, s = '';
  parts.forEach(([n, L, tol], i) => {
    const w = (L / total) * W;
    s += `<rect x="${x}" y="40" width="${w}" height="40" class="${i % 2 ? 'd-coat' : 'd-section'}"/>` + t(x + w / 2, 64, n);
    s += arrow(x + w / 2, 96, x, 96, 'd-muted', 'arrm') + arrow(x + w / 2, 96, x + w, 96, 'd-muted', 'arrm') + t(x + w / 2, 112, `${L} ±${tol}`, 'd-text');
    x += w;
  });
  s += arrow(x0 + W / 2, 136, x0, 136, 'd-load') + arrow(x0 + W / 2, 136, x0 + W, 136, 'd-load') + t(x0 + W / 2, 152, 'סה"כ: הטולרנסים מצטברים', 'd-text-load');
  s += t(x0 + W / 2, 26, 'Worst case: Σt    RSS: √Σt²', 'd-text-accent');
  return svg(320, 162, s, 'tolerance stack-up');
}

// GD&T characteristic symbols drawn as vectors (symbol fonts are missing on many phones)
export function gdtSym(kind, x, y, sz = 12) {
  const L = (x1, y1, x2, y2) => `<line x1="${x + x1 * sz}" y1="${y + y1 * sz}" x2="${x + x2 * sz}" y2="${y + y2 * sz}" class="d-sym"/>`;
  const C = (cx, cy, r) => `<circle cx="${x + cx * sz}" cy="${y + cy * sz}" r="${r * sz}" class="d-sym" fill="none"/>`;
  const A = (d) => `<path d="${d}" class="d-sym" fill="none"/>`;
  switch (kind) {
    case 'flatness': return A(`M${x - 0.8 * sz},${y + 0.5 * sz} L${x - 0.4 * sz},${y - 0.5 * sz} L${x + 0.8 * sz},${y - 0.5 * sz} L${x + 0.4 * sz},${y + 0.5 * sz} Z`);
    case 'straightness': return L(-0.8, 0, 0.8, 0);
    case 'circularity': return C(0, 0, 0.6);
    case 'cylindricity': return C(0, 0, 0.5) + L(-0.75, 0.7, -0.25, -0.7) + L(0.25, 0.7, 0.75, -0.7);
    case 'perpendicularity': return L(-0.7, 0.6, 0.7, 0.6) + L(0, 0.6, 0, -0.7);
    case 'parallelism': return L(-0.55, 0.6, -0.05, -0.6) + L(0.05, 0.6, 0.55, -0.6);
    case 'angularity': return L(-0.7, 0.6, 0.7, 0.6) + L(-0.7, 0.6, 0.6, -0.5);
    case 'position': return C(0, 0, 0.5) + L(-0.8, 0, 0.8, 0) + L(0, -0.8, 0, 0.8);
    case 'profileLine': return A(`M${x - 0.7 * sz},${y + 0.4 * sz} A${0.7 * sz},${0.7 * sz} 0 0,1 ${x + 0.7 * sz},${y + 0.4 * sz}`);
    case 'profileSurface': return A(`M${x - 0.7 * sz},${y + 0.4 * sz} A${0.7 * sz},${0.7 * sz} 0 0,1 ${x + 0.7 * sz},${y + 0.4 * sz} Z`);
    case 'runout': return L(-0.5, 0.6, 0.4, -0.5) + A(`M${x + 0.05 * sz},${y - 0.55 * sz} L${x + 0.45 * sz},${y - 0.55 * sz} L${x + 0.45 * sz},${y - 0.15 * sz}`);
    case 'totalRunout': return L(-0.7, 0.6, 0.1, -0.5) + L(-0.2, 0.6, 0.6, -0.5) + L(-0.8, 0.6, 0, 0.6) + A(`M${x - 0.2 * sz},${y - 0.55 * sz} L${x + 0.15 * sz},${y - 0.55 * sz} L${x + 0.15 * sz},${y - 0.2 * sz}`) + A(`M${x + 0.3 * sz},${y - 0.55 * sz} L${x + 0.65 * sz},${y - 0.55 * sz} L${x + 0.65 * sz},${y - 0.2 * sz}`);
    case 'mmc': return C(0, 0, 0.62) + `<text x="${x}" y="${y + 0.38 * sz}" class="d-fcf-small" text-anchor="middle">M</text>`;
    default: return '';
  }
}

// feature control frame. cells: {sym} or text
export function fcf(opts = {}) {
  const cells = opts.cells || [{ sym: 'position' }, { text: 'Ø0.1', mmc: true }, { text: 'A' }, { text: 'B' }, { text: 'C' }];
  const widths = cells.map((c) => (c.text && c.text.length > 2 ? 80 : 34));
  let x = (320 - widths.reduce((a, b) => a + b, 0)) / 2, s = '';
  cells.forEach((c, i) => {
    s += `<rect x="${x}" y="30" width="${widths[i]}" height="34" class="d-support"/>`;
    if (c.sym) s += gdtSym(c.sym, x + widths[i] / 2, 47, 11);
    else {
      const tx = c.mmc ? x + widths[i] / 2 - 10 : x + widths[i] / 2;
      s += `<text x="${tx}" y="53" class="d-fcf" text-anchor="middle">${c.text}</text>` + (c.mmc ? gdtSym('mmc', x + widths[i] - 16, 47, 10) : '');
    }
    x += widths[i];
  });
  const labels = opts.labels || ['סוג הבקרה', 'גודל אזור הטולרנס', 'Datums בסדר עדיפות'];
  s += t(70, 88, labels[0], 'd-text-accent') + t(160, 104, labels[1], 'd-text-load') + t(255, 88, labels[2], 'd-text');
  return svg(320, 114, s, 'feature control frame');
}

export function datums321() {
  let s = `<path d="M70,130 L230,130 L280,95 L120,95 Z" class="d-section"/><path d="M70,130 L70,60 L120,25 L120,95" class="d-coat" fill-opacity=".6"/><path d="M230,130 L230,60 L70,60" class="d-ghost"/>`;
  [[100, 122], [190, 124], [200, 102]].forEach(([x, y]) => (s += `<circle cx="${x}" cy="${y}" r="5" class="d-load-fill"/>`));
  [[82, 100], [104, 60]].forEach(([x, y]) => (s += `<circle cx="${x}" cy="${y}" r="5" class="d-accent-fill"/>`));
  s += `<circle cx="160" cy="62" r="5" class="d-curve2-fill"/>`;
  s += t(300, 150, 'ראשי A: שלוש נקודות', 'd-text-load', 'end') + t(20, 18, 'משני B: שתי נקודות', 'd-text-accent', 'start') + t(300, 42, 'שלישוני C: נקודה אחת', 'd-text', 'end');
  s += t(160, 176, '3 + 2 + 1 = 6 דרגות חופש נעולות', 'd-text-accent');
  return svg(320, 186, s, '3-2-1 datum scheme');
}

export function gdtSymbols() {
  const rows = [
    ['צורה', [['flatness', 'שטיחות'], ['straightness', 'ישרות'], ['circularity', 'עגילות'], ['cylindricity', 'גליליות']]],
    ['כיוון', [['perpendicularity', 'ניצבות'], ['parallelism', 'מקבילות'], ['angularity', 'זוויתיות']]],
    ['מיקום', [['position', 'מיקום']]],
    ['פרופיל', [['profileLine', 'פרופיל קו'], ['profileSurface', 'פרופיל משטח']]],
    ['נענוע', [['runout', 'נענוע מעגלי'], ['totalRunout', 'נענוע כולל']]],
  ];
  let s = '';
  rows.forEach(([cat, items], r) => {
    const y = 10 + r * 46;
    s += t(306, y + 20, cat, 'd-text-accent', 'end');
    items.forEach(([sym, name], i) => {
      const x = 232 - i * 62;
      s += `<rect x="${x - 22}" y="${y}" width="44" height="28" rx="4" class="d-support"/>` + gdtSym(sym, x, y + 14, 12) + t(x, y + 40, name, 'd-text');
    });
  });
  s += t(160, 254, 'צורה: בלי datum. כיוון ומיקום: עם datum', 'd-text');
  return svg(320, 262, s, 'GD&T symbols');
}

export function positionZone(opts = {}) {
  const tol = opts.tol ?? 0.1, dx = opts.dx ?? 0.03, dy = opts.dy ?? 0.04;
  const sc = 100 / tol, cx = 110, cy = 90;
  let s = `<circle cx="${cx}" cy="${cy}" r="${(tol / 2) * sc}" class="d-circle"/>`;
  s += line(cx - 70, cy, cx + 70, cy, 'd-muted', 'stroke-dasharray="4 3"') + line(cx, cy - 70, cx, cy + 70, 'd-muted', 'stroke-dasharray="4 3"');
  const px = cx + dx * sc, py = cy - dy * sc;
  s += `<circle cx="${px}" cy="${py}" r="5" class="d-load-fill"/>` + line(cx, cy, px, py, 'd-load');
  s += t(cx, cy + (tol / 2) * sc + 18, `אזור Ø${tol}`, 'd-text-accent');
  s += t(214, 60, 'מרכז הקדח בפועל', 'd-text-load', 'start') + t(214, 80, 'Ø = 2√(Δx² + Δy²)', 'd-text-accent', 'start') + t(214, 100, 'בתוך העיגול = תקין', 'd-text', 'start');
  return svg(320, 180, s, 'position tolerance zone');
}

export function mmcBonus(opts = {}) {
  const mmc = opts.mmc ?? 10.0, lmc = opts.lmc ?? 10.2, tol = opts.tol ?? 0.1, hole = opts.hole ?? true;
  const x0 = 50, y0 = 150, W = 240, H = 120, span = lmc - mmc;
  const X = (v) => x0 + ((v - mmc) / span) * W, Y = (v) => y0 - (v / (tol + span)) * H;
  let s = axes(x0, y0, W, H, '', 'טולרנס');
  s += `<path d="M${X(mmc)},${Y(tol)} L${X(lmc)},${Y(tol + span)}" class="d-curve" fill="none"/>` + line(X(mmc), Y(tol), X(lmc), Y(tol), 'd-curve2', 'stroke-dasharray="5 3"');
  s += t(X(mmc), y0 + 16, `MMC ${mmc}`, 'd-text-accent') + t(X(lmc), y0 + 16, `LMC ${lmc}`, 'd-text');
  s += t(X(mmc) + 6, Y(tol) + 16, `${tol} (RFS)`, 'd-text', 'start') + t(X(lmc) - 4, Y(tol + span) + 18, `עם MMC: ${(tol + span).toFixed(2)}`, 'd-text-load', 'end');
  s += t(x0 + W / 2, y0 + 32, hole ? 'הגודל בפועל: קדח גדול יותר = יותר בונוס' : 'הגודל בפועל: פין קטן יותר = יותר בונוס', 'd-text');
  return svg(320, 192, s, 'MMC bonus tolerance');
}

export function roughness() {
  const x0 = 20, W = 280, y0 = 80;
  let p = ''; let sumAbs = 0; const N = 200, vals = [];
  for (let i = 0; i <= N; i++) { const u = i / N; const v = 18 * Math.sin(u * 40) + 9 * Math.sin(u * 97 + 1) + 5 * Math.sin(u * 211 + 2); vals.push(v); }
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  vals.forEach((v, i) => { sumAbs += Math.abs(v - mean); p += `${i ? 'L' : 'M'}${x0 + (i / N) * W},${y0 - (v - mean)} `; });
  const Ra = sumAbs / vals.length;
  let s = `<path d="${p} L${x0 + W},140 L${x0},140 Z" class="d-section"/>`;
  s += line(x0, y0, x0 + W, y0, 'd-load', 'stroke-dasharray="5 3"');
  s += line(x0, y0 - Ra, x0 + W, y0 - Ra, 'd-accent', 'stroke-dasharray="2 3"') + line(x0, y0 + Ra, x0 + W, y0 + Ra, 'd-accent', 'stroke-dasharray="2 3"');
  s += t(160, 158, 'קו אדום: קו ממוצע. קווים ירוקים: Ra מעליו ומתחתיו', 'd-text');
  s += t(160, 174, 'Ra = ממוצע הסטייה המוחלטת מהקו הממוצע', 'd-text-accent');
  s += t(160, 190, 'ערכים נפוצים בשרטוט: 3.2, 1.6, 0.8 µm', 'd-text');
  return svg(320, 198, s, 'surface roughness Ra');
}

// =====================================================================
// MANUFACTURING & DFM
// =====================================================================
export function turning() {
  let s = `<rect x="20" y="40" width="30" height="80" fill="url(#hatch)"/>` + line(50, 40, 50, 120);
  s += `<rect x="50" y="56" width="200" height="48" rx="3" class="d-beam"/><rect x="170" y="62" width="80" height="36" class="d-section"/>`;
  s += `<path d="M196,104 L210,124 L240,124 L226,104 Z" class="d-load-fill"/>` + t(244, 138, 'כלי', 'd-text-load', 'start');
  s += `<path d="M120,48 A16,34 0 0,1 120,112" class="d-accent" fill="none" marker-end="url(#arra)"/>` + t(108, 36, 'n', 'd-text-accent');
  s += arrow(232, 132, 200, 132, 'd-muted', 'arrm') + t(178, 136, 'f (הזנה)', 'd-text', 'end');
  s += line(250, 98, 262, 98, 'd-muted') + line(250, 104, 262, 104, 'd-muted') + t(266, 104, 'ap', 'd-text', 'start');
  s += t(160, 160, 'Vc = π·D·n / 1000  [m/min]', 'd-text-accent');
  return svg(320, 168, s, 'turning');
}

export function milling() {
  let s = `<rect x="30" y="100" width="260" height="40" class="d-section"/><rect x="130" y="80" width="70" height="20" class="d-beam"/>`;
  s += `<rect x="150" y="20" width="30" height="60" class="d-support"/>`;
  for (let y = 26; y < 78; y += 10) s += line(150, y, 180, y + 6, 'd-muted');
  s += `<path d="M190,30 A12,8 0 1,1 190,46" class="d-accent" fill="none" marker-end="url(#arra)"/>` + t(206, 26, 'n', 'd-text-accent', 'start');
  s += arrow(130, 90, 80, 90) + t(76, 86, 'vf', 'd-text-load', 'end');
  s += t(165, 160, 'vf = fz · z · n ,  MRR = ae · ap · vf', 'd-text-accent');
  return svg(320, 168, s, 'milling');
}

export function sheetBend() {
  let s = `<path d="M30,120 L150,120 A30,30 0 0,0 180,90 L180,20" class="d-line" fill="none" stroke-width="10" stroke-linecap="square" opacity="0.25"/>`;
  s += `<path d="M30,115 L150,115 A25,25 0 0,0 175,90 L175,20" class="d-line" fill="none"/><path d="M30,125 L150,125 A35,35 0 0,0 185,90 L185,20" class="d-line" fill="none"/>`;
  s += `<path d="M30,119 L150,119 A29,29 0 0,0 179,90 L179,20" class="d-accent" fill="none" stroke-dasharray="5 3"/>`;
  s += t(90, 108, 'L₁', 'd-text') + t(196, 56, 'L₂', 'd-text', 'start');
  s += t(232, 112, 'ציר ניטרלי ב-K·T', 'd-text-accent', 'start') + t(232, 128, 'לא משנה אורך', 'd-text-accent', 'start');
  s += t(150, 160, 'BA = θ · (R + K·T) ,  Flat = L₁ + L₂ + BA', 'd-text-load');
  return svg(320, 170, s, 'sheet metal bend');
}

export function moldPart() {
  let s = `<path d="M40,130 L60,40 L260,40 L280,130 L260,130 L246,58 L74,58 L60,130 Z" class="d-section"/>`;
  s += `<rect x="156" y="58" width="9" height="56" class="d-coat"/>` + t(240, 146, 'צלע: 0.5-0.6 מעובי הדופן', 'd-text-accent');
  s += line(60, 130, 60, 20, 'd-muted', 'stroke-dasharray="3 3"') + `<path d="M60,70 A60,60 0 0,1 51,70" class="d-load" fill="none"/>` + t(30, 30, 'זווית שחרור', 'd-text-load', 'start');
  s += t(160, 30, 'דופן אחידה', 'd-text') + arrow(160, 152, 160, 134, 'd-muted', 'arrm') + t(90, 146, 'כיוון פתיחת התבנית', 'd-text');
  return svg(320, 156, s, 'injection molded part');
}

export function amLayers() {
  let s = '';
  for (let i = 0; i < 9; i++) { const y = 130 - i * 11; const x2 = 150 + (i > 3 ? (i - 3) * 11 : 0); s += `<rect x="60" y="${y}" width="${x2 - 60}" height="10" rx="2" class="${i % 2 ? 'd-coat' : 'd-section'}"/>`; }
  s += line(150, 96, 216, 30, 'd-load', 'stroke-dasharray="4 3"') + t(222, 40, 'עד 45° בלי תמיכה', 'd-text-load', 'start');
  s += arrow(40, 140, 40, 40, 'd-accent', 'arra') + t(36, 34, 'Z', 'd-text-accent', 'end');
  s += t(160, 160, 'חלש יותר בכיוון Z (בין השכבות)', 'd-text');
  return svg(320, 168, s, 'additive layers');
}

// unit cost vs quantity for three processes (log quantity), crossovers visible
export function costCurves() {
  const procs = [['3D', 0, 40, 'd-curve2'], ['CNC', 300, 15, 'd-curve'], ['הזרקה', 20000, 1.5, 'd-curve-hot']];
  const x0 = 46, y0 = 150, W = 250, H = 125;
  const X = (N) => x0 + (Math.log10(N) / 5) * W, Y = (c) => y0 - Math.min(1, Math.log10(c) / 4.4) * H;
  let s = axes(x0, y0, W, H, '', '₪/יח׳') + t(x0 + W / 2, y0 + 30, 'כמות (סקאלה לוגריתמית)', 'd-text');
  procs.forEach(([n, F, v, cls]) => {
    let p = ''; for (let i = 0; i <= 50; i++) { const N = 10 ** ((i / 50) * 5); p += `${i ? 'L' : 'M'}${X(N)},${Y(F / N + v)} `; }
    s += `<path d="${p}" class="${cls}" fill="none"/>`;
  });
  [1, 10, 100, 1000, 1e4, 1e5].forEach((N, i) => (s += t(X(N), y0 + 14, ['1', '10', '100', '1k', '10k', '100k'][i])));
  s += t(X(3), Y(40) - 6, '3D', 'd-text', 'start') + t(X(12), Y(300 / 12 + 15) - 8, 'CNC', 'd-text-accent', 'start') + t(X(3e4), Y(20000 / 3e4 + 1.5) - 8, 'הזרקה', 'd-text-load', 'start');
  return svg(320, 186, s, 'unit cost vs quantity');
}

// process distribution against spec limits (to scale for given Cpk)
export function cpkCurve(opts = {}) {
  const LSL = opts.LSL ?? 9.95, USL = opts.USL ?? 10.05, mu = opts.mean ?? 10.02, sg = opts.sigma ?? 0.01;
  const lo = LSL - (USL - LSL) * 0.3, hi = USL + (USL - LSL) * 0.3, x0 = 20, W = 280, y0 = 140;
  const X = (v) => x0 + ((v - lo) / (hi - lo)) * W;
  let p = ''; for (let i = 0; i <= 120; i++) { const v = lo + ((hi - lo) * i) / 120; p += `${i ? 'L' : 'M'}${X(v)},${y0 - 100 * Math.exp(-0.5 * ((v - mu) / sg) ** 2)} `; }
  let s = line(x0, y0, x0 + W, y0, 'd-muted') + `<path d="${p}" class="d-cycle"/>`;
  s += line(X(LSL), 20, X(LSL), y0, 'd-load', 'stroke-dasharray="5 3"') + line(X(USL), 20, X(USL), y0, 'd-load', 'stroke-dasharray="5 3"');
  s += t(X(LSL), 16, 'LSL', 'd-text-load') + t(X(USL), 16, 'USL', 'd-text-load') + line(X(mu), y0, X(mu), y0 + 6, 'd-accent') + t(X(mu), y0 + 18, 'μ', 'd-text-accent');
  const k = Math.min(USL - mu, mu - LSL) / (3 * sg);
  s += t(160, 178, `Cpk = ${k.toFixed(2)}: הגבול הקרוב קובע`, 'd-text');
  return svg(320, 186, s, 'process capability');
}

export function npiFlow() {
  const steps = [['קונספט', 'דרישות'], ['תכן', 'PDR / CDR'], ['אב-טיפוס', 'EVT / DVT'], ['פיילוט', 'PVT, FAI'], ['ייצור', 'סדרתי']];
  let s = '';
  steps.forEach(([n, sub], i) => {
    const x = 266 - i * 58;
    s += `<rect x="${x - 25}" y="40" width="50" height="40" rx="6" class="${i === 3 ? 'd-cold' : 'd-section'}"/>` + t(x, 64, n, 'd-text');
    s += t(x, 98, sub, 'd-text-accent');
    if (i < steps.length - 1) s += arrow(x - 25, 60, x - 33, 60, 'd-muted', 'arrm');
  });
  s += t(160, 22, 'NPI: מרעיון לייצור, עם סקירות בכל שער', 'd-text');
  s += t(160, 128, 'כל שינוי אחרי שחרור עובר ECO מבוקר', 'd-text-load');
  return svg(320, 138, s, 'NPI flow');
}

export function fishbone() {
  let s = arrow(20, 90, 250, 90, 'd-line') + `<rect x="252" y="72" width="60" height="36" rx="4" class="d-hot"/>` + t(282, 94, 'תקלה');
  const cats = [['שיטה', 60, 30], ['מכונה', 140, 30], ['חומר', 220, 30], ['אדם', 60, 150], ['מדידה', 140, 150], ['סביבה', 220, 150]];
  cats.forEach(([n, x, y]) => { s += line(x, y + (y < 90 ? 10 : -10), x + 30, 90, 'd-muted') + t(x, y < 90 ? y + 4 : y + 6, n, 'd-text-accent'); });
  s += t(140, 170, 'Ishikawa: מחפשים סיבות בכל ענף, ואז 5 Why לשורש', 'd-text');
  return svg(320, 178, s, 'Ishikawa diagram');
}

// =====================================================================
// DYNAMICS & VIBRATION
// =====================================================================
export function massSpringDamper() {
  let s = line(40, 150, 280, 150, 'd-line', 'stroke-width="2"') + `<rect x="40" y="150" width="240" height="8" fill="url(#hatch)"/>`;
  let p = 'M110,150'; for (let i = 0; i < 8; i++) p += ` L${i % 2 ? 98 : 122},${142 - i * 9}`; p += ' L110,70';
  s += `<path d="${p}" class="d-rope" fill="none"/>` + t(90, 110, 'k', 'd-text-accent', 'end');
  s += line(210, 150, 210, 120) + `<rect x="198" y="96" width="24" height="26" class="d-ghost"/>` + line(204, 108, 216, 108) + line(210, 108, 210, 70) + t(230, 110, 'c', 'd-text-accent', 'start');
  s += `<rect x="80" y="30" width="160" height="40" rx="4" class="d-section"/>` + t(160, 55, 'm');
  s += arrow(260, 50, 260, 16, 'd-load') + t(268, 26, 'x(t)', 'd-text-load', 'start');
  s += t(160, 178, 'ωn = √(k/m) ,  ζ = c / 2√(km)', 'd-text-accent');
  return svg(320, 186, s, 'mass-spring-damper');
}

export function freeResponse(opts = {}) {
  const zeta = opts.zeta ?? 0.06, x0 = 30, y0 = 90, W = 270, A = 60;
  let p = ''; for (let i = 0; i <= 300; i++) { const tt = (i / 300) * 6; const x = Math.exp(-zeta * 2 * PI * tt) * Math.cos(2 * PI * tt * Math.sqrt(1 - zeta * zeta)); p += `${i ? 'L' : 'M'}${x0 + (i / 300) * W},${y0 - A * x} `; }
  let env = '', env2 = ''; for (let i = 0; i <= 60; i++) { const tt = (i / 60) * 6, e = Math.exp(-zeta * 2 * PI * tt); env += `${i ? 'L' : 'M'}${x0 + (i / 60) * W},${y0 - A * e} `; env2 += `${i ? 'L' : 'M'}${x0 + (i / 60) * W},${y0 + A * e} `; }
  let s = line(x0, y0, x0 + W, y0, 'd-muted') + `<path d="${env}" class="d-curve2" fill="none" stroke-dasharray="4 3"/><path d="${env2}" class="d-curve2" fill="none" stroke-dasharray="4 3"/>`;
  s += `<path d="${p}" class="d-curve" fill="none"/>`;
  s += t(x0 + W, 20, `ζ = ${zeta}: הדעיכה לפי e^(−ζωn t)`, 'd-text-accent', 'end');
  s += t(160, 170, 'δ = ln(x₁/x₂) ≈ 2πζ', 'd-text');
  return svg(320, 178, s, 'free damped response');
}

// magnification (or transmissibility) vs frequency ratio, several damping values, to scale
function frf(kind) {
  const x0 = 40, y0 = 150, W = 260, H = 125, rmax = 3, ymax = 10.5;
  const X = (r) => x0 + (r / rmax) * W, Y = (v) => y0 - (Math.min(v, ymax) / ymax) * H;
  let s = axes(x0, y0, W, H, 'r = ω/ωn', kind === 'T' ? 'T' : 'X/X_st');
  [[0.05, 'd-curve-hot'], [0.2, 'd-curve'], [0.5, 'd-curve2']].forEach(([z, cls]) => {
    let p = ''; for (let i = 0; i <= 150; i++) { const r = (i / 150) * rmax; const v = kind === 'T' ? transmissibility(r, z) : magnification(r, z); p += `${i ? 'L' : 'M'}${X(r)},${Y(v)} `; }
    s += `<path d="${p}" class="${cls}" fill="none"/>`;
  });
  s += line(X(1), y0, X(1), y0 - H, 'd-grid', 'stroke-dasharray="3 3"') + t(X(1), y0 + 14, '1');
  s += line(x0, Y(1), x0 + W, Y(1), 'd-grid', 'stroke-dasharray="3 3"') + t(x0 - 4, Y(1) + 4, '1', 'd-text', 'end');
  if (kind === 'T') { s += line(X(Math.SQRT2), y0, X(Math.SQRT2), y0 - H, 'd-accent', 'stroke-dasharray="5 3"') + t(X(Math.SQRT2) + 4, y0 - H + 10, '√2: מכאן מבודדים', 'd-text-accent', 'start'); }
  s += t(x0 + W, 26, 'ζ = 0.05', 'd-text-load', 'end') + t(x0 + W, 42, 'ζ = 0.2', 'd-text-accent', 'end') + t(x0 + W, 58, 'ζ = 0.5', 'd-text-curve2', 'end');
  return s;
}
export function resonanceCurve() { return svg(320, 196, frf('M') + t(160, 190, 'בתהודה (r ≈ 1) רק הריסון מגביל את ההגברה', 'd-text'), 'resonance curve'); }
export function transmissibilityCurve() { return svg(320, 196, frf('T') + t(160, 190, 'מעל √2 ריסון קטן דווקא מבודד טוב יותר', 'd-text'), 'transmissibility'); }

export function unbalanceRotor() {
  let s = `<circle cx="120" cy="90" r="56" class="d-section"/><circle cx="120" cy="90" r="5" class="d-line"/>`;
  s += `<circle cx="150" cy="56" r="8" class="d-load-fill"/>` + line(120, 90, 150, 56, 'd-muted', 'stroke-dasharray="3 3"') + t(140, 80, 'e', 'd-text', 'start');
  s += arrow(156, 50, 196, 10) + t(200, 16, 'F = m·e·ω²', 'd-text-load', 'start');
  s += `<path d="M60,90 A60,60 0 0,1 90,38" class="d-accent" fill="none" marker-end="url(#arra)"/>` + t(56, 60, 'ω', 'd-text-accent', 'end');
  s += t(200, 100, 'הכוח מסתובב עם הרוטור', 'd-text', 'start') + t(200, 118, 'ועולה עם ω²', 'd-text', 'start');
  s += t(160, 170, 'איזון: מוסיפים או מורידים מסה כדי לבטל את m·e', 'd-text-accent');
  return svg(320, 178, s, 'rotating unbalance');
}

export function inertiaShapes() {
  let s = `<circle cx="80" cy="70" r="44" class="d-section"/><circle cx="80" cy="70" r="4" class="d-line"/>` + t(80, 134, 'דיסקה: I = ½mr²');
  s += `<circle cx="230" cy="70" r="40" class="d-ring"/><circle cx="230" cy="70" r="4" class="d-line"/>` + t(230, 134, 'טבעת: I = mr²');
  s += t(160, 160, 'אותה מסה ברדיוס החיצוני = פי 2 אינרציה', 'd-text-accent');
  return svg(320, 168, s, 'moment of inertia shapes');
}

export function brakingGraph(opts = {}) {
  const v0 = opts.v0 ?? 27.8, a = opts.a ?? 7, T = v0 / a;
  const x0 = 40, y0 = 140, W = 240, H = 110;
  let s = axes(x0, y0, W, H, 't', 'v');
  s += `<path d="M${x0},${y0 - H} L${x0 + W},${y0} L${x0},${y0} Z" class="d-area-v"/>` + line(x0, y0 - H, x0 + W, y0, 'd-curve');
  s += t(x0 + W * 0.35, y0 - H * 0.25, 'השטח = מרחק הבלימה', 'd-text-accent');
  s += t(x0 + 6, y0 - H - 6, `v₀ = ${v0} m/s`, 'd-text', 'start') + t(x0 + W - 18, y0 - 8, `t = ${T.toFixed(1)} s`, 'd-text', 'end');
  s += t(160, 172, 'מהירות כפולה = מרחק בלימה פי 4', 'd-text-load');
  return svg(320, 180, s, 'braking v-t graph');
}

export function psdPlot(opts = {}) {
  const f1 = opts.f1 ?? 20, f2 = opts.f2 ?? 2000, psd = opts.psd ?? 0.04;
  const x0 = 46, y0 = 140, W = 250, H = 100;
  const X = (fq) => x0 + (Math.log10(fq / 10) / Math.log10(300)) * W;
  let s = axes(x0, y0, W, H, 'Hz', 'g²/Hz');
  s += `<rect x="${X(f1)}" y="${y0 - H * 0.6}" width="${X(f2) - X(f1)}" height="${H * 0.6}" class="d-area-v"/>` + line(X(f1), y0 - H * 0.6, X(f2), y0 - H * 0.6, 'd-curve');
  s += t(X(f1), y0 + 14, String(f1)) + t(X(f2), y0 + 14, String(f2)) + t((X(f1) + X(f2)) / 2, y0 - H * 0.6 - 8, `${psd} g²/Hz`, 'd-text-accent');
  s += t(160, 172, 'Grms = √(השטח מתחת לגרף)', 'd-text-load');
  return svg(320, 180, s, 'random vibration PSD');
}

// =====================================================================
// FEA & CAD
// =====================================================================
export function barElements(opts = {}) {
  const n = opts.n ?? 2;
  let s = wall(40, 40, 100);
  const w = 220 / n;
  for (let e = 0; e < n; e++) {
    const x = 40 + e * w, h = e % 2 ? 16 : 24;
    s += `<rect x="${x}" y="${70 - h / 2}" width="${w}" height="${h}" class="${e % 2 ? 'd-coat' : 'd-section'}"/>` + t(x + w / 2, 70 - h / 2 - 8, `k${e + 1} = EA/L`, 'd-text-accent');
  }
  for (let i = 0; i <= n; i++) s += `<circle cx="${40 + i * w}" cy="70" r="5" class="d-load-fill"/>` + t(40 + i * w, 100, `u${i}`, 'd-text');
  s += arrow(260, 70, 296, 70) + t(296, 60, 'P', 'd-text-load', 'end');
  s += t(160, 128, '[K]{u} = {F}', 'd-text-accent') + t(160, 146, 'כל אלמנט הוא קפיץ, והצמתים מחברים ביניהם', 'd-text');
  return svg(320, 154, s, 'bar elements');
}

export function meshRefine() {
  const grid = (x0, n, hole) => {
    let s = `<rect x="${x0}" y="30" width="120" height="100" class="d-section"/>`;
    for (let i = 1; i < n; i++) s += line(x0 + (120 * i) / n, 30, x0 + (120 * i) / n, 130, 'd-muted') + line(x0, 30 + (100 * i) / n, x0 + 120, 30 + (100 * i) / n, 'd-muted');
    return s + `<circle cx="${x0 + 60}" cy="80" r="${hole}" class="d-bg-stroke"/>`;
  };
  let s = grid(20, 4, 18) + grid(180, 12, 18);
  s += t(80, 150, 'רשת גסה', 'd-text') + t(240, 150, 'רשת עדינה ליד הריכוז', 'd-text-accent');
  s += t(160, 18, 'מעדנים רשת איפה שהמאמץ משתנה מהר', 'd-text');
  return svg(320, 160, s, 'mesh refinement');
}

// convergence: a converging result vs a singular one, to scale
export function convergencePlot() {
  const x0 = 46, y0 = 150, W = 250, H = 120;
  const X = (i) => x0 + (i / 6) * W, Y = (v) => y0 - (v / 220) * H;
  let s = axes(x0, y0, W, H, 'מספר אלמנטים', 'σ max');
  let p = '', q = '';
  for (let i = 0; i <= 6; i++) { const conv = 150 - 60 * Math.exp(-0.9 * i), sing = 90 + 22 * i; p += `${i ? 'L' : 'M'}${X(i)},${Y(conv)} `; q += `${i ? 'L' : 'M'}${X(i)},${Y(sing)} `; s += `<circle cx="${X(i)}" cy="${Y(conv)}" r="3" class="d-accent-fill"/><circle cx="${X(i)}" cy="${Y(sing)}" r="3" class="d-load-fill"/>`; }
  s += `<path d="${p}" class="d-curve" fill="none"/><path d="${q}" class="d-curve-hot" fill="none"/>`;
  s += t(X(6), Y(150) + 16, 'מתכנס: התוצאה אמינה', 'd-text-accent', 'end') + t(X(5.6), Y(213) - 4, 'סינגולריות: לא מתכנס', 'd-text-load', 'end');
  return svg(320, 176, s, 'mesh convergence');
}

export function singularity() {
  let s = `<path d="M40,30 L160,30 L160,90 L280,90 L280,150 L40,150 Z" class="d-section"/>`;
  s += `<circle cx="160" cy="90" r="22" class="d-area-m"/><circle cx="160" cy="90" r="10" class="d-hot"/>`;
  s += t(176, 70, 'פינה חדה: σ → ∞', 'd-text-load', 'start') + t(176, 84, 'ככל שמעדנים', 'd-text-load', 'start');
  s += `<path d="M228,30 L252,30 A24,24 0 0,1 276,54" class="d-curve" fill="none" stroke-dasharray="4 3"/>`;
  s += t(248, 22, 'עם רדיוס: מתכנס', 'd-text-accent');
  s += t(160, 168, 'גם כוח בנקודה או תמיכה בנקודה יוצרים סינגולריות', 'd-text');
  return svg(320, 176, s, 'stress singularity');
}

export function symmetryModel() {
  let s = `<rect x="40" y="40" width="240" height="80" class="d-ghost"/><rect x="160" y="40" width="120" height="80" class="d-section"/>`;
  s += `<circle cx="160" cy="80" r="20" class="d-bg-stroke"/>` + line(160, 24, 160, 136, 'd-accent', 'stroke-dasharray="6 4"');
  for (let y = 50; y <= 110; y += 20) s += `<path d="M160,${y} l-8,6 l0,-12 z" class="d-accent-fill"/>`;
  s += t(160, 18, 'מישור סימטריה', 'd-text-accent') + t(100, 84, 'לא ממודל', 'd-text') + t(230, 84, 'חצי מודל');
  s += t(160, 156, 'בתנאי סימטריה: אין תזוזה בניצב למישור', 'd-text');
  return svg(320, 164, s, 'symmetry model');
}

export function modeShapes() {
  let s = '';
  [[1, 'מוד 1', 46], [2, 'מוד 2', 110]].forEach(([n, name, y]) => {
    s += line(30, y, 290, y, 'd-muted', 'stroke-dasharray="3 3"') + `<path d="M30,${y - 8} v16 M290,${y - 8} v16" class="d-line"/>`;
    let p = ''; for (let i = 0; i <= 60; i++) { const u = i / 60; p += `${i ? 'L' : 'M'}${30 + u * 260},${y - 22 * Math.sin(n * Math.PI * u)} `; }
    s += `<path d="${p}" class="d-curve" fill="none"/>` + t(30, y - 28, name, 'd-text-accent', 'start');
  });
  s += t(160, 146, 'ניתוח מודלי: תדרים טבעיים וצורות התנודה', 'd-text');
  return svg(320, 156, s, 'mode shapes');
}

export function dofCube() {
  let s = `<path d="M110,60 L190,60 L190,130 L110,130 Z" class="d-section"/><path d="M110,60 L140,36 L220,36 L190,60 M190,130 L220,106 L220,36" class="d-section"/>`;
  s += arrow(160, 96, 270, 96, 'd-load') + arrow(160, 96, 160, 8, 'd-load') + arrow(160, 96, 108, 140, 'd-load');
  s += t(274, 100, 'X', 'd-text-load', 'start') + t(166, 14, 'Y', 'd-text-load', 'start') + t(100, 148, 'Z', 'd-text-load', 'end');
  s += `<path d="M240,86 a10,14 0 1,1 0,20" class="d-accent" fill="none" marker-end="url(#arra)"/>`;
  s += t(160, 170, '6 דרגות חופש: 3 תזוזות + 3 סיבובים', 'd-text-accent');
  return svg(320, 178, s, '6 degrees of freedom');
}

// first- vs third-angle projection symbols (ISO 5456-2). The truncated cone's large end is
// always on the left. First angle: cone, then circles to its right. Third angle: circles, then cone.
export function projectionSymbols() {
  const cone = (cx) => `<path d="M${cx - 18},38 L${cx + 18},48 L${cx + 18},62 L${cx - 18},72 Z" class="d-section"/>`;
  const circles = (cx) => `<circle cx="${cx}" cy="55" r="17" class="d-bg-stroke"/><circle cx="${cx}" cy="55" r="7" class="d-bg-stroke"/>`;
  let s = cone(196) + circles(244) + t(220, 100, 'זווית ראשונה (ISO E)', 'd-text-accent') + t(220, 116, 'נפוץ באירופה', 'd-text');
  s += circles(56) + cone(104) + t(80, 100, 'זווית שלישית (ASME)', 'd-text-load') + t(80, 116, 'נפוץ בארה"ב', 'd-text');
  s += t(160, 144, 'תמיד בודקים את הסמל בכותרת השרטוט', 'd-text-accent');
  return svg(320, 152, s, 'projection method symbols');
}

export function featureTree() {
  const items = [['Sketch1', 'סקיצה מוגדרת לגמרי'], ['Extrude1', 'גוף בסיס'], ['Cut-Extrude1', 'כיס'], ['Hole Wizard', 'קדחים סטנדרטיים'], ['Fillet1', 'רדיוסים בסוף']];
  let s = '';
  items.forEach(([n, d], i) => {
    const y = 20 + i * 28;
    s += `<rect x="190" y="${y}" width="110" height="22" rx="4" class="d-support"/>` + t(245, y + 15, n, 'd-text');
    s += t(180, y + 15, d, 'd-text-accent', 'end');
    if (i) s += line(200, y - 6, 200, y, 'd-muted');
  });
  s += t(160, 168, 'הורה ← ילד: שינוי למעלה זורם למטה', 'd-text-load');
  return svg(320, 176, s, 'feature tree');
}

export const registry = {
  beam, axialBar, shaft, section, stressStrain, stressElement, mohrCircle, columns, plateHole, snCurve, goodman, constrainedBar,
  tank, hydraulicPress, floating, pipeContraction, torricelliTank, pitot, velocityProfiles, moody, pumpCurve, dragCar, jetPlate,
  ironCarbon, hardness, galvanicSeries, heatTreat, bars,
  tackle, atwood, twoCables, capstanDrum,
  poissonBar, torsionDistribution, bendingFibers, safetyDistributions, fractureSurface, streamlinesHole,
  couette, energyBars, jominy, caseProfile, anodizeGrowth, passiveLayer, hazProfile, galvanicCell,
  pvCycle, tsCarnot, heatEngine, fridgeLoop, rankineLoop, wallProfile, resistanceChain, hxProfiles, coolingCurve, heatModes, psychro,
  waterAnalogy, circuits, sineWave, threePhase, transformer, dcMotorCurve, inductionCurve, leadScrew, gears, homePanel, gridChain, cableSagSketch,
  shaftLayout, bearingLife, boltJoint, jointDiagram, helicalSpring, stribeck, keySection, filletWeld, beltDrive, pressFit,
  fitDiagram, stackChain, fcf, datums321, gdtSymbols, positionZone, mmcBonus, roughness, gdtSym,
  turning, milling, sheetBend, moldPart, amLayers, costCurves, cpkCurve, npiFlow, fishbone,
  massSpringDamper, freeResponse, resonanceCurve, transmissibilityCurve, unbalanceRotor, inertiaShapes, brakingGraph, psdPlot,
  barElements, meshRefine, convergencePlot, singularity, symmetryModel, modeShapes, dofCube, projectionSymbols, featureTree,
};

// content uses {fn:'beam', args:['ss-udl',{diagrams:true}]}
export function draw(spec) {
  if (!spec) return '';
  if (typeof spec === 'string') return spec;
  const fn = registry[spec.fn];
  return fn ? fn(...(spec.args || [])) : '';
}
