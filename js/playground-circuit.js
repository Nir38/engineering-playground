// playground-circuit.js: the playground's circuits mode (electricity). Build a circuit on a grid,
// watch the current flow, and measure it with a digital multimeter: rotary dial, jacks and two probes.
// With an AC source the other instruments matter too: clamp meter, voltage tester and a simple oscilloscope.
// Simulator and instruments: js/circuit.js (checked in tests/circuit-cases.mjs and tests/ac-cases.mjs).
import { step, emptyState, meterElement, meterReading, METER, DIAL, cableR, lampR, MAT_NAME, GRID, acFreqs, acMeasureAll, clampReading, testerReading, TESTER, phaseShift } from './circuit.js';
import { esc } from './text.js';
import { plot, COL } from './elec-ui.js';

const KEY = 'mh-pg-circ-v1';
const W = 360, H = 286, X0 = 20, Y0 = 18, SP = 40, GX = 9, GY = 6; // grid 9 × 6 points
const PARK = { red: [318, 268], black: [262, 268] };
const px = (k) => { const [x, y] = k.split(',').map(Number); return [X0 + x * SP, Y0 + y * SP]; };
const TOOLS = [['select', '✋', 'בחירה'], ['wire', '─', 'חוט'], ['res', '▭', 'נגד'], ['lamp', '💡', 'נורה'], ['bat', '🔋', 'סוללה'], ['vac', '〜', 'מקור AC'], ['sw', '⏻', 'מתג'], ['fuse', '⊟', 'נתיך'], ['cap', '⊣⊢', 'קבל'], ['ind', '➰', 'סליל'], ['diode', '▶|', 'דיודה'], ['cable', '〰', 'כבל'], ['del', '🗑', 'מחיקה']];
const NAME = { wire: 'חוט', res: 'נגד', lamp: 'נורה', bat: 'סוללה', vac: 'מקור AC', sw: 'מתג', fuse: 'נתיך', cap: 'קבל', ind: 'סליל', diode: 'דיודה', cable: 'כבל' };
const DEF = { res: { R: 100 }, lamp: { V: 12, P: 6 }, bat: { V: 12, r: 0.05 }, vac: { Vrms: 12, f: 50, r: 0.05 }, sw: { on: true }, fuse: { I: 2, blown: false }, cap: { C: 1000e-6 }, ind: { L: 1 }, cable: { len: 20, area: 1.5, mat: 'cu' } };
const HINT = {
  select: 'לחץ על רכיב כדי לערוך אותו. לחיצה על מתג פותחת וסוגרת אותו. גרור את הפרובים (אדום ושחור) לנקודות במעגל.',
  wire: 'לחץ נקודה ואז נקודה נוספת כדי למתוח חוט. אפשר להמשיך ברצף. לחיצה שוב על אותה נקודה מסיימת.',
  del: 'לחץ על רכיב כדי למחוק אותו.',
};
const hintFor = (t) => HINT[t] || `לחץ נקודה ואז נקודה נוספת כדי להוסיף ${NAME[t]}.${t === 'bat' ? ' הנקודה הראשונה היא הקוטב החיובי (+).' : t === 'vac' ? ' הנקודה הראשונה היא הצד החם (פאזה), השנייה האפס.' : t === 'diode' ? ' הזרם עובר מהנקודה הראשונה (אנודה) לשנייה.' : ''}`;

let uid = 1;
const E = (type, a, b, p = {}) => ({ id: uid++, type, a, b, ...structuredClone(DEF[type] || {}), ...p });
const L = (spec) => spec.map(([t, a, b, p]) => E(t, a, b, p));
const loop = (mid) => [['bat', '1,1', '1,4', { V: 12 }], ...mid, ['wire', '7,1', '7,4'], ['wire', '7,4', '1,4']];
const TEMPLATES = [
  { id: 'basic', name: 'נורה, סוללה ומתג', els: () => L(loop([['sw', '1,1', '4,1'], ['lamp', '4,1', '7,1']])) },
  { id: 'series', name: 'נגדים בטור', els: () => L(loop([['res', '1,1', '4,1', { R: 100 }], ['res', '4,1', '7,1', { R: 200 }]])) },
  { id: 'par', name: 'נגדים במקביל', els: () => L([['bat', '1,1', '1,4', { V: 12 }], ['wire', '1,1', '4,1'], ['wire', '4,1', '7,1'], ['res', '4,1', '4,4', { R: 100 }], ['res', '7,1', '7,4', { R: 300 }], ['wire', '7,4', '4,4'], ['wire', '4,4', '1,4']]) },
  { id: 'div', name: 'מחלק מתח', els: () => L([['bat', '1,1', '1,5', { V: 10 }], ['wire', '1,1', '6,1'], ['res', '6,1', '6,3', { R: 1000 }], ['res', '6,3', '6,5', { R: 3000 }], ['wire', '6,5', '1,5']]) },
  { id: 'lser', name: 'נורות בטור', els: () => L(loop([['lamp', '1,1', '4,1'], ['lamp', '4,1', '7,1']])) },
  { id: 'lpar', name: 'נורות במקביל', els: () => L([['bat', '1,1', '1,4', { V: 12 }], ['wire', '1,1', '4,1'], ['wire', '4,1', '7,1'], ['lamp', '4,1', '4,4'], ['lamp', '7,1', '7,4'], ['wire', '7,4', '4,4'], ['wire', '4,4', '1,4']]) },
  { id: 'wheat', name: 'גשר Wheatstone', els: () => L([['bat', '0,1', '0,5', { V: 10 }], ['wire', '0,1', '4,1'], ['wire', '0,5', '4,5'], ['res', '4,1', '2,3', { R: 100 }], ['res', '2,3', '4,5', { R: 200 }], ['res', '4,1', '6,3', { R: 50 }], ['res', '6,3', '4,5', { R: 120 }], ['res', '2,3', '6,3', { R: 500 }]]) },
  { id: 'fuse', name: 'נתיך וקצר', els: () => L([['bat', '1,1', '1,4', { V: 12 }], ['fuse', '1,1', '4,1', { I: 2 }], ['lamp', '4,1', '7,1'], ['wire', '7,1', '7,4'], ['wire', '7,4', '4,4'], ['wire', '4,4', '1,4'], ['sw', '4,1', '4,4', { on: false }]]) },
  { id: 'rc', name: 'טעינת קבל RC', els: () => L([['bat', '1,1', '1,4', { V: 12 }], ['sw', '1,1', '3,1', { on: false }], ['res', '3,1', '7,1', { R: 1000 }], ['cap', '7,1', '7,4', { C: 1000e-6 }], ['wire', '7,4', '1,4']]) },
  { id: 'cable', name: 'כבל ארוך ודק', els: () => L([['bat', '1,1', '1,4', { V: 12 }], ['cable', '1,1', '7,1', { len: 20, area: 0.75 }], ['lamp', '7,1', '7,4', { P: 55 }], ['cable', '7,4', '1,4', { len: 20, area: 0.75 }]]) },
  { id: 'diode', name: 'דיודה', els: () => L(loop([['diode', '1,1', '4,1'], ['lamp', '4,1', '7,1']])) },
  { id: 'acrc', name: 'AC: נגד וקבל', els: () => L([['vac', '1,1', '1,4', { Vrms: 12 }], ['res', '1,1', '7,1', { R: 100 }], ['cap', '7,1', '7,4', { C: 22e-6 }], ['wire', '7,4', '1,4']]) },
  { id: 'ac230', name: 'נורה על 230 V', els: () => L([['vac', '1,1', '1,4', { Vrms: GRID.V, f: GRID.f }], ['sw', '1,1', '4,1'], ['lamp', '4,1', '7,1', { V: 230, P: 60 }], ['wire', '7,1', '7,4'], ['wire', '7,4', '1,4']]) },
  { id: 'bridge', name: 'גשר דיודות', els: () => L([['vac', '3,1', '3,3', { Vrms: 12 }], ['diode', '3,1', '5,2'], ['diode', '3,3', '5,2'], ['diode', '1,2', '3,1'], ['diode', '1,2', '3,3'], ['wire', '5,2', '6,2'], ['cap', '6,2', '6,5', { C: 470e-6 }], ['wire', '6,2', '8,2'], ['res', '8,2', '8,5', { R: 100 }], ['wire', '1,2', '1,5'], ['wire', '1,5', '6,5'], ['wire', '6,5', '8,5']]) },
  { id: 'empty', name: 'ריק', els: () => [] },
];
const defMeter = () => ({ dial: 'vdc', jack: 'v', red: null, black: null, fuseOK: true });
const INST = [['dmm', '🔧 מולטימטר'], ['clamp', '🗜 צבת'], ['tester', '🔦 בודק מתח'], ['scope', '📈 סקופ']];
const SLOW = [[1, '×1'], [0.1, '×1/10'], [0.02, '×1/50']];
const defaults = () => ({ els: TEMPLATES[0].els(), tool: 'select', sel: null, pend: null, meter: defMeter(), inst: 'dmm', clampEl: null, whole: false, slow: 0.02 });
let st = null;
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && Array.isArray(s.els)) st = { ...defaults(), ...s, meter: { ...defMeter(), ...(s.meter || {}) }, pend: null }; } catch (e) { /* ignore */ }
  if (!st) st = defaults();
  if (!INST.some(([v]) => v === st.inst)) st.inst = 'dmm';
  if (!SLOW.some(([v]) => v === st.slow)) st.slow = 0.02;
  uid = 1 + Math.max(0, ...st.els.map((e) => e.id));
}
const save = () => { try { const { pend, ...rest } = st; localStorage.setItem(KEY, JSON.stringify(rest)); } catch (e) { /* ignore */ } };

