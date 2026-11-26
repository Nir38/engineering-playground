// playground-wiring.js: the playground's wiring mode. "Open the box" views of the standard home connections
// with the wire colors: socket, one-way switch, two-way (stairs) with an optional intermediate switch,
// double switch, light fitting, boiler with a Shabbat clock, a line for an air conditioner, and earthing
// with the equipotential bar. Switching logic: js/home.js (tests/home-cases.mjs).
import { twoWay, withCross, boilerOn, SRC } from './home.js';
import { esc } from './text.js';
import { ltr, text, wire, HOME_SAFETY } from './elec-ui.js';

const KEY = 'mh-pg-wiring-v1';
const BOXES = [['socket', '🔌 שקע'], ['switch', '⏻ מפסק יחיד'], ['twoway', '⇄ מחליף (מדרגות)'], ['double', '⏻⏻ מפסק כפול'], ['lamp', '💡 נורה'], ['boiler', '🛢 דוד ושעון שבת'], ['ac', '❄ קו למזגן'], ['earth', '⏚ הארקה והשוואת פוטנציאלים']];
const defaults = () => ({ box: 'switch', s1: 0, s2: 0, x: 0, cross: false, d1: 1, d2: 0, sw: 1, clock: 1, clockOn: 1, thermo: 1 });
let st = null;
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') for (const k of Object.keys(st)) if (typeof s[k] === typeof st[k]) st[k] = s[k]; } catch (e) { /* ignore */ }
  if (!BOXES.some(([v]) => v === st.box)) st.box = 'switch';
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };

