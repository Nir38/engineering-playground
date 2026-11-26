// playground-3ph.js: the playground's three-phase mode. Three sine waves 120° apart, rotating phasors,
// why the line voltage is √3 of the phase voltage, star and delta loads, the neutral current, and what
// happens to an unbalanced star when the neutral is lost.
// Math: threePhase(), phaseV() in js/circuit.js (tests/ac-cases.mjs).
import { GRID, threePhase, phaseV, zR, cabs, carg, csub, polar } from './circuit.js';
import { ltr, si, num, slider, chips, plot, phasors, text, COL, SAFETY } from './elec-ui.js';

const KEY = 'mh-pg-3ph-v1';
const LIM = { Ra: [5, 500], Rb: [5, 500], Rc: [5, 500] };
const PH = ['L1', 'L2', 'L3'];
const defaults = () => ({ conn: 'star', neutral: true, Ra: 50, Rb: 50, Rc: 50 });
let st = null;
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') for (const k of Object.keys(st)) { if (k === 'conn' ? ['star', 'delta'].includes(s[k]) : k === 'neutral' ? typeof s[k] === 'boolean' : Number.isFinite(s[k])) st[k] = s[k]; } } catch (e) { /* ignore */ }
  for (const [k, [a, b]] of Object.entries(LIM)) st[k] = Math.min(b, Math.max(a, st[k]));
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
const V = GRID.V;
const calc = () => threePhase({ V, Z: [zR(st.Ra), zR(st.Rb), zR(st.Rc)], conn: st.conn, neutral: st.neutral });

