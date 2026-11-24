// playground.js: the "מגרש משחקים" tab. Stage 1: beams and supports, solved live.
// Build a beam with supports and loads, drag them along the beam, and see reactions,
// shear, moment and deflection update immediately. The solver is js/beam.js
// (checked against textbook tables in tests/beam-cases.mjs).
import { solveBeam, rectSection, bendingStress, REACTION_COUNT } from './beam.js';
import { esc } from './text.js';
import { renderPulleys } from './playground-pulleys.js';
import { renderTruss } from './playground-truss.js';
import { renderFluid } from './playground-fluid.js';
import { renderVib } from './playground-vib.js';
import { renderFbd } from './playground-fbd.js';

const KEY = 'mh-pg-v1';
const W = 360, X0 = 34, X1 = 326, BY = 94; // canvas geometry (px in viewBox units)
const SUP_NAME = { pin: 'סמך נייח', roller: 'סמך גלגלת', fixed: 'ריתום' };

const TEMPLATES = [
  { id: 'ss', name: 'קורה פשוטה', make: () => ({ L: 6, supports: [S('pin', 0), S('roller', 6)], loads: [D(0, 6, 10, 10)] }) },
  { id: 'cant', name: 'זיז', make: () => ({ L: 4, supports: [S('fixed', 0)], loads: [P(4, 20, 270)] }) },
  { id: 'prop', name: 'זיז עם גלגלת', make: () => ({ L: 6, supports: [S('fixed', 0), S('roller', 6)], loads: [D(0, 6, 10, 10)] }) },
  { id: 'over', name: 'קורה עם שלוחה', make: () => ({ L: 6, supports: [S('pin', 0), S('roller', 4)], loads: [D(0, 4, 10, 10), P(6, 15, 270)] }) },
  { id: 'cont', name: 'קורה רציפה', make: () => ({ L: 8, supports: [S('pin', 0), S('roller', 4), S('roller', 8)], loads: [D(0, 8, 10, 10)] }) },
  { id: 'ff', name: 'ריתום משני הצדדים', make: () => ({ L: 6, supports: [S('fixed', 0), S('fixed', 6)], loads: [P(3, 20, 270)] }) },
  { id: 'tri', name: 'עומס משולש', make: () => ({ L: 6, supports: [S('pin', 0), S('roller', 6)], loads: [D(0, 6, 0, 12)] }) },
  { id: 'empty', name: 'ריק', make: () => ({ L: 6, supports: [], loads: [] }) },
];
let uid = 1;
function S(type, x) { return { id: uid++, type, x }; }
function P(x, P, angle) { return { id: uid++, type: 'point', x, P, angle }; }
function D(a, b, w1, w2) { return { id: uid++, type: 'dist', a, b, w1, w2 }; }
function Mo(x, M) { return { id: uid++, type: 'moment', x, M }; }

const defaultScene = () => ({ ...TEMPLATES[0].make(), b: 100, h: 200, E: 200, sel: null });
let sc = null;
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.L > 0 && Array.isArray(s.supports) && Array.isArray(s.loads)) sc = s; } catch (e) { /* ignore */ }
  if (!sc) sc = defaultScene();
  uid = 1 + Math.max(0, ...sc.supports.map((e) => e.id), ...sc.loads.map((e) => e.id));
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(sc)); } catch (e) { /* ignore */ } };

// ---------- helpers ----------
const num = (n, d = 3) => {
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n); if (a < 1e-7) return '0';
  const s = a >= 1000 ? n.toFixed(0) : a >= 100 ? n.toFixed(1) : a >= 10 ? n.toFixed(2) : n.toFixed(d);
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
};
const ltr = (s) => `<span class="ltr">${esc(s)}</span>`;
const step = () => (sc.L <= 12 ? 0.05 : 0.1);
const snap = (x) => Math.min(sc.L, Math.max(0, Math.round(x / step()) * step()));
const fix2 = (x) => Math.round(x * 1000) / 1000;
const X = (m) => X0 + ((X1 - X0) * m) / sc.L;
const all = () => [...sc.supports.map((e) => ['s', e]), ...sc.loads.map((e) => ['l', e])];
const find = (id) => sc.supports.find((e) => e.id === id) || sc.loads.find((e) => e.id === id);
function section() { const { I, EI } = rectSection(sc.b, sc.h, sc.E); return { I, EI }; }
function solve() {
  const { EI } = section();
  return solveBeam({ L: sc.L, EI, supports: sc.supports, loads: sc.loads });
}

