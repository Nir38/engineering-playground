// playground-truss.js: the playground's truss stage. Build on a 0.5 m grid with tools,
// see member forces live. Solver: js/truss.js (checked in tests/truss-cases.mjs).
import { solveTruss, roundBarCheck, SUP_REACTIONS } from './truss.js';
import { esc } from './text.js';

const KEY = 'mh-pg-truss-v1';
const W = 360, H = 262, X0 = 24, S = 26, YB = 210, WX = 12, WY = 7; // world 0..12 m × 0..7 m
const px = (x) => X0 + x * S, py = (y) => YB - y * S;
const TOOLS = [['select', '✋', 'בחירה'], ['joint', '●', 'צומת'], ['member', '╱', 'מוט'], ['pin', '△', 'סמך נייח'], ['roller', '⊙', 'גלגלת'], ['force', '↓', 'כוח'], ['del', '🗑', 'מחיקה']];
const HINT = {
  select: 'לחץ על צומת, מוט או כוח כדי לערוך. גרור צומת כדי להזיז אותו.',
  joint: 'לחץ על מקום ריק ברשת כדי להוסיף צומת.',
  member: 'לחץ צומת ואז צומת נוסף (או מקום ריק) כדי לחבר מוט. אפשר להמשיך ברצף. לחיצה שוב על אותו צומת מסיימת.',
  pin: 'לחץ על צומת כדי לשים או להוריד סמך נייח (2 תגובות).',
  roller: 'לחץ על צומת כדי לשים או להוריד גלגלת (תגובה אנכית אחת).',
  force: 'לחץ על צומת כדי להוסיף כוח (10 kN כלפי מטה). לחץ על הכוח כדי לשנות.',
  del: 'לחץ על צומת, מוט או כוח כדי למחוק.',
};

let uid = 1;
const Jn = (x, y, sup = null) => ({ id: uid++, x, y, sup });
function build(pts, pairs, sups, loads) {
  const js = pts.map(([x, y], i) => Jn(x, y, sups[i] || null));
  return { joints: js, members: pairs.map(([a, b]) => ({ id: uid++, a: js[a].id, b: js[b].id })), loads: loads.map(([i, P]) => ({ id: uid++, j: js[i].id, P, angle: 270 })) };
}
const TEMPLATES = [
  { id: 'pratt', name: 'Pratt', make: () => build([[1, 1], [3.5, 1], [6, 1], [8.5, 1], [11, 1], [3.5, 4], [6, 4], [8.5, 4]],
    [[0, 1], [1, 2], [2, 3], [3, 4], [5, 6], [6, 7], [0, 5], [7, 4], [1, 5], [2, 6], [3, 7], [5, 2], [7, 2]], { 0: 'pin', 4: 'roller' }, [[1, 10], [2, 10], [3, 10]]) },
  { id: 'howe', name: 'Howe', make: () => build([[1, 1], [3.5, 1], [6, 1], [8.5, 1], [11, 1], [3.5, 4], [6, 4], [8.5, 4]],
    [[0, 1], [1, 2], [2, 3], [3, 4], [5, 6], [6, 7], [0, 5], [7, 4], [1, 5], [2, 6], [3, 7], [1, 6], [3, 6]], { 0: 'pin', 4: 'roller' }, [[1, 10], [2, 10], [3, 10]]) },
  { id: 'warren', name: 'Warren', make: () => build([[1, 1], [4, 1], [7, 1], [10, 1], [2.5, 4], [5.5, 4], [8.5, 4]],
    [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [0, 4], [4, 1], [1, 5], [5, 2], [2, 6], [6, 3]], { 0: 'pin', 3: 'roller' }, [[1, 10], [2, 10]]) },
  { id: 'tri', name: 'משולש', make: () => build([[2, 1], [10, 1], [6, 4.5]], [[0, 2], [2, 1], [0, 1]], { 0: 'pin', 1: 'roller' }, [[2, 20]]) },
  { id: 'cant', name: 'זיז מקיר', make: () => build([[0.5, 1.5], [0.5, 5.5], [4.5, 4.5], [4.5, 1.5], [9, 3]], [[0, 3], [3, 4], [1, 2], [2, 4], [2, 3], [0, 2]], { 0: 'pin', 1: 'pin' }, [[4, 15]]) },
  { id: 'empty', name: 'ריק', make: () => ({ joints: [], members: [], loads: [] }) },
];
const defaults = () => ({ ...TEMPLATES[0].make(), tool: 'select', sel: null, pend: null, labels: true, d: 60, E: 200, fy: 235 });
let st = null;
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && Array.isArray(s.joints) && Array.isArray(s.members)) st = { ...defaults(), ...s, pend: null }; } catch (e) { /* ignore */ }
  if (!st) st = defaults();
  uid = 1 + Math.max(0, ...st.joints.map((q) => q.id), ...st.members.map((q) => q.id), ...st.loads.map((q) => q.id));
}
const save = () => { try { const { pend, ...rest } = st; localStorage.setItem(KEY, JSON.stringify(rest)); } catch (e) { /* ignore */ } };

