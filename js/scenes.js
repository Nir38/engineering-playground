// scenes.js: playground scenes saved as quiz questions. Each saved question keeps the scene and
// a target quantity; every time it is asked, the inputs are re-drawn (about ±50 %, rounded), the
// answer is computed with the same solver as the playground, and the picture is drawn without
// the answer. Checked in tests/scene-cases.mjs.
import { solveBeam, rectSection, bendingStress } from './beam.js';
import { tackle, connected } from './pulleys.js';
import { solveTruss } from './truss.js';
import { equilibrium, metacentric, bodyVolume, bodyHeight, gateForce, pressureAt, G } from './hydro.js';
import { params as vibParams, steady, magnification, transmissibility } from './vibration.js';
import { beamSnapshot } from './playground.js';
import { pulleySnapshot } from './playground-pulleys.js';
import { trussSnapshot } from './playground-truss.js';
import { fluidSnapshot } from './playground-fluid.js';
import { vibSnapshot } from './playground-vib.js';

export const SAVE_KEY = 'mh-pg-saved-v1';
export const MODE_NAME = { beam: 'קורות', pulley: 'גלגלות', truss: 'מסבכים', fluid: 'נוזלים', vib: 'רטט' };
const clone = (o) => JSON.parse(JSON.stringify(o));
const num = (n) => {
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n); if (a < 1e-9) return '0';
  const s = a >= 1000 ? n.toFixed(0) : a >= 100 ? n.toFixed(1) : a >= 10 ? n.toFixed(2) : n.toFixed(3);
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
};
// unit inside TeX: '·' and '²' must sit outside \text{}
const tu = (u) => `\\text{${String(u).replace(/·/g, '}\\cdot\\text{').replace(/²/g, '}^2\\text{').replace(/³/g, '}^3\\text{').replace(/%/g, '\\%')}}`;
const tx = (lhs, v, unit) => `${lhs}=${num(v)}${unit ? `\\ ${tu(unit)}` : ''}`;
// random factor and "nice" rounding (2 significant figures, or a step)
const factor = (rnd) => 0.5 + rnd() * 1.0;
const nice2 = (v) => Number(Number(v).toPrecision(2));
const step = (v, s) => Math.max(s, Math.round(v / s) * s);
const letter = (i) => (i < 26 ? String.fromCharCode(65 + i) : `J${i + 1}`);
const SUP = { pin: 'בסמך הנייח', roller: 'בגלגלת', fixed: 'בריתום' };