// ---------- SVG pieces ----------
function arrow(x1, y1, x2, y2, cls, head = 7) {
  const a = Math.atan2(y2 - y1, x2 - x1), h1 = [x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45)], h2 = [x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45)];
  return `<line x1="${x1}" y1="${y1}" x2="${x2 - 0.6 * head * Math.cos(a)}" y2="${y2 - 0.6 * head * Math.sin(a)}" class="${cls}"/><polygon points="${x2},${y2} ${h1} ${h2}" class="${cls} pg-head"/>`;
}
const text = (x, y, s, cls = '', anchor = 'middle') => `<text x="${x}" y="${y}" text-anchor="${anchor}" class="pg-t ${cls}">${esc(s)}</text>`;
const hatch = (x1, y, x2) => { let s = `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="pg-ground"/>`; for (let x = x1 + 3; x <= x2; x += 6) s += `<line x1="${x}" y1="${y}" x2="${x - 5}" y2="${y + 6}" class="pg-ground"/>`; return s; };

function drawSupport(s) {
  const x = X(s.x); let g = '';
  if (s.type === 'pin') {
    g = `<polygon points="${x},${BY + 6} ${x - 11},${BY + 25} ${x + 11},${BY + 25}" class="pg-sup"/>${hatch(x - 16, BY + 25, x + 16)}`;
  } else if (s.type === 'roller') {
    g = `<polygon points="${x},${BY + 6} ${x - 10},${BY + 20} ${x + 10},${BY + 20}" class="pg-sup"/><circle cx="${x - 5}" cy="${BY + 23.5}" r="3.2" class="pg-sup"/><circle cx="${x + 5}" cy="${BY + 23.5}" r="3.2" class="pg-sup"/>${hatch(x - 16, BY + 27, x + 16)}`;
  } else {
    const atL = s.x < 1e-9, atR = s.x > sc.L - 1e-9;
    if (atL || atR) {
      const wx = atL ? x - 2 : x + 2, dir = atL ? -1 : 1;
      g = `<line x1="${wx}" y1="${BY - 24}" x2="${wx}" y2="${BY + 24}" class="pg-wall"/>`;
      for (let y = BY - 22; y <= BY + 24; y += 6) g += `<line x1="${wx}" y1="${y}" x2="${wx + 6 * dir}" y2="${y - 5}" class="pg-ground"/>`;
    } else {
      g = `<rect x="${x - 7}" y="${BY - 15}" width="14" height="30" rx="2" class="pg-clamp"/>${hatch(x - 16, BY + 15, x + 16)}`;
    }
  }
  return `<g data-k="${s.id}" class="${sc.sel === s.id ? 'pg-sel' : ''}"><rect x="${x - 20}" y="${BY - 26}" width="40" height="60" rx="10" class="pg-hit"/>${g}</g>`;
}

