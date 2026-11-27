// playground-bolt.js: the playground's bolted-joint mode. The joint diagram (bolt and members as two
// springs meeting at the preload), how an external load splits between them, separation, the tightening
// torque, and the factors of safety (yield, load, separation, fatigue). Math: js/bolt.js (tests/bolt-cases.mjs).
import { joint, SIZES, MEMBER, KTQ, SRC_B } from './bolt.js';
import { ltr, num, text, slider, chips, COL, go } from './elec-ui.js';

const KEY = 'mh-pg-bolt-v1';
const CLASSES = ['8.8', '10.9', '12.9'];
const defaults = () => ({ size: 'M12', cls: '8.8', l: 40, ld: 20, member: 'steel', frac: 0.75, tq: 'zinc', P: 10 });
let st = null;
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') for (const k of Object.keys(st)) if (typeof s[k] === typeof st[k] && (typeof s[k] !== 'number' || Number.isFinite(s[k]))) st[k] = s[k]; } catch (e) { /* ignore */ }
  if (!SIZES.includes(st.size)) st.size = 'M12'; if (!CLASSES.includes(st.cls)) st.cls = '8.8'; if (!MEMBER[st.member]) st.member = 'steel'; if (!KTQ[st.tq]) st.tq = 'zinc'; if (![0.75, 0.9].includes(st.frac)) st.frac = 0.75;
  clamp();
}
const pmax = () => Math.ceil((1.5 * J(0).P0) / 1000);
function clamp() { st.l = Math.min(150, Math.max(10, st.l)); st.ld = Math.min(st.l, Math.max(0, st.ld)); st.P = Math.min(pmax(), Math.max(0, st.P)); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
const J = (P = st.P * 1000) => joint({ ...st, P });

function diagram(j) {
  const W = 360, H = 230, pl = 40, pr = 14, pt = 30, pb = 26;
  const db = j.Fi / j.kb, dm = j.Fi / j.km, P = st.P * 1000;
  const D = j.sep ? 0 : P / (j.kb + j.km), xb = j.sep ? P / j.kb : db + D, xmax = Math.max(db + dm, xb) * 1.08, ymax = Math.max(j.Fb, j.Fi) * 1.18;
  const X = (v) => pl + (v / xmax) * (W - pl - pr), Y = (f) => H - pb - (f / ymax) * (H - pt - pb);
  const L = (x1, y1, x2, y2, col, w = 2, dash = '') => `<line x1="${X(x1).toFixed(1)}" y1="${Y(y1).toFixed(1)}" x2="${X(x2).toFixed(1)}" y2="${Y(y2).toFixed(1)}" stroke="${col}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="דיאגרמת המחבר: כוח מול התארכות">`;
  s += L(0, 0, xmax, 0, 'var(--muted)', 1) + L(0, 0, 0, ymax, 'var(--muted)', 1);
  s += L(0, 0, Math.max(xb, db) * 1.04, j.kb * Math.max(xb, db) * 1.04, COL.v, 2.5) + L(db, j.Fi, db + dm, 0, COL.i, 2.5);
  s += L(0, j.Fi, db, j.Fi, 'var(--muted)', 1, '3 3') + text(pl - 4, Y(j.Fi) + 4, 'Fi', '', 'end');
  if (P > 0) {
    if (!j.sep) { s += L(xb, j.Fm, xb, j.Fb, COL.s, 3) + text(X(xb) + 6, Y((j.Fb + j.Fm) / 2) + 4, 'P', COL.s, 'start'); s += `<circle cx="${X(xb).toFixed(1)}" cy="${Y(j.Fb).toFixed(1)}" r="4" fill="${COL.v}"/><circle cx="${X(xb).toFixed(1)}" cy="${Y(j.Fm).toFixed(1)}" r="4" fill="${COL.i}"/>`; }
    else s += `<circle cx="${X(xb).toFixed(1)}" cy="${Y(j.Fb).toFixed(1)}" r="5" fill="${COL.s}"/>` + text(X(xb) - 6, Y(j.Fb) - 8, 'נפרד!', COL.s, 'end');
  }
  s += text(X(db * 0.45), Y(j.kb * db * 0.45) - 8, 'בורג (kb)', COL.v, 'end') + text(X(db + dm * 0.55) + 6, Y(j.Fi * 0.45), 'חלקים (km)', COL.i, 'start');
  s += text(W - pr, H - 4, 'התארכות δ', '', 'end') + text(pl + 70, pt - 10, 'כוח F', '', 'start');
  return s + '</svg>';
}
const kN = (f) => `${num(f / 1000, 1)} kN`;
const bar = (label, v, max, col) => `<div class="small" style="display:flex;align-items:center;gap:8px;margin:4px 0"><span style="width:92px">${label}</span><span style="flex:1;background:var(--surface-2);border-radius:6px;height:14px;overflow:hidden"><i style="display:block;height:100%;width:${Math.max(0, Math.min(100, (100 * v) / max)).toFixed(1)}%;background:${col}"></i></span><b class="ltr" style="width:64px;text-align:end">${kN(v)}</b></div>`;

export function renderBolt(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>🔩 מחבר מוברג</h2><p class="small muted">בהידוק, הבורג נמתח כמו קפיץ והחלקים נלחצים כמו קפיץ קשיח יותר. כשמוסיפים עומס חיצוני P, רוב העומס רק מקטין את הלחיצה בין החלקים, והבורג מרגיש רק את החלק ${ltr('C·P')}.</p></div>
    <div class="card pg-stage"><div id="btDia"></div><div id="btBars"></div></div>
    <div class="card" id="btEd"></div>
    <div class="card" id="btRes"></div>`;
  const dv = root.querySelector('#btDia'), bv = root.querySelector('#btBars'), ed = root.querySelector('#btEd'), out = root.querySelector('#btRes');
  const editor = () => `<h3 class="pg-h">בורג</h3>${chips(SIZES.map((s) => [s, s]), st.size, 'size')}${chips(CLASSES.map((c) => [c, `דרגה ${c}`]), st.cls, 'cls')}
    ${slider('l', 'עובי החלקים המהודקים (grip) l', ltr(`${num(st.l, 0)} mm`), [10, 150], 1, st.l)}${slider('ld', 'חלק הגוף הלא מוברג בתוך ה-grip', ltr(`${num(st.ld, 0)} mm`), [0, st.l], 1, st.ld)}
    <h3 class="pg-h">חלקים והידוק</h3>${chips(Object.entries(MEMBER).map(([k, v]) => [k, `${v.name} (E ${v.E} GPa)`]), st.member, 'member')}
    ${chips([[0.75, 'הידוק 75% (לפירוק חוזר)'], [0.9, 'הידוק 90% (קבוע)']], st.frac, 'frac')}${chips(Object.entries(KTQ).map(([k, v]) => [k, `${v.name} (K ${v.K})`]), st.tq, 'tq')}
    <h3 class="pg-h">עומס חיצוני לבורג</h3>${slider('P', 'P (משתנה 0 → P במחזוריות)', ltr(`${num(st.P, 1)} kN`), [0, pmax()], 0.5, st.P)}`;
  const nCell = (label, n, good = 1.5) => `<div><span>${label}</span><b class="${n < 1 ? 'bad' : ''}">${ltr(Number.isFinite(n) ? num(n, 2) : '∞')}</b></div>`;
  const results = (j) => {
    const min = Math.min(j.np, j.n0, j.nf), status = j.sep ? `<div class="pg-status bad">החלקים נפרדו (${ltr(`P > P0 = ${kN(j.P0)}`)}). עכשיו הבורג נושא את כל העומס, והמחבר דולף, מתנדנד ונשבר מהר בעייפות.</div>`
      : min < 1 ? `<div class="pg-status bad">מקדם ביטחון מתחת ל-1: ${j.np < 1 ? 'הבורג ייכנע' : j.nf < 1 ? 'הבורג ייכשל בעייפות' : 'החלקים ייפרדו'}.</div>`
        : `<div class="pg-status ${min < 1.5 ? 'warn' : 'good'}">המחבר תקין. מקדם הביטחון הקטן ביותר: ${ltr(num(min, 2))}.</div>`;
    return `${status}<div class="pg-max">
      <div><span>קשיחות הבורג</span><b>${ltr(`kb = ${num(j.kb / 1e3, 0)} kN/mm`)}</b></div><div><span>קשיחות החלקים</span><b>${ltr(`km = ${num(j.km / 1e3, 0)} kN/mm`)}</b></div>
      <div><span>קבוע המחבר</span><b>${ltr(`C = kb/(kb + km) = ${num(j.C, 3)}`)}</b></div><div><span>עומס הוכחה</span><b>${ltr(`Fp = Sp·At = ${kN(j.Fp)}`)}</b></div>
      <div><span>כוח הידוק</span><b>${ltr(`Fi = ${num(st.frac * 100, 0)}%·Fp = ${kN(j.Fi)}`)}</b></div><div><span>מומנט הידוק</span><b>${ltr(`T = K·Fi·d = ${num(j.T, 0)} N·m`)}</b></div>
      <div><span>עומס היפרדות</span><b>${ltr(`P0 = Fi/(1 − C) = ${kN(j.P0)}`)}</b></div><div><span>משרעת מאמץ בבורג</span><b>${ltr(`σa = C·P/2At = ${num(j.sa, 1)} MPa`)}</b></div></div>
      <h3 class="pg-h">מקדמי ביטחון</h3><div class="pg-max">${nCell('כניעה (np)', j.np)}${nCell('עומס (nL)', j.nL)}${nCell('היפרדות (n0)', j.n0)}${nCell('עייפות Goodman (nf)', j.nf)}</div>
      <p class="small">${ltr('Fb = Fi + C·P')}, ${ltr('Fm = Fi − (1 − C)·P')}. בדיאגרמה, הקו האדום הוא P: הוא "נכנס" בין קו הבורג לקו החלקים. ככל שהחלקים קשיחים יותר מהבורג (C קטן), הבורג מרגיש פחות מהעומס.</p>
      <p class="small"><b>מה כדאי לנסות:</b> החלף את החלקים לאלומיניום וראה ש-C עולה. הגדל את P מעבר ל-${ltr('P0')} וראה את ההיפרדות. הגדל את החלק הלא מוברג: הבורג נעשה קשיח יותר ו-C עולה. בורג ארוך ודק (גמיש) שומר הידוק טוב יותר ומרגיש פחות עומס. בהחלפת ציפוי ל"שחור" אותו הידוק דורש מומנט גבוה בהרבה, כי חלק גדול מהמומנט הולך לחיכוך.</p>
      <p class="small muted">${ltr('At')} לפי טבלת השטחים המטריים, ${ltr('Sp, Sut, Sy')} לפי ISO 898-1. קשיחות החלקים לפי חרוט ב-30° לשני חלקים מאותו חומר עם דסקיות. העייפות עם ${ltr('Se')} מתוקן להברגה מגולגלת. מקדם המומנט K הוא הערכה, ובפועל הוא משתנה הרבה, ולכן כוח ההידוק ממומנט לא מדויק. המקור: ${SRC_B}. ראה גם ${go('fat', '⟳ עייפות')}.</p>`;
  };
  const refresh = (full = true) => {
    const j = J(); dv.innerHTML = diagram(j);
    const mx = Math.max(j.Fp, j.Fb) * 1.05;
    bv.innerHTML = bar('כוח בבורג', j.Fb, mx, COL.v) + bar('לחיצת החלקים', j.Fm, mx, COL.i) + bar('עומס הוכחה', j.Fp, mx, 'var(--muted)');
    out.innerHTML = results(j);
    if (full) ed.innerHTML = editor();
    else { const tmp = document.createElement('div'); tmp.innerHTML = editor(); const nb = tmp.querySelectorAll('.pg-range b'); ed.querySelectorAll('.pg-range b').forEach((b, i) => { if (nb[i]) b.innerHTML = nb[i].innerHTML; }); const ldI = ed.querySelector('[data-f="ld"]'); if (ldI) ldI.max = String(st.l); }
  };
  refresh();
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]'); if (!b || !['size', 'cls', 'member', 'frac', 'tq'].includes(b.dataset.act)) return;
    st[b.dataset.act] = b.dataset.act === 'frac' ? Number(b.dataset.v) : b.dataset.v; clamp(); save(); refresh();
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!['l', 'ld', 'P'].includes(f)) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    st[f] = v; clamp(); save(); refresh(false);
  });
  root.addEventListener('change', (ev) => { if (ev.target.dataset.f === 'l') refresh(); }); // the P range and ld range follow
}
