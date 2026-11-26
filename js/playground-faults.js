// playground-faults.js: the playground's fault-finding game. A hidden fault on a socket circuit; measure
// phase-neutral, phase-earth, neutral-earth at the socket and at the breaker's output, and earth continuity
// with the power off; then name the fault. Readings and the list of faults: js/home.js (tests/home-cases.mjs).
import { FAULTS, readings, consistent } from './home.js';
import { esc } from './text.js';
import { ltr, text, wire, HOME_SAFETY } from './elec-ui.js';

const KEY = 'mh-pg-faults-v1';
const PAIRS = [['LN', 'פאזה-אפס'], ['LPE', 'פאזה-הארקה'], ['NPE', 'אפס-הארקה'], ['PEohm', 'רציפות הארקה (Ω)']];
const POINTS = [['socket', 'בשקע'], ['panel', 'ביציאת המאמ"ת']];
const newGame = (prev) => { let f; do f = FAULTS[Math.floor(Math.random() * FAULTS.length)].id; while (prev && f === prev && FAULTS.length > 1); return f; };
const defaults = () => ({ fault: newGame(), meas: [], power: true, point: 'socket', pair: 'LN', guess: null, right: 0, total: 0, showC: false });
let st = null;
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') for (const k of Object.keys(st)) if (k in s && (typeof s[k] === typeof st[k] || s[k] === null)) st[k] = s[k]; } catch (e) { /* ignore */ }
  if (!FAULTS.some((f) => f.id === st.fault)) st.fault = newGame();
  if (!Array.isArray(st.meas)) st.meas = [];
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
const OL = 1e99; // Infinity does not survive JSON
const show = (v, pair) => (v === null ? '??' : v >= OL ? 'OL' : pair === 'PEohm' ? `${v.toFixed(1)} Ω` : `${v.toFixed(0)} V`);
// one measurement with the meter: voltages need power, continuity needs it off
function measure(point, pair) {
  if (pair === 'PEohm') return st.power ? { text: '----', warn: 'מודדים רציפות רק כשהמעגל כבוי: כבה קודם את המאמ"ת.' } : { value: readings(st.fault, point).PEohm };
  if (!st.power) return { value: 0, off: true };
  return { value: readings(st.fault, point)[pair] };
}