// ------------------------------------------------------------------ per-mode definitions
const MODES = {
  beam: {
    valid: (sc) => solveBeam({ L: sc.L, EI: rectSection(sc.b, sc.h, sc.E).EI, supports: sc.supports, loads: sc.loads }).status !== 'mechanism',
    targets(sc) {
      const r = solveBeam({ L: sc.L, EI: rectSection(sc.b, sc.h, sc.E).EI, supports: sc.supports, loads: sc.loads });
      const at = (x) => (x < 1e-9 ? 'בקצה השמאלי' : Math.abs(x - sc.L) < 1e-9 ? 'בקצה הימני' : `במרחק ${num(x)} m מהקצה השמאלי`);
      const list = sc.supports.map((s) => ({ key: `R${s.id}`, label: `התגובה האנכית ${SUP[s.type]} ${at(s.x)}` }));
      sc.supports.filter((s) => s.type === 'fixed').forEach((s) => list.push({ key: `M${s.id}`, label: `מומנט התגובה בריתום ${at(s.x)}` }));
      if (r.Mpos > 1e-6) list.push({ key: 'Mpos', label: 'מומנט הכפיפה החיובי המרבי' });
      if (r.Mneg < -1e-6) list.push({ key: 'Mneg', label: 'מומנט הכפיפה השלילי המרבי' });
      list.push({ key: 'Vmax', label: 'כוח הגזירה המרבי |V|' }, { key: 'sigma', label: 'מאמץ הכפיפה המרבי' }, { key: 'dmax', label: 'השקיעה המרבית' });
      return list;
    },
    randomize(sc, rnd) {
      const out = clone(sc), f = factor(rnd);
      out.loads.forEach((l) => {
        if (l.type === 'point') l.P = step(l.P * factor(rnd), 0.5);
        else if (l.type === 'moment') l.M = Math.sign(l.M || 1) * step(Math.abs(l.M) * factor(rnd), 0.5);
        else { const g = factor(rnd); l.w1 = l.w1 ? step(l.w1 * g, 0.5) : 0; l.w2 = l.w2 ? step(l.w2 * g, 0.5) : 0; }
      });
      out.h = step(sc.h * (0.75 + 0.5 * rnd()), 10); out.b = step(sc.b * (0.75 + 0.5 * rnd()), 10); void f;
      return out;
    },
    answer(sc, key) {
      const { I, EI } = rectSection(sc.b, sc.h, sc.E), r = solveBeam({ L: sc.L, EI, supports: sc.supports, loads: sc.loads });
      const sum = r.degree > 0 ? `\\text{statically indeterminate: } EI\\ \\text{used}` : '\\Sigma F_y=0,\\quad \\Sigma M=0';
      if (key[0] === 'R' || (key[0] === 'M' && /^M\d/.test(key))) {
        const i = sc.supports.findIndex((s) => `R${s.id}` === key || `M${s.id}` === key), q = r.reactions[i];
        return key[0] === 'R' ? { value: q.Ry, unit: 'kN', steps: [sum, tx('R_y', q.Ry, 'kN')] } : { value: q.M, unit: 'kN·m', steps: [sum, tx('M_R', q.M, 'kN·m')] };
      }
      if (key === 'Mpos') return { value: r.Mpos, unit: 'kN·m', steps: ['M(x)=\\Sigma F_i(x-x_i)-\\Sigma M_i', tx('M_{max}^{+}', r.Mpos, 'kN·m')] };
      if (key === 'Mneg') return { value: r.Mneg, unit: 'kN·m', steps: ['M(x)=\\Sigma F_i(x-x_i)-\\Sigma M_i', tx('M_{max}^{-}', r.Mneg, 'kN·m')] };
      if (key === 'Vmax') return { value: Math.abs(r.Vmax.V), unit: 'kN', steps: ['V(x)=\\Sigma F_{y,\\text{left}}', tx('|V|_{max}', Math.abs(r.Vmax.V), 'kN')] };
      const Mabs = Math.max(r.Mpos, -r.Mneg);
      if (key === 'sigma') { const s = bendingStress(Mabs, sc.h, I); return { value: s, unit: 'MPa', steps: [`I=\\frac{bh^3}{12}=${num(I / 1e4)}\\ \\text{cm}^4`, `\\sigma=\\frac{M c}{I}=\\frac{${num(Mabs)}\\cdot 10^6\\cdot ${num(sc.h / 2)}}{${num(I)}}`, tx('\\sigma_{max}', s, 'MPa')] }; }
      const d = Math.abs(r.dmax.v) * 1000;
      return { value: d, unit: 'mm', steps: [`EI=${num(EI)}\\ \\text{kN}\\cdot\\text{m}^2`, tx('\\delta_{max}', d, 'mm')] };
    },
    text(sc, key) {
      const sec = ['sigma', 'dmax'].includes(key) ? ` חתך מלבני ${num(sc.b)}×${num(sc.h)} mm, E = ${num(sc.E)} GPa.` : '';
      const lab = this.targets(sc).find((x) => x.key === key)?.label || '';
      return `קורה באורך ${num(sc.L)} m עם הסמכים והעומסים שבשרטוט.${sec} מה ${lab}?${key[0] === 'R' ? ' (כלפי מעלה חיובי)' : key === 'Mneg' ? ' (ערך שלילי)' : /^M\d/.test(key) ? ' (נגד כיוון השעון חיובי)' : ''}`;
    },
    svg: (sc) => beamSnapshot(sc),
  },
  pulley: {
    valid: (sc) => (sc.sub === 'hoist' ? true : true),
    targets(sc) {
      if (sc.sub === 'hoist') return [{ key: 'F', label: 'כוח המשיכה F' }, { key: 'ceiling', label: 'הכוח על התקרה' }, { key: 'MA', label: 'היתרון המכני MA' }];
      const r = connected(sc.conn), list = [{ key: 'a', label: 'גודל התאוצה' }];
      if (r.moving || r.unique) { if (sc.conn.mp > 0) list.push({ key: 'TL', label: 'המתיחות בצד שמאל' }, { key: 'TR', label: 'המתיחות בצד ימין' }); else list.push({ key: 'TL', label: 'המתיחות בחבל' }); }
      return list;
    },
    randomize(sc, rnd) {
      const out = clone(sc);
      if (out.sub === 'hoist') { const h = out.hoist; h.m = nice2(h.m * factor(rnd)); h.mb = h.mb ? nice2(h.mb * factor(rnd)) : 0; h.eta = [0.9, 0.92, 0.95, 0.97, 1][Math.floor(rnd() * 5)]; h.p = 0; }
      else { const c = out.conn; c.left.m = nice2(c.left.m * factor(rnd)); c.right.m = nice2(c.right.m * factor(rnd)); if (c.mp) c.mp = nice2(c.mp * factor(rnd)); }
      return out;
    },
    answer(sc, key) {
      if (sc.sub === 'hoist') {
        const h = sc.hoist, r = tackle({ n: h.n, m: h.m, mb: h.mb, eta: h.eta, pull: h.pull, dir: h.dir });
        const base = [`W=(m+m_b)g=${num(r.W)}\\ \\text{N}`, h.eta < 1 ? `F=\\frac{W}{\\sum \\eta^k}` : `F=\\frac{W}{n}`];
        if (key === 'F') return { value: r.F, unit: 'N', steps: [...base, tx('F', r.F, 'N')] };
        if (key === 'ceiling') return { value: r.ceiling, unit: 'N', steps: [...base, h.pull === 'down' ? 'F_{ceiling}=W+F' : 'F_{ceiling}=W-F', tx('F_{ceiling}', r.ceiling, 'N')] };
        return { value: r.MA, unit: '', steps: [...base, `MA=\\frac{W}{F}=${num(r.MA)}`] };
      }
      const r = connected(sc.conn);
      if (key === 'a') return { value: Math.abs(r.a), unit: 'm/s²', steps: [r.moving ? 'a=\\frac{F_{drive}-F_k}{m_1+m_2+m_p/2}' : '|F_{drive}|\\le F_{s,max}\\Rightarrow a=0', tx('a', Math.abs(r.a), 'm/s²')] };
      const T = key === 'TL' ? r.TL : r.TR;
      return { value: T, unit: 'N', steps: [r.moving ? '\\text{Newton for each body}' : '\\text{equilibrium}', tx('T', T, 'N')] };
    },
    text(sc, key) {
      if (sc.sub === 'hoist') {
        const h = sc.hoist;
        return `מערכת גלגלות עם ${h.n} קטעי חבל שנושאים את המשא, ${h.pull === 'down' ? 'משיכה כלפי מטה דרך גלגלת קבועה' : 'משיכה כלפי מעלה מהבלוק הנע'}, ${h.dir === 'lift' ? 'בהרמה' : 'בהורדה'} במהירות קבועה. מסת המשא ${num(h.m)} kg, מסת הבלוק הנע ${num(h.mb)} kg, יעילות כל גלגלת η = ${h.eta}. מה ${{ F: 'כוח המשיכה F', ceiling: 'הכוח על התקרה', MA: 'היתרון המכני MA = W/F' }[key]}?`;
      }
      const c = sc.conn, side = (s) => `גוף של ${num(s.m)} kg ${s.kind === 'hang' ? 'תלוי' : s.kind === 'table' ? 'על שולחן' : `על מדרון בזווית ${num(s.theta)}°`}${s.kind !== 'hang' ? ` (μs = ${s.mus}, μk = ${s.muk})` : ''}`;
      return `שני גופים מחוברים בחבל דרך גלגלת. משמאל: ${side(c.left)}. מימין: ${side(c.right)}. ${c.mp ? `הגלגלת היא דיסקה של ${num(c.mp)} kg.` : 'הגלגלת חסרת מסה.'} המערכת משוחררת ממנוחה, g = 9.81. מה ${{ a: 'גודל התאוצה', TL: c.mp ? 'המתיחות בצד שמאל' : 'המתיחות בחבל', TR: 'המתיחות בצד ימין' }[key]}?`;
    },
    svg: (sc) => pulleySnapshot(sc),
  },
  truss: {
    valid: (sc) => solveTruss(sc).status !== 'mechanism',
    targets(sc) {
      const name = (id) => letter(sc.joints.findIndex((j) => j.id === id));
      const list = sc.members.map((m) => ({ key: `N${m.id}`, label: `הכוח במוט ${name(m.a)}${name(m.b)}` }));
      sc.joints.filter((j) => j.sup).forEach((j) => { list.push({ key: `Ry${j.id}`, label: `התגובה האנכית בצומת ${name(j.id)}` }); if (j.sup === 'pin') list.push({ key: `Rx${j.id}`, label: `התגובה האופקית בצומת ${name(j.id)}` }); });
      return list;
    },
    randomize(sc, rnd) { const out = clone(sc); out.loads.forEach((l) => (l.P = step(l.P * factor(rnd), 0.5))); return out; },
    answer(sc, key) {
      const r = solveTruss(sc);
      if (key[0] === 'N') { const f = r.forces.find((q) => `N${q.id}` === key); return { value: f.N, unit: 'kN', steps: ['\\Sigma F_x=0,\\ \\Sigma F_y=0\\ \\text{at each joint}', tx('N', f.N, 'kN'), f.N > 0 ? '\\text{tension}' : f.N < 0 ? '\\text{compression}' : '\\text{zero-force member}'] }; }
      const jid = Number(key.slice(2)), q = r.reactions.find((x) => x.id === jid), v = key[1] === 'y' ? q.Ry : q.Rx;
      return { value: v, unit: 'kN', steps: ['\\Sigma F_x=0,\\ \\Sigma F_y=0,\\ \\Sigma M=0', tx(key[1] === 'y' ? 'R_y' : 'R_x', v, 'kN')] };
    },
    text(sc, key) {
      const lab = this.targets(sc).find((x) => x.key === key)?.label || '';
      return `מסבך עם הסמכים והעומסים שבשרטוט (צמתים מפרקיים, מוטות חסרי משקל). מה ${lab}?${key[0] === 'N' ? ' (מתיחה חיובי, לחיצה שלילי)' : key[1] === 'y' ? ' (כלפי מעלה חיובי)' : ' (ימינה חיובי)'}`;
    },
    svg: (sc) => trussSnapshot(sc),
  },
  fluid: {
    body: (b) => ({ shape: b.shape, a: b.a / 100, b: b.b / 100, h: b.h / 100, r: b.r / 100, rho: b.rho }),
    valid(sc, key) { if (sc.sub !== 'buoy' || !key) return true; const e = equilibrium(this.body(sc.buoy), sc.buoy.rhoF, sc.buoy.D); return ['sub', 'draft', 'GM'].includes(key) ? e.state === 'float' : key === 'N' ? e.state === 'bottom' : true; },
    targets(sc) {
      if (sc.sub === 'buoy') {
        const b = sc.buoy, e = equilibrium(this.body(b), b.rhoF, b.D), list = [];
        if (e.state === 'float') { list.push({ key: 'sub', label: 'אחוז הנפח השקוע' }); if (b.shape !== 'sphere') list.push({ key: 'draft', label: 'עומק השקיעה' }, { key: 'GM', label: 'הגובה המטאצנטרי GM' }); }
        if (e.state === 'bottom') list.push({ key: 'N', label: 'הכוח שהקרקעית מפעילה' });
        list.push({ key: 'Fbmax', label: 'כוח העילוי כשהגוף שקוע כולו' });
        return list;
      }
      return [{ key: 'F', label: 'הכוח השקול על השער' }, { key: 'zcp', label: 'עומק מרכז הלחץ' }, { key: 'p', label: 'לחץ המד בנקודה המסומנת' }, { key: 'pb', label: 'לחץ המד בקרקעית' }];
    },
    randomize(sc, rnd) {
      const out = clone(sc);
      if (out.sub === 'buoy') {
        const b = out.buoy, k = (v, lim) => Math.min(lim, Math.max(2, Math.round(v * (0.8 + 0.45 * rnd()))));
        b.a = k(b.a, 50); b.b = k(b.b, 50); b.h = k(b.h, 50); b.r = k(b.r, 25); b.rho = nice2(b.rho * (0.8 + 0.4 * rnd()));
      } else {
        const p = out.pres, sn = Math.sin((p.theta * Math.PI) / 180);
        p.D = Math.min(p.Ht, Math.max(Math.round((p.u2 * sn + 0.3) * 10) / 10, Math.round(p.Ht * (0.55 + 0.45 * rnd()) * 10) / 10));
        p.b = nice2(p.b * factor(rnd)); p.pz = Math.min(p.D, Math.round(p.D * (0.2 + 0.6 * rnd()) * 10) / 10);
        if (p.top) p.t = Math.min(p.D, Math.round(p.t * factor(rnd) * 10) / 10);
      }
      return out;
    },
    answer(sc, key) {
      if (sc.sub === 'buoy') {
        const b = sc.buoy, bd = this.body(b), e = equilibrium(bd, b.rhoF, b.D), V = bodyVolume(bd);
        if (key === 'sub') { const v = (100 * b.rho) / b.rhoF; return { value: v, unit: '%', steps: ['F_b=W\\Rightarrow \\rho_f V_{sub}=\\rho_o V', `\\frac{V_{sub}}{V}=\\frac{\\rho_o}{\\rho_f}=\\frac{${num(b.rho)}}{${num(b.rhoF)}}`, tx('V_{sub}/V', v, '%')] }; }
        if (key === 'draft') { const v = e.s * 100; return { value: v, unit: 'cm', steps: ['d=h\\frac{\\rho_o}{\\rho_f}', tx('d', v, 'cm')] }; }
        if (key === 'GM') { const m = metacentric(bd, e.s); return { value: m.GM * 100, unit: 'cm', steps: ['GM=KB+BM-KG,\\quad BM=I/V_{sub}', `KB=${num(m.KB * 100)},\\ BM=${num(m.BM * 100)},\\ KG=${num(m.KG * 100)}\\ \\text{cm}`, tx('GM', m.GM * 100, 'cm')] }; }
        if (key === 'N') return { value: e.N, unit: 'N', steps: ['N=W-F_b=(\\rho_o-\\rho_f)gV', tx('N', e.N, 'N')] };
        const F = b.rhoF * G * V; return { value: F, unit: 'N', steps: [`V=${num(V * 1e6)}\\ \\text{cm}^3`, 'F_b=\\rho_f g V', tx('F_b', F, 'N')] };
      }
      const p = sc.pres, layers = { rho1: p.top ? p.rho1 : 0, t: p.top ? p.t : 0, rho2: p.rho2 };
      const r = gateForce({ D: p.D, theta: p.theta, u1: p.u1, u2: p.u2, b: p.b, layers });
      if (key === 'F') return { value: r.F / 1000, unit: 'kN', steps: [p.top ? 'F=b\\int p\\,du' : 'F=\\rho g h_c A', tx('F', r.F / 1000, 'kN')] };
      if (key === 'zcp') return { value: r.zcp, unit: 'm', steps: [p.top ? 'u_{cp}=\\frac{\\int p\\,u\\,du}{\\int p\\,du}' : 'y_{cp}=y_c+\\frac{I_{xc}}{y_c A}', tx('z_{cp}', r.zcp, 'm')] };
      const z = key === 'p' ? p.pz : p.D, v = pressureAt(z, layers) / 1000;
      return { value: v, unit: 'kPa', steps: [p.top && z > p.t ? 'p=\\rho_1 g t+\\rho_2 g (z-t)' : 'p=\\rho g z', tx('p', v, 'kPa')] };
    },
    text(sc, key) {
      if (sc.sub === 'buoy') {
        const b = sc.buoy, dims = b.shape === 'box' ? `תיבה ${b.a}×${b.b}×${b.h} cm (גובה ${b.h} cm)` : b.shape === 'cyl' ? `גליל עומד ברדיוס ${b.r} cm וגובה ${b.h} cm` : `כדור ברדיוס ${b.r} cm`;
        return `${dims}, בצפיפות ${num(b.rho)} kg/m³, מונח בנוזל בצפיפות ${num(b.rhoF)} kg/m³ (עומק הנוזל ${num(b.D)} m), g = 9.81. מה ${{ sub: 'אחוז הנפח השקוע בשיווי משקל', draft: 'עומק השקיעה בשיווי משקל', GM: 'הגובה המטאצנטרי GM', N: 'הכוח שהקרקעית מפעילה על הגוף', Fbmax: 'כוח העילוי כשהגוף שקוע כולו' }[key]}?`;
      }
      const p = sc.pres;
      return `מכל עם נוזל בצפיפות ${num(p.rho2)} kg/m³${p.top ? `, ומעליו שכבה בעובי ${num(p.t)} m בצפיפות ${num(p.rho1)} kg/m³` : ''}. עומק הנוזל הכולל ${num(p.D)} m. בדופן בזווית ${num(p.theta)}° יש שער מלבני ברוחב ${num(p.b)} m, שמתחיל ${num(p.u1)} m ונגמר ${num(p.u2)} m לאורך הדופן מהפינה התחתונה. g = 9.81. מה ${{ F: 'הכוח השקול על השער (לחץ מד)', zcp: 'עומק מרכז הלחץ מתחת לפני הנוזל', p: `לחץ המד בנקודה המסומנת, בעומק ${num(p.pz)} m`, pb: 'לחץ המד בקרקעית' }[key]}?`;
    },
    svg: (sc, key) => fluidSnapshot(sc, { probe: key === 'p' }),
  },
  vib: {
    valid: (sc, key) => (['X', 'TR', 'M'].includes(key) ? sc.force : key === 'Td' ? vibParams(sc.m, sc.k, sc.c).type === 'under' : true),
    targets(sc) {
      const p = vibParams(sc.m, sc.k, sc.c), list = [{ key: 'fn', label: 'התדר הטבעי fn' }, { key: 'zeta', label: 'יחס הריסון ζ' }];
      if (p.type === 'under') list.push({ key: 'Td', label: 'זמן המחזור המרוסן Td' });
      if (sc.force) list.push({ key: 'X', label: 'משרעת התנודה במצב מתמיד' }, { key: 'TR', label: 'מקדם ההעברה TR' });
      return list;
    },
    randomize(sc, rnd) { const out = clone(sc); out.m = nice2(sc.m * factor(rnd)); out.k = nice2(sc.k * factor(rnd)); out.c = sc.c ? nice2(sc.c * factor(rnd)) : 0; if (sc.force) { out.F0 = nice2(sc.F0 * factor(rnd)); out.f = nice2(sc.f * factor(rnd)); } return out; },
    answer(sc, key) {
      const p = vibParams(sc.m, sc.k, sc.c);
      if (key === 'fn') return { value: p.fn, unit: 'Hz', steps: ['f_n=\\frac{1}{2\\pi}\\sqrt{k/m}', tx('f_n', p.fn, 'Hz')] };
      if (key === 'zeta') return { value: p.zeta, unit: '', steps: [`c_c=2\\sqrt{km}=${num(p.cc)}`, `\\zeta=\\frac{c}{c_c}=${num(p.zeta)}`] };
      if (key === 'Td') return { value: p.Td, unit: 's', steps: ['\\omega_d=\\omega_n\\sqrt{1-\\zeta^2}', tx('T_d', p.Td, 's')] };
      const w = 2 * Math.PI * sc.f, r = w / p.wn;
      if (key === 'X') { const X = steady(sc.F0, w, sc.m, sc.k, sc.c).X * 1000; return { value: X, unit: 'mm', steps: [`r=\\omega/\\omega_n=${num(r)}`, `M=\\frac{1}{\\sqrt{(1-r^2)^2+(2\\zeta r)^2}}=${num(magnification(r, p.zeta))}`, `X=\\frac{F_0}{k}M`, tx('X', X, 'mm')] }; }
      const T = transmissibility(r, p.zeta); return { value: T, unit: '', steps: [`r=${num(r)},\\ \\zeta=${num(p.zeta)}`, `TR=\\frac{\\sqrt{1+(2\\zeta r)^2}}{\\sqrt{(1-r^2)^2+(2\\zeta r)^2}}=${num(T)}`] };
    },
    text(sc, key) {
      return `מסה של ${num(sc.m)} kg תלויה על קפיץ עם k = ${num(sc.k)} N/m ומרסן עם c = ${num(sc.c)} N·s/m${sc.force ? `, ופועל עליה כוח מחזורי במשרעת ${num(sc.F0)} N ובתדר ${num(sc.f)} Hz` : ''}. מה ${{ fn: 'התדר הטבעי fn', zeta: 'יחס הריסון ζ', Td: 'זמן המחזור המרוסן Td', X: 'משרעת התנודה במצב מתמיד', TR: 'מקדם ההעברה TR (הכוח שעובר לתקרה חלקי F₀)' }[key]}?`;
    },
    svg: (sc) => vibSnapshot(sc),
  },
};

