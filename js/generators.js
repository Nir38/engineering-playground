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

export function makeQuestion(genId) {
  const g = generators[genId];
  const out = g.make();
  return { id: genId, type: 'numeric', subtopic: g.subtopic, difficulty: g.difficulty, ...out, tol: out.tol || 0.02 };
}