function sceneSvg(last) {
  const W = 360, H = 200, tripped = st.fault === 'mcb', down = tripped || !st.power;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="לוח, מעגל ושקע">`;
  s += `<rect x="10" y="20" width="90" height="140" rx="8" class="pg-hbox"/>` + text(55, 14, 'לוח', '', 'middle', 'pg-tn');
  s += `<rect x="40" y="50" width="30" height="70" rx="4" class="pg-hbrk"/><rect x="47" y="${down ? 92 : 58}" width="16" height="22" rx="2" fill="${down ? 'var(--bad)' : 'var(--good)'}"/>` + text(55, 135, 'B16', '', 'middle', 'pg-tn');
  s += wire('M70,70 L270,70 L270,96', 'L') + wire('M100,110 L290,110 L290,96', 'N') + wire('M100,150 L280,150 L280,124', 'PE');
  s += `<rect x="180" y="60" width="26" height="22" rx="4" class="pg-wbox"/>` + text(193, 56, 'קופסה', 'var(--muted)', 'middle', 'pg-tn');
  s += `<rect x="252" y="80" width="56" height="56" rx="10" class="pg-csym"/><circle cx="270" cy="100" r="3.5" fill="var(--text)"/><circle cx="290" cy="100" r="3.5" fill="var(--text)"/><circle cx="280" cy="120" r="3.5" fill="var(--text)"/>` + text(280, 152, 'שקע', '', 'middle', 'pg-tn');
  const ok = st.power && readings(st.fault, 'socket').LN > 200;
  s += `<text x="330" y="112" font-size="20">${ok ? '💡' : '⚫'}</text>`;
  if (last) s += `<rect x="120" y="164" width="120" height="30" rx="5" class="pg-lcd"/><text x="232" y="186" text-anchor="end" class="pg-lcdt" style="font-size:18px">${esc(last)}</text>`;
  return s + '</svg>';
}

export function renderFaults(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>🔍 איתור תקלות</h2><p class="small muted">דייר מתלונן על שקע. יש תקלה נסתרת (או שאין). מודדים עם המולטימטר, ומחליטים מה התקלה.</p>${HOME_SAFETY}</div>
    <div class="card pg-stage"><div id="fScene"></div><p class="small" id="fWarn"></p></div>
    <div class="card" id="fMeas"></div>
    <div class="card" id="fGuess"></div>`;
  const sc = root.querySelector('#fScene'), warn = root.querySelector('#fWarn'), mc = root.querySelector('#fMeas'), gc = root.querySelector('#fGuess');
  let last = '';
  const all = () => {
    sc.innerHTML = sceneSvg(last);
    const live = st.meas.filter((m) => !m.off), cands = consistent(live.map((m) => ({ point: m.point, pair: m.pair, value: m.value >= OL ? Infinity : m.value })));
    const rows = st.meas.map((m) => `<tr><td>${esc(POINTS.find(([v]) => v === m.point)[1])}</td><td>${esc(PAIRS.find(([v]) => v === m.pair)[1])}</td><td>${ltr(show(m.value, m.pair))}${m.off ? ' <span class="muted">(כבוי)</span>' : ''}</td></tr>`).join('');
    mc.innerHTML = `<h3 class="pg-h">מדידות</h3>
      <div class="chips">${POINTS.map(([v, t]) => `<button class="chip" data-act="point" data-v="${v}" aria-pressed="${st.point === v}">${esc(t)}</button>`).join('')}</div>
      <div class="chips" style="margin-top:6px">${PAIRS.map(([v, t]) => `<button class="chip" data-act="pair" data-v="${v}" aria-pressed="${st.pair === v}">${esc(t)}</button>`).join('')}</div>
      <div class="chips" style="margin-top:8px"><button class="btn primary" data-act="measure">📏 מדוד</button><button class="btn" data-act="power">${st.power ? '⏻ כבה את המאמ"ת' : '⏻ הדלק את המאמ"ת'}</button></div>
      ${rows ? `<table class="pg-table" style="margin-top:8px"><thead><tr><th>איפה</th><th>בין</th><th>קריאה</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="small muted">עוד לא מדדת. התחל ב"פאזה-אפס בשקע".</p>'}
      <p class="small muted">?? = קריאה לא יציבה: אחד הפרובים על מוליך "צף" שלא מחובר לשום דבר, והמד מראה מספרים קופצים. OL = מעגל פתוח.</p>
      <div class="chips"><button class="chip" data-act="showc" aria-pressed="${st.showC}">${st.showC ? 'הסתר רמז' : 'רמז: מה עוד אפשרי?'}</button></div>
      ${st.showC ? `<p class="small">לפי המדידות שלך, עדיין אפשרי: ${cands.map((id) => `<b>${esc(FAULTS.find((f) => f.id === id).name)}</b>`).join(', ') || 'אף אחת (בדוק שוב)'}.</p>` : ''}`;
    const done = st.guess !== null, f = FAULTS.find((q) => q.id === st.fault);
    gc.innerHTML = `<h3 class="pg-h">מה התקלה?</h3>${done ? `<div class="pg-status ${st.guess === st.fault ? 'good' : 'bad'}">${st.guess === st.fault ? '✓ נכון!' : `✗ לא. התקלה הייתה: ${esc(f.name)}`}</div><p class="small">${esc(f.fix)}</p><button class="btn primary" data-act="new">🎲 תקלה חדשה</button>`
      : `<div class="chips">${FAULTS.map((q) => `<button class="chip" data-act="guess" data-v="${q.id}">${esc(q.name)}</button>`).join('')}</div>`}
      <p class="small muted">ניקוד: ${ltr(`${st.right}/${st.total}`)}. סדר עבודה טוב: קודם פאזה-אפס בשקע. אם 0, עוברים ללוח: יש מתח ביציאת המאמ"ת? ואז פאזה-הארקה ואפס-הארקה בשקע מבדילים בין פאזה מנותקת לאפס מנותק. הארקה בודקים ברציפות, עם המעגל כבוי.</p>`;
  };
  all();
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act, v = b.dataset.v; warn.textContent = '';
    if (a === 'point') st.point = v;
    else if (a === 'pair') st.pair = v;
    else if (a === 'power') { st.power = !st.power; last = ''; }
    else if (a === 'showc') st.showC = !st.showC;
    else if (a === 'measure') {
      const r = measure(st.point, st.pair);
      if (r.warn) { warn.textContent = `⚠ ${r.warn}`; last = r.text; }
      else { st.meas.push({ point: st.point, pair: st.pair, value: r.value === Infinity ? OL : r.value, off: !!r.off }); if (st.meas.length > 30) st.meas.shift(); last = show(r.value, st.pair); }
    }
    else if (a === 'guess' && st.guess === null) { st.guess = v; st.total++; if (v === st.fault) st.right++; }
    else if (a === 'new') { st.fault = newGame(st.fault); st.meas = []; st.guess = null; st.power = true; last = ''; }
    else return;
    save(); all();
  });
}
