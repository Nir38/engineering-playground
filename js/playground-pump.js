// playground-pump.js: the playground's pump mode. Pump curve against system curve, the operating point,
// what happens when you change speed (affinity laws) or close a valve, and electric power = hydraulic
// power / efficiencies. Math: js/machines.js (tests/machines-cases.mjs). Pump numbers are example values.
import { pumpH, systemH, operatingPoint, pumpEta, hydPower, SRC } from './machines.js';
import { ltr, si, num, slider, plot, COL, go } from './elec-ui.js';

const KEY = 'mh-pg-pump-v1';
const PUMP = { H0: 40, a: 2000, etaMax: 0.78, Qbep: 0.09, etaMotor: 0.9, k0: 1000 }; // example: 40 m shut-off head, BEP 90 L/s
const LIM = { r: [0.5, 1.1], open: [0.15, 1], Hs: [0, 30] };
const defaults = () => ({ r: 1, open: 1, Hs: 10 });
let st = null;
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') for (const k of Object.keys(st)) if (Number.isFinite(s[k])) st[k] = s[k]; } catch (e) { /* ignore */ }
  for (const [k, [a, b]] of Object.entries(LIM)) st[k] = Math.min(b, Math.max(a, st[k]));
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
const kOf = (open) => PUMP.k0 / (open * open); // a valve: its loss coefficient grows as it closes (example law)
function point(r = st.r, open = st.open) {
  const k = kOf(open), op = operatingPoint({ H0: PUMP.H0, a: PUMP.a, r, Hs: st.Hs, k }), eta = pumpEta(op.Q, PUMP.etaMax, PUMP.Qbep, r);
  const Ph = hydPower(op.Q, op.H), Ps = eta > 0.05 ? Ph / eta : NaN;
  return { ...op, k, eta, Ph, Ps, Pe: Ps / PUMP.etaMotor };
}
// the speed that gives the same flow with the valve fully open: Q² (a + k0) + Hs = H0 r²
const rFor = (Q) => Math.sqrt((Q * Q * (PUMP.a + PUMP.k0) + st.Hs) / PUMP.H0);

