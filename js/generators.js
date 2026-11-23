// generators.js: numeric problems with fresh numbers each time.
// The answer is always computed by js/formulas.js, never typed by hand.
// Each generator returns { q, answer, unit, tol, steps[], diagram, source }.
import * as f from './formulas.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
// number formatting for text: up to 3 significant digits, no trailing zeros
export const fmt = (x, sig = 3) => {
  if (!isFinite(x)) return String(x);
  if (x === 0) return '0';
  const p = Math.max(0, sig - 1 - Math.floor(Math.log10(Math.abs(x))));
  return String(Number(x.toFixed(Math.min(p, 8))));
};

const MAT = {
  steel: { name: 'פלדה', E: 200e9, G: 80e9, alpha: 12e-6, Sy: 250e6 },
  al: { name: 'אלומיניום', E: 70e9, G: 26e9, alpha: 23e-6, Sy: 275e6 },
};
const SRC_H = 'Hibbeler, Mechanics of Materials';
const SRC_S = "Shigley's Mechanical Engineering Design";

export const generators = {
  // ---------- stress & strain ----------
  'g-axial-stress': {
    subtopic: 'stress-strain', difficulty: 1,
    make() {
      const d = pick([10, 12, 16, 20, 25, 30]); const F = pick([5, 8, 10, 15, 20, 25, 40]);
      const s = f.normalStress(F * 1e3, f.area.circle(d / 1000)) / 1e6;
      return {
        q: `מוט עגול בקוטר $d=${d}$ mm מועמס בכוח מתיחה צירי $F=${F}$ kN. מה המאמץ הנורמלי במוט?`,
        answer: s, unit: 'MPa',
        steps: [`A=\\frac{\\pi d^2}{4}=\\frac{\\pi (${d})^2}{4}=${fmt(f.area.circle(d), 4)}\\ \\text{mm}^2`, `\\sigma=\\frac{F}{A}=\\frac{${F * 1000}}{${fmt(f.area.circle(d), 4)}}=${fmt(s)}\\ \\text{MPa}`],
        hint: 'N/mm² = MPa. זה חוסך המרות.',
        diagram: { fn: 'axialBar', args: [{ F: `${F} kN`, A: `d = ${d} mm` }] }, source: `${SRC_H}, פרק 1`,
      };
    },
  },
  'g-hooke-strain': {
    subtopic: 'stress-strain', difficulty: 1,
    make() {
      const m = pick([MAT.steel, MAT.al]); const s = pick([50, 80, 100, 120, 150]);
      const eps = s / (m.E / 1e6);
      return {
        q: `במוט מ${m.name} ($E=${m.E / 1e9}$ GPa) יש מאמץ מתיחה $\\sigma=${s}$ MPa בתחום האלסטי. מה העיבור? תן את התשובה ביחידות $10^{-6}$ (מיקרו-עיבור).`,
        answer: eps * 1e6, unit: 'με',
        steps: [`\\varepsilon=\\frac{\\sigma}{E}=\\frac{${s}}{${m.E / 1e6}}=${fmt(eps, 3)}`, `= ${fmt(eps * 1e6)}\\times 10^{-6}`],
        hint: 'להעביר את E ל-MPa: 1 GPa = 1,000 MPa. עיבור אלסטי במתכת הוא בסדר גודל של 10⁻⁴ עד 10⁻³.',
        source: `${SRC_H}, פרקים 2-3`,
      };
    },
  },
  'g-poisson': {
    subtopic: 'stress-strain', difficulty: 2,
    make() {
      const d = pick([20, 25, 30]); const F = pick([30, 50, 60]); const nu = 0.3;
      const A = f.area.circle(d); const eps = (F * 1e3) / A / 200e3; const dd = nu * eps * d;
      return {
        q: `מוט פלדה בקוטר $d=${d}$ mm ($E=200$ GPa, $\\nu=0.3$) נמתח בכוח $F=${F}$ kN. בכמה מיקרומטר ($\\mu m$) קטן הקוטר?`,
        answer: dd * 1000, unit: 'μm',
        steps: [`\\sigma=F/A=${fmt((F * 1e3) / A)}\\ \\text{MPa}`, `\\varepsilon_{long}=\\sigma/E=${fmt(eps)}`, `\\varepsilon_{lat}=-\\nu\\varepsilon_{long}=${fmt(-nu * eps)}`, `\\Delta d=\\varepsilon_{lat} d = ${fmt(-dd * 1000)}\\ \\mu m`],
        source: `${SRC_H}, פרק 3`,
      };
    },
  },
  // ---------- stress-strain curve ----------
  'g-resilience': {
    subtopic: 'curve', difficulty: 2,
    make() {
      const m = pick([{ n: 'פלדה', Sy: 250, E: 200 }, { n: 'פלדה', Sy: 350, E: 200 }, { n: 'אלומיניום 6061-T6', Sy: 275, E: 69 }]);
      const U = f.resilienceModulus(m.Sy * 1e6, m.E * 1e9) / 1e3;
      return {
        q: `חשב את מודול החוסן (modulus of resilience) של ${m.n} עם $S_y=${m.Sy}$ MPa ו-$E=${m.E}$ GPa. תשובה ב-kJ/m³.`,
        answer: U, unit: 'kJ/m³',
        steps: [`U_r=\\frac{S_y^2}{2E}=\\frac{(${m.Sy}\\times10^6)^2}{2\\cdot ${m.E}\\times10^9}=${fmt(U * 1e3)}\\ \\text{J/m}^3`, `=${fmt(U)}\\ \\text{kJ/m}^3`],
        hint: 'זה השטח מתחת לחלק הישר של עקומת מאמץ-עיבור.',
        diagram: { fn: 'stressStrain', args: [{}] }, source: `${SRC_H}, פרק 3`,
      };
    },
  },
  'g-permanent': {
    subtopic: 'curve', difficulty: 2,
    make() {
      const s = pick([300, 320, 350, 380]); const epsT = pick([0.006, 0.008, 0.01, 0.012]);
      const ep = f.permanentStrain(epsT, s, 200e3);
      return {
        q: `דגם פלדה ($E=200$ GPa) נמתח מעבר לכניעה עד מאמץ $\\sigma=${s}$ MPa ועיבור כולל $\\varepsilon=${epsT}$, ואז העומס שוחרר. מה העיבור הקבוע (פלסטי) שנשאר? תשובה ב-%.`,
        answer: ep * 100, unit: '%',
        steps: [`\\varepsilon_{el}=\\sigma/E=${s}/200000=${fmt(s / 200e3)}`, `\\varepsilon_{pl}=\\varepsilon-\\varepsilon_{el}=${epsT}-${fmt(s / 200e3)}=${fmt(ep)}`, `=${fmt(ep * 100)}\\%`],
        hint: 'בשחרור העקומה יורדת בקו מקביל לשיפוע E.',
        source: `${SRC_H}, פרק 3`,
      };
    },
  },
  'g-true-stress': {
    subtopic: 'curve', difficulty: 2,
    make() {
      const s = pick([400, 420, 450]); const e = pick([0.1, 0.15, 0.2]);
      const sT = f.trueStress(s, e);
      return {
        q: `במבחן מתיחה, לפני תחילת ה-necking, נמדד מאמץ הנדסי $${s}$ MPa בעיבור הנדסי $${e}$. מה המאמץ האמיתי (true stress)?`,
        answer: sT, unit: 'MPa',
        steps: [`\\sigma_T=\\sigma(1+\\varepsilon)=${s}(1+${e})=${fmt(sT)}\\ \\text{MPa}`],
        hint: 'הנוסחה מניחה נפח קבוע, ולכן היא תקפה רק עד תחילת ה-necking.',
        source: `${SRC_S}, פרק 2`,
      };
    },
  },
  // ---------- axial ----------
  'g-elongation': {
    subtopic: 'axial', difficulty: 1,
    make() {
      const m = pick([MAT.steel, MAT.al]); const d = pick([10, 12, 16, 20]); const L = pick([0.5, 1, 1.5, 2]); const F = pick([5, 10, 15, 20]);
      const A = f.area.circle(d / 1000); const dL = f.elongation(F * 1e3, L, A, m.E) * 1000;
      return {
        q: `מוט מ${m.name} ($E=${m.E / 1e9}$ GPa), קוטר $${d}$ mm ואורך $${L}$ m, נמתח בכוח $${F}$ kN. מה ההתארכות?`,
        answer: dL, unit: 'mm',
        steps: [`A=${fmt(A * 1e6, 4)}\\ \\text{mm}^2`, `\\Delta L=\\frac{FL}{AE}=\\frac{${F * 1000}\\cdot ${L * 1000}}{${fmt(A * 1e6, 4)}\\cdot ${m.E / 1e6}}=${fmt(dL)}\\ \\text{mm}`],
        hint: 'עובדים ב-N, mm, MPa ומקבלים mm.',
        diagram: { fn: 'axialBar', args: [{ F: `${F} kN`, L: `${L} m`, A: `d = ${d} mm` }] }, source: `${SRC_H}, פרק 4`,
      };
    },
  },
  'g-thermal-stress': {
    subtopic: 'axial', difficulty: 2,
    make() {
      const m = pick([MAT.steel, MAT.al]); const dT = pick([20, 30, 40, 50]);
      const s = f.thermalStressConstrained(m.E, m.alpha, dT) / 1e6;
      return {
        q: `מוט מ${m.name} ($E=${m.E / 1e9}$ GPa, $\\alpha=${m.alpha * 1e6}\\times10^{-6}$ 1/°C) מקובע בין שני קירות קשיחים ומחומם ב-$${dT}$ °C. מה מאמץ הלחיצה שנוצר בו?`,
        answer: s, unit: 'MPa',
        steps: [`\\varepsilon_{th}=\\alpha\\Delta T=${fmt(m.alpha * dT)}`, `\\sigma=E\\alpha\\Delta T=${m.E / 1e6}\\cdot ${fmt(m.alpha * dT)}=${fmt(s)}\\ \\text{MPa}`],
        hint: 'האורך והחתך לא משפיעים. רק החומר והפרש הטמפרטורות.',
        diagram: { fn: 'constrainedBar', args: [] }, source: `${SRC_H}, פרק 4`,
      };
    },
  },
  // ---------- torsion ----------
  'g-torsion-tau': {
    subtopic: 'torsion', difficulty: 1,
    make() {
      const d = pick([20, 25, 30, 40, 50]); const T = pick([100, 200, 300, 500, 800]);
      const tau = f.solidShaftTauMax(T, d / 1000) / 1e6;
      return {
        q: `ציר מלא בקוטר $d=${d}$ mm מעביר מומנט פיתול $T=${T}$ N·m. מה מאמץ הגזירה המקסימלי?`,
        answer: tau, unit: 'MPa',
        steps: [`J=\\frac{\\pi d^4}{32}=${fmt(f.J.circle(d), 4)}\\ \\text{mm}^4`, `\\tau_{max}=\\frac{T r}{J}=\\frac{16T}{\\pi d^3}=\\frac{16\\cdot ${T * 1000}}{\\pi\\cdot ${d}^3}=${fmt(tau)}\\ \\text{MPa}`],
        diagram: { fn: 'shaft', args: [{ T: `${T} N·m` }] }, source: `${SRC_H}, פרק 5`,
      };
    },
  },
  'g-shaft-power': {
    subtopic: 'torsion', difficulty: 2,
    make() {
      const P = pick([5, 10, 15, 22, 30]); const n = pick([1000, 1450, 1500, 3000]); const d = pick([25, 30, 35, 40]);
      const T = f.torqueFromPower(P * 1e3, n); const tau = f.solidShaftTauMax(T, d / 1000) / 1e6;
      return {
        q: `מנוע חשמלי של $${P}$ kW מסתובב ב-$${n}$ rpm ומניע ציר מלא בקוטר $${d}$ mm. מה מאמץ הגזירה המקסימלי בציר?`,
        answer: tau, unit: 'MPa',
        steps: [`\\omega=\\frac{2\\pi n}{60}=${fmt((2 * Math.PI * n) / 60)}\\ \\text{rad/s}`, `T=\\frac{P}{\\omega}=${fmt(T)}\\ \\text{N}\\cdot\\text{m}`, `\\tau=\\frac{16T}{\\pi d^3}=${fmt(tau)}\\ \\text{MPa}`],
        hint: 'קודם מומנט מתוך ההספק: P = Tω.',
        diagram: { fn: 'shaft', args: [{}] }, source: `${SRC_H}, פרק 5`,
      };
    },
  },
  'g-twist': {
    subtopic: 'torsion', difficulty: 2,
    make() {
      const d = pick([20, 25, 30]); const L = pick([0.5, 1, 1.5]); const T = pick([100, 150, 200]);
      const phi = f.deg(f.twistAngle(T, L, 80e9, f.J.circle(d / 1000)));
      return {
        q: `ציר פלדה מלא ($G=80$ GPa), קוטר $${d}$ mm ואורך $${L}$ m, מועמס במומנט $${T}$ N·m. מה זווית הפיתול במעלות?`,
        answer: phi, unit: '°',
        steps: [`J=${fmt(f.J.circle(d), 4)}\\ \\text{mm}^4`, `\\varphi=\\frac{TL}{GJ}=\\frac{${T * 1000}\\cdot ${L * 1000}}{80000\\cdot ${fmt(f.J.circle(d), 4)}}=${fmt(f.rad(phi), 4)}\\ \\text{rad}`, `=${fmt(phi)}^\\circ`],
        hint: 'הנוסחה נותנת רדיאנים. להכפיל ב-180/π.',
        diagram: { fn: 'shaft', args: [{ T: `${T} N·m`, L: `${L} m` }] }, source: `${SRC_H}, פרק 5`,
      };
    },
  },
  // ---------- bending ----------
  'g-bending-rect': {
    subtopic: 'bending', difficulty: 1,
    make() {
      const b = pick([20, 30, 40, 50]); const h = pick([60, 80, 100, 120]); const M = pick([1, 2, 3, 5, 8]);
      const Iv = f.I.rect(b, h); const s = f.bendingStress(M * 1e6, h / 2, Iv);
      return {
        q: `קורה בחתך מלבני $b=${b}$ mm (רוחב) ו-$h=${h}$ mm (גובה) מועמסת במומנט כפיפה $M=${M}$ kN·m. מה מאמץ הכפיפה המקסימלי?`,
        answer: s, unit: 'MPa',
        steps: [`I=\\frac{bh^3}{12}=${fmt(Iv, 4)}\\ \\text{mm}^4`, `c=h/2=${h / 2}\\ \\text{mm}`, `\\sigma=\\frac{Mc}{I}=\\frac{${M}\\times10^6\\cdot ${h / 2}}{${fmt(Iv, 4)}}=${fmt(s)}\\ \\text{MPa}`],
        diagram: { fn: 'section', args: ['rect', { b: `b=${b}`, h: `h=${h}` }] }, source: `${SRC_H}, פרק 6`,
      };
    },
  },
  'g-bending-beam': {
    subtopic: 'bending', difficulty: 3,
    make() {
      const w = pick([2, 4, 5, 8]); const L = pick([2, 3, 4]); const b = pick([50, 60]); const h = pick([100, 150, 200]);
      const M = f.beam['ss-udl'].Mmax(w, L); // kN*m
      const s = f.bendingStress(M * 1e6, h / 2, f.I.rect(b, h));
      return {
        q: `קורה נתמכת פשוט באורך $${L}$ m נושאת עומס מפוזר $w=${w}$ kN/m. החתך מלבני: $b=${b}$ mm, $h=${h}$ mm. מה מאמץ הכפיפה המקסימלי?`,
        answer: s, unit: 'MPa',
        steps: [`M_{max}=\\frac{wL^2}{8}=${fmt(M)}\\ \\text{kN}\\cdot\\text{m}`, `I=\\frac{bh^3}{12}=${fmt(f.I.rect(b, h), 4)}\\ \\text{mm}^4`, `\\sigma=\\frac{Mc}{I}=${fmt(s)}\\ \\text{MPa}`],
        diagram: { fn: 'beam', args: ['ss-udl', { diagrams: true, load: `w=${w} kN/m`, L: `${L} m` }] }, source: `${SRC_H}, פרק 6`,
      };
    },
  },
  // ---------- transverse shear ----------
  'g-shear-rect': {
    subtopic: 'shear', difficulty: 1,
    make() {
      const V = pick([5, 10, 20, 30]); const b = pick([20, 30, 40]); const h = pick([60, 80, 100]);
      const tau = f.rectMaxShear(V * 1e3, b, h);
      return {
        q: `כוח גזירה $V=${V}$ kN פועל בחתך מלבני $${b}\\times${h}$ mm. מה מאמץ הגזירה המקסימלי (בציר הניטרלי)?`,
        answer: tau, unit: 'MPa',
        steps: [`\\tau_{avg}=V/A=${fmt((V * 1e3) / (b * h))}\\ \\text{MPa}`, `\\tau_{max}=1.5\\,\\frac{V}{A}=${fmt(tau)}\\ \\text{MPa}`],
        hint: 'במלבן הגזירה המקסימלית גדולה פי 1.5 מהממוצעת.',
        diagram: { fn: 'section', args: ['rect', { shear: true }] }, source: `${SRC_H}, פרק 7`,
      };
    },
  },
  // ---------- deflection ----------
  'g-defl-cant': {
    subtopic: 'deflection', difficulty: 2,
    make() {
      const P = pick([200, 500, 1000, 1500]); const L = pick([500, 800, 1000]); const b = pick([20, 30, 40]); const h = pick([40, 50, 60]);
      const Iv = f.I.rect(b, h); const d = f.beam['cant-point'].defl(P, L, 200e3, Iv);
      return {
        q: `קורת שלוחה מפלדה ($E=200$ GPa) באורך $${L}$ mm, חתך מלבני $b=${b}$ mm, $h=${h}$ mm, נושאת כוח $P=${P}$ N בקצה החופשי. מה השקיעה בקצה?`,
        answer: d, unit: 'mm',
        steps: [`I=\\frac{bh^3}{12}=${fmt(Iv, 4)}\\ \\text{mm}^4`, `\\delta=\\frac{PL^3}{3EI}=\\frac{${P}\\cdot ${L}^3}{3\\cdot 200000\\cdot ${fmt(Iv, 4)}}=${fmt(d)}\\ \\text{mm}`],
        diagram: { fn: 'beam', args: ['cant-point', { load: `P=${P} N`, L: `${L} mm` }] }, source: `${SRC_H}, פרק 12; ${SRC_S}, טבלה A-9`,
      };
    },
  },
  'g-defl-ss': {
    subtopic: 'deflection', difficulty: 2,
    make() {
      const ud = Math.random() < 0.5;
      const L = pick([1000, 1500, 2000]); const d = pick([40, 50, 60]); const E = 200e3;
      const Iv = f.I.circle(d);
      if (ud) {
        const w = pick([1, 2, 3]); // N/mm = kN/m
        const y = f.beam['ss-udl'].defl(w, L, E, Iv);
        return {
          q: `ציר פלדה עגול ($E=200$ GPa) בקוטר $${d}$ mm, נתמך פשוט על מפתח $${L}$ mm, נושא עומס מפוזר $w=${w}$ kN/m. מה השקיעה המקסימלית?`,
          answer: y, unit: 'mm',
          steps: [`I=\\frac{\\pi d^4}{64}=${fmt(Iv, 4)}\\ \\text{mm}^4`, `w=${w}\\ \\text{kN/m}=${w}\\ \\text{N/mm}`, `\\delta=\\frac{5wL^4}{384EI}=${fmt(y)}\\ \\text{mm}`],
          diagram: { fn: 'beam', args: ['ss-udl', { load: `w=${w} kN/m`, L: `${L} mm` }] }, source: `${SRC_H}, פרק 12`,
        };
      }
      const P = pick([1000, 2000, 3000]);
      const y = f.beam['ss-center'].defl(P, L, E, Iv);
      return {
        q: `ציר פלדה עגול ($E=200$ GPa) בקוטר $${d}$ mm, נתמך פשוט על מפתח $${L}$ mm, נושא כוח $P=${P}$ N באמצע. מה השקיעה באמצע?`,
        answer: y, unit: 'mm',
        steps: [`I=\\frac{\\pi d^4}{64}=${fmt(Iv, 4)}\\ \\text{mm}^4`, `\\delta=\\frac{PL^3}{48EI}=${fmt(y)}\\ \\text{mm}`],
        diagram: { fn: 'beam', args: ['ss-center', { load: `P=${P} N`, L: `${L} mm` }] }, source: `${SRC_H}, פרק 12`,
      };
    },
  },
  // ---------- Mohr ----------
  'g-mohr': {
    subtopic: 'mohr', difficulty: 2,
    make() {
      const sx = pick([40, 60, 80, 100, 120]); const sy = pick([-40, -20, 0, 20, 40]); const txy = pick([20, 30, 40, 50]);
      const m = f.mohr(sx, sy, txy); const ask = pick(['s1', 's2', 'tau']);
      const label = { s1: 'המאמץ הראשי המקסימלי $\\sigma_1$', s2: 'המאמץ הראשי המינימלי $\\sigma_2$', tau: 'מאמץ הגזירה המקסימלי במישור' }[ask];
      const ans = { s1: m.s1, s2: m.s2, tau: m.R }[ask];
      return {
        q: `נתון מצב מאמץ מישורי: $\\sigma_x=${sx}$, $\\sigma_y=${sy}$, $\\tau_{xy}=${txy}$ MPa. מה ${label}?`,
        answer: ans, unit: 'MPa',
        steps: [`C=\\frac{\\sigma_x+\\sigma_y}{2}=${fmt(m.C)}`, `R=\\sqrt{\\left(\\frac{\\sigma_x-\\sigma_y}{2}\\right)^2+\\tau_{xy}^2}=${fmt(m.R)}`, `\\sigma_{1,2}=C\\pm R=${fmt(m.s1)},\\ ${fmt(m.s2)}\\ \\text{MPa}`, `\\tau_{max}=R=${fmt(m.R)}\\ \\text{MPa}`],
        diagram: { fn: 'mohrCircle', args: [sx, sy, txy] }, source: `${SRC_H}, פרק 9`,
      };
    },
  },
  // ---------- failure theories ----------
  'g-vonmises': {
    subtopic: 'failure', difficulty: 3,
    make() {
      const s = pick([80, 100, 120, 150]); const tau = pick([30, 40, 50, 60]); const Sy = pick([250, 350, 420]);
      const vm = f.vonMisesXY(s, 0, tau); const n = Sy / vm;
      return {
        q: `בנקודה על ציר יש מאמץ כפיפה $\\sigma=${s}$ MPa ומאמץ גזירה מפיתול $\\tau=${tau}$ MPa. החומר: פלדה רקיעה עם $S_y=${Sy}$ MPa. מה מקדם הביטחון לפי von Mises?`,
        answer: n, unit: '',
        steps: [`\\sigma'=\\sqrt{\\sigma^2+3\\tau^2}=\\sqrt{${s}^2+3\\cdot ${tau}^2}=${fmt(vm)}\\ \\text{MPa}`, `n=\\frac{S_y}{\\sigma'}=\\frac{${Sy}}{${fmt(vm)}}=${fmt(n)}`],
        hint: 'כש-σy = 0, הנוסחה הכללית מצטמצמת ל-√(σ² + 3τ²).',
        diagram: { fn: 'stressElement', args: [s, 0, tau] }, source: `${SRC_S}, פרק 5`,
      };
    },
  },
  'g-tresca': {
    subtopic: 'failure', difficulty: 3,
    make() {
      const s1 = pick([120, 150, 180]); const s2 = pick([-80, -50, 40, 60]); const Sy = pick([300, 350, 400]);
      const eq = f.trescaEquivalent(s1, s2); const n = Sy / eq;
      return {
        q: `המאמצים הראשיים במישור הם $\\sigma_1=${s1}$ MPa ו-$\\sigma_2=${s2}$ MPa (המאמץ השלישי אפס). $S_y=${Sy}$ MPa. מה מקדם הביטחון לפי Tresca?`,
        answer: n, unit: '',
        steps: [`\\text{principal: } ${s1},\\ ${s2},\\ 0`, `\\sigma_{max}-\\sigma_{min}=${fmt(eq)}\\ \\text{MPa}`, `n=\\frac{S_y}{\\sigma_{max}-\\sigma_{min}}=${fmt(n)}`],
        hint: 'לא לשכוח את המאמץ השלישי, אפס. כששני המאמצים חיוביים הוא קובע.',
        source: `${SRC_S}, פרק 5`,
      };
    },
  },
  // ---------- buckling ----------
  'g-euler': {
    subtopic: 'buckling', difficulty: 2,
    make() {
      const ends = pick(Object.keys(f.K_EFFECTIVE)); const K = f.K_EFFECTIVE[ends];
      const d = pick([30, 40, 50]); const L = pick([1.5, 2, 2.5, 3]);
      const P = f.eulerLoad(200e9, f.I.circle(d / 1000), K, L) / 1e3;
      const he = { 'pinned-pinned': 'פרקים בשני הקצוות', 'fixed-pinned': 'קצה אחד מקובע והשני פרק', 'fixed-fixed': 'שני הקצוות מקובעים', 'fixed-free': 'קצה אחד מקובע והשני חופשי' }[ends];
      return {
        q: `עמוד פלדה עגול מלא ($E=200$ GPa) בקוטר $${d}$ mm ובאורך $${L}$ m, ${he}. מה עומס הקריסה לפי אוילר?`,
        answer: P, unit: 'kN',
        steps: [`K=${K}`, `I=\\frac{\\pi d^4}{64}=${fmt(f.I.circle(d), 4)}\\ \\text{mm}^4`, `P_{cr}=\\frac{\\pi^2EI}{(KL)^2}=\\frac{\\pi^2\\cdot 200000\\cdot ${fmt(f.I.circle(d), 4)}}{(${K}\\cdot ${L * 1000})^2}=${fmt(P * 1000)}\\ \\text{N}`],
        hint: 'בדוק שהעמוד ארוך מספיק לאוילר: KL/r גדול מ-λc. אחרת משתמשים ב-Johnson.',
        diagram: { fn: 'columns', args: [] }, source: `${SRC_H}, פרק 13`,
      };
    },
  },
  'g-slenderness': {
    subtopic: 'buckling', difficulty: 3,
    make() {
      const d = pick([20, 30, 40]); const L = pick([0.5, 1, 1.5, 2]); const K = 1;
      const r = d / 4; const lam = (K * L * 1000) / r; const lc = f.criticalSlenderness(200e3, 250);
      return {
        q: `עמוד פלדה עגול ($E=200$ GPa, $S_y=250$ MPa), קוטר $${d}$ mm, אורך $${L}$ m, פרקים בשני הקצוות. מה התמירות $KL/r$? (אחרי החישוב השווה ל-$\\lambda_c$ כדי לקבוע אם אוילר תקף.)`,
        answer: lam, unit: '',
        steps: [`r=\\sqrt{I/A}=d/4=${fmt(r)}\\ \\text{mm}`, `\\lambda=\\frac{KL}{r}=${fmt(lam)}`, `\\lambda_c=\\pi\\sqrt{\\frac{2E}{S_y}}=${fmt(lc)}`, lam > lc ? `\\lambda>\\lambda_c \\Rightarrow \\text{Euler}` : `\\lambda<\\lambda_c \\Rightarrow \\text{Johnson}`],
        source: `${SRC_S}, פרק 4`,
      };
    },
  },
  // ---------- stress concentration ----------
  'g-kt': {
    subtopic: 'kt', difficulty: 2,
    make() {
      const W = pick([60, 80, 100]); const dh = pick([10, 15, 20]); const t = pick([5, 8, 10]); const F = pick([10, 20, 30]); const Kt = pick([2.4, 2.5, 2.6]);
      const sNom = (F * 1e3) / ((W - dh) * t); const sMax = f.peakStress(Kt, sNom);
      return {
        q: `פלטה ברוחב $${W}$ mm ובעובי $${t}$ mm, עם חור מרכזי בקוטר $${dh}$ mm, נמתחת בכוח $${F}$ kN. נתון מקדם ריכוז מאמצים $K_t=${Kt}$ (מוגדר על החתך נטו). מה המאמץ המקסימלי בשפת החור?`,
        answer: sMax, unit: 'MPa',
        steps: [`A_{net}=(W-d)t=(${W}-${dh})\\cdot ${t}=${(W - dh) * t}\\ \\text{mm}^2`, `\\sigma_{nom}=F/A_{net}=${fmt(sNom)}\\ \\text{MPa}`, `\\sigma_{max}=K_t\\sigma_{nom}=${fmt(sMax)}\\ \\text{MPa}`],
        diagram: { fn: 'plateHole', args: [] }, source: `${SRC_S}, פרק 3 ו-Figure A-15`,
      };
    },
  },
  // ---------- fatigue ----------
  'g-goodman': {
    subtopic: 'fatigue', difficulty: 3,
    make() {
      const Sut = pick([500, 600, 700]); const Se = pick([200, 250]); const sMax = pick([200, 240, 280]); const sMin = pick([40, 60, 80]);
      const sa = f.altStress(sMax, sMin), sm = f.meanStress(sMax, sMin); const n = f.goodmanFactor(sa, sm, Se, Sut);
      return {
        q: `חלק עובר מחזורי מאמץ בין $\\sigma_{min}=${sMin}$ ל-$\\sigma_{max}=${sMax}$ MPa. גבול העייפות המתוקן $S_e=${Se}$ MPa ו-$S_{ut}=${Sut}$ MPa. מה מקדם הביטחון לעייפות לפי Goodman?`,
        answer: n, unit: '',
        steps: [`\\sigma_a=\\frac{\\sigma_{max}-\\sigma_{min}}{2}=${fmt(sa)},\\quad \\sigma_m=\\frac{\\sigma_{max}+\\sigma_{min}}{2}=${fmt(sm)}`, `\\frac{1}{n}=\\frac{\\sigma_a}{S_e}+\\frac{\\sigma_m}{S_{ut}}=${fmt(sa / Se, 4)}+${fmt(sm / Sut, 4)}`, `n=${fmt(n)}`],
        diagram: { fn: 'goodman', args: [Se, Sut, null, sm, sa] }, source: `${SRC_S}, פרק 6`,
      };
    },
  },
  'g-endurance': {
    subtopic: 'fatigue', difficulty: 1,
    make() {
      const Sut = pick([400, 600, 800, 1000, 1600]);
      const Se = f.enduranceEstimateSteel(Sut);
      return {
        q: `הערך את גבול העייפות של דגם מבחן מפלדה (Rotating beam, $S_e'$) עם $S_{ut}=${Sut}$ MPa, לפי הכלל של Shigley.`,
        answer: Se, unit: 'MPa',
        steps: [Sut <= 1400 ? `S_{ut}\\le 1400 \\Rightarrow S_e'=0.5\\,S_{ut}=${Se}\\ \\text{MPa}` : `S_{ut}>1400 \\Rightarrow S_e'=700\\ \\text{MPa}`],
        hint: "זה ערך לדגם מעבדה מלוטש. לחלק אמיתי מכפילים במקדמי Marin (גימור, גודל, עומס ועוד).",
        diagram: { fn: 'snCurve', args: [] }, source: `${SRC_S}, פרק 6`,
      };
    },
  },
  // ---------- safety factor ----------
  'g-sf': {
    subtopic: 'safety', difficulty: 1,
    make() {
      const d = pick([12, 16, 20]); const F = pick([10, 20, 30]); const Sy = pick([250, 350, 500]);
      const s = (F * 1e3) / f.area.circle(d); const n = Sy / s;
      return {
        q: `בורג בקוטר אפקטיבי $${d}$ mm נמתח בכוח $${F}$ kN. $S_y=${Sy}$ MPa. מה מקדם הביטחון לכניעה?`,
        answer: n, unit: '',
        steps: [`\\sigma=\\frac{F}{A}=${fmt(s)}\\ \\text{MPa}`, `n=\\frac{S_y}{\\sigma}=${fmt(n)}`],
        source: `${SRC_S}, פרק 1`,
      };
    },
  },
};

export function makeQuestion(genId) {
  const g = generators[genId];
  const out = g.make();
  return { id: genId, type: 'numeric', subtopic: g.subtopic, difficulty: g.difficulty, tol: 0.02, ...out };
}