const num = (n) => {
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n); if (a < 1e-7) return '0';
  const s = a >= 1000 ? n.toFixed(0) : a >= 100 ? n.toFixed(1) : a >= 10 ? n.toFixed(2) : n.toFixed(3);
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
};
const ltr = (s) => `<span class="ltr">${esc(s)}</span>`;
const text = (x, y, s, cls = '', anchor = 'middle') => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" class="pg-t ${cls}">${esc(s)}</text>`;
function arrow(x1, y1, x2, y2, cls, head = 7) {
  const a = Math.atan2(y2 - y1, x2 - x1), h1 = [x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45)], h2 = [x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45)];
  return `<line x1="${x1}" y1="${y1}" x2="${x2 - 0.6 * head * Math.cos(a)}" y2="${y2 - 0.6 * head * Math.sin(a)}" class="${cls}"/><polygon points="${x2},${y2} ${h1} ${h2}" class="${cls} pg-head"/>`;
}
const field = (f, label, v, unit, extra = '') => `<label><span>${esc(label)} ${unit ? ltr(`[${unit}]`) : ''}</span><input type="number" inputmode="decimal" step="any" data-f="${f}" value="${Math.round(v * 1000) / 1000}" ${extra}></label>`;
const chips = (items, cur, act) => `<div class="chips">${items.map(([v, t]) => `<button class="chip" data-act="${act}" data-v="${v}" aria-pressed="${String(cur) === String(v)}">${t}</button>`).join('')}</div>`;
const jointName = (id) => { const i = st.joints.findIndex((q) => q.id === id); if (i < 0) return '?'; return i < 26 ? String.fromCharCode(65 + i) : `J${i + 1}`; };
const memName = (q) => `${jointName(q.a)}${jointName(q.b)}`;
const J = (id) => st.joints.find((q) => q.id === id);
// a load is drawn pushing into its joint, or pulling away from it when members sit on the push side
function loadSeg(l) {
  const j = J(l.j), t = (l.angle * Math.PI) / 180, d = [Math.cos(t), -Math.sin(t)], x = px(j.x), y = py(j.y);
  const blocked = st.members.some((m) => {
    if (m.a !== j.id && m.b !== j.id) return false;
    const o = J(m.a === j.id ? m.b : m.a); if (!o) return false;
    const u = [px(o.x) - x, py(o.y) - y], L = Math.hypot(...u) || 1;
    return (-d[0] * u[0] - d[1] * u[1]) / L > 0.35;
  });
  return blocked ? [x + d[0] * 9, y + d[1] * 9, x + d[0] * 44, y + d[1] * 44] : [x - d[0] * 40, y - d[1] * 40, x - d[0] * 7, y - d[1] * 7];
}

function solve() { return solveTruss({ joints: st.joints, members: st.members, loads: st.loads }); }