function distScale() { return Math.max(1e-9, ...sc.loads.filter((l) => l.type === 'dist').map((l) => Math.max(Math.abs(l.w1), Math.abs(l.w2)))); }
function drawLoad(l) {
  const sel = sc.sel === l.id ? 'pg-sel' : '';
  if (l.type === 'point') {
    const t = (l.angle * Math.PI) / 180, dx = Math.cos(t), dy = -Math.sin(t), top = BY - 7;
    const len = sc.loads.some((q) => q.type === 'dist') ? 66 : 46; // reach above distributed loads and their labels
    const x = X(l.x); let x1, y1, x2, y2;
    if (dy > 0.01) { x2 = x; y2 = top; x1 = x - dx * len; y1 = top - dy * len; } else { x1 = x; y1 = top; x2 = x + dx * len; y2 = top + dy * len; }
    const lx = dy > 0.01 ? x1 : x2, ly = Math.min(y1, y2) - 6;
    return `<g data-k="${l.id}" class="${sel}"><circle cx="${x}" cy="${BY - 30}" r="22" class="pg-hit"/>${arrow(x1, y1, x2, y2, 'pg-load')}${text(Math.min(W - 24, Math.max(24, lx)), Math.max(10, ly), `${num(l.P)} kN`, 'pg-tl')}</g>`;
  }
  if (l.type === 'moment') {
    const x = X(l.x), r = 15, ccw = l.M >= 0;
    const arc = `<path d="M${x + r},${BY} A${r},${r} 0 1 0 ${x - r},${BY}" class="pg-load pg-nofill"/>`;
    const head = ccw ? arrow(x - r - 0.01, BY - 4, x - r, BY + 2, 'pg-load', 7) : arrow(x + r + 0.01, BY - 4, x + r, BY + 2, 'pg-load', 7);
    return `<g data-k="${l.id}" class="${sel}"><circle cx="${x}" cy="${BY - 6}" r="22" class="pg-hit"/>${arc}${head}${text(x, BY - r - 8, `${num(Math.abs(l.M))} kN·m ${ccw ? '↺' : '↻'}`, 'pg-tl')}</g>`;
  }
  // distributed
  const k = 34 / distScale(), xa = X(l.a), xb = X(l.b), top = BY - 7;
  const ha = 6 + Math.abs(l.w1) * k, hb = 6 + Math.abs(l.w2) * k;
  let g = `<polygon points="${xa},${top} ${xa},${top - ha} ${xb},${top - hb} ${xb},${top}" class="pg-dist"/>`;
  const n = Math.max(1, Math.round((xb - xa) / 22));
  for (let i = 0; i <= n; i++) {
    const x = xa + ((xb - xa) * i) / n, h = ha + ((hb - ha) * i) / n, w = l.w1 + ((l.w2 - l.w1) * i) / n;
    if (h > 8 && Math.abs(w) > 1e-9) g += w > 0 ? arrow(x, top - h, x, top, 'pg-load', 5) : arrow(x, top, x, top - h, 'pg-load', 5);
  }
  const lab = Math.abs(l.w1 - l.w2) < 1e-9 ? `${num(l.w1)} kN/m` : `${num(l.w1)} → ${num(l.w2)} kN/m`;
  g += text(Math.min(W - 40, Math.max(40, (xa + xb) / 2)), top - Math.max(ha, hb) - 5, lab, 'pg-tl');
  const handles = sc.sel === l.id ? `<g data-h="a"><circle cx="${xa}" cy="${top - ha}" r="15" class="pg-hit"/><circle cx="${xa}" cy="${top - ha}" r="5.5" class="pg-handle"/></g><g data-h="b"><circle cx="${xb}" cy="${top - hb}" r="15" class="pg-hit"/><circle cx="${xb}" cy="${top - hb}" r="5.5" class="pg-handle"/></g>` : '';
  return `<g data-k="${l.id}" class="${sel}"><rect x="${xa}" y="${top - Math.max(ha, hb)}" width="${Math.max(6, xb - xa)}" height="${Math.max(ha, hb)}" class="pg-hit"/>${g}${handles}</g>`;
}

function drawReactions(res) {
  if (res.status === 'mechanism') return '';
  let g = '';
  res.reactions.forEach((r) => {
    const x = X(r.x), lines = [];
    if (Math.abs(r.Ry) > 1e-9) { g += r.Ry > 0 ? arrow(x, BY + 66, x, BY + 36, 'pg-react') : arrow(x, BY + 36, x, BY + 66, 'pg-react'); lines.push(`Ry ${num(r.Ry)} kN`); }
    if (Math.abs(r.Rx) > 1e-9) { g += r.Rx > 0 ? arrow(x - 26, BY + 48, x - 8, BY + 48, 'pg-react', 6) : arrow(x + 26, BY + 48, x + 8, BY + 48, 'pg-react', 6); lines.push(`Rx ${num(r.Rx)} kN`); }
    if (r.type === 'fixed' && Math.abs(r.M) > 1e-9) lines.push(`M ${num(r.M)} kN·m`);
    lines.forEach((t, i) => (g += text(Math.min(W - 30, Math.max(30, x)), BY + 80 + 12 * i, t, 'pg-tr')));
  });
  return g;
}

