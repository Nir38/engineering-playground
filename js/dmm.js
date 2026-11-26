// dmm.js: a realistic drawing of a generic hand-held digital multimeter (no maker's name, logo or design),
// for the circuits mode: seven-segment display with ghost segments, a bar graph and annunciators, six
// buttons (HOLD, RANGE, REL, MIN/MAX, SELECT, light), a rotary knob and four jacks.
// Also the manual RANGE and REL logic, which work on the reading the engine gives (circuit.js meterReading).
import { DIAL } from './circuit.js';

// ---------- seven segments ----------
const SEGS = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcfgd', '-': 'g', O: 'abcdef', L: 'def', E: 'adefg', ' ': '' };
function digit(x, y, w, h, ch, on, off) {
  const t = w * 0.2, g = 1.2, hh = h / 2, lit = SEGS[ch] ?? '';
  const P = {
    a: [[x + g + t / 2, y], [x + w - g - t / 2, y], [x + w - g - t, y + t], [x + g + t, y + t]],
    g: [[x + g + t / 2, y + hh], [x + g + t, y + hh - t / 2], [x + w - g - t, y + hh - t / 2], [x + w - g - t / 2, y + hh], [x + w - g - t, y + hh + t / 2], [x + g + t, y + hh + t / 2]],
    d: [[x + g + t, y + h - t], [x + w - g - t, y + h - t], [x + w - g - t / 2, y + h], [x + g + t / 2, y + h]],
    f: [[x, y + g + t / 2], [x + t, y + g + t], [x + t, y + hh - g - t / 2], [x, y + hh - g]],
    b: [[x + w, y + g + t / 2], [x + w, y + hh - g], [x + w - t, y + hh - g - t / 2], [x + w - t, y + g + t]],
    e: [[x, y + hh + g], [x + t, y + hh + g + t / 2], [x + t, y + h - g - t], [x, y + h - g - t / 2]],
    c: [[x + w, y + hh + g], [x + w, y + h - g - t / 2], [x + w - t, y + h - g - t], [x + w - t, y + hh + g + t / 2]],
  };
  return Object.entries(P).map(([k, pts]) => `<polygon points="${pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="${lit.includes(k) ? on : off}"/>`).join('');
}
// the display text ('-7.499', 'OL', '----', '') on 4 digits with a sign and decimal points
function sevenSeg(text, x0, y, w, h, gap, on, off) {
  let s = '', neg = false, str = text || '';
  if (str.startsWith('-')) { neg = true; str = str.slice(1); }
  const cells = []; // [char, dot after]
  if (str === 'OL') cells.push([' ', false], ['O', true], ['L', false], [' ', false]); // shown as " 0.L " like many meters
  else for (const ch of str) { if (ch === '.' && cells.length) cells[cells.length - 1][1] = true; else cells.push([ch, false]); }
  while (cells.length < 4) cells.unshift([' ', false]);
  const use = cells.slice(-4);
  s += `<rect x="${x0 - 22}" y="${y + h / 2 - 2.5}" width="14" height="5" rx="1" fill="${neg ? on : off}"/>`;
  use.forEach(([ch, dot], i) => {
    const x = x0 + i * (w + gap);
    s += digit(x + 3, y, w, h, ch, on, off);
    if (i < 3) s += `<rect x="${x + w + gap / 2 - 1}" y="${y + h - 5}" width="5" height="5" rx="1" fill="${dot ? on : off}"/>`;
  });
  return s;
}

