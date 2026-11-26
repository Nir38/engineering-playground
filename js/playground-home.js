// playground-home.js: the playground's home mode. An interactive panel (main switch, RCD, a breaker for each
// circuit) and an apartment plan: turn appliances on, watch each breaker's current, and see what trips in
// an overload, a short, a leak to a case, a touch without earth and a broken neutral.
// Engine: js/home.js (checked in tests/home-cases.mjs).
import { CIRCUITS, MAIN, RCD_IDN, SRC, appCurrent, circuitCurrent, tripTime, breakerStep, rcdTripTime, shortCurrent, touch, R_BODY, R_FLOOR } from './home.js';
import { esc } from './text.js';
import { ltr, si, num, chips, text, wire, HOME_SAFETY, go } from './elec-ui.js';

const KEY = 'mh-pg-home-v1';
const ICON = { lamp: '💡', tv: '📺', pc: '💻', heater: '🔥', kettle: '☕', micro: '📟', dish: '🍽', fridge: '🧊', ac: '❄', boiler: '🛢', oven: '♨' };
const POS = { l1: [120, 190], s1: [40, 238], s3: [196, 238], a1: [40, 142], l3: [80, 62], k1: [30, 100], k2: [72, 100], k3: [114, 100], k4: [132, 30], o1: [30, 30], l2: [290, 80], s2: [256, 36], s4: [330, 128], l4: [290, 200], b1: [330, 240] };
const PANEL = [190, 26];
const FAULTS = [['short', '⚡ קצר בשקע המטבח'], ['leak', '💧 דליפה לגוף הדוד'], ['touch', '🖐 נגיעה בקומקום תקול בלי הארקה'], ['brokenN', '✂ אפס מנותק במעגל השקעים']];
const SPEED = [[1, '×1'], [10, '×10'], [60, '×60'], [300, '×300']];
const dur = (t) => (t < 90 ? `${num(t, 0)} s` : t < 5400 ? `${num(t / 60, 0)} דקות` : `${num(t / 3600, 1)} שעות`);
const defaults = () => ({ tab: 'panel', on: { k4: true, l1: true }, off: {}, tripped: {}, mainOn: true, rcdOn: true, rcdPresent: true, fault: null, sel: 'rcd', speed: 10, selC: null });
let st = null;
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') { for (const k of Object.keys(st)) if (k in s && typeof s[k] === typeof st[k] || (k === 'fault' || k === 'selC') && k in s) st[k] = s[k]; } } catch (e) { /* ignore */ }
  if (!SPEED.some(([v]) => v === st.speed)) st.speed = 10;
  if (st.fault && !FAULTS.some(([v]) => v === st.fault)) st.fault = null;
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };

const powered = (c) => st.mainOn && st.rcdOn && !st.tripped[c.id] && !st.off[c.id];
const Ishort = (c) => shortCurrent(15, c.mm2); // a short 15 m from the panel (example)
function current(c) {
  if (!powered(c)) return 0;
  if (st.fault === 'short' && c.id === 'kitchen') return Ishort(c);
  if (st.fault === 'brokenN' && c.id === 'sock') return 0;
  return circuitCurrent(c, st.on);
}
const works = (a, c) => powered(c) && st.on[a.id] && !(st.fault === 'brokenN' && c.id === 'sock');