// small parts
const term = (x, y, lab = '') => `<circle cx="${x}" cy="${y}" r="4" class="pg-wterm"/>` + (lab ? text(x, y - 8, lab, '', 'middle', 'pg-tn') : '');
const lampSym = (x, y, on) => `${on ? `<circle cx="${x}" cy="${y}" r="20" fill="#facc15" opacity=".5"/>` : ''}<circle cx="${x}" cy="${y}" r="12" class="pg-csym"/><path d="M${x - 8},${y - 8} L${x + 8},${y + 8} M${x - 8},${y + 8} L${x + 8},${y - 8}" class="pg-cw"/>`;
// a switch blade from (x, y) to one of two contacts, clickable
const spdt = (x, y, pos, key, dx = 34) => `<g data-tog="${key}" class="pg-wsw"><rect x="${x - 6}" y="${y - 30}" width="${dx + 14}" height="60" fill="transparent"/>${term(x, y)}${term(x + dx, y - 16)}${term(x + dx, y + 16)}<line x1="${x}" y1="${y}" x2="${x + dx - 2}" y2="${pos ? y + 15 : y - 15}" class="pg-cw" style="stroke-width:3"/></g>`;
const spst = (x, y, on, key, dx = 34) => `<g data-tog="${key}" class="pg-wsw"><rect x="${x - 6}" y="${y - 24}" width="${dx + 14}" height="40" fill="transparent"/>${term(x, y)}${term(x + dx, y)}<line x1="${x}" y1="${y}" x2="${x + dx - 2}" y2="${on ? y : y - 16}" class="pg-cw" style="stroke-width:3"/></g>`;
const box = (x, y, w, h, lab) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="pg-wbox"/>` + (lab ? text(x + w / 2, y + h + 13, lab, 'var(--muted)', 'middle', 'pg-tn') : '');
const legend = (y = 222) => wire(`M14,${y} L34,${y}`, 'L', 3) + text(38, y + 4, 'L', '', 'start', 'pg-tn') + wire(`M58,${y} L78,${y}`, 'N', 3) + text(82, y + 4, 'N', '', 'start', 'pg-tn') + wire(`M102,${y} L122,${y}`, 'PE', 3) + text(126, y + 4, 'PE', '', 'start', 'pg-tn');

function drawing() {
  const W = 360, H = 232;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="${esc(BOXES.find(([v]) => v === st.box)[1])}">`;
  switch (st.box) {
    case 'socket': {
      s += text(20, 30, 'מהלוח', 'var(--muted)', 'start', 'pg-tn') + wire('M20,60 L170,60 L170,95', 'L') + wire('M20,80 L190,80 L190,95', 'N') + wire('M20,100 L150,100 L150,150 L180,150', 'PE');
      s += box(130, 40, 120, 150, 'קופסת השקע') + term(170, 98, 'L') + term(190, 98, 'N') + term(180, 150, 'PE');
      s += wire('M250,60 L340,60', 'L', 2, 'opacity=".6"') + wire('M250,80 L340,80', 'N', 2, 'opacity=".6"') + wire('M250,100 L340,100', 'PE', 2, 'opacity=".6"') + text(340, 120, 'לשקע הבא', 'var(--muted)', 'end', 'pg-tn');
      s += `<rect x="150" y="106" width="60" height="34" rx="8" class="pg-csym"/><circle cx="168" cy="120" r="3" fill="var(--text)"/><circle cx="192" cy="120" r="3" fill="var(--text)"/><circle cx="180" cy="132" r="3" fill="var(--text)"/>`;
      break;
    }
    case 'switch': {
      const on = !!st.sw;
      s += wire('M20,70 L120,70', 'L') + box(100, 40, 90, 70, 'קופסת המפסק') + spst(120, 70, on, 'sw') + wire('M154,70 L260,70 L260,138', 'L', 3, 'stroke-dasharray="1 0"') + text(205, 62, 'פאזה חוזרת', 'var(--muted)', 'middle', 'pg-tn');
      s += wire('M20,180 L260,180 L260,162', 'N') + wire('M20,200 L290,200 L290,150 L276,150', 'PE') + lampSym(260, 150, on) + text(20, 60, 'מהלוח', 'var(--muted)', 'start', 'pg-tn');
      break;
    }
    case 'twoway': {
      const on = st.cross ? withCross(st.s1, st.x, st.s2) : twoWay(st.s1, st.s2);
      s += wire('M14,60 L40,60', 'L') + box(28, 22, 72, 80, 'מחליף 1') + spdt(40, 60, st.s1, 's1');
      // travelers
      if (st.cross) {
        s += box(140, 22, 80, 80, 'מצליב') + wire('M74,44 L150,44', 'L', 2.4) + wire('M74,76 L150,76', 'L', 2.4);
        s += `<g data-tog="x" class="pg-wsw"><rect x="146" y="30" width="68" height="60" fill="transparent"/>${term(152, 44)}${term(152, 76)}${term(208, 44)}${term(208, 76)}${st.x ? '<line x1="152" y1="44" x2="208" y2="76" class="pg-cw" style="stroke-width:3"/><line x1="152" y1="76" x2="208" y2="44" class="pg-cw" style="stroke-width:3"/>' : '<line x1="152" y1="44" x2="208" y2="44" class="pg-cw" style="stroke-width:3"/><line x1="152" y1="76" x2="208" y2="76" class="pg-cw" style="stroke-width:3"/>'}</g>`;
        s += wire('M210,44 L284,44', 'L', 2.4) + wire('M210,76 L284,76', 'L', 2.4);
      } else s += wire('M74,44 L284,44', 'L', 2.4) + wire('M74,76 L284,76', 'L', 2.4) + text(180, 38, 'גידים מקשרים (travelers)', 'var(--muted)', 'middle', 'pg-tn');
      // second two-way switch, mirrored: common on the right
      s += box(270, 22, 72, 80, 'מחליף 2') + `<g data-tog="s2" class="pg-wsw"><rect x="276" y="30" width="56" height="60" fill="transparent"/>${term(320, 60)}${term(286, 44)}${term(286, 76)}<line x1="320" y1="60" x2="288" y2="${st.s2 ? 75 : 45}" class="pg-cw" style="stroke-width:3"/></g>`;
      s += wire('M320,60 L350,60 L350,150 L196,150', 'L') + lampSym(180, 150, on) + wire('M14,190 L180,190 L180,164', 'N') + wire('M14,206 L210,206 L210,150', 'PE');
      break;
    }
    case 'double': {
      s += wire('M14,70 L60,70', 'L') + box(50, 30, 110, 100, 'מפסק כפול') + wire('M60,70 L60,50 L80,50', 'L', 2.4) + wire('M60,70 L60,100 L80,100', 'L', 2.4);
      s += spst(80, 50, !!st.d1, 'd1') + spst(80, 100, !!st.d2, 'd2');
      s += wire('M114,50 L240,50 L240,108', 'L') + wire('M114,100 L180,100 L180,170 L300,170 L300,148', 'L') + lampSym(240, 120, !!st.d1) + lampSym(300, 136, !!st.d2);
      s += wire('M14,200 L320,200 L320,136 L312,136', 'N') + wire('M240,200 L240,132', 'N', 2);
      break;
    }
    case 'lamp': {
      s += text(20, 40, 'מהמפסק ומהלוח', 'var(--muted)', 'start', 'pg-tn') + wire('M20,60 L160,60', 'L') + wire('M20,80 L160,80', 'N') + wire('M20,100 L160,100', 'PE');
      s += box(150, 40, 70, 76, 'מהדק בתקרה') + term(170, 60, 'L') + term(170, 80, 'N') + term(170, 100, 'PE');
      s += wire('M170,60 L250,60 L250,140', 'L') + wire('M170,80 L240,80 L240,150', 'N') + wire('M170,100 L300,100 L300,150 L272,150', 'PE') + `<path d="M222,150 L278,150 L268,176 L232,176 Z" class="pg-csym"/>` + lampSym(250, 186, !!st.sw);
      s += text(300, 140, 'גוף מתכתי', 'var(--muted)', 'start', 'pg-tn');
      break;
    }
    case 'boiler': {
      const heat = boilerOn({ sw: !!st.sw, clock: !!st.clock, clockOn: !!st.clockOn, thermo: !!st.thermo });
      s += text(14, 26, 'מהלוח (מאמ"ת של הדוד)', 'var(--muted)', 'start', 'pg-tn') + wire('M14,50 L40,50', 'L') + wire('M14,110 L40,110', 'N');
      s += box(30, 34, 60, 92, 'מפסק דו-קוטבי') + spst(40, 50, !!st.sw, 'sw', 36) + spst(40, 110, !!st.sw, 'sw', 36);
      s += box(120, 30, 70, 50, 'שעון שבת') + `<circle cx="140" cy="55" r="12" class="pg-csym"/><line x1="140" y1="55" x2="140" y2="46" class="pg-cw"/>` + (st.clock ? spst(152, 55, !!st.clockOn, 'clockOn', 30) : '');
      s += wire(`M76,50 L${st.clock ? 152 : 200},50`, 'L', 3) + (st.clock ? wire('M184,55 L200,55 L200,50', 'L', 3) : '');
      s += wire('M200,50 L230,50', 'L') + box(222, 30, 52, 44, 'תרמוסטט') + spst(232, 50, !!st.thermo, 'thermo', 30) + wire('M262,50 L300,50 L300,90', 'L');
      s += `<rect x="270" y="90" width="70" height="100" rx="14" class="pg-csym"/><path d="M290,110 l10,10 l-10,10 l10,10 l-10,10 l10,10" fill="none" stroke="${heat ? '#ef4444' : 'var(--muted)'}" stroke-width="3"/>` + text(318, 205, heat ? 'מחמם' : 'לא מחמם', heat ? '#ef4444' : 'var(--muted)', 'middle', 'pg-b');
      s += wire('M76,110 L250,110 L250,170 L290,170', 'N') + wire('M14,214 L350,214 L350,140 L340,140', 'PE');
      break;
    }
    case 'ac': {
      s += box(10, 30, 70, 120, 'לוח') + `<rect x="30" y="60" width="26" height="44" rx="3" class="pg-hbrk"/>` + text(43, 80, 'C16', '', 'middle', 'pg-tn');
      s += wire('M43,104 L43,120 L240,120', 'L') + wire('M70,132 L240,132', 'N') + wire('M70,144 L240,144', 'PE') + text(150, 112, 'קו ישיר, בלי שקעים נוספים', 'var(--muted)', 'middle', 'pg-tn');
      s += box(230, 100, 50, 60, 'מנתק / שקע') + wire('M280,124 L310,124 L310,60', 'L', 2.4) + wire('M280,134 L318,134 L318,60', 'N', 2.4) + wire('M280,144 L326,144 L326,60', 'PE', 2.4);
      s += `<rect x="290" y="20" width="60" height="40" rx="6" class="pg-csym"/>` + text(320, 44, 'מזגן ❄', '', 'middle', 'pg-tn');
      break;
    }
    default: { // earth
      s += `<rect x="40" y="96" width="280" height="16" rx="4" fill="#9ca3af"/>` + text(180, 90, 'פס השוואת פוטנציאלים ראשי', '', 'middle', 'pg-b');
      const items = [[60, 'הארקת יסוד'], [120, 'PE מהלוח'], [180, 'צנרת מים'], [240, 'צנרת גז'], [300, 'ברזל הבניין']];
      for (const [x, lab] of items) s += wire(`M${x},112 L${x},170`, 'PE', 3) + text(x, 186, lab, '', 'middle', 'pg-tn');
      s += `<path d="M44,196 L76,196 M50,202 L70,202 M56,208 L64,208" stroke="var(--text)" stroke-width="2"/>`;
      break;
    }
  }
  return s + legend() + '</svg>';
}