function svg(res) {
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" id="pgTruss" role="img" aria-label="מסבך עם צמתים, מוטות, סמכים וכוחות">`;
  for (let x = 0; x <= WX; x++) for (let y = 0; y <= WY; y++) s += `<circle cx="${px(x)}" cy="${py(y)}" r="${x % 2 || y % 2 ? 1 : 1.6}" class="pg-dot"/>`;
  s += `<line x1="${px(0)}" y1="${YB}" x2="${px(WX)}" y2="${YB}" class="pg-ruler"/>`;
  const ok = res.status !== 'mechanism';
  const F = ok ? new Map(res.forces.map((f) => [f.id, f.N])) : new Map();
  const Nmax = Math.max(1e-9, ...[...F.values()].map(Math.abs));
  st.members.forEach((q) => {
    const A = J(q.a), B = J(q.b); if (!A || !B) return;
    const N = F.get(q.id), cls = !ok ? 'pg-mem' : Math.abs(N) < 1e-7 ? 'pg-zero' : N > 0 ? 'pg-ten' : 'pg-com';
    const w = !ok || Math.abs(N) < 1e-7 ? 2.4 : 2.4 + (4 * Math.abs(N)) / Nmax;
    s += `<line x1="${px(A.x)}" y1="${py(A.y)}" x2="${px(B.x)}" y2="${py(B.y)}" class="pg-bar ${cls} ${st.sel === q.id ? 'pg-selbar' : ''}" stroke-width="${w.toFixed(2)}"/>`;
  });
  if (ok && st.labels) st.members.forEach((q) => {
    const A = J(q.a), B = J(q.b), N = F.get(q.id); if (!A || !B || N == null) return;
    s += text((px(A.x) + px(B.x)) / 2, (py(A.y) + py(B.y)) / 2 + 3.5, num(Math.abs(N)), Math.abs(N) < 1e-7 ? 'pg-tz' : N > 0 ? 'pg-tt' : 'pg-tc');
  });
  // supports
  st.joints.forEach((j) => {
    const x = px(j.x), y = py(j.y);
    if (j.sup === 'pin') s += `<polygon points="${x},${y + 4} ${x - 9},${y + 19} ${x + 9},${y + 19}" class="pg-sup"/><line x1="${x - 13}" y1="${y + 19}" x2="${x + 13}" y2="${y + 19}" class="pg-ground"/>`;
    if (j.sup === 'roller') s += `<polygon points="${x},${y + 4} ${x - 8},${y + 15} ${x + 8},${y + 15}" class="pg-sup"/><circle cx="${x - 4}" cy="${y + 18}" r="2.6" class="pg-sup"/><circle cx="${x + 4}" cy="${y + 18}" r="2.6" class="pg-sup"/><line x1="${x - 13}" y1="${y + 21}" x2="${x + 13}" y2="${y + 21}" class="pg-ground"/>`;
  });
  // reactions
  if (ok) res.reactions.forEach((r) => {
    const j = J(r.id), x = px(j.x), y = py(j.y) + 24, lines = [];
    if (Math.abs(r.Ry) > 1e-9) { s += r.Ry > 0 ? arrow(x, y + 26, x, y + 2, 'pg-react', 6) : arrow(x, y + 2, x, y + 26, 'pg-react', 6); lines.push(`Ry ${num(r.Ry)}`); }
    if (Math.abs(r.Rx) > 1e-9) { s += r.Rx > 0 ? arrow(x - 30, y - 12, x - 12, y - 12, 'pg-react', 6) : arrow(x + 30, y - 12, x + 12, y - 12, 'pg-react', 6); lines.push(`Rx ${num(r.Rx)}`); }
    lines.forEach((t, i) => (s += text(Math.min(W - 26, Math.max(26, x + (x > W / 2 ? -8 : 8))), Math.min(H - 4 - 11 * (lines.length - 1 - i), y + 22 + 11 * i), t, 'pg-tr', x > W / 2 ? 'end' : 'start')));
  });
  // joints
  st.joints.forEach((j) => {
    const x = px(j.x), y = py(j.y), sel = st.sel === j.id, pend = st.pend === j.id;
    s += `<circle cx="${x}" cy="${y}" r="${sel || pend ? 7.5 : 5.2}" class="pg-joint ${sel ? 'pg-jsel' : ''} ${pend ? 'pg-jpend' : ''}"/>`;
    s += text(x - 8, y - 7, jointName(j.id), 'pg-tn', 'end');
  });
  // loads
  st.loads.forEach((l) => {
    const j = J(l.j); if (!j) return;
    const [x1, y1, x2, y2] = loadSeg(l), far = Math.hypot(x1 - px(j.x), y1 - py(j.y)) > Math.hypot(x2 - px(j.x), y2 - py(j.y)) ? [x1, y1] : [x2, y2];
    s += `<g class="${st.sel === l.id ? 'pg-sel' : ''}">${arrow(x1, y1, x2, y2, 'pg-load')}${text(Math.min(W - 24, Math.max(24, far[0] + (far[0] >= px(j.x) ? 4 : -4))), Math.min(H - 4, far[1] + (far[1] < py(j.y) ? -5 : 13)), `${num(l.P)} kN`, 'pg-tl')}</g>`;
  });
  return s + '</svg>';
}

