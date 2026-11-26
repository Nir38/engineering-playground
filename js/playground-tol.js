// playground-tol.js: the playground's tolerance stack-up mode. A chain of dimensions closes on a gap;
// worst case against RSS, how much each part contributes, and a Monte Carlo histogram of the gap.
// Math: js/stack.js (tests/stack-cases.mjs). The dimensions in the examples are example values.
import { stack, monteCarlo, rejectFrac, SRC_T } from './stack.js';
import { ltr, num, text, arrow, COL } from './elec-ui.js';
import { esc } from './text.js';

const KEY = 'mh-pg-tol-v1';
const D = (name, nom, up, lo, dir) => ({ name, nom, up, lo, dir });
const PRESETS = {
  gap: { name: 'פער בבית', dims: [D('בית', 50, 0.1, -0.1, 1), D('חלק A', 20, 0.05, -0.05, -1), D('חלק B', 29.8, 0.05, -0.05, -1)], lsl: 0.05, usl: null },
  shift: { name: 'טולרנס חד-צדדי', dims: [D('בית', 40, 0.2, 0, 1), D('תותב', 10, 0, -0.1, -1), D('חלק', 29.7, 0.05, -0.05, -1)], lsl: 0.1, usl: 0.8 },
  many: { name: '8 דסקיות', dims: [D('בית', 40.5, 0.1, -0.1, 1), ...Array.from({ length: 8 }, (_, i) => D(`דסקית ${i + 1}`, 5, 0.05, -0.05, -1))], lsl: 0.1, usl: null },
};
const clone = (o) => JSON.parse(JSON.stringify(o));
let st = null;
function load() {
  st = { preset: 'gap', ...clone(PRESETS.gap) };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && Array.isArray(s.dims) && s.dims.length && s.dims.every((d) => d && [d.nom, d.up, d.lo].every(Number.isFinite) && (d.dir === 1 || d.dir === -1))) {
      st = { preset: String(s.preset || ''), name: '', dims: s.dims.slice(0, 12).map((d) => D(String(d.name || '').slice(0, 20), d.nom, d.up, d.lo, d.dir)), lsl: Number.isFinite(s.lsl) ? s.lsl : null, usl: Number.isFinite(s.usl) ? s.usl : null };
    }
  } catch (e) { /* ignore */ }
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
const f3 = (v) => num(v, 3);
const pm = (d) => (Math.abs(d.up + d.lo) < 1e-12 ? `±${f3(d.up)}` : `${d.up >= 0 ? '+' : ''}${f3(d.up)}/${d.lo > 0 ? '+' : ''}${f3(d.lo)}`);

