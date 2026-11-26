// playground-motors.js: the playground's motors mode. DC motor (Lorentz force, commutator, back EMF,
// torque-speed line), three-phase induction motor (rotating field, slip, torque curve, V/f drive),
// single-phase motor with a capacitor, BLDC / stepper / servo, and motor control (DOL, star-delta, VFD, PWM).
// Math: js/machines.js (tests/machines-cases.mjs). Motor numbers are example values.
import { dcMotor, pwmAvg, syncRpm, kloss, smFromRated, inductionPoint, smAt, field3, starDelta, capMotor, field2, SRC } from './machines.js';
import { cabs } from './circuit.js';
import { esc } from './text.js';
import { ltr, si, num, slider, chips, plot, text, arrow, COL, go } from './elec-ui.js';

const KEY = 'mh-pg-motors-v1';
const TABS = [['dc', 'מנוע DC'], ['ind', 'השראה תלת-פאזי'], ['cap', 'חד-פאזי וקבל'], ['types', 'BLDC, צעד, סרבו'], ['ctrl', 'התנעה ובקרה']];
const DC = { Ra: 0.5, k: 0.1 }; // example 24 V motor
const IND = { poles: 4, sn: 0.04, b: 2.5 }; // example: rated slip 4%, Tmax = 2.5·Tn
const CAPM = { Rm: 10, Lm: 0.08, Ra: 20, La: 0.08 }; // example windings
const LIM = { V: [0, 24], T: [0, 4.8], f: [5, 50], load: [0, 2.4], C: [0, 150], D: [0, 1] };
const defaults = () => ({ tab: 'dc', V: 24, T: 0.5, f: 50, load: 1, ltype: 'const', C: 96, D: 0.5, step: 0 });
let st = null;
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') for (const k of Object.keys(st)) if (typeof s[k] === typeof st[k]) st[k] = s[k]; } catch (e) { /* ignore */ }
  if (!TABS.some(([v]) => v === st.tab)) st.tab = 'dc';
  for (const [k, [a, b]] of Object.entries(LIM)) st[k] = Math.min(b, Math.max(a, st[k]));
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
const sm0 = smFromRated(IND.sn, IND.b);
const TL = (n) => (st.ltype === 'fan' ? st.load * (n / 1500) ** 2 : st.load);