function mechanismHint(res) {
  const { j, m, r, loose } = res;
  if (!j) return 'אין צמתים. בחר תבנית או בנה עם הכלים.';
  if (loose.length) return `יש צמתים שלא מחוברים לאף מוט: ${loose.map(jointName).join(', ')}.`;
  if (!st.joints.some((q) => q.sup)) return 'אין סמכים. הוסף סמך נייח וגלגלת.';
  if (!st.joints.some((q) => q.sup === 'pin')) return 'אין ריסון אופקי: גלגלות לבד לא מונעות החלקה. הוסף סמך נייח.';
  if (m + r < 2 * j) return `${ltr(`m + r = ${m} + ${r} = ${m + r}`)}, אבל צריך לפחות ${ltr(`2j = ${2 * j}`)}. חסרים ${2 * j - m - r} מוטות או תגובות.`;
  return 'יש מספיק מוטות ותגובות, אבל הסידור שלהם מאפשר תזוזה: חסר משולש באחד הפאנלים, או ששלושה צמתים על קו אחד.';
}
function results(res) {
  const cnt = `${ltr(`m + r = ${res.m} + ${res.r} = ${res.m + res.r}`)} מול ${ltr(`2j = ${2 * res.j}`)}`;
  if (res.status === 'mechanism') return `<div class="pg-status bad">⚠ מנגנון: המסבך לא יציב</div><p class="small">${mechanismHint(res)}</p><p class="small muted">${cnt}</p>`;
  const status = res.degree === 0
    ? `<div class="pg-status good">✓ מסוים סטטית</div><p class="small muted">${cnt}</p>`
    : `<div class="pg-status warn">לא מסוים סטטית מדרגה ${res.degree}</div><p class="small muted">${cnt}. הכוחות תלויים בקשיחות המוטות: הפותר מניח EA שווה לכולם.</p>`;
  const rows = res.forces.map((f) => ({ f, q: st.members.find((m) => m.id === f.id), c: roundBarCheck(f.N, f.L, st.d, st.E, st.fy) }));
  const ten = rows.filter((r) => r.f.N > 1e-7).sort((a, b) => b.f.N - a.f.N)[0];
  const com = rows.filter((r) => r.f.N < -1e-7).sort((a, b) => a.f.N - b.f.N)[0];
  const crit = rows.slice().sort((a, b) => b.c.util - a.c.util)[0];
  const zeros = rows.filter((r) => Math.abs(r.f.N) < 1e-7).map((r) => memName(r.q));
  const reacts = res.reactions.map((r) => `<li>${esc(jointName(r.id))} (${r.sup === 'pin' ? 'סמך נייח' : 'גלגלת'}): ${ltr(`Ry = ${num(r.Ry)} kN`)}${r.sup === 'pin' ? ` · ${ltr(`Rx = ${num(r.Rx)} kN`)}` : ''}</li>`).join('');
  const table = rows.map(({ f, q, c }) => {
    const kind = Math.abs(f.N) < 1e-7 ? '<span class="pg-kz">אפס</span>' : f.N > 0 ? '<span class="pg-kt">מתיחה</span>' : '<span class="pg-kc">לחיצה</span>';
    return `<tr data-row="${q.id}" class="${st.sel === q.id ? 'pg-rowsel' : ''}"><td>${esc(memName(q))}</td><td>${ltr(num(f.L))}</td><td>${ltr(num(Math.abs(f.N)))}</td><td>${kind}</td><td class="${c.util > 1 ? 'pg-over' : ''}">${ltr(`${num(100 * c.util)}%`)}</td></tr>`;
  }).join('');
  return `${status}
    <h3 class="pg-h">כוחות תגובה</h3><ul class="pg-list">${reacts}</ul>
    <div class="pg-max">
      <div><span>מתיחה מרבית</span><b>${ten ? `${ltr(`${num(ten.f.N)} kN`)} <small class="muted">${esc(memName(ten.q))}</small>` : '—'}</b></div>
      <div><span>לחיצה מרבית</span><b>${com ? `${ltr(`${num(-com.f.N)} kN`)} <small class="muted">${esc(memName(com.q))}</small>` : '—'}</b></div>
      <div><span>המוט הקריטי</span><b>${crit ? `${esc(memName(crit.q))} ${ltr(`${num(100 * crit.c.util)}%`)}` : '—'}</b></div>
      <div><span>מוטות אפס</span><b>${zeros.length ? esc(zeros.join(', ')) : 'אין'}</b></div>
    </div>
    ${crit && crit.c.util > 1 ? `<p class="small" style="color:var(--bad)">⚠ ${esc(memName(crit.q))} עובר את הגבול (${crit.c.mode === 'buckling' ? 'קריסת Euler' : 'כניעה'}). הגדל את הקוטר d.</p>` : ''}
    <h3 class="pg-h">טבלת מוטות</h3>
    <table class="pg-table"><thead><tr><th>מוט</th><th>${ltr('L [m]')}</th><th>${ltr('|N| [kN]')}</th><th>סוג</th><th>ניצול</th></tr></thead><tbody>${table}</tbody></table>
    <p class="small muted">כחול = מתיחה, אדום = לחיצה, אפור מקווקו = מוט אפס. ניצול: מוט עגול מלא בקוטר ${ltr(`${num(st.d)} mm`)}, הגדול מבין ${ltr('σ/σy')} ו-${ltr('|N|/Pcr')} (קריסת Euler, קצוות מפרקיים, ${ltr('K = 1')}). בלי מקדם ביטחון.</p>`;
}

