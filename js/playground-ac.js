// playground-ac.js: the playground's AC mode. A sine source on an R / L / C load: RMS vs peak, impedance,
// a live phasor diagram, the power triangle (P, Q, S) and power factor correction with a capacitor.
// Math: js/circuit.js (acLoad, zR/zL/zC, pfCapacitor), checked in tests/ac-cases.mjs.
import { GRID, acLoad, zR, zL, zC, zSeries, zParallel, pfCapacitor, cabs, carg, cdiv, cx, polar } from './circuit.js';
import { esc } from './text.js';
import { ltr, si, num, slider, chips, plot, phasors, text, arrow, COL, SAFETY } from './elec-ui.js';

const KEY = 'mh-pg-ac-v1';
const LOADS = [['r', 'R'], ['l', 'L'], ['c', 'C'], ['rl', 'R+L'], ['rc', 'R+C'], ['rlc', 'R+L+C']];
const PRESETS = [
  { id: 'heater', name: 'תנור (R)', set: { load: 'r', R: 26, Cpf: 0 } },
  { id: 'motor', name: 'מנוע (R+L)', set: { load: 'rl', R: 20, L: 50, Cpf: 0 } },
  { id: 'rlc', name: 'תהודה (R+L+C)', set: { load: 'rlc', R: 10, L: 100, C: 101, Cpf: 0 } },
];
const LIM = { V: [1, 400], f: [10, 400], R: [1, 200], L: [1, 500], C: [1, 1000], Cpf: [0, 800], pfT: [0.8, 1] };
const defaults = () => ({ V: GRID.V, f: GRID.f, load: 'rl', R: 20, L: 50, C: 200, Cpf: 0, pfT: 0.95 });
let st = null;
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') for (const k of Object.keys(st)) if (k === 'load' ? LOADS.some(([v]) => v === s[k]) : Number.isFinite(s[k])) st[k] = s[k]; } catch (e) { /* ignore */ }
  for (const [k, [a, b]] of Object.entries(LIM)) st[k] = Math.min(b, Math.max(a, st[k]));
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };

// everything about the present circuit (RMS phasors, V on the real axis)
function calc() {
  const parts = [];
  if (st.load.includes('r')) parts.push(zR(st.R));
  if (st.load.includes('l')) parts.push(zL(st.L / 1000, st.f));
  if (st.load.includes('c')) parts.push(zC(st.C * 1e-6, st.f));
  const Z = zSeries(...parts), ld = acLoad(st.V, Z), V = cx(st.V), I = cdiv(V, Z);
  const Ic = st.Cpf > 0 ? cdiv(V, zC(st.Cpf * 1e-6, st.f)) : cx(0), Iline = cx(I.re + Ic.re, I.im + Ic.im);
  const Zt = st.Cpf > 0 ? zParallel(Z, zC(st.Cpf * 1e-6, st.f)) : Z, tot = acLoad(st.V, Zt);
  return { Z, ld, V, I, Ic, Iline, tot, XL: 2 * Math.PI * st.f * st.L / 1000, XC: 1 / (2 * Math.PI * st.f * st.C * 1e-6) };
}