// loop diagram: each dimension is an arrow (+ to the right, − to the left), the gap closes the loop
function loopSvg(s) {
  const W = 360, n = st.dims.length, rowH = n > 6 ? 17 : 22, H = 46 + (n + 1) * rowH + 8;
  let x = 0; const xs = [0]; for (const d of st.dims) { x += d.dir * d.nom; xs.push(x); }
  const lo = Math.min(...xs), hi = Math.max(...xs), k = (W - 60) / (hi - lo || 1), X = (v) => 30 + (v - lo) * k;
  let out = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="דיאגרמת הלולאה של שרשרת המידות">`;
  out += `<line x1="${X(0)}" y1="8" x2="${X(0)}" y2="${H - 4}" stroke="var(--muted)" stroke-dasharray="3 3"/>`;
  x = 0;
  st.dims.forEach((d, i) => {
    const y = 42 + i * rowH, x2 = x + d.dir * d.nom, col = d.dir > 0 ? COL.v : COL.i;
    out += arrow(X(x), y, X(x2), y, col, 2, 6) + text((X(x) + X(x2)) / 2, y - 4, `${d.name} ${d.dir > 0 ? '+' : '−'}${f3(d.nom)}`, col, 'middle');
    x = x2;
  });
  const y = 42 + n * rowH + 4, gx1 = X(x), gx0 = X(0), small = Math.abs(gx1 - gx0) < 8;
  out += small ? `<circle cx="${gx0}" cy="${y}" r="4" fill="${COL.s}"/>` : arrow(gx1, y, gx0, y, COL.s, 2.5, 6);
  out += text(gx0 + (small ? 8 : 0) + (small ? 0 : (gx1 - gx0) / 2), y + 13, `פער = ${f3(s.nom)}`, COL.s, small ? 'start' : 'middle');
  return out + '</svg>';
}

// histogram of the Monte Carlo gap, with the spec and the worst-case / RSS limits
function histSvg(s, mc) {
  const W = 360, H = 156, pl = 10, pr = 10, pt = 22, pb = 30, span = Math.max(s.wc, 1e-6) * 1.15;
  const a = Math.min(s.mean - span, st.lsl ?? Infinity), b = Math.max(s.mean + span, st.usl ?? -Infinity), nb = 44, bins = new Array(nb).fill(0);
  for (const g of mc.samples) { const j = Math.floor(((g - a) / (b - a)) * nb); if (j >= 0 && j < nb) bins[j]++; }
  const mx = Math.max(...bins, 1), X = (v) => pl + ((v - a) / (b - a)) * (W - pl - pr), bw = (W - pl - pr) / nb;
  let out = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="התפלגות הפער ב-20,000 הרכבות מדומות">`;
  bins.forEach((c, j) => {
    const v = a + ((j + 0.5) / nb) * (b - a), bad = (st.lsl != null && v < st.lsl) || (st.usl != null && v > st.usl), h = (c / mx) * (H - pt - pb);
    if (c) out += `<rect x="${(pl + j * bw + 0.5).toFixed(1)}" y="${(H - pb - h).toFixed(1)}" width="${(bw - 1).toFixed(1)}" height="${h.toFixed(1)}" fill="${bad ? COL.s : COL.v}" opacity="0.75"/>`;
  });
  out += `<line x1="${pl}" y1="${H - pb}" x2="${W - pr}" y2="${H - pb}" stroke="var(--muted)"/>`;
  const vline = (v, col, dash, label, row) => { if (v == null || v < a || v > b) return ''; return `<line x1="${X(v)}" y1="${pt - 6}" x2="${X(v)}" y2="${H - pb}" stroke="${col}" stroke-width="1.5" ${dash ? `stroke-dasharray="${dash}"` : ''}/>` + text(X(v), row < 0 ? pt - 8 : H - pb + 12 + row * 11, label, col); };
  out += vline(s.wcMin, 'var(--muted)', '4 3', `WC ${f3(s.wcMin)}`, 1) + vline(s.wcMax, 'var(--muted)', '4 3', `WC ${f3(s.wcMax)}`, 1);
  out += vline(s.rssMin, COL.q, '2 2', `RSS ${f3(s.rssMin)}`, 0) + vline(s.rssMax, COL.q, '2 2', `RSS ${f3(s.rssMax)}`, 0);
  out += vline(st.lsl, COL.s, '', 'מינ׳', -1) + vline(st.usl, COL.s, '', 'מקס׳', -1);
  return out + '</svg>';
}