function editor(res) {
  const sel = st.sel;
  const j = st.joints.find((q) => q.id === sel), m = st.members.find((q) => q.id === sel), l = st.loads.find((q) => q.id === sel);
  const del = '<button class="btn pg-del" data-act="del">🗑 מחק</button>';
  if (j) return `<h3 class="pg-h">צומת ${esc(jointName(j.id))}</h3><div class="pg-form">${field('x', 'x', j.x, 'm', 'step="0.5"')}${field('y', 'y', j.y, 'm', 'step="0.5"')}</div>
    ${chips([['', 'בלי סמך'], ['pin', 'סמך נייח'], ['roller', 'גלגלת']], j.sup || '', 'sup')}${del}`;
  if (l) return `<h3 class="pg-h">כוח בצומת ${esc(jointName(l.j))}</h3><div class="pg-form">${field('P', 'גודל', l.P, 'kN')}${field('angle', 'זווית מציר x', l.angle, '°', 'step="5"')}</div>
    ${chips([[270, '↓'], [90, '↑'], [315, '↘'], [225, '↙'], [0, '→'], [180, '←']], l.angle, 'angle')}${del}`;
  if (m) {
    const f = res.status !== 'mechanism' ? res.forces.find((q) => q.id === m.id) : null;
    const A = J(m.a), B = J(m.b), L = Math.hypot(B.x - A.x, B.y - A.y);
    const c = f ? roundBarCheck(f.N, f.L, st.d, st.E, st.fy) : null;
    return `<h3 class="pg-h">מוט ${esc(memName(m))}</h3>
      <div class="pg-max"><div><span>אורך</span><b>${ltr(`${num(L)} m`)}</b></div><div><span>כוח</span><b>${f ? `${ltr(`${num(Math.abs(f.N))} kN`)} ${Math.abs(f.N) < 1e-7 ? 'אפס' : f.N > 0 ? 'מתיחה' : 'לחיצה'}` : '—'}</b></div>
      ${c ? `<div><span>מאמץ</span><b>${ltr(`${num(c.sigma)} MPa`)}</b></div><div><span>עומס קריסה Pcr</span><b>${ltr(`${num(c.Pcr)} kN`)}</b></div>` : ''}</div>${del}`;
  }
  return `<h3 class="pg-h">חומר ומוטות</h3><div class="pg-form">${field('d', 'קוטר מוט עגול d', st.d, 'mm')}${field('E', 'מודול E', st.E, 'GPa')}${field('fy', 'מאמץ כניעה σy', st.fy, 'MPa')}</div>
    <p class="small muted">S235: ${ltr('σy = 235 MPa')}. משנים את d ורואים איך הניצול משתנה.</p>
    ${chips([['1', 'הצג כוחות על המוטות'], ['0', 'הסתר']], st.labels ? '1' : '0', 'labels')}`;
}

