// playground-appliances.js: the playground's home appliances mode. Each appliance in two linked layers:
// the electric circuit (switches you can flip) and what it drives (the refrigeration cycle, the water tank,
// the drum). Generic, educational diagrams: not of any maker. Formulas: heatTime, carnotCOP in js/machines.js.
import { heatTime, carnotCOP, SRC } from './machines.js';
import { esc } from './text.js';
import { ltr, num, slider, chips, text, wire, HOME_SAFETY, go, morph } from './elec-ui.js';

const KEY = 'mh-pg-appl-v1';
const APPS = [['fridge', '🧊 מקרר'], ['ac', '❄ מזגן'], ['boiler', '🛢 דוד חשמל'], ['washer', '🌀 מכונת כביסה']];
const WSTAGES = [['fill', 'מילוי'], ['heat', 'חימום'], ['wash', 'כביסה'], ['drain', 'ריקון'], ['spin', 'סחיטה']];
const defaults = () => ({ app: 'fridge', warm: 1, defrost: 0, door: 0, mode: 'cool', inverter: 1, speed: 60, acOn: 1, bOn: 1, vol: 120, P: 2500, T: 20, stage: 'wash', lock: 1 });
let st = null;
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') for (const k of Object.keys(st)) if (typeof s[k] === typeof st[k]) st[k] = s[k]; } catch (e) { /* ignore */ }
  if (!APPS.some(([v]) => v === st.app)) st.app = 'fridge';
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };

// dots moving along a closed polyline: the refrigerant (or water) flow
function along(pts, u) {
  const segs = []; let L = 0;
  for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); segs.push(l); L += l; }
  let d = (((u % 1) + 1) % 1) * L;
  for (let i = 0; i < segs.length; i++) { if (d <= segs[i]) { const t = d / segs[i]; return [pts[i][0] + t * (pts[i + 1][0] - pts[i][0]), pts[i][1] + t * (pts[i + 1][1] - pts[i][1])]; } d -= segs[i]; }
  return pts[0];
}
const dots = (pts, phase, n, col) => { let s = ''; for (let k = 0; k < n; k++) { const [x, y] = along(pts, phase + k / n); s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${col}"/>`; } return s; };
const poly = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join('');
const sw = (x, y, on, key, lab) => `<g data-tog="${key}" class="pg-wsw"><rect x="${x - 6}" y="${y - 22}" width="46" height="36" fill="transparent"/><circle cx="${x}" cy="${y}" r="3.5" class="pg-wterm"/><circle cx="${x + 30}" cy="${y}" r="3.5" class="pg-wterm"/><line x1="${x}" y1="${y}" x2="${x + 28}" y2="${on ? y : y - 14}" class="pg-cw" style="stroke-width:3"/></g>` + (lab ? text(x + 15, y + 16, lab, 'var(--muted)', 'middle', 'pg-tn') : '');
const load2 = (x, y, lab, on, col = '#f59e0b') => `<rect x="${x}" y="${y - 12}" width="58" height="24" rx="6" class="pg-csym" ${on ? `style="stroke:${col};stroke-width:3"` : ''}/>` + text(x + 29, y + 4, lab, on ? col : 'var(--muted)', 'middle', 'pg-tn');

function fridge(phase) {
  const comp = st.warm && !st.defrost, heater = !!st.defrost, lamp = !!st.door;
  let e = `<svg viewBox="0 0 360 190" class="pg-svg" role="img" aria-label="המעגל החשמלי של מקרר">`;
  e += wire('M10,30 L350,30', 'L', 2.5) + wire('M10,176 L350,176', 'N', 2.5) + text(14, 22, 'L', '', 'start', 'pg-tn') + text(14, 170, 'N', '', 'start', 'pg-tn');
  // door switch and lamp
  e += wire('M30,30 L30,56', 'L', 2) + sw(30, 56, lamp, 'door', 'מפסק דלת') + wire('M60,56 L70,56 L70,80', 'L', 2) + `<circle cx="70" cy="92" r="10" class="pg-csym" ${lamp ? 'style="fill:#facc15"' : ''}/>` + wire('M70,102 L70,176', 'N', 2);
  // thermostat → defrost timer (two-way)
  e += wire('M120,30 L120,60', 'L', 2) + sw(120, 60, !!st.warm, 'warm', 'תרמוסטט') + wire('M150,60 L170,60', 'L', 2);
  e += `<g data-tog="defrost" class="pg-wsw"><rect x="164" y="40" width="50" height="60" fill="transparent"/><circle cx="170" cy="60" r="3.5" class="pg-wterm"/><circle cx="204" cy="46" r="3.5" class="pg-wterm"/><circle cx="204" cy="78" r="3.5" class="pg-wterm"/><line x1="170" y1="60" x2="202" y2="${st.defrost ? 77 : 47}" class="pg-cw" style="stroke-width:3"/></g>` + text(188, 98, 'טיימר הפשרה', 'var(--muted)', 'middle', 'pg-tn');
  e += wire('M204,46 L230,46', 'L', 2) + `<rect x="230" y="38" width="22" height="16" rx="3" class="pg-csym"/>` + text(241, 33, 'מגן', 'var(--muted)', 'middle', 'pg-tn') + wire('M252,46 L262,46', 'L', 2) + load2(262, 46, 'מדחס', comp) + wire('M320,46 L340,46 L340,176', 'N', 2);
  e += text(291, 68, 'ממסר התנעה', 'var(--muted)', 'middle', 'pg-tn') + wire('M246,54 L246,120 L262,120', 'L', 2) + load2(262, 120, 'מאוורר', comp, '#06b6d4') + wire('M320,120 L340,120', 'N', 2);
  e += wire('M204,78 L216,78 L216,150 L262,150', 'L', 2) + load2(262, 150, 'גוף הפשרה', heater, '#ef4444') + wire('M320,150 L340,150', 'N', 2);
  e += '</svg>';
  // the cycle
  const loop = [[300, 150], [300, 40], [100, 40], [100, 70], [60, 70], [60, 120], [200, 120], [200, 150], [300, 150]];
  let c = `<svg viewBox="0 0 360 180" class="pg-svg" role="img" aria-label="מחזור הקירור במקרר">`;
  c += `<rect x="20" y="58" width="210" height="80" rx="8" fill="#38bdf8" opacity=".12"/>` + text(125, 155, 'בתוך המקרר: מאדה (קולט חום)', '#0284c7', 'middle', 'pg-tn');
  c += `<path d="${poly(loop.slice(0, 3))}" fill="none" stroke="#ef4444" stroke-width="5"/><path d="${poly(loop.slice(2, 5))}" fill="none" stroke="#f59e0b" stroke-width="2"/><path d="${poly(loop.slice(4, 7))}" fill="none" stroke="#3b82f6" stroke-width="5"/><path d="${poly(loop.slice(6))}" fill="none" stroke="#93c5fd" stroke-width="4"/>`;
  c += `<circle cx="300" cy="150" r="18" class="pg-csym" ${comp ? 'style="stroke:#f59e0b;stroke-width:3"' : ''}/>` + text(300, 154, 'מדחס', '', 'middle', 'pg-tn');
  c += text(200, 30, 'מעבה (בגב המקרר: פולט חום)', '#ef4444', 'middle', 'pg-tn') + `<rect x="94" y="36" width="12" height="10" fill="var(--text)"/>` + text(100, 24, 'מייבש', 'var(--muted)', 'middle', 'pg-tn') + text(80, 88, 'נימית', '#f59e0b', 'middle', 'pg-tn');
  if (comp) c += dots(loop, phase, 14, 'var(--text)');
  if (heater) c += `<path d="M60,128 L200,128" stroke="#ef4444" stroke-width="3" stroke-dasharray="6 3"/>` + text(130, 172, 'ההפשרה מחממת את המאדה ומפשירה את הקרח', '#ef4444', 'middle', 'pg-tn');
  c += text(305, 120, 'קו יניקה', '#3b82f6', 'end', 'pg-tn');
  return { e, c: c + '</svg>' };
}
function ac(phase) {
  const run = !!st.acOn, heat = st.mode === 'heat', sp = st.inverter ? st.speed / 100 : 1;
  let e = `<svg viewBox="0 0 360 170" class="pg-svg" role="img" aria-label="המעגל החשמלי של מזגן">`;
  e += wire('M10,24 L350,24', 'L', 2.5) + wire('M10,158 L350,158', 'N', 2.5) + `<rect x="20" y="40" width="90" height="100" rx="8" class="pg-csym"/>` + text(65, 60, 'כרטיס בקרה', '', 'middle', 'pg-tn') + text(65, 78, 'חיישני טמפ׳', 'var(--muted)', 'middle', 'pg-tn') + wire('M40,24 L40,40', 'L', 2) + wire('M40,140 L40,158', 'N', 2);
  e += sw(60, 110, run, 'acOn', 'הפעלה');
  const rows = [[44, st.inverter ? 'מדחס (אינוורטר)' : 'מדחס + קבל הרצה', run], [76, 'מאוורר חוץ + קבל', run], [108, 'מאוורר פנים', run], [140, 'סליל שסתום 4 דרכים', run && heat]];
  for (const [y, lab, on] of rows) e += wire(`M110,${y} L190,${y}`, 'L', 2) + `<rect x="190" y="${y - 12}" width="140" height="24" rx="6" class="pg-csym" ${on ? 'style="stroke:#f59e0b;stroke-width:3"' : ''}/>` + text(260, y + 4, lab, on ? '#d97706' : 'var(--muted)', 'middle', 'pg-tn');
  e += '</svg>';
  // cycle: indoor coil (left), outdoor coil (right), the 4-way valve swaps the direction through them
  const outd = [[250, 40], [250, 140]], ind = [[100, 140], [100, 40]];
  let c = `<svg viewBox="0 0 360 190" class="pg-svg" role="img" aria-label="מחזור הקירור במזגן">`;
  c += `<rect x="20" y="20" width="140" height="140" rx="10" fill="#38bdf8" opacity=".08"/><rect x="200" y="20" width="140" height="140" rx="10" fill="#f59e0b" opacity=".08"/>` + text(90, 178, 'יחידה פנימית (בחדר)', '', 'middle', 'pg-tn') + text(270, 178, 'יחידה חיצונית', '', 'middle', 'pg-tn');
  const indCol = heat ? '#ef4444' : '#3b82f6', outCol = heat ? '#3b82f6' : '#ef4444';
  c += `<path d="M100,40 L100,140" stroke="${indCol}" stroke-width="7"/><path d="M250,40 L250,140" stroke="${outCol}" stroke-width="7"/>`;
  c += text(70, 95, heat ? 'מעבה' : 'מאדה', indCol, 'middle', 'pg-b') + text(290, 95, heat ? 'מאדה' : 'מעבה', outCol, 'middle', 'pg-b');
  c += `<circle cx="175" cy="40" r="14" class="pg-csym"/>` + text(175, 44, '4W', '', 'middle', 'pg-tn') + `<circle cx="175" cy="110" r="16" class="pg-csym" ${run ? 'style="stroke:#f59e0b;stroke-width:3"' : ''}/>` + text(175, 114, 'מדחס', '', 'middle', 'pg-tn') + `<rect x="165" y="134" width="20" height="12" fill="var(--text)"/>` + text(175, 128, 'מצערת', 'var(--muted)', 'middle', 'pg-tn');
  c += `<path d="M100,40 L161,40 M189,40 L250,40 M175,54 L175,94 M100,140 L165,140 M185,140 L250,140" fill="none" stroke="var(--muted)" stroke-width="2"/>`;
  // flow: compressor → 4W → condenser → throttle → evaporator → 4W → compressor
  const cool = [[175, 94], [175, 54], [189, 40], [250, 40], [250, 140], [185, 140], [165, 140], [100, 140], [100, 40], [161, 40], [175, 54], [175, 94]];
  const warm = [[175, 94], [175, 54], [161, 40], [100, 40], [100, 140], [165, 140], [185, 140], [250, 140], [250, 40], [189, 40], [175, 54], [175, 94]];
  if (run) c += dots(heat ? warm : cool, phase * sp, 16, 'var(--text)');
  c += text(180, 14, heat ? 'חימום: השסתום הופך את הכיוון, החדר מקבל את החום' : 'קירור: החום נלקח מהחדר ונפלט בחוץ', '', 'middle', 'pg-tn');
  return { e, c: c + '</svg>' };
}
function boiler() {
  const m = st.vol, t = heatTime(m, 4186, 60 - st.T, st.P), heat = !!st.bOn;
  let e = `<svg viewBox="0 0 360 120" class="pg-svg" role="img" aria-label="המעגל החשמלי של דוד">`;
  e += wire('M10,30 L40,30', 'L', 2.5) + wire('M10,100 L330,100', 'N', 2.5) + sw(40, 30, heat, 'bOn', 'מפסק ושעון שבת') + wire('M70,30 L130,30', 'L', 2.5) + `<rect x="130" y="20" width="56" height="22" rx="4" class="pg-csym"/>` + text(158, 35, 'תרמוסטט', '', 'middle', 'pg-tn') + wire('M186,30 L210,30', 'L', 2.5) + `<rect x="210" y="20" width="56" height="22" rx="4" class="pg-csym"/>` + text(238, 35, 'מפסק טרמי', '', 'middle', 'pg-tn') + wire('M266,30 L300,30 L300,52', 'L', 2.5);
  e += `<path d="M290,52 l20,6 l-20,6 l20,6 l-20,6 l20,6" fill="none" stroke="${heat ? '#ef4444' : 'var(--muted)'}" stroke-width="3"/>` + wire('M300,88 L300,100', 'N', 2.5) + text(330, 74, 'גוף חימום', '', 'end', 'pg-tn') + '</svg>';
  let c = `<svg viewBox="0 0 360 180" class="pg-svg" role="img" aria-label="מכל הדוד"><rect x="120" y="14" width="120" height="150" rx="40" class="pg-csym"/><rect x="128" y="22" width="104" height="134" rx="34" fill="url(#bgrad)"/>`;
  c += `<defs><linearGradient id="bgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ef4444" stop-opacity="${heat ? 0.55 : 0.3}"/><stop offset="1" stop-color="#3b82f6" stop-opacity=".45"/></linearGradient></defs>`;
  c += `<path d="M150,140 l60,0 l0,-12 l-60,0" fill="none" stroke="${heat ? '#ef4444' : 'var(--muted)'}" stroke-width="4"/>` + text(180, 124, 'גוף חימום', '', 'middle', 'pg-tn');
  c += `<path d="M240,40 L320,40" stroke="#ef4444" stroke-width="5"/>` + text(320, 32, 'חם החוצה', '#ef4444', 'end', 'pg-tn') + `<path d="M40,150 L120,150" stroke="#3b82f6" stroke-width="5"/>` + text(40, 142, 'קר נכנס', '#3b82f6', 'start', 'pg-tn');
  c += text(180, 176, `${m} L (לדוגמה): חימום מ-${st.T} ל-60 °C (יעד לדוגמה) בערך ${num(t / 3600, 1)} שעות`, '', 'middle', 'pg-tn') + '</svg>';
  return { e, c, t };
}
function washer(phase) {
  const s = st.stage, ok = !!st.lock, on = (k) => ok && s === k;
  let e = `<svg viewBox="0 0 360 200" class="pg-svg" role="img" aria-label="המעגל החשמלי של מכונת כביסה">`;
  e += wire('M10,24 L40,24', 'L', 2.5) + wire('M10,190 L350,190', 'N', 2.5) + sw(40, 24, ok, 'lock', 'נעילת דלת') + wire('M70,24 L90,24 L90,40', 'L', 2.5) + `<rect x="60" y="40" width="70" height="140" rx="8" class="pg-csym"/>` + text(95, 64, 'בקר', '', 'middle', 'pg-tn') + text(95, 80, 'תוכנית', 'var(--muted)', 'middle', 'pg-tn');
  const rows = [[44, 'ברז מים (סולנואיד)', on('fill'), '#3b82f6'], [76, 'גוף חימום', on('heat'), '#ef4444'], [108, 'מנוע התוף', on('wash') || on('spin'), '#f59e0b'], [140, 'משאבת ריקון', on('drain'), '#06b6d4'], [172, 'מפסק לחץ (מפלס מים)', ok && s !== 'drain' && s !== 'spin', '#16a34a']];
  for (const [y, lab, a, col] of rows) e += wire(`M130,${y} L190,${y}`, 'L', 2) + `<rect x="190" y="${y - 12}" width="150" height="24" rx="6" class="pg-csym" ${a ? `style="stroke:${col};stroke-width:3"` : ''}/>` + text(265, y + 4, lab, a ? col : 'var(--muted)', 'middle', 'pg-tn');
  e += '</svg>';
  const water = { fill: 0.45, heat: 0.45, wash: 0.45, drain: 0.15, spin: 0 }[s] * (ok ? 1 : 0), rot = ok ? (s === 'spin' ? phase * 40 : s === 'wash' ? Math.sin(phase * 6) * 1.2 : 0) : 0;
  let c = `<svg viewBox="0 0 360 180" class="pg-svg" role="img" aria-label="התוף"><rect x="90" y="10" width="180" height="160" rx="12" class="pg-csym"/><circle cx="180" cy="90" r="60" fill="none" stroke="var(--muted)" stroke-width="4"/>`;
  if (water > 0) c += `<clipPath id="wclip"><circle cx="180" cy="90" r="58"/></clipPath><rect x="120" y="${148 - 116 * water}" width="120" height="${116 * water}" fill="#3b82f6" opacity=".35" clip-path="url(#wclip)"/>`;
  c += `<g transform="rotate(${((rot * 180) / Math.PI).toFixed(1)} 180 90)">${[0, 120, 240].map((a) => `<rect x="176" y="34" width="8" height="18" fill="var(--text)" transform="rotate(${a} 180 90)"/>`).join('')}</g>`;
  if (on('heat')) c += `<path d="M140,140 l80,0" stroke="#ef4444" stroke-width="4" stroke-dasharray="6 3"/>`;
  if (on('fill')) c += `<path d="M180,10 L180,30" stroke="#3b82f6" stroke-width="4"/>`;
  if (on('drain')) c += `<path d="M230,165 L300,165" stroke="#06b6d4" stroke-width="4"/>`;
  return { e, c: c + '</svg>' };
}

function explain(extra) {
  switch (st.app) {
    case 'fridge': return `<h3 class="pg-h">מקרר</h3><p class="small"><b>המעגל:</b> התרמוסטט סגור כשחם מדי בפנים. דרכו עובר הזרם לטיימר ההפשרה, שבדרך כלל מזין את <b>המדחס</b> (דרך מגן עומס יתר וממסר התנעה שמחבר לרגע את ליפוף ההתנעה) ואת המאוורר, ופעם בכמה שעות עובר ל<b>גוף ההפשרה</b>. מפסק הדלת מדליק את הנורה. לחץ על המפסקים.</p>
      <p class="small"><b>המחזור:</b> המדחס דוחס גז ומחמם אותו. במעבה (הרשת בגב) הגז פולט חום לחדר ומתעבה לנוזל. המייבש לוכד לחות. הנימית, צינור דק וארוך, מורידה את הלחץ, והנוזל מתאדה במאדה בתוך המקרר: אידוי לוקח חום, ולכן בפנים קר. הגז חוזר בקו היניקה למדחס.</p>
      <p class="small muted">גבול עליון (Carnot): ${ltr(`COP = Tc/(Th − Tc)`)}, למשל ${ltr('−18 °C')} בפנים ו-${ltr('35 °C')} במעבה: ${ltr(`COP ≤ ${num(carnotCOP(255.15, 308.15), 1)}`)} (${esc(SRC.cb)}). מקרר אמיתי פחות מזה. המבנה כללי ולימודי.</p>`;
    case 'ac': return `<h3 class="pg-h">מזגן</h3><p class="small">אותו מחזור כמו במקרר, בשתי יחידות. בקירור, הסליל בחדר הוא המאדה (קולט חום) והסליל בחוץ הוא המעבה. <b>שסתום ארבע-דרכי</b> הופך את כיוון הזרימה, וכך באותו מזגן הסליל בחדר נעשה מעבה, והחדר מתחמם (משאבת חום).</p>
      <p class="small"><b>רגיל מול אינוורטר:</b> במזגן רגיל המדחס דולק במלוא המהירות או כבוי, והטמפרטורה מטפסת ויורדת. במזגן אינוורטר ממיר תדר משנה את מהירות המדחס (לרוב מנוע BLDC), והוא עובד ברציפות בהספק שמתאים לחום שצריך להוציא: שקט וחסכוני יותר. מנועי המאוורר במזגנים רגילים מקבלים קבל הרצה (ראה ${go('motors', '⚙ מנועים')}, מנוע חד-פאזי).</p>
      <p class="small muted">הבקר מחליט לפי חיישני טמפרטורה (חדר וסלילים). באיזה מצב סליל השסתום מקבל מתח תלוי ביצרן: כאן הוא מופעל בחימום. המבנה כללי ולימודי.</p>`;
    case 'boiler': return `<h3 class="pg-h">דוד חשמל</h3><p class="small">מהמפסק ושעון השבת (ראה ${go('wiring', '🔌 חיבורים')}), דרך <b>התרמוסטט</b> שמנתק בטמפרטורה שנקבעה, ו<b>מפסק טרמי</b> שמנתק אם התרמוסטט נתקע והמים מתחממים מדי, לגוף החימום שבתחתית המכל. מים חמים קלים יותר ועולים למעלה, ומשם יוצאים לברזים. מים קרים נכנסים למטה.</p>
      <p class="small">זמן החימום: ${ltr('t = m·c·ΔT / P')}, עם ${ltr('c = 4186 J/(kg·K)')}. כאן בערך ${ltr(`${num(extra.t / 3600, 2)} h`)} בלי הפסדים. נפח והספק הם ערכים לדוגמה.</p>`;
    default: return `<h3 class="pg-h">מכונת כביסה</h3><p class="small">הבקר מריץ את התוכנית בשלבים: מילוי (ברז סולנואיד), חימום, כביסה (התוף מסתובב לאט לשני הכיוונים), ריקון (משאבה), וסחיטה (התוף מהר). <b>נעילת הדלת</b> בטור לכל, ולכן בלי נעילה כלום לא עובד. <b>מפסק הלחץ</b> מודד את מפלס המים, ובלי מים הבקר לא מפעיל את גוף החימום, כדי שלא יישרף.</p>
      <p class="small muted">המנוע בדגמים ישנים הוא מנוע אוניברסלי עם מברשות, ובחדשים מנוע BLDC עם הנעה ישירה. גוף החימום הוא הסיבה הנפוצה לקפיצת ממסר פחת בכביסה (ראה ${go('home', '🏠 לוח ודירה')}). המבנה כללי ולימודי.</p>`;
  }
}

export function renderAppliances(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>🧊 מכשירים בבית</h2><p class="small muted">כל מכשיר בשתי שכבות: המעגל החשמלי למעלה, ומה שהוא מפעיל למטה. לוחצים על המפסקים ורואים מה זז.</p>
      <div class="pg-templates">${APPS.map(([v, t]) => `<button class="chip" data-app="${v}" aria-pressed="${st.app === v}">${esc(t)}</button>`).join('')}</div>${HOME_SAFETY}</div>
    <div class="card pg-stage"><h3 class="pg-h">המעגל החשמלי</h3><div id="apE"></div><h3 class="pg-h" id="apCt"></h3><div id="apC"></div></div>
    <div class="card" id="apEd"></div>
    <div class="card" id="apTx"></div>`;
  const pe = root.querySelector('#apE'), pc = root.querySelector('#apC'), ct = root.querySelector('#apCt'), ed = root.querySelector('#apEd'), tx = root.querySelector('#apTx');
  let raf = 0, last = 0, phase = 0;
  const parts = () => (st.app === 'fridge' ? fridge(phase) : st.app === 'ac' ? ac(phase) : st.app === 'boiler' ? boiler() : washer(phase));
  const editor = () => {
    if (st.app === 'fridge') return chips([['1', 'חם בפנים: תרמוסטט סגור'], ['0', 'קר מספיק: תרמוסטט פתוח']], String(st.warm), 'warm') + chips([['0', 'טיימר: קירור'], ['1', 'טיימר: הפשרה']], String(st.defrost), 'defrost') + chips([['0', 'דלת סגורה'], ['1', 'דלת פתוחה']], String(st.door), 'door');
    if (st.app === 'ac') return chips([['cool', '❄ קירור'], ['heat', '🔥 חימום']], st.mode, 'mode') + chips([['1', 'אינוורטר'], ['0', 'רגיל (On/Off)']], String(st.inverter), 'inverter') + (st.inverter ? slider('speed', 'מהירות המדחס', ltr(`${st.speed}%`), [20, 100], 1, st.speed) : '');
    if (st.app === 'boiler') return slider('vol', 'נפח', ltr(`${st.vol} L`), [50, 200], 10, st.vol) + slider('P', 'הספק', ltr(`${st.P} W`), [1000, 4000], 100, st.P) + slider('T', 'טמפרטורת מים קרים', ltr(`${st.T} °C`), [10, 30], 1, st.T);
    return chips(WSTAGES, st.stage, 'stage');
  };
  const draw = () => { const p = parts(); morph(pe, p.e); pc.innerHTML = p.c; ct.textContent = st.app === 'boiler' ? 'המכל' : st.app === 'washer' ? 'התוף' : 'מחזור הקירור'; return p; };
  const refresh = () => { const p = draw(); ed.innerHTML = editor(); tx.innerHTML = explain(p); root.querySelectorAll('[data-app]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.app === st.app))); };
  refresh();
  const tick = (now) => {
    if (!root.isConnected) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    if (dt && st.app !== 'boiler') { phase += dt * 0.12; draw(); }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  root.addEventListener('click', (ev) => {
    const a = ev.target.closest('[data-app]'), tg = ev.target.closest('[data-tog]'), b = ev.target.closest('[data-act]');
    if (a) st.app = a.dataset.app;
    else if (tg) { const k = tg.dataset.tog; st[k] = st[k] ? 0 : 1; }
    else if (b) { const k = b.dataset.act, v = b.dataset.v; if (!(k in st)) return; st[k] = typeof st[k] === 'number' ? Number(v) : v; }
    else return;
    save(); refresh();
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!f || !(f in st)) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    st[f] = v; save(); const p = draw(); tx.innerHTML = explain(p); const tmp = document.createElement('div'); tmp.innerHTML = editor(); const nb = tmp.querySelectorAll('.pg-range b'); ed.querySelectorAll('.pg-range b').forEach((x, i) => { if (nb[i]) x.innerHTML = nb[i].innerHTML; });
  });
  return () => cancelAnimationFrame(raf);
}