const INFO = {
  main: () => `<h3 class="pg-h">מפסק ראשי</h3><p class="small">מנתק את כל הדירה בבת אחת. כאן הוא ${ltr(`${MAIN.In} A`)}, לפי גודל חיבור חד-פאזי ${ltr('1×40 A')} (מקור: ${esc(SRC.tariff)}). ${ltr(`40 A × 230 V = 9.2 kVA`)}: זה כל ההספק שהדירה יכולה למשוך יחד. בחיבור תלת-פאזי ${ltr('3×25 A')} יש פי 3 פאזות ובערך ${ltr('17 kVA')}.</p>
    <p class="small muted">העקום שלו כאן (C) הוא ערך לדוגמה.</p>`,
  rcd: () => `<h3 class="pg-h">ממסר פחת (RCD)</h3><p class="small">משווה בין הזרם שיוצא בפאזה לזרם שחוזר באפס. בדרך כלל הם שווים. אם חסרים ${ltr(`${RCD_IDN * 1000} mA`)} או יותר, הזרם החסר הולך לאדמה בדרך אחרת, אולי דרך אדם, והממסר מנתק תוך עשיריות שנייה (${ltr('עד 0.3 s ב-30 mA, עד 0.04 s ב-150 mA')}, ${esc(SRC.rcdStd)}).</p>
    <p class="small">ברגישות ${ltr('30 mA')} הוא חובה בלוח דירתי (${esc(SRC.rcd)}). הוא <b>לא</b> מגן מעומס יתר ולא מקצר בין פאזה לאפס: שם הזרם יוצא וחוזר שווה. לזה יש מאמ"תים. לוחצים על הכפתור T כדי לבדוק שהוא מנתק (המוסד לבטיחות ולגהות ממליץ לבדוק באופן קבוע).</p>
    <p class="small muted">לחיצה על T כאן מדמה את הבדיקה.</p>`,
  nbar: () => `<h3 class="pg-h">פס אפסים</h3><p class="small">כל גידי האפס (כחולים) של המעגלים מתחברים כאן, אחרי ממסר הפחת. אפס של מעגל שעובר מסביב לממסר הפחת גורם לו לקפוץ, כי הזרם "יוצא" דרכו ו"חוזר" בדרך אחרת.</p>`,
  pebar: () => `<h3 class="pg-h">פס הארקות</h3><p class="small">כל גידי ההארקה (ירוק-צהוב) של השקעים והמכשירים מתחברים כאן, ומשם להארקת היסוד של הבניין. דרך הגיד הזה חוזר זרם התקלה כשפאזה נוגעת בגוף מתכתי של מכשיר, וכך המאמ"ת או ממסר הפחת מנתקים. צבעי הגידים: ${esc(SRC.colors)}.</p>`,
};
function breakerInfo(c) {
  const I = current(c), t = tripTime(I, c.In, c.curve);
  return `<h3 class="pg-h">מאמ"ת ${esc(c.name)}: ${ltr(`${c.curve}${c.In}`)}</h3>
    <p class="small">מפסק אוטומטי זעיר. בתוכו שני מנגנונים: <b>תרמי</b> (פס דו-מתכתי שמתכופף כשהוא מתחמם) לעומס יתר, שמנתק אחרי זמן שמתקצר ככל שהזרם גדל, ו<b>מגנטי</b> (סליל שמושך בריח) לקצר, שמנתק מיד.</p>
    <p class="small">הוא מגן על <b>הכבל</b>, לא על המכשיר: כבל של ${ltr(`${c.mm2} mm²`)} מתחמם מעל זרם מסוים, ולכן המאמ"ת קטן ממנו. נקודות הבדיקה (${esc(SRC.mcb)}): לא מנתק ב-${ltr(`1.13·In = ${num(1.13 * c.In, 1)} A`)} במשך שעה, מנתק ב-${ltr(`1.45·In = ${num(1.45 * c.In, 1)} A`)} תוך שעה, ומנתק מיד מעל ${ltr(`${c.curve === 'B' ? 5 : 10}·In`)} (עקום ${c.curve}).${c.curve === 'C' ? ' עקום C נבחר למזגן כי המדחס מושך זרם התנעה גבוה לרגע, וב-B הוא היה מקפיץ את המאמ"ת בכל הפעלה.' : ''}</p>
    <div class="pg-max"><div><span>זרם עכשיו</span><b>${ltr(si(I, 'A'))}</b></div><div><span>זמן ניתוק בזרם הזה</span><b>${t === Infinity ? 'לא מנתק' : t < 0.1 ? 'מיד (מגנטי)' : dur(t)}</b></div></div>
    <p class="small muted">הגודל ${ltr(`${c.In} A`)}, העקום והחתך ${ltr(`${c.mm2} mm²`)} הם ערכים לדוגמה, נפוצים בדירות. מה שמחייב הוא תכנון של חשמלאי לפי התקנות.</p>`;
}