const ltr = (s) => `<span class="ltr">${esc(s)}</span>`;
// engineering notation: 0.0025 A → 2.5 mA
function si(v, unit, d = 3) {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v); if (a < 1e-12) return `0 ${unit}`;
  const P = [[1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n']];
  const [f, p] = P.find(([q]) => a >= q * 0.9995) || P[P.length - 1];
  return `${Number((v / f).toPrecision(d))} ${p}${unit}`;
}
const text = (x, y, s, cls = '', anchor = 'middle') => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" class="pg-t ${cls}">${esc(s)}</text>`;
const label = (e) => ({
  res: si(e.R, 'Ω'), lamp: `${e.V}V ${e.P}W`, bat: `${e.V} V`, vac: `${e.Vrms}V~${e.f === 50 ? '' : ` ${e.f}Hz`}`, fuse: e.blown ? 'נשרף' : `${e.I} A`, cap: si(e.C, 'F'), ind: si(e.L, 'H'),
  cable: `${e.len}m ${e.area}mm²`, sw: e.on ? 'סגור' : 'פתוח',
}[e.type] || '');

// symbol of one element in its own frame: A at the left, B at the right, the symbol in the middle
function symbol(e, len, glow) {
  const h = Math.min(32, len - 10) / 2, lead = (x1, x2) => `<line x1="${x1}" y1="0" x2="${x2}" y2="0" class="pg-cw"/>`;
  const ends = lead(-len / 2, -h) + lead(h, len / 2);
  switch (e.type) {
    case 'wire': return `<line x1="${-len / 2}" y1="0" x2="${len / 2}" y2="0" class="pg-cw"/>`;
    case 'cable': return `<line x1="${-len / 2}" y1="0" x2="${len / 2}" y2="0" class="pg-cable"/>`;
    case 'res': return ends + `<rect x="${-h}" y="-6" width="${2 * h}" height="12" rx="2" class="pg-csym"/>`;
    case 'lamp': return ends + `<line x1="${-h}" y1="0" x2="-10" y2="0" class="pg-cw"/><line x1="10" y1="0" x2="${h}" y2="0" class="pg-cw"/><circle r="17" class="pg-glow" style="opacity:${glow.toFixed(2)}"/><circle r="10" class="pg-csym"/><path d="M-7,-7 L7,7 M-7,7 L7,-7" class="pg-cw"/>`;
    case 'bat': return lead(-len / 2, -3) + lead(4, len / 2) + `<line x1="-3" y1="-12" x2="-3" y2="12" class="pg-cw"/><line x1="4" y1="-6" x2="4" y2="6" class="pg-cw" style="stroke-width:4"/><text x="-10" y="-8" class="pg-t pg-plus" text-anchor="middle">+</text>`;
    case 'sw': return ends + `<circle cx="${-h}" r="2.6" class="pg-cdot"/><circle cx="${h}" r="2.6" class="pg-cdot"/>` + (e.on ? `<line x1="${-h}" y1="0" x2="${h}" y2="0" class="pg-cw"/>` : `<line x1="${-h}" y1="0" x2="${h * 0.8}" y2="${-h * 0.75}" class="pg-cw"/>`);
    case 'fuse': return ends + `<rect x="${-h}" y="-5" width="${2 * h}" height="10" rx="2" class="pg-csym ${e.blown ? 'pg-blown' : ''}"/>` + (e.blown ? `<path d="M${-h},0 L-3,0 L-1,-4 M3,4 L1,0 L${h},0" class="pg-cw pg-blown"/>` : `<line x1="${-h}" y1="0" x2="${h}" y2="0" class="pg-cw"/>`);
    case 'vac': return lead(-len / 2, -11) + lead(11, len / 2) + `<circle r="11" class="pg-csym"/><path d="M-7,0 q3.5,-8 7,0 q3.5,8 7,0" class="pg-cw" fill="none"/><text x="-16" y="-8" class="pg-t pg-plus" text-anchor="middle">~</text>`;
    case 'cap': return lead(-len / 2, -3) + lead(3, len / 2) + `<line x1="-3" y1="-11" x2="-3" y2="11" class="pg-cw"/><line x1="3" y1="-11" x2="3" y2="11" class="pg-cw"/>`;
    case 'ind': { let d = `M${-h},0`; const n = 4, w = (2 * h) / n; for (let i = 0; i < n; i++) d += ` a${w / 2},${w / 2} 0 0 1 ${w},0`; return ends + `<path d="${d}" class="pg-cw" fill="none"/>`; }
    case 'diode': return ends + `<line x1="${-h}" y1="0" x2="-6" y2="0" class="pg-cw"/><polygon points="-6,-8 -6,8 6,0" class="pg-csym"/><line x1="6" y1="-8" x2="6" y2="8" class="pg-cw"/><line x1="6" y1="0" x2="${h}" y2="0" class="pg-cw"/>`;
    default: return '';
  }
}

export function renderCircuit(root, { toast }) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>⚡ מעגלים</h2><p class="small muted">בונים מעגל על רשת, רואים את הזרם זורם, ומודדים עם מולטימטר בדיוק כמו בעבודה אמיתית.</p>
      <div class="pg-templates">${TEMPLATES.map((t) => `<button class="chip" data-tpl="${t.id}">${esc(t.name)}</button>`).join('')}</div></div>
    <div class="card pg-stage"><svg viewBox="0 0 ${W} ${H}" class="pg-svg pg-circ" id="pgCirc" role="img" aria-label="מעגל חשמלי עם מולטימטר"><g id="cGrid"></g><g id="cEls"></g><g id="cDots"></g><g id="cProbes"></g></svg>
      <div class="pg-tools pg-tools4">${TOOLS.map(([id, ic, name]) => `<button class="pg-tool" data-tool="${id}" aria-pressed="${st.tool === id}"><b>${ic}</b>${name}</button>`).join('')}</div>
      <p class="small muted pg-hint" id="cHint"></p></div>
    <div class="card" id="cMeter"></div>
    <div class="card" id="cEdit"></div>
    <div class="card" id="cRes"></div>`;
  const svg = root.querySelector('#pgCirc'), gGrid = svg.querySelector('#cGrid'), gEls = svg.querySelector('#cEls'), gDots = svg.querySelector('#cDots'), gPr = svg.querySelector('#cProbes');
  const meterBox = root.querySelector('#cMeter'), ed = root.querySelector('#cEdit'), out = root.querySelector('#cRes'), hint = root.querySelector('#cHint');
  let lastRes = '', sim = emptyState(), live = null, phase = new Map(), raf = 0, last = 0, lastPanel = 0, lastBeep = false, drag = null;
  const M = () => st.meter;
  const nodeSet = () => new Set(st.els.flatMap((e) => [e.a, e.b]));
  const simEls = () => { const me = st.inst === 'dmm' ? meterElement(M()) : null; return me ? [...st.els, me] : st.els; };
  const hasAC = () => acFreqs(st.els).length > 0;
  let buf = []; // oscilloscope: samples of the live simulation [t, v between the probes, i in the channel-2 element]

  // ---------- drawing ----------
  let gridHtml = '';
  for (let y = 0; y < GY; y++) for (let x = 0; x < GX; x++) gridHtml += `<circle cx="${X0 + x * SP}" cy="${Y0 + y * SP}" r="1.6" class="pg-dot"/>`;
  gGrid.innerHTML = gridHtml + `<line x1="6" y1="${Y0 + (GY - 1) * SP + 22}" x2="${W - 6}" y2="${Y0 + (GY - 1) * SP + 22}" class="pg-ruler" stroke-dasharray="2 4"/>`;
  function drawEls() {
    let s = '';
    for (const e of st.els) {
      const [ax, ay] = px(e.a), [bx, by] = px(e.b), len = Math.hypot(bx - ax, by - ay), ang = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
      const P = live && live.I.has(e.id) ? Math.abs(live.Vd.get(e.id) * live.I.get(e.id)) : 0;
      const glow = e.type === 'lamp' ? Math.min(1, P / e.P) : 0;
      s += `<g transform="translate(${((ax + bx) / 2).toFixed(1)} ${((ay + by) / 2).toFixed(1)}) rotate(${ang.toFixed(2)})" class="${st.sel === e.id ? 'pg-csel' : ''}">${symbol(e, len, glow)}</g>`;
      const lb = label(e);
      if (lb) { const nx = -(by - ay) / len, ny = (bx - ax) / len, sgn = ny > 0.1 || (Math.abs(ny) <= 0.1 && nx < 0) ? -1 : 1, off = e.type === 'lamp' ? 24 : e.type === 'vac' ? 27 : 17; s += text((ax + bx) / 2 + sgn * nx * off, (ay + by) / 2 + sgn * ny * off + 4, lb, `pg-clab ${e.type === 'fuse' && e.blown ? 'pg-blowntxt' : ''}`); }
    }
    for (const k of nodeSet()) { const [x, y] = px(k); s += `<circle cx="${x}" cy="${y}" r="3.4" class="pg-cnode"/>`; }
    if (st.pend) { const [x, y] = px(st.pend); s += `<circle cx="${x}" cy="${y}" r="7" class="pg-jpend" fill="none"/>`; }
    const ce = st.inst === 'clamp' && st.els.find((q) => q.id === st.clampEl);
    if (ce) { const [ax, ay] = px(ce.a), [bx, by] = px(ce.b), mx = (ax + bx) / 2, my = (ay + by) / 2, ang = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI, r = st.whole ? 22 : 13; s += `<g transform="translate(${mx.toFixed(1)} ${my.toFixed(1)}) rotate(${ang.toFixed(1)})"><ellipse rx="${r * 0.55}" ry="${r}" class="pg-jaw"/>${st.whole ? '<line x1="-30" y1="7" x2="30" y2="7" class="pg-cw" stroke-dasharray="3 3"/>' : ''}</g>`; }
    gEls.innerHTML = s;
  }
  const probePos = (c) => (M()[c] ? px(M()[c]) : PARK[c]);
  function drawProbes() {
    let s = '';
    for (const c of ['black', 'red']) {
      const [x, y] = drag && drag.c === c ? drag.p : probePos(c), base = [c === 'red' ? 214 : 146, H + 4];
      s += `<path d="M${base[0]},${base[1]} C${base[0]},${(base[1] + y) / 2 + 30} ${x},${y + 60} ${x},${y + 9}" class="pg-lead pg-lead-${c}"/>`;
      s += `<g class="pg-probe" data-probe="${c}"><rect x="${x - 4}" y="${y + 6}" width="8" height="18" rx="2" class="pg-pbody-${c}"/><path d="M${x},${y} L${x},${y + 7}" class="pg-ptip"/><circle cx="${x}" cy="${y}" r="13" fill="transparent"/></g>`;
    }
    gPr.innerHTML = s;
  }
  function drawDots(dtSec) {
    if (!live) { gDots.innerHTML = ''; return; }
    let s = '';
    for (const e of st.els) {
      const i = live.I.get(e.id) || 0; if (Math.abs(i) < 1e-5) continue;
      const [ax, ay] = px(e.a), [bx, by] = px(e.b), len = Math.hypot(bx - ax, by - ay);
      const v = Math.sign(i) * Math.min(150, 18 + 30 * Math.log10(1 + Math.abs(i) / 1e-3));
      const ph = ((phase.get(e.id) || 0) + v * dtSec) % 14; phase.set(e.id, ph);
      for (let d = (ph + 14) % 14; d < len; d += 14) s += `<circle cx="${(ax + ((bx - ax) * d) / len).toFixed(1)}" cy="${(ay + ((by - ay) * d) / len).toFixed(1)}" r="2.1" class="pg-cdots"/>`;
    }
    gDots.innerHTML = s;
  }

  // ---------- the multimeter ----------
  const DIAL_HELP = {
    off: 'המד כבוי. גם כבוי, שקע ה-A הוא מוליך כמעט מושלם: לכן מחזירים תמיד את הפרוב האדום לשקע VΩ בסוף העבודה.',
    vdc: 'מתח ישר. מחברים במקביל לרכיב: אדום לנקודה אחת, שחור לשנייה. הסימן אומר מי גבוה יותר. ההתנגדות הפנימית של המד גבוהה מאוד (בערך 10 MΩ), ולכן הוא כמעט לא משפיע על המעגל.',
    vac: 'מתח חילופין (RMS), כמו בשקע בבית. במעגל עם סוללות בלבד יראה 0.',
    mv: 'מתחים קטנים מאוד, למשל של צמד תרמי או מפל מתח על חוט. מעל 600 mV מראה OL.',
    ohm: 'התנגדות ורציפות (ביפ). רק על מעגל כבוי! המד מזרים זרם קטן משלו ומודד את המתח. ביפ = חיבור רציף (פחות מ-30 Ω לדוגמה). OL = מעגל פתוח.',
    diode: 'בדיקת דיודה: בכיוון ההולכה מראה את מפל המתח (בערך 0.5 עד 0.7 V בסיליקון), בכיוון ההפוך OL.',
    cap: 'קיבול: רק על קבל פרוק ומעגל כבוי. המד טוען את הקבל בזרם קבוע ומודד כמה מהר המתח עולה.',
    hz: 'תדר של מתח מתחלף. ברשת בבית בערך 50 Hz. בסוללה 0.',
    a: 'זרם עד 10 A (לדוגמה). מעבירים את הפרוב האדום לשקע A, ופותחים את המעגל: המד נכנס בטור, כך שכל הזרם עובר דרכו. לעולם לא במקביל לספק!',
    ma: 'זרמים קטנים, עד 400 mA (לדוגמה). הפרוב האדום בשקע mA. גם כאן בטור בלבד.',
  };
  function meterSvg(rd) {
    const m = M(), cx = 100, cy = 176, R = 40;
    const ang = (i) => (-210 + (i * 240) / (DIAL.length - 1)) * (Math.PI / 180);
    const di = DIAL.findIndex((d) => d.id === m.dial), a = ang(di);
    let s = `<svg viewBox="0 0 200 330" class="pg-meter" role="img" aria-label="מולטימטר דיגיטלי">`;
    s += `<rect x="6" y="4" width="188" height="322" rx="22" class="pg-mbody"/><rect x="16" y="14" width="168" height="300" rx="16" class="pg-mface"/>`;
    // display
    s += `<rect x="26" y="24" width="148" height="62" rx="6" class="pg-lcd ${m.dial === 'off' ? 'pg-lcd-off' : ''}"/>`;
    if (m.dial !== 'off') {
      s += `<text x="160" y="70" text-anchor="end" class="pg-lcdt" id="lcdT">${esc(rd.text)}</text><text x="166" y="80" text-anchor="end" class="pg-lcdu" id="lcdU">${esc(rd.unit)}</text>`;
      s += `<text x="34" y="40" class="pg-lcdu">${m.dial === 'vac' ? 'AC' : ['vdc', 'mv', 'a', 'ma'].includes(m.dial) ? 'DC' : ''} AUTO</text>`;
      s += `<text x="34" y="78" class="pg-lcdu" id="lcdB">${rd.beep ? '🔊' : ''}</text><text x="100" y="40" class="pg-lcdu" text-anchor="middle" id="lcdW">${rd.warn && rd.warn.startsWith('⚠') ? '⚠' : ''}</text>`;
    }
    // dial
    DIAL.forEach((d, i) => { const t = ang(i), x = cx + (R + 24) * Math.cos(t), y = cy + (R + 24) * Math.sin(t); s += `<g data-dial="${d.id}" class="pg-dpos"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="transparent"/><text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" class="pg-dtext ${i === di ? 'pg-don' : ''}">${esc(d.label)}</text></g>`; });
    s += `<circle cx="${cx}" cy="${cy}" r="${R}" class="pg-knob"/><circle cx="${cx}" cy="${cy}" r="${R - 9}" class="pg-knob2"/>`;
    s += `<line x1="${cx}" y1="${cy}" x2="${(cx + (R - 4) * Math.cos(a)).toFixed(1)}" y2="${(cy + (R - 4) * Math.sin(a)).toFixed(1)}" class="pg-kptr"/>`;
    // jacks: A, mA µA, COM, VΩ
    const J = [['a', 'A', 34], ['ma', 'mA µA', 78], ['com', 'COM', 122], ['v', 'VΩ', 166]];
    for (const [id, lab, x] of J) {
      const red = m.jack === id, blk = id === 'com';
      s += `<g data-jack="${id}" class="pg-jack"><circle cx="${x}" cy="290" r="15" fill="transparent"/><circle cx="${x}" cy="290" r="9" class="pg-jk ${red ? 'pg-jk-red' : blk ? 'pg-jk-blk' : ''} ${id === 'a' || id === 'ma' ? 'pg-jk-fused' : ''}"/><text x="${x}" y="272" text-anchor="middle" class="pg-dtext">${lab}</text></g>`;
    }
    s += `<text x="56" y="314" text-anchor="middle" class="pg-dtext pg-small">${m.fuseOK ? 'FUSED' : '⚠ נתיך נשרף'}</text>`;
    return s + '</svg>';
  }
  const instChips = () => `<div class="chips pg-inst">${INST.map(([v, t]) => `<button class="chip" data-inst="${v}" aria-pressed="${st.inst === v}">${t}</button>`).join('')}</div>`
    + (hasAC() ? `<div class="chips pg-slow"><span class="small muted">הילוך איטי לזרם חילופין:</span>${SLOW.map(([v, t]) => `<button class="chip" data-slow="${v}" aria-pressed="${st.slow === v}">${t}</button>`).join('')}</div>` : '');
  // ---------- clamp meter, voltage tester, oscilloscope ----------
  function clampBody() {
    const rd = clampReading(st.els, st.clampEl, st.whole);
    const svg = `<svg viewBox="0 0 200 200" class="pg-meter" role="img" aria-label="מד צבת"><path d="M60,92 L60,44 A40,40 0 0 1 140,44 L140,92" fill="none" stroke="#f59e0b" stroke-width="14" stroke-linecap="round"/><circle cx="100" cy="46" r="${st.whole ? 18 : 7}" fill="#b45309"/>${st.whole ? '<circle cx="93" cy="46" r="5" fill="#334155"/><circle cx="107" cy="46" r="5" fill="#334155"/>' : ''}<rect x="40" y="88" width="120" height="106" rx="14" class="pg-mbody"/><rect x="52" y="100" width="96" height="44" rx="5" class="pg-lcd"/><text x="140" y="132" text-anchor="end" class="pg-lcdt" style="font-size:20px">${esc(rd.text)}</text><text x="144" y="141" text-anchor="end" class="pg-lcdu">${esc(rd.unit)}</text><text x="58" y="111" class="pg-lcdu">AC</text><text x="100" y="172" text-anchor="middle" class="pg-dtext">A~</text></svg>`;
    return `<h3 class="pg-h">🗜 מד צבת</h3><div class="pg-mwrap">${svg}<div class="pg-minfo"><p class="small">${st.clampEl ? `מחבק את: <b>${esc(NAME[(st.els.find((q) => q.id === st.clampEl) || {}).type] || '')}</b>` : 'לחץ על חוט או רכיב במעגל (בכלי ✋) כדי לחבק אותו.'}</p>
      <p class="small" style="color:${rd.warn ? 'var(--bad)' : 'inherit'}">${esc(rd.warn)}</p>
      <div class="chips"><button class="chip" data-act="whole" data-v="0" aria-pressed="${!st.whole}">מוליך אחד</button><button class="chip" data-act="whole" data-v="1" aria-pressed="${st.whole}">הכבל כולו</button></div></div></div>
      <p class="small muted">הצבת מודדת את השדה המגנטי שזרם מתחלף יוצר סביב המוליך, בלי לפתוח את המעגל ובלי לגעת בנחושת. בכבל שלם הזרם הולך בגיד אחד וחוזר בשני: השדות מבטלים זה את זה. זה בדיוק העיקרון של ממסר פחת, שבודק שההפרש בין שני הגידים הוא 0. צבת פשוטה כזו לא מודדת זרם ישר (יש דגמים שכן, עם חיישן Hall).</p>`;
  }
  function testerBody() {
    const m = M(), q = testerReading(st.els, m.red, m.black);
    let leds = ''; TESTER.forEach((v, k) => { const y = 168 - k * 24, on = k < q.leds; leds += `<circle cx="70" cy="${y}" r="7" fill="${on ? (v >= 120 ? '#ef4444' : '#f59e0b') : '#4b5563'}"/><text x="86" y="${y + 4}" class="pg-dtext">${v} V</text>`; });
    const svg = `<svg viewBox="0 0 200 200" class="pg-meter" role="img" aria-label="בודק מתח דו-קוטבי"><rect x="44" y="12" width="112" height="182" rx="18" class="pg-mbody"/>${leds}<text x="70" y="30" text-anchor="middle" class="pg-dtext ${q.ac ? 'pg-don' : ''}">~</text><text x="104" y="30" text-anchor="middle" class="pg-dtext ${q.sign > 0 ? 'pg-don' : ''}">+</text><text x="132" y="30" text-anchor="middle" class="pg-dtext ${q.sign < 0 ? 'pg-don' : ''}">−</text></svg>`;
    return `<h3 class="pg-h">🔦 בודק מתח דו-קוטבי</h3><div class="pg-mwrap">${svg}<div class="pg-minfo"><p class="small">${m.red && m.black ? `בין הפרובים בערך ${ltr(`${q.V.toFixed(1)} V`)} ${q.ac ? 'חילופין' : q.sign ? 'ישר' : ''}` : 'גרור את שני הפרובים לשתי נקודות במעגל.'}</p>
      <p class="small">בודק כזה לא נותן מספר מדויק, אלא עונה מהר על השאלה "יש פה מתח?". הנוריות נדלקות בדרגות, ${'~'} אומר מתח חילופין, ו-+ או − את הקוטביות של מתח ישר.</p></div></div>
      <p class="small muted">כלל עבודה: לפני שמכריזים "אין מתח", בודקים את הבודק על מקור ידוע, מודדים, ואז בודקים אותו שוב על המקור הידוע. כך יודעים שהבודק עצמו לא תקול. הדרגות כאן הן ערכים לדוגמה.</p>`;
  }
  function scopeBody() {
    const m = M(), ch2 = st.els.find((q) => q.id === st.sel), fs = acFreqs(st.els), win = fs.length ? 2 / fs[0] : 4;
    const t1 = sim.t, pts = buf.filter((p) => p[0] >= t1 - win), step2 = Math.max(1, Math.floor(pts.length / 300)), sm = pts.filter((_, k) => k % step2 === 0);
    let g = '<p class="small muted">אין עדיין נתונים.</p>';
    if (sm.length > 2) {
      const series = []; if (m.red && m.black) series.push({ ys: sm.map((p) => p[1]), col: COL.v, label: 'CH1 v' }); if (ch2) series.push({ ys: sm.map((p) => p[2]), col: COL.i, label: 'CH2 i', axis: 'r' });
      if (series.length) g = plot({ xs: sm.map((p) => (p[0] - sm[0][0]) * 1000), series, units: { x: 'ms', l: 'V', r: 'A' }, sym: fs.length > 0, rzoom: 1.4, id: 'cScope' });
    }
    let dphi = '';
    if (fs.length === 1 && ch2 && m.red && m.black && !st.els.some((e) => e.type === 'diode')) { const d = phaseShift(st.els, fs[0], m.red, m.black, ch2.id); if (d !== null) dphi = `<p class="small"><b>הפרש פאזה:</b> ${Math.abs(d) < 0.5 ? 'המתח והזרם באותה פאזה (כמו בנגד).' : d > 0 ? `המתח מקדים את הזרם ב-${d.toFixed(1)}° (השראי, הזרם מפגר).` : `הזרם מקדים את המתח ב-${(-d).toFixed(1)}° (קיבולי).`}</p>`; }
    return `<h3 class="pg-h">📈 אוסצילוסקופ פשוט</h3><div class="pg-scope">${g}</div>${dphi}
      <p class="small">ערוץ 1 (כחול): המתח בין הפרוב האדום לשחור. ערוץ 2 (כתום): הזרם ברכיב שבחרת במעגל (לחיצה עליו בכלי ✋)${ch2 ? `, עכשיו ${esc(NAME[ch2.type])}` : ''}. ${fs.length ? `החלון מראה שני מחזורים (${(win * 1000).toFixed(0)} ms).` : 'החלון מראה את 4 השניות האחרונות.'}</p>
      <p class="small muted">באוסצילוסקופ אמיתי הערוץ השני מודד מתח, ולכן זרם מודדים דרך נגד קטן (shunt) או פרוב זרם. וזהירות: ה-COM של רוב הסקופים מחובר להארקה.</p>`;
  }
  function otherPanel() {
    meterBox.innerHTML = instChips() + `<div id="instBody">${st.inst === 'clamp' ? clampBody() : st.inst === 'tester' ? testerBody() : scopeBody()}</div>`;
  }
  function meterPanel() {
    if (st.inst !== 'dmm') { otherPanel(); return; }
    const m = M(), rd = meterReading(st.els, live, m, sim);
    meterBox.innerHTML = instChips() + `<h3 class="pg-h">🔧 מולטימטר דיגיטלי</h3>
      <div class="pg-mwrap">${meterSvg(rd)}<div class="pg-minfo"><p class="small"><b>${esc(DIAL.find((d) => d.id === m.dial).label)}</b>: ${esc(DIAL_HELP[m.dial])}</p>
      <p class="small" id="mWarn" style="color:${rd.warn.startsWith('⚠') ? 'var(--bad)' : 'inherit'}">${esc(rd.warn)}</p>
      <p class="small muted">אדום: ${m.red ? ltr(m.red) : 'לא מחובר'} · שחור: ${m.black ? ltr(m.black) : 'לא מחובר'}</p>
      ${m.fuseOK ? '' : '<button class="btn" data-act="mfuse">🔁 החלף את הנתיך במד</button>'}
      <button class="btn" data-act="park">↩ החזר פרובים</button></div></div>
      <p class="small muted">לוחצים על מצב בבורר כדי לסובב אותו, ועל שקע כדי להעביר אליו את הפרוב האדום. השחור תמיד ב-COM. ההתנגדות הפנימית, הנתיכים וסף הביפ הם ערכים לדוגמה, ומשתנים בין דגמים.</p>`;
    if (rd.beep && !lastBeep) beep();
    lastBeep = !!rd.beep;
  }
  // light update: only the numbers on the display and the warning
  function meterValues() {
    if (st.inst !== 'dmm') { const b = meterBox.querySelector('#instBody'); if (b) b.innerHTML = st.inst === 'clamp' ? clampBody() : st.inst === 'tester' ? testerBody() : scopeBody(); return; }
    const m = M(), rd = meterReading(st.els, live, m, sim), q = (id) => meterBox.querySelector(id);
    if (m.dial === 'off' || !q('#lcdT')) return;
    q('#lcdT').textContent = rd.text; q('#lcdU').textContent = rd.unit; q('#lcdB').textContent = rd.beep ? '🔊' : ''; q('#lcdW').textContent = rd.warn && rd.warn.startsWith('⚠') ? '⚠' : '';
    const w = q('#mWarn'); if (w && w.textContent !== rd.warn) { w.textContent = rd.warn; w.style.color = rd.warn.startsWith('⚠') ? 'var(--bad)' : 'inherit'; }
    if (rd.beep && !lastBeep) beep();
    lastBeep = !!rd.beep;
  }
  let actx = null;
  function beep() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 2600; g.gain.value = 0.04; o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.12); } catch (e) { /* ignore */ } }

  // ---------- editor and results ----------
  const field = (f, lab, v, unit, extra = '') => `<label><span>${esc(lab)} ${unit ? ltr(`[${unit}]`) : ''}</span><input type="number" inputmode="decimal" step="any" data-f="${f}" value="${v}" ${extra}></label>`;
  const chips = (items, cur, act) => `<div class="chips">${items.map(([v, t]) => `<button class="chip" data-act="${act}" data-v="${v}" aria-pressed="${String(cur) === String(v)}">${esc(t)}</button>`).join('')}</div>`;
  function editor() {
    const e = st.els.find((q) => q.id === st.sel);
    if (!e) return `<h3 class="pg-h">איך משחקים</h3><p class="small">בחר תבנית למעלה, או בנה מעגל משלך עם הכלים. הנקודות הצהובות הן הזרם (בכיוון המוסכם, מ-+ ל-−), והמהירות שלהן גדלה עם הזרם. נורה מאירה לפי ההספק שלה.</p>
      <p class="small">כדי למדוד: גרור את הפרוב האדום והשחור לנקודות במעגל, ובחר מצב בבורר של המד.</p>
      <button class="btn" data-act="reset">↺ החלף נתיכים ופרוק קבלים</button>`;
    const del = '<button class="btn pg-del" data-act="del">🗑 מחק</button>';
    const head = `<h3 class="pg-h">${esc(NAME[e.type])} ${ltr(`${e.a} → ${e.b}`)}</h3>`;
    switch (e.type) {
      case 'res': return head + `<div class="pg-form">${field('R', 'התנגדות', e.R, 'Ω')}</div>${chips([[10, '10 Ω'], [100, '100 Ω'], [1000, '1 kΩ'], [10000, '10 kΩ']], e.R, 'R')}${del}`;
      case 'lamp': return head + `<div class="pg-form">${field('V', 'מתח נקוב', e.V, 'V')}${field('P', 'הספק נקוב', e.P, 'W')}</div>${chips([['12,6', '12 V 6 W'], ['12,21', '12 V 21 W'], ['12,55', '12 V 55 W']], `${e.V},${e.P}`, 'lampv')}<p class="small muted">${ltr(`R = V²/P = ${si(lampR(e.V, e.P), 'Ω')}`)}. בפועל חוט להט קר מתנגד הרבה פחות מחם, אבל כאן ההתנגדות קבועה.</p>${del}`;
      case 'bat': return head + `<div class="pg-form">${field('V', 'מתח', e.V, 'V')}${field('r', 'התנגדות פנימית', e.r, 'Ω')}</div>${chips([[1.5, '1.5 V'], [9, '9 V'], [12, '12 V']], e.V, 'V')}<button class="btn" data-act="flip">⇄ הפוך קטבים</button>${del}`;
      case 'vac': return head + `<div class="pg-form">${field('Vrms', 'מתח RMS', e.Vrms, 'V')}${field('f', 'תדר', e.f, 'Hz')}</div>${chips([[12, '12 V'], [24, '24 V'], [GRID.V, `${GRID.V} V`]], e.Vrms, 'Vrms')}${chips([[50, '50 Hz'], [60, '60 Hz'], [400, '400 Hz']], e.f, 'f')}<p class="small muted">מקור סינוס: ${ltr('v = √2·V·sin(2πft)')}. ${ltr(`${GRID.V} V, ${GRID.f} Hz`)} הם ערכי הרשת בישראל (מקור: ${ltr(GRID.src)}). הנקודה הראשונה היא הצד החם.</p><button class="btn" data-act="flip">⇄ הפוך צדדים</button>${del}`;
      case 'sw': return head + `<button class="btn" data-act="toggle">${e.on ? '⏻ פתח את המתג' : '⏻ סגור את המתג'}</button>${del}`;
      case 'fuse': return head + `<div class="pg-form">${field('I', 'זרם נקוב', e.I, 'A')}</div>${chips([[0.5, '0.5 A'], [1, '1 A'], [2, '2 A'], [5, '5 A'], [10, '10 A']], e.I, 'I')}${e.blown ? '<p class="small" style="color:var(--bad)">הנתיך נשרף. מצא קודם למה (קצר? עומס יתר?), ורק אז החלף.</p><button class="btn" data-act="refuse">🔁 החלף נתיך</button>' : ''}<p class="small muted">בסימולציה הנתיך נשרף מיד כשהזרם עובר את הנקוב. נתיך אמיתי נשרף אחרי זמן שתלוי בכמה הזרם גבוה.</p>${del}`;
      case 'cap': return head + `<div class="pg-form">${field('Cu', 'קיבול', Number((e.C * 1e6).toPrecision(4)), 'µF')}</div>${chips([[10, '10 µF'], [100, '100 µF'], [1000, '1000 µF']], Number((e.C * 1e6).toPrecision(4)), 'Cu')}<p class="small muted">במתח ישר, קבל טעון לא מעביר זרם. עם נגד R הוא נטען בקבוע זמן ${ltr('τ = RC')}.</p>${del}`;
      case 'ind': return head + `<div class="pg-form">${field('L', 'השראות', e.L, 'H')}</div>${chips([[0.1, '0.1 H'], [1, '1 H'], [5, '5 H']], e.L, 'L')}<p class="small muted">סליל מתנגד לשינוי בזרם: ${ltr('V = L·di/dt')}. במתח ישר יציב הוא כמו חוט.</p>${del}`;
      case 'diode': return head + `<button class="btn" data-act="flip">⇄ הפוך כיוון</button><p class="small muted">מודל פשוט: מוליכה בכיוון החץ, עם מפל של בערך ${ltr('0.7 V')} (סיליקון), וחוסמת בכיוון ההפוך.</p>${del}`;
      case 'cable': return head + `<div class="pg-form">${field('len', 'אורך', e.len, 'm')}${field('area', 'חתך', e.area, 'mm²')}</div>${chips([[0.75, '0.75 mm²'], [1.5, '1.5 mm²'], [2.5, '2.5 mm²'], [4, '4 mm²']], e.area, 'area')}${chips([['cu', MAT_NAME.cu], ['al', MAT_NAME.al]], e.mat, 'mat')}
        <p class="small">${ltr(`R = ρL/A = ${si(cableR(e.len, e.area, e.mat), 'Ω')}`)}, עם ${ltr(`ρ = ${e.mat === 'cu' ? '1.68' : '2.65'}·10⁻⁸ Ω·m`)} ב-${ltr('20 °C')}. זה מוליך אחד: לזרם יש תמיד דרך הלוך ודרך חזור, ולכן במעגל אמיתי סופרים את האורך פעמיים.</p>${del}`;
      default: return head + del;
    }
  }
  // with AC: RMS values (a steady state of the whole circuit) instead of the jumping instant values
  let acRows = null, acKey = '';
  function resultsAC() {
    const key = JSON.stringify(st.els);
    if (key !== acKey) {
      acKey = key; const all = acMeasureAll(st.els), tot = (q) => Math.sqrt(q.mean * q.mean + q.rms * q.rms);
      acRows = st.els.filter((e) => e.type !== 'wire').map((e) => { const q = all.get(e.id); return { e, V: tot(q.V), I: tot(q.I), P: q.P }; });
    }
    const srcs = acRows.filter((r) => r.e.type === 'vac' || r.e.type === 'bat'), give = -srcs.reduce((s2, r) => s2 + r.P, 0);
    const rows = acRows.map(({ e, V, I, P }) => `<tr data-row="${e.id}" class="${st.sel === e.id ? 'pg-rowsel' : ''}"><td>${esc(NAME[e.type])} ${ltr(label(e))}</td><td>${ltr(si(V, 'V'))}</td><td>${ltr(si(I, 'A'))}</td><td>${ltr(si(Math.abs(P), 'W'))}</td></tr>`).join('');
    return `<h3 class="pg-h">מה קורה במעגל (זרם חילופין, ערכי RMS)</h3>
      <div class="pg-max"><div><span>זרם מהמקורות (RMS)</span><b>${ltr(si(srcs.reduce((s2, r) => Math.max(s2, r.I), 0), 'A'))}</b></div><div><span>הספק ממוצע מהמקורות</span><b>${ltr(si(give, 'W'))}</b></div><div><span>זמן (בסימולציה)</span><b>${ltr(`${(sim.t * 1000).toFixed(1)} ms`)}</b></div></div>
      <table class="pg-table"><thead><tr><th>רכיב</th><th>מתח RMS</th><th>זרם RMS</th><th>הספק ממוצע</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="small muted">במתח חילופין הערך הרגעי משתנה כל הזמן, ולכן הטבלה מראה RMS במצב יציב. בקבל ובסליל ההספק הממוצע 0: הם רק אוגרים ומחזירים אנרגיה. ${st.els.some((e) => e.type === 'diode') ? 'עם דיודות החישוב הוא סימולציה בזמן של כמה מחזורים, והמתח והזרם כוללים גם את החלק הישר.' : 'שים לב: סכום מתחי ה-RMS בלולאה לא חייב להיות 0, כי הם לא באותה פאזה. הפאזורים כן מסתכמים ל-0.'}</p>`;
  }
  function results() {
    if (!live || !st.els.length) return '<h3 class="pg-h">מה קורה במעגל</h3><p class="small muted">אין עדיין מעגל.</p>';
    if (hasAC()) return resultsAC();
    const bats = st.els.filter((e) => e.type === 'bat');
    const Itot = bats.reduce((s, e) => s + Math.max(0, -live.I.get(e.id)), 0), Pgive = bats.reduce((s, e) => s - (e.V * live.I.get(e.id)), 0);
    const short = bats.some((e) => Math.abs(live.I.get(e.id)) > 0.8 * (e.V / e.r));
    const rows = st.els.filter((e) => e.type !== 'wire').map((e) => { const v = live.Vd.get(e.id), i = live.I.get(e.id); return `<tr data-row="${e.id}" class="${st.sel === e.id ? 'pg-rowsel' : ''}"><td>${esc(NAME[e.type])} ${ltr(label(e))}</td><td>${ltr(si(Math.abs(v), 'V'))}</td><td>${ltr(si(Math.abs(i), 'A'))}</td><td>${ltr(si(Math.abs(v * i), 'W'))}</td></tr>`; }).join('');
    return `<h3 class="pg-h">מה קורה במעגל</h3>
      ${short ? '<div class="pg-status bad">⚠ קצר: הסוללה מוזנת כמעט רק דרך ההתנגדות הפנימית שלה. במציאות היא מתחממת מאוד, ובלי נתיך זה מסוכן.</div>' : ''}
      <div class="pg-max"><div><span>זרם מהסוללות</span><b>${ltr(si(Itot, 'A'))}</b></div><div><span>הספק שהסוללות נותנות</span><b>${ltr(si(Pgive, 'W'))}</b></div><div><span>זמן מאז ההתחלה</span><b>${ltr(`${sim.t.toFixed(1)} s`)}</b></div></div>
      <table class="pg-table"><thead><tr><th>רכיב</th><th>מתח</th><th>זרם</th><th>הספק</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="small muted">${ltr('V = I·R')} (חוק אוהם), ${ltr('P = V·I')}. בכל צומת סכום הזרמים 0, ובכל לולאה סכום המתחים 0 (חוקי Kirchhoff). רוצה לבדוק? מדוד עם המולטימטר.</p>`;
  }
  const all = () => { drawEls(); drawProbes(); ed.innerHTML = editor(); out.innerHTML = results(); meterPanel(); hint.textContent = hintFor(st.tool); root.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === st.tool))); };
  // the meter's own fuse: too much current through the A or mA jack
  const meterBlows = (r) => { const m = M(); if (!r || !r.I.has('meter') || !(m.jack === 'a' || m.jack === 'ma')) return false; if (Math.abs(r.I.get('meter')) <= (m.jack === 'a' ? METER.fuseA : METER.fusemA)) return false; m.fuseOK = false; save(); toast('🔥 הנתיך של המד נשרף'); return true; };
  const restart = () => { buf = []; sim = emptyState(); live = step(simEls(), sim, 1e-4); if (meterBlows(live)) { sim = emptyState(); live = step(simEls(), sim, 1e-4); } }; // a first solve right away, before any animation frame

  // ---------- simulation loop ----------
  function tick(now) {
    if (!root.isConnected) return;
    const dtSec = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
    const els = simEls(), fs = acFreqs(st.els), simDt = dtSec * (fs.length ? st.slow : 1);
    const n = Math.min(400, Math.max(8, fs.length ? Math.ceil(simDt * fs[fs.length - 1] * 100) : 8)), m = M(), ch2 = st.sel;
    let changed = false;
    for (let k = 0; k < n; k++) {
      live = step(els, sim, simDt / n);
      if (st.inst === 'scope') { buf.push([sim.t, m.red && m.black ? live.v(m.red) - live.v(m.black) : 0, ch2 != null && live.I.has(ch2) ? live.I.get(ch2) : 0]); if (buf.length > 8000) buf.splice(0, buf.length - 6000); }
      if (live.blown.length) { live.blown.forEach((f) => { f.blown = true; }); changed = true; toast('🔥 הנתיך נשרף'); break; }
      if (meterBlows(live)) { changed = true; break; }
    }
    if (changed) { save(); restart(); all(); }
    drawDots(dtSec); drawEls();
    if (now - lastPanel > 200) { lastPanel = now; meterValues(); if (!drag) { const r = results(); if (r !== lastRes) { out.innerHTML = r; lastRes = r; } } }
    raf = requestAnimationFrame(tick);
  }

  // ---------- input ----------
  const toSvg = (ev) => { const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return [q.x, q.y]; };
  const nearPoint = ([x, y]) => { const gx = Math.round((x - X0) / SP), gy = Math.round((y - Y0) / SP); if (gx < 0 || gy < 0 || gx >= GX || gy >= GY) return null; const [qx, qy] = px(`${gx},${gy}`); return Math.hypot(qx - x, qy - y) < 17 ? `${gx},${gy}` : null; };
  const hitEl = ([x, y]) => { let best = null, bd = 11; for (const e of st.els) { const [ax, ay] = px(e.a), [bx, by] = px(e.b), dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))), d = Math.hypot(ax + t * dx - x, ay + t * dy - y); if (d < bd) { bd = d; best = e; } } return best; };
  svg.addEventListener('pointerdown', (ev) => {
    const p = toSvg(ev);
    for (const c of ['red', 'black']) { const [x, y] = probePos(c); if (Math.hypot(x - p[0], y + 10 - p[1]) < 20) { ev.preventDefault(); drag = { c, p: [x, y], id: ev.pointerId }; try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ } return; } }
    const t = st.tool;
    if (t === 'select' || t === 'del') {
      const e = hitEl(p);
      if (t === 'del') { if (e) { st.els = st.els.filter((q) => q !== e); st.sel = null; save(); restart(); all(); } return; }
      if (e && e.type === 'sw') e.on = !e.on;
      if (e && st.inst === 'clamp') st.clampEl = e.id;
      if (e && st.inst === 'scope' && e.id !== st.sel) buf = [];
      st.sel = e ? e.id : null; save(); all(); return;
    }
    const k = nearPoint(p); if (!k) return;
    if (!st.pend) { st.pend = k; drawEls(); return; }
    if (st.pend === k) { st.pend = null; drawEls(); return; }
    const a = st.pend, b = k;
    if (!st.els.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))) { const ne = E(t, a, b); st.els.push(ne); st.sel = t === 'wire' ? st.sel : ne.id; }
    st.pend = t === 'wire' ? b : null; save(); restart(); all();
  });
  svg.addEventListener('pointermove', (ev) => { if (!drag || ev.pointerId !== drag.id) return; const [x, y] = toSvg(ev); drag.p = [Math.max(6, Math.min(W - 6, x)), Math.max(6, Math.min(H - 20, y - 10))]; drawProbes(); });
  const endDrag = (ev) => {
    if (!drag || ev.pointerId !== drag.id) return;
    const k = nearPoint(drag.p), m = M(), ns = nodeSet();
    m[drag.c] = k && (ns.has(k)) ? k : null; drag = null; save(); restart(); drawProbes(); meterPanel();
  };
  svg.addEventListener('pointerup', endDrag); svg.addEventListener('pointercancel', endDrag);
  meterBox.addEventListener('click', (ev) => {
    const d = ev.target.closest('[data-dial]'), j = ev.target.closest('[data-jack]'), b = ev.target.closest('[data-act]');
    const ins = ev.target.closest('[data-inst]'), sl = ev.target.closest('[data-slow]');
    if (ins) { st.inst = ins.dataset.inst; restart(); save(); all(); return; }
    if (sl) { st.slow = Number(sl.dataset.slow); save(); meterPanel(); return; }
    if (b && b.dataset.act === 'whole') { st.whole = b.dataset.v === '1'; save(); meterPanel(); drawEls(); return; }
    if (d) { M().dial = d.dataset.dial; }
    else if (j) { if (j.dataset.jack === 'com') { toast('הפרוב השחור תמיד ב-COM'); return; } M().jack = j.dataset.jack; restart(); }
    else if (b && b.dataset.act === 'mfuse') { M().fuseOK = true; restart(); }
    else if (b && b.dataset.act === 'park') { M().red = null; M().black = null; restart(); drawProbes(); }
    else return;
    save(); meterPanel();
  });
  root.addEventListener('click', (ev) => {
    if (ev.target.closest('#cMeter')) return;
    const tp = ev.target.closest('[data-tpl]');
    if (tp) { st.els = TEMPLATES.find((q) => q.id === tp.dataset.tpl).els(); st.sel = null; st.pend = null; st.meter.red = null; st.meter.black = null; save(); restart(); all(); return; }
    const tl = ev.target.closest('[data-tool]');
    if (tl) { st.tool = tl.dataset.tool; st.pend = null; save(); all(); return; }
    const row = ev.target.closest('[data-row]'); if (row) { st.sel = Number(row.dataset.row); all(); return; }
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const e = st.els.find((q) => q.id === st.sel), a = b.dataset.act, v = b.dataset.v;
    if (a === 'reset') { st.els.forEach((q) => { if (q.type === 'fuse') q.blown = false; }); st.meter.fuseOK = true; }
    else if (!e) return;
    else if (a === 'del') { st.els = st.els.filter((q) => q !== e); st.sel = null; }
    else if (a === 'flip') [e.a, e.b] = [e.b, e.a];
    else if (a === 'toggle') e.on = !e.on;
    else if (a === 'refuse') e.blown = false;
    else if (a === 'lampv') { const [V, P] = v.split(',').map(Number); e.V = V; e.P = P; }
    else if (a === 'Cu') e.C = Number(v) * 1e-6;
    else if (a === 'mat') e.mat = v;
    else if (['R', 'V', 'I', 'L', 'area', 'Vrms', 'f'].includes(a)) e[a] = Number(v);
    else return;
    save(); restart(); all();
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f, e = st.els.find((q) => q.id === st.sel); if (!f || !e) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v) || v < 0) return;
    if (f === 'Cu') { if (v <= 0) return; e.C = v * 1e-6; } else if (f === 'r') e.r = Math.max(1e-3, v); else { if (v <= 0) return; e[f] = v; }
    save(); restart(); drawEls();
  });
  ed.addEventListener('change', () => { ed.innerHTML = editor(); });

  restart(); all(); raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