function canvasSvg(res) {
  let s = `<svg viewBox="0 0 ${W} 232" class="pg-svg" id="pgCanvas" role="img" aria-label="הקורה עם הסמכים והעומסים">`;
  // length ruler
  const stepR = sc.L <= 8 ? 1 : sc.L <= 20 ? 2 : 5;
  const RY = BY + 122;
  s += `<line x1="${X0}" y1="${RY}" x2="${X1}" y2="${RY}" class="pg-ruler"/>`;
  for (let m = 0; m <= sc.L + 1e-9; m += stepR) s += `<line x1="${X(m)}" y1="${RY - 3}" x2="${X(m)}" y2="${RY + 3}" class="pg-ruler"/>`;
  s += text(X0, RY + 13, '0', 'pg-tm') + text(X1, RY + 13, `${num(sc.L)} m`, 'pg-tm');
  s += `<rect x="${X0}" y="${BY - 6}" width="${X1 - X0}" height="12" rx="2" class="pg-beam"/>`;
  s += sc.supports.map(drawSupport).join('') + drawReactions(res) + ['dist', 'moment', 'point'].map((t) => sc.loads.filter((l) => l.type === t).map(drawLoad).join('')).join('');
  return s + '</svg>';
}

function plot(points, key, scale, cls, unit, mul = 1) {
  const H = 96, mid = H / 2, amp = 36;
  const max = Math.max(1e-12, ...points.map((p) => Math.abs(p[key] * mul)));
  const y = (v) => mid - (v * mul * amp) / max;
  let path = `M${X(points[0].x)},${mid} ` + points.map((p) => `L${X(p.x).toFixed(2)},${y(p[key]).toFixed(2)}`).join(' ') + ` L${X(points[points.length - 1].x)},${mid} Z`;
  if (cls === 'pg-curve') path = 'M' + points.map((p) => `${X(p.x).toFixed(2)},${y(p[key]).toFixed(2)}`).join(' L');
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg pg-plot">`;
  sc.supports.forEach((q) => (s += `<line x1="${X(q.x)}" y1="4" x2="${X(q.x)}" y2="${H - 4}" class="pg-guide"/>`));
  s += `<line x1="${X0}" y1="${mid}" x2="${X1}" y2="${mid}" class="pg-axis"/><path d="${path}" class="${cls}"/>`;
  // label the largest positive and negative values
  const hi = points.reduce((m, p) => (p[key] > m[key] ? p : m), points[0]), lo = points.reduce((m, p) => (p[key] < m[key] ? p : m), points[0]);
  [hi, lo].forEach((p, i) => {
    const v = p[key] * mul; if (Math.abs(v) < max * 0.02 || (i === 1 && hi === lo)) return;
    const yy = y(p[key]), ty = v > 0 ? Math.max(11, yy - 4) : Math.min(H - 3, yy + 12);
    s += text(Math.min(W - 30, Math.max(30, X(p.x))), ty, `${num(v)} ${unit}`, 'pg-tv');
  });
  return s + '</svg>';
}

// ---------- panels ----------
function mechanismHint() {
  const r = sc.supports.reduce((n, s) => n + REACTION_COUNT[s.type], 0);
  if (!sc.supports.length) return 'אין סמכים. הוסף סמך נייח וסמך גלגלת, או ריתום.';
  if (r < 3) return `יש רק ${r} תגובות, וצריך לפחות 3: שתי משוואות כוחות ומשוואת מומנט.`;
  if (!sc.supports.some((s) => s.type !== 'roller')) return 'אין ריסון אופקי: גלגלות לבד לא מונעות החלקה. החלף אחת מהן לסמך נייח.';
  return 'יש מספיק תגובות, אבל הן מסודרות כך שהקורה יכולה לזוז או להסתובב (למשל שני סמכים באותה נקודה).';
}