// ---------- the panel ----------
function panelSvg() {
  const W = 360, H = 250, mods = [{ id: 'main', w: 44, label: 'ראשי', sub: `${MAIN.In}A` }, { id: 'rcd', w: 44, label: 'פחת', sub: '30mA' }, ...CIRCUITS.map((c) => ({ id: c.id, w: 30, label: c.name, sub: `${c.curve}${c.In}`, c }))];
  let x = 14, s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" id="hPanel" role="img" aria-label="לוח חשמל ביתי"><rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="10" class="pg-hbox"/><line x1="10" y1="100" x2="${W - 10}" y2="100" class="pg-rail"/>`;
  for (const m of mods) {
    const on = m.id === 'main' ? st.mainOn : m.id === 'rcd' ? st.rcdOn : !st.tripped[m.id] && !st.off[m.id], missing = m.id === 'rcd' && !st.rcdPresent;
    const sel = st.sel === m.id, cx = x + m.w / 2;
    if (m.c) { // load bar above the breaker
      const I = current(m.c), r = Math.min(2, I / m.c.In), h = 15 * r; // 15 px = the rated current (dashed line)
      s += `<rect x="${x + 4}" y="${54 - Math.min(30, h)}" width="${m.w - 8}" height="${Math.min(30, h)}" rx="2" fill="${r > 1 ? 'var(--bad)' : r > 0.8 ? '#f59e0b' : 'var(--good)'}"/><rect x="${x + 4}" y="24" width="${m.w - 8}" height="30" rx="2" fill="none" class="pg-ruler"/><line x1="${x + 2}" y1="39" x2="${x + m.w - 2}" y2="39" stroke="var(--muted)" stroke-dasharray="2 2"/>`;
      s += text(cx, 18, num(I, 1), '', 'middle', 'pg-tn');
      s += `<line x1="${cx}" y1="146" x2="${cx}" y2="178" stroke="#8b5a2b" stroke-width="2.5"/><circle cx="${cx}" cy="180" r="2.5" fill="${m.c.color}"/>`;
    }
    s += `<g data-mod="${m.id}" class="pg-hmod ${sel ? 'pg-hsel' : ''}" ${missing ? 'opacity=".35"' : ''}><rect x="${x}" y="62" width="${m.w}" height="84" rx="4" class="pg-hbrk" ${missing ? 'stroke-dasharray="4 3"' : ''}/>`;
    s += text(cx, 76, m.sub, '', 'middle', 'pg-tn') + `</g>`;
    if (!missing) s += `<g data-handle="${m.id}" class="pg-hhandle"><rect x="${cx - 8}" y="84" width="16" height="44" rx="3" class="pg-hslot"/><rect x="${cx - 7}" y="${on ? 86 : 108}" width="14" height="18" rx="2" fill="${on ? 'var(--good)' : st.tripped[m.id] || (m.id === 'rcd' && !st.rcdOn) || (m.id === 'main' && !st.mainOn) ? 'var(--bad)' : 'var(--muted)'}"/></g>`;
    if (m.id === 'rcd' && !missing) s += `<g data-test="1" class="pg-hhandle"><circle cx="${x + m.w - 8}" cy="138" r="6" fill="#f59e0b"/><text x="${x + m.w - 8}" y="141" text-anchor="middle" class="pg-tn" fill="#111">T</text></g>`;
    s += text(cx, 160, m.label, '', 'middle', 'pg-tn');
    x += m.w + 4;
  }
  // neutral and earth bars
  s += `<g data-mod="nbar" class="pg-hmod ${st.sel === 'nbar' ? 'pg-hsel' : ''}"><rect x="20" y="200" width="150" height="12" rx="3" fill="#2563eb"/>${text(95, 230, 'פס אפסים (N)', '', 'middle', 'pg-tn')}</g>`;
  s += `<g data-mod="pebar" class="pg-hmod ${st.sel === 'pebar' ? 'pg-hsel' : ''}"><rect x="190" y="200" width="150" height="12" rx="3" fill="#16a34a"/><rect x="190" y="204" width="150" height="4" fill="#facc15"/>${text(265, 230, 'פס הארקות (PE)', '', 'middle', 'pg-tn')}</g>`;
  s += wire('M80,146 L80,200', 'N', 2.5);
  return s + '</svg>';
}