// ---------- readings in base units, manual ranges ----------
export const UNIT = { V: 1, mV: 1e-3, 'Ω': 1, 'kΩ': 1e3, 'MΩ': 1e6, A: 1, mA: 1e-3, 'µA': 1e-6, nF: 1e-9, 'µF': 1e-6, Hz: 1, '%': 1 };
export const toBase = (rd) => { const v = parseFloat(rd.text); return Number.isFinite(v) && rd.unit in UNIT ? v * UNIT[rd.unit] : null; };
// ranges: [max in base units, unit shown, decimals] (6000 counts; 10 A and 1000 V tops)
export const RANGES = {
  vdc: [[6, 'V', 3], [60, 'V', 2], [600, 'V', 1], [1000, 'V', 0]], vac: [[6, 'V', 3], [60, 'V', 2], [600, 'V', 1], [1000, 'V', 0]],
  mv: [[0.6, 'mV', 1]], ohm: [[600, 'Ω', 1], [6e3, 'kΩ', 3], [6e4, 'kΩ', 2], [6e5, 'kΩ', 1], [6e6, 'MΩ', 3], [6e7, 'MΩ', 2]],
  ua: [[6e-4, 'µA', 1], [6e-3, 'µA', 0]], ma: [[0.06, 'mA', 2], [0.4, 'mA', 1]], a: [[6, 'A', 3], [10, 'A', 2]],
};
// the range auto-ranging picks: the smallest that holds the value
export const autoRange = (dial, v) => { const R = RANGES[dial]; if (!R || v === null) return null; const i = R.findIndex(([mx]) => Math.abs(v) <= mx); return i < 0 ? R.length - 1 : i; };
// what the display shows with RANGE (manual index or null = auto) and REL (offset in base units or null)
export function display(dial, rd, range, rel) {
  let v = toBase(rd);
  if (v === null) return { ...rd, rangeIdx: null, frac: 0 };
  if (rel !== null && rel !== undefined) v -= rel;
  const R = RANGES[dial];
  if (!R) { const u = rd.unit, x = v / UNIT[u]; return { ...rd, text: fixed(x, decs(x)), unit: u, rangeIdx: null, frac: 0 }; }
  const i = range ?? autoRange(dial, v), [mx, u, d] = R[i];
  if (Math.abs(v) > mx * 1.0001) return { ...rd, text: 'OL', unit: u, rangeIdx: i, frac: 1 };
  return { ...rd, text: fixed(v / UNIT[u], d), unit: u, rangeIdx: i, frac: Math.min(1, Math.abs(v) / mx) };
}
const decs = (x) => { const a = Math.abs(x); return a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 2 : 3; };
const fixed = (x, d) => { const s = x.toFixed(d); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; };