function resultsHtml(res) {
  if (res.status === 'mechanism') {
    return `<div class="pg-status bad">⚠ מנגנון: המבנה לא יציב</div><p class="small">${esc(mechanismHint())}</p>`;
  }
  const { I } = section();
  const status = res.degree === 0
    ? '<div class="pg-status good">✓ מסוים סטטית: 3 תגובות, 3 משוואות</div>'
    : `<div class="pg-status warn">לא מסוים סטטית מדרגה ${res.degree}</div><p class="small muted">יש יותר תגובות ממשוואות שיווי המשקל. הפותר משתמש גם בגמישות הקורה (אלמנטים סופיים).</p>`;
  const reacts = res.reactions.map((r) => {
    const parts = [`Ry = ${num(r.Ry)} kN`];
    if (r.type !== 'roller') parts.push(`Rx = ${num(r.Rx)} kN`);
    if (r.type === 'fixed') parts.push(`M = ${num(r.M)} kN·m`);
    return `<li>${esc(SUP_NAME[r.type])} ב-${ltr(`x = ${num(r.x)} m`)}: ${parts.map(ltr).join(' · ')}</li>`;
  }).join('');
  const Mabs = Math.max(Math.abs(res.Mpos), Math.abs(res.Mneg));
  const sigma = bendingStress(Mabs, sc.h, I);
  const dm = res.dmax.v * 1000;
  const pts = res.diag;
  return `${status}
    <h3 class="pg-h">כוחות תגובה</h3><ul class="pg-list">${reacts}</ul>
    <div class="pg-max">
      <div><span>|V| מקסימלי</span><b>${ltr(`${num(Math.abs(res.Vmax.V))} kN`)}</b></div>
      <div><span>M חיובי מקסימלי</span><b>${ltr(`${num(res.Mpos)} kN·m`)}</b></div>
      <div><span>M שלילי מקסימלי</span><b>${ltr(`${num(res.Mneg)} kN·m`)}</b></div>
      <div><span>מאמץ כפיפה מקסימלי</span><b>${ltr(`${num(sigma)} MPa`)}</b></div>
      <div><span>שקיעה מקסימלית</span><b>${ltr(`${num(Math.abs(dm))} mm`)}</b></div>
      <div><span>מיקום השקיעה</span><b>${ltr(`x = ${num(res.dmax.x)} m`)}</b></div>
    </div>
    <h3 class="pg-h">כוח גזירה V ${ltr('[kN]')}</h3>${plot(pts, 'V', 1, 'pg-area-v', 'kN')}
    <h3 class="pg-h">מומנט כפיפה M ${ltr('[kN·m]')}</h3>${plot(pts, 'M', 1, 'pg-area-m', 'kN·m')}
    <h3 class="pg-h">קו הכפיפה ${ltr('[mm]')} <span class="muted small">(מוגדל לתצוגה)</span></h3>${plot(res.defl, 'v', 1, 'pg-curve', 'mm', 1000)}
    <p class="small muted">מוסכמה: כוח כלפי מעלה חיובי, מומנט נגד כיוון השעון חיובי. M חיובי = כפיפה "מחייכת" (sagging). V = סכום הכוחות כלפי מעלה משמאל לחתך.</p>`;
}