export function renderPump(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>💧 משאבה ומערכת</h2><p class="small muted">המשאבה נותנת עומד (H) שיורד עם הספיקה (Q). המערכת (צנרת, גובה, מגופים) דורשת עומד שעולה עם הספיקה. נקודת העבודה היא איפה שהם נפגשים.</p></div>
    <div class="card pg-stage"><div id="puPlot"></div><div id="puEta"></div></div>
    <div class="card" id="puEd"></div>
    <div class="card" id="puRes"></div>`;
  const pv = root.querySelector('#puPlot'), pe = root.querySelector('#puEta'), ed = root.querySelector('#puEd'), out = root.querySelector('#puRes');
  const editor = () => slider('r', 'מהירות המשאבה (ממיר תדר)', ltr(`${num(st.r * 100, 0)}%`), LIM.r, 0.01, st.r) + slider('open', 'פתיחת המגוף', ltr(`${num(st.open * 100, 0)}%`), LIM.open, 0.01, st.open) + slider('Hs', 'עומד סטטי (הפרש גובה)', ltr(`${num(st.Hs, 0)} m`), LIM.Hs, 1, st.Hs)
    + '<div class="chips"><button class="chip" data-act="vfd">⚡ אותה ספיקה בהורדת מהירות במקום במגוף</button><button class="chip" data-act="reset">↺ חזרה</button></div>';
  const draw = () => {
    const p = point(), xs = [], Hp = [], Hp100 = [], Hsy = [], Hsy0 = [];
    for (let i = 0; i <= 60; i++) { const Q = (0.15 * i) / 60; xs.push(Q * 1000); const h = pumpH(Q, PUMP.H0, PUMP.a, st.r); Hp.push(h >= 0 ? h : NaN); const h1 = pumpH(Q, PUMP.H0, PUMP.a); Hp100.push(h1 >= 0 ? h1 : NaN); const hs = systemH(Q, st.Hs, p.k); Hsy.push(hs <= 50 ? hs : NaN); const hs0 = systemH(Q, st.Hs, PUMP.k0); Hsy0.push(hs0 <= 50 ? hs0 : NaN); }
    const series = [{ ys: Hp, col: COL.v, label: 'משאבה' }, { ys: Hsy, col: COL.i, label: 'מערכת' }];
    if (Math.abs(st.r - 1) > 0.005) series.push({ ys: Hp100, col: COL.v, label: '100%', dash: '4 3', w: 1.2 });
    if (st.open < 0.995) series.push({ ys: Hsy0, col: COL.i, label: 'מגוף פתוח', dash: '4 3', w: 1.2 });
    pv.innerHTML = plot({ xs, series, units: { x: 'Q [L/s]', l: 'H [m]' }, marks: [{ x: p.Q * 1000, label: `${num(p.Q * 1000, 0)} L/s, ${num(p.H, 1)} m`, col: COL.p }] });
    const ye = xs.map((q) => pumpEta(q / 1000, PUMP.etaMax, PUMP.Qbep, st.r) * 100);
    pe.innerHTML = plot({ xs, series: [{ ys: ye, col: COL.p, label: 'η משאבה [%]' }], units: { x: 'Q [L/s]', l: '%' }, H: 110, marks: [{ x: p.Q * 1000, label: `${num(p.eta * 100, 0)}%`, col: COL.p }, { x: PUMP.Qbep * st.r * 1000, label: 'BEP' }] });
  };
  const results = () => {
    const p = point();
    return `<h3 class="pg-h">נקודת העבודה</h3><div class="pg-max"><div><span>ספיקה</span><b>${ltr(`${num(p.Q * 1000, 1)} L/s = ${num(p.Q * 3600, 0)} m³/h`)}</b></div><div><span>עומד</span><b>${ltr(`${num(p.H, 1)} m`)}</b></div><div><span>נצילות המשאבה</span><b>${ltr(`${num(p.eta * 100, 0)}%`)}</b></div><div><span>הספק הידראולי</span><b>${ltr(`ρgQH = ${si(p.Ph, 'W')}`)}</b></div><div><span>הספק בציר</span><b>${ltr(si(p.Ps, 'W'))}</b></div><div><span>הספק חשמלי</span><b>${ltr(`÷ η מנוע ${PUMP.etaMotor} = ${si(p.Pe, 'W')}`)}</b></div></div>
      <p class="small">${ltr('P_elec = ρgQH / (η_pump · η_motor)')}. המשאבה עובדת הכי טוב ליד נקודת הנצילות המרבית (BEP). רחוק ממנה היא מבזבזת אנרגיה, מתחממת, ויש יותר רעידות ושחיקה.</p>
      <p class="small"><b>חוקי הדמיון</b> (אותה משאבה, מהירות שונה): ${ltr('Q ∝ n, H ∝ n², P ∝ n³')}. בלי עומד סטטי, הורדת מהירות ל-80% חוסכת כמעט חצי מההספק (${ltr('0.8³ ≈ 0.51')}). עם עומד סטטי החיסכון קטן יותר, כי צריך עדיין להרים את המים לגובה. כל עקום משאבה כאן מקיים את זה.</p>
      <p class="small"><b>מגוף מול מהירות:</b> כשסוגרים מגוף, עקום המערכת נעשה תלול: הספיקה יורדת, אבל המשאבה עדיין מסתובבת מהר ו"נלחמת" במגוף, וההספק לא יורד הרבה. ממיר תדר מוריד את הספיקה בלי לבזבז עומד. לחץ על הכפתור כדי להשוות.</p>
      <p class="small muted">העקומים וערכי המשאבה הם לדוגמה. המקור לנוסחאות: ${SRC.cc}. העומד ובעיית הקוויטציה (NPSH) מוסברים בשיעור על משאבות, ומצב ${go('fluid', '💧 נוזלים')} בקטגוריית המכניקה מראה את הלחצים בצנרת.</p>`;
  };
  const refresh = (full = true) => {
    draw(); out.innerHTML = results();
    if (full) ed.innerHTML = editor();
    else { const tmp = document.createElement('div'); tmp.innerHTML = editor(); const nb = tmp.querySelectorAll('.pg-range b'); ed.querySelectorAll('.pg-range b').forEach((b, i) => { if (nb[i]) b.innerHTML = nb[i].innerHTML; }); }
  };
  refresh();
  let cmp = '';
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'vfd') {
      const before = point(), r = Math.min(LIM.r[1], rFor(before.Q));
      if (st.open > 0.995) { cmp = '<p class="small">המגוף כבר פתוח לגמרי. קודם סגור אותו חלקית כדי להוריד ספיקה, ואז השווה.</p>'; }
      else { st.r = r; st.open = 1; const after = point(); cmp = `<div class="pg-status good">אותה ספיקה (${ltr(`${num(after.Q * 1000, 1)} L/s`)}): עם מגוף ${ltr(si(before.Pe, 'W'))}, עם מהירות ${ltr(`${num(r * 100, 0)}%`)} רק ${ltr(si(after.Pe, 'W'))}. חיסכון של ${ltr(`${num((1 - after.Pe / before.Pe) * 100, 0)}%`)}.</div>`; }
    } else if (b.dataset.act === 'reset') { Object.assign(st, defaults()); cmp = ''; }
    else return;
    save(); refresh(); out.insertAdjacentHTML('afterbegin', cmp);
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!f || !(f in LIM)) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    st[f] = Math.min(LIM[f][1], Math.max(LIM[f][0], v)); cmp = ''; save(); refresh(false);
  });
}