// ---------- the drawing ----------
// m: the meter state (dial, jack, red, black, fuseOK, hold, mm, ac, duty, range, rel, light); d: what display() returned
export function dmmSvg(m, d) {
  const W = 260, H = 470, on = '#111', off = 'rgba(0,0,0,.07)', lcd = m.light ? '#9be7c4' : '#b9c6a6';
  const isOff = m.dial === 'off';
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-dmm" role="img" aria-label="מולטימטר דיגיטלי">`;
  s += `<defs><linearGradient id="dmmH" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f97316"/><stop offset="1" stop-color="#c2410c"/></linearGradient><radialGradient id="dmmK" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#4b5563"/><stop offset="1" stop-color="#111827"/></radialGradient></defs>`;
  // holster and body
  s += `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="34" fill="url(#dmmH)"/><rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="22" fill="#2a2f37"/>`;
  for (const [x, y] of [[8, 60], [W - 14, 60], [8, H - 110], [W - 14, H - 110]]) s += `<rect x="${x}" y="${y}" width="6" height="50" rx="3" fill="#9a3412" opacity=".6"/>`;
  // display
  s += `<rect x="24" y="24" width="212" height="118" rx="12" fill="#0b0d10"/><rect x="31" y="31" width="198" height="104" rx="7" fill="${isOff ? '#5f6656' : lcd}"/>`;
  if (!isOff) {
    const ann = (x, txt, lit) => `<text x="${x}" y="45" class="pg-dmmann" fill="${lit ? on : off}">${txt}</text>`;
    const cur = ['ua', 'ma', 'a'].includes(m.dial), acOn = m.dial === 'vac' || ((m.dial === 'mv' || cur) && m.ac), dcOn = m.dial === 'vdc' || ((m.dial === 'mv' || cur) && !m.ac);
    s += ann(38, m.range === null || m.range === undefined ? 'AUTO' : 'MANU', true) + ann(76, 'HOLD', m.hold) + ann(108, m.mm === 'min' ? 'MIN' : 'MAX', !!m.mm) + ann(134, 'Δ', m.rel !== null && m.rel !== undefined) + ann(150, 'AC', acOn) + ann(170, 'DC', dcOn) + ann(190, '•))', m.dial === 'ohm') + ann(210, '▶|', m.dial === 'diode');
    s += `<rect x="212" y="37" width="12" height="7" rx="1" fill="none" stroke="${on}" stroke-width="1"/><rect x="224" y="39" width="2" height="3" fill="${on}"/><rect x="214" y="39" width="8" height="3" fill="${on}"/>`;
    s += sevenSeg(d.text, 62, 54, 28, 48, 8, on, off);
    s += `<text x="224" y="101" text-anchor="end" class="pg-dmmunit" fill="${on}">${d.unit || ''}</text>`;
    // bar graph
    const n = 40, lit = Math.round(n * (d.frac || 0));
    for (let k = 0; k < n; k++) s += `<rect x="${38 + k * 4.6}" y="${k % 5 === 0 ? 112 : 114}" width="3" height="${k % 5 === 0 ? 10 : 8}" fill="${k < lit ? on : off}"/>`;
    s += `<text x="38" y="131" class="pg-dmmann" fill="${on}">0</text><text x="222" y="131" text-anchor="end" class="pg-dmmann" fill="${on}">${d.rangeIdx !== null && d.rangeIdx !== undefined && RANGES[m.dial] ? RANGES[m.dial][d.rangeIdx][0] / UNIT[RANGES[m.dial][d.rangeIdx][1]] : ''}</text>`;
  }
  // buttons
  const B = [['hold', 'HOLD', 30, 152], ['range', 'RANGE', 98, 152], ['rel', 'REL Δ', 166, 152], ['minmax', 'MIN MAX', 30, 180], ['select', 'SELECT', 98, 180], ['light', '☀', 166, 180]];
  for (const [id, lab, x, y] of B) s += `<g data-btn="${id}" class="pg-dmmbtn"><rect x="${x}" y="${y}" width="64" height="22" rx="7" fill="#424955" stroke="#1f2329"/><text x="${x + 32}" y="${y + 15}" text-anchor="middle" class="pg-dmmbt" fill="${id === 'select' ? '#60a5fa' : '#f3f4f6'}">${lab}</text></g>`;
  // rotary dial
  const cx = 130, cy = 300, Rk = 50, Rl = 92, n = DIAL.length, ang = (i) => ((-215 + (i * 250) / (n - 1)) * Math.PI) / 180;
  s += `<circle cx="${cx}" cy="${cy}" r="72" fill="#1c2026" stroke="#3b414b" stroke-width="2"/>`;
  DIAL.forEach((dd, i) => {
    const a = ang(i), x = cx + Rl * Math.cos(a), y = cy + Rl * Math.sin(a), sel = dd.id === m.dial;
    const col = ['ua', 'ma', 'a'].includes(dd.id) ? '#fbbf24' : dd.id === 'off' ? '#9ca3af' : '#f9fafb';
    s += `<line x1="${(cx + 66 * Math.cos(a)).toFixed(1)}" y1="${(cy + 66 * Math.sin(a)).toFixed(1)}" x2="${(cx + 74 * Math.cos(a)).toFixed(1)}" y2="${(cy + 74 * Math.sin(a)).toFixed(1)}" stroke="${sel ? '#f97316' : '#6b7280'}" stroke-width="${sel ? 3 : 1.5}"/>`;
    s += `<g data-dial="${dd.id}" class="pg-dpos"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="17" fill="${sel ? 'rgba(249,115,22,.25)' : 'transparent'}"/><text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" class="pg-dmmdial" fill="${sel ? '#fdba74' : col}">${dd.label.replace(' 🔊', '').replace('Ω', 'Ω•))')}</text></g>`;
  });
  const a = ang(DIAL.findIndex((q) => q.id === m.dial)), deg = (a * 180) / Math.PI;
  s += `<g transform="rotate(${deg.toFixed(1)} ${cx} ${cy})"><circle cx="${cx}" cy="${cy}" r="${Rk}" fill="url(#dmmK)" stroke="#0b0d10" stroke-width="2"/><rect x="${cx - Rk + 6}" y="${cy - 9}" width="${2 * Rk - 12}" height="18" rx="9" fill="#2d333c" stroke="#0b0d10"/><polygon points="${cx + Rk - 4},${cy} ${cx + Rk - 18},${cy - 7} ${cx + Rk - 18},${cy + 7}" fill="#f97316"/></g>`;
  s += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" class="pg-dmmbt" fill="#9ca3af" opacity=".7">${m.fuseOK === false ? '⚠ FUSE' : ''}</text>`;
  // jacks
  const J = [['a', '10A', 46], ['ma', 'µA mA', 102], ['com', 'COM', 158], ['v', 'VΩHz', 214]];
  for (const [id, lab, x] of J) {
    const red = m.jack === id, blk = id === 'com', ring = id === 'com' ? '#111' : '#dc2626';
    s += `<g data-jack="${id}" class="pg-jack"><circle cx="${x}" cy="430" r="19" fill="transparent"/><text x="${x}" y="406" text-anchor="middle" class="pg-dmmbt" fill="#f3f4f6">${lab}</text><circle cx="${x}" cy="430" r="13" fill="#0b0d10" stroke="${ring}" stroke-width="3"/><circle cx="${x}" cy="430" r="5" fill="#374151"/>`;
    if (red || blk) s += `<circle cx="${x}" cy="430" r="10" fill="${red ? '#dc2626' : '#1f2937'}" stroke="${red ? '#fca5a5' : '#9ca3af'}" stroke-width="1.5"/><rect x="${x - 4}" y="438" width="8" height="24" rx="3" fill="${red ? '#dc2626' : '#1f2937'}"/>`;
    s += '</g>';
  }
  s += `<text x="74" y="456" text-anchor="middle" class="pg-dmmann" fill="#fbbf24">FUSED</text>`;
  return s + '</svg>';
}