const field = (f, label, v, unit, stepv = 'any') => `<label><span>${esc(label)} ${unit ? ltr(`[${unit}]`) : ''}</span><input type="number" inputmode="decimal" step="${stepv}" data-f="${f}" value="${fix2(v)}"></label>`;
function editorHtml() {
  const e = sc.sel != null ? find(sc.sel) : null;
  if (!e) {
    const { I, EI } = section();
    return `<h3 class="pg-h">הקורה</h3><div class="pg-form">
      ${field('L', 'אורך', sc.L, 'm')}${field('E', 'מודול אלסטיות', sc.E, 'GPa')}
      ${field('b', 'רוחב החתך b', sc.b, 'mm')}${field('h', 'גובה החתך h', sc.h, 'mm')}</div>
      <p class="small muted" id="pgSec">חתך מלבני: ${ltr(`I = bh³/12 = ${num(I / 1e4)} cm⁴`)} · ${ltr(`EI = ${num(EI)} kN·m²`)}. פלדה 200, אלומיניום 70 GPa.</p>
      <p class="small muted">טיפ: לחץ על רכיב כדי לערוך אותו, וגרור אותו לאורך הקורה.</p>`;
  }
  const del = '<button class="btn pg-del" data-act="del">🗑 מחק</button>';
  const chips = (items, cur, act) => `<div class="chips">${items.map(([v, t]) => `<button class="chip" data-act="${act}" data-v="${v}" aria-pressed="${String(cur) === String(v)}">${t}</button>`).join('')}</div>`;
  if (e.type in REACTION_COUNT) {
    return `<h3 class="pg-h">${esc(SUP_NAME[e.type])}</h3>${chips(Object.entries(SUP_NAME), e.type, 'stype')}
      <div class="pg-form">${field('x', 'מיקום', e.x, 'm', step())}</div>
      <p class="small muted">${e.type === 'pin' ? 'סמך נייח: מונע תזוזה אופקית ואנכית, מאפשר סיבוב. 2 תגובות.' : e.type === 'roller' ? 'סמך גלגלת: מונע רק תזוזה אנכית. תגובה אחת.' : 'ריתום: מונע תזוזה וסיבוב. 3 תגובות (כולל מומנט).'}</p>${del}`;
  }
  if (e.type === 'point') {
    return `<h3 class="pg-h">כוח נקודתי</h3><div class="pg-form">${field('P', 'גודל', e.P, 'kN')}${field('x', 'מיקום', e.x, 'm', step())}${field('angle', 'זווית מציר x', e.angle, '°', 5)}</div>
      ${chips([[270, '↓'], [90, '↑'], [315, '↘'], [225, '↙'], [0, '→'], [180, '←']], e.angle, 'angle')}${del}`;
  }
  if (e.type === 'moment') {
    return `<h3 class="pg-h">מומנט מרוכז</h3><div class="pg-form">${field('Mabs', 'גודל', Math.abs(e.M), 'kN·m')}${field('x', 'מיקום', e.x, 'm', step())}</div>
      ${chips([[1, '↺ נגד השעון'], [-1, '↻ עם השעון']], e.M >= 0 ? 1 : -1, 'mdir')}${del}`;
  }
  return `<h3 class="pg-h">עומס מפורס</h3><div class="pg-form">${field('w1', 'עוצמה בהתחלה', e.w1, 'kN/m')}${field('w2', 'עוצמה בסוף', e.w2, 'kN/m')}${field('a', 'התחלה', e.a, 'm', step())}${field('b', 'סוף', e.b, 'm', step())}</div>
    ${chips([['u', 'אחיד'], ['t1', 'משולש ↗'], ['t2', 'משולש ↘']], Math.abs(e.w1 - e.w2) < 1e-9 ? 'u' : '', 'dshape')}
    <p class="small muted">גרור את העיגולים כדי לשנות התחלה וסוף. שקול: ${ltr(`${num(((e.w1 + e.w2) / 2) * Math.abs(e.b - e.a))} kN`)}.</p>${del}`;
}