function contribSvg(s) {
  const W = 360, rowH = 18, H = 8 + s.parts.length * rowH;
  let out = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="תרומת כל מידה לשונות (RSS)">`;
  s.parts.forEach((p, i) => {
    const y = 4 + i * rowH, w = (p.rssPct / 100) * 200;
    out += `<rect x="${W - 90 - w}" y="${y + 2}" width="${Math.max(w, 1)}" height="${rowH - 6}" rx="3" fill="${COL.q}" opacity="0.8"/>` + text(W - 84, y + rowH - 6, p.name, '', 'start') + text(W - 96 - w, y + rowH - 6, `${num(p.rssPct, 0)}%`, '', 'end');
  });
  return out + '</svg>';
}

export function renderTol(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>📏 שרשרת טולרנסים</h2><p class="small muted">כמה מידות בשרשרת קובעות פער אחד. כל מידה מוסיפה (+) או מחסירה (−) מהפער, והטולרנסים שלהן מצטברים. Worst case מחבר את כולם במקרה הגרוע, ו-RSS מניח שלא כולם יגיעו לקצה ביחד.</p></div>
    <div class="card pg-stage"><div id="tlLoop"></div><h3 class="pg-h">התפלגות הפער (20,000 הרכבות מדומות)</h3><div id="tlHist"></div></div>
    <div class="card" id="tlEd"></div>
    <div class="card" id="tlRes"></div>`;
  const lp = root.querySelector('#tlLoop'), hs = root.querySelector('#tlHist'), ed = root.querySelector('#tlEd'), out = root.querySelector('#tlRes');
  const inp = (i, k, v) => `<input type="number" inputmode="decimal" step="any" data-i="${i}" data-k="${k}" value="${v}" aria-label="${k}">`;
  const specInp = (k, v, lab) => `<label><span>${lab}</span><input type="number" inputmode="decimal" step="any" data-spec="${k}" value="${v ?? ''}" placeholder="אין"></label>`;
  const editor = () => `<div class="chips">${Object.entries(PRESETS).map(([k, p]) => `<button class="chip" data-act="preset" data-v="${k}" aria-pressed="${st.preset === k}">${esc(p.name)}</button>`).join('')}</div>
    <div class="pg-tol"><table class="pg-table"><thead><tr><th></th><th>שם</th><th>נומינלי</th><th>עליון</th><th>תחתון</th><th></th></tr></thead><tbody>
    ${st.dims.map((d, i) => `<tr><td><button class="chip pg-dir" data-act="dir" data-i="${i}" aria-label="כיוון">${d.dir > 0 ? '+' : '−'}</button></td><td><input type="text" data-i="${i}" data-k="name" value="${esc(d.name)}" maxlength="20" aria-label="שם"></td><td>${inp(i, 'nom', d.nom)}</td><td>${inp(i, 'up', d.up)}</td><td>${inp(i, 'lo', d.lo)}</td><td>${st.dims.length > 1 ? `<button class="chip" data-act="del" data-i="${i}" aria-label="מחק">✕</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="chips">${st.dims.length < 12 ? '<button class="chip" data-act="add">＋ מידה</button>' : ''}</div>
    <div class="pg-form">${specInp('lsl', st.lsl, 'פער מינימלי נדרש')}${specInp('usl', st.usl, 'פער מקסימלי מותר')}</div>
    <p class="small muted">+ מגדיל את הפער (למשל אורך הבית), − מקטין אותו (החלקים בפנים). לחיצה על הסימן הופכת. טולרנס לא סימטרי, כמו ${ltr('+0.1/0')}, הופך אוטומטית לממוצע ול-± שווה.</p>`;
  const results = (s, mc) => {
    const wcOk = (st.lsl == null || s.wcMin >= st.lsl - 1e-12) && (st.usl == null || s.wcMax <= st.usl + 1e-12);
    const rej = rejectFrac(s, st.lsl, st.usl), mcRej = mc.frac(st.lsl, st.usl), hasSpec = st.lsl != null || st.usl != null;
    const pct = (f) => (f < 1e-6 ? '0' : f < 0.001 ? `${num(f * 1e6, 0)} ppm` : `${num(f * 100, f < 0.01 ? 2 : 1)}%`);
    const status = !hasSpec ? '' : wcOk ? '<div class="pg-status good">גם במקרה הגרוע ביותר כל ההרכבות עוברות. אפשר אולי לפתוח טולרנסים ולחסוך בעלות.</div>'
      : rej < 0.0027 ? `<div class="pg-status warn">Worst case נכשל, אבל לפי RSS רק כ-${pct(rej)} מההרכבות ייצאו מהדרישה. זה מקובל רק אם התהליך יציב וממורכז, ואם כשל של הרכבה אחת לא מסוכן.</div>`
        : `<div class="pg-status bad">גם לפי RSS כ-${pct(rej)} מההרכבות ייצאו מהדרישה. צריך להדק את המידה שתורמת הכי הרבה, או לשנות את התכן.</div>`;
    const top = s.parts.reduce((m, p) => (p.rssPct > m.rssPct ? p : m), s.parts[0]);
    return `${status}<h3 class="pg-h">התוצאות</h3><div class="pg-max">
      <div><span>פער נומינלי</span><b>${ltr(f3(s.nom))}</b></div>
      ${Math.abs(s.mean - s.nom) > 1e-9 ? `<div><span>פער ממוצע (אחרי מירכוז)</span><b>${ltr(f3(s.mean))}</b></div>` : ''}
      <div><span>Worst case</span><b>${ltr(`±${f3(s.wc)} → ${f3(s.wcMin)} … ${f3(s.wcMax)}`)}</b></div>
      <div><span>RSS (±3σ)</span><b>${ltr(`±${f3(s.rss)} → ${f3(s.rssMin)} … ${f3(s.rssMax)}`)}</b></div>
      ${hasSpec ? `<div><span>מחוץ לדרישה (RSS)</span><b>${ltr(pct(rej))}</b></div><div><span>מחוץ לדרישה (סימולציה)</span><b>${ltr(pct(mcRej))}</b></div>` : ''}
    </div>
    <h3 class="pg-h">מי תורם הכי הרבה לשונות</h3>${contribSvg(s)}
    <p class="small">ב-RSS כל מידה תורמת לפי ${ltr('t²')}, ולכן המידה עם הטולרנס הגדול שולטת. כאן זו <b>${esc(top.name)}</b> (${ltr(`${num(top.rssPct, 0)}%`)}). להדק אותה עוזר הרבה יותר מלהדק את כל השאר.</p>
    <p class="small">${ltr('Worst case: Σtᵢ    RSS: √Σtᵢ²')}. Worst case בטוח תמיד, ומתאים לשרשרת קצרה או כשכשל מסוכן. RSS מניח שכל מידה מתפלגת נורמלית, ממורכזת, ושה-± שלה הוא ${ltr('±3σ')}. ככל שיש יותר חלקים, RSS חוסך יותר (נסה "8 דסקיות"). אם התהליך לא ממורכז, RSS אופטימי מדי.</p>
    <p class="small muted">המידות בדוגמאות הן ערכים לדוגמה. השיטה: ${SRC_T}. הסימולציה מגרילה כל מידה כהתפלגות נורמלית עם ${ltr('σ = t/3')}. באחוזים קטנים מאוד (ppm) היא רועשת, כי מדובר בהרכבות בודדות מתוך 20,000, והחישוב לפי RSS מדויק יותר.</p>`;
  };
  const refresh = (full = true) => {
    const s = stack(st.dims), mc = monteCarlo(st.dims, 20000, 1);
    lp.innerHTML = loopSvg(s); hs.innerHTML = histSvg(s, mc); out.innerHTML = results(s, mc);
    if (full) ed.innerHTML = editor();
  };
  refresh();
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const i = Number(b.dataset.i), act = b.dataset.act;
    if (act === 'preset') st = { preset: b.dataset.v, ...clone(PRESETS[b.dataset.v]) };
    else if (act === 'dir') st.dims[i].dir *= -1;
    else if (act === 'del') st.dims.splice(i, 1);
    else if (act === 'add') st.dims.push(D(`מידה ${st.dims.length + 1}`, 10, 0.05, -0.05, -1));
    else return;
    if (act !== 'preset') st.preset = '';
    save(); refresh();
  });
  // typing: numbers update the drawings at once; the editor is rebuilt only on change (keeps the caret)
  const onEdit = (ev, final) => {
    const t = ev.target;
    if (t.dataset.spec) { const v = t.value.trim() === '' ? null : parseFloat(t.value); if (v !== null && !Number.isFinite(v)) return; st[t.dataset.spec] = v; }
    else if (t.dataset.k) {
      const d = st.dims[Number(t.dataset.i)]; if (!d) return;
      if (t.dataset.k === 'name') d.name = t.value.slice(0, 20);
      else { const v = parseFloat(t.value); if (!Number.isFinite(v)) return; if (t.dataset.k === 'nom') d.nom = Math.max(0, v); else d[t.dataset.k] = v; }
      if (final && d.up < d.lo) [d.up, d.lo] = [d.lo, d.up];
    } else return;
    st.preset = ''; save(); refresh(final);
  };
  root.addEventListener('input', (ev) => onEdit(ev, false));
  root.addEventListener('change', (ev) => onEdit(ev, true));
}
