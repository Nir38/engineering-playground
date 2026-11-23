// generators.js: numeric problems with fresh numbers each time.
// The answer is always computed by js/formulas.js, never typed by hand.
// Each generator returns { q, answer, unit, tol, steps[], diagram, source }.
import * as f from './formulas.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
// number formatting for text: up to 3 significant digits, no trailing zeros
export const fmt = (x, sig = 3) => {
  if (!isFinite(x)) return String(x);
  if (x === 0) return '0';
  if (sig > 6) return String(Number(x.toPrecision(Math.min(sig, 12))));
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

// =====================================================================
// PULLEYS & ROPE TENSION (strength domain)
// =====================================================================
const SRC_HS = 'Hibbeler, Engineering Mechanics: Statics';
const SRC_HD = 'Hibbeler, Engineering Mechanics: Dynamics';
Object.assign(generators, {
  'gp-tackle': {
    subtopic: 'pulleys', difficulty: 1,
    make() {
      const n = pick([2, 3, 4, 5, 6]); const m = pick([100, 150, 200, 300, 500]); const eta = pick([1, 1, 0.9, 0.85]);
      const W = m * 9.81; const F = f.tackleForce(W, n, eta);
      return {
        q: `מערכת גלגלות (block and tackle) מרימה מסה של $${m}$ kg. ${n} מקטעי חבל מחזיקים את הגלגלת הנעה${eta < 1 ? `, והנצילות הכוללת $${eta * 100}\\%$` : ', בהזנחת חיכוך ומשקל החבל'}. באיזה כוח צריך למשוך?`,
        answer: F, unit: 'N',
        steps: [`W=mg=${m}\\cdot9.81=${fmt(W, 4)}\\ \\text{N}`, `F=\\frac{W}{n${eta < 1 ? '\\,\\eta' : ''}}=\\frac{${fmt(W, 4)}}{${n}${eta < 1 ? `\\cdot${eta}` : ''}}=${fmt(F, 4)}\\ \\text{N}`],
        hint: 'סופרים כמה מקטעי חבל נושאים את הגלגלת הנעה. המתיחות בכולם שווה.',
        diagram: { fn: 'tackle', args: [n, { W: `${m} kg` }] }, source: `${SRC_HS}, פרק 6`,
      };
    },
  },
  'gp-atwood': {
    subtopic: 'pulleys', difficulty: 2,
    make() {
      const m1 = pick([3, 4, 5, 6, 8]); const m2 = pick([1, 1.5, 2, 2.5]); const ask = pick(['a', 'T']);
      const a = f.atwoodAccel(m1, m2); const T = f.atwoodTension(m1, m2);
      return {
        q: `מכונת Atwood: מסות של $${m1}$ kg ו-$${m2}$ kg תלויות משני צדי גלגלת אידיאלית. מה ${ask === 'a' ? 'התאוצה של המערכת' : 'המתיחות בחוט'}?`,
        answer: ask === 'a' ? a : T, unit: ask === 'a' ? 'm/s²' : 'N',
        steps: [`m_1:\\ m_1g-T=m_1a,\\quad m_2:\\ T-m_2g=m_2a`, `a=\\frac{(m_1-m_2)g}{m_1+m_2}=${fmt(a, 4)}\\ \\text{m/s}^2`, `T=\\frac{2m_1m_2g}{m_1+m_2}=${fmt(T, 4)}\\ \\text{N}`],
        hint: 'המתיחות בחוט נמצאת בין שני המשקלים. היא לא שווה לאף אחד מהם, כי יש תאוצה.',
        diagram: { fn: 'atwood', args: [] }, source: `${SRC_HD}, פרק 13`,
      };
    },
  },
  'gp-cables': {
    subtopic: 'pulleys', difficulty: 2,
    make() {
      const m = pick([20, 50, 100, 200]); const th = pick([10, 15, 20, 30, 45, 60]);
      const W = m * 9.81; const T = f.twoCableTension(W, th);
      return {
        q: `מסה של $${m}$ kg תלויה באמצע בין שני כבלים סימטריים. כל כבל יוצר זווית של $${th}^\\circ$ עם האופק. מה המתיחות בכל כבל?`,
        answer: T, unit: 'N',
        steps: [`\\sum F_y=0:\\ 2T\\sin\\theta=W`, `T=\\frac{W}{2\\sin${th}^\\circ}=\\frac{${fmt(W, 4)}}{2\\cdot${fmt(Math.sin(f.rad(th)), 4)}}=${fmt(T, 4)}\\ \\text{N}`],
        hint: 'ככל שהכבלים שטוחים יותר (θ קטנה), המתיחות גדלה מאוד. זה למה אי אפשר למתוח חבל כביסה ישר לגמרי.',
        diagram: { fn: 'twoCables', args: [th] }, source: `${SRC_HS}, פרק 3`,
      };
    },
  },
  'gp-capstan': {
    subtopic: 'pulleys', difficulty: 3,
    make() {
      const turns = pick([0.5, 1, 1.5, 2, 3]); const mu = pick([0.2, 0.25, 0.3]); const Tl = pick([5, 10, 20]);
      const th = turns * 2 * Math.PI; const Th = Tl / Math.exp(mu * th);
      return {
        q: `חבל נכרך $${turns}$ סיבובים סביב עמוד עגינה (μ=${mu}). בצד הספינה המתיחות $${Tl}$ kN. באיזה כוח צריך המלח להחזיק את הקצה השני?`,
        answer: Th * 1000, unit: 'N',
        steps: [`\\theta=${turns}\\cdot2\\pi=${fmt(th, 4)}\\ \\text{rad}`, `T_{tight}=T_{slack}\\,e^{\\mu\\theta}\\Rightarrow T_{slack}=\\frac{${Tl * 1000}}{e^{${mu}\\cdot${fmt(th, 4)}}}=${fmt(Th * 1000, 4)}\\ \\text{N}`],
        hint: 'הזווית ברדיאנים. כל סיבוב שלם מכפיל את היחס ב-e^(2πμ).',
        diagram: { fn: 'capstanDrum', args: [] }, source: `${SRC_HS}, פרק 8`,
      };
    },
  },
  'gp-rope-stress': {
    subtopic: 'pulleys', difficulty: 2,
    make() {
      const n = pick([1, 2, 4]); const m = pick([500, 1000, 2000]); const d = pick([6, 8, 10, 12]);
      const T = (m * 9.81) / n; const s = T / f.area.circle(d);
      return {
        q: `עגורן מרים $${m}$ kg עם ${n === 1 ? 'כבל יחיד' : `${n} מקטעי כבל שנושאים את הוו`}. כבל הפלדה בקוטר אפקטיבי $${d}$ mm (חתך מלא מקורב). מה המאמץ בכבל?`,
        answer: s, unit: 'MPa',
        steps: [`T=\\frac{mg}{n}=${fmt(T, 4)}\\ \\text{N}`, `A=\\frac{\\pi d^2}{4}=${fmt(f.area.circle(d), 4)}\\ \\text{mm}^2`, `\\sigma=\\frac{T}{A}=${fmt(s)}\\ \\text{MPa}`],
        hint: 'כבל אמיתי עשוי חוטים, ושטח המתכת שלו קטן מעיגול מלא. בתכן משתמשים בכוח השבר שהיצרן נותן ובמקדם ביטחון.',
        diagram: { fn: 'tackle', args: [Math.max(n, 1), { W: `${m} kg` }] }, source: `${SRC_HS}, פרק 3; Hibbeler, Mechanics of Materials, פרק 1`,
      };
    },
  },
  'gp-incline': {
    subtopic: 'pulleys', difficulty: 3,
    make() {
      const m1 = pick([5, 10, 20]); const al = pick([20, 30, 45]); const m2 = pick([5, 8, 10, 15]);
      const a = f.inclineAccel(m1, al, m2);
      if (a <= 0) return this.make();
      return {
        q: `גוף של $${m1}$ kg על מישור משופע חלק בזווית $${al}^\\circ$ קשור בחוט דרך גלגלת בראש המדרון למסה תלויה של $${m2}$ kg. מה התאוצה?`,
        answer: a, unit: 'm/s²',
        steps: [`m_2g-T=m_2a,\\quad T-m_1g\\sin\\alpha=m_1a`, `a=\\frac{(m_2-m_1\\sin\\alpha)g}{m_1+m_2}=${fmt(a, 4)}\\ \\text{m/s}^2`],
        source: `${SRC_HD}, פרק 13`,
      };
    },
  },
});

// =====================================================================
// FLUIDS. Water ρ = 1000 kg/m³ and g = 9.81 m/s² unless the question says otherwise.
// =====================================================================
const SRC_C = 'Çengel & Cimbala, Fluid Mechanics';
const LIQ = [
  { n: 'מים', rho: 1000 }, { n: 'מי ים', rho: 1025 }, { n: 'שמן', rho: 850 },
];
Object.assign(generators, {
  'gf-hydro': {
    subtopic: 'f-statics', difficulty: 1,
    make() {
      const l = pick(LIQ); const h = pick([2, 5, 8, 10, 15, 20, 30]);
      const p = f.hydrostaticPressure(l.rho, h) / 1000;
      return {
        q: `מה הלחץ המנומטרי (gauge) בעומק $${h}$ m ב${l.n} ($\\rho=${l.rho}$ kg/m³)?`,
        answer: p, unit: 'kPa',
        steps: [`P_{gage}=\\rho g h=${l.rho}\\cdot9.81\\cdot${h}=${fmt(p * 1000, 4)}\\ \\text{Pa}`, `=${fmt(p)}\\ \\text{kPa}`],
        hint: 'כלל אצבע: כל 10 מטר מים מוסיפים בערך אטמוספרה אחת (~98 kPa).',
        diagram: { fn: 'tank', args: [{ h: `${h} m` }] }, source: `${SRC_C}, פרק 3`,
      };
    },
  },
  'gf-press': {
    subtopic: 'f-statics', difficulty: 1,
    make() {
      const F1 = pick([100, 200, 300, 500]); const d1 = pick([20, 25, 30]); const d2 = pick([150, 200, 250, 300]);
      const F2 = f.hydraulicPressForce(F1, f.area.circle(d1), f.area.circle(d2));
      return {
        q: `במגבה הידראולי לבוכנה הקטנה קוטר $${d1}$ mm ולגדולה $${d2}$ mm. מפעילים $${F1}$ N על הקטנה. איזה כוח מתקבל בגדולה?`,
        answer: F2 / 1000, unit: 'kN',
        steps: [`P=\\frac{F_1}{A_1}=\\frac{F_2}{A_2}`, `F_2=F_1\\left(\\frac{d_2}{d_1}\\right)^2=${F1}\\cdot\\left(\\frac{${d2}}{${d1}}\\right)^2=${fmt(F2, 4)}\\ \\text{N}`],
        hint: 'יחס השטחים הוא יחס הקטרים בריבוע.',
        diagram: { fn: 'hydraulicPress', args: [] }, source: `${SRC_C}, פרק 3`,
      };
    },
  },
  'gf-wall': {
    subtopic: 'f-statics', difficulty: 2,
    make() {
      const h = pick([2, 3, 4]); const w = pick([1, 2, 3, 5]);
      const F = f.planeWallForce(1000, h / 2, h * w) / 1000;
      return {
        q: `שער אנכי מלבני ברוחב $${w}$ m מחזיק מים בגובה $${h}$ m (פני המים בראש השער). מה הכוח ההידרוסטטי הכולל על השער?`,
        answer: F, unit: 'kN',
        steps: [`h_c=h/2=${h / 2}\\ \\text{m},\\quad A=${h * w}\\ \\text{m}^2`, `F=\\rho g h_c A=1000\\cdot9.81\\cdot${h / 2}\\cdot${h * w}=${fmt(F * 1000, 4)}\\ \\text{N}`, `\\text{acts at } \\tfrac{2}{3}h=${fmt((2 * h) / 3)}\\ \\text{m below surface}`],
        hint: 'הכוח שווה ללחץ במרכז הכובד של השטח כפול השטח. נקודת הפעולה נמוכה יותר.',
        diagram: { fn: 'tank', args: [{ h: `${h} m` }] }, source: `${SRC_C}, פרק 3`,
      };
    },
  },
  'gf-float': {
    subtopic: 'f-buoy', difficulty: 1,
    make() {
      const b = pick([{ n: 'עץ אורן', rho: 500 }, { n: 'עץ אלון', rho: 750 }, { n: 'קרח', rho: 917 }, { n: 'פוליאתילן', rho: 950 }]);
      const H = pick([10, 20, 30, 40]);
      const d = H * f.submergedFraction(b.rho, 1000);
      return {
        q: `גוש ${b.n} ($\\rho=${b.rho}$ kg/m³) בגובה $${H}$ cm צף במים מתוקים, כשהפאה הגדולה מקבילה למים. מה העומק השקוע?`,
        answer: d, unit: 'cm',
        steps: [`W=F_B:\\ \\rho_b g A H=\\rho_w g A d`, `d=H\\frac{\\rho_b}{\\rho_w}=${H}\\cdot\\frac{${b.rho}}{1000}=${fmt(d)}\\ \\text{cm}`],
        diagram: { fn: 'floating', args: [{ frac: b.rho / 1000 }] }, source: `${SRC_C}, פרק 3`,
      };
    },
  },
  'gf-apparent': {
    subtopic: 'f-buoy', difficulty: 2,
    make() {
      const m = pick([{ n: 'פלדה', rho: 7850 }, { n: 'אלומיניום', rho: 2700 }, { n: 'נחושת', rho: 8960 }]);
      const V = pick([1, 2, 5, 10]); // liters
      const W = m.rho * (V / 1000) * 9.81; const FB = f.buoyancy(1000, V / 1000); const Wa = W - FB;
      return {
        q: `גוש ${m.n} ($\\rho=${m.rho}$ kg/m³) בנפח $${V}$ L תלוי על חוט ושקוע כולו במים. מה הכוח בחוט?`,
        answer: Wa, unit: 'N',
        steps: [`W=\\rho_s g V=${fmt(W, 4)}\\ \\text{N}`, `F_B=\\rho_w g V=${fmt(FB, 4)}\\ \\text{N}`, `T=W-F_B=${fmt(Wa, 4)}\\ \\text{N}`],
        source: `${SRC_C}, פרק 3`,
      };
    },
  },
  'gf-continuity': {
    subtopic: 'f-continuity', difficulty: 1,
    make() {
      const d1 = pick([50, 80, 100]); const d2 = pick([20, 25, 40]); const V1 = pick([1, 1.5, 2, 3]);
      const V2 = V1 * (d1 / d2) ** 2;
      return {
        q: `מים זורמים בצינור בקוטר $${d1}$ mm במהירות $${V1}$ m/s, והצינור מצטמצם לקוטר $${d2}$ mm. מה המהירות בחלק הצר?`,
        answer: V2, unit: 'm/s',
        steps: [`A_1V_1=A_2V_2`, `V_2=V_1\\left(\\frac{d_1}{d_2}\\right)^2=${V1}\\cdot\\left(\\frac{${d1}}{${d2}}\\right)^2=${fmt(V2)}\\ \\text{m/s}`],
        diagram: { fn: 'pipeContraction', args: [{}] }, source: `${SRC_C}, פרק 5`,
      };
    },
  },
  'gf-flow': {
    subtopic: 'f-continuity', difficulty: 1,
    make() {
      const Q = pick([2, 5, 10, 20]); const d = pick([25, 40, 50, 80]);
      const V = (Q / 1000) / f.area.circle(d / 1000);
      return {
        q: `ספיקה של $${Q}$ L/s עוברת בצינור בקוטר פנימי $${d}$ mm. מה מהירות הזרימה הממוצעת?`,
        answer: V, unit: 'm/s',
        steps: [`A=\\frac{\\pi d^2}{4}=${fmt(f.area.circle(d / 1000), 4)}\\ \\text{m}^2`, `V=\\frac{Q}{A}=\\frac{${Q / 1000}}{${fmt(f.area.circle(d / 1000), 4)}}=${fmt(V)}\\ \\text{m/s}`],
        hint: '1 L = 0.001 m³.',
        source: `${SRC_C}, פרק 5`,
      };
    },
  },
  'gf-bernoulli': {
    subtopic: 'f-bernoulli', difficulty: 2,
    make() {
      const p1 = pick([150, 200, 250, 300]); const d1 = pick([80, 100]); const d2 = pick([40, 50]); const V1 = pick([1, 1.5, 2]);
      const V2 = V1 * (d1 / d2) ** 2; const p2 = f.bernoulliP2(p1 * 1000, V1, 0, V2, 0, 1000) / 1000;
      return {
        q: `צינור מים אופקי מצטמצם מ-$${d1}$ mm ל-$${d2}$ mm. לפני ההיצרות $P_1=${p1}$ kPa ו-$V_1=${V1}$ m/s. בהזנחת הפסדים, מה הלחץ בחלק הצר?`,
        answer: p2, unit: 'kPa',
        steps: [`V_2=V_1(d_1/d_2)^2=${fmt(V2)}\\ \\text{m/s}`, `P_2=P_1+\\tfrac12\\rho(V_1^2-V_2^2)`, `=${p1 * 1000}+500(${fmt(V1 * V1)}-${fmt(V2 * V2)})=${fmt(p2 * 1000, 4)}\\ \\text{Pa}`, `=${fmt(p2)}\\ \\text{kPa}`],
        hint: 'קודם רציפות למציאת V₂, ואחר כך ברנולי.',
        diagram: { fn: 'pipeContraction', args: [{}] }, source: `${SRC_C}, פרק 5`,
      };
    },
  },
  'gf-torricelli': {
    subtopic: 'f-bernoulli', difficulty: 1,
    make() {
      const h = pick([1, 2, 3, 5, 8]);
      const V = f.torricelli(h);
      return {
        q: `במיכל פתוח גדול, פני המים נמצאים $${h}$ m מעל חור קטן בדופן. בהזנחת הפסדים, מה מהירות הסילון?`,
        answer: V, unit: 'm/s',
        steps: [`P_1=P_2=P_{atm},\\quad V_1\\approx0`, `V=\\sqrt{2gh}=\\sqrt{2\\cdot9.81\\cdot${h}}=${fmt(V)}\\ \\text{m/s}`],
        diagram: { fn: 'torricelliTank', args: [] }, source: `${SRC_C}, פרק 5`,
      };
    },
  },
  'gf-pitot': {
    subtopic: 'f-bernoulli', difficulty: 2,
    make() {
      const dp = pick([200, 300, 500, 800, 1200]);
      const V = f.pitotVelocity(dp, 1.204);
      return {
        q: `צינור פיטו באוויר ($\\rho=1.204$ kg/m³) מודד הפרש בין לחץ עצירה ללחץ סטטי של $${dp}$ Pa. מה מהירות האוויר בקמ"ש?`,
        answer: V * 3.6, unit: 'km/h',
        steps: [`V=\\sqrt{\\frac{2(P_0-P)}{\\rho}}=\\sqrt{\\frac{2\\cdot${dp}}{1.204}}=${fmt(V)}\\ \\text{m/s}`, `\\times3.6=${fmt(V * 3.6)}\\ \\text{km/h}`],
        diagram: { fn: 'pitot', args: [] }, source: `${SRC_C}, פרק 5`,
      };
    },
  },
  'gf-venturi': {
    subtopic: 'f-bernoulli', difficulty: 3,
    make() {
      const d1 = pick([100, 150]); const d2 = pick([50, 60, 75]); const dp = pick([10, 20, 30, 50]);
      const Q = f.venturiQ(d1 / 1000, d2 / 1000, dp * 1000, 1000) * 1000;
      const beta = d2 / d1;
      return {
        q: `מד ונטורי במים: קוטר כניסה $${d1}$ mm, קוטר צוואר $${d2}$ mm, הפרש לחצים $${dp}$ kPa. בהנחה של זרימה אידאלית ($C_d=1$), מה הספיקה?`,
        answer: Q, unit: 'L/s',
        steps: [`\\beta=d_2/d_1=${fmt(beta)}`, `Q=A_2\\sqrt{\\frac{2\\Delta P}{\\rho(1-\\beta^4)}}`, `=${fmt(f.area.circle(d2 / 1000), 4)}\\sqrt{\\frac{2\\cdot${dp * 1000}}{1000(1-${fmt(beta ** 4, 4)})}}=${fmt(Q / 1000, 4)}\\ \\text{m}^3/\\text{s}`, `=${fmt(Q)}\\ \\text{L/s}`],
        diagram: { fn: 'pipeContraction', args: [{ venturi: true }] }, source: `${SRC_C}, פרק 8`,
      };
    },
  },
  'gf-reynolds': {
    subtopic: 'f-reynolds', difficulty: 1,
    make() {
      const fl = pick([
        { n: 'מים ב-20°C', rho: 998, mu: 1.002e-3 },
        { n: 'שמן מנוע', rho: 888, mu: 0.8 },
        { n: 'אוויר ב-20°C', rho: 1.204, mu: 1.825e-5 },
      ]);
      const V = pick([0.5, 1, 2, 5]); const d = pick([10, 25, 50, 100]);
      const Re = f.reynolds(fl.rho, V, d / 1000, fl.mu);
      const reg = { laminar: 'למינרית', transitional: 'מעבר', turbulent: 'טורבולנטית' }[f.flowRegime(Re)];
      return {
        q: `${fl.n} ($\\rho=${fl.rho}$ kg/m³, $\\mu=${fl.mu}$ Pa·s) זורם במהירות $${V}$ m/s בצינור בקוטר $${d}$ mm. מה מספר ריינולדס?`,
        answer: Re, unit: '',
        steps: [`Re=\\frac{\\rho VD}{\\mu}=\\frac{${fl.rho}\\cdot${V}\\cdot${d / 1000}}{${fl.mu}}=${fmt(Re, 4)}`, `\\Rightarrow\\ \\text{${reg === 'למינרית' ? 'laminar' : reg === 'מעבר' ? 'transitional' : 'turbulent'}}`],
        hint: 'בצינור עגול: מתחת ל-2300 למינרית, מעל 4000 טורבולנטית.',
        diagram: { fn: 'velocityProfiles', args: [] }, source: `${SRC_C}, פרק 8`,
      };
    },
  },
  'gf-laminar': {
    subtopic: 'f-pipe', difficulty: 3,
    make() {
      const mu = pick([0.1, 0.2, 0.3]); const rho = 900; const d = pick([10, 15, 20]); const V = pick([0.3, 0.5, 1]); const L = pick([5, 10, 20]);
      const Re = f.reynolds(rho, V, d / 1000, mu); const fr = f.frictionLaminar(Re);
      const dp = f.darcyPressureDrop(fr, L, d / 1000, V, rho) / 1000;
      return {
        q: `שמן ($\\rho=900$ kg/m³, $\\mu=${mu}$ Pa·s) זורם ב-$${V}$ m/s בצינור בקוטר $${d}$ mm ובאורך $${L}$ m. מה מפל הלחץ?`,
        answer: dp, unit: 'kPa',
        steps: [`Re=\\frac{\\rho VD}{\\mu}=${fmt(Re)}\\ \\Rightarrow\\ \\text{laminar}`, `f=\\frac{64}{Re}=${fmt(fr, 4)}`, `\\Delta P=f\\frac{L}{D}\\frac{\\rho V^2}{2}=${fmt(dp * 1000, 4)}\\ \\text{Pa}=${fmt(dp)}\\ \\text{kPa}`],
        hint: 'קודם לבדוק ש-Re קטן מ-2300.',
        source: `${SRC_C}, פרק 8`,
      };
    },
  },
  'gf-darcy': {
    subtopic: 'f-pipe', difficulty: 2,
    make() {
      const fr = pick([0.018, 0.02, 0.022, 0.025]); const L = pick([50, 100, 200]); const d = pick([50, 80, 100]); const V = pick([1, 1.5, 2, 2.5]);
      const hf = f.darcyHeadLoss(fr, L, d / 1000, V);
      return {
        q: `בצינור מים באורך $${L}$ m ובקוטר $${d}$ mm המהירות $${V}$ m/s. מדיאגרמת Moody התקבל $f=${fr}$. מה הפסד העומד (head loss)?`,
        answer: hf, unit: 'm',
        steps: [`h_f=f\\frac{L}{D}\\frac{V^2}{2g}=${fr}\\cdot\\frac{${L}}{${d / 1000}}\\cdot\\frac{${V}^2}{2\\cdot9.81}=${fmt(hf)}\\ \\text{m}`, `\\Delta P=\\rho g h_f=${fmt((1000 * 9.81 * hf) / 1000)}\\ \\text{kPa}`],
        diagram: { fn: 'moody', args: [{}] }, source: `${SRC_C}, פרק 8`,
      };
    },
  },
  'gf-haaland': {
    subtopic: 'f-pipe', difficulty: 3,
    make() {
      const d = pick([25, 50, 100]); const V = pick([1, 2, 3]); const eps = 0.045;
      const Re = f.reynolds(998, V, d / 1000, 1.002e-3); const fr = f.frictionHaaland(Re, eps / d);
      return {
        q: `מים ב-20°C ($\\rho=998$, $\\mu=1.002\\times10^{-3}$) זורמים ב-$${V}$ m/s בצינור פלדה מסחרית ($\\varepsilon=0.045$ mm) בקוטר $${d}$ mm. חשב את מקדם החיכוך לפי Haaland.`,
        answer: fr, unit: '', tol: 0.02,
        steps: [`Re=${fmt(Re, 4)},\\quad \\varepsilon/D=${fmt(eps / d, 3)}`, `\\frac{1}{\\sqrt f}=-1.8\\log\\left[\\left(\\frac{\\varepsilon/D}{3.7}\\right)^{1.11}+\\frac{6.9}{Re}\\right]`, `f=${fmt(fr, 4)}`],
        hint: 'Haaland היא נוסחה מפורשת שקרובה לקולברוק בטווח של כ-2%.',
        diagram: { fn: 'moody', args: [{ point: [Re, fr] }] }, source: `${SRC_C}, פרק 8`,
      };
    },
  },
  'gf-minor': {
    subtopic: 'f-pipe', difficulty: 2,
    make() {
      const n90 = pick([2, 3, 4]); const V = pick([1.5, 2, 2.5, 3]);
      const K = n90 * 0.3 + 0.2 + 0.5; // 0.3 per flanged 90° elbow (regular), gate valve open 0.2, sharp entrance 0.5
      const hm = f.minorHeadLoss(K, V);
      return {
        q: `במערכת יש כניסה חדה ($K=0.5$), $${n90}$ ברכיים מאוגנות של 90° ($K=0.3$ כל אחת) ומגוף פתוח לגמרי ($K=0.2$). המהירות $${V}$ m/s. מה סך ההפסדים המקומיים בעומד?`,
        answer: hm, unit: 'm',
        steps: [`\\sum K=0.5+${n90}\\cdot0.3+0.2=${fmt(K)}`, `h_m=\\sum K\\frac{V^2}{2g}=${fmt(K)}\\cdot\\frac{${V}^2}{19.62}=${fmt(hm)}\\ \\text{m}`],
        source: `${SRC_C}, פרק 8`,
      };
    },
  },
  'gf-pump-power': {
    subtopic: 'f-pumps', difficulty: 1,
    make() {
      const Q = pick([5, 10, 20, 50]); const H = pick([10, 20, 30, 50]); const eta = pick([0.6, 0.7, 0.75, 0.8]);
      const P = f.pumpShaftPower(1000, Q / 1000, H, eta) / 1000;
      return {
        q: `משאבת מים מספקת $${Q}$ L/s לעומד של $${H}$ m בנצילות $${eta * 100}\\%$. מה הספק הציר הנדרש?`,
        answer: P, unit: 'kW',
        steps: [`P_{hyd}=\\rho gQH=1000\\cdot9.81\\cdot${Q / 1000}\\cdot${H}=${fmt(P * eta * 1000, 4)}\\ \\text{W}`, `P_{shaft}=\\frac{P_{hyd}}{\\eta}=${fmt(P * 1000, 4)}\\ \\text{W}=${fmt(P)}\\ \\text{kW}`],
        diagram: { fn: 'pumpCurve', args: [{}] }, source: `${SRC_C}, פרק 14`,
      };
    },
  },
  'gf-affinity': {
    subtopic: 'f-pumps', difficulty: 2,
    make() {
      const N1 = pick([1450, 2900]); const N2 = N1 === 1450 ? pick([1750, 2000, 2900]) : pick([1450, 2000, 2400]);
      const H1 = pick([20, 30, 40]); const P1 = pick([3, 5, 7.5]);
      const ask = pick(['H', 'P']); const r = f.affinity(10, H1, P1, N1, N2);
      return {
        q: `משאבה צנטריפוגלית מסתובבת ב-$${N1}$ rpm ונותנת עומד $${H1}$ m בהספק $${P1}$ kW. משנים את המהירות ל-$${N2}$ rpm (אותו קוטר מאיץ). מה ${ask === 'H' ? 'העומד החדש' : 'ההספק החדש'}?`,
        answer: ask === 'H' ? r.H : r.P, unit: ask === 'H' ? 'm' : 'kW',
        steps: [`Q\\propto N,\\quad H\\propto N^2,\\quad P\\propto N^3`, ask === 'H' ? `H_2=${H1}\\left(\\frac{${N2}}{${N1}}\\right)^2=${fmt(r.H)}\\ \\text{m}` : `P_2=${P1}\\left(\\frac{${N2}}{${N1}}\\right)^3=${fmt(r.P)}\\ \\text{kW}`],
        source: `${SRC_C}, פרק 14`,
      };
    },
  },
  'gf-npsh': {
    subtopic: 'f-pumps', difficulty: 3,
    make() {
      const zs = pick([-4, -3, -2, 1, 2]); const hl = pick([0.5, 1, 1.5]);
      const N = f.npshAvailable(101325, 2339, 998, zs, hl);
      return {
        q: `משאבה יונקת מים ב-20°C ממיכל פתוח ($P_{atm}=101.3$ kPa, $P_v=2.34$ kPa, $\\rho=998$). פני המים נמצאים ${zs < 0 ? `$${-zs}$ m **מתחת**` : `$${zs}$ m **מעל**`} לפתח היניקה, והפסדי היניקה $${hl}$ m. מה ה-NPSH הזמין?`,
        answer: N, unit: 'm',
        steps: [`NPSH_A=\\frac{P_{atm}-P_v}{\\rho g}+z_s-h_L`, `=\\frac{101325-2339}{998\\cdot9.81}+(${zs})-${hl}=${fmt(N)}\\ \\text{m}`],
        hint: 'z חיובי כשהמיכל מעל המשאבה. צריך NPSH זמין גדול מה-NPSH הנדרש של המשאבה, עם מרווח.',
        source: `${SRC_C}, פרק 14`,
      };
    },
  },
  'gf-drag': {
    subtopic: 'f-drag', difficulty: 2,
    make() {
      const v = pick([50, 80, 100, 120, 130]); const Cd = pick([0.25, 0.3, 0.35]); const A = pick([2.0, 2.2, 2.5]);
      const ask = pick(['F', 'P']); const V = f.kmh(v);
      const F = f.dragForce(1.204, V, Cd, A); const P = F * V / 1000;
      return {
        q: `מכונית עם $C_D=${Cd}$ ושטח חזית $${A}$ m² נוסעת ב-$${v}$ km/h באוויר ($\\rho=1.204$ kg/m³) בלי רוח. מה ${ask === 'F' ? 'כוח הגרר' : 'ההספק הדרוש להתגבר על הגרר'}?`,
        answer: ask === 'F' ? F : P, unit: ask === 'F' ? 'N' : 'kW',
        steps: [`V=${v}/3.6=${fmt(V)}\\ \\text{m/s}`, `F_D=\\tfrac12\\rho V^2C_DA=${fmt(F, 4)}\\ \\text{N}`, `P=F_DV=${fmt(P * 1000, 4)}\\ \\text{W}=${fmt(P)}\\ \\text{kW}`],
        hint: 'הכוח עולה עם V², וההספק עם V³.',
        diagram: { fn: 'dragCar', args: [] }, source: `${SRC_C}, פרק 11`,
      };
    },
  },
  'gf-jet': {
    subtopic: 'f-momentum', difficulty: 2,
    make() {
      const d = pick([10, 20, 30, 50]); const V = pick([10, 15, 20, 30]);
      const F = f.jetForceFlatPlate(1000, f.area.circle(d / 1000), V);
      return {
        q: `סילון מים בקוטר $${d}$ mm ובמהירות $${V}$ m/s פוגע בניצב בפלטה שטוחה נייחת, ומתפזר לצדדים. מה הכוח על הפלטה?`,
        answer: F, unit: 'N',
        steps: [`\\dot m=\\rho AV=${fmt(1000 * f.area.circle(d / 1000) * V, 4)}\\ \\text{kg/s}`, `F=\\dot m V=\\rho AV^2=${fmt(F, 4)}\\ \\text{N}`],
        hint: 'כל התנע בכיוון הסילון "נעלם" בפגיעה, כי המים יוצאים בניצב.',
        diagram: { fn: 'jetPlate', args: [] }, source: `${SRC_C}, פרק 6`,
      };
    },
  },
});

// =====================================================================
// MATERIALS
// =====================================================================
const SRC_CA = 'Callister, Materials Science and Engineering';
const SRC_A = 'Ashby, Materials Selection in Mechanical Design';
const MATS = [
  { n: 'פלדה', E: 200, rho: 7.85, Sy: 250 },
  { n: 'אלומיניום 6061-T6', E: 69, rho: 2.70, Sy: 275 },
  { n: 'אלומיניום 7075-T6', E: 72, rho: 2.81, Sy: 503 },
  { n: 'טיטניום Ti-6Al-4V', E: 114, rho: 4.43, Sy: 880 },
];
Object.assign(generators, {
  'gm-lever': {
    subtopic: 'm-structure', difficulty: 2,
    make() {
      const C0 = pick([0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6]);
      const ask = pick(['p', 'a']);
      const Wp = f.pearliteFraction(C0);
      return {
        q: `פלדה פחמנית עם $${C0}$ wt% C מקוררת לאט מתחום האוסטניט עד ממש מתחת ל-727°C. מה החלק (באחוזים) של ${ask === 'p' ? 'הפרליט' : 'הפריט הפרואוטקטואידי'} במבנה?`,
        answer: (ask === 'p' ? Wp : 1 - Wp) * 100, unit: '%',
        steps: [`W_p=\\frac{C_0-0.022}{0.76-0.022}=\\frac{${C0}-0.022}{0.738}=${fmt(Wp)}`, ask === 'p' ? `W_p=${fmt(Wp * 100)}\\%` : `W_{\\alpha'}=1-W_p=${fmt((1 - Wp) * 100)}\\%`],
        hint: 'כלל המנוף בין 0.022% (פריט) ל-0.76% (פרליט, הנקודה האוטקטואידית).',
        diagram: { fn: 'ironCarbon', args: [{ c0: C0 }] }, source: `${SRC_CA}, פרק 9`,
      };
    },
  },
  'gm-brinell': {
    subtopic: 'm-hardness', difficulty: 2,
    make() {
      const d = pick([3.2, 3.5, 3.8, 4.0, 4.2, 4.5, 5.0]);
      const HB = f.brinell(3000, 10, d);
      return {
        q: `בבדיקת Brinell עם כדור $D=10$ mm ועומס $3000$ kgf נמדד קוטר שקע $d=${d}$ mm. מה הקשיות HB?`,
        answer: HB, unit: 'HB',
        steps: [`HB=\\frac{2P}{\\pi D\\left(D-\\sqrt{D^2-d^2}\\right)}`, `=\\frac{6000}{\\pi\\cdot10\\left(10-\\sqrt{100-${fmt(d * d, 4)}}\\right)}=${fmt(HB)}`],
        hint: 'P ב-kgf ו-D, d במילימטרים. שקע קטן יותר = חומר קשה יותר.',
        diagram: { fn: 'hardness', args: [] }, source: `${SRC_CA}, פרק 6`,
      };
    },
  },
  'gm-vickers': {
    subtopic: 'm-hardness', difficulty: 1,
    make() {
      const F = pick([10, 20, 30, 50]); const d = pick([0.25, 0.3, 0.4, 0.5, 0.6]);
      const HV = f.vickers(F, d);
      return {
        q: `בבדיקת Vickers בעומס $${F}$ kgf האלכסון הממוצע של השקע הוא $${d}$ mm. מה הקשיות HV?`,
        answer: HV, unit: 'HV',
        steps: [`HV=\\frac{2F\\sin(68^\\circ)}{d^2}=\\frac{1.854\\,F}{d^2}=\\frac{1.854\\cdot${F}}{${d}^2}=${fmt(HV)}`],
        diagram: { fn: 'hardness', args: [] }, source: `${SRC_CA}, פרק 6`,
      };
    },
  },
  'gm-uts-hb': {
    subtopic: 'm-hardness', difficulty: 1,
    make() {
      const HB = pick([150, 200, 250, 300, 350]);
      const TS = f.utsFromHB(HB);
      return {
        q: `פלדה נמדדה בקשיות $${HB}$ HB. הערך את חוזק המתיחה שלה.`,
        answer: TS, unit: 'MPa',
        steps: [`TS\\approx3.45\\cdot HB=3.45\\cdot${HB}=${fmt(TS)}\\ \\text{MPa}`],
        hint: 'קשר אמפירי לרוב הפלדות. הוא לא מתאים לכל חומר.',
        source: `${SRC_CA}, פרק 6`,
      };
    },
  },
  'gm-specific': {
    subtopic: 'm-selection', difficulty: 1,
    make() {
      const m = pick(MATS); const ask = pick(['E', 'S']);
      const v = ask === 'E' ? m.E / m.rho : m.Sy / m.rho;
      return {
        q: `חשב את ${ask === 'E' ? 'הקשיחות הסגולית $E/\\rho$' : 'החוזק הסגולי $S_y/\\rho$'} של ${m.n} ($E=${m.E}$ GPa, $S_y=${m.Sy}$ MPa, $\\rho=${m.rho}$ g/cm³). ${ask === 'E' ? 'יחידות: GPa/(g/cm³).' : 'יחידות: MPa/(g/cm³).'}`,
        answer: v, unit: '',
        steps: [ask === 'E' ? `E/\\rho=${m.E}/${m.rho}=${fmt(v)}` : `S_y/\\rho=${m.Sy}/${m.rho}=${fmt(v)}`],
        hint: 'E/ρ כמעט זהה בפלדה, באלומיניום ובטיטניום (בערך 25). חוזק סגולי שונה מאוד ביניהם.',
        diagram: { fn: 'bars', args: [{ data: MATS.map((x) => [x.n.split(' ')[0] + (x.n.includes('7075') ? ' 7075' : x.n.includes('6061') ? ' 6061' : ''), +(ask === 'E' ? x.E / x.rho : x.Sy / x.rho).toFixed(1)]), label: ask === 'E' ? 'E/ρ' : 'Sy/ρ' }] },
        source: `${SRC_A}, פרק 5`,
      };
    },
  },
  'gm-ashby': {
    subtopic: 'm-selection', difficulty: 3,
    make() {
      const a = pick(MATS.slice(1)); const b = MATS[0];
      const kind = pick(['tie', 'beam']);
      const r = f.massRatio(f.ashbyIndex[kind](a.E, a.rho), f.ashbyIndex[kind](b.E, b.rho));
      return {
        q: kind === 'tie'
          ? `מוט מתיחה באורך נתון צריך קשיחות צירית $k=AE/L$ מסוימת. מה יחס המסות ${a.n} חלקי פלדה? (פלדה: $E=200$, $\\rho=7.85$; ${a.n}: $E=${a.E}$ GPa, $\\rho=${a.rho}$)`
          : `קורה בחתך ריבועי (הצלע חופשית לבחירה) צריכה קשיחות כפיפה נתונה. מה יחס המסות ${a.n} חלקי פלדה? (פלדה: $E=200$, $\\rho=7.85$; ${a.n}: $E=${a.E}$ GPa, $\\rho=${a.rho}$)`,
        answer: r, unit: '',
        steps: kind === 'tie'
          ? [`m\\propto\\frac{\\rho}{E}`, `\\frac{m_a}{m_{st}}=\\frac{${a.rho}/${a.E}}{7.85/200}=${fmt(r)}`]
          : [`EI\\propto E\\,b^4=\\text{const}\\Rightarrow b^2\\propto E^{-1/2}`, `m\\propto\\rho b^2\\propto\\frac{\\rho}{E^{1/2}}`, `\\frac{m_a}{m_{st}}=\\frac{${a.rho}/\\sqrt{${a.E}}}{7.85/\\sqrt{200}}=${fmt(r)}`],
        hint: kind === 'tie' ? 'במתיחה המסה תלויה ב-ρ/E, וכמעט אין יתרון לאף מתכת.' : 'בכפיפה E נכנס בשורש, ולכן לחומר קל יש יתרון גדול.',
        source: `${SRC_A}, פרק 5`,
      };
    },
  },
  'gm-mismatch': {
    subtopic: 'm-welding', difficulty: 2,
    make() {
      const L = pick([500, 1000, 1500, 2000]); const dT = pick([30, 40, 50, 60, 80]);
      const pair = pick([['אלומיניום', 23e-6, 'פלדה', 12e-6], ['נירוסטה 304', 17e-6, 'פלדה', 12e-6], ['אלומיניום', 23e-6, 'נירוסטה 304', 17e-6]]);
      const d = f.thermalMismatch(pair[1], pair[3], dT, L);
      return {
        q: `פס מ${pair[0]} ($\\alpha=${pair[1] * 1e6}\\times10^{-6}$/K) ופס מ${pair[2]} ($\\alpha=${pair[3] * 1e6}\\times10^{-6}$/K), שניהם באורך $${L}$ mm, מחוממים ב-$${dT}$ K. מה הפרש ההתארכות ביניהם?`,
        answer: d, unit: 'mm',
        steps: [`\\Delta=\\left|\\alpha_1-\\alpha_2\\right|\\Delta T\\,L=${fmt(Math.abs(pair[1] - pair[3]) * 1e6)}\\times10^{-6}\\cdot${dT}\\cdot${L}=${fmt(d)}\\ \\text{mm}`],
        hint: 'הפרש כזה בין חלקים מוברגים יוצר מאמצים או מחייב חורים מוארכים.',
        source: 'מדריך הנדסי למתכות (חומר גלם), עמ\' 3',
      };
    },
  },
  'gm-ce': {
    subtopic: 'm-welding', difficulty: 2,
    make() {
      const c = pick([
        { C: 0.17, Mn: 1.0 }, { C: 0.2, Mn: 1.4 }, { C: 0.45, Mn: 0.75 }, { C: 0.4, Mn: 0.85, Cr: 0.95, Mo: 0.2 },
        { C: 0.35, Mn: 0.7, Cr: 0.8, Mo: 0.25, Ni: 1.8 },
      ]);
      const CE = f.carbonEquivalent(c);
      const txt = Object.entries(c).map(([k, v]) => `${k}=${v}`).join(', ');
      return {
        q: `לפלדה יש הרכב (wt%): $${txt}$. חשב את שווה-ערך הפחמן CE לפי IIW.`,
        answer: CE, unit: '',
        steps: [`CE=C+\\frac{Mn}{6}+\\frac{Cr+Mo+V}{5}+\\frac{Ni+Cu}{15}`, `=${fmt(CE, 4)}`, CE > 0.4 ? `CE>0.4:\\ \\text{preheat usually needed}` : `CE\\le0.4:\\ \\text{good weldability}`],
        hint: 'ככל ש-CE גבוה יותר, הסיכון למרטנזיט קשה וסדקים ב-HAZ גדל.',
        source: 'ASM Handbook Vol. 6, Welding (נוסחת IIW)',
      };
    },
  },
  'gm-pren': {
    subtopic: 'm-stainless', difficulty: 1,
    make() {
      const g = pick([{ n: '304', Cr: 18, Mo: 0 }, { n: '316', Cr: 17, Mo: 2.5 }, { n: '2205 (duplex)', Cr: 22, Mo: 3, N: 0.17 }, { n: '904L', Cr: 20, Mo: 4.5 }]);
      const P = f.pren(g);
      return {
        q: `חשב את PREN של נירוסטה ${g.n} עם הרכב (wt%) $Cr=${g.Cr},\\ Mo=${g.Mo}${g.N ? `,\\ N=${g.N}` : ',\\ N\\approx0'}$.`,
        answer: P, unit: '',
        steps: [`PREN=Cr+3.3\\,Mo+16\\,N=${g.Cr}+3.3\\cdot${g.Mo}+16\\cdot${g.N || 0}=${fmt(P)}`],
        hint: 'PREN גבוה = עמידות טובה יותר לבורות (pitting) בכלורידים.',
        source: 'ASM Handbook Vol. 13A, Corrosion',
      };
    },
  },
  'gm-anodize': {
    subtopic: 'm-coatings', difficulty: 2,
    make() {
      const d = pick([10, 12, 16, 20, 25]); const t = pick([25, 40, 50, 60]); const hole = Math.random() < 0.5;
      const res = hole ? f.anodizedHoleDiameter(d, t / 1000) : f.anodizedShaftDiameter(d, t / 1000);
      return {
        q: `${hole ? 'קדח' : 'פין'} מאלומיניום בקוטר $${d}.000$ mm עובר אנודייז קשה (Type III) בעובי שכבה $${t}$ µm. לפי כלל 50/50, מה הקוטר אחרי הציפוי?`,
        answer: res, unit: 'mm', tol: 0.0002,
        steps: [`\\text{growth outward}=t/2=${t / 2}\\ \\mu m\\ \\text{per side}`, hole ? `d_{new}=${d}-2\\cdot${t / 2 / 1000}=${fmt(res, 6)}\\ \\text{mm}` : `d_{new}=${d}+2\\cdot${t / 2 / 1000}=${fmt(res, 6)}\\ \\text{mm}`],
        hint: 'חצי מהשכבה צומח החוצה וחצי חודר פנימה. על קוטר זה פעמיים חצי עובי, כלומר עובי אחד.',
        source: 'מדריך הנדסי למתכות (חומר גלם), עמ\' 2-3',
      };
    },
  },
});

// =====================================================================
// THERMODYNAMICS & HEAT TRANSFER
// =====================================================================
const SRC_CB = 'Çengel & Boles, Thermodynamics: An Engineering Approach';
const SRC_I = 'Incropera, Fundamentals of Heat and Mass Transfer';
Object.assign(generators, {
  'gt-heat': {
    subtopic: 't-laws', difficulty: 1,
    make() {
      const m = pick([0.5, 1, 1.5, 2]); const T1 = pick([10, 15, 20]); const P = pick([1500, 2000, 2200]);
      const Q = f.sensibleHeat(m, f.CP_WATER, 100 - T1); const tt = Q / P;
      const ask = pick(['Q', 't']);
      return {
        q: `קומקום חשמלי של $${P}$ W מחמם $${m}$ kg מים מ-$${T1}$°C עד רתיחה (100°C). $c=4.18$ kJ/kg·K. ${ask === 'Q' ? 'כמה חום צריך?' : 'כמה זמן זה ייקח, בהזנחת הפסדים?'}`,
        answer: ask === 'Q' ? Q / 1000 : tt, unit: ask === 'Q' ? 'kJ' : 's',
        steps: [`Q=mc\\Delta T=${m}\\cdot4180\\cdot${100 - T1}=${fmt(Q / 1000, 4)}\\ \\text{kJ}`, `t=\\frac{Q}{P}=\\frac{${fmt(Q, 5)}}{${P}}=${fmt(tt, 4)}\\ \\text{s}`],
        hint: 'הפרש טמפרטורה ב-°C שווה להפרש ב-K.',
        diagram: { fn: 'heatModes', args: [] }, source: `${SRC_CB}, פרק 4`,
      };
    },
  },
  'gt-firstlaw': {
    subtopic: 't-laws', difficulty: 1,
    make() {
      const Q = pick([50, 80, 120, 200]); const W = pick([20, 30, 60, 90, 150]);
      const dU = f.firstLawDU(Q, W);
      return {
        q: `גז בצילינדר מקבל $${Q}$ kJ חום ומבצע $${W}$ kJ עבודה על הבוכנה. מה השינוי באנרגיה הפנימית שלו?`,
        answer: dU, unit: 'kJ', tol: 0.001,
        steps: [`\\Delta U=Q-W=${Q}-${W}=${dU}\\ \\text{kJ}`],
        hint: 'סימן: Q חיובי כשחום נכנס, W חיובי כשהמערכת עושה עבודה. התשובה יכולה להיות שלילית.',
        source: `${SRC_CB}, פרק 4`,
      };
    },
  },
  'gt-tire': {
    subtopic: 't-gas', difficulty: 2,
    make() {
      const pg = pick([200, 220, 240, 250]); const T1 = pick([15, 20, 25]); const T2 = pick([45, 50, 60]);
      const P1 = pg + 101.3; const P2 = f.isochoricP2(P1, f.K(T1), f.K(T2)); const pg2 = P2 - 101.3;
      return {
        q: `לחץ צמיג (מנומטרי) $${pg}$ kPa ב-$${T1}$°C. אחרי נסיעה הטמפרטורה בצמיג $${T2}$°C. בהנחת נפח קבוע, מה הלחץ המנומטרי החדש? ($P_{atm}=101.3$ kPa)`,
        answer: pg2, unit: 'kPa',
        steps: [`P_1=${pg}+101.3=${fmt(P1, 4)}\\ \\text{kPa (abs)}`, `P_2=P_1\\frac{T_2}{T_1}=${fmt(P1, 4)}\\cdot\\frac{${fmt(f.K(T2), 5)}}{${fmt(f.K(T1), 5)}}=${fmt(P2, 4)}\\ \\text{kPa}`, `P_{2,g}=${fmt(pg2, 4)}\\ \\text{kPa}`],
        hint: 'בחוק הגזים חייבים לחץ מוחלט וטמפרטורה בקלווין. זו הטעות הכי נפוצה כאן.',
        source: `${SRC_CB}, פרק 3`,
      };
    },
  },
  'gt-adiabatic': {
    subtopic: 't-gas', difficulty: 2,
    make() {
      const r = pick([6, 8, 10, 16, 20]); const T1 = pick([20, 25, 30]);
      const T2 = f.isentropicT2fromV(f.K(T1), r) - 273.15;
      return {
        q: `אוויר ב-$${T1}$°C נדחס בתהליך איזנטרופי ביחס דחיסה $r=${r}$ ($k=1.4$). מה הטמפרטורה בסוף הדחיסה ב-°C?`,
        answer: T2, unit: '°C',
        steps: [`T_1=${fmt(f.K(T1), 5)}\\ \\text{K}`, `T_2=T_1\\,r^{k-1}=${fmt(f.K(T1), 5)}\\cdot${r}^{0.4}=${fmt(T2 + 273.15, 4)}\\ \\text{K}`, `=${fmt(T2, 4)}^\\circ\\text{C}`],
        hint: 'כך מנוע דיזל מצית את הדלק בלי מצת: הדחיסה לבדה מחממת את האוויר.',
        diagram: { fn: 'pvCycle', args: ['diesel', { r: Math.min(r, 12) }] }, source: `${SRC_CB}, פרק 7`,
      };
    },
  },
  'gt-isothermal': {
    subtopic: 't-gas', difficulty: 3,
    make() {
      const P1 = pick([100, 200, 500]); const V1 = pick([0.05, 0.1, 0.2]); const ratio = pick([2, 3, 4, 5]);
      const Wk = f.isothermalWork(P1, V1, V1 * ratio);
      return {
        q: `גז אידיאלי ב-$${P1}$ kPa ובנפח $${V1}$ m³ מתפשט באופן איזותרמי עד פי $${ratio}$ מהנפח. כמה עבודה הוא מבצע?`,
        answer: Wk, unit: 'kJ',
        steps: [`W=P_1V_1\\ln\\frac{V_2}{V_1}=${P1}\\cdot${V1}\\cdot\\ln${ratio}=${fmt(Wk, 4)}\\ \\text{kJ}`],
        hint: 'kPa כפול m³ נותן kJ.',
        source: `${SRC_CB}, פרק 4`,
      };
    },
  },
  'gt-carnot': {
    subtopic: 't-second', difficulty: 1,
    make() {
      const TH = pick([300, 400, 500, 600, 800]); const TC = pick([20, 25, 30, 40]);
      const e = f.carnotEff(f.K(TH), f.K(TC));
      return {
        q: `מנוע חום עובד בין מקור ב-$${TH}$°C לסביבה ב-$${TC}$°C. מה הנצילות המקסימלית האפשרית (קרנו)? תשובה באחוזים.`,
        answer: e * 100, unit: '%',
        steps: [`\\eta=1-\\frac{T_C}{T_H}=1-\\frac{${fmt(f.K(TC), 5)}}{${fmt(f.K(TH), 5)}}=${fmt(e, 4)}`],
        hint: 'קלווין בלבד! עם צלזיוס מקבלים תשובה שגויה לחלוטין.',
        diagram: { fn: 'heatEngine', args: ['engine'] }, source: `${SRC_CB}, פרק 6`,
      };
    },
  },
  'gt-cop': {
    subtopic: 't-refrig', difficulty: 2,
    make() {
      const kind = pick(['carnot', 'real']);
      if (kind === 'carnot') {
        const TC = pick([-18, -5, 4, 5]); const TH = pick([30, 35, 40]);
        const c = f.copRefrigCarnot(f.K(TC), f.K(TH));
        return {
          q: `מקרר שומר על $${TC}$°C בתוכו ופולט חום לחדר ב-$${TH}$°C. מה ה-COP המקסימלי האפשרי (קרנו)?`,
          answer: c, unit: '',
          steps: [`COP_{R,max}=\\frac{T_C}{T_H-T_C}=\\frac{${fmt(f.K(TC), 5)}}{${TH - TC}}=${fmt(c, 4)}`],
          hint: 'ככל שהפרש הטמפרטורות קטן, הקירור "זול" יותר.',
          diagram: { fn: 'heatEngine', args: ['fridge'] }, source: `${SRC_CB}, פרק 6`,
        };
      }
      const QL = pick([1, 2, 3.5, 5]); const W = pick([0.3, 0.5, 0.8, 1]);
      return {
        q: `מזגן מוציא מהחדר $${QL}$ kW חום וצורך $${W}$ kW חשמל. מה ה-COP שלו, וכמה חום נפלט בחוץ?`,
        answer: QL / W, unit: '',
        steps: [`COP=\\frac{Q_L}{W}=\\frac{${QL}}{${W}}=${fmt(QL / W, 4)}`, `Q_H=Q_L+W=${fmt(QL + W, 4)}\\ \\text{kW}`],
        hint: 'COP גדול מ-1 זה תקין: המזגן "מעביר" חום, הוא לא מייצר אותו.',
        diagram: { fn: 'fridgeLoop', args: [] }, source: `${SRC_CB}, פרק 11`,
      };
    },
  },
  'gt-otto': {
    subtopic: 't-engines', difficulty: 1,
    make() {
      const r = pick([7, 8, 9, 10, 11, 12]);
      const e = f.ottoEff(r);
      return {
        q: `מה הנצילות התיאורטית של מחזור Otto עם יחס דחיסה $r=${r}$ ($k=1.4$)? תשובה באחוזים.`,
        answer: e * 100, unit: '%',
        steps: [`\\eta=1-\\frac{1}{r^{k-1}}=1-\\frac{1}{${r}^{0.4}}=${fmt(e, 4)}`],
        hint: 'מנוע אמיתי מגיע לבערך חצי מהערך הזה בגלל חיכוך, מעבר חום ובעירה לא אידיאלית.',
        diagram: { fn: 'pvCycle', args: ['otto', { r: Math.min(r, 10) }] }, source: `${SRC_CB}, פרק 9`,
      };
    },
  },
  'gt-diesel': {
    subtopic: 't-engines', difficulty: 3,
    make() {
      const r = pick([14, 16, 18, 20, 22]); const rc = pick([1.5, 2, 2.5, 3]);
      const e = f.dieselEff(r, rc);
      return {
        q: `מה הנצילות התיאורטית של מחזור Diesel עם $r=${r}$ ויחס cut-off $r_c=${rc}$ ($k=1.4$)? תשובה באחוזים.`,
        answer: e * 100, unit: '%',
        steps: [`\\eta=1-\\frac{1}{r^{k-1}}\\cdot\\frac{r_c^k-1}{k(r_c-1)}`, `=1-\\frac{1}{${r}^{0.4}}\\cdot\\frac{${rc}^{1.4}-1}{1.4(${rc}-1)}=${fmt(e, 4)}`],
        diagram: { fn: 'pvCycle', args: ['diesel', { r: 12, rc }] }, source: `${SRC_CB}, פרק 9`,
      };
    },
  },
  'gt-power': {
    subtopic: 't-engines', difficulty: 1,
    make() {
      const T = pick([150, 200, 250, 300, 400]); const n = pick([2000, 3000, 4000, 5500]);
      const P = f.shaftPower(T, n) / 1000;
      return {
        q: `מנוע מפיק מומנט של $${T}$ N·m ב-$${n}$ rpm. מה ההספק?`,
        answer: P, unit: 'kW',
        steps: [`\\omega=\\frac{2\\pi\\cdot${n}}{60}=${fmt((2 * Math.PI * n) / 60, 4)}\\ \\text{rad/s}`, `P=T\\omega=${fmt(P * 1000, 4)}\\ \\text{W}=${fmt(P)}\\ \\text{kW}`],
        hint: 'מומנט הוא "כמה חזק מסובבים", הספק הוא "כמה מהר עושים עבודה".',
        source: `${SRC_CB}, פרק 2`,
      };
    },
  },
  'gt-brayton': {
    subtopic: 't-brayton', difficulty: 2,
    make() {
      const rp = pick([5, 8, 10, 15, 20, 30]);
      const e = f.braytonEff(rp);
      return {
        q: `טורבינת גז פועלת לפי מחזור Brayton אידיאלי עם יחס לחצים $r_p=${rp}$ ($k=1.4$). מה הנצילות? תשובה באחוזים.`,
        answer: e * 100, unit: '%',
        steps: [`\\eta=1-\\frac{1}{r_p^{(k-1)/k}}=1-\\frac{1}{${rp}^{0.286}}=${fmt(e, 4)}`],
        diagram: { fn: 'pvCycle', args: ['brayton', { rp: Math.min(rp, 10) }] }, source: `${SRC_CB}, פרק 9`,
      };
    },
  },
  'gt-wall': {
    subtopic: 't-conduction', difficulty: 1,
    make() {
      const m = pick([{ n: 'לבנים', k: 0.72 }, { n: 'בטון', k: 1.4 }, { n: 'זכוכית', k: 1.4 }, { n: 'פלדה', k: 60.5 }]);
      const L = m.n === 'זכוכית' ? pick([0.004, 0.006]) : m.n === 'פלדה' ? 0.01 : pick([0.1, 0.2, 0.25]);
      const A = pick([1, 2, 5, 10]); const dT = pick([10, 15, 20, 25]);
      const Q = f.fourier(m.k, A, dT, L);
      return {
        q: `קיר מ${m.n} ($k=${m.k}$ W/m·K) בעובי $${L * 1000}$ mm ובשטח $${A}$ m². הפרש הטמפרטורות בין הפנים לחוץ הוא $${dT}$ K. מה קצב מעבר החום (רק הולכה)?`,
        answer: Q, unit: 'W',
        steps: [`\\dot Q=\\frac{kA\\Delta T}{L}=\\frac{${m.k}\\cdot${A}\\cdot${dT}}{${L}}=${fmt(Q, 4)}\\ \\text{W}`],
        hint: 'בחלון אמיתי ההתנגדות של שכבות האוויר משני הצדדים (הסעה) גדולה בהרבה מזו של הזכוכית.',
        diagram: { fn: 'wallProfile', args: [{ layers: [{ n: m.n, R: 1, w: 120 }], Ti: 20, To: 20 - dT }] }, source: `${SRC_I}, פרקים 1-3`,
      };
    },
  },
  'gt-composite': {
    subtopic: 't-conduction', difficulty: 3,
    make() {
      const A = pick([5, 10, 20]); const L1 = pick([0.1, 0.2]); const L2 = pick([0.03, 0.05, 0.08]); const dT = pick([15, 20, 25]); const h = 10;
      const R1 = f.Rwall(L1, 0.72, A), R2 = f.Rwall(L2, 0.04, A), Rc = f.Rconv(h, A);
      const Rt = R1 + R2 + 2 * Rc; const Q = dT / Rt;
      return {
        q: `קיר בשטח $${A}$ m²: לבנה ($k=0.72$, $${L1 * 1000}$ mm) ובידוד ($k=0.04$, $${L2 * 1000}$ mm), עם הסעה $h=${h}$ W/m²·K משני הצדדים. הפרש הטמפרטורות בין האוויר בפנים לאוויר בחוץ $${dT}$ K. מה איבוד החום?`,
        answer: Q, unit: 'W',
        steps: [`R_{brick}=\\frac{L}{kA}=${fmt(R1, 4)}\\ \\text{K/W}`, `R_{ins}=${fmt(R2, 4)}\\ \\text{K/W}`, `R_{conv}=\\frac{1}{hA}=${fmt(Rc, 4)}\\ \\text{K/W (each side)}`, `R_{tot}=R_{brick}+R_{ins}+2R_{conv}=${fmt(Rt, 4)}\\ \\text{K/W}`, `\\dot Q=\\frac{\\Delta T}{R_{tot}}=${fmt(Q, 4)}\\ \\text{W}`],
        hint: 'כמו נגדים בטור: מחברים את כל ההתנגדויות, וכל הזרם (החום) עובר דרך כולן.',
        diagram: { fn: 'wallProfile', args: [{ layers: [{ n: 'לבנה', R: R1, w: 90 }, { n: 'בידוד', R: R2, w: 60 }] }] }, source: `${SRC_I}, פרק 3`,
      };
    },
  },
  'gt-conv': {
    subtopic: 't-convection', difficulty: 1,
    make() {
      const c = pick([{ n: 'הסעה טבעית באוויר', h: 10 }, { n: 'מאוורר (הסעה מאולצת באוויר)', h: 50 }, { n: 'מים זורמים', h: 1000 }]);
      const A = pick([0.1, 0.25, 0.5, 1]); const dT = pick([20, 40, 60]);
      const Q = f.newtonCooling(c.h, A, dT);
      return {
        q: `משטח בשטח $${A}$ m² חם ב-$${dT}$ K מהסביבה, עם ${c.n} ($h=${c.h}$ W/m²·K). מה קצב מעבר החום?`,
        answer: Q, unit: 'W',
        steps: [`\\dot Q=hA\\Delta T=${c.h}\\cdot${A}\\cdot${dT}=${fmt(Q, 4)}\\ \\text{W}`],
        hint: 'h הוא לא תכונת חומר. הוא תלוי בזורם, במהירות ובגיאומטריה.',
        source: `${SRC_I}, פרק 1`,
      };
    },
  },
  'gt-lumped': {
    subtopic: 't-convection', difficulty: 3,
    make() {
      const d = pick([5, 10, 20]); const h = pick([20, 50, 100]); const Ti = pick([200, 300, 500]); const tt = pick([30, 60, 120, 300]);
      const V = (Math.PI * (d / 1000) ** 3) / 6, A = Math.PI * (d / 1000) ** 2;
      const tau = f.timeConstant(7850, 450, V, h, A); const T = f.lumpedT(25, Ti, tt, tau);
      return {
        q: `כדור פלדה בקוטר $${d}$ mm ($\\rho=7850$, $c=450$ J/kg·K) ב-$${Ti}$°C מוכנס לאוויר ב-25°C עם $h=${h}$ W/m²·K. בשיטת lumped capacitance, מה הטמפרטורה אחרי $${tt}$ s?`,
        answer: T, unit: '°C',
        steps: [`\\frac{V}{A}=\\frac{d}{6}=${fmt(d / 6000, 4)}\\ \\text{m}`, `\\tau=\\frac{\\rho cV}{hA}=${fmt(tau, 4)}\\ \\text{s}`, `T=T_\\infty+(T_i-T_\\infty)e^{-t/\\tau}=${fmt(T, 4)}^\\circ\\text{C}`],
        hint: 'השיטה תקפה כש-Bi = h(V/A)/k קטן מ-0.1, כלומר הגוף כמעט אחיד בטמפרטורה.',
        diagram: { fn: 'coolingCurve', args: [{ Ti, Tinf: 25, tau }] }, source: `${SRC_I}, פרק 5`,
      };
    },
  },
  'gt-rad': {
    subtopic: 't-radiation', difficulty: 2,
    make() {
      const eps = pick([0.1, 0.5, 0.8, 0.95]); const A = pick([0.5, 1, 2]); const Ts = pick([60, 100, 200, 400]); const Tsur = pick([20, 25]);
      const Q = f.radiationNet(eps, A, f.K(Ts), f.K(Tsur));
      return {
        q: `משטח בשטח $${A}$ m² עם פליטות $\\varepsilon=${eps}$ נמצא ב-$${Ts}$°C, והסביבה הגדולה ב-$${Tsur}$°C. מה קצב איבוד החום נטו בקרינה?`,
        answer: Q, unit: 'W',
        steps: [`\\dot Q=\\varepsilon\\sigma A(T_s^4-T_{sur}^4)`, `=${eps}\\cdot5.67\\times10^{-8}\\cdot${A}\\cdot(${fmt(f.K(Ts), 5)}^4-${fmt(f.K(Tsur), 5)}^4)=${fmt(Q, 4)}\\ \\text{W}`],
        hint: 'בקלווין! ובחזקה רביעית, כך שבטמפרטורות גבוהות הקרינה משתלטת.',
        diagram: { fn: 'heatModes', args: [] }, source: `${SRC_I}, פרקים 1 ו-12`,
      };
    },
  },
  'gt-lmtd': {
    subtopic: 't-hx', difficulty: 2,
    make() {
      const Th1 = pick([90, 100, 120]); const Th2 = pick([50, 60, 70]); const Tc1 = pick([15, 20, 25]); const Tc2 = pick([40, 45]);
      const type = pick(['counter', 'parallel']);
      const d1 = type === 'counter' ? Th1 - Tc2 : Th1 - Tc1, d2 = type === 'counter' ? Th2 - Tc1 : Th2 - Tc2;
      if (d2 <= 0 || d1 <= 0) return this.make();
      const L = f.lmtd(d1, d2);
      return {
        q: `מחליף חום ב${type === 'counter' ? 'זרימה נגדית' : 'זרימה מקבילה'}: הזורם החם נכנס ב-$${Th1}$°C ויוצא ב-$${Th2}$°C, הקר נכנס ב-$${Tc1}$°C ויוצא ב-$${Tc2}$°C. מה $\\Delta T_{lm}$?`,
        answer: L, unit: 'K',
        steps: [type === 'counter' ? `\\Delta T_1=T_{h,in}-T_{c,out}=${d1},\\quad \\Delta T_2=T_{h,out}-T_{c,in}=${d2}` : `\\Delta T_1=T_{h,in}-T_{c,in}=${d1},\\quad \\Delta T_2=T_{h,out}-T_{c,out}=${d2}`, `\\Delta T_{lm}=\\frac{\\Delta T_1-\\Delta T_2}{\\ln(\\Delta T_1/\\Delta T_2)}=${fmt(L, 4)}\\ \\text{K}`],
        hint: 'בזרימה נגדית משווים את קצה הכניסה של אחד לקצה היציאה של השני.',
        diagram: { fn: 'hxProfiles', args: [type, { Th1, Th2, Tc1, Tc2 }] }, source: `${SRC_I}, פרק 11`,
      };
    },
  },
  'gt-hx-area': {
    subtopic: 't-hx', difficulty: 3,
    make() {
      const Q = pick([10, 20, 50]); const U = pick([300, 500, 800]); const dTlm = pick([20, 30, 40]);
      const A = (Q * 1000) / (U * dTlm);
      return {
        q: `צריך להעביר $${Q}$ kW במחליף חום עם $U=${U}$ W/m²·K ו-$\\Delta T_{lm}=${dTlm}$ K. מה שטח ההעברה הנדרש?`,
        answer: A, unit: 'm²',
        steps: [`A=\\frac{\\dot Q}{U\\,\\Delta T_{lm}}=\\frac{${Q * 1000}}{${U}\\cdot${dTlm}}=${fmt(A, 4)}\\ \\text{m}^2`],
        source: `${SRC_I}, פרק 11`,
      };
    },
  },
  'gt-junction': {
    subtopic: 't-electronics', difficulty: 2,
    make() {
      const P = pick([5, 10, 15, 25]); const Ta = pick([25, 40, 50]); const Rjc = pick([0.5, 1, 1.5]); const Rcs = pick([0.2, 0.5]); const Rsa = pick([2, 3, 4]);
      const Tj = f.junctionTemp(Ta, P, [Rjc, Rcs, Rsa]);
      return {
        q: `רכיב מפזר $${P}$ W. $R_{jc}=${Rjc}$, $R_{cs}=${Rcs}$ (משחה), $R_{sa}=${Rsa}$ K/W (גוף קירור), והסביבה ב-$${Ta}$°C. מה טמפרטורת הצומת?`,
        answer: Tj, unit: '°C',
        steps: [`R_{tot}=${Rjc}+${Rcs}+${Rsa}=${fmt(Rjc + Rcs + Rsa, 4)}\\ \\text{K/W}`, `T_j=T_a+P\\,R_{tot}=${Ta}+${P}\\cdot${fmt(Rjc + Rcs + Rsa, 4)}=${fmt(Tj, 4)}^\\circ\\text{C}`],
        hint: 'בדיוק כמו חוק אוהם: הספק במקום זרם, טמפרטורה במקום מתח.',
        diagram: { fn: 'resistanceChain', args: [{}] }, source: `${SRC_I}, פרק 3`,
      };
    },
  },
  'gt-heatsink': {
    subtopic: 't-electronics', difficulty: 3,
    make() {
      const P = pick([10, 20, 30]); const TjMax = pick([110, 125, 150]); const Ta = pick([40, 50, 55]); const Rjc = pick([0.5, 0.8]); const Rcs = pick([0.2, 0.3]);
      const R = f.requiredRsa(TjMax, Ta, P, Rjc, Rcs);
      if (R <= 0) return this.make();
      return {
        q: `טרנזיסטור מפזר $${P}$ W, עם $T_{j,max}=${TjMax}$°C, $R_{jc}=${Rjc}$ ו-$R_{cs}=${Rcs}$ K/W. הסביבה בתוך המארז $${Ta}$°C. מה ההתנגדות התרמית המקסימלית המותרת לגוף הקירור?`,
        answer: R, unit: 'K/W',
        steps: [`R_{tot,max}=\\frac{T_{j,max}-T_a}{P}=\\frac{${TjMax}-${Ta}}{${P}}=${fmt((TjMax - Ta) / P, 4)}`, `R_{sa}\\le R_{tot}-R_{jc}-R_{cs}=${fmt(R, 4)}\\ \\text{K/W}`],
        hint: 'בוחרים גוף קירור עם R קטן מזה, עם מרווח. מאוורר מקטין R_sa מאוד.',
        diagram: { fn: 'resistanceChain', args: [{}] }, source: `${SRC_I}, פרק 3`,
      };
    },
  },
});

// =====================================================================
// ELECTRICITY & DRIVES
// =====================================================================
const SRC_HU = 'Hughes, Electrical and Electronic Technology';
const SRC_CH = 'Chapman, Electric Machinery Fundamentals';
Object.assign(generators, {
  'ge-ohm': {
    subtopic: 'e-basics', difficulty: 1,
    make() {
      const P = pick([800, 1200, 2000, 2200, 3000]); const ask = pick(['I', 'R']);
      const I = P / 230, R = 230 ** 2 / P;
      return {
        q: `מכשיר של $${P}$ W מחובר לשקע 230 V (עומס התנגדותי). מה ${ask === 'I' ? 'הזרם שהוא צורך' : 'ההתנגדות שלו'}?`,
        answer: ask === 'I' ? I : R, unit: ask === 'I' ? 'A' : 'Ω',
        steps: [`I=\\frac{P}{V}=\\frac{${P}}{230}=${fmt(I, 4)}\\ \\text{A}`, `R=\\frac{V}{I}=\\frac{V^2}{P}=${fmt(R, 4)}\\ \\Omega`],
        hint: 'P = VI, ו-V = IR.',
        diagram: { fn: 'waterAnalogy', args: [] }, source: SRC_HU,
      };
    },
  },
  'ge-wire': {
    subtopic: 'e-basics', difficulty: 2,
    make() {
      const L = pick([10, 15, 20, 30]); const A = pick([1.5, 2.5, 4]); const I = pick([10, 16, 20]);
      const R = f.wireR(f.RHO_CU, 2 * L, A * 1e-6); const dV = I * R; const P = f.powerI2R(I, R);
      const ask = pick(['dV', 'P']);
      return {
        q: `שקע נמצא $${L}$ m מהלוח. הכבל מנחושת ($\\rho=1.68\\times10^{-8}$ Ω·m) בחתך $${A}$ mm², והזרם $${I}$ A. ${ask === 'dV' ? 'מה מפל המתח בכבל (הלוך וחזור)?' : 'כמה חום מתפתח בכבל?'}`,
        answer: ask === 'dV' ? dV : P, unit: ask === 'dV' ? 'V' : 'W',
        steps: [`R=\\frac{\\rho\\,(2L)}{A}=\\frac{1.68\\times10^{-8}\\cdot${2 * L}}{${A}\\times10^{-6}}=${fmt(R, 4)}\\ \\Omega`, `\\Delta V=IR=${fmt(dV, 4)}\\ \\text{V},\\quad P=I^2R=${fmt(P, 4)}\\ \\text{W}`],
        hint: 'הזרם עובר בפאזה ובאפס: האורך הכולל כפול.',
        source: SRC_HU,
      };
    },
  },
  'ge-kwh': {
    subtopic: 'e-basics', difficulty: 1,
    make() {
      const P = pick([800, 1200, 1500, 2000]); const h = pick([2, 4, 6, 8]); const price = pick([0.55, 0.6, 0.65]);
      const E = f.energyKWh(P, h);
      return {
        q: `מזגן צורך $${P}$ W ופועל $${h}$ שעות ביום. בהנחה שמחיר קוט"ש הוא $${price}$ ₪ (ערך לתרגיל), כמה עולה יום אחד?`,
        answer: E * price, unit: '₪',
        steps: [`E=P\\,t=${P / 1000}\\ \\text{kW}\\cdot${h}\\ \\text{h}=${fmt(E, 4)}\\ \\text{kWh}`, `\\text{cost}=${fmt(E, 4)}\\cdot${price}=${fmt(E * price, 4)}`],
        hint: 'קוט"ש = kWh = קילוואט כפול שעה. זו יחידת אנרגיה, לא הספק.',
        source: SRC_HU,
      };
    },
  },
  'ge-series-parallel': {
    subtopic: 'e-circuits', difficulty: 1,
    make() {
      const R1 = pick([10, 22, 47, 100]); const R2 = pick([10, 33, 68, 100, 220]); const kind = pick(['s', 'p']);
      const R = kind === 's' ? f.seriesR(R1, R2) : f.parallelR(R1, R2);
      return {
        q: `שני נגדים, $${R1}$ Ω ו-$${R2}$ Ω, מחוברים ${kind === 's' ? 'בטור' : 'במקביל'}. מה ההתנגדות השקולה?`,
        answer: R, unit: 'Ω',
        steps: [kind === 's' ? `R=R_1+R_2=${R1}+${R2}=${R}` : `R=\\frac{R_1R_2}{R_1+R_2}=\\frac{${R1}\\cdot${R2}}{${R1 + R2}}=${fmt(R, 4)}\\ \\Omega`],
        hint: 'במקביל ההתנגדות השקולה תמיד קטנה מהנגד הקטן.',
        diagram: { fn: 'circuits', args: [] }, source: SRC_HU,
      };
    },
  },
  'ge-divider': {
    subtopic: 'e-circuits', difficulty: 2,
    make() {
      const Vin = pick([5, 12, 24]); const R1 = pick([1, 2.2, 4.7, 10]); const R2 = pick([1, 3.3, 4.7, 10]);
      const Vo = f.divider(Vin, R1, R2);
      return {
        q: `מחלק מתח: $V_{in}=${Vin}$ V, $R_1=${R1}$ kΩ (עליון), $R_2=${R2}$ kΩ (תחתון). מה המתח על $R_2$?`,
        answer: Vo, unit: 'V',
        steps: [`V_{out}=V_{in}\\frac{R_2}{R_1+R_2}=${Vin}\\cdot\\frac{${R2}}{${fmt(R1 + R2, 4)}}=${fmt(Vo, 4)}\\ \\text{V}`],
        hint: 'כך מחברים חיישן התנגדותי (תרמיסטור, פוטנציומטר) לכניסה של בקר.',
        source: SRC_HU,
      };
    },
  },
  'ge-3phase': {
    subtopic: 'e-ac', difficulty: 2,
    make() {
      const P = pick([3, 5.5, 7.5, 11, 15, 22]); const pf = pick([0.8, 0.85, 0.9]);
      const I = f.threePhaseCurrent(P * 1000, 400, pf);
      return {
        q: `מנוע תלת-פאזי של $${P}$ kW (הספק חשמלי) ברשת 400 V, עם מקדם הספק $\\cos\\varphi=${pf}$. מה הזרם בכל פאזה?`,
        answer: I, unit: 'A',
        steps: [`P=\\sqrt3\\,V_LI\\cos\\varphi`, `I=\\frac{${P * 1000}}{\\sqrt3\\cdot400\\cdot${pf}}=${fmt(I, 4)}\\ \\text{A}`],
        hint: 'בתלת-פאזי מתח הקו (בין פאזות) הוא 400 V.',
        diagram: { fn: 'threePhase', args: [] }, source: SRC_HU,
      };
    },
  },
  'ge-peak': {
    subtopic: 'e-ac', difficulty: 1,
    make() {
      const V = pick([12, 24, 110, 230, 400]);
      return {
        q: `מה מתח השיא של מתח חילופין סינוסי עם ערך RMS של $${V}$ V?`,
        answer: f.vPeak(V), unit: 'V',
        steps: [`V_{peak}=\\sqrt2\\,V_{rms}=1.414\\cdot${V}=${fmt(f.vPeak(V), 4)}\\ \\text{V}`],
        hint: 'RMS הוא הערך שנותן את אותו חימום כמו DC באותו מתח.',
        diagram: { fn: 'sineWave', args: [{}] }, source: SRC_HU,
      };
    },
  },
  'ge-transformer': {
    subtopic: 'e-magnet', difficulty: 2,
    make() {
      // turn counts chosen so N2 comes out a whole number
      const c = pick([{ V1: 230, V2: 12, N: [230, 460, 1150] }, { V1: 230, V2: 24, N: [230, 460, 1150] }, { V1: 22000, V2: 400, N: [5500, 11000] }, { V1: 400, V2: 230, N: [400, 800] }]);
      const N1 = pick(c.N); const N2 = (N1 * c.V2) / c.V1;
      const I2 = pick([2, 5, 10]); const I1 = f.transformerI2(I2, N2, N1);
      const ask = pick(['N2', 'I1']);
      return {
        q: `שנאי אידיאלי מוריד מתח מ-$${c.V1}$ V ל-$${c.V2}$ V. לליפוף הראשוני $${N1}$ כריכות. ${ask === 'N2' ? 'כמה כריכות במשני?' : `העומס במשני צורך $${I2}$ A. מה הזרם בראשוני?`}`,
        answer: ask === 'N2' ? N2 : I1, unit: ask === 'N2' ? '' : 'A',
        steps: [`\\frac{N_2}{N_1}=\\frac{V_2}{V_1}\\Rightarrow N_2=${N1}\\cdot\\frac{${c.V2}}{${c.V1}}=${fmt(N2, 4)}`, `\\text{power in = power out: }I_1=I_2\\frac{V_2}{V_1}=${fmt(I1, 4)}\\ \\text{A}`],
        hint: 'מתח יורד, זרם עולה באותו יחס. ההספק נשמר (בשנאי אידיאלי).',
        diagram: { fn: 'transformer', args: [{}] }, source: SRC_CH,
      };
    },
  },
  'ge-lorentz': {
    subtopic: 'e-magnet', difficulty: 1,
    make() {
      const B = pick([0.5, 0.8, 1, 1.2]); const I = pick([5, 10, 20]); const L = pick([0.1, 0.2, 0.3]);
      return {
        q: `מוליך באורך $${L}$ m נושא זרם $${I}$ A בניצב לשדה מגנטי של $${B}$ T. מה הכוח עליו?`,
        answer: f.lorentzForce(B, I, L), unit: 'N',
        steps: [`F=BIL=${B}\\cdot${I}\\cdot${L}=${fmt(f.lorentzForce(B, I, L), 4)}\\ \\text{N}`],
        hint: 'זה הכוח שמסובב כל מנוע חשמלי.',
        source: SRC_HU,
      };
    },
  },
  'ge-dc-start': {
    subtopic: 'e-dcmotor', difficulty: 2,
    make() {
      const V = pick([12, 24, 48]); const Ra = pick([0.1, 0.2, 0.5]); const k = pick([0.05, 0.1, 0.2]);
      const w0 = f.dcNoLoadSpeed(V, k); const w = w0 * pick([0.7, 0.8, 0.9]);
      const ask = pick(['start', 'run']);
      const Is = f.dcStartCurrent(V, Ra), Ir = f.dcCurrent(V, k, w, Ra);
      return {
        q: `מנוע DC: $V=${V}$ V, התנגדות סליל $R_a=${Ra}$ Ω, קבוע $k=${k}$ V·s/rad. ${ask === 'start' ? 'מה זרם ההתנעה (המנוע עומד)?' : `מה הזרם כשהמנוע מסתובב ב-$${fmt(w, 4)}$ rad/s?`}`,
        answer: ask === 'start' ? Is : Ir, unit: 'A',
        steps: [`\\text{start: }E=0\\Rightarrow I=\\frac{V}{R_a}=${fmt(Is, 4)}\\ \\text{A}`, `\\text{running: }E=k\\omega=${fmt(k * w, 4)}\\ \\text{V},\\quad I=\\frac{V-E}{R_a}=${fmt(Ir, 4)}\\ \\text{A}`],
        hint: 'ה-back EMF הוא מתח שהמנוע מייצר כשהוא מסתובב, והוא "מתנגד" למתח הספק.',
        diagram: { fn: 'dcMotorCurve', args: [] }, source: SRC_CH,
      };
    },
  },
  'ge-sync': {
    subtopic: 'e-acmotor', difficulty: 1,
    make() {
      const f0 = pick([50, 60]); const p = pick([2, 4, 6, 8]); const s = pick([0.02, 0.03, 0.04, 0.05]);
      const Ns = f.syncSpeed(f0, p); const N = f.rotorSpeed(Ns, s); const ask = pick(['Ns', 'N']);
      return {
        q: `מנוע השראה עם $${p}$ קטבים מחובר לרשת $${f0}$ Hz. ${ask === 'Ns' ? 'מה המהירות הסינכרונית?' : `ההחלקה בעומס מלא $${s * 100}\\%$. מה מהירות הרוטור?`}`,
        answer: ask === 'Ns' ? Ns : N, unit: 'rpm',
        steps: [`N_s=\\frac{120f}{P}=\\frac{120\\cdot${f0}}{${p}}=${Ns}\\ \\text{rpm}`, `N=N_s(1-s)=${fmt(N, 5)}\\ \\text{rpm}`],
        hint: 'בישראל 50 Hz. לכן מנוע 4 קטבים מסתובב בקצת פחות מ-1500 rpm.',
        diagram: { fn: 'inductionCurve', args: [] }, source: SRC_CH,
      };
    },
  },
  'ge-stepper': {
    subtopic: 'e-drives', difficulty: 2,
    make() {
      const steps = pick([200, 400]); const micro = pick([1, 4, 8, 16]); const lead = pick([2, 5, 8, 10]);
      const res = f.leadScrewResolution(lead, steps, micro) * 1000;
      return {
        q: `מנוע צעד עם $${steps}$ צעדים לסיבוב (${fmt(f.stepAngle(steps), 3)}° לצעד), דרייבר ב-${micro === 1 ? 'צעד מלא' : `$${micro}$ מיקרו-צעדים`}, מניע בורג עם lead של $${lead}$ mm. מה התנועה הלינארית לכל פולס?`,
        answer: res, unit: 'μm',
        steps: [`\\text{pulses/rev}=${steps}\\cdot${micro}=${steps * micro}`, `\\Delta x=\\frac{${lead}}{${steps * micro}}\\ \\text{mm}=${fmt(res, 4)}\\ \\mu m`],
        hint: 'מיקרו-צעדים משפרים חלקות ורזולוציה, אבל הדיוק בפועל תלוי גם במנוע ובבורג.',
        diagram: { fn: 'leadScrew', args: [] }, source: SRC_HU,
      };
    },
  },
  'ge-gearbox': {
    subtopic: 'e-drives', difficulty: 1,
    make() {
      const T = pick([1, 2, 5, 10]); const n = pick([1450, 2900, 3000]); const i = pick([5, 10, 20, 30, 50]); const eta = pick([0.9, 0.95, 0.85]);
      const ask = pick(['T', 'n']);
      return {
        q: `מנוע מפיק $${T}$ N·m ב-$${n}$ rpm, ומחובר לתמסורת עם יחס $i=${i}$ ונצילות $${eta * 100}\\%$. מה ${ask === 'T' ? 'המומנט ביציאה' : 'המהירות ביציאה'}?`,
        answer: ask === 'T' ? f.gearOutTorque(T, i, eta) : f.gearOutSpeed(n, i), unit: ask === 'T' ? 'N·m' : 'rpm',
        steps: [`T_{out}=T_{in}\\,i\\,\\eta=${T}\\cdot${i}\\cdot${eta}=${fmt(f.gearOutTorque(T, i, eta), 4)}\\ \\text{N}\\cdot\\text{m}`, `n_{out}=\\frac{n_{in}}{i}=${fmt(f.gearOutSpeed(n, i), 4)}\\ \\text{rpm}`],
        hint: 'תמסורת מורידה מהירות ומגדילה מומנט. ההספק נשאר (פחות ההפסדים).',
        diagram: { fn: 'gears', args: [{ i }] }, source: SRC_HU,
      };
    },
  },
  'ge-connection': {
    subtopic: 'e-home', difficulty: 1,
    make() {
      const c = pick([[1, 25], [1, 40], [3, 25], [3, 40], [3, 63]]);
      const kva = f.connectionKVA(c[1], c[0]);
      return {
        q: `מה ההספק המקסימלי של חיבור חשמל ביתי בגודל $${c[0]}\\times${c[1]}$ A? (מתח פאזה $400/\\sqrt3\\approx231$ V)`,
        answer: kva, unit: 'kVA',
        steps: [`S=\\text{phases}\\cdot I\\cdot V_{ph}=${c[0]}\\cdot${c[1]}\\cdot230.9=${fmt(kva * 1000, 4)}\\ \\text{VA}`, `=${fmt(kva, 4)}\\ \\text{kVA}`],
        hint: 'בספר התעריפים: בערך 0.23 kVA לכל אמפר בכל פאזה.',
        diagram: { fn: 'homePanel', args: [] }, source: 'רשות החשמל, ספר התעריפים',
      };
    },
  },
  'ge-circuit-load': {
    subtopic: 'e-home', difficulty: 2,
    make() {
      const A = pick([10, 16, 20]); const dev = pick([[2000, 'קומקום'], [1500, 'מפזר חום'], [2200, 'מייבש כביסה'], [1000, 'מיקרוגל']]);
      const max = 230 * A;
      return {
        q: `מעגל שקעים מוגן במאמ"ת של $${A}$ A. מה ההספק המקסימלי שאפשר לחבר אליו ב-230 V? (ו${dev[1]} של $${dev[0]}$ W ועוד מכשיר זהה, יפילו אותו?)`,
        answer: max, unit: 'W',
        steps: [`P_{max}=VI=230\\cdot${A}=${max}\\ \\text{W}`, 2 * dev[0] > max ? `2\\cdot${dev[0]}=${2 * dev[0]}>${max}\\Rightarrow\\text{trips (after a while)}` : `2\\cdot${dev[0]}=${2 * dev[0]}\\le${max}\\Rightarrow\\text{OK}`],
        hint: 'מאמ"ת מגן על הכבל, לא על המכשיר. בעומס יתר קטן הוא מנתק אחרי זמן (תרמי), בקצר מיד (מגנטי).',
        diagram: { fn: 'homePanel', args: [] }, source: SRC_HU,
      };
    },
  },
  'ge-lineloss': {
    subtopic: 'e-grid', difficulty: 3,
    make() {
      const P = pick([0.5, 1, 2]); const R = pick([0.5, 1, 2]); const V = pick([400, 22000]);
      const loss = f.lineLoss3ph(P * 1e6, V, R) / 1000;
      return {
        q: `מעבירים $${P}$ MW (cosφ=1) בקו תלת-פאזי עם התנגדות $${R}$ Ω לכל מוליך, במתח קו של $${V}$ V. כמה הספק הולך לאיבוד בחום?`,
        answer: loss, unit: 'kW',
        steps: [`I=\\frac{P}{\\sqrt3V}=${fmt(f.threePhaseCurrent(P * 1e6, V), 4)}\\ \\text{A}`, `P_{loss}=3I^2R=${fmt(loss * 1000, 4)}\\ \\text{W}`],
        hint: V === 400 ? 'ב-400 V התוצאה אבסורדית: יותר מההספק עצמו. לכן אי אפשר להעביר הספק גדול למרחק במתח נמוך.' : 'הפסד ∝ 1/V². ב-22 kV הוא קטן פי 3025 מאשר ב-400 V.',
        diagram: { fn: 'gridChain', args: [] }, source: SRC_HU,
      };
    },
  },
  'ge-sag': {
    subtopic: 'e-grid', difficulty: 3,
    make() {
      const w = pick([10, 15, 20]); const L = pick([200, 300, 400]); const H = pick([15, 20, 30]);
      const sg = f.cableSag(w, L, H * 1000);
      return {
        q: `מוליך במשקל $${w}$ N/m נמתח בין שני עמודים במפתח של $${L}$ m, עם מתיחות אופקית $${H}$ kN. מה השקיעה באמצע (קירוב פרבולי)?`,
        answer: sg, unit: 'm',
        steps: [`\\text{sag}\\approx\\frac{wL^2}{8H}=\\frac{${w}\\cdot${L}^2}{8\\cdot${H * 1000}}=${fmt(sg, 4)}\\ \\text{m}`],
        hint: 'זו אותה נוסחה של מומנט מקסימלי בקורה תחת עומס מפוזר (wL²/8), חלקי המתיחות.',
        diagram: { fn: 'cableSagSketch', args: [] }, source: 'Hibbeler, Engineering Mechanics: Statics, פרק 7',
      };
    },
  },
});

// =====================================================================
// MACHINE DESIGN
// =====================================================================
const SRC_SH = "Shigley's Mechanical Engineering Design";
Object.assign(generators, {
  'gd-shaft-check': {
    subtopic: 'd-shafts', difficulty: 2,
    make() {
      const M = pick([100, 200, 300, 500]); const T = pick([100, 200, 400, 600]); const d = pick([25, 30, 35, 40, 50]); const Sy = pick([350, 420, 530]);
      const s = f.shaftVonMises(M * 1000, T * 1000, d); const n = Sy / s;
      return {
        q: `בנקודה קריטית בציר מלא בקוטר $${d}$ mm פועלים מומנט כפיפה $${M}$ N·m ומומנט פיתול $${T}$ N·m. $S_y=${Sy}$ MPa. מה מקדם הביטחון לכניעה (von Mises, עומס סטטי)?`,
        answer: n, unit: '',
        steps: [`\\sigma'=\\frac{16}{\\pi d^3}\\sqrt{4M^2+3T^2}=${fmt(s, 4)}\\ \\text{MPa}`, `n=\\frac{S_y}{\\sigma'}=${fmt(n, 4)}`],
        hint: 'σ = 32M/πd³ ו-τ = 16T/πd³, ואז σ\' = √(σ² + 3τ²).',
        diagram: { fn: 'shaftLayout', args: [] }, source: `${SRC_SH}, פרק 7`,
      };
    },
  },
  'gd-shaft-size': {
    subtopic: 'd-shafts', difficulty: 3,
    make() {
      const M = pick([150, 250, 400]); const T = pick([200, 300, 500]); const Sy = pick([350, 420]); const n = pick([2, 2.5, 3]);
      const d = f.shaftDiameterStatic(M * 1000, T * 1000, Sy, n);
      return {
        q: `מה הקוטר המינימלי של ציר מלא שנושא $M=${M}$ N·m ו-$T=${T}$ N·m, עם $S_y=${Sy}$ MPa ומקדם ביטחון $n=${n}$ (von Mises, סטטי)?`,
        answer: d, unit: 'mm',
        steps: [`d=\\left[\\frac{16n}{\\pi S_y}\\sqrt{4M^2+3T^2}\\right]^{1/3}`, `=\\left[\\frac{16\\cdot${n}}{\\pi\\cdot${Sy}}\\sqrt{4(${M * 1000})^2+3(${T * 1000})^2}\\right]^{1/3}=${fmt(d, 4)}\\ \\text{mm}`],
        hint: 'בפועל בוחרים קוטר סטנדרטי גדול יותר, ובודקים גם עייפות, שקיעה ומהירות קריטית.',
        source: `${SRC_SH}, פרק 7`,
      };
    },
  },
  'gd-bearing-life': {
    subtopic: 'd-bearings', difficulty: 2,
    make() {
      const C = pick([10, 15, 20, 30]); const P = pick([2, 3, 4, 5]); const rpm = pick([500, 1000, 1500, 3000]); const type = pick(['ball', 'roller']);
      const a = type === 'ball' ? 3 : 10 / 3; const L = f.bearingL10Hours(C, P, rpm, a);
      return {
        q: `מיסב ${type === 'ball' ? 'כדורי' : 'גלילי'} עם עומס דינמי נקוב $C=${C}$ kN נושא עומס שקול $P=${P}$ kN ב-$${rpm}$ rpm. מה חיי L10 בשעות?`,
        answer: L, unit: 'h',
        steps: [`L_{10}=\\left(\\frac{C}{P}\\right)^{${type === 'ball' ? '3' : '10/3'}}\\cdot10^6=${fmt(f.bearingL10Rev(C, P, a) / 1e6, 4)}\\times10^6\\ \\text{rev}`, `L_h=\\frac{L_{10}}{60n}=${fmt(L, 4)}\\ \\text{h}`],
        hint: 'L10 = החיים ש-90% מהמיסבים יעברו בלי כשל עייפות.',
        diagram: { fn: 'bearingLife', args: [] }, source: `${SRC_SH}, פרק 11`,
      };
    },
  },
  'gd-bearing-select': {
    subtopic: 'd-bearings', difficulty: 3,
    make() {
      const P = pick([1.5, 2, 3, 5]); const h = pick([10000, 20000, 40000]); const rpm = pick([750, 1000, 1500]);
      const C = f.bearingRequiredC(P, h, rpm);
      return {
        q: `צריך מיסב כדורי שיחזיק $${h}$ שעות (L10) ב-$${rpm}$ rpm תחת עומס $${P}$ kN. מה העומס הדינמי הנקוב C המינימלי שצריך לבחור מהקטלוג?`,
        answer: C, unit: 'kN',
        steps: [`L=${h}\\cdot60\\cdot${rpm}=${fmt(h * 60 * rpm, 4)}\\ \\text{rev}`, `C=P\\left(\\frac{L}{10^6}\\right)^{1/3}=${P}\\cdot${fmt((h * 60 * rpm) / 1e6, 4)}^{1/3}=${fmt(C, 4)}\\ \\text{kN}`],
        source: `${SRC_SH}, פרק 11`,
      };
    },
  },
  'gd-bolt-preload': {
    subtopic: 'd-bolts', difficulty: 2,
    make() {
      const size = pick(['M8', 'M10', 'M12', 'M16']); const Sp = pick([580, 600, 830]); const ask = pick(['Fi', 'T']);
      const At = f.BOLT_AT[size]; const d = Number(size.slice(1)); const Fi = f.boltPreload(At, Sp); const T = f.boltTorque(0.2, Fi, d) / 1000;
      return {
        q: `בורג ${size} ($A_t=${At}$ mm², חוזק הוכחה $S_p=${Sp}$ MPa) במחבר שמפרקים מדי פעם. ${ask === 'Fi' ? 'מה כוח ההידוק המומלץ?' : 'באיזה מומנט מהדקים (K = 0.2)?'}`,
        answer: ask === 'Fi' ? Fi / 1000 : T, unit: ask === 'Fi' ? 'kN' : 'N·m',
        steps: [`F_i=0.75\\,A_tS_p=0.75\\cdot${At}\\cdot${Sp}=${fmt(Fi, 5)}\\ \\text{N}`, `T=KF_id=0.2\\cdot${fmt(Fi, 5)}\\cdot${d}=${fmt(T * 1000, 5)}\\ \\text{N}\\cdot\\text{mm}=${fmt(T, 4)}\\ \\text{N}\\cdot\\text{m}`],
        hint: 'Shigley: 0.75 מהעומס ההוכחה במחבר שמפרקים, 0.9 בקבוע. רוב מומנט ההידוק הולך לחיכוך.',
        diagram: { fn: 'boltJoint', args: [] }, source: `${SRC_SH}, פרק 8`,
      };
    },
  },
  'gd-bolt-joint': {
    subtopic: 'd-bolts', difficulty: 3,
    make() {
      const Fi = pick([20, 30, 40]); const P = pick([5, 8, 10, 15]); const C = pick([0.15, 0.2, 0.25, 0.3]); const ask = pick(['Fb', 'P0']);
      const Fb = f.boltLoad(C, P, Fi); const P0 = f.separationLoad(C, Fi);
      return {
        q: `מחבר מוברג עם כוח הידוק $F_i=${Fi}$ kN וקבוע מחבר $C=${C}$. ${ask === 'Fb' ? `מפעילים עומס חיצוני $P=${P}$ kN. מה הכוח בבורג?` : 'באיזה עומס חיצוני החלקים ייפרדו?'}`,
        answer: ask === 'Fb' ? Fb : P0, unit: 'kN',
        steps: [`F_b=CP+F_i=${C}\\cdot${P}+${Fi}=${fmt(Fb, 4)}\\ \\text{kN}`, `P_0=\\frac{F_i}{1-C}=\\frac{${Fi}}{${fmt(1 - C, 3)}}=${fmt(P0, 4)}\\ \\text{kN}`],
        hint: 'C = k_b/(k_b + k_m). רוב העומס החיצוני רק מוריד את הלחיצה של החלקים, ולא מגיע לבורג.',
        diagram: { fn: 'jointDiagram', args: [{ C }] }, source: `${SRC_SH}, פרק 8`,
      };
    },
  },
  'gd-bolt-class': {
    subtopic: 'd-bolts', difficulty: 1,
    make() {
      const cls = pick(['4.6', '5.8', '8.8', '10.9', '12.9']); const ask = pick(['Sut', 'Sy']);
      const v = f.boltClass(cls);
      return {
        q: `מה ${ask === 'Sut' ? 'חוזק המתיחה הנומינלי' : 'חוזק הכניעה הנומינלי'} של בורג בדרגת חוזק ${cls}?`,
        answer: v[ask], unit: 'MPa', tol: 0.001,
        steps: [`${cls}:\\ S_{ut}=100\\cdot${cls.split('.')[0]}=${v.Sut}\\ \\text{MPa}`, `S_y=S_{ut}\\cdot0.${cls.split('.')[1]}=${v.Sy}\\ \\text{MPa}`],
        hint: 'המספר הראשון × 100 = חוזק מתיחה. המספר השני הוא היחס כניעה/מתיחה בעשיריות.',
        source: 'ISO 898-1 (שיטת הסימון)',
      };
    },
  },
  'gd-gear-geometry': {
    subtopic: 'd-gears', difficulty: 1,
    make() {
      const m = pick([1, 1.5, 2, 2.5, 3]); const N1 = pick([18, 20, 24, 30]); const N2 = pick([40, 48, 60, 72, 90]); const ask = pick(['a', 'i']);
      return {
        q: `זוג גלגלי שיניים: מודול $m=${m}$ mm, לגלגל המניע $${N1}$ שיניים ולמונע $${N2}$. מה ${ask === 'a' ? 'המרחק בין הצירים' : 'יחס התמסורת'}?`,
        answer: ask === 'a' ? f.gearCenterDistance(m, N1, N2) : f.gearRatio(N1, N2), unit: ask === 'a' ? 'mm' : '',
        steps: [`d_1=mN_1=${m * N1},\\quad d_2=mN_2=${m * N2}\\ \\text{mm}`, `a=\\frac{d_1+d_2}{2}=${fmt(f.gearCenterDistance(m, N1, N2), 4)}\\ \\text{mm},\\quad i=\\frac{N_2}{N_1}=${fmt(f.gearRatio(N1, N2), 4)}`],
        hint: 'שני גלגלים משולבים חייבים אותו מודול.',
        diagram: { fn: 'gears', args: [{ i: `${N2}/${N1}` }] }, source: `${SRC_SH}, פרק 13`,
      };
    },
  },
  'gd-lewis': {
    subtopic: 'd-gears', difficulty: 3,
    make() {
      const N = pick([20, 25, 30, 40]); const m = pick([2, 2.5, 3]); const F = pick([20, 25, 30]); const T = pick([30, 50, 80]);
      const d = m * N; const Wt = f.gearTangentialForce(T * 1000, d); const Y = f.LEWIS_Y[N]; const s = f.lewisStress(Wt, F, m, Y);
      return {
        q: `גלגל מניע עם $${N}$ שיניים, מודול $${m}$ mm ורוחב פנים $${F}$ mm מעביר $${T}$ N·m. גורם Lewis $Y=${Y}$. מה מאמץ הכפיפה בשן (Lewis, בלי מקדמים דינמיים)?`,
        answer: s, unit: 'MPa',
        steps: [`d=mN=${d}\\ \\text{mm},\\quad W_t=\\frac{2T}{d}=${fmt(Wt, 4)}\\ \\text{N}`, `\\sigma=\\frac{W_t}{F\\,m\\,Y}=\\frac{${fmt(Wt, 4)}}{${F}\\cdot${m}\\cdot${Y}}=${fmt(s, 4)}\\ \\text{MPa}`],
        hint: 'השן היא קורת שלוחה קצרה. AGMA מוסיף מקדמים לדינמיקה, לגודל, לפילוג עומס ועוד.',
        source: `${SRC_SH}, פרק 14`,
      };
    },
  },
  'gd-spring': {
    subtopic: 'd-springs', difficulty: 2,
    make() {
      const d = pick([2, 2.5, 3, 4]); const C = pick([6, 8, 10]); const D = d * C; const Na = pick([6, 8, 10, 12]); const F = pick([50, 80, 100, 150]);
      const k = f.springRate(79300, d, D, Na); const tau = f.springShear(F, D, d); const ask = pick(['k', 'tau']);
      return {
        q: `קפיץ לחיצה מפלדת קפיצים ($G=79.3$ GPa): תיל $d=${d}$ mm, קוטר ממוצע $D=${D}$ mm, $${Na}$ כריכות פעילות. ${ask === 'k' ? 'מה קבוע הקפיץ?' : `מה מאמץ הגזירה בתיל בכוח $${F}$ N?`}`,
        answer: ask === 'k' ? k : tau, unit: ask === 'k' ? 'N/mm' : 'MPa',
        steps: [`k=\\frac{Gd^4}{8D^3N_a}=\\frac{79300\\cdot${d}^4}{8\\cdot${D}^3\\cdot${Na}}=${fmt(k, 4)}\\ \\text{N/mm}`, `C=D/d=${C},\\quad K_s=1+\\frac{0.5}{C}=${fmt(f.springKs(C), 4)}`, `\\tau=K_s\\frac{8FD}{\\pi d^3}=${fmt(tau, 4)}\\ \\text{MPa}`],
        hint: 'k תלוי ב-d⁴: תיל קצת עבה יותר = קפיץ הרבה יותר קשיח.',
        diagram: { fn: 'helicalSpring', args: [] }, source: `${SRC_SH}, פרק 10`,
      };
    },
  },
  'gd-key': {
    subtopic: 'd-keys', difficulty: 2,
    make() {
      const d = pick([25, 30, 40, 50]); const w = { 25: 8, 30: 8, 40: 12, 50: 14 }[d]; const L = pick([25, 32, 40, 50]); const T = pick([100, 150, 200, 300]);
      const ask = pick(['shear', 'bearing']);
      const v = ask === 'shear' ? f.keyShear(T * 1000, d, w, L) : f.keyBearing(T * 1000, d, w, L);
      return {
        q: `שגם ריבועי $${w}\\times${w}$ mm באורך $${L}$ mm בציר בקוטר $${d}$ mm מעביר $${T}$ N·m. מה ${ask === 'shear' ? 'מאמץ הגזירה בשגם' : 'מאמץ הלחיצה (bearing) על דופן השגם'}?`,
        answer: v, unit: 'MPa',
        steps: [`F=\\frac{2T}{d}=${fmt(f.keyForce(T * 1000, d), 4)}\\ \\text{N}`, ask === 'shear' ? `\\tau=\\frac{F}{wL}=${fmt(v, 4)}\\ \\text{MPa}` : `\\sigma_b=\\frac{F}{L\\,h/2}=${fmt(v, 4)}\\ \\text{MPa}`],
        hint: 'השגם הוא "נתיך מכני": זול להחלפה ונכשל לפני הציר והרכזת.',
        diagram: { fn: 'keySection', args: [] }, source: `${SRC_SH}, פרק 7`,
      };
    },
  },
  'gd-pressfit': {
    subtopic: 'd-keys', difficulty: 3,
    make() {
      const R = pick([15, 20, 25]); const ro = R * pick([1.8, 2, 2.5]); const dl = pick([0.01, 0.015, 0.02]); const L = pick([30, 40, 50]); const fr = pick([0.12, 0.15]);
      const p = f.pressFitPressure(207000, dl, R, ro); const T = f.pressFitTorque(fr, p, R, L) / 1000;
      const ask = pick(['p', 'T']);
      return {
        q: `רכזת פלדה (רדיוס חיצוני $${ro}$ mm) נלחצת על ציר פלדה מלא ברדיוס $${R}$ mm, בחפיפה רדיאלית של $${dl}$ mm ($E=207$ GPa). ${ask === 'p' ? 'מה לחץ המגע?' : `איזה מומנט החיבור מעביר באורך $${L}$ mm עם $f=${fr}$?`}`,
        answer: ask === 'p' ? p : T, unit: ask === 'p' ? 'MPa' : 'N·m',
        steps: [`p=\\frac{E\\delta}{2R}\\cdot\\frac{r_o^2-R^2}{r_o^2}=${fmt(p, 4)}\\ \\text{MPa}`, `T=f\\,p\\,(2\\pi RL)\\,R=${fmt(T, 4)}\\ \\text{N}\\cdot\\text{m}`],
        hint: 'δ כאן הוא החפיפה ברדיוס (חצי מהחפיפה בקוטר).',
        diagram: { fn: 'pressFit', args: [] }, source: `${SRC_SH}, פרק 3`,
      };
    },
  },
  'gd-weld': {
    subtopic: 'd-welds', difficulty: 2,
    make() {
      const F = pick([10, 20, 30, 50]); const h = pick([4, 5, 6, 8]); const L = pick([50, 80, 100, 150]);
      const tau = f.filletShear(F * 1000, h, L);
      return {
        q: `שני תפרי פינה (fillet) בגודל רגל $${h}$ mm, באורך כולל $${L}$ mm, נושאים כוח $${F}$ kN. מה מאמץ הגזירה בגרון התפר?`,
        answer: tau, unit: 'MPa',
        steps: [`t=0.707h=${fmt(0.707 * h, 4)}\\ \\text{mm}`, `\\tau=\\frac{F}{0.707\\,h\\,L}=\\frac{${F * 1000}}{${fmt(0.707 * h, 4)}\\cdot${L}}=${fmt(tau, 4)}\\ \\text{MPa}`],
        hint: 'הגרון הוא המרחק הקצר ביותר מהשורש לפני התפר.',
        diagram: { fn: 'filletWeld', args: [] }, source: `${SRC_SH}, פרק 9`,
      };
    },
  },
  'gd-belt': {
    subtopic: 'd-belts', difficulty: 2,
    make() {
      const d = pick([80, 100, 125, 150]); const rpm = pick([1450, 2900]); const F1 = pick([400, 600, 800]); const F2 = pick([100, 150, 200]);
      const V = f.beltSpeed(d, rpm); const P = f.beltPower(F1, F2, V) / 1000;
      return {
        q: `גלגלת מניעה בקוטר $${d}$ mm מסתובבת ב-$${rpm}$ rpm. המתיחות בצד המתוח $${F1}$ N ובצד הרפוי $${F2}$ N. איזה הספק עובר ברצועה?`,
        answer: P, unit: 'kW',
        steps: [`V=\\frac{\\pi dn}{60}=${fmt(V, 4)}\\ \\text{m/s}`, `P=(F_1-F_2)V=${F1 - F2}\\cdot${fmt(V, 4)}=${fmt(P * 1000, 4)}\\ \\text{W}`],
        hint: 'רק ההפרש בין המתיחויות מעביר הספק. המתיחות המוקדמת נדרשת כדי שהרצועה לא תחליק.',
        diagram: { fn: 'beltDrive', args: [] }, source: `${SRC_SH}, פרק 17`,
      };
    },
  },
});

// =====================================================================
// TOLERANCES & GD&T
// =====================================================================
const SRC_286 = 'ISO 286-1/2 (מערכת ההתאמות)';
const SRC_Y14 = 'ASME Y14.5-2018';
Object.assign(generators, {
  'gx-fit': {
    subtopic: 'tol-fits', difficulty: 2,
    make() {
      const D = pick([8, 12, 16, 20, 25, 30, 40]); const c = pick([['g', 6], ['f', 7], ['h', 6], ['k', 6], ['n', 6], ['p', 6], ['s', 6]]);
      const hg = c[0] === 'f' ? 8 : 7; const h = f.holeH(D, hg), sh = f.shaftLimits(D, c[0], c[1]); const ft = f.fit(D, hg, c[0], c[1]);
      const ask = pick(['max', 'min']);
      const v = ask === 'max' ? ft.maxClearance : ft.minClearance;
      return {
        q: `התאמה Ø${D} H${hg}/${c[0]}${c[1]}. החור: $+${h.lo}/+${h.hi}$ µm. הציר: $${sh.lo >= 0 ? '+' : ''}${sh.lo}/${sh.hi >= 0 ? '+' : ''}${sh.hi}$ µm. מה ${ask === 'max' ? 'המרווח המקסימלי' : 'המרווח המינימלי'}? (מספר שלילי = לחיצה)`,
        answer: v, unit: 'µm', tol: 1e-6,
        steps: [`\\text{max clearance}=\\text{hole}_{max}-\\text{shaft}_{min}=${h.hi}-(${sh.lo})=${ft.maxClearance}`, `\\text{min clearance}=\\text{hole}_{min}-\\text{shaft}_{max}=${h.lo}-(${sh.hi})=${ft.minClearance}`, ft.minClearance >= 0 ? `\\Rightarrow\\ \\text{clearance fit}` : ft.maxClearance <= 0 ? `\\Rightarrow\\ \\text{interference fit}` : `\\Rightarrow\\ \\text{transition fit}`],
        hint: 'מרווח מקסימלי: החור הכי גדול עם הציר הכי קטן. מרווח מינימלי: החור הכי קטן עם הציר הכי גדול.',
        diagram: { fn: 'fitDiagram', args: [D, hg, c[0], c[1]] }, source: SRC_286,
      };
    },
  },
  'gx-it': {
    subtopic: 'tol-fits', difficulty: 1,
    make() {
      const D = pick([8, 12, 20, 25, 40]); const g = pick([6, 7, 8]);
      const v = f.ISO286[f.sizeRange(D)][`IT${g}`];
      return {
        q: `לפי טבלת ISO 286, מה רוחב הטולרנס IT${g} לקוטר נומינלי $${D}$ mm (טווח ${f.sizeRange(D)} mm)? בדוק את עצמך מול הנוסחה $IT${g}=${f.IT_FACTOR[g]}\\,i$.`,
        answer: v, unit: 'µm', tol: 0.08,
        steps: [`D=\\sqrt{${f.sizeRange(D).replace('-', '\\cdot')}}=${fmt(Math.sqrt(f.sizeRange(D).split('-').reduce((a, b) => a * b)), 4)}`, `i=0.45\\sqrt[3]{D}+0.001D=${fmt(f.toleranceUnit(Math.sqrt(f.sizeRange(D).split('-').reduce((a, b) => a * b))), 4)}\\ \\mu m`, `IT${g}=${f.IT_FACTOR[g]}\\,i\\approx${v}\\ \\mu m\\ \\text{(table)}`],
        hint: 'כל דרגת IT גבוהה יותר רחבה בערך פי 1.6. D הוא הממוצע הגיאומטרי של הטווח.',
        source: SRC_286,
      };
    },
  },
  'gx-stack': {
    subtopic: 'tol-stack', difficulty: 2,
    make() {
      const n = pick([3, 4, 5]); const tols = Array.from({ length: n }, () => pick([0.05, 0.1, 0.15, 0.2])); const ask = pick(['wc', 'rss']);
      const wc = f.stackWorst(tols), rss = f.stackRSS(tols);
      return {
        q: `שרשרת של ${n} מידות עם טולרנסים $\\pm${tols.join(',\\ \\pm')}$ mm. מה הטולרנס של המידה המצטברת לפי ${ask === 'wc' ? 'Worst case' : 'RSS (סטטיסטי)'}?`,
        answer: ask === 'wc' ? wc : rss, unit: '± mm',
        steps: [`\\text{Worst case}=\\sum t_i=${fmt(wc, 4)}`, `\\text{RSS}=\\sqrt{\\sum t_i^2}=${fmt(rss, 4)}`],
        hint: 'RSS מניח שהמידות מתפלגות נורמלית ובלתי תלויות, ושקשה שכולן יהיו בקצה באותו זמן.',
        diagram: { fn: 'stackChain', args: [{}] }, source: 'Fischer, Mechanical Tolerance Stackup and Analysis',
      };
    },
  },
  'gx-gap': {
    subtopic: 'tol-stack', difficulty: 3,
    make() {
      const H = pick([50, 60, 80]); const a = pick([20, 25]); const b = pick([15, 20]); const c = H - a - b - pick([1, 2]);
      const tH = 0.1, ta = 0.05, tb = 0.05, tc = 0.08;
      const nom = H - a - b - c; const wc = tH + ta + tb + tc;
      const ask = pick(['min', 'max']);
      return {
        q: `בית באורך פנימי $${H}\\pm${tH}$ מכיל שלושה חלקים: $${a}\\pm${ta}$, $${b}\\pm${tb}$, $${c}\\pm${tc}$ mm. מה המרווח ה${ask === 'min' ? 'מינימלי' : 'מקסימלי'} (Worst case)?`,
        answer: ask === 'min' ? nom - wc : nom + wc, unit: 'mm',
        steps: [`\\text{nominal gap}=${H}-${a}-${b}-${c}=${fmt(nom, 4)}`, `\\sum t=${fmt(wc, 4)}`, `\\text{gap}=${fmt(nom, 4)}\\pm${fmt(wc, 4)}\\Rightarrow ${fmt(nom - wc, 4)}\\ \\text{to}\\ ${fmt(nom + wc, 4)}\\ \\text{mm}`],
        hint: 'כל הטולרנסים בשרשרת מצטברים לטולרנס של המרווח. מינוס במידה לא מבטל טולרנס.',
        diagram: { fn: 'stackChain', args: [{ parts: [['A', a, ta], ['B', b, tb], ['C', c, tc]] }] }, source: 'Fischer, Mechanical Tolerance Stackup and Analysis',
      };
    },
  },
  'gx-position': {
    subtopic: 'tol-position', difficulty: 2,
    make() {
      const dx = pick([0.01, 0.02, 0.03, 0.04]); const dy = pick([0.02, 0.03, 0.05]); const tol = pick([0.1, 0.12, 0.15]);
      const d = f.positionDia(dx, dy);
      return {
        q: `מרכז קדח נמדד בסטייה של $\\Delta x=${dx}$, $\\Delta y=${dy}$ mm מהמיקום האמיתי. מה קוטר אזור המיקום שהקדח "צורך"? (הטולרנס בשרטוט: Ø${tol}. האם עובר?)`,
        answer: d, unit: 'mm',
        steps: [`\\varnothing=2\\sqrt{\\Delta x^2+\\Delta y^2}=2\\sqrt{${dx}^2+${dy}^2}=${fmt(d, 4)}`, d <= tol ? `${fmt(d, 4)}\\le${tol}\\Rightarrow\\text{OK}` : `${fmt(d, 4)}>${tol}\\Rightarrow\\text{reject (unless MMC bonus)}`],
        hint: 'אזור טולרנס מיקום הוא עיגול סביב המיקום האמיתי, ולא ריבוע של ±.',
        diagram: { fn: 'positionZone', args: [{ tol, dx, dy }] }, source: SRC_Y14,
      };
    },
  },
  'gx-mmc': {
    subtopic: 'tol-mmc', difficulty: 2,
    make() {
      const nom = pick([6, 8, 10]); const tolSize = pick([0.1, 0.2]); const tol = pick([0.05, 0.1, 0.15]); const actual = +(nom + pick([0.05, 0.1, tolSize])).toFixed(3);
      const allowed = f.mmcAllowed(tol, nom, Math.min(actual, nom + tolSize));
      return {
        q: `קדח Ø${nom}+${tolSize}/0 עם טולרנס מיקום Ø${tol} בתנאי MMC. הקדח נמדד בקוטר $${actual}$ mm. מה טולרנס המיקום המותר לקדח הזה?`,
        answer: allowed, unit: 'mm',
        steps: [`\\text{MMC (hole)}=${nom}`, `\\text{bonus}=${actual}-${nom}=${fmt(actual - nom, 4)}`, `\\text{allowed}=${tol}+${fmt(actual - nom, 4)}=${fmt(allowed, 4)}`],
        hint: 'בקדח, MMC הוא הקוטר הקטן ביותר. ככל שהקדח גדול יותר, יש יותר מקום לבורג, ולכן הוא יכול לסטות יותר.',
        diagram: { fn: 'mmcBonus', args: [{ mmc: nom, lmc: nom + tolSize, tol, hole: true }] }, source: SRC_Y14,
      };
    },
  },
  'gx-vc': {
    subtopic: 'tol-mmc', difficulty: 2,
    make() {
      const pin = Math.random() < 0.5; const mmc = pin ? pick([7.98, 9.98, 11.97]) : pick([8.0, 10.0, 12.0]); const tol = pick([0.05, 0.1]);
      const vc = pin ? f.virtualConditionPin(mmc, tol) : f.virtualConditionHole(mmc, tol);
      return {
        q: `${pin ? 'פין' : 'קדח'} עם גודל MMC של $${mmc}$ mm וטולרנס ${pin ? 'ניצבות' : 'מיקום'} של Ø${tol} ב-MMC. מה ה-Virtual Condition (הגבול שהחלק המתאים חייב לפנות)?`,
        answer: vc, unit: 'mm', tol: 1e-6,
        steps: [pin ? `VC_{pin}=MMC+t=${mmc}+${tol}=${fmt(vc, 5)}` : `VC_{hole}=MMC-t=${mmc}-${tol}=${fmt(vc, 5)}`],
        hint: 'VC הוא "הקדח הגרוע ביותר" או "הפין הגרוע ביותר". כך מתכננים מכשיר בדיקה (go gauge).',
        source: SRC_Y14,
      };
    },
  },
  'gx-fastener': {
    subtopic: 'tol-mmc', difficulty: 3,
    make() {
      const F = pick([6, 8, 10]); const H = F + pick([0.4, 0.5, 0.6, 1]); const kind = pick(['floating', 'fixed']);
      const T = kind === 'floating' ? f.floatingFastenerT(H, F) : f.fixedFastenerT(H, F);
      return {
        q: `בורג M${F} (קוטר $${F}$ mm). קדח המעבר בגודל MMC של $${H.toFixed(1)}$ mm. ${kind === 'floating' ? 'בשני החלקים יש קדחי מעבר ואום (floating fastener).' : 'החלק השני מוברג (fixed fastener), והטולרנס מתחלק שווה בין שני החלקים.'} מה טולרנס המיקום (Ø) לכל חלק?`,
        answer: T, unit: 'mm', tol: 1e-6,
        steps: [kind === 'floating' ? `T=H-F=${H.toFixed(1)}-${F}=${fmt(T, 4)}` : `T=\\frac{H-F}{2}=\\frac{${H.toFixed(1)}-${F}}{2}=${fmt(T, 4)}`],
        hint: 'כשאחד החלקים מוברג, הבורג "נעול" אליו, ולכן כל המרווח צריך להספיק לשני החלקים.',
        source: `${SRC_Y14}, נספח B`,
      };
    },
  },
  'gx-2768': {
    subtopic: 'tol-basics', difficulty: 1,
    make() {
      const L = pick([5, 20, 50, 100, 250]); const cls = pick(['f', 'm', 'c']);
      const v = f.iso2768(cls, L);
      return {
        q: `בשרטוט כתוב "ISO 2768-${cls}". מה הטולרנס הכללי למידה של $${L}$ mm שאין לה טולרנס מפורש?`,
        answer: v, unit: '± mm', tol: 1e-6,
        steps: [`\\text{ISO 2768-${cls}},\\ ${L}\\ \\text{mm}\\Rightarrow\\pm${v}\\ \\text{mm}`],
        hint: 'f = fine, m = medium, c = coarse. ככל שהמידה גדולה יותר, הטולרנס הכללי רחב יותר.',
        source: 'ISO 2768-1',
      };
    },
  },
  'gx-thermal': {
    subtopic: 'tol-standards', difficulty: 2,
    make() {
      const L = pick([100, 200, 500]); const m = pick([['אלומיניום', 23e-6], ['פלדה', 12e-6]]); const T = pick([25, 28, 30, 35]);
      const d = f.thermalSizeChange(L, m[1], T - 20) * 1000;
      return {
        q: `חלק מ${m[0]} ($\\alpha=${m[1] * 1e6}\\times10^{-6}$/K) באורך $${L}$ mm נמדד ב-$${T}$°C. בכמה מיקרון הוא ארוך יותר מאשר בטמפרטורת הייחוס של 20°C?`,
        answer: d, unit: 'µm',
        steps: [`\\Delta L=L\\,\\alpha\\,\\Delta T=${L}\\cdot${m[1] * 1e6}\\times10^{-6}\\cdot${T - 20}=${fmt(d / 1000, 4)}\\ \\text{mm}=${fmt(d, 4)}\\ \\mu m`],
        hint: 'כל המידות בשרטוט מוגדרות ב-20°C (ISO 1). בטולרנס של מיקרונים, טמפרטורה משנה.',
        source: 'ISO 1',
      };
    },
  },
});

// =====================================================================
// MANUFACTURING & DFM
// =====================================================================
const SRC_KA = 'Kalpakjian & Schmid, Manufacturing Engineering and Technology';
const SRC_BD = 'Boothroyd, Dewhurst & Knight, Product Design for Manufacture and Assembly';
const SRC_MO = 'Montgomery, Introduction to Statistical Quality Control';
Object.assign(generators, {
  'gq-rpm': {
    subtopic: 'mf-machining', difficulty: 1,
    make() {
      const m = pick([['אלומיניום', pick([250, 300, 400])], ['פלדה', pick([120, 150, 200])], ['נירוסטה', pick([80, 100, 120])]]); const D = pick([10, 16, 20, 50, 80]);
      const n = f.spindleRpm(m[1], D);
      return {
        q: `כרסום ב${m[0]} עם כלי בקוטר $${D}$ mm במהירות חיתוך $V_c=${m[1]}$ m/min (מהקטלוג של הכלי). מה מהירות הציר?`,
        answer: n, unit: 'rpm',
        steps: [`n=\\frac{1000\\,V_c}{\\pi D}=\\frac{1000\\cdot${m[1]}}{\\pi\\cdot${D}}=${fmt(n, 4)}\\ \\text{rpm}`],
        hint: 'כלי קטן צריך הרבה סיבובים כדי להגיע לאותה מהירות היקפית. 1000 ממיר מטר למילימטר.',
        diagram: { fn: 'milling', args: [] }, source: SRC_KA,
      };
    },
  },
  'gq-feed': {
    subtopic: 'mf-machining', difficulty: 2,
    make() {
      const n = pick([2000, 3000, 5000, 8000]); const z = pick([2, 3, 4]); const fz = pick([0.03, 0.05, 0.08, 0.1]); const ae = pick([5, 10]); const ap = pick([2, 5, 10]); const ask = pick(['vf', 'mrr']);
      const vf = f.millFeedRate(fz, z, n); const mrr = f.millMRR(ae, ap, vf) / 1000;
      return {
        q: `כרסום: $n=${n}$ rpm, כלי עם $${z}$ שיניים, הזנה לשן $f_z=${fz}$ mm. ${ask === 'vf' ? 'מה קצב ההזנה של השולחן?' : `רוחב חיתוך $a_e=${ae}$ mm ועומק $a_p=${ap}$ mm. מה קצב הסרת החומר?`}`,
        answer: ask === 'vf' ? vf : mrr, unit: ask === 'vf' ? 'mm/min' : 'cm³/min',
        steps: [`v_f=f_z\\,z\\,n=${fz}\\cdot${z}\\cdot${n}=${fmt(vf, 4)}\\ \\text{mm/min}`, `MRR=a_e\\,a_p\\,v_f=${ae}\\cdot${ap}\\cdot${fmt(vf, 4)}=${fmt(mrr * 1000, 5)}\\ \\text{mm}^3/\\text{min}=${fmt(mrr, 4)}\\ \\text{cm}^3/\\text{min}`],
        hint: 'MRR קובע את זמן העיבוד, וזמן עיבוד הוא חלק גדול מעלות החלק.',
        diagram: { fn: 'milling', args: [] }, source: SRC_KA,
      };
    },
  },
  'gq-ra': {
    subtopic: 'mf-machining', difficulty: 2,
    make() {
      const fz = pick([0.05, 0.1, 0.15, 0.2, 0.3]); const r = pick([0.4, 0.8, 1.2]);
      const Ra = f.turnRa(fz, r);
      return {
        q: `בחריטה עם הזנה $f=${fz}$ mm/rev וכלי עם רדיוס קצה $r=${r}$ mm, מה החספוס התאורטי Ra?`,
        answer: Ra, unit: 'µm',
        steps: [`R_a\\approx\\frac{f^2}{32\\,r}=\\frac{${fz}^2}{32\\cdot${r}}=${fmt(Ra / 1000, 4)}\\ \\text{mm}=${fmt(Ra, 4)}\\ \\mu m`],
        hint: 'הזנה כפולה = חספוס פי 4. רדיוס קצה גדול = משטח חלק יותר.',
        diagram: { fn: 'turning', args: [] }, source: SRC_KA,
      };
    },
  },
  'gq-bend': {
    subtopic: 'mf-sheet', difficulty: 2,
    make() {
      const T = pick([1, 1.5, 2, 3]); const R = pick([1, 2, 3]); const K = pick([0.33, 0.4, 0.44]); const th = pick([90, 90, 60, 120]); const L1 = pick([30, 40, 50]); const L2 = pick([20, 25, 30]);
      const BA = f.bendAllowance(th, R, K, T); const FL = f.flatLength(L1, L2, th, R, K, T); const ask = pick(['BA', 'FL']);
      return {
        q: `פח בעובי $T=${T}$ mm מכופף ב-$${th}^\\circ$ עם רדיוס פנימי $R=${R}$ mm ו-$K=${K}$. ${ask === 'BA' ? 'מה ה-Bend Allowance?' : `אורכי הרגליים עד נקודות המשיק של הכיפוף: $${L1}$ ו-$${L2}$ mm. מה אורך הפח הפרוש?`}`,
        answer: ask === 'BA' ? BA : FL, unit: 'mm',
        steps: [`BA=\\theta\\,(R+KT)=${fmt(f.rad(th), 4)}\\cdot(${R}+${K}\\cdot${T})=${fmt(BA, 4)}\\ \\text{mm}`, `L_{flat}=L_1+L_2+BA=${fmt(FL, 4)}\\ \\text{mm}`],
        hint: 'הזווית ברדיאנים. K אומר איפה נמצא הציר הניטרלי (שלא משנה אורך) בתוך העובי.',
        diagram: { fn: 'sheetBend', args: [] }, source: SRC_KA,
      };
    },
  },
  'gq-clamp': {
    subtopic: 'mf-molding', difficulty: 2,
    make() {
      const a = pick([60, 80, 100, 150]); const b = pick([40, 60, 80]); const n = pick([1, 2, 4]); const p = pick([30, 40, 50]);
      const F = f.clampForce(a * b * n, p) / 9810;
      return {
        q: `תבנית הזרקה עם $${n}$ חללים, לכל חלק שטח מוטל $${a}\\times${b}$ mm. לחץ החלל הממוצע המשוער $${p}$ MPa. מה כוח הסגירה הנדרש בטון?`,
        answer: F, unit: 'ton',
        steps: [`A=${n}\\cdot${a}\\cdot${b}=${a * b * n}\\ \\text{mm}^2`, `F=A\\,p=${fmt(a * b * n * p, 5)}\\ \\text{N}`, `=${fmt(F, 4)}\\ \\text{ton}`],
        hint: 'השטח המוטל הוא מה שרואים כשמסתכלים על החלק בכיוון פתיחת התבנית. מוסיפים מרווח בבחירת מכונה.',
        diagram: { fn: 'moldPart', args: [] }, source: SRC_KA,
      };
    },
  },
  'gq-cooling': {
    subtopic: 'mf-molding', difficulty: 1,
    make() {
      const t1 = pick([1.5, 2, 2.5]); const t2 = pick([3, 4, 5]);
      return {
        q: `מגדילים עובי דופן בחלק מוזרק מ-$${t1}$ ל-$${t2}$ mm. בערך פי כמה יגדל זמן הקירור?`,
        answer: f.coolingTimeRatio(t2, t1), unit: '',
        steps: [`t_{cool}\\propto s^2\\Rightarrow\\left(\\frac{${t2}}{${t1}}\\right)^2=${fmt(f.coolingTimeRatio(t2, t1), 4)}`],
        hint: 'זמן הקירור הוא לרוב החלק הגדול של המחזור. דופן עבה = מחזור ארוך = חלק יקר, ועוד שקעים (sink marks).',
        source: SRC_KA,
      };
    },
  },
  'gq-print': {
    subtopic: 'mf-am', difficulty: 1,
    make() {
      const V = pick([20, 50, 80, 120]); const infill = pick([0.2, 0.3, 0.5]); const rate = pick([10, 15, 20]);
      const h = f.printTimeHours(V * infill, rate);
      return {
        q: `חלק בנפח $${V}$ cm³ מודפס ב-FDM במילוי $${infill * 100}\\%$ (בקירוב: זה החלק מהנפח שמודפס). המדפסת מניחה $${rate}$ cm³ לשעה. כמה זמן תימשך ההדפסה (בקירוב גס)?`,
        answer: h, unit: 'h',
        steps: [`V_{printed}\\approx${V}\\cdot${infill}=${fmt(V * infill, 4)}\\ \\text{cm}^3`, `t=\\frac{${fmt(V * infill, 4)}}{${rate}}=${fmt(h, 4)}\\ \\text{h}`],
        hint: 'קירוב גס: בפועל הדפנות החיצוניות מודפסות מלאות, ויש גם תמיכות וזמן תנועה.',
        diagram: { fn: 'amLayers', args: [] }, source: 'Gibson, Rosen & Stucker, Additive Manufacturing Technologies',
      };
    },
  },
  'gq-dfa': {
    subtopic: 'mf-dfm', difficulty: 2,
    make() {
      const N = pick([3, 4, 5, 6]); const total = pick([45, 60, 90, 120]);
      const E = f.dfaEfficiency(N, total);
      return {
        q: `במכלול יש $${N}$ חלקים "הכרחיים" (לפי שלוש שאלות DFA), וזמן ההרכבה הכולל $${total}$ s. מה יעילות התכן לפי Boothroyd-Dewhurst? תשובה באחוזים.`,
        answer: E * 100, unit: '%',
        steps: [`E=\\frac{3\\,N_{min}}{t_{total}}=\\frac{3\\cdot${N}}{${total}}=${fmt(E, 4)}`],
        hint: 'חלק הכרחי: זז ביחס לאחרים, חייב חומר שונה, או חייב להיות נפרד לפירוק. כל השאר מועמד לאיחוד.',
        source: SRC_BD,
      };
    },
  },
  'gq-cpk': {
    subtopic: 'mf-quality', difficulty: 2,
    make() {
      const nom = pick([10, 20, 25]); const tol = pick([0.05, 0.1]); const sigma = pick([0.008, 0.01, 0.015]); const shift = pick([0, 0.01, 0.02]);
      const mu = nom + shift; const USL = nom + tol, LSL = nom - tol;
      const k = f.cpk(USL, LSL, mu, sigma); const c = f.cp(USL, LSL, sigma); const ask = pick(['cp', 'cpk']);
      return {
        q: `מידה $${nom}\\pm${tol}$ mm. בתהליך: ממוצע $${fmt(mu, 5)}$ mm וסטיית תקן $${sigma}$ mm. מה ${ask === 'cp' ? 'Cp' : 'Cpk'}?`,
        answer: ask === 'cp' ? c : k, unit: '',
        steps: [`C_p=\\frac{USL-LSL}{6\\sigma}=\\frac{${fmt(2 * tol, 4)}}{${fmt(6 * sigma, 4)}}=${fmt(c, 4)}`, `C_{pk}=\\frac{\\min(USL-\\mu,\\ \\mu-LSL)}{3\\sigma}=${fmt(k, 4)}`],
        hint: 'Cp אומר אם התהליך "צר מספיק". Cpk מוסיף אם הוא גם ממורכז. דרישה נפוצה: Cpk ≥ 1.33.',
        diagram: { fn: 'cpkCurve', args: [{ LSL, USL, mean: mu, sigma }] }, source: SRC_MO,
      };
    },
  },
  'gq-rpn': {
    subtopic: 'mf-quality', difficulty: 1,
    make() {
      const S = pick([5, 7, 8, 9, 10]); const O = pick([2, 3, 4, 6]); const D = pick([2, 3, 5, 7]);
      return {
        q: `בניתוח FMEA, אופן כשל קיבל חומרה $S=${S}$, הסתברות $O=${O}$ ויכולת גילוי $D=${D}$ (כל אחד 1-10). מה ה-RPN?`,
        answer: f.rpn(S, O, D), unit: '', tol: 1e-9,
        steps: [`RPN=S\\cdot O\\cdot D=${S}\\cdot${O}\\cdot${D}=${f.rpn(S, O, D)}`],
        hint: 'RPN גבוה = עדיפות לפעולה. אבל חומרה גבוהה מאוד (9-10, בטיחות) מטפלים בה בכל מקרה.',
        source: 'AIAG & VDA FMEA Handbook',
      };
    },
  },
  'gq-breakeven': {
    subtopic: 'mf-cost', difficulty: 2,
    make() {
      const tool = pick([15000, 25000, 40000, 60000]); const vInj = pick([1, 2, 3]); const vCnc = pick([20, 30, 45]);
      const N = f.breakEven(0, vCnc, tool, vInj);
      return {
        q: `חלק עולה $${vCnc}$ ₪ ליחידה בעיבוד שבבי (בלי תבנית), או $${vInj}$ ₪ ליחידה בהזרקה עם תבנית של $${tool.toLocaleString('en-US')}$ ₪. מאיזו כמות ההזרקה משתלמת?`,
        answer: N, unit: 'יח׳',
        steps: [`${vCnc}\\,N=${tool}+${vInj}\\,N`, `N=\\frac{${tool}}{${vCnc}-${vInj}}=${fmt(N, 4)}`],
        hint: 'בכמויות קטנות עלות התבנית "מתחלקת" על מעט חלקים. מעל נקודת האיזון התבנית משתלמת.',
        diagram: { fn: 'costCurves', args: [] }, source: SRC_KA,
      };
    },
  },
});

export function makeQuestion(genId) {
  const g = generators[genId];
  const out = g.make();
  return { id: genId, type: 'numeric', subtopic: g.subtopic, difficulty: g.difficulty, ...out, tol: out.tol || 0.02 };
}