// ---------- view ----------
const MODE_KEY = 'mh-pg-mode';
export function renderPlayground(page, ctx) {
  ctx.setTitle('מגרש משחקים');
  let mode = 'beam';
  try { const m = localStorage.getItem(MODE_KEY); mode = ['pulley', 'truss', 'fluid', 'vib', 'fbd'].includes(m) ? m : 'beam'; } catch (e) { /* ignore */ }
  page.innerHTML = `<div class="pg-modes"><button class="pg-mode" data-mode="beam">🏗️ קורות</button><button class="pg-mode" data-mode="pulley">🪢 גלגלות</button><button class="pg-mode" data-mode="truss">△ מסבכים</button><button class="pg-mode" data-mode="fluid">💧 נוזלים</button><button class="pg-mode" data-mode="vib">〰 רטט</button><button class="pg-mode" data-mode="fbd">✎ גוף חופשי</button></div><div id="pgBody"></div>`;
  let body = page.querySelector('#pgBody');
  const show = () => {
    page.querySelectorAll('.pg-mode').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    const fresh = body.cloneNode(false); body.replaceWith(fresh); body = fresh; // drop old listeners
    if (mode === 'pulley') renderPulleys(fresh, ctx); else if (mode === 'truss') renderTruss(fresh, ctx); else if (mode === 'fluid') renderFluid(fresh, ctx); else if (mode === 'vib') renderVib(fresh, ctx); else if (mode === 'fbd') renderFbd(fresh, ctx); else renderBeams(fresh, ctx);
  };
  page.querySelector('.pg-modes').onclick = (ev) => {
    const b = ev.target.closest('[data-mode]'); if (!b || b.dataset.mode === mode) return;
    mode = b.dataset.mode; try { localStorage.setItem(MODE_KEY, mode); } catch (e) { /* ignore */ }
    show();
  };
  show();
}