export function renderTruss(root, { toast }) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>△ מסבכים</h2><p class="small muted">בונים מסבך על רשת, ורואים מיד מתיחה ולחיצה בכל מוט.</p>
      <div class="pg-templates">${TEMPLATES.map((t) => `<button class="chip" data-tpl="${t.id}">${esc(t.name)}</button>`).join('')}</div></div>
    <div class="card pg-stage"><div id="pgTrussCanvas"></div>
      <div class="pg-tools pg-tools7">${TOOLS.map(([id, ic, name]) => `<button class="pg-tool" data-tool="${id}" aria-pressed="${st.tool === id}"><b>${ic}</b>${name}</button>`).join('')}</div>
      <p class="small muted pg-hint" id="pgTrussHint"></p></div>
    <div class="card" id="pgTrussEdit"></div>
    <div class="card" id="pgTrussRes"></div>`;
  const cv = root.querySelector('#pgTrussCanvas'), ed = root.querySelector('#pgTrussEdit'), out = root.querySelector('#pgTrussRes'), hint = root.querySelector('#pgTrussHint');
  let res = solve();
  const live = () => { res = solve(); cv.innerHTML = svg(res); out.innerHTML = results(res); };
  const all = () => {
    live(); ed.innerHTML = editor(res); hint.textContent = HINT[st.tool];
    root.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === st.tool)));
  };
  all();

  root.addEventListener('click', (ev) => {
    const tp = ev.target.closest('[data-tpl]');
    if (tp) { Object.assign(st, TEMPLATES.find((q) => q.id === tp.dataset.tpl).make(), { sel: null, pend: null }); save(); all(); return; }
    const tl = ev.target.closest('[data-tool]');
    if (tl) { st.tool = tl.dataset.tool; st.pend = null; save(); all(); return; }
    const row = ev.target.closest('[data-row]');
    if (row) { st.sel = Number(row.dataset.row); all(); return; }
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act, v = b.dataset.v;
    if (a === 'labels') st.labels = v === '1';
    else if (a === 'del') removeSel();
    else if (a === 'sup') { const j = J(st.sel); if (j) j.sup = v || null; }
    else if (a === 'angle') { const l = st.loads.find((q) => q.id === st.sel); if (l) l.angle = Number(v); }
    else return;
    save(); all();
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!f) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    const j = J(st.sel), l = st.loads.find((q) => q.id === st.sel);
    if (j && (f === 'x' || f === 'y')) { const nv = Math.min(f === 'x' ? WX : WY, Math.max(0, Math.round(v * 2) / 2)); if (!occupied(f === 'x' ? nv : j.x, f === 'y' ? nv : j.y, j.id)) j[f] = nv; }
    else if (l && f === 'P') { if (v <= 0) return; l.P = v; }
    else if (l && f === 'angle') l.angle = v;
    else if (['d', 'E', 'fy'].includes(f)) { if (v <= 0) return; st[f] = v; }
    else return;
    save(); live();
  });
  ed.addEventListener('change', () => { ed.innerHTML = editor(res); });

  function removeSel() {
    const id = st.sel;
    if (J(id)) { st.joints = st.joints.filter((q) => q.id !== id); st.members = st.members.filter((q) => q.a !== id && q.b !== id); st.loads = st.loads.filter((q) => q.j !== id); }
    st.members = st.members.filter((q) => q.id !== id); st.loads = st.loads.filter((q) => q.id !== id);
    st.sel = null;
  }
  function occupied(x, y, except) { return st.joints.some((q) => q.id !== except && Math.abs(q.x - x) < 1e-9 && Math.abs(q.y - y) < 1e-9); }
  const toWorld = (ev) => { const sv = cv.querySelector('svg'), p = sv.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(sv.getScreenCTM().inverse()); return { X: q.x, Y: q.y }; };
  const snap = ({ X, Y }) => ({ x: Math.min(WX, Math.max(0, Math.round(((X - X0) / S) * 2) / 2)), y: Math.min(WY, Math.max(0, Math.round(((YB - Y) / S) * 2) / 2)) });
  const segDist = (X, Y, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((X - x1) * dx + (Y - y1) * dy) / L2)); return Math.hypot(X - x1 - t * dx, Y - y1 - t * dy); };
  function hit({ X, Y }) {
    let best = null, bd = 15;
    st.joints.forEach((j) => { const d = Math.hypot(px(j.x) - X, py(j.y) - Y); if (d < bd) { bd = d; best = { kind: 'joint', id: j.id }; } });
    if (best) return best;
    bd = 10;
    st.loads.forEach((l) => { const j = J(l.j); if (!j) return; const [x1, y1, x2, y2] = loadSeg(l), d = segDist(X, Y, x1, y1, x2, y2); if (d < bd) { bd = d; best = { kind: 'load', id: l.id }; } });
    if (best) return best;
    bd = 9;
    st.members.forEach((m) => { const A = J(m.a), B = J(m.b); if (!A || !B) return; const d = segDist(X, Y, px(A.x), py(A.y), px(B.x), py(B.y)); if (d < bd) { bd = d; best = { kind: 'member', id: m.id }; } });
    return best;
  }
  const jointAt = (pt) => { const s = snap(pt); const ex = st.joints.find((q) => Math.abs(q.x - s.x) < 1e-9 && Math.abs(q.y - s.y) < 1e-9); if (ex) return ex; const nj = Jn(s.x, s.y); st.joints.push(nj); return nj; };

  let drag = null;
  cv.addEventListener('pointerdown', (ev) => {
    if (!cv.querySelector('svg')) return;
    const pt = toWorld(ev), h = hit(pt), tool = st.tool;
    ev.preventDefault();
    if (tool === 'select') {
      st.sel = h ? h.id : null;
      if (h && h.kind === 'joint') { drag = { id: h.id, pid: ev.pointerId }; try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ } }
    } else if (tool === 'joint') {
      st.sel = h && h.kind === 'joint' ? h.id : jointAt(pt).id;
    } else if (tool === 'member') {
      const target = h && h.kind === 'joint' ? J(h.id) : jointAt(pt);
      if (st.pend == null) st.pend = target.id;
      else if (target.id === st.pend) st.pend = null;
      else {
        const a = st.pend, b = target.id;
        if (!st.members.some((m) => (m.a === a && m.b === b) || (m.a === b && m.b === a))) st.members.push({ id: uid++, a, b });
        st.pend = b;
      }
    } else if (tool === 'pin' || tool === 'roller') {
      if (h && h.kind === 'joint') { const j = J(h.id); j.sup = j.sup === tool ? null : tool; st.sel = j.id; }
    } else if (tool === 'force') {
      if (h && h.kind === 'load') st.sel = h.id;
      else if (h && h.kind === 'joint') { const l = { id: uid++, j: h.id, P: 10, angle: 270 }; st.loads.push(l); st.sel = l.id; }
    } else if (tool === 'del') {
      if (h) { st.sel = h.id; removeSel(); }
    }
    save(); all();
  });
  cv.addEventListener('pointermove', (ev) => {
    if (!drag || ev.pointerId !== drag.pid) return;
    const j = J(drag.id); if (!j) return;
    const s = snap(toWorld(ev));
    if ((s.x !== j.x || s.y !== j.y) && !occupied(s.x, s.y, j.id)) { j.x = s.x; j.y = s.y; live(); }
  });
  const end = (ev) => { if (!drag || ev.pointerId !== drag.pid) return; drag = null; save(); all(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  if (!sessionGet('pgTrussHint')) { toast('בחר כלי למטה, ולחץ על הרשת'); sessionSet('pgTrussHint'); }
}
function sessionGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return '1'; } }
function sessionSet(k) { try { sessionStorage.setItem(k, '1'); } catch (e) { /* ignore */ } }
export { SUP_REACTIONS };