function explain() {
  const colors = `<p class="small muted">צבעי הגידים: פאזה חום, אפס כחול, הארקה ירוק-צהוב (${esc(SRC.colors)}).</p>`;
  switch (st.box) {
    case 'socket': return `<h3 class="pg-h">שקע</h3><p class="small">לכל שקע מגיעים שלושה גידים: פאזה, אפס והארקה. השקעים של אותו מעגל מחוברים בשרשור, מקופסה לקופסה, ולכן חיבור רופף באחד מהם יכול לנתק את כל השקעים שאחריו. ההארקה מגיעה לחור השלישי, ודרכה לגוף המתכתי של המכשיר.</p><p class="small">בישראל משתמשים בתקעים מסוג H (שלושה פינים) ו-C (שני פינים, בלי הארקה). מקור: ${esc(SRC.plug)}. מכשיר עם גוף מתכתי צריך תקע עם הארקה.</p>${colors}`;
    case 'switch': return `<h3 class="pg-h">מפסק יחיד</h3><p class="small">המפסק מנתק את <b>הפאזה</b>, לא את האפס. הגיד שחוזר מהמפסק לנורה נקרא "פאזה חוזרת". כך, כשהמפסק כבוי, אין מתח על בית הנורה, ואפשר להחליף נורה בבטחה יחסית. מפסק שמנתק את האפס משאיר את הנורה "חיה" גם כשהיא כבויה.</p><p class="small muted">לחץ על המפסק בשרטוט.</p>${colors}`;
    case 'twoway': return `<h3 class="pg-h">מחליף (מדרגות)</h3><p class="small">שני מפסקים שכל אחד מהם מדליק ומכבה את אותה נורה. כל מחליף מחבר את המגע המשותף שלו לאחד משני "גידים מקשרים". הנורה דולקת כששניהם בוחרים באותו גיד. לכן כל לחיצה, על כל אחד מהם, הופכת את המצב.</p>
      <p class="small">כשצריך שלושה מקומות או יותר, מוסיפים באמצע <b>מצליב</b>: הוא מחליף בין שני הגידים המקשרים.</p><div class="chips"><button class="chip" data-act="cross" aria-pressed="${st.cross}">${st.cross ? 'הסר את המצליב' : 'הוסף מצליב באמצע'}</button></div>
      <p class="small">${st.cross ? 'שלושה מפסקים' : 'שני מפסקים'}, הנורה: <b>${(st.cross ? withCross(st.s1, st.x, st.s2) : twoWay(st.s1, st.s2)) ? 'דולקת' : 'כבויה'}</b>. לחץ על המפסקים.</p>${colors}`;
    case 'double': return `<h3 class="pg-h">מפסק כפול</h3><p class="small">שני מפסקים באותה קופסה, עם פאזה משותפת אחת שנכנסת, ושתי פאזות חוזרות: כל אחת לנורה (או לקבוצת נורות) אחרת. האפס מגיע לנורות ישירות.</p>${colors}`;
    case 'lamp': return `<h3 class="pg-h">נורה וגוף תאורה</h3><p class="small">בתקרה מחכים פאזה חוזרת (מהמפסק), אפס והארקה. גוף תאורה עם חלקי מתכת מחברים להארקה, כדי שאם פאזה תיגע בו, זרם התקלה יזרום בגיד ההארקה וינתק. מהדק (בלוק) מסודר, וכל גיד לבורג שלו.</p><div class="chips"><button class="chip" data-act="tog" data-v="sw">${st.sw ? 'כבה' : 'הדלק'} (מהמפסק)</button></div>${colors}`;
    case 'boiler': return `<h3 class="pg-h">דוד חשמלי עם שעון שבת</h3><p class="small">מהמאמ"ת של הדוד, דרך <b>מפסק דו-קוטבי</b> שמנתק גם פאזה וגם אפס (כך, כשהוא כבוי, הדוד מנותק לגמרי), דרך המגע של <b>שעון השבת</b> שמדליק בשעות שנקבעו, ועד <b>התרמוסטט</b> בדוד, שמנתק כשהמים הגיעו לטמפרטורה. גוף החימום עובד רק כשכל השלושה סגורים. גוף הדוד מחובר להארקה.</p>
      <div class="chips"><button class="chip" data-act="tog" data-v="sw" aria-pressed="${!!st.sw}">מפסק ${st.sw ? 'דולק' : 'כבוי'}</button><button class="chip" data-act="tog" data-v="clock" aria-pressed="${!!st.clock}">${st.clock ? 'יש שעון שבת' : 'בלי שעון'}</button>${st.clock ? `<button class="chip" data-act="tog" data-v="clockOn" aria-pressed="${!!st.clockOn}">שעון: ${st.clockOn ? 'שעת הפעלה' : 'מחוץ לשעות'}</button>` : ''}<button class="chip" data-act="tog" data-v="thermo" aria-pressed="${!st.thermo}">${st.thermo ? 'המים קרים: תרמוסטט סגור' : 'המים חמים: תרמוסטט פתוח'}</button></div>
      <p class="small muted">המבנה כללי ולימודי, לא של יצרן מסוים. דוד חשמלי הוא אחד הצרכנים הגדולים בבית, ולכן יש לו מעגל משלו.</p>${colors}`;
    case 'ac': return `<h3 class="pg-h">קו למזגן</h3><p class="small">מזגן הוא צרכן גדול עם מדחס, ולכן מקבל קו ישיר מהלוח עם מאמ"ת משלו ובלי שקעים נוספים בדרך. המדחס מושך זרם התנעה גבוה לרגע, ולכן המאמ"ת כאן בעקום C (דוגמה: ${ltr('C16')}, כבל ${ltr('2.5 mm²')}: ערכים לדוגמה, הגודל האמיתי לפי הספק המזגן והוראות היצרן). היחידה החיצונית מחוברת להארקה.</p>${colors}`;
    default: return `<h3 class="pg-h">הארקה ופס השוואת פוטנציאלים</h3><p class="small">כל חלקי המתכת שאפשר לגעת בהם בבית (צנרת מים וגז, ברזל הבניין, גידי ההארקה מהלוח) מחוברים לפס אחד, ומשם להארקת היסוד (מוליך שקבור ביסודות הבניין). המטרה: שכל המתכות יהיו תמיד באותו פוטנציאל. אם מתכת אחת מקבלת מתח בתקלה, לא יהיה הפרש מתח מסוכן בינה לבין ברז שנוגעים בו ביד השנייה.</p><p class="small">ההארקה לבדה לא מנתקת: היא נותנת לזרם התקלה דרך קלה, והמאמ"ת או ממסר הפחת הם שמנתקים.</p>${colors}`;
  }
}