function waves(c, th) {
  const n = 160, T = 1 / st.f, xs = [], v = [], i = [], il = [], w = 2 * Math.PI * st.f;
  const Ia = cabs(c.I) * Math.SQRT2, ph = (carg(c.I) * Math.PI) / 180, Ila = cabs(c.Iline) * Math.SQRT2, phl = (carg(c.Iline) * Math.PI) / 180;
  for (let k = 0; k <= n; k++) { const t = (2 * T * k) / n; xs.push(t * 1000); v.push(st.V * Math.SQRT2 * Math.sin(w * t)); i.push(Ia * Math.sin(w * t + ph)); il.push(Ila * Math.sin(w * t + phl)); }
  const series = [{ ys: v, col: COL.v, label: 'v' }, { ys: i, col: COL.i, label: 'i', axis: 'r' }];
  if (st.Cpf > 0) series.push({ ys: il, col: COL.p, label: 'i+iC', axis: 'r', dash: '5 3' });
  const tc = (((th % 720) + 720) % 720) / 360 * T * 1000;
  return plot({ xs, series, units: { x: 'ms', l: 'V', r: 'A' }, cursor: tc, sym: true, rzoom: 1.4, marks: [{ x: (T * 1000) / 4, label: `Vp=${num(st.V * Math.SQRT2, 0)}` }] });
}
function phasorSvg(c, th) {
  const items = [{ z: c.V, col: COL.v, label: 'V', group: 'v' }, { z: c.I, col: COL.i, label: 'I', group: 'i' }];
  if (st.Cpf > 0) items.push({ z: c.Ic, col: COL.q, label: 'IC', group: 'i', from: c.I, w: 1.8 }, { z: c.Iline, col: COL.p, label: 'I+IC', group: 'i' });
  return phasors(items, { rot: th, H: 210, R: 84, gscale: { i: 0.7 } });
}
function triangleSvg(c) {
  const W = 360, H = 190, P = c.ld.P, Q = c.ld.Q, Q2 = c.tot.Q, big = Math.max(Math.abs(P), Math.abs(Q), Math.abs(Q2), 1);
  const k = Math.min(250 / big, 70 / Math.max(Math.abs(Q), Math.abs(Q2), 1e-9)), x0 = 50, y0 = 100, X = x0 + P * k;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="משולש הספקים">`;
  s += `<line x1="${x0}" y1="${y0}" x2="${W - 10}" y2="${y0}" class="pg-ruler"/>`;
  s += arrow(x0, y0, X, y0, COL.p, 3) + text((x0 + X) / 2, y0 + 16, `P = ${si(P, 'W')}`, COL.p, 'middle', 'pg-b');
  s += arrow(X, y0, X, y0 - Q * k, COL.q, 3) + text(X + 6, y0 - Q * k + (Q >= 0 ? 10 : -2), `Q = ${si(Q, 'var')}`, COL.q, 'start', 'pg-b');
  s += arrow(x0, y0, X, y0 - Q * k, COL.s, 3) + text((x0 + X) / 2 - 8, y0 - (Q * k) / 2 - 8, `S = ${si(c.ld.S, 'VA')}`, COL.s, 'end', 'pg-b');
  if (Math.abs(Q) > 1e-9) s += text(x0 + 26, y0 + (Q > 0 ? -5 : 13), `φ=${num(c.ld.phi, 1)}°`, '', 'start', 'pg-tn');
  if (st.Cpf > 0) s += `<line x1="${x0}" y1="${y0}" x2="${X}" y2="${y0 - Q2 * k}" stroke="${COL.s}" stroke-width="2" stroke-dasharray="5 3"/><line x1="${X}" y1="${y0 - Q * k}" x2="${X}" y2="${y0 - Q2 * k}" stroke="${COL.q}" stroke-width="5" opacity=".35"/>` + text(X + 6, y0 - Q2 * k + 4, `S' = ${si(c.tot.S, 'VA')}`, COL.s, 'start', 'pg-tn');
  return s + '</svg>';
}

