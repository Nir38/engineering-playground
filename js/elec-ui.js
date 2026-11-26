// elec-ui.js: small drawing helpers shared by the electricity modes of the playground
// (time plots with two axes, phasor arrows, sliders, number formatting).
import { esc } from './text.js';

export const ltr = (s) => `<span class="ltr">${esc(s)}</span>`;
export const COL = { v: '#3b82f6', i: '#f59e0b', p: '#16a34a', q: '#a855f7', s: '#ef4444', ph: ['#ef4444', '#eab308', '#3b82f6'] };
// engineering notation: 0.0025 A → 2.5 mA
export function si(v, unit, d = 3) {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v); if (a < 1e-12) return `0 ${unit}`;
  const P = [[1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n']];
  const [f, p] = P.find(([q]) => a >= q * 0.9995) || P[P.length - 1];
  return `${Number((v / f).toPrecision(d))} ${p}${unit}`;
}
export const num = (n, d = 1) => { if (!Number.isFinite(n)) return '—'; const r = Math.round(n * 10 ** d) / 10 ** d; return Object.is(r, -0) || r === 0 ? '0' : String(r); };
export const text = (x, y, s, col = '', anchor = 'middle', cls = '') => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" class="pg-t ${cls}" ${col ? `fill="${col}"` : ''}>${esc(s)}</text>`;
export function arrow(x1, y1, x2, y2, col, w = 2, head = 7) {
  const L = Math.hypot(x2 - x1, y2 - y1); if (L < 0.5) return '';
  head = Math.min(head, L * 0.6);
  const a = Math.atan2(y2 - y1, x2 - x1), h1 = [x2 - head * Math.cos(a - 0.42), y2 - head * Math.sin(a - 0.42)], h2 = [x2 - head * Math.cos(a + 0.42), y2 - head * Math.sin(a + 0.42)];
  return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${(x2 - 0.6 * head * Math.cos(a)).toFixed(1)}" y2="${(y2 - 0.6 * head * Math.sin(a)).toFixed(1)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/><polygon points="${x2.toFixed(1)},${y2.toFixed(1)} ${h1.map((v) => v.toFixed(1))} ${h2.map((v) => v.toFixed(1))}" fill="${col}"/>`;
}
// a slider row: f = state key, lim = [min, max], shown = HTML of the value
export const slider = (f, label, shown, lim, step, value) => `<label class="pg-range"><span>${label} <b>${shown}</b></span><input type="range" data-f="${f}" min="${lim[0]}" max="${lim[1]}" step="${step}" value="${value}" aria-label="${esc(label.replace(/<[^>]+>/g, ''))}"></label>`;
export const chips = (items, cur, act) => `<div class="chips">${items.map(([v, t]) => `<button class="chip" data-act="${act}" data-v="${v}" aria-pressed="${String(cur) === String(v)}">${esc(t)}</button>`).join('')}</div>`;
export const SAFETY = '<p class="small pg-safe">⚠ זו המחשה ללימוד. מתח הרשת (<span class="ltr">230 V</span>) מסוכן לחיים: עבודה במתקן חשמל אמיתי מותרת רק לחשמלאי מוסמך.</p>';

// time plot. xs: times; series: [{ ys, col, label, axis: 'l' | 'r', dash }]; units: { x, l, r }
export function plot({ xs, series, units = {}, W = 360, H = 170, cursor = null, marks = [], id = '', zero = true, sym = false, rzoom = 1 }) {
  const pl = 34, pr = series.some((s) => s.axis === 'r') ? 34 : 10, pt = 12, pb = 22, x0 = xs[0], x1 = xs[xs.length - 1] || 1;
  const X = (x) => pl + ((x - x0) / (x1 - x0 || 1)) * (W - pl - pr);
  const range = (ax) => {
    let lo = Infinity, hi = -Infinity;
    for (const s of series) if ((s.axis || 'l') === ax) for (const y of s.ys) if (Number.isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
    if (!Number.isFinite(lo)) return null;
    if (zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
    if (sym) { const m = Math.max(Math.abs(lo), Math.abs(hi)); lo = -m; hi = m; }
    if (hi - lo < 1e-12) { hi += 1; lo -= 1; }
    if (ax === 'r' && rzoom !== 1) { const m = (hi + lo) / 2; hi = m + (hi - m) * rzoom; lo = m + (lo - m) * rzoom; }
    const pad = (hi - lo) * 0.08; return [lo - pad, hi + pad, lo, hi];
  };
  const rg = { l: range('l'), r: range('r') };
  const Y = (ax, y) => { const [lo, hi] = rg[ax]; return pt + (1 - (y - lo) / (hi - lo)) * (H - pt - pb); };
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg pg-plot" ${id ? `id="${id}"` : ''} role="img" aria-label="גרף לפי הזמן">`;
  const axY = rg.l ? Y('l', 0) : H - pb;
  s += `<line x1="${pl}" y1="${pt}" x2="${pl}" y2="${H - pb}" class="pg-axis"/><line x1="${pl}" y1="${axY.toFixed(1)}" x2="${W - pr}" y2="${axY.toFixed(1)}" class="pg-axis"/>`;
  for (const ax of ['l', 'r']) {
    if (!rg[ax]) continue;
    const [, , lo, hi] = rg[ax], xx = ax === 'l' ? pl - 3 : W - 2, an = 'end', col = (series.find((q) => (q.axis || 'l') === ax) || {}).col;
    const lab = (v) => { const a = Math.abs(v); return a >= 100 ? num(v, 0) : a >= 1 ? num(v, 1) : String(Number(v.toPrecision(2))); };
    s += text(xx, Y(ax, hi) + 4, lab(hi), col, an, 'pg-tn') + (Math.abs(lo) > 1e-12 ? text(xx, Y(ax, lo) + 4, lab(lo), col, an, 'pg-tn') : '');
    if (units[ax]) s += text(ax === 'l' ? 4 : W - 4, 9, units[ax], col, ax === 'l' ? 'start' : 'end', 'pg-tn');
  }
  if (units.x) s += text(W - pr, H - 6, units.x, '', 'end', 'pg-tn') + text(pl, H - 6, num(x0, 3), '', 'middle', 'pg-tn') + text((pl + W - pr) / 2, H - 6, num((x0 + x1) / 2, 3), '', 'middle', 'pg-tn');
  for (const m of marks) { const x = X(m.x); if (x < pl || x > W - pr) continue; s += `<line x1="${x.toFixed(1)}" y1="${pt}" x2="${x.toFixed(1)}" y2="${H - pb}" class="pg-guide"/>` + (m.label ? (x > W - pr - 60 ? text(x - 3, H - pb - 4, m.label, m.col || '', 'end', 'pg-tn') : text(x + 3, H - pb - 4, m.label, m.col || '', 'start', 'pg-tn')) : ''); }
  for (const q of series) {
    const ax = q.axis || 'l'; let d = '';
    q.ys.forEach((y, k) => { if (!Number.isFinite(y)) return; d += `${d ? 'L' : 'M'}${X(xs[k]).toFixed(1)},${Y(ax, y).toFixed(1)}`; });
    s += `<path d="${d}" fill="none" stroke="${q.col}" stroke-width="${q.w || 2}" ${q.dash ? `stroke-dasharray="${q.dash}"` : ''} stroke-linejoin="round"/>`;
  }
  if (cursor !== null) { const x = X(cursor); s += `<line x1="${x.toFixed(1)}" y1="${pt}" x2="${x.toFixed(1)}" y2="${H - pb}" stroke="var(--text)" stroke-width="1" opacity=".5" class="pg-cur"/>`; }
  // legend
  let lx = pl + 6; for (const q of series) { if (!q.label) continue; s += `<line x1="${lx}" y1="${pt + 4}" x2="${lx + 12}" y2="${pt + 4}" stroke="${q.col}" stroke-width="2.4"/>` + text(lx + 15, pt + 8, q.label, q.col, 'start', 'pg-tn'); lx += 22 + 6.2 * q.label.length; }
  return s + '</svg>';
}

// phasor diagram: arrows from the center, turned by rot (degrees, counterclockwise). groups scale separately.
// items: [{ z: {re, im}, col, label, group, from: {re, im} (optional tail, same group units) }]
export function phasors(items, { W = 360, H = 200, rot = 0, R = 80, axes = true, id = '', gscale = {} } = {}) {
  const cx0 = W / 2, cy0 = H / 2, max = {};
  for (const it of items) { const g = it.group || 'a', m = Math.hypot(it.z.re + (it.from ? it.from.re : 0), it.z.im + (it.from ? it.from.im : 0)); max[g] = Math.max(max[g] || 0, m, Math.hypot(it.z.re, it.z.im)); }
  const t = (rot * Math.PI) / 180, c = Math.cos(t), sn = Math.sin(t);
  const P = (z, g) => { const k = (R * (gscale[g || 'a'] || 1)) / (max[g || 'a'] || 1), x = (z.re * c - z.im * sn) * k, y = (z.re * sn + z.im * c) * k; return [cx0 + x, cy0 - y]; };
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" ${id ? `id="${id}"` : ''} role="img" aria-label="דיאגרמת פאזורים">`;
  if (axes) s += `<line x1="${cx0 - R - 14}" y1="${cy0}" x2="${cx0 + R + 14}" y2="${cy0}" class="pg-ruler"/><line x1="${cx0}" y1="${cy0 - R - 10}" x2="${cx0}" y2="${cy0 + R + 10}" class="pg-ruler"/><circle cx="${cx0}" cy="${cy0}" r="${R}" fill="none" class="pg-ruler" stroke-dasharray="2 4"/>`;
  for (const it of items) {
    const [x1, y1] = it.from ? P(it.from, it.group) : [cx0, cy0], tip = it.from ? { re: it.from.re + it.z.re, im: it.from.im + it.z.im } : it.z, [x2, y2] = P(tip, it.group);
    s += arrow(x1, y1, x2, y2, it.col, it.w || 2.4, 8);
    if (it.label && it.mid) { const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = mx - cx0, dy = my - cy0, L = Math.hypot(dx, dy) || 1; s += text(mx + (dx / L) * 12, my + (dy / L) * 12 + 4, it.label, it.col, 'middle', 'pg-b'); }
    else if (it.label) { const dx = x2 - cx0, dy = y2 - cy0, L = Math.hypot(dx, dy) || 1; s += text(Math.min(W - 14, Math.max(14, x2 + (dx / L) * 12)), Math.min(H - 4, Math.max(10, y2 + (dy / L) * 12 + 4)), it.label, it.col, 'middle', 'pg-b'); }
  }
  return s + '</svg>';
}

// the home stage: every screen carries this note (wording from the plan in תוצרים/פרומפט מגרש החשמל.md)
export const HOME_SAFETY = '<p class="small pg-safe">⚠ זו המחשה ללימוד. עבודה בלוח חשמל אמיתי מותרת רק לחשמלאי מוסמך.</p>';
// a wire in its color: L brown, N blue, PE green with yellow stripes (L2 black, L3 grey)
export function wire(d, kind, w = 3, extra = '') {
  const col = { L: '#8b5a2b', N: '#2563eb', L2: '#111827', L3: '#9ca3af' }[kind];
  if (kind === 'PE') return `<path d="${d}" fill="none" stroke="#16a34a" stroke-width="${w}" stroke-linecap="round" ${extra}/><path d="${d}" fill="none" stroke="#facc15" stroke-width="${w}" stroke-dasharray="5 5" ${extra}/>`;
  return `<path d="${d}" fill="none" stroke="${col || kind}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
}

// a link to another playground mode (handled in playground.js)
export const go = (mode, label) => `<button class="pg-go" data-goto="${mode}">${label}</button>`;