function waves(th) {
  const n = 160, T = 1 / GRID.f, xs = [], ys = [[], [], []], vab = [], w = 2 * Math.PI * GRID.f;
  for (let k = 0; k <= n; k++) { const t = (2 * T * k) / n; xs.push(t * 1000); [0, -120, 120].forEach((p, j) => ys[j].push(V * Math.SQRT2 * Math.sin(w * t + (p * Math.PI) / 180))); vab.push(V * Math.SQRT2 * (Math.sin(w * t) - Math.sin(w * t - (2 * Math.PI) / 3))); }
  const tc = ((((th % 720) + 720) % 720) / 360) * T * 1000;
  return plot({ xs, series: [...ys.map((y, j) => ({ ys: y, col: COL.ph[j], label: PH[j] })), { ys: vab, col: 'var(--muted)', label: 'L1−L2', dash: '4 3', w: 1.4 }], units: { x: 'ms', l: 'V' }, sym: true, cursor: tc });
}
function phasorSvg(r, th) {
  const Vs = phaseV(V), items = Vs.map((z, j) => ({ z, col: COL.ph[j], label: PH[j], group: 'v' }));
  items.push({ z: csub(Vs[0], Vs[1]), from: Vs[1], col: 'var(--muted)', label: 'V12', group: 'v', w: 1.6, mid: true });
  if (!st.neutral && st.conn === 'star' && cabs(r.Vn) > 1) items.push({ z: r.Vn, col: 'var(--text)', label: 'N׳', group: 'v', w: 1.6 });
  return phasors(items, { rot: th, H: 220, R: 70 });
}
function currentSvg(r, th) {
  const items = r.Iline.map((z, j) => ({ z, col: COL.ph[j], label: `I${j + 1}`, group: 'i' }));
  if (st.conn === 'star' && st.neutral && cabs(r.In) > 1e-6) items.push({ z: r.In, col: 'var(--text)', label: 'IN', group: 'i' });
  return phasors(items, { rot: th, H: 180, R: 62 });
}
// the load connection
function loadSvg(r) {
  const W = 360, H = 200, ys = [40, 80, 120], res = (x1, y1, x2, y2, lab) => {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="pg-cw"/><g transform="translate(${mx} ${my}) rotate(${a.toFixed(1)})"><rect x="-14" y="-6" width="28" height="12" rx="2" class="pg-csym"/></g>` + text(mx + 10, my - 9, lab, '', 'start', 'pg-tn');
  };
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="חיבור העומס">`;
  ys.forEach((y, j) => { s += `<line x1="20" y1="${y}" x2="150" y2="${y}" stroke="${COL.ph[j]}" stroke-width="3"/>` + text(14, y + 4, PH[j], COL.ph[j], 'end', 'pg-b') + text(85, y - 5, si(cabs(r.Iline[j]), 'A'), COL.ph[j], 'middle', 'pg-tn'); });
  const R = [st.Ra, st.Rb, st.Rc];
  if (st.conn === 'star') {
    const c = [255, 120], tips = [[255, 40], [205, 165], [305, 165]];
    s += `<path d="M150,40 L255,40 M150,80 L180,80 L180,165 L205,165 M150,120 L170,120 L170,185 L330,185 L330,165 L305,165" fill="none" class="pg-cw"/>`;
    tips.forEach((p, j) => { s += res(p[0], p[1], c[0], c[1], `${R[j]}Ω`); });
    s += `<circle cx="${c[0]}" cy="${c[1]}" r="4" class="pg-cnode"/>`;
    s += `<line x1="20" y1="160" x2="${st.neutral ? 150 : 110}" y2="160" stroke="var(--muted)" stroke-width="3"/>` + text(14, 164, 'N', 'var(--muted)', 'end', 'pg-b');
    if (st.neutral) s += `<path d="M150,160 L150,145 L240,145 L255,120" fill="none" stroke="var(--muted)" stroke-width="2"/>` + text(85, 155, si(cabs(r.In), 'A'), 'var(--muted)', 'middle', 'pg-tn');
    else s += text(130, 164, '✂ אפס מנותק', 'var(--bad)', 'middle', 'pg-b');
  } else {
    const A = [255, 40], B = [200, 160], C = [310, 160];
    s += `<path d="M150,40 L255,40 M150,80 L175,80 L175,160 L200,160 M150,120 L165,120 L165,185 L335,185 L335,160 L310,160" fill="none" class="pg-cw"/>`;
    s += res(...A, ...B, `${R[0]}Ω`) + res(...B, ...C, `${R[1]}Ω`) + res(...C, ...A, `${R[2]}Ω`);
    for (const p of [A, B, C]) s += `<circle cx="${p[0]}" cy="${p[1]}" r="4" class="pg-cnode"/>`;
    s += text(20, 175, 'במשולש אין אפס', 'var(--muted)', 'start', 'pg-tn');
  }
  return s + '</svg>';
}

export function render3ph(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>⚡⚡⚡ תלת-פאזי</h2><p class="small muted">שלושה מתחים סינוסיים באותו גודל, מוזזים ב-120° זה מזה. בישראל ${ltr('230 V')} בין פאזה לאפס ו-${ltr('400 V')} בין פאזות, ${ltr('50 Hz')}, ארבעה מוליכים (3 פאזות ואפס). מקור: ${ltr(GRID.src)}.</p>
      ${chips([['star', 'כוכב (Y)'], ['delta', 'משולש (Δ)']], st.conn, 'conn')}</div>
    <div class="card pg-stage"><div id="t3Wave"></div><h3 class="pg-h">פאזורים של המתח</h3><div id="t3Ph"></div><h3 class="pg-h">העומס</h3><div id="t3Load"></div><h3 class="pg-h">פאזורים של הזרם בקווים</h3><div id="t3I"></div>
      <div class="chips"><button class="chip" data-act="play" id="t3Play">⏸ עצור</button></div></div>
    <div class="card" id="t3Ed"></div>
    <div class="card" id="t3Res"></div>`;
  const wv = root.querySelector('#t3Wave'), ph = root.querySelector('#t3Ph'), ld = root.querySelector('#t3Load'), ci = root.querySelector('#t3I'), ed = root.querySelector('#t3Ed'), out = root.querySelector('#t3Res');
  let th = 20, playing = true, raf = 0, last = 0;
  const editor = () => `<h3 class="pg-h">עומס בכל פאזה (נגד)</h3>${slider('Ra', 'L1', ltr(`${st.Ra} Ω`), LIM.Ra, 1, st.Ra)}${slider('Rb', 'L2', ltr(`${st.Rb} Ω`), LIM.Rb, 1, st.Rb)}${slider('Rc', 'L3', ltr(`${st.Rc} Ω`), LIM.Rc, 1, st.Rc)}
      <div class="chips"><button class="chip" data-act="bal">⚖ עומס מאוזן</button><button class="chip" data-act="unbal">עומס לא מאוזן</button>${st.conn === 'star' ? `<button class="chip" data-act="neutral" aria-pressed="${!st.neutral}">${st.neutral ? '✂ נתק את האפס' : '🔗 חבר את האפס'}</button>` : ''}</div>`;
  function results() {
    const r = calc(), VL = cabs(r.Vline[0]), bal = st.Ra === st.Rb && st.Rb === st.Rc, IL = cabs(r.Iline[0]);
    const over = r.Vload.map(cabs);
    return `<h3 class="pg-h">מתח בין פאזות</h3>
      <div class="pg-max"><div><span>מתח פאזה</span><b>${ltr(`Vph = ${V} V`)}</b></div><div><span>מתח קו (בין פאזות)</span><b>${ltr(`VL = √3·Vph = ${num(VL, 1)} V`)}</b><small class="muted">הערך הנקוב ${ltr('400 V')}</small></div></div>
      <p class="small">${ltr('V12 = V1 − V2')}. שני פאזורים באורך V עם 120° ביניהם: ההפרש ביניהם הוא בסיס של משולש שווה שוקיים עם זווית ראש 120°, ולכן ${ltr('|V1 − V2| = 2V·sin(60°) = √3·V')}. בגרף, הקו המקווקו הוא ${ltr('L1 − L2')}, גבוה פי ${ltr('√3 ≈ 1.73')} ומקדים ב-30°.</p>
      <h3 class="pg-h">זרמים והספק</h3>
      <div class="pg-max">${r.Iline.map((z, j) => `<div><span>זרם בקו ${PH[j]}</span><b>${ltr(si(cabs(z), 'A'))}</b>${st.conn === 'delta' ? `<small class="muted">${ltr(`בנגד: ${si(cabs(r.Iload[j]), 'A')}`)}</small>` : ''}</div>`).join('')}
      ${st.conn === 'star' ? `<div><span>זרם באפס</span><b>${ltr(st.neutral ? si(cabs(r.In), 'A') : 'מנותק')}</b></div>` : ''}<div><span>הספק כולל</span><b>${ltr(si(r.P, 'W'))}</b>${bal ? `<small class="muted">${ltr(`√3·VL·IL = ${si(Math.sqrt(3) * VL * IL, 'W')}`)}</small>` : ''}</div></div>
      ${st.conn === 'star' ? `<p class="small">בכוכב כל נגד מקבל מתח פאזה (${ltr('230 V')}), וזרם הקו הוא זרם הנגד. האפס מחזיר את סכום הזרמים: ${bal ? 'בעומס מאוזן שלושת הזרמים מבטלים זה את זה (סכום הפאזורים 0), ובאפס לא עובר כלום.' : st.neutral ? `בעומס לא מאוזן הסכום לא מתאפס, ובאפס עובר ${ltr(si(cabs(r.In), 'A'))}.` : 'בעומס לא מאוזן הסכום לא מתאפס, אבל האפס מנותק ואין לזרם דרך חזרה. לכן נקודת הכוכב זזה עד שסכום הזרמים נעשה 0.'}</p>`
        : `<p class="small">במשולש כל נגד מחובר בין שתי פאזות ומקבל ${ltr('400 V')}. זרם הקו הוא הפרש של שני זרמי נגדים, ולכן בעומס מאוזן ${ltr('IL = √3·Iph')}. אותם נגדים במשולש לוקחים פי 3 הספק מאשר בכוכב: על כל נגד פי ${ltr('√3')} מתח, ולכן פי 3 הספק. על זה בנויה התנעת כוכב-משולש של מנועים.</p>`}
      ${st.conn === 'star' && !st.neutral ? `<div class="pg-status ${bal ? 'good' : 'bad'}">${bal ? 'בעומס מאוזן הניתוק לא משנה כלום: נקודת הכוכב נשארת באפס.' : `⚠ נקודת הכוכב זזה ב-${ltr(si(cabs(r.Vn), 'V'))}. המתחים על העומסים: ${r.Vload.map((z, j) => ltr(`${PH[j]}: ${num(cabs(z), 0)} V`)).join(', ')}.`}</div>
        ${bal ? '' : `<p class="small">העומס הקטן (התנגדות גבוהה) מקבל יותר מ-${ltr('230 V')}${Math.max(...over) > 253 ? `, עד ${ltr(`${num(Math.max(...over), 0)} V`)}` : ''}, והגדול פחות. בבית זה אומר: מכשירים בפאזה אחת נשרפים, ובפאזה אחרת נורות עמומות. לכן אפס שנותק בלוח הוא תקלה מסוכנת, ובמצב 🏠 של שלב ד נחזור אליה.</p>`}` : ''}
      ${SAFETY}`;
  }
  const draw = () => { const r = calc(); wv.innerHTML = waves(th); ph.innerHTML = phasorSvg(r, th); ci.innerHTML = currentSvg(r, th); };
  const refresh = (full = true) => {
    draw(); ld.innerHTML = loadSvg(calc()); out.innerHTML = results();
    root.querySelectorAll('[data-act="conn"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === st.conn)));
    if (full) ed.innerHTML = editor();
    else { const tmp = document.createElement('div'); tmp.innerHTML = editor(); const nb = tmp.querySelectorAll('.pg-range b'); ed.querySelectorAll('.pg-range b').forEach((b, i) => { if (nb[i]) b.innerHTML = nb[i].innerHTML; }); }
  };
  refresh();
  const tick = (now) => {
    if (!root.isConnected) return;
    if (playing && last) { th = (th + ((now - last) / 1000) * 90) % 720; draw(); }
    last = now; raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'play') { playing = !playing; b.textContent = playing ? '⏸ עצור' : '▶ הפעל'; return; }
    if (a === 'conn') st.conn = b.dataset.v;
    else if (a === 'bal') { st.Ra = st.Rb = st.Rc = 50; }
    else if (a === 'unbal') { st.Ra = 30; st.Rb = 100; st.Rc = 300; }
    else if (a === 'neutral') st.neutral = !st.neutral;
    else return;
    save(); refresh();
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!f || !(f in LIM)) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    st[f] = Math.min(LIM[f][1], Math.max(LIM[f][0], v)); save(); refresh(false);
  });
  void carg; void polar;
  return () => cancelAnimationFrame(raf);
}