const HINTS = {
  beam: 'התחל מ-ΣM = 0 סביב אחד הסמכים כדי למצוא את התגובה בסמך השני, ואז ΣFy = 0. עומס מפורס = שקול באמצע שלו (או בשליש, אם הוא משולש).',
  pulley: 'כתוב שיווי משקל או חוק ניוטון לכל גוף בנפרד. בגלגלות עם חיכוך: המתיחות מוכפלת ב-η בכל מעבר על גלגלת.',
  truss: 'מצא קודם את התגובות מהמסבך כולו, ואז שיטת הצמתים (צומת עם שני נעלמים לכל היותר) או שיטת החתכים.',
  fluid: 'ציפה: Fb = ρ_f g V_sub. לחץ: p = ρ g h, וכוח על שער שקוע F = ρ g h_c A.',
  vib: 'ωn = √(k/m), ζ = c/(2√(km)), r = ω/ωn.',
};
export const targetsFor = (mode, scene) => MODES[mode].targets(scene);
export const canSave = (mode, scene) => !!MODES[mode] && MODES[mode].valid(scene) !== false && MODES[mode].targets(scene).length > 0;

// build one question from a saved entry; rnd is injectable for tests
export function makeSceneQuestion(saved, rnd = Math.random) {
  const M = MODES[saved.mode];
  let sc = saved.scene;
  for (let i = 0; i < 30; i++) { // re-draw until the asked quantity still exists (e.g. the body still floats)
    const cand = M.randomize(saved.scene, rnd);
    if (M.valid(cand, saved.target) !== false && M.targets(cand).some((x) => x.key === saved.target)) { sc = cand; break; }
  }
  const a = M.answer(sc, saved.target);
  return {
    id: `pgq-${saved.id}`, type: 'numeric', difficulty: 2, sub: 'pg-mine',
    q: M.text(sc, saved.target), hint: HINTS[saved.mode], answer: a.value, unit: a.unit, tol: 0.02, steps: a.steps,
    svg: M.svg(sc, saved.target), source: `מגרש המשחקים (${MODE_NAME[saved.mode]}), שאלה ששמרת: ${saved.name}`, scene: sc,
  };
}
export const answerFor = (mode, scene, key) => MODES[mode].answer(scene, key);

// ------------------------------------------------------------------ storage of saved questions
export function loadSaved() { try { const a = JSON.parse(localStorage.getItem(SAVE_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
export function storeSaved(list) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
export function addSaved(mode, scene, target, name) {
  const list = loadSaved(), id = Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  list.unshift({ id, mode, scene: clone(scene), target, name, created: new Date().toISOString().slice(0, 10) });
  return storeSaved(list) ? id : null;
}
export function removeSaved(id) { storeSaved(loadSaved().filter((q) => q.id !== id)); }