export function renderAC(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>〜 זרם חילופין</h2><p class="small muted">מקור סינוס על עומס של נגד, סליל או קבל. רואים את הגלים, את הפאזורים מסתובבים, ואת משולש ההספקים.</p>
      <div class="pg-templates">${PRESETS.map((p) => `<button class="chip" data-preset="${p.id}">${esc(p.name)}</button>`).join('')}</div></div>
    <div class="card pg-stage"><h3 class="pg-h">גלים בזמן</h3><div id="acWave"></div><h3 class="pg-h">פאזורים</h3><div id="acPh"></div>
      <p class="small muted pg-hint">הפאזורים מסתובבים נגד כיוון השעון ב-${ltr('ω = 2πf')}. הערך הרגעי הוא ההיטל שלהם על הציר האנכי, והקו האנכי בגרף מראה את אותו רגע (בהילוך איטי).</p>
      <div class="chips"><button class="chip" data-act="play" id="acPlay">⏸ עצור</button></div></div>
    <div class="card" id="acEd"></div>
    <div class="card" id="acRes"></div>`;
  const wv = root.querySelector('#acWave'), ph = root.querySelector('#acPh'), ed = root.querySelector('#acEd'), out = root.querySelector('#acRes');
  let th = 30, playing = true, raf = 0, last = 0;
  const editor = () => `<h3 class="pg-h">המקור</h3>
      ${slider('V', 'מתח (RMS)', ltr(`${num(st.V, 0)} V`), LIM.V, 1, st.V)}${slider('f', 'תדר', ltr(`${num(st.f, 0)} Hz`), LIM.f, 1, st.f)}
      <p class="small muted">ברשת בישראל: ${ltr('230 V, 50 Hz')} (מקור: ${ltr(GRID.src)}).</p>
      <h3 class="pg-h">העומס (בטור)</h3>${chips(LOADS, st.load, 'load')}
      ${st.load.includes('r') ? slider('R', 'R', ltr(`${num(st.R, 0)} Ω`), LIM.R, 1, st.R) : ''}${st.load.includes('l') ? slider('L', 'L', ltr(`${num(st.L, 0)} mH`), LIM.L, 1, st.L) : ''}${st.load.includes('c') ? slider('C', 'C', ltr(`${num(st.C, 0)} µF`), LIM.C, 1, st.C) : ''}
      <h3 class="pg-h">תיקון מקדם הספק</h3>${slider('Cpf', 'קבל במקביל לעומס', ltr(`${num(st.Cpf, 0)} µF`), LIM.Cpf, 1, st.Cpf)}
      ${slider('pfT', 'יעד', ltr(num(st.pfT, 2)), LIM.pfT, 0.01, st.pfT)}<div class="chips"><button class="chip" data-act="calc">🧮 חשב את הקבל ליעד</button><button class="chip" data-act="nocap">בלי קבל</button></div>`;
  function results() {
    const c = calc(), ind = c.ld.phi > 0.05, cap = c.ld.phi < -0.05;
    return `<h3 class="pg-h">ערכי שיא ו-RMS</h3>
      <div class="pg-max"><div><span>מתח שיא</span><b>${ltr(`Vp = ${num(st.V * Math.SQRT2, 1)} V`)}</b></div><div><span>מתח RMS</span><b>${ltr(`${num(st.V, 1)} V = Vp/√2`)}</b></div></div>
      <p class="small">RMS הוא הערך ש"מחמם" כמו מתח ישר באותו גודל: נורה על ${ltr(`${num(st.V, 0)} V`)} חילופין מאירה כמו על ${ltr(`${num(st.V, 0)} V`)} ישר. המולטימטר במצב V~ מראה RMS.</p>
      <h3 class="pg-h">עכבה</h3>
      <div class="pg-max">${st.load.includes('l') ? `<div><span>סליל</span><b>${ltr(`XL = 2πfL = ${si(c.XL, 'Ω')}`)}</b></div>` : ''}${st.load.includes('c') ? `<div><span>קבל</span><b>${ltr(`XC = 1/(2πfC) = ${si(c.XC, 'Ω')}`)}</b></div>` : ''}<div><span>עכבה כוללת</span><b>${ltr(`|Z| = ${si(cabs(c.Z), 'Ω')}`)}</b></div><div><span>זווית</span><b>${ltr(`φ = ${num(c.ld.phi, 1)}°`)}</b><small class="muted">${ind ? 'הזרם מפגר אחרי המתח' : cap ? 'הזרם מקדים את המתח' : 'זרם ומתח באותה פאזה'}</small></div></div>
      <p class="small">${ltr('Z = R + j(XL − XC)')}. סליל מתנגד יותר בתדר גבוה, קבל פחות. העלה את התדר ותראה.${st.load === 'rlc' ? ` כאן ${ltr(`f0 = 1/(2π√(LC)) = ${num(1 / (2 * Math.PI * Math.sqrt((st.L / 1000) * st.C * 1e-6)), 1)} Hz`)}: בתדר הזה ${ltr('XL = XC')} והם מבטלים זה את זה. עוד במצב ⏱ מעברים.` : ''}</p>
      <h3 class="pg-h">הספקים</h3><div id="acTri">${triangleSvg(c)}</div><p class="small muted">${ltr('Q')} למעלה: עומס השראי, הזרם מפגר. למטה: קיבולי, הזרם מקדים.${st.Cpf > 0 ? ` הקו המקווקו ${ltr("S'")} הוא אחרי התיקון.` : ''}</p>
      <div class="pg-max"><div><span>זרם</span><b>${ltr(`I = ${si(c.ld.I, 'A')}`)}</b></div><div><span>הספק פעיל</span><b>${ltr(`P = VI·cosφ = ${si(c.ld.P, 'W')}`)}</b></div><div><span>הספק היגבי</span><b>${ltr(`Q = VI·sinφ = ${si(c.ld.Q, 'var')}`)}</b></div><div><span>הספק מדומה</span><b>${ltr(`S = VI = ${si(c.ld.S, 'VA')}`)}</b></div><div><span>מקדם הספק</span><b>${ltr(`cosφ = ${num(c.ld.pf, 3)}`)}</b></div>${st.Cpf > 0 ? `<div><span>אחרי הקבל</span><b>${ltr(`cosφ = ${num(c.tot.pf, 3)}, I = ${si(c.tot.I, 'A')}`)}</b></div>` : ''}</div>
      <p class="small">רק P עושה עבודה (חום, מומנט). Q הולך וחוזר בין המקור לשדה של הסליל או הקבל, אבל עדיין זורם בכבלים ומחמם אותם. לכן מקדם הספק נמוך פירושו זרם גדול יותר לאותו הספק פעיל.</p>
      <p class="small">התיקון: קבל במקביל לעומס השראי לוקח זרם שמקדים ב-90°, ומבטל חלק מהזרם ההיגבי של הסליל. העומס עצמו לא משתנה, אבל הזרם בקו יורד. הקבל הדרוש: ${ltr(`C = P(tanφ1 − tanφ2)/(ωV²)${ind ? ` = ${si(pfCapacitor(c.ld.P, st.V, st.f, c.ld.pf, st.pfT), 'F')}` : ''}`)}${ind ? ` ליעד ${ltr(num(st.pfT, 2))}` : ''}.</p>
      ${SAFETY}`;
  }
  const draw = () => { const c = calc(); wv.innerHTML = waves(c, th); ph.innerHTML = phasorSvg(c, th); };
  const refresh = (full = true) => {
    draw(); out.innerHTML = results();
    if (full) ed.innerHTML = editor();
    else { const tmp = document.createElement('div'); tmp.innerHTML = editor(); const nb = tmp.querySelectorAll('.pg-range b'); ed.querySelectorAll('.pg-range b').forEach((b, i) => { if (nb[i]) b.innerHTML = nb[i].innerHTML; }); }
  };
  refresh();
  const tick = (now) => {
    if (!root.isConnected) return;
    if (playing && last) { th = (th + ((now - last) / 1000) * 120) % 720; draw(); }
    last = now; raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  root.addEventListener('click', (ev) => {
    const pr = ev.target.closest('[data-preset]');
    if (pr) { Object.assign(st, PRESETS.find((q) => q.id === pr.dataset.preset).set); save(); refresh(); return; }
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'play') { playing = !playing; b.textContent = playing ? '⏸ עצור' : '▶ הפעל'; return; }
    if (a === 'load') st.load = b.dataset.v;
    else if (a === 'nocap') st.Cpf = 0;
    else if (a === 'calc') { const c = calc(); if (!(c.ld.phi > 0.05) || c.ld.pf >= st.pfT) { st.Cpf = 0; } else st.Cpf = Math.min(LIM.Cpf[1], Math.round(pfCapacitor(c.ld.P, st.V, st.f, c.ld.pf, st.pfT) * 1e6)); }
    else return;
    save(); refresh();
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!f || !(f in LIM)) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    st[f] = Math.min(LIM[f][1], Math.max(LIM[f][0], v)); save(); refresh(false);
  });
  void polar;
  return () => cancelAnimationFrame(raf);
}