// ---------- the apartment ----------
function planSvg() {
  const W = 360, H = 270;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" id="hPlan" role="img" aria-label="תוכנית דירה עם מעגלי החשמל">`;
  const room = (x, y, w, h, name) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="pg-room"/>` + text(x + w / 2, y + h - 6, name, 'var(--muted)', 'middle', 'pg-tn');
  s += room(6, 6, 144, 114, 'מטבח') + room(150, 6, 80, 114, 'כניסה') + room(230, 6, 124, 144, 'חדר שינה') + room(6, 120, 224, 144, 'סלון') + room(230, 150, 124, 114, 'אמבטיה');
  // routes from the panel, a little apart for each circuit
  CIRCUITS.forEach((c, k) => {
    const hi = st.selC === c.id, dim = st.selC && !hi, ox = PANEL[0] - 12 + k * 5;
    for (const a of c.apps) { const [x, y] = POS[a.id]; s += `<path d="M${ox},${PANEL[1] + 8} L${ox},${y} L${x},${y}" fill="none" stroke="${c.color}" stroke-width="${hi ? 3 : 1.4}" opacity="${dim ? 0.15 : hi ? 1 : 0.55}" ${powered(c) ? '' : 'stroke-dasharray="3 3"'}/>`; }
  });
  s += `<rect x="${PANEL[0] - 16}" y="${PANEL[1] - 12}" width="32" height="20" rx="3" class="pg-hbrk"/>` + text(PANEL[0], PANEL[1] + 2, 'לוח', '', 'middle', 'pg-tn');
  for (const c of CIRCUITS) for (const a of c.apps) {
    const [x, y] = POS[a.id], w = works(a, c), on = !!st.on[a.id];
    s += `<g data-app="${a.id}" class="pg-happ">${w ? `<circle cx="${x}" cy="${y}" r="13" fill="${c.color}" opacity=".3"/>` : ''}<circle cx="${x}" cy="${y}" r="11" class="pg-happbg" ${on && !w ? 'stroke="var(--bad)" stroke-dasharray="2 2"' : ''}/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="13" opacity="${w ? 1 : 0.4}">${ICON[a.kind]}</text></g>`;
  }
  if (st.fault === 'touch') { const [x, y] = POS.k1; s += `<text x="${x + 16}" y="${y + 6}" font-size="16">🖐</text>`; }
  return s + '</svg>';
}

export function renderHome(root, { toast }) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>🏠 לוח חשמל ודירה</h2><p class="small muted">לוח דירתי עם מפסק ראשי, ממסר פחת ומאמ"ת לכל מעגל, ותוכנית של דירה. מדליקים מכשירים ורואים את הזרם עולה, ומנסים תקלות.</p>
      ${chips([['panel', '🔲 הלוח'], ['plan', '🗺 הדירה']], st.tab, 'tab')}${HOME_SAFETY}</div>
    <div class="card pg-stage"><div id="hDraw"></div><p class="small muted pg-hint" id="hHint"></p></div>
    <div class="card" id="hFault"></div>
    <div class="card" id="hInfo"></div>
    <div class="card" id="hRes"></div>`;
  const dr = root.querySelector('#hDraw'), hint = root.querySelector('#hHint'), fb = root.querySelector('#hFault'), info = root.querySelector('#hInfo'), res = root.querySelector('#hRes');
  const heat = {}; CIRCUITS.forEach((c) => { heat[c.id] = { heat: 0, tripped: false }; }); const mainHeat = { heat: 0, tripped: false };
  let raf = 0, last = 0, lastPanel = 0;
  const draw = () => { dr.innerHTML = st.tab === 'panel' ? panelSvg() : planSvg(); hint.textContent = st.tab === 'panel' ? 'לחץ על רכיב כדי לקרוא עליו, ועל הידית כדי לכבות או להרים. הפס מעל כל מאמ"ת הוא הזרם ביחס לנקוב (הקו המקווקו = הנקוב).' : 'לחץ על מכשיר כדי להדליק או לכבות אותו. לחץ על מעגל בטבלה כדי להדגיש את המסלול שלו מהלוח.'; };
  const faultCard = () => {
    let note = '';
    if (st.fault === 'short') { const c = CIRCUITS.find((q) => q.id === 'kitchen'); note = `קצר בין פאזה לאפס בשקע במטבח, ${ltr('15 m')} מהלוח (ערך לדוגמה). הזרם מוגבל רק בהתנגדות הכבלים והרשת: ${ltr(`I = 230 / R_loop ≈ ${si(Ishort(c), 'A')}`)}, הרבה מעל ${ltr(`5·In = ${5 * c.In} A`)}. לכן החלק המגנטי מנתק מיד. כל עוד הקצר קיים, הרמה של המאמ"ת תקפיץ אותו שוב. ממסר הפחת לא מגיב: הזרם יוצא וחוזר שווה.`; }
    if (st.fault === 'leak') note = `גוף החימום של הדוד סדוק, וזרם של ${ltr('50 mA')} (ערך לדוגמה) דולף ממנו לגוף המתכתי, ומשם בגיד ההארקה. הזרם בפאזה גדול מזה שבאפס ב-${ltr('50 mA')}, ולכן ממסר הפחת מנתק את כל הדירה. המאמ"ת לא מרגיש כלום: ${ltr('50 mA')} זה כלום ביחס ל-${ltr('16 A')}. אם הפחת חוזר לקפוץ ברגע שהדוד נדלק, זה הסימן.`;
    if (st.fault === 'touch') { const t = touch({ earthed: false, rcd: st.rcdPresent }); note = `לקומקום יש גוף מתכתי, גיד ההארקה שלו קרוע, ופאזה נגעה בגוף. אדם נוגע בו ועומד על הרצפה: הזרם עובר דרכו לאדמה. עם התנגדות גוף ונעליים של בערך ${ltr(`${R_BODY + R_FLOOR} Ω`)} (ערך לדוגמה, משתנה מאוד), ${ltr(`I ≈ 230/${R_BODY + R_FLOOR} ≈ ${si(t.Ibody, 'A')}`)}. זה מעט מאוד בשביל המאמ"ת (${ltr('16 A')}), אבל מסוכן לחיים. ${st.rcdPresent ? 'ממסר הפחת רואה שחסרים בגיד האפס יותר מ-30 mA, ומנתק תוך שבריר שנייה.' : '<b style="color:var(--bad)">בלי ממסר פחת אין שום דבר שינתק.</b>'}`; }
    if (st.fault === 'brokenN') note = 'גיד האפס של מעגל השקעים התנתק בקופסת חיבורים. המכשירים במעגל מפסיקים לעבוד, אבל הם עדיין מחוברים לפאזה: האפס שאחרי הנתק מקבל 230 V דרכם, ובודק מתח על חור האפס בשקע יידלק. המאמ"ת לא קופץ, כי אין זרם בכלל. ממסר הפחת לא קופץ. מתקנים רק כשהמאמ"ת למטה. במצב ' + go('faults', '🔍 איתור תקלות') + ' אפשר למדוד את זה.';
    return `<h3 class="pg-h">תקלות</h3><div class="chips">${FAULTS.map(([v, t]) => `<button class="chip" data-act="fault" data-v="${v}" aria-pressed="${st.fault === v}">${esc(t)}</button>`).join('')}<button class="chip" data-act="fault" data-v="">✓ בלי תקלה</button></div>
      <div class="chips"><button class="chip" data-act="rcdp" aria-pressed="${!st.rcdPresent}">${st.rcdPresent ? 'הסר את ממסר הפחת (לניסוי)' : 'החזר את ממסר הפחת'}</button></div>
      ${note ? `<p class="small">${note}</p>` : `<p class="small muted">עומס יתר אין צורך לדמות: הדלק בדירה קומקום, מדיח כלים ומיקרוגל יחד (מעגל המטבח, בערך ${ltr('24 A')} על ${ltr('B16')}), ובהילוך ${ltr('×300')} רואים את המאמ"ת קופץ אחרי כמה שניות (באמת: בערך רבע שעה). רק קומקום ומדיח (${ltr('18 A')}) זה עומס קטן: הוא יקפוץ רק אחרי שעות, וזה בכוונה, כדי לא לנתק בכל התחממות קצרה.</p>`}
      <div class="chips pg-slow"><span class="small muted">מהירות הזמן:</span>${SPEED.map(([v, t]) => `<button class="chip" data-act="speed" data-v="${v}" aria-pressed="${st.speed === v}">${t}</button>`).join('')}</div>`;
  };
  const infoCard = () => { const c = CIRCUITS.find((q) => q.id === st.sel); return c ? breakerInfo(c) : (INFO[st.sel] || INFO.rcd)(); };
  const results = () => {
    const rows = CIRCUITS.map((c) => {
      const I = current(c), t = tripTime(I, c.In, c.curve), h = heat[c.id].heat;
      const stat = st.tripped[c.id] ? '<b style="color:var(--bad)">קפץ</b>' : st.off[c.id] ? 'כבוי' : !powered(c) ? 'אין מתח' : t === Infinity ? 'פועל' : `<b style="color:#d97706">עומס יתר: יקפוץ בעוד ~${dur(Math.max(0, (1 - h) * t))}</b>`;
      return `<tr data-circ="${c.id}" class="${st.selC === c.id ? 'pg-rowsel' : ''}"><td><span style="color:${c.color}">●</span> ${esc(c.name)}</td><td>${ltr(`${num(I, 1)} A`)}</td><td>${ltr(`${c.curve}${c.In} · ${c.mm2} mm²`)}</td><td>${stat}</td></tr>`;
    }).join('');
    const tot = CIRCUITS.reduce((s, c) => s + current(c), 0);
    return `<h3 class="pg-h">המעגלים</h3><table class="pg-table"><thead><tr><th>מעגל</th><th>זרם</th><th>מאמ"ת וכבל</th><th>מצב</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="pg-max"><div><span>זרם כולל במפסק הראשי</span><b>${ltr(`${num(tot, 1)} A מתוך ${MAIN.In} A`)}</b></div><div><span>הספק</span><b>${ltr(si(Math.min(tot, 999) * 230, 'W'))}</b></div></div>
      <p class="small muted">${ltr('I = P/(V·cosφ)')}. ערכי ההספק של המכשירים, גדלי המאמ"תים והכבלים הם ערכים לדוגמה. הזרמים מחוברים כאן כגדלים (קצת שמרני: מכשירים עם cosφ שונה לא בדיוק באותה פאזה).</p>`;
  };
  const all = () => { draw(); fb.innerHTML = faultCard(); info.innerHTML = infoCard(); res.innerHTML = results(); };
  // what happens now (faults that act at once), then the breakers' heat over time
  const act = () => {
    if (!st.mainOn || !st.rcdOn) return;
    if (st.fault === 'short') { const c = CIRCUITS.find((q) => q.id === 'kitchen'); if (powered(c)) { st.tripped.kitchen = true; toast('⚡ קצר: המאמ"ת של המטבח קפץ מיד'); } }
    if (st.fault === 'leak' && st.rcdPresent && powered(CIRCUITS.find((q) => q.id === 'boiler')) && rcdTripTime(0.05) < Infinity) { st.rcdOn = false; toast('💧 ממסר הפחת קפץ: דליפה'); }
    if (st.fault === 'touch' && st.rcdPresent && powered(CIRCUITS.find((q) => q.id === 'kitchen')) && touch({ earthed: false }).rcdTrips) { st.rcdOn = false; toast('🖐 ממסר הפחת קפץ והציל'); }
  };
  const tick = (now) => {
    if (!root.isConnected) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) * st.speed : 0; last = now;
    let changed = false;
    if (dt > 0 && st.mainOn && st.rcdOn) {
      for (const c of CIRCUITS) { if (!powered(c)) { heat[c.id].heat = Math.max(0, heat[c.id].heat - dt / 600); continue; } breakerStep(heat[c.id], current(c), c.In, c.curve, dt); if (heat[c.id].tripped) { heat[c.id].tripped = false; st.tripped[c.id] = true; changed = true; toast(`🔥 עומס יתר: המאמ"ת של ${c.name} קפץ`); } }
      breakerStep(mainHeat, CIRCUITS.reduce((s, c) => s + current(c), 0), MAIN.In, MAIN.curve, dt);
      if (mainHeat.tripped) { mainHeat.tripped = false; st.mainOn = false; changed = true; toast('🔥 המפסק הראשי קפץ: יותר מדי בבת אחת'); }
    }
    if (changed) { save(); all(); }
    else if (now - lastPanel > 400) { lastPanel = now; res.innerHTML = results(); if (st.tab === 'panel') draw(); }
    raf = requestAnimationFrame(tick);
  };
  act(); all(); raf = requestAnimationFrame(tick);
  root.addEventListener('click', (ev) => {
    const g = (sel) => ev.target.closest(sel);
    const hd = g('[data-handle]'), tb = g('[data-test]'), md = g('[data-mod]'), ap = g('[data-app]'), cr = g('[data-circ]'), b = g('[data-act]');
    if (tb) { if (st.rcdOn) { st.rcdOn = false; toast('T: ממסר הפחת ניתק. הוא תקין.'); } st.sel = 'rcd'; }
    else if (hd) {
      const id = hd.dataset.handle; st.sel = id;
      if (id === 'main') st.mainOn = !st.mainOn;
      else if (id === 'rcd') st.rcdOn = !st.rcdOn;
      else if (st.tripped[id]) { st.tripped[id] = false; heat[id].heat = 0; } else st.off[id] = !st.off[id];
      if (id === 'main' && st.mainOn) mainHeat.heat = 0;
    }
    else if (md) st.sel = md.dataset.mod;
    else if (ap) { st.on[ap.dataset.app] = !st.on[ap.dataset.app]; const c = CIRCUITS.find((q) => q.apps.some((a) => a.id === ap.dataset.app)), a = c.apps.find((q) => q.id === ap.dataset.app); st.selC = c.id; st.sel = c.id; toast(`${ICON[a.kind]} ${a.name} ${st.on[a.id] ? 'דולק' : 'כבוי'} (${num(appCurrent(a), 1)} A)`); }
    else if (cr) { st.selC = st.selC === cr.dataset.circ ? null : cr.dataset.circ; st.sel = cr.dataset.circ; if (st.tab !== 'plan') st.tab = 'plan'; }
    else if (b) {
      const a = b.dataset.act, v = b.dataset.v;
      if (a === 'tab') st.tab = v;
      else if (a === 'fault') { st.fault = v || null; }
      else if (a === 'rcdp') { st.rcdPresent = !st.rcdPresent; if (!st.rcdPresent) st.rcdOn = true; }
      else if (a === 'speed') st.speed = Number(v);
      else return;
      root.querySelectorAll('[data-act="tab"]').forEach((q) => q.setAttribute('aria-pressed', String(q.dataset.v === st.tab)));
    } else return;
    if (!st.rcdPresent) st.rcdOn = true; // no RCD: nothing to trip
    act(); save(); all();
  });
  return () => cancelAnimationFrame(raf);
}
