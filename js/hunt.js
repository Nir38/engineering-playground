// hunt.js: "find the design mistakes". Each case is a simple drawing with hidden spots: some are real
// design mistakes (DFM, GD&T, assembly), some are correct practice put there as decoys. Scoring:
// (found − false alarms) / mistakes, on a 0–10 scale. The drawings are illustrations, not real parts.
// Sources per case (the rules are the ones taught in the app's lessons). Tests: tests/hunt-cases.mjs.

const KA = 'Kalpakjian & Schmid, Manufacturing Engineering and Technology';
const BD = 'Boothroyd, Dewhurst & Knight, Product Design for Manufacture and Assembly';
const Y = 'ASME Y14.5-2018';
const SH = "Shigley's Mechanical Engineering Design, פרקים 7 ו-11";

// drawing helpers (viewBox 360 × H)
const L = 'stroke="var(--text)" stroke-width="1.6" fill="none"';
const F = 'stroke="var(--text)" stroke-width="1.4" fill="var(--surface-2)"';
const HOLE = 'stroke="var(--text)" stroke-width="1.4" fill="var(--surface)"';
const T = (x, y, s, a = 'middle', size = 10, col = 'var(--text)') => `<text x="${x}" y="${y}" text-anchor="${a}" font-size="${size}" fill="${col}" direction="rtl">${s}</text>`;
const TL = (x, y, s, a = 'middle', size = 10) => `<text x="${x}" y="${y}" text-anchor="${a}" font-size="${size}" fill="var(--text)">${s}</text>`;
const dim = (x1, x2, y, s) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="var(--muted)" stroke-width="1"/><line x1="${x1}" y1="${y - 4}" x2="${x1}" y2="${y + 4}" stroke="var(--muted)"/><line x1="${x2}" y1="${y - 4}" x2="${x2}" y2="${y + 4}" stroke="var(--muted)"/>` + TL((x1 + x2) / 2, y - 3, s, 'middle', 9);
const arrowUp = (x, y1, y2) => `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2 + 6}" stroke="var(--accent, #3b82f6)" stroke-width="2"/><polygon points="${x},${y2} ${x - 5},${y2 + 8} ${x + 5},${y2 + 8}" fill="var(--accent, #3b82f6)"/>`;
const bearing = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${F}/><line x1="${x}" y1="${y}" x2="${x + w}" y2="${y + h}" stroke="var(--text)"/><line x1="${x + w}" y1="${y}" x2="${x}" y2="${y + h}" stroke="var(--text)"/>`;
const ring = (x, y, h) => `<rect x="${x}" y="${y}" width="3" height="${h}" fill="var(--text)"/>`;

export const CASES = [
  {
    id: 'cnc', title: 'תושבת מכורסמת (CNC)', H: 228, source: KA,
    brief: 'תושבת אלומיניום שתעובד בכרסום. מבט על. מצא מה ייקר את החלק או שלא ניתן לייצר כמו ששורטט.',
    svg: () => `<polygon points="30,40 330,40 330,192 322,200 30,200" ${L}/>${dim(30, 330, 26, '300 ±0.002')}
      <rect x="50" y="60" width="100" height="55" ${F}/>${T(100, 85, 'כיס, עומק 10')}${T(100, 99, 'פינות R0')}
      <rect x="50" y="135" width="100" height="50" rx="7" ${F}/>${T(100, 157, 'כיס, עומק 10')}${T(100, 171, 'פינות R3')}
      <rect x="180" y="70" width="12" height="120" ${F}/>${T(186, 62, 'חריץ: רוחב 4, עומק 40', 'middle', 9)}
      <circle cx="270" cy="85" r="9" ${HOLE}/><circle cx="270" cy="85" r="6.5" stroke="var(--text)" stroke-dasharray="2 2" fill="none"/>${TL(270, 109, 'M6', 'middle', 9)}${T(270, 121, 'עיוור, הברגה עד הקרקעית', 'middle', 8)}
      <circle cx="270" cy="160" r="8" ${HOLE}/>${T(270, 182, 'Ø8 עובר', 'middle', 9)}${T(302, 216, 'פאזה ⁦1×45°⁩', 'middle', 9)}`,
    spots: [
      { id: 'tol', x: 180, y: 22, r: 22, err: true, title: 'טולרנס צר מדי על מידה לא פונקציונלית', why: 'טולרנס של ±0.002 מ"מ על האורך החיצוני דורש השחזה ומדידה במעבדה, והמידה הזו לא משפיעה על התפקוד. טולרנס צר הוא אחד הגורמים הכי יקרים בחלק.', fix: 'לתת טולרנס צר רק למידות פונקציונליות, ולשאר להשתמש בטולרנס כללי.' },
      { id: 'pocketA', x: 100, y: 88, r: 26, err: true, title: 'פינות פנימיות חדות בכיס', why: 'כרסום מסתובב ולכן תמיד משאיר רדיוס שווה לרדיוס הכלי. פינה פנימית R0 אי אפשר לכרסם, אלא רק בעיבוד מיוחד ויקר כמו EDM.', fix: 'לתת רדיוס פינה מעט גדול מרדיוס הכלי, כמו בכיס השני.' },
      { id: 'pocketB', x: 100, y: 160, r: 26, err: false, title: 'כיס עם פינות מעוגלות', why: 'זה נכון: רדיוס פינה שמתאים לכלי סטנדרטי מאפשר לכרסם את הכיס במעבר רגיל.' },
      { id: 'slot', x: 186, y: 130, r: 20, err: true, title: 'חריץ עמוק וצר', why: 'עומק גדול פי 10 מהרוחב דורש כלי ארוך ודק, שמתכופף ורוטט. העיבוד איטי, הדיוק יורד, והכלי עלול להישבר.', fix: 'להרחיב את החריץ או להקטין את העומק. אם צריך חריץ צר, אפשר לשקול עיבוד אחר כמו חיתוך חוט.' },
      { id: 'tap', x: 270, y: 92, r: 22, err: true, title: 'הברגה עד קרקעית חור עיוור', why: 'למברז יש קצה מחודד, והוא לא יכול לחתוך הברגה מלאה עד הקרקעית. צריך גם מקום לשבבים.', fix: 'לקדוח עמוק יותר מאורך ההברגה הנדרש, ולציין את עומק ההברגה ואת עומק הקדח בנפרד.' },
      { id: 'hole', x: 270, y: 160, r: 20, err: false, title: 'קדח עובר בקוטר סטנדרטי', why: 'זה נכון: מקדח סטנדרטי, קדח עובר שמשאיר מקום לשבבים, ומרחק סביר מהדופן.' },
      { id: 'chamfer', x: 324, y: 196, r: 14, err: false, title: 'פאזה על פינה חיצונית', why: 'זה נכון: פאזה חיצונית קלה לעיבוד, מסירה פינה חדה ומקלה על ההרכבה.' },
    ],
  },
  {
    id: 'mold', title: 'מכסה פלסטיק בהזרקה', H: 214, source: `${BD}; ${KA}`,
    brief: 'מכסה ABS בהזרקה. חתך. החץ מראה את כיוון פתיחת התבנית. מצא מה יגרום לשקעים, לעיוות או לתבנית יקרה.',
    svg: () => `${arrowUp(345, 120, 50)}${T(345, 140, 'פתיחה', 'middle', 9)}
      <rect x="40" y="60" width="280" height="10" ${F}/><rect x="40" y="60" width="10" height="130" ${F}/><rect x="310" y="60" width="10" height="60" ${F}/><rect x="310" y="140" width="10" height="50" ${F}/>
      ${T(285, 133, 'חור בדופן', 'middle', 9)}
      <rect x="110" y="70" width="4" height="70" ${F}/>${T(112, 152, 'צלע', 'middle', 9)}
      <rect x="140" y="70" width="40" height="70" ${F}/>${T(160, 152, 'זיז מלא', 'middle', 9)}
      <rect x="220" y="70" width="30" height="70" ${F}/><rect x="229" y="70" width="12" height="62" fill="var(--surface)" stroke="var(--text)" stroke-width="1"/>${T(235, 152, 'זיז חלול', 'middle', 9)}
      ${T(100, 200, 'הדפנות אנכיות (0°)', 'middle', 9)}${T(180, 40, 'עובי דופן 2 בכל המכסה', 'middle', 9)}`,
    spots: [
      { id: 'corner', x: 52, y: 72, r: 14, err: true, title: 'פינה פנימית חדה', why: 'פינה חדה מרכזת מאמץ, ובפלסטיק היא נקודת שבר. היא גם מפריעה לזרימת החומר בתבנית.', fix: 'לתת רדיוס פנימי, ורדיוס חיצוני מתאים כדי שעובי הדופן יישאר אחיד.' },
      { id: 'draft', x: 45, y: 150, r: 16, err: true, title: 'אין זווית שחרור (draft)', why: 'דפנות אנכיות לגמרי נגררות ונשרטות כשהחלק נשלף, והחלק עלול להיתקע בתבנית.', fix: 'להוסיף זווית שחרור לכל הדפנות שבכיוון הפתיחה.' },
      { id: 'boss', x: 160, y: 105, r: 22, err: true, title: 'זיז מלא ועבה', why: 'אזור עבה מתקרר לאט יותר מהדפנות, ונוצרים שקעים בפני השטח (sink marks), חללים ועיוות.', fix: 'לרוקן את הזיז (coring) לעובי דופן אחיד, כמו הזיז החלול.' },
      { id: 'undercut', x: 315, y: 130, r: 16, err: true, title: 'חור בדופן הצד (undercut)', why: 'החור ניצב לכיוון הפתיחה ולכן חוסם את השליפה. התבנית צריכה מגרעת צד (side action), והיא יקרה ומסובכת יותר.', fix: 'להעביר את החור לכיוון הפתיחה, או לתכנן פתח שנפתח בשליפה רגילה.' },
      { id: 'rib', x: 112, y: 105, r: 14, err: false, title: 'צלע דקה מהדופן', why: 'זה נכון: צלע דקה מהדופן מחזקת בלי ליצור שקע בצד השני.' },
      { id: 'cored', x: 235, y: 105, r: 20, err: false, title: 'זיז חלול', why: 'זה נכון: הזיז מרוקן ושומר על עובי דופן קרוב לשאר החלק.' },
    ],
  },
  {
    id: 'sheet', title: 'מגש פח מכופף', H: 244, source: KA,
    brief: 'מגש מפח פלדה בעובי 2. פריסה שטוחה, והקווים המקווקווים הם קווי הכיפוף. מצא מה ייקרע, יתעוות או לא יכופף כמו שצריך.',
    svg: () => `<rect x="40" y="50" width="280" height="150" ${L}/>
      <line x1="40" y1="90" x2="320" y2="90" stroke="var(--muted)" stroke-dasharray="6 4"/><line x1="80" y1="50" x2="80" y2="200" stroke="var(--muted)" stroke-dasharray="6 4"/><line x1="280" y1="50" x2="280" y2="200" stroke="var(--muted)" stroke-dasharray="6 4"/>
      ${T(200, 72, 'שפה', 'middle', 9)}${T(60, 150, 'שפה', 'middle', 9)}${T(300, 150, 'שפה', 'middle', 9)}
      <circle cx="80" cy="90" r="4" ${HOLE}/>
      <circle cx="150" cy="95" r="5" ${HOLE}/><circle cx="200" cy="150" r="5" ${HOLE}/>
      ${T(180, 224, 'כל הכיפופים: רדיוס פנימי 0, עובי פח 2', 'middle', 9)}`,
    spots: [
      { id: 'relief', x: 80, y: 90, r: 14, err: false, title: 'חור הקלה בפינה', why: 'זה נכון: במקום ששני כיפופים נפגשים, חור הקלה (relief) מונע קריעה ועיוות של הפינה.' },
      { id: 'norelief', x: 280, y: 90, r: 14, err: true, title: 'אין הקלה במפגש כיפופים', why: 'שני כיפופים נפגשים כאן בלי חור הקלה. החומר נמתח לשני כיוונים ונקרע או מתעוות בפינה.', fix: 'להוסיף חור או חריץ הקלה, כמו בפינה השמאלית.' },
      { id: 'close', x: 150, y: 96, r: 14, err: true, title: 'חור קרוב לקו הכיפוף', why: 'החור נמצא באזור שנמתח בכיפוף, ולכן הוא יתעוות לאליפסה ויזוז ממקומו.', fix: 'להרחיק את החור מקו הכיפוף, או לנקב אותו אחרי הכיפוף.' },
      { id: 'far', x: 200, y: 150, r: 14, err: false, title: 'חור רחוק מהכיפופים', why: 'זה נכון: החור נמצא באזור שטוח ולא יתעוות.' },
      { id: 'radius', x: 180, y: 220, r: 24, err: true, title: 'רדיוס כיפוף 0', why: 'כיפוף חד בלי רדיוס מותח את הסיבים החיצוניים יותר ממה שהחומר מסוגל, והוא עלול להיסדק. הרדיוס המינימלי תלוי בחומר ובעובי.', fix: 'לתת רדיוס פנימי לפי החומר והעובי (בדרך כלל לפי טבלת הספק), ואותו רדיוס לכל הכיפופים.' },
    ],
  },
  {
    id: 'gdt', title: 'שרטוט פלטה עם 4 חורים', H: 248, source: Y,
    brief: 'שרטוט ייצור של פלטה. מצא מה יגרום לחלק שלא ניתן לבדוק, או לוויכוח עם הספק על מה נדרש.',
    svg: () => `<rect x="40" y="60" width="260" height="120" ${L}/>
      <circle cx="80" cy="90" r="6" ${HOLE}/><circle cx="260" cy="90" r="6" ${HOLE}/><circle cx="80" cy="150" r="6" ${HOLE}/><circle cx="260" cy="150" r="6" ${HOLE}/>
      ${TL(112, 86, '4× Ø8', 'middle', 10)}
      <rect x="105" y="28" width="22" height="18" ${L}/><rect x="127" y="28" width="40" height="18" ${L}/>${TL(116, 41, '⌖', 'middle', 11)}${TL(147, 41, 'Ø0.2', 'middle', 9)}
      <polygon points="54,180 66,180 60,190" fill="var(--text)"/><rect x="52" y="190" width="16" height="14" ${L}/>${TL(60, 201, 'A', 'middle', 9)}
      ${dim(40, 80, 216, '40')}${dim(80, 260, 216, '180')}${dim(260, 300, 216, '40')}${dim(40, 300, 234, '260')}
      ${T(300, 40, 'שבירת פינות ⁦0.5×45°⁩', 'end', 9)}`,
    spots: [
      { id: 'fcf', x: 136, y: 37, r: 22, err: true, title: 'טולרנס מיקום בלי דאטומים', why: 'טולרנס מיקום (position) מגדיר איפה החור ביחס לדאטומים. בלי דאטומים אין ממה למדוד, ואי אפשר לבדוק את הדרישה.', fix: 'להוסיף דאטומים למסגרת (למשל A, B, C) ולתת מידות בסיסיות (basic) בתיבה.' },
      { id: 'size', x: 112, y: 82, r: 16, err: true, title: 'קוטר בלי טולרנס', why: 'לקוטר Ø8 אין טולרנס, ובשרטוט אין טבלת טולרנס כללית. לא ברור מה מקובל, והספק יחליט בעצמו.', fix: 'לתת טולרנס לקוטר, או טבלת טולרנס כללית בכותרת השרטוט (למשל לפי ISO 2768).' },
      { id: 'chain', x: 170, y: 224, r: 22, err: true, title: 'מידות כפולות (שרשרת סגורה)', why: '40 + 180 + 40 וגם 260: אותו אורך מוגדר פעמיים. עם הטולרנסים אי אפשר לקיים את כל המידות ביחד, ולא ברור איזו קובעת.', fix: 'להוריד אחת מהמידות (או לסמן אותה כמידת עזר בסוגריים).' },
      { id: 'datum', x: 60, y: 192, r: 14, err: false, title: 'סימון דאטום A', why: 'זה נכון: הדאטום מוגדר על הפאה הגדולה והיציבה. הבעיה היא שמסגרת הטולרנס לא משתמשת בו.' },
      { id: 'note', x: 262, y: 37, r: 20, err: false, title: 'הערת שבירת פינות', why: 'זה נכון: הערה כללית ששוברת פינות חדות, נוחה לייצור ולבטיחות.' },
    ],
  },
  {
    id: 'shaft', title: 'ציר עם שני מיסבים', H: 200, source: SH,
    brief: 'הרכבת ציר בחתך: שני מיסבים כדוריים, טבעות עצירה, אטם ותעלת שגם. מצא מה יגרום לכשל או להרכבה שלא עובדת.',
    svg: () => `<rect x="30" y="108" width="80" height="24" ${F}/><rect x="110" y="100" width="140" height="40" ${F}/><polygon points="250,108 326,108 330,112 330,128 326,132 250,132" ${F}/>
      <rect x="150" y="100" width="95" height="5" fill="var(--surface)" stroke="var(--text)" stroke-width="1"/>${T(198, 96, 'תעלת שגם', 'middle', 9)}
      ${bearing(80, 80, 25, 28)}${bearing(80, 132, 25, 28)}${ring(76, 100, 8)}${ring(106, 100, 8)}${ring(76, 132, 8)}${ring(106, 132, 8)}
      ${bearing(270, 80, 25, 28)}${bearing(270, 132, 25, 28)}${ring(266, 100, 8)}${ring(296, 100, 8)}${ring(266, 132, 8)}${ring(296, 132, 8)}
      <rect x="45" y="96" width="12" height="12" fill="var(--text)" opacity="0.6"/><rect x="45" y="132" width="12" height="12" fill="var(--text)" opacity="0.6"/>${T(51, 90, 'אטם', 'middle', 9)}
      ${TL(118, 92, 'R2', 'middle', 9)}${T(92, 72, 'פינת מיסב R1', 'middle', 9)}
      ${T(180, 175, 'שני המיסבים נעולים בטבעות משני הצדדים', 'middle', 9)}`,
    spots: [
      { id: 'fillet', x: 110, y: 100, r: 12, err: true, title: 'רדיוס הכתף גדול מפינת המיסב', why: 'רדיוס הכתף (R2) גדול מרדיוס הפינה של המיסב (R1), ולכן המיסב נשען על הרדיוס ולא על הכתף. הוא לא יושב ישר ולא נתמך צירית.', fix: 'לתת רדיוס כתף קטן מרדיוס הפינה של המיסב, או להוסיף טבעת מרווח עם פאזה.' },
      { id: 'fixed', x: 282, y: 94, r: 18, err: true, title: 'שני המיסבים מקובעים צירית', why: 'כשהציר מתחמם הוא מתארך יותר מהבית. כששני המיסבים נעולים, נוצר עומס צירי גדול שמקצר את חיי המיסבים.', fix: 'לקבע מיסב אחד בלבד, ולתת לשני לצוף צירית (מיסב "חופשי").' },
      { id: 'key', x: 245, y: 102, r: 12, err: true, title: 'תעלת השגם נגמרת על רדיוס הכתף', why: 'ריכוז המאמץ של קצה התעלה מצטרף לריכוז המאמץ של הכתף באותו מקום. זה מקום קלאסי לסדק עייפות.', fix: 'לסיים את התעלה במרחק מהכתף.' },
      { id: 'seal', x: 51, y: 102, r: 14, err: false, title: 'אטם שפה', why: 'זה נכון: אטם בין הציר לבית שומר על הסיכה בפנים ועל לכלוך בחוץ.' },
      { id: 'chamf', x: 328, y: 113, r: 12, err: false, title: 'פאזה בקצה הציר', why: 'זה נכון: הפאזה מנחה את המיסב ואת האטם בהרכבה ומונעת פגיעה בהם.' },
    ],
  },
];

// the spot under a tap (nearest, within its radius plus a little slack), or null
export function spotAt(c, x, y, slack = 6) {
  let best = null, bd = Infinity;
  for (const s of c.spots) { const d = Math.hypot(s.x - x, s.y - y); if (d <= s.r + slack && d < bd) { best = s; bd = d; } }
  return best;
}
// marked: ids the user tapped
export function scoreHunt(c, marked) {
  const set = new Set(marked), errs = c.spots.filter((s) => s.err);
  const found = errs.filter((s) => set.has(s.id)), missed = errs.filter((s) => !set.has(s.id)), fa = c.spots.filter((s) => !s.err && set.has(s.id));
  const grade = Math.max(0, Math.round((10 * (found.length - fa.length)) / errs.length));
  return { found, missed, falseAlarms: fa, total: errs.length, grade };
}
