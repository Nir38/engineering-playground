// fbd.js: free-body diagram scenarios, grading and equilibrium solutions.
// Positions are canvas pixels (y down); force directions are math angles in degrees (y up).
// Checked in tests/fbd-cases.mjs: the answer key grades 100 %, mistakes are caught, and the
// solved magnitudes satisfy ΣF = 0 (and ΣM = 0 where the scenario defines points of action).
export const G = 9.81;
const rad = (d) => (d * Math.PI) / 180;
export const TYPES = { W: 'משקל W', N: 'נורמלי N', f: 'חיכוך f', T: 'מתיחות T', Fs: 'קפיץ Fs', P: 'כוח חיצוני P', R: 'תגובת סמך R' };
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const along = (p, u, s) => [p[0] + u[0] * s, p[1] + u[1] * s];
const scr = (deg) => [Math.cos(rad(deg)), -Math.sin(rad(deg))]; // math angle -> screen unit vector

// Each scenario: make(params) -> { params, title, prompt, body, env, expected, solve() }
// expected: { key, type, alt?, name, pt | seg, dir | axis, hint }
// solve(): { values: { key: signed magnitude along dir/axis }, rows: [[label, value, unit, eq]] }
export const SCENARIOS = {
  floor: {
    name: 'ארגז על רצפה',
    rand: () => ({ m: pick([10, 15, 20, 25, 40]) }),
    make: ({ m }) => ({
      title: 'ארגז על רצפה', prompt: `ארגז של ${m} kg עומד במנוחה על רצפה. שרטט את הכוחות על הארגז.`,
      body: { poly: [[130, 140], [230, 140], [230, 200], [130, 200]] },
      env: [{ hatch: [[30, 200], [330, 200]] }],
      expected: [
        { key: 'W', type: 'W', name: 'משקל', pt: [180, 170], dir: 270, hint: 'כל גוף עם מסה: משקל במרכז הכובד, כלפי מטה.' },
        { key: 'N', type: 'N', alt: ['R'], name: 'נורמלי מהרצפה', seg: [[130, 200], [230, 200]], dir: 90, hint: 'במגע עם הרצפה: כוח ניצב למשטח, דוחף לתוך הגוף.' },
      ],
      solve() { const W = m * G; return { values: { W, N: W }, rows: [['W', W, 'N', 'W = mg'], ['N', W, 'N', 'ΣFy = 0 → N = W']] }; },
    }),
  },
  incline: {
    name: 'ארגז על מדרון',
    rand: () => ({ m: pick([5, 10, 20]), th: pick([20, 25, 30, 35]) }),
    make: ({ m, th }) => {
      const O = [40, 228], u = scr(th), n = scr(th + 90), C = along(O, u, 175), a = along(C, u, -34), b = along(C, u, 34);
      const end = along(O, u, 300);
      return {
        title: 'ארגז על מדרון', prompt: `ארגז של ${m} kg נח על מדרון בזווית ${th}° ולא מחליק. שרטט את הכוחות על הארגז.`,
        body: { poly: [a, b, along(b, n, 42), along(a, n, 42)] },
        env: [{ poly: [O, end, [end[0], O[1]]] }, { hatch: [[20, O[1]], [340, O[1]]] }, { label: [O[0] + 46, O[1] - 7, `${th}°`] }],
        expected: [
          { key: 'W', type: 'W', name: 'משקל', pt: along(C, n, 21), dir: 270, hint: 'המשקל תמיד אנכי כלפי מטה, גם על מדרון.' },
          { key: 'N', type: 'N', alt: ['R'], name: 'נורמלי מהמדרון', seg: [a, b], dir: th + 90, hint: 'הנורמלי ניצב למשטח המדרון, לא אנכי.' },
          { key: 'f', type: 'f', name: 'חיכוך סטטי', seg: [a, b], dir: th, hint: 'הארגז "רוצה" להחליק למטה, ולכן החיכוך מכוון במעלה המדרון, לאורך המשטח.' },
        ],
        solve() {
          const W = m * G, N = W * Math.cos(rad(th)), f = W * Math.sin(rad(th));
          return { values: { W, N, f }, rows: [['W', W, 'N', 'W = mg'], ['N', N, 'N', 'ניצב למדרון: N = mg cosθ'], ['f', f, 'N', 'לאורך המדרון: f = mg sinθ'], ['μs מינימלי', Math.tan(rad(th)), '', 'f ≤ μs N → μs ≥ tanθ']] };
        },
      };
    },
  },
  pull: {
    name: 'ארגז נגרר בחבל',
    rand: () => ({ m: pick([10, 20, 30]), al: pick([20, 25, 30, 35, 40]), mu: pick([0.2, 0.3, 0.4]) }),
    make: ({ m, al, mu }) => {
      const A = [210, 172], R = along(A, scr(al), 120);
      return {
        title: 'ארגז נגרר בחבל', prompt: `ארגז של ${m} kg נגרר ימינה במהירות קבועה בחבל בזווית ${al}° מעל האופק. ${'μk'} = ${mu}. שרטט את הכוחות על הארגז.`,
        body: { poly: [[120, 145], [210, 145], [210, 200], [120, 200]] },
        env: [{ hatch: [[20, 200], [340, 200]] }, { rope: [A, R] }, { label: [A[0] + 42, A[1] + 2, `${al}°`] }, { motion: [[140, 128], [190, 128]] }],
        expected: [
          { key: 'W', type: 'W', name: 'משקל', pt: [165, 172], dir: 270, hint: 'משקל במרכז הכובד, כלפי מטה.' },
          { key: 'N', type: 'N', alt: ['R'], name: 'נורמלי', seg: [[120, 200], [210, 200]], dir: 90, hint: 'מגע עם הרצפה: ניצב לרצפה.' },
          { key: 'f', type: 'f', name: 'חיכוך קינטי', seg: [[120, 200], [210, 200]], dir: 180, hint: 'החיכוך מתנגד לתנועה: הארגז זז ימינה, החיכוך שמאלה.' },
          { key: 'T', type: 'T', name: 'מתיחות בחבל', pt: A, dir: al, hint: 'חבל רק מושך, לאורך החבל, מהגוף החוצה.' },
        ],
        solve() {
          const W = m * G, T = (mu * W) / (Math.cos(rad(al)) + mu * Math.sin(rad(al))), N = W - T * Math.sin(rad(al)), f = mu * N;
          return { values: { W, N, f, T }, rows: [['T', T, 'N', 'T = μmg/(cosα + μ sinα)'], ['N', N, 'N', 'ΣFy = 0: N = mg − T sinα'], ['f', f, 'N', 'f = μk N = T cosα'], ['W', W, 'N', 'W = mg']] };
        },
      };
    },
  },
  lamp: {
    name: 'מנורה על שני כבלים',
    rand: () => ({ m: pick([4, 6, 10]), a1: pick([40, 45, 50, 55, 60]), a2: pick([40, 45, 50, 55, 60, 65]) }),
    make: ({ m, a1, a2 }) => {
      const A = [180, 157], L = [180, 177], dy = A[1] - 30;
      const P1 = [A[0] - dy / Math.tan(rad(a1)), 30], P2 = [A[0] + dy / Math.tan(rad(a2)), 30];
      return {
        title: 'מנורה על שני כבלים', prompt: `מנורה של ${m} kg תלויה על שני כבלים בזוויות ${a1}° ו-${a2}° מהאופק. שרטט את הכוחות על המנורה.`,
        body: { circle: [L, 20] },
        env: [{ hatch: [[10, 30], [350, 30], 'up'] }, { rope: [A, P1] }, { rope: [A, P2] }, { label: [A[0] - 42, A[1] - 6, `${a1}°`] }, { label: [A[0] + 42, A[1] - 6, `${a2}°`] }],
        expected: [
          { key: 'W', type: 'W', name: 'משקל', pt: L, dir: 270, hint: 'משקל המנורה, כלפי מטה.' },
          { key: 'T1', type: 'T', name: 'מתיחות בכבל השמאלי', pt: A, dir: 180 - a1, hint: 'כל כבל מושך לאורכו, לכיוון נקודת התלייה.' },
          { key: 'T2', type: 'T', name: 'מתיחות בכבל הימני', pt: A, dir: a2, hint: 'כל כבל מושך לאורכו, לכיוון נקודת התלייה.' },
        ],
        solve() {
          const W = m * G, s = Math.sin(rad(a1 + a2)), T1 = (W * Math.cos(rad(a2))) / s, T2 = (W * Math.cos(rad(a1))) / s;
          return { values: { W, T1, T2 }, rows: [['T₁', T1, 'N', 'T₁ = W cosα₂ / sin(α₁+α₂)'], ['T₂', T2, 'N', 'T₂ = W cosα₁ / sin(α₁+α₂)'], ['W', W, 'N', 'W = mg']] };
        },
      };
    },
  },
  ladder: {
    name: 'סולם נשען על קיר',
    rand: () => ({ m: pick([10, 15, 20]), be: pick([55, 60, 65, 70]) }),
    make: ({ m, be }) => {
      const B = [300 - 220 * Math.cos(rad(be)), 225], Tp = [300, 225 - 220 * Math.sin(rad(be))], n = scr(be + 90);
      const M = [(B[0] + Tp[0]) / 2, (B[1] + Tp[1]) / 2];
      return {
        title: 'סולם נשען על קיר', prompt: `סולם אחיד של ${m} kg נשען על קיר חלק (בלי חיכוך) ועומד על רצפה מחוספסת בזווית ${be}°, במנוחה. שרטט את הכוחות על הסולם.`,
        body: { poly: [along(B, n, 4), along(Tp, n, 4), along(Tp, n, -4), along(B, n, -4)] },
        env: [{ hatch: [[20, 225], [300, 225]] }, { wall: [[300, 20], [300, 225]] }, { label: [B[0] + 40, 218, `${be}°`] }],
        expected: [
          { key: 'W', type: 'W', name: 'משקל', pt: M, dir: 270, hint: 'סולם אחיד: המשקל באמצע, כלפי מטה.' },
          { key: 'N1', type: 'N', alt: ['R'], name: 'נורמלי מהרצפה', pt: B, dir: 90, hint: 'ברצפה: ניצב לרצפה, כלפי מעלה.' },
          { key: 'f', type: 'f', name: 'חיכוך ברצפה', pt: B, dir: 0, hint: 'הבסיס "רוצה" להחליק הרחק מהקיר, ולכן החיכוך מכוון לכיוון הקיר.' },
          { key: 'N2', type: 'N', alt: ['R'], name: 'נורמלי מהקיר', pt: Tp, dir: 180, hint: 'קיר חלק: רק כוח ניצב לקיר, דוחף הרחק ממנו. אין חיכוך בקיר.' },
        ],
        solve() {
          const W = m * G, N2 = W / (2 * Math.tan(rad(be)));
          return { values: { W, N1: W, f: N2, N2 }, rows: [['N₁', W, 'N', 'ΣFy = 0: N₁ = W'], ['N₂', N2, 'N', 'ΣM סביב הבסיס: N₂ = W/(2 tanβ)'], ['f', N2, 'N', 'ΣFx = 0: f = N₂'], ['μ מינימלי', 1 / (2 * Math.tan(rad(be))), '', 'f ≤ μN₁ → μ ≥ 1/(2 tanβ)']] };
        },
      };
    },
  },
  beam: {
    name: 'קורה על שני סמכים',
    rand: () => ({ P: pick([10, 12, 20, 30]), c: pick([1.5, 2, 3, 4, 4.5]) }),
    make: ({ P, c }) => {
      const L = 6, X = (xm) => 50 + (xm / L) * 260, xc = X(c);
      return {
        title: 'קורה על שני סמכים', prompt: `קורה חסרת משקל באורך ${L} m על סמך נייח A (משמאל) וגלגלת B (מימין). כוח ${P} kN כלפי מטה במרחק ${c} m מ-A. שרטט את הכוחות על הקורה.`,
        body: { poly: [[50, 135], [310, 135], [310, 145], [50, 145]] },
        env: [{ pin: [50, 145] }, { roller: [310, 145] }, { label: [50, 182, 'A'] }, { label: [310, 182, 'B'] }, { dim: [[50, 120], [xc, 120], `${c} m`] }],
        unit: 'kN',
        expected: [
          { key: 'P', type: 'P', name: 'העומס P', pt: [xc, 135], dir: 270, hint: 'העומס הנתון, בנקודת הפעולה שלו.' },
          { key: 'Ay', type: 'R', alt: ['N'], name: 'תגובה אנכית ב-A', pt: [50, 145], axis: 90, hint: 'סמך נייח מונע תזוזה בשני הכיוונים: שני רכיבי תגובה, אנכי ואופקי.' },
          { key: 'Ax', type: 'R', name: 'תגובה אופקית ב-A', pt: [50, 145], axis: 0, hint: 'בסמך נייח מסמנים גם רכיב אופקי, גם אם בסוף יוצא 0.' },
          { key: 'By', type: 'R', alt: ['N'], name: 'תגובה ב-B', pt: [310, 145], axis: 90, hint: 'גלגלת: רק תגובה אחת, ניצבת למשטח.' },
        ],
        solve() {
          const By = (P * c) / L, Ay = (P * (L - c)) / L;
          return { values: { P, Ay, Ax: 0, By }, rows: [['B_y', By, 'kN', 'ΣM_A = 0: B·L = P·c'], ['A_y', Ay, 'kN', 'ΣFy = 0: A_y = P − B_y'], ['A_x', 0, 'kN', 'ΣFx = 0: אין עומס אופקי']] };
        },
      };
    },
  },
  spring: {
    name: 'משקולת על קפיץ',
    rand: () => ({ m: pick([1, 2, 5]), k: pick([200, 500, 1000]) }),
    make: ({ m, k }) => ({
      title: 'משקולת על קפיץ', prompt: `משקולת של ${m} kg תלויה במנוחה על קפיץ עם k = ${k} N/m. שרטט את הכוחות על המשקולת.`,
      body: { poly: [[150, 132], [210, 132], [210, 182], [150, 182]] },
      env: [{ hatch: [[110, 25], [250, 25], 'up'] }, { spring: [[180, 25], [180, 132]] }],
      expected: [
        { key: 'W', type: 'W', name: 'משקל', pt: [180, 157], dir: 270, hint: 'משקל במרכז, כלפי מטה.' },
        { key: 'Fs', type: 'Fs', alt: ['T'], name: 'כוח הקפיץ', pt: [180, 132], dir: 90, hint: 'הקפיץ מתוח, ולכן מושך את המשקולת כלפי מעלה, בנקודת החיבור.' },
      ],
      solve() { const W = m * G; return { values: { W, Fs: W }, rows: [['Fs', W, 'N', 'ΣFy = 0: kδ = mg'], ['δ (התארכות)', (1000 * W) / k, 'mm', 'δ = mg/k']] }; },
    }),
  },
};

