// playground-gears.js: the playground's spur-gear mode. Two meshing gears to scale that turn at their real
// speed ratio, the forces on the tooth, torque and speed, Lewis bending stress of each gear, the contact
// ratio and the undercut limit. Math: js/gears.js (tests/gear-cases.mjs).
import { gearPair, MODULES, KV, SRC_G } from './gears.js';
import { ltr, num, text, arrow, slider, chips, COL } from './elec-ui.js';

const KEY = 'mh-pg-gears-v1';
const LIM = { N1: [10, 60], N2: [12, 150], P: [0.5, 100], n1: [100, 6000], Fm: [6, 16], Sy: [200, 1200] };
const defaults = () => ({ m: 3, N1: 20, N2: 60, P: 10, n1: 1500, Fm: 12, finish: 'hobbed', Sy: 400, run: true });
let st = null;
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') for (const k of Object.keys(st)) if (typeof s[k] === typeof st[k] && (typeof s[k] !== 'number' || Number.isFinite(s[k]))) st[k] = s[k]; } catch (e) { /* ignore */ }
  if (!MODULES.includes(st.m)) st.m = 3; if (!KV[st.finish]) st.finish = 'hobbed';
  for (const [k, [a, b]] of Object.entries(LIM)) st[k] = Math.min(b, Math.max(a, Math.round(st[k] * 100) / 100));
  st.N1 = Math.round(st.N1); st.N2 = Math.round(st.N2);
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
const G = () => gearPair({ ...st, F: st.Fm * st.m });