function renderBeams(view, { toast }) {
  load();
  view.innerHTML = `
    <div class="card pg-intro"><h2>🏗️ קורות ורתימות</h2><p class="small muted">בונים קורה, גוררים סמכים ועומסים, והתוצאות מתעדכנות מיד.</p>
      <div class="pg-templates">${TEMPLATES.map((t) => `<button class="chip" data-tpl="${t.id}">${esc(t.name)}</button>`).join('')}</div></div>
    <div class="card pg-stage"><div id="pgCanvasWrap"></div>
      <div class="pg-tools">
        <button class="pg-tool" data-add="pin"><b>△</b>סמך נייח</button>
        <button class="pg-tool" data-add="roller"><b>⊙</b>גלגלת</button>
        <button class="pg-tool" data-add="fixed"><b>▌</b>ריתום</button>
        <button class="pg-tool" data-add="point"><b>↓</b>כוח</button>
        <button class="pg-tool" data-add="dist"><b>⇊</b>עומס מפורס</button>
        <button class="pg-tool" data-add="moment"><b>↺</b>מומנט</button>
      </div></div>
    <div class="card" id="pgEdit"></div>
    <div class="card" id="pgResults"></div>`;
  const wrap = view.querySelector('#pgCanvasWrap'), edit = view.querySelector('#pgEdit'), out = view.querySelector('#pgResults');
  let raf = 0;
  const renderLive = () => { const res = solve(); wrap.innerHTML = canvasSvg(res); out.innerHTML = resultsHtml(res); };
  const renderAll = () => { renderLive(); edit.innerHTML = editorHtml(); };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; renderAll(); }); };
  renderAll();

  view.querySelector('.pg-templates').onclick = (ev) => {
    const b = ev.target.closest('[data-tpl]'); if (!b) return;
    const t = TEMPLATES.find((q) => q.id === b.dataset.tpl);
    Object.assign(sc, t.make(), { sel: null }); save(); renderAll();
  };
  view.querySelector('.pg-tools').onclick = (ev) => {
    const b = ev.target.closest('[data-add]'); if (!b) return;
    const k = b.dataset.add, L = sc.L, has = (x) => sc.supports.some((s) => Math.abs(s.x - x) < 1e-9);
    let e;
    if (k in REACTION_COUNT) e = S(k, !has(0) ? 0 : !has(L) ? L : snap(L / 2));
    else if (k === 'point') e = P(snap(L / 2), 10, 270);
    else if (k === 'moment') e = Mo(snap(L / 2), 10);
    else e = sc.loads.some((l) => l.type === 'dist') ? D(snap(L / 4), snap((3 * L) / 4), 5, 5) : D(0, L, 5, 5);
    (k in REACTION_COUNT ? sc.supports : sc.loads).push(e);
    sc.sel = e.id; save(); renderAll();
    if (!sessionStorageGet('pgHint')) { toast('גרור את הרכיב לאורך הקורה'); sessionStorageSet('pgHint'); }
  };

  // editor: typed values and chips
  edit.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!f) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    const e = sc.sel != null ? find(sc.sel) : null;
    if (!e) {
      if (f === 'L' && v > 0.1 && v <= 100) { sc.L = v; clampAll(); } else if (f !== 'L' && v > 0) sc[f] = v; else return;
    } else if (f === 'Mabs') e.M = (e.M >= 0 ? 1 : -1) * Math.abs(v);
    else if (['x', 'a', 'b'].includes(f)) e[f] = Math.min(sc.L, Math.max(0, v));
    else if (f === 'P') e.P = Math.abs(v);
    else e[f] = v;
    save(); renderLive();
    if (!e) { const n = document.createElement('div'); n.innerHTML = editorHtml(); edit.querySelector('#pgSec')?.replaceWith(n.querySelector('#pgSec')); }
  });
  edit.addEventListener('change', () => { if (sc.sel == null) return; edit.innerHTML = editorHtml(); });
  edit.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const e = find(sc.sel); if (!e) return;
    const a = b.dataset.act, v = b.dataset.v;
    if (a === 'del') { sc.supports = sc.supports.filter((q) => q !== e); sc.loads = sc.loads.filter((q) => q !== e); sc.sel = null; }
    else if (a === 'stype') e.type = v;
    else if (a === 'angle') e.angle = Number(v);
    else if (a === 'mdir') e.M = Number(v) * Math.abs(e.M);
    else if (a === 'dshape') { const w = Math.max(Math.abs(e.w1), Math.abs(e.w2)) || 5; [e.w1, e.w2] = v === 'u' ? [w, w] : v === 't1' ? [0, w] : [w, 0]; }
    save(); renderAll();
  });

  // canvas: tap to select, drag to move
  let drag = null;
  const toM = (ev) => {
    const svg = wrap.querySelector('svg'), pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse()); return ((p.x - X0) / (X1 - X0)) * sc.L;
  };
  wrap.addEventListener('pointerdown', (ev) => {
    const g = ev.target.closest('[data-k]');
    if (!g) { if (sc.sel != null) { sc.sel = null; save(); renderAll(); } return; }
    ev.preventDefault();
    const id = Number(g.dataset.k), e = find(id); if (!e) return;
    const h = ev.target.closest('[data-h]')?.dataset.h || '';
    drag = { id, h, x0: toM(ev), orig: { ...e }, pid: ev.pointerId };
    try { wrap.setPointerCapture(ev.pointerId); } catch (err) { /* ignore */ }
    if (sc.sel !== id) { sc.sel = id; renderAll(); }
  });
  wrap.addEventListener('pointermove', (ev) => {
    if (!drag || ev.pointerId !== drag.pid) return;
    const e = find(drag.id); if (!e) return;
    const dx = toM(ev) - drag.x0, o = drag.orig;
    if (e.type === 'dist') {
      if (drag.h === 'a') e.a = snap(o.a + dx);
      else if (drag.h === 'b') e.b = snap(o.b + dx);
      else { const len = o.b - o.a, a = Math.min(sc.L - len, Math.max(0, snap(o.a + dx))); e.a = fix2(a); e.b = fix2(a + len); }
    } else e.x = snap(o.x + dx);
    schedule();
  });
  const end = (ev) => {
    if (!drag || ev.pointerId !== drag.pid) return;
    const e = find(drag.id);
    if (e && e.type === 'dist' && e.a > e.b) [e.a, e.b, e.w1, e.w2] = [e.b, e.a, e.w2, e.w1];
    drag = null; save(); renderAll();
  };
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointercancel', end);
}

function clampAll() {
  sc.supports.forEach((s) => (s.x = Math.min(s.x, sc.L)));
  sc.loads.forEach((l) => { if (l.type === 'dist') { l.a = Math.min(l.a, sc.L); l.b = Math.min(l.b, sc.L); } else l.x = Math.min(l.x, sc.L); });
}
function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return '1'; } }
function sessionStorageSet(k) { try { sessionStorage.setItem(k, '1'); } catch (e) { /* ignore */ } }
