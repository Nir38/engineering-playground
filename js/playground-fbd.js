// playground-fbd.js: free-body diagram practice. Pick a force type, tap where it acts, drag the
// arrow head to aim it, then "check". Scenarios, grading and solutions: js/fbd.js.
import { SCENARIOS, TYPES, grade, answerKey } from './fbd.js';
import { esc, rich } from './text.js';

const KEY = 'mh-pg-fbd-v1';
const W = 360, H = 250, AL = 46;
const IDS = Object.keys(SCENARIOS);
let st = null, uid = 1;
function fresh(sid) { const S = SCENARIOS[sid]; return { sid, params: S.rand(), forces: [], checked: false, showSol: false, sel: null, tool: 'W' }; }
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && SCENARIOS[s.sid] && Array.isArray(s.forces)) st = s; } catch (e) { /* ignore */ }
  if (!st) st = fresh('incline');
  uid = 1 + Math.max(0, ...st.forces.map((q) => q.id));
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
const scene = () => SCENARIOS[st.sid].make(st.params);

const num = (n) => {
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n); if (a < 1e-9) return '0';
  const s = a >= 1000 ? n.toFixed(0) : a >= 100 ? n.toFixed(1) : a >= 10 ? n.toFixed(2) : n.toFixed(3);
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
};
const ltr = (s) => `<span class="ltr">${esc(s)}</span>`;
const text = (x, y, s, cls = '', anchor = 'middle') => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" class="pg-t ${cls}">${esc(s)}</text>`;
const dirv = (a) => [Math.cos((a * Math.PI) / 180), -Math.sin((a * Math.PI) / 180)];
function arrow(x1, y1, x2, y2, cls, head = 8) {
  const a = Math.atan2(y2 - y1, x2 - x1), h1 = [x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45)], h2 = [x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45)];
  return `<line x1="${x1}" y1="${y1}" x2="${x2 - 0.6 * head * Math.cos(a)}" y2="${y2 - 0.6 * head * Math.sin(a)}" class="${cls}"/><polygon points="${x2},${y2} ${h1} ${h2}" class="${cls} pg-head"/>`;
}
const hatchLine = ([x1, y], [x2], up) => { let s = `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="pg-ground"/>`; for (let x = x1 + 3; x <= x2; x += 7) s += `<line x1="${x}" y1="${y}" x2="${x - 5}" y2="${y + (up ? -6 : 6)}" class="pg-ground"/>`; return s; };
function envSvg(env) {
  return env.map((e) => {
    if (e.hatch) return hatchLine(e.hatch[0], e.hatch[1], e.hatch[2] === 'up');
    if (e.poly) return `<polygon points="${e.poly.map((p) => p.join(',')).join(' ')}" class="pg-fenv"/>`;
    if (e.rope) return `<line x1="${e.rope[0][0]}" y1="${e.rope[0][1]}" x2="${e.rope[1][0]}" y2="${e.rope[1][1]}" class="pg-fwire"/>`;
    if (e.label) return text(e.label[0], e.label[1], e.label[2], 'pg-tm');
    if (e.motion) return arrow(e.motion[0][0], e.motion[0][1], e.motion[1][0], e.motion[1][1], 'pg-fmotion', 6) + text((e.motion[0][0] + e.motion[1][0]) / 2, e.motion[0][1] - 5, 'v = קבוע', 'pg-tm');
    if (e.wall) { const [[x, y1], [, y2]] = e.wall; let s = `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" class="pg-ground"/>`; for (let y = y1 + 3; y <= y2; y += 7) s += `<line x1="${x}" y1="${y}" x2="${x + 6}" y2="${y - 5}" class="pg-ground"/>`; return s; }
    if (e.pin) { const [x, y] = e.pin; return `<polygon points="${x},${y} ${x - 10},${y + 18} ${x + 10},${y + 18}" class="pg-fenv"/>${hatchLine([x - 14, y + 18], [x + 14], false)}`; }
    if (e.roller) { const [x, y] = e.roller; return `<polygon points="${x},${y} ${x - 9},${y + 13} ${x + 9},${y + 13}" class="pg-fenv"/><circle cx="${x - 4.5}" cy="${y + 16}" r="2.8" class="pg-fenv"/><circle cx="${x + 4.5}" cy="${y + 16}" r="2.8" class="pg-fenv"/>${hatchLine([x - 14, y + 19], [x + 14], false)}`; }
    if (e.dim) { const [[x1, y], [x2], lab] = e.dim; return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="pg-ruler"/><line x1="${x1}" y1="${y - 4}" x2="${x1}" y2="${y + 4}" class="pg-ruler"/><line x1="${x2}" y1="${y - 4}" x2="${x2}" y2="${y + 4}" class="pg-ruler"/>${text((x1 + x2) / 2, y - 4, lab, 'pg-tm')}`; }
    if (e.spring) { const [[x, y1], [, y2]] = e.spring, n = 9; let d = `M${x},${y1} L${x},${y1 + 8}`; for (let i = 0; i < n; i++) d += ` L${x + (i % 2 ? -11 : 11)},${y1 + 8 + ((y2 - y1 - 16) * (i + 0.5)) / n}`; return `<path d="${d} L${x},${y2 - 8} L${x},${y2}" class="pg-spring"/>`; }
    return '';
  }).join('');
}
function svg(sc, res) {
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" id="pgFbd" role="img" aria-label="${esc(sc.title)}: שרטוט כוחות">`;
  s += envSvg(sc.env);
  s += sc.body.circle ? `<circle cx="${sc.body.circle[0][0]}" cy="${sc.body.circle[0][1]}" r="${sc.body.circle[1]}" class="pg-fbody"/>` : `<polygon points="${sc.body.poly.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" class="pg-fbody"/>`;
  if (st.showSol) answerKey(sc).forEach((q, i) => {
    const d = dirv(q.ang), e = sc.expected[i];
    s += arrow(q.x, q.y, q.x + d[0] * AL, q.y + d[1] * AL, 'pg-fsol', 8) + text(q.x + d[0] * (AL + 12), q.y + d[1] * (AL + 12) + 4, e.key.replace(/(\d)/, '$1'), 'pg-tsol');
  });
  const status = new Map();
  if (res) { res.items.forEach((i) => i.id != null && status.set(i.id, i.status)); res.extras.forEach((x) => status.set(x.id, 'extra')); }
  st.forces.forEach((q) => {
    const d = dirv(q.ang), hx = q.x + d[0] * AL, hy = q.y + d[1] * AL, cls = { ok: 'pg-fok', dir: 'pg-fwarn', place: 'pg-fwarn', extra: 'pg-fbad' }[status.get(q.id)] || 'pg-fuser';
    s += arrow(q.x, q.y, hx, hy, `${cls} ${st.sel === q.id ? 'pg-fsel' : ''}`, 9);
    s += `<circle cx="${q.x}" cy="${q.y}" r="3.2" class="pg-fbase"/>`;
    s += text(hx + d[0] * 11 + (Math.abs(d[0]) < 0.3 ? 9 : 0), hy + d[1] * 11 + 4, q.type, `pg-tf ${cls}`);
    if (st.sel === q.id) s += `<circle cx="${hx}" cy="${hy}" r="9" class="pg-handle"/>${st.tool === 'sel' ? `<circle cx="${q.x}" cy="${q.y}" r="8" class="pg-handle pg-hbase"/>` : ''}`;
  });
  return s + '</svg>';
}
function resultsHtml(sc, res) {
  if (!res && !st.showSol) return `<p class="small muted">${rich(sc.prompt)}</p><p class="small muted">כשסיימת, לחץ "בדוק". הכוחות נבדקים לפי סוג, מקום וכיוון (סטייה עד ${ltr('20°')}).</p>`;
  let html = '';
  if (res) {
    html += res.allOk ? '<div class="pg-status good">✓ הדיאגרמה נכונה!</div>' : `<div class="pg-status warn">${res.ok} מתוך ${res.total} כוחות נכונים${res.extras.length ? `, ${res.extras.length} מיותרים` : ''}</div>`;
    html += '<ul class="pg-checklist">' + res.items.map((i) => `<li class="${i.status}"><b>${{ ok: '✓', dir: '↻', place: '⌖', missing: '✗' }[i.status]} ${esc(i.name)}</b>${i.status === 'ok' ? '' : `<span>${{ dir: 'הכיוון לא נכון. ', place: 'נקודת הפעולה לא נכונה. ', missing: 'חסר. ' }[i.status]}${esc(i.hint)}</span>`}</li>`).join('')
      + res.extras.map((x) => `<li class="extra"><b>⚠ ${esc(TYPES[x.type])} מיותר</b><span>${esc(x.msg)}</span></li>`).join('') + '</ul>';
  }
  if ((res && res.allOk) || st.showSol) {
    const { rows } = sc.solve(), unit = sc.unit;
    html += `<h3 class="pg-h">גדלי הכוחות משיווי משקל</h3><table class="pg-table"><tbody>${rows.map(([l, v, u, eq]) => `<tr><td>${ltr(l)}</td><td>${ltr(`${num(v)} ${u === 'N' && unit ? unit : u}`)}</td><td class="small">${esc(eq)}</td></tr>`).join('')}</tbody></table>`;
  }
  return html;
}
function editorHtml() {
  const q = st.forces.find((f) => f.id === st.sel);
  if (!q) return '<p class="small muted">בחר סוג כוח ולחץ על הגוף במקום שבו הכוח פועל. אחר כך גרור את ראש החץ כדי לכוון אותו, ואת הבסיס כדי להזיז אותו. כדי לבחור חץ קיים, עבור ל-✋ בחירה.</p>';
  return `<h3 class="pg-h">${esc(TYPES[q.type])}</h3>
    <div class="chips">${[[90, '↑'], [270, '↓'], [0, '→'], [180, '←'], [45, '↗'], [135, '↖'], [315, '↘'], [225, '↙']].map(([a, t]) => `<button class="chip" data-ang="${a}" aria-pressed="${q.ang === a}">${t}</button>`).join('')}</div>
    <div class="pg-form"><label><span>זווית מציר x ${ltr('[°]')}</span><input type="number" inputmode="decimal" step="5" data-f="ang" value="${q.ang}"></label>
    <label><span>סוג</span><select data-f="type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${k === q.type ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label></div>
    <button class="btn pg-del" data-act="del">🗑 מחק כוח</button>`;
}

export function renderFbd(root, { toast }) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>✎ דיאגרמת גוף חופשי</h2>
      <div class="pg-templates">${IDS.map((id) => `<button class="chip" data-sc="${id}">${esc(SCENARIOS[id].name)}</button>`).join('')}</div>
      <p class="pg-prompt" id="pgFbdPrompt"></p></div>
    <div class="card pg-stage"><div id="pgFbdCanvas"></div>
      <div class="pg-ftools"><button class="pg-tool" data-tool="sel"><b>✋</b>בחירה</button>${Object.keys(TYPES).map((t) => `<button class="pg-tool" data-tool="${t}"><b>${t}</b>${esc(TYPES[t].replace(/ \S+$/, ''))}</button>`).join('')}</div>
      <div class="btn-row"><button class="btn primary" data-act="check">✓ בדוק</button><button class="btn" data-act="sol">👁 פתרון</button></div>
      <div class="btn-row"><button class="btn" data-act="new">🎲 שאלה חדשה</button><button class="btn" data-act="clear">⌫ נקה</button></div></div>
    <div class="card" id="pgFbdEdit"></div>
    <div class="card" id="pgFbdRes"></div>`;
  const cv = root.querySelector('#pgFbdCanvas'), ed = root.querySelector('#pgFbdEdit'), out = root.querySelector('#pgFbdRes'), pr = root.querySelector('#pgFbdPrompt');
  let sc = scene();
  const res = () => (st.checked ? grade(sc, st.forces) : null);
  const live = () => { const r = res(); cv.innerHTML = svg(sc, r); out.innerHTML = resultsHtml(sc, r); };
  const all = () => {
    sc = scene(); live(); ed.innerHTML = editorHtml(); pr.innerHTML = rich(sc.prompt);
    root.querySelectorAll('[data-sc]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sc === st.sid)));
    root.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === st.tool)));
  };
  all();
  const touched = () => { st.checked = false; };

  root.addEventListener('click', (ev) => {
    const s = ev.target.closest('[data-sc]'); if (s) { st = fresh(s.dataset.sc); save(); all(); return; }
    const t = ev.target.closest('[data-tool]'); if (t) { st.tool = t.dataset.tool; save(); all(); return; }
    const a = ev.target.closest('[data-ang]'); if (a) { const q = st.forces.find((f) => f.id === st.sel); if (q) { q.ang = Number(a.dataset.ang); touched(); save(); all(); } return; }
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'check') { st.checked = true; st.sel = null; if (grade(sc, st.forces).allOk) toast('✓ נכון! הגדלים מופיעים למטה'); }
    else if (act === 'sol') st.showSol = !st.showSol;
    else if (act === 'new') { const sid = st.sid, tool = st.tool; st = fresh(sid); st.tool = tool; }
    else if (act === 'clear') { st.forces = []; st.sel = null; st.checked = false; st.showSol = false; }
    else if (act === 'del') { st.forces = st.forces.filter((f) => f.id !== st.sel); st.sel = null; touched(); }
    else return;
    save(); all();
    if (act === 'check') out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  ed.addEventListener('input', (ev) => {
    const q = st.forces.find((f) => f.id === st.sel); if (!q) return;
    if (ev.target.dataset.f === 'ang') { const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return; q.ang = ((v % 360) + 360) % 360; }
    else if (ev.target.dataset.f === 'type') q.type = ev.target.value;
    touched(); save(); live();
  });

  // canvas: add, select, rotate (head) and move (base)
  const pt = (ev) => { const sv = cv.querySelector('svg'), q = sv.createSVGPoint(); q.x = ev.clientX; q.y = ev.clientY; const p = q.matrixTransform(sv.getScreenCTM().inverse()); return [p.x, p.y]; };
  const segDist = ([x, y], x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L2)); return Math.hypot(x - x1 - t * dx, y - y1 - t * dy); };
  let drag = null;
  cv.addEventListener('pointerdown', (ev) => {
    if (!cv.querySelector('svg')) return;
    ev.preventDefault();
    const p = pt(ev), sel = st.forces.find((f) => f.id === st.sel);
    if (sel) {
      const d = dirv(sel.ang), hx = sel.x + d[0] * AL, hy = sel.y + d[1] * AL;
      if (Math.hypot(p[0] - hx, p[1] - hy) < 16) drag = { kind: 'head', id: sel.id };
      else if (st.tool === 'sel' && Math.hypot(p[0] - sel.x, p[1] - sel.y) < 14) drag = { kind: 'base', id: sel.id, dx: sel.x - p[0], dy: sel.y - p[1] }; // with a force tool, a tap at the same spot adds another force (N and f share the contact)
    }
    if (!drag && st.tool === 'sel') { // select tool: pick the nearest arrow (and move it), or clear the selection
      let best = null, bd = 12;
      st.forces.forEach((f) => { const d = dirv(f.ang), dd = segDist(p, f.x, f.y, f.x + d[0] * AL, f.y + d[1] * AL); if (dd < bd) { bd = dd; best = f; } });
      if (best) { st.sel = best.id; drag = { kind: 'base', id: best.id, dx: best.x - p[0], dy: best.y - p[1] }; } else st.sel = null;
    } else if (!drag) { // a force tool always adds a new force where you tap
      const f = { id: uid++, type: st.tool, x: Math.round(p[0]), y: Math.round(p[1]), ang: 45 }; st.forces.push(f); st.sel = f.id; touched();
      if (!sessionGet('pgFbdHint')) { toast('גרור את ראש החץ כדי לכוון אותו'); sessionSet('pgFbdHint'); }
    }
    drag = drag ? { ...drag, pid: ev.pointerId } : null;
    if (drag) try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
    save(); all();
  });
  cv.addEventListener('pointermove', (ev) => {
    if (!drag || ev.pointerId !== drag.pid) return;
    const f = st.forces.find((q) => q.id === drag.id); if (!f) return;
    const p = pt(ev);
    if (drag.kind === 'head') { const a = (Math.atan2(-(p[1] - f.y), p[0] - f.x) * 180) / Math.PI; f.ang = ((Math.round(a / 5) * 5) % 360 + 360) % 360; }
    else { f.x = Math.round(Math.min(W - 4, Math.max(4, p[0] + drag.dx))); f.y = Math.round(Math.min(H - 4, Math.max(4, p[1] + drag.dy))); }
    touched(); live();
  });
  const end = (ev) => { if (!drag || ev.pointerId !== drag.pid) return; drag = null; save(); all(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
}
function sessionGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return '1'; } }
function sessionSet(k) { try { sessionStorage.setItem(k, '1'); } catch (e) { /* ignore */ } }