export function renderWiring(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>🔌 חיבורים בבית</h2><p class="small muted">פותחים את הקופסה ורואים איך מחוברים הגידים, לפי הצבעים שלהם.</p>
      <div class="pg-templates">${BOXES.map(([v, t]) => `<button class="chip" data-box="${v}" aria-pressed="${st.box === v}">${esc(t)}</button>`).join('')}</div>${HOME_SAFETY}</div>
    <div class="card pg-stage"><div id="wDraw"></div></div>
    <div class="card" id="wText"></div>`;
  const dr = root.querySelector('#wDraw'), tx = root.querySelector('#wText');
  const all = () => { dr.innerHTML = drawing(); tx.innerHTML = explain(); root.querySelectorAll('[data-box]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.box === st.box))); };
  all();
  root.addEventListener('click', (ev) => {
    const bx = ev.target.closest('[data-box]'), tg = ev.target.closest('[data-tog]'), b = ev.target.closest('[data-act]');
    if (bx) st.box = bx.dataset.box;
    else if (tg) { const k = tg.dataset.tog; st[k] = st[k] ? 0 : 1; }
    else if (b && b.dataset.act === 'cross') st.cross = !st.cross;
    else if (b && b.dataset.act === 'tog') { const k = b.dataset.v; st[k] = st[k] ? 0 : 1; }
    else return;
    save(); all();
  });
}