// ---------- drawings ----------
function dcSvg(ang, r) {
  const W = 360, H = 200, cx = 180, cy = 96, R = 52, c = Math.cos(ang), s = Math.sin(ang);
  let o = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="מנוע DC: לולאה בין מגנטים, קומוטטור ומברשות">`;
  o += `<rect x="40" y="46" width="50" height="100" rx="6" fill="#ef4444" opacity=".85"/><rect x="270" y="46" width="50" height="100" rx="6" fill="#3b82f6" opacity=".85"/>` + text(65, 100, 'N', '#fff', 'middle', 'pg-b') + text(295, 100, 'S', '#fff', 'middle', 'pg-b');
  for (let y = 60; y <= 132; y += 18) o += `<line x1="94" y1="${y}" x2="266" y2="${y}" stroke="var(--muted)" stroke-dasharray="3 5" opacity=".5"/>`;
  // the loop seen end on: two sides at ±R, current in one side, out of the other (the commutator keeps the side near N "in")
  const p1 = [cx + R * c, cy - R * s], p2 = [cx - R * c, cy + R * s]
  o += `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="var(--muted)" stroke-width="2" stroke-dasharray="4 3"/>`;
  const side = (p, into) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="9" class="pg-csym"/>${into ? `<path d="M${p[0] - 5},${p[1] - 5} L${p[0] + 5},${p[1] + 5} M${p[0] - 5},${p[1] + 5} L${p[0] + 5},${p[1] - 5}" class="pg-cw"/>` : `<circle cx="${p[0]}" cy="${p[1]}" r="2.5" fill="var(--text)"/>`}`;
  // the side on the right half carries current into the page, the left one out (commutator)
  const right = p1[0] >= cx ? p1 : p2, left = right === p1 ? p2 : p1;
  o += side(right, true) + side(left, false);
  if (r.Ia > 0.01) { const L = Math.min(40, 10 + r.Ia * 4); o += arrow(right[0], right[1], right[0], right[1] + L, COL.i, 2.4) + arrow(left[0], left[1], left[0], left[1] - L, COL.i, 2.4) + text(right[0] + 12, right[1] + L, 'F', COL.i, 'start', 'pg-b'); }
  // commutator and brushes
  o += `<circle cx="${cx}" cy="${cy}" r="12" class="pg-csym"/><line x1="${cx - 12}" y1="${cy}" x2="${cx + 12}" y2="${cy}" stroke="var(--muted)" transform="rotate(${(-ang * 180) / Math.PI} ${cx} ${cy})"/><rect x="${cx - 26}" y="${cy - 4}" width="12" height="8" fill="#111827"/><rect x="${cx + 14}" y="${cy - 4}" width="12" height="8" fill="#111827"/>`;
  o += text(cx, 178, `F = B·I·L ; T = k·Ia ; E = k·ω`, '', 'middle', 'pg-tn');
  return o + '</svg>';
}
function fieldSvg(t, rotorAng, twoPhase = null) {
  const W = 360, H = 200, cx = 180, cy = 100, R = 70;
  let o = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="שדה מגנטי מסתובב">`;
  o += `<circle cx="${cx}" cy="${cy}" r="${R + 14}" fill="none" class="pg-ruler" stroke-width="10"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" class="pg-ruler" stroke-dasharray="2 4"/>`;
  let F;
  if (twoPhase) {
    F = field2(t, twoPhase.d, 50, 1, twoPhase.aa);
    // the ellipse it traces
    let d = ''; for (let k = 0; k <= 60; k++) { const q = field2(k / 3000, twoPhase.d, 50, 1, twoPhase.aa); d += `${k ? 'L' : 'M'}${(cx + q.x * R * 0.8).toFixed(1)},${(cy - q.y * R * 0.8).toFixed(1)}`; }
    o += `<path d="${d}" fill="none" stroke="${COL.q}" stroke-dasharray="3 3"/>`;
    o += `<rect x="${cx - R - 20}" y="${cy - 10}" width="12" height="20" fill="${COL.ph[0]}"/><rect x="${cx + R + 8}" y="${cy - 10}" width="12" height="20" fill="${COL.ph[0]}"/><rect x="${cx - 10}" y="${cy - R - 20}" width="20" height="12" fill="${COL.ph[2]}"/><rect x="${cx - 10}" y="${cy + R + 8}" width="20" height="12" fill="${COL.ph[2]}"/>`;
    o += arrow(cx, cy, cx + F.x * R * 0.8, cy - F.y * R * 0.8, 'var(--text)', 3);
  } else {
    F = field3(t, 50);
    for (let k = 0; k < 3; k++) { const a = (k * 2 * Math.PI) / 3, b = Math.cos(2 * Math.PI * 50 * t - a); o += `<g transform="rotate(${(-a * 180) / Math.PI} ${cx} ${cy})"><rect x="${cx + R + 6}" y="${cy - 10}" width="14" height="20" fill="${COL.ph[k]}"/><rect x="${cx - R - 20}" y="${cy - 10}" width="14" height="20" fill="${COL.ph[k]}" opacity=".5"/></g>`; o += arrow(cx, cy, cx + b * Math.cos(a) * R * 0.5, cy - b * Math.sin(a) * R * 0.5, COL.ph[k], 1.6); }
    o += arrow(cx, cy, cx + (F.x / 1.5) * R * 0.85, cy - (F.y / 1.5) * R * 0.85, 'var(--text)', 3.2);
  }
  if (rotorAng !== null) o += `<circle cx="${cx + 30 * Math.cos(rotorAng)}" cy="${cy - 30 * Math.sin(rotorAng)}" r="6" fill="#f59e0b"/><circle cx="${cx}" cy="${cy}" r="34" fill="none" stroke="#f59e0b" stroke-width="1.4"/>`;
  return o + '</svg>' + `<p class="small muted">${twoPhase ? 'אדום: הסליל הראשי, כחול: סליל העזר, חץ שחור: השדה, הקו המקווקו: המסלול שלו.' : 'צבעים: השדה של כל סליל, חץ שחור: השדה הכולל, כתום: הרוטור (ההחלקה מוגדלת בשרטוט).'}</p>`;
}