// ---------- grading ----------
const angDiff = (a, b) => { const d = (((a - b) % 360) + 540) % 360 - 180; return Math.abs(d); };
const segDist = ([x, y], [[x1, y1], [x2, y2]]) => { const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L2)); return Math.hypot(x - x1 - t * dx, y - y1 - t * dy); };
export const inRegion = (e, p) => (e.seg ? segDist(p, e.seg) <= 18 : Math.hypot(p[0] - e.pt[0], p[1] - e.pt[1]) <= 24);
const dirOk = (e, a) => (e.axis != null ? Math.min(angDiff(a, e.axis), angDiff(a, e.axis + 180)) <= 20 : angDiff(a, e.dir) <= 20);
const typeOk = (e, t) => t === e.type || (e.alt || []).includes(t);

// user: [{ id, type, x, y, ang }]
export function grade(sc, user) {
  const used = new Set(), items = sc.expected.map((e) => ({ key: e.key, name: e.name, type: e.type, status: 'missing', hint: e.hint }));
  // pass 1: right type, place and direction
  sc.expected.forEach((e, i) => { const u = user.find((q) => !used.has(q.id) && typeOk(e, q.type) && inRegion(e, [q.x, q.y]) && dirOk(e, q.ang)); if (u) { used.add(u.id); items[i].status = 'ok'; items[i].id = u.id; } });
  // pass 2: right type and place, wrong direction
  sc.expected.forEach((e, i) => { if (items[i].status !== 'missing') return; const u = user.find((q) => !used.has(q.id) && typeOk(e, q.type) && inRegion(e, [q.x, q.y])); if (u) { used.add(u.id); items[i].status = 'dir'; items[i].id = u.id; } });
  // pass 3: right type, wrong place
  sc.expected.forEach((e, i) => { if (items[i].status !== 'missing') return; const u = user.find((q) => !used.has(q.id) && typeOk(e, q.type)); if (u) { used.add(u.id); items[i].status = 'place'; items[i].id = u.id; } });
  const extras = user.filter((q) => !used.has(q.id)).map((q) => {
    let msg = 'הכוח הזה לא שייך לדיאגרמה.';
    if (!sc.expected.some((e) => typeOk(e, q.type))) {
      if (q.type === 'P') msg = 'אין כאן כוח חיצוני: "כוח התנועה" או "כוח האינרציה" לא קיימים. רק גופים אחרים מפעילים כוחות על הגוף.';
      else if (q.type === 'N' || q.type === 'f' || q.type === 'R') msg = 'N, f ו-R פועלים רק במקום שבו יש מגע עם גוף אחר או סמך.';
      else if (q.type === 'T') msg = 'אין כאן חבל שמחובר לגוף.';
      else if (q.type === 'Fs') msg = 'אין כאן קפיץ.';
      else if (q.type === 'f') msg = 'אין כאן חיכוך.';
    } else msg = 'כוח כפול או מיותר: הכוחות מהסוג הזה כבר מסומנים.';
    return { id: q.id, type: q.type, msg };
  });
  const ok = items.filter((i) => i.status === 'ok').length;
  return { items, extras, ok, total: items.length, allOk: ok === items.length && !extras.length };
}
// the answer key as user forces (used by "show solution" and the tests)
export function answerKey(sc) {
  return sc.expected.map((e, i) => {
    const p = e.pt || [(e.seg[0][0] + e.seg[1][0]) / 2, (e.seg[0][1] + e.seg[1][1]) / 2];
    return { id: 1000 + i, type: e.type, x: p[0], y: p[1], ang: e.dir ?? e.axis };
  });
}