// a gear outline: N trapezoid teeth, pitch radius r, addendum m, dedendum 1.25m (in drawing units)
function gearPath(N, r, m) {
  const ra = r + m, rf = r - 1.25 * m, p = (2 * Math.PI) / N, pts = [];
  for (let k = 0; k < N; k++) {
    const c = k * p;
    for (const [ang, rad] of [[c - 0.32 * p, rf], [c - 0.2 * p, r * 0.995], [c - 0.12 * p, ra], [c + 0.12 * p, ra], [c + 0.2 * p, r * 0.995], [c + 0.32 * p, rf]]) pts.push(`${(rad * Math.cos(ang)).toFixed(2)},${(rad * Math.sin(ang)).toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
}
let view = null;
function drawing(g) {
  const W = 360, H = 220, r1 = g.d1 / 2, r2 = g.d2 / 2, span = r1 + g.a + r2 + 2 * st.m, k = Math.min((W - 30) / span, (H - 40) / (2 * (Math.max(r1, r2) + st.m)));
  const cx1 = 15 + (r1 + st.m) * k, cx2 = cx1 + g.a * k, cy = H / 2 + 6;
  view = { cx1, cx2, cy };
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="זוג גלגלי שיניים בשילוב">`;
  s += `<g transform="translate(${cx1.toFixed(1)},${cy}) scale(${k.toFixed(4)})"><g id="gr1"><path d="${gearPath(st.N1, r1, st.m)}" fill="${COL.v}" fill-opacity="0.25" stroke="${COL.v}" stroke-width="${(1.4 / k).toFixed(3)}"/><line x1="0" y1="0" x2="${(r1 * 0.75).toFixed(1)}" y2="0" stroke="${COL.v}" stroke-width="${(2 / k).toFixed(3)}"/></g><circle r="${r1}" fill="none" stroke="var(--muted)" stroke-dasharray="${(3 / k).toFixed(2)} ${(3 / k).toFixed(2)}" stroke-width="${(1 / k).toFixed(3)}"/><circle r="${(3 / k).toFixed(2)}" fill="var(--text)"/></g>`;
  s += `<g transform="translate(${cx2.toFixed(1)},${cy}) scale(${k.toFixed(4)})"><g id="gr2"><path d="${gearPath(st.N2, r2, st.m)}" fill="${COL.i}" fill-opacity="0.25" stroke="${COL.i}" stroke-width="${(1.4 / k).toFixed(3)}"/><line x1="0" y1="0" x2="${(-r2 * 0.75).toFixed(1)}" y2="0" stroke="${COL.i}" stroke-width="${(2 / k).toFixed(3)}"/></g><circle r="${r2}" fill="none" stroke="var(--muted)" stroke-dasharray="${(3 / k).toFixed(2)} ${(3 / k).toFixed(2)}" stroke-width="${(1 / k).toFixed(3)}"/><circle r="${(3 / k).toFixed(2)}" fill="var(--text)"/></g>`;
  // the force on the pinion's tooth at the pitch point: Wt (tangential) and Wr (radial), the line of action at 20°
  const px = cx1 + r1 * k, L = 34, ang = (20 * Math.PI) / 180;
  s += `<line x1="${(px - 60 * Math.cos(ang)).toFixed(1)}" y1="${(cy - 60 * Math.sin(ang)).toFixed(1)}" x2="${(px + 60 * Math.cos(ang)).toFixed(1)}" y2="${(cy + 60 * Math.sin(ang)).toFixed(1)}" stroke="var(--muted)" stroke-dasharray="4 3"/>`;
  s += arrow(px, cy, px, cy + L, COL.s, 2.5, 7) + arrow(px, cy, px - L * Math.tan(ang), cy, COL.q, 2.5, 7);
  s += text(px + 5, cy + L, 'Wt', COL.s, 'start') + text(px - L * Math.tan(ang) - 2, cy - 6, 'Wr', COL.q, 'end') + text(px + 62, cy + 26, '20°', 'var(--muted)', 'start');
  s += text(cx1, 16, `${st.N1} שיניים`, COL.v) + text(cx2, 16, `${st.N2} שיניים`, COL.i);
  return s + '</svg>';
}

export function renderGears(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>⚙ גלגלי שיניים</h2><p class="small muted">שני גלגלים בשילוב מסתובבים כאילו היו שני גלילים שמתגלגלים זה על זה במעגלי הפסיעה (הקו המקווקו). יחס השיניים קובע את יחס המהירויות ואת הגדלת המומנט, והכוח עובר בשן לאורך קו פעולה ב-20°.</p></div>
    <div class="card pg-stage"><div id="grDraw" style="margin-top:22px"></div><div class="chips"><button class="chip" data-act="run" aria-pressed="${st.run}">${st.run ? '⏸ עצור' : '▶ סובב'}</button></div></div>
    <div class="card" id="grEd"></div>
    <div class="card" id="grRes"></div>`;
  const dv = root.querySelector('#grDraw'), ed = root.querySelector('#grEd'), out = root.querySelector('#grRes');
  const editor = () => `<h3 class="pg-h">מודול m (גודל השן)</h3>${chips(MODULES.map((m) => [m, `m ${m}`]), st.m, 'm')}
    ${slider('N1', 'שיניים בגלגל המניע (פיניון) N1', ltr(String(st.N1)), LIM.N1, 1, st.N1)}${slider('N2', 'שיניים בגלגל המונע N2', ltr(String(st.N2)), LIM.N2, 1, st.N2)}
    ${slider('P', 'הספק P', ltr(`${num(st.P, 1)} kW`), LIM.P, 0.5, st.P)}${slider('n1', 'מהירות הפיניון n1', ltr(`${num(st.n1, 0)} rpm`), LIM.n1, 50, st.n1)}
    ${slider('Fm', 'רוחב השן F (בכפולות של m)', ltr(`${num(st.Fm, 0)}·m = ${num(st.Fm * st.m, 0)} mm`), LIM.Fm, 1, st.Fm)}
    <h3 class="pg-h">ייצור וחומר</h3>${chips(Object.entries(KV).map(([k, v]) => [k, v.name]), st.finish, 'finish')}${slider('Sy', 'חוזק כניעה Sy', ltr(`${num(st.Sy, 0)} MPa`), LIM.Sy, 10, st.Sy)}`;
  const results = (g) => {
    const warn = g.undercut ? `<div class="pg-status bad">לפיניון עם ${st.N1} שיניים ביחס ${ltr(`1:${num(g.i, 2)}`)} יש חיתוך תחתי (undercut / interference): המינימום הוא ${g.nmin} שיניים. השן נחלשת והשילוב לא חלק.</div>` : '';
    const mcW = g.mc < 1.2 ? `<div class="pg-status warn">יחס מגע ${ltr(num(g.mc, 2))} נמוך: בחלק מהזמן רק שן אחת נושאת, והגלגלים רועשים יותר.</div>` : '';
    const nmin = Math.min(g.n1f, g.n2f), lew = `<div class="pg-status ${nmin < 1 ? 'bad' : nmin < 2 ? 'warn' : 'good'}">Lewis: מקדם ביטחון בכפיפת השן ${ltr(num(nmin, 2))} (${g.n1f <= g.n2f ? 'הפיניון חלש יותר' : 'הגלגל חלש יותר'}).</div>`;
    return `${warn}${mcW}${lew}<div class="pg-max">
      <div><span>קוטרי פסיעה</span><b>${ltr(`d1 = ${num(g.d1, 1)}, d2 = ${num(g.d2, 1)} mm`)}</b></div><div><span>מרחק צירים</span><b>${ltr(`a = m(N1 + N2)/2 = ${num(g.a, 1)} mm`)}</b></div>
      <div><span>יחס תמסורת</span><b>${ltr(`i = N2/N1 = ${num(g.i, 2)}`)}</b></div><div><span>מהירות יציאה</span><b>${ltr(`n2 = ${num(g.n2, 0)} rpm`)}</b></div>
      <div><span>מומנט כניסה ויציאה</span><b>${ltr(`T1 = ${num(g.T1, 1)}, T2 = ${num(g.T2, 1)} N·m`)}</b></div><div><span>מהירות קו הפסיעה</span><b>${ltr(`V = ${num(g.V, 2)} m/s`)}</b></div>
      <div><span>כוח משיקי</span><b>${ltr(`Wt = P/V = ${num(g.Wt, 0)} N`)}</b></div><div><span>כוח רדיאלי</span><b>${ltr(`Wr = Wt·tan20° = ${num(g.Wr, 0)} N`)}</b></div>
      <div><span>מקדם מהירות</span><b>${ltr(`Kv = ${num(g.Kv, 2)}`)}</b></div><div><span>יחס מגע</span><b>${ltr(`mc = ${num(g.mc, 2)}`)}</b></div>
      <div><span>מאמץ כפיפה, פיניון</span><b>${ltr(`σ = ${num(g.s1, 0)} MPa (Y ${num(g.Y1, 3)})`)}</b></div><div><span>מאמץ כפיפה, גלגל</span><b>${ltr(`σ = ${num(g.s2, 0)} MPa (Y ${num(g.Y2, 3)})`)}</b></div></div>
      <p class="small">${ltr('σ = Kv·Wt / (F·m·Y)')} (Lewis): השן היא קורת שלוחה קצרה, ו-${ltr('Y')} מתאר את הצורה שלה. לפיניון יש פחות שיניים, השן שלו "רזה" יותר בבסיס (${ltr('Y')} קטן), ולכן הוא בדרך כלל החלש. ${ltr('Kv')} מגדיל את המאמץ במהירות גבוהה, כי טעויות בפרופיל יוצרות מכות דינמיות.</p>
      <p class="small"><b>מה כדאי לנסות:</b> הורד את N1 מתחת ל-${g.nmin}: מופיעה אזהרת חיתוך תחתי. הכפל את המודול: המאמץ יורד בערך פי 4 (גם F גדל עם m). שנה ייצור מ"מושחז" ל"יצוק" במהירות גבוהה וראה את ${ltr('Kv')} עולה. ${ltr('Wr')} דוחף את הגלגלים זה מזה ומעמיס את המיסבים, גם כשאין שינוי בהספק.</p>
      <p class="small muted">שיניים סטנדרטיות, זווית לחץ 20°, תוספת ${ltr('m')} וחוסר ${ltr('1.25m')}. הציור מראה שיניים בקירוב ולא פרופיל אינבולוטה מדויק. Lewis הוא בדיקה ראשונית: תכן אמיתי לפי AGMA או ISO 6336 מוסיף מקדמי עומס, גודל, פיזור ובדיקת שחיקה (מאמץ מגע). המקור: ${SRC_G}.</p>`;
  };
  const refresh = (full = true) => {
    const g = G(); dv.innerHTML = drawing(g); out.innerHTML = results(g); spin(0);
    if (full) ed.innerHTML = editor();
    else { const tmp = document.createElement('div'); tmp.innerHTML = editor(); const nb = tmp.querySelectorAll('.pg-range b'); ed.querySelectorAll('.pg-range b').forEach((b, i) => { if (nb[i]) b.innerHTML = nb[i].innerHTML; }); }
  };
  // rotation: the pinion turns at a slow visible rate, the gear follows by the tooth ratio
  let th = 0, last = 0;
  const spin = (dt) => {
    th += dt * 0.8; const a1 = (th * 180) / Math.PI, a2 = 180 / st.N2 - (a1 * st.N1) / st.N2;
    const g1 = dv.querySelector('#gr1'), g2 = dv.querySelector('#gr2');
    if (g1) g1.setAttribute('transform', `rotate(${a1.toFixed(2)})`); if (g2) g2.setAttribute('transform', `rotate(${(a2 + 180).toFixed(2)})`);
  };
  const tick = (t) => { if (!root.isConnected) return; if (st.run && last) spin(Math.min(0.05, (t - last) / 1000)); last = t; requestAnimationFrame(tick); };
  refresh(); requestAnimationFrame(tick);
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'run') { st.run = !st.run; b.textContent = st.run ? '⏸ עצור' : '▶ סובב'; b.setAttribute('aria-pressed', String(st.run)); save(); return; }
    if (act === 'm') st.m = Number(b.dataset.v); else if (act === 'finish') st.finish = b.dataset.v; else return;
    save(); refresh();
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!f || !(f in LIM)) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    st[f] = Math.min(LIM[f][1], Math.max(LIM[f][0], v)); save(); refresh(false);
  });
}