export function renderMotors(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>⚙ מנועים</h2><p class="small muted">איך זרם הופך לסיבוב: כוח על מוליך בשדה מגנטי, שדה מסתובב, ואיך מתניעים ושולטים במהירות.</p>
      <div class="pg-templates">${TABS.map(([v, t]) => `<button class="chip" data-tab="${v}" aria-pressed="${st.tab === v}">${esc(t)}</button>`).join('')}</div></div>
    <div class="card pg-stage"><div id="moDraw"></div><div id="moPlot"></div></div>
    <div class="card" id="moEd"></div>
    <div class="card" id="moRes"></div>`;
  const dr = root.querySelector('#moDraw'), pv = root.querySelector('#moPlot'), ed = root.querySelector('#moEd'), out = root.querySelector('#moRes');
  let raf = 0, last = 0, ang = 0.3, tt = 0;
  const dcNow = () => dcMotor({ V: st.V, ...DC, T: st.T });
  const indNow = () => inductionPoint({ f: st.f, poles: IND.poles, Tmax: IND.b, sm: smAt(sm0, 50, st.f), TL });
  const editor = () => {
    if (st.tab === 'dc') return slider('V', 'מתח', ltr(`${num(st.V, 1)} V`), LIM.V, 0.5, st.V) + slider('T', 'מומנט עומס', ltr(`${num(st.T, 2)} N·m`), LIM.T, 0.05, st.T) + `<p class="small muted">מנוע לדוגמה: ${ltr(`Ra = ${DC.Ra} Ω, k = ${DC.k} V·s/rad`)}.</p>`;
    if (st.tab === 'ind') return slider('f', 'תדר (ממיר תדר, V/f קבוע)', ltr(`${num(st.f, 0)} Hz`), LIM.f, 1, st.f) + slider('load', 'עומס (ביחס לנקוב)', ltr(`${num(st.load, 2)}·Tn`), LIM.load, 0.05, st.load) + chips([['const', 'מומנט קבוע (מסוע)'], ['fan', 'מאוורר / משאבה (∝ n²)']], st.ltype, 'ltype') + `<p class="small muted">מנוע לדוגמה: 4 קטבים, החלקה נקובה ${ltr('4%')}, ${ltr('Tmax = 2.5·Tn')}.</p>`;
    if (st.tab === 'cap') return slider('C', 'קבל בסליל העזר', ltr(`${num(st.C, 0)} µF`), LIM.C, 1, st.C) + `<p class="small muted">ליפופים לדוגמה: ראשי ${ltr(`${CAPM.Rm} Ω, ${CAPM.Lm * 1000} mH`)}, עזר ${ltr(`${CAPM.Ra} Ω, ${CAPM.La * 1000} mH`)}.</p>`;
    if (st.tab === 'ctrl') return slider('D', 'PWM: מחזור עבודה D', ltr(`${num(st.D * 100, 0)}%`), LIM.D, 0.01, st.D);
    return '<div class="chips"><button class="chip" data-act="step">▶ צעד אחד במנוע הצעד</button></div>';
  };
  function results() {
    if (st.tab === 'dc') {
      const r = dcNow();
      return `<h3 class="pg-h">מנוע DC</h3><div class="pg-max"><div><span>מהירות</span><b>${ltr(`${num(r.n, 0)} rpm`)}</b><small class="muted">${ltr(`ω = ${num(r.w, 1)} rad/s`)}</small></div><div><span>זרם</span><b>${ltr(`Ia = T/k = ${num(r.Ia, 2)} A`)}</b></div><div><span>כא"מ נגדי</span><b>${ltr(`E = kω = ${num(r.E, 2)} V`)}</b></div><div><span>נצילות</span><b>${ltr(`${num(r.eta * 100, 0)}%`)}</b><small class="muted">${ltr(`Pin ${si(r.Pin, 'W')} → Pout ${si(r.Pout, 'W')}`)}</small></div><div><span>זרם התנעה</span><b>${ltr(`V/Ra = ${num(r.Istart, 0)} A`)}</b></div><div><span>מהירות בלי עומס</span><b>${ltr(`${num((r.w0 * 60) / (2 * Math.PI), 0)} rpm`)}</b></div></div>
        <p class="small">זרם במוליך שנמצא בשדה מגנטי מרגיש כוח ${ltr('F = B·I·L')} (כוח לורנץ). שני צדי הלולאה מרגישים כוחות הפוכים, וזה מומנט. <b>הקומוטטור</b> הופך את כיוון הזרם בלולאה בכל חצי סיבוב, כך שהמומנט תמיד באותו כיוון.</p>
        <p class="small">כשהמנוע מסתובב הוא גם גנרטור: נוצר בו <b>כא"מ נגדי</b> ${ltr('E = kω')} שמתנגד למתח. ${ltr('V = E + Ia·Ra')}. בעמידה E = 0, ולכן זרם ההתנעה עצום (${ltr(`${num(r.Istart, 0)} A`)} כאן). ככל שהעומס גדל, המנוע מאט, E קטן, והזרם עולה בדיוק כדי לתת את המומנט: ${ltr('T = k·Ia')}.</p>`;
    }
    if (st.tab === 'ind') {
      const ns = syncRpm(st.f, IND.poles), op = indNow();
      return `<h3 class="pg-h">מנוע השראה תלת-פאזי</h3><div class="pg-max"><div><span>מהירות סינכרונית</span><b>${ltr(`ns = 120f/p = ${num(ns, 0)} rpm`)}</b></div><div><span>מהירות הרוטור</span><b>${op ? ltr(`${num(op.n, 0)} rpm`) : '<span style="color:var(--bad)">נעצר</span>'}</b></div><div><span>החלקה</span><b>${op ? ltr(`s = ${num(op.s * 100, 1)}%`) : '—'}</b></div><div><span>מומנט</span><b>${op ? ltr(`${num(op.T, 2)}·Tn`) : `${ltr('> Tmax')}`}</b></div></div>
        <p class="small">שלושה סלילים, מוזזים ב-120° במרחב ומוזנים בזרמים מוזזים ב-120° בזמן, יוצרים יחד שדה בגודל קבוע שמסתובב ב-${ltr('ns')}. השדה משרה זרמים במוטות של הרוטור, ואלה נמשכים אחריו. הרוטור תמיד קצת <b>מאחור</b>: אם היה מגיע ל-${ltr('ns')}, לא היה שינוי שטף, לא זרם ולא מומנט. ההפרש היחסי הוא ההחלקה ${ltr('s = (ns − n)/ns')}.</p>
        <p class="small">ממיר תדר (VFD) משנה את f, ולכן את ${ltr('ns')}, ושומר ${ltr('V/f')} קבוע כדי שהשטף והמומנט המרבי יישארו. עומס מעל ${ltr('Tmax')} עוצר את המנוע (והמגנים צריכים לנתק).</p>`;
    }
    if (st.tab === 'cap') {
      const m = capMotor({ ...CAPM, C: st.C * 1e-6 });
      return `<h3 class="pg-h">מנוע חד-פאזי עם קבל</h3><div class="pg-max"><div><span>הפרש פאזה בין הזרמים</span><b>${ltr(`${num(m.shift, 0)}°`)}</b></div><div><span>זרם ראשי / עזר</span><b>${ltr(`${num(cabs(m.Im), 1)} A / ${num(cabs(m.Ia), 1)} A`)}</b></div></div>
        <p class="small">בחד-פאזי יש רק זרם אחד, ולכן סליל אחד יוצר שדה <b>פועם</b> לאורך קו, לא מסתובב: אין מומנט התנעה, והמנוע רק מזמזם. מוסיפים סליל עזר בזווית 90°, ובטור אליו <b>קבל</b> שמקדים את הזרם שלו. כשההפרש קרוב ל-90°, השדה מסתובב (המעגל המקווקו), והמנוע מתניע.</p>
        <p class="small">${st.C < 1 ? 'עכשיו אין קבל: ההפרש קטן, השדה הוא אליפסה צרה, ומומנט ההתנעה חלש.' : Math.abs(m.shift - 90) < 15 ? 'כאן ההפרש קרוב ל-90°: השדה כמעט מעגל.' : 'נסה לשנות את הקבל עד שההפרש קרוב ל-90°.'} כך עובדים מדחס של מקרר ומזגן, משאבות ומאווררים. קבל התנעה גדול מתנתק אחרי ההתנעה, קבל הרצה נשאר.</p>`;
    }
    if (st.tab === 'types') return `<h3 class="pg-h">BLDC, מנוע צעד וסרבו</h3>
      <p class="small"><b>BLDC (מנוע DC ללא מברשות):</b> המגנטים על הרוטור, הסלילים בסטטור, ובמקום קומוטטור יש בקר אלקטרוני שמחליף את הזרם בסלילים לפי חיישני מיקום (Hall) או לפי הכא"מ הנגדי. אין מברשות שנשחקות, יעילות גבוהה ושקט. נפוץ במאווררים, ברחפנים, במדחסי אינוורטר, ובמכשור רפואי כמו מפוחים ומשאבות.</p>
      <p class="small"><b>מנוע צעד:</b> כל פולס מזיז אותו בזווית קבועה (נפוץ: ${ltr('1.8°')}, כלומר 200 צעדים לסיבוב). שליטה במיקום בלי חיישן, כל עוד העומס לא גורם לו "לפספס" צעדים. נפוץ במדפסות תלת-ממד, בשולחנות CNC ובמשאבות עירוי ומזרקים.</p>
      <p class="small"><b>סרבו:</b> מנוע (לרוב BLDC) עם חיישן מיקום (encoder) ובקר בחוג סגור: הבקר משווה כל הזמן מיקום רצוי למיקום אמיתי ומתקן. דיוק ומהירות תגובה. נפוץ ברובוטים, במפעילים (actuators) ובמערכות ייצוב בתעשייה הביטחונית.</p>
      <p class="small muted">ההבדל העיקרי לתכן: צעד זול ופשוט אבל בלי משוב, סרבו מדויק ויקר, BLDC למהירות ויעילות.</p>`;
    const Vav = pwmAvg(st.D, 24), dc = dcMotor({ V: Vav, ...DC, T: 0.3 });
    return `<h3 class="pg-h">התנעה ובקרת מהירות</h3>
      <table class="pg-table"><thead><tr><th>שיטה</th><th>זרם התנעה</th><th>מתי</th></tr></thead><tbody>
      <tr><td>התנעה ישירה (DOL)</td><td>${ltr('6 עד 8·In')} (טיפוסי)</td><td>מנועים קטנים, רשת חזקה</td></tr>
      <tr><td>כוכב-משולש</td><td>${ltr(`${num(starDelta.I * 100, 0)}%`)} מ-DOL, וגם המומנט</td><td>מנועים בינוניים, התנעה בלי עומס כבד</td></tr>
      <tr><td>ממיר תדר (VFD)</td><td>בערך ${ltr('In')}</td><td>כשצריך גם לשנות מהירות: משאבות, מאווררים, מסועים</td></tr></tbody></table>
      <p class="small">בכוכב, כל ליפוף מקבל ${ltr('1/√3')} מהמתח, ולכן ${ltr('(1/√3)² = 1/3')} מהזרם ומהמומנט. אחרי שהמנוע תופס מהירות, מעבירים למשולש (ראה ${go('three', '⚡⚡⚡ תלת-פאזי')}). ערכי זרם ההתנעה הם טיפוסיים לדוגמה.</p>
      <h3 class="pg-h">PWM למנוע DC</h3><div class="pg-max"><div><span>מתח ממוצע</span><b>${ltr(`D·V = ${num(Vav, 1)} V`)}</b></div><div><span>מהירות (מנוע לדוגמה, עומס קטן)</span><b>${ltr(`${num(Math.max(0, dc.n), 0)} rpm`)}</b></div></div>
      <p class="small">מדליקים ומכבים את המתח המלא אלפי פעמים בשנייה. ההשראות של המנוע מחליקה את הזרם, והמנוע "רואה" את הממוצע ${ltr('D·V')}. הטרנזיסטור או מלא או ריק, ולכן כמעט לא מתחמם: זו הסיבה ש-PWM יעיל הרבה יותר מנגד טורי.</p>`;
  }
  const draw = (t = tt) => {
    if (st.tab === 'dc') {
      dr.innerHTML = dcSvg(ang, dcNow());
      const xs = [], ys = []; for (let k = 0; k <= 40; k++) { const T = (4.8 * k) / 40; xs.push(T); ys.push(Math.max(0, dcMotor({ V: st.V, ...DC, T }).n)); }
      pv.innerHTML = plot({ xs, series: [{ ys, col: COL.v, label: 'n(T)' }], units: { x: 'T [N·m]', l: 'rpm' }, marks: [{ x: st.T, label: `${num(dcNow().n, 0)} rpm`, col: COL.i }] });
    } else if (st.tab === 'ind') {
      const ns = syncRpm(st.f, IND.poles), op = indNow(), sm = smAt(sm0, 50, st.f);
      dr.innerHTML = fieldSvg(t * (st.f / 50) / 40, op ? (2 * Math.PI * 50 * (t / 40) * (st.f / 50)) * (1 - Math.min(0.5, op.s * 4)) : 0);
      const xs = [], Tm = [], Tl = []; for (let k = 0; k <= 80; k++) { const n = (1500 * 1.02 * k) / 80; xs.push(n); Tm.push(n < ns ? kloss(1 - n / ns, IND.b, sm) : 0); Tl.push(TL(n)); }
      pv.innerHTML = plot({ xs, series: [{ ys: Tm, col: COL.v, label: 'T מנוע' }, { ys: Tl, col: COL.i, label: 'T עומס' }], units: { x: 'rpm', l: 'T/Tn' }, marks: op ? [{ x: op.n, label: `${num(op.n, 0)}`, col: COL.p }] : [] });
    } else if (st.tab === 'cap') {
      const m = capMotor({ ...CAPM, C: st.C * 1e-6 });
      dr.innerHTML = fieldSvg(t / 40, null, { d: m.shift, aa: Math.min(1.4, cabs(m.Ia) / Math.max(1e-6, cabs(m.Im))) });
      pv.innerHTML = '';
    } else if (st.tab === 'types') {
      const a = (st.step * 1.8 * 10 * Math.PI) / 180; // drawn 10× bigger so a step is visible
      let o = `<svg viewBox="0 0 360 170" class="pg-svg" role="img" aria-label="מנוע צעד"><circle cx="180" cy="85" r="60" fill="none" class="pg-ruler" stroke-width="8"/>`;
      for (let k = 0; k < 8; k++) { const q = (k * Math.PI) / 4; o += `<rect x="${180 + 62 * Math.cos(q) - 7}" y="${85 - 62 * Math.sin(q) - 7}" width="14" height="14" fill="${k % 2 === st.step % 2 ? '#f59e0b' : 'var(--muted)'}" opacity=".8"/>`; }
      o += `<line x1="180" y1="85" x2="${180 + 45 * Math.cos(a)}" y2="${85 - 45 * Math.sin(a)}" stroke="var(--text)" stroke-width="4" stroke-linecap="round"/><circle cx="180" cy="85" r="6" fill="var(--text)"/>` + text(180, 165, `צעד ${st.step} (מוגדל פי 10 בשרטוט: ${num(st.step * 1.8, 1)}°)`, '', 'middle', 'pg-tn') + '</svg>';
      dr.innerHTML = o; pv.innerHTML = '';
    } else {
      dr.innerHTML = '';
      const xs = [], ys = [], av = []; for (let k = 0; k <= 200; k++) { const x = (k / 200) * 3; xs.push(x); ys.push(x % 1 < st.D ? 24 : 0); av.push(pwmAvg(st.D, 24)); }
      pv.innerHTML = plot({ xs, series: [{ ys, col: COL.v, label: 'PWM', w: 1.6 }, { ys: av, col: COL.i, label: 'ממוצע', dash: '5 3' }], units: { x: 'מחזורים', l: 'V' } });
    }
  };
  const refresh = (full = true) => {
    draw(); out.innerHTML = results();
    root.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === st.tab)));
    if (full) ed.innerHTML = editor();
    else { const tmp = document.createElement('div'); tmp.innerHTML = editor(); const nb = tmp.querySelectorAll('.pg-range b'); ed.querySelectorAll('.pg-range b').forEach((b, i) => { if (nb[i]) b.innerHTML = nb[i].innerHTML; }); }
  };
  refresh();
  const tick = (now) => {
    if (!root.isConnected) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    if (dt && (st.tab === 'dc' || st.tab === 'ind' || st.tab === 'cap')) {
      tt += dt;
      if (st.tab === 'dc') ang -= dt * Math.max(0, dcNow().w) / 40; // slowed 40×; F = I·L×B: right side down, left side up → clockwise
      draw();
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  root.addEventListener('click', (ev) => {
    const tb = ev.target.closest('[data-tab]'), b = ev.target.closest('[data-act]');
    if (tb) st.tab = tb.dataset.tab;
    else if (b && b.dataset.act === 'ltype') st.ltype = b.dataset.v;
    else if (b && b.dataset.act === 'step') st.step = (st.step + 1) % 200;
    else return;
    save(); refresh();
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!f || !(f in LIM)) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    st[f] = Math.min(LIM[f][1], Math.max(LIM[f][0], v)); save(); refresh(false);
  });
  return () => cancelAnimationFrame(raf);
}
