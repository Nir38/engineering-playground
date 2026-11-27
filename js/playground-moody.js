// playground-moody.js: the playground's pipe-friction mode. A live Moody chart (computed from Colebrook)
// with the point of your pipe on it, and the head loss, pressure drop and pumping power that follow.
// Math: js/pipeflow.js and js/formulas.js (tests/columns-cases.mjs).
import { pipe, sameFlow, FLUIDS, PIPES, SRC_P } from './pipeflow.js';
import { frictionColebrook } from './formulas.js';
import { ltr, num, si, text, slider, chips, COL, go } from './elec-ui.js';

const KEY = 'mh-pg-moody-v1';
const LIM = { lv: [-2, 1], lD: [0.7, 2.7], lL: [0, 3] };
const defaults = () => ({ fluid: 'water', mat: 'steel', lv: Math.log10(2), lD: Math.log10(50), lL: 2 });
let st = null;
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') for (const k of Object.keys(st)) if (typeof s[k] === typeof st[k] && (typeof s[k] !== 'number' || Number.isFinite(s[k]))) st[k] = s[k]; } catch (e) { /* ignore */ }
  if (!FLUIDS[st.fluid]) st.fluid = 'water'; if (!PIPES[st.mat]) st.mat = 'steel';
  for (const [k, [a, b]] of Object.entries(LIM)) st[k] = Math.min(b, Math.max(a, st[k]));
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
const inp = () => ({ fluid: st.fluid, eps: PIPES[st.mat].eps, D: 10 ** st.lD / 1000, V: 10 ** st.lv, L: 10 ** st.lL });

let view = null;
const RX = [2.7, 8], FY = [Math.log10(0.008), Math.log10(0.1)];
function chart(r) {
  const W = 360, H = 266, pl = 36, pr = 44, pt = 30, pb = 30;
  const X = (Re) => pl + ((Math.log10(Re) - RX[0]) / (RX[1] - RX[0])) * (W - pl - pr), Y = (f) => H - pb - ((Math.log10(f) - FY[0]) / (FY[1] - FY[0])) * (H - pt - pb);
  view = { W, H, pl, pr };
  const clipY = (f) => Math.min(H - pb, Math.max(pt, Y(f)));
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" id="pgMoody" role="img" aria-label="דיאגרמת Moody עם נקודת הצינור">`;
  s += `<rect x="${X(2300).toFixed(1)}" y="${pt}" width="${(X(4000) - X(2300)).toFixed(1)}" height="${H - pt - pb}" fill="var(--muted)" opacity="0.08"/>`;
  for (let e = 3; e <= 8; e++) s += `<line x1="${X(10 ** e).toFixed(1)}" y1="${pt}" x2="${X(10 ** e).toFixed(1)}" y2="${H - pb}" stroke="var(--border)"/>` + text(X(10 ** e), H - pb + 13, `10^${e}`.replace('^3', '³').replace('^4', '⁴').replace('^5', '⁵').replace('^6', '⁶').replace('^7', '⁷').replace('^8', '⁸'), 'var(--muted)');
  for (const f of [0.01, 0.02, 0.03, 0.05, 0.1]) s += `<line x1="${pl}" y1="${Y(f).toFixed(1)}" x2="${W - pr}" y2="${Y(f).toFixed(1)}" stroke="var(--border)"/>` + text(pl - 3, Y(f) + 4, String(f), 'var(--muted)', 'end');
  // laminar
  s += `<line x1="${X(500).toFixed(1)}" y1="${clipY(64 / 500).toFixed(1)}" x2="${X(2300).toFixed(1)}" y2="${Y(64 / 2300).toFixed(1)}" stroke="${COL.i}" stroke-width="2"/>` + text(X(900), Y(64 / 900) + 16, '64/Re', COL.i);
  // turbulent curves
  const rels = [0, 1e-4, 5e-4, 1e-3, 5e-3, 0.01, 0.03, 0.05];
  const curve = (rel, col, w) => { let p = ''; for (let i = 0; i <= 50; i++) { const Re = 10 ** (Math.log10(4000) + ((RX[1] - Math.log10(4000)) * i) / 50); p += `${X(Re).toFixed(1)},${clipY(frictionColebrook(Re, rel)).toFixed(1)} `; } return `<polyline points="${p}" fill="none" stroke="${col}" stroke-width="${w}"/>`; };
  for (const rel of rels) { s += curve(rel, 'var(--muted)', 1); s += text(W - pr + 3, Y(frictionColebrook(1e8, rel)) + 3, rel === 0 ? 'חלק' : String(rel), 'var(--muted)', 'start'); }
  if (r.regime !== 'laminar') s += curve(r.rel, COL.v, 2.5);
  s += text(W - pr + 3, pt - 8, 'ε/D', '', 'start') + text(pl + 70, pt - 8, 'f (Darcy)', '', 'start') + text((pl + W - pr) / 2, H - 1, 'Re', '', 'middle') + text(X(3000), pt + 12, 'מעבר', 'var(--muted)');
  // the pipe
  const inside = r.Re >= 10 ** RX[0] && r.Re <= 10 ** RX[1];
  if (inside) s += `<line x1="${X(r.Re).toFixed(1)}" y1="${pt}" x2="${X(r.Re).toFixed(1)}" y2="${H - pb}" stroke="${COL.p}" stroke-dasharray="3 3"/><circle data-k="pt" cx="${X(r.Re).toFixed(1)}" cy="${clipY(r.f).toFixed(1)}" r="8" fill="${COL.p}" stroke="#fff" stroke-width="2"/>`;
  return s + '</svg>';
}

export function renderMoody(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>〽 חיכוך בצנרת (Moody)</h2><p class="small muted">מקדם החיכוך f תלוי בשני מספרים: Reynolds (מהירות, קוטר, צמיגות) והחספוס היחסי ε/D. הנקודה הירוקה היא הצינור שלך. גרור אותה ימינה ושמאלה כדי לשנות מהירות.</p></div>
    <div class="card pg-stage"><div id="mdChart"></div></div>
    <div class="card" id="mdEd"></div>
    <div class="card" id="mdRes"></div>`;
  const cv = root.querySelector('#mdChart'), ed = root.querySelector('#mdEd'), out = root.querySelector('#mdRes');
  const editor = () => { const o = inp(); return `<h3 class="pg-h">נוזל</h3>${chips(Object.entries(FLUIDS).map(([k, v]) => [k, v.name]), st.fluid, 'fluid')}
    <h3 class="pg-h">חומר הצינור</h3>${chips(Object.entries(PIPES).map(([k, v]) => [k, `${v.name} (⁦${v.eps} mm⁩)`]), st.mat, 'mat')}
    ${slider('lv', 'מהירות V', ltr(`${num(o.V, o.V < 0.1 ? 3 : 2)} m/s`), LIM.lv, 0.01, st.lv)}${slider('lD', 'קוטר פנימי D', ltr(`${num(o.D * 1000, 0)} mm`), LIM.lD, 0.01, st.lD)}${slider('lL', 'אורך L', ltr(`${num(o.L, 0)} m`), LIM.lL, 0.01, st.lL)}
    <div class="chips"><button class="chip" data-act="dbl">⇔ אותה ספיקה בקוטר כפול</button><button class="chip" data-act="reset">↺ חזרה</button></div>`; };
  const results = (r) => {
    const o = inp(), zone = r.regime === 'laminar' ? `<div class="pg-status good">זרימה למינרית: ${ltr('f = 64/Re')} בלי קשר לחספוס. ההפסד יחסי למהירות (לא לריבוע שלה).</div>`
      : r.regime === 'transitional' ? '<div class="pg-status warn">אזור מעבר (Re בין 2300 ל-4000): הזרימה לא יציבה ו-f לא ידוע בדיוק. בתכן נמנעים מהאזור הזה.</div>'
        : `<div class="pg-status good">זרימה טורבולנטית. ${r.rel > 0 && r.Re * r.rel * Math.sqrt(r.f) > 200 ? 'הצינור "מחוספס לגמרי": f כמעט לא משתנה עם Re, וההפסד יחסי ל-V².' : 'f יורד לאט עם Re, וגם החספוס משפיע.'}</div>`;
    return `${zone}<div class="pg-max">
      <div><span>Reynolds</span><b>${ltr(`Re = ρVD/μ = ${Math.round(r.Re).toLocaleString('en')}`)}</b></div><div><span>חספוס יחסי</span><b>${ltr(`ε/D = ${r.rel.toPrecision(2)}`)}</b></div>
      <div><span>מקדם חיכוך (Colebrook)</span><b>${ltr(`f = ${num(r.f, 4)}`)}</b></div>${Number.isFinite(r.fH) ? `<div><span>Haaland (נוסחה מפורשת)</span><b>${ltr(`f = ${num(r.fH, 4)}`)}</b></div>` : ''}
      <div><span>ספיקה</span><b>${ltr(`${si(r.Q * 1000, 'L/s')} = ${num(r.Q * 3600, 2)} m³/h`)}</b></div><div><span>הפסד עומד</span><b>${ltr(`hL = ${num(r.hL, r.hL < 1 ? 3 : 1)} m`)}</b></div>
      <div><span>מפל לחץ</span><b>${ltr(`Δp = ${si(r.dp, 'Pa')} = ${num(r.dp / 1e5, 3)} bar`)}</b></div><div><span>הספק לשאיבה</span><b>${ltr(`Δp·Q = ${si(r.P, 'W')}`)}</b></div></div>
      <p class="small">${ltr('hL = f · (L/D) · V²/2g')} (Darcy-Weisbach). בטורבולנטי: ${ltr('1/√f = −2 log(ε/3.7D + 2.51/(Re√f))')} (Colebrook), ופותרים באיטרציה. דיאגרמת Moody היא בדיוק הגרף של המשוואה הזו.</p>
      <p class="small"><b>מה כדאי לנסות:</b> שמן מנוע: הזרימה למינרית ו-f לא משתנה כשמחליפים חומר צינור. מים בפלדה: הגדל מהירות וראה את הנקודה זזה ימינה עד שהקו משתטח. לחץ "קוטר כפול": באותה ספיקה ההפסד יורד בערך פי 30, כי ${ltr('Δp ∝ Q²/D⁵')}. לכן קוטר צינור הוא החלטה כלכלית: צינור עבה יקר יותר, אבל המשאבה קטנה וחוסכת חשמל.</p>
      <p class="small muted">${ltr(`ρ = ${FLUIDS[o.fluid].rho} kg/m³, μ = ${FLUIDS[o.fluid].mu} Pa·s`)}. החספוס הוא ערך אופייני לצינור חדש, וצינור ישן מחוספס יותר. המקור: ${SRC_P} (טבלה 8-2 לחספוס, ונספח לתכונות). הפסדים מקומיים (ברכיים, מגופים) לא כלולים כאן. ראה גם ${go('pump', '💧 משאבה')} בקטגוריית חשמל.</p>`;
  };
  let cmp = '';
  const refresh = (full = true) => {
    const r = pipe(inp()); cv.innerHTML = chart(r); out.innerHTML = cmp + results(r);
    if (full) ed.innerHTML = editor();
    else { const tmp = document.createElement('div'); tmp.innerHTML = editor(); const nb = tmp.querySelectorAll('.pg-range b'); ed.querySelectorAll('.pg-range b').forEach((b, i) => { if (nb[i]) b.innerHTML = nb[i].innerHTML; }); ed.querySelectorAll('.pg-range input').forEach((el) => { if (el !== document.activeElement) el.value = st[el.dataset.f]; }); }
  };
  refresh();
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act; cmp = '';
    if (act === 'fluid' || act === 'mat') st[act] = b.dataset.v;
    else if (act === 'reset') Object.assign(st, defaults());
    else if (act === 'dbl') {
      const o = inp(), a = pipe(o), D2 = Math.min(10 ** LIM.lD[1] / 1000, o.D * 2), bb = sameFlow(o, D2);
      cmp = `<div class="pg-status good">אותה ספיקה (${ltr(si(a.Q * 1000, 'L/s'))}): בקוטר ${ltr(`${num(o.D * 1000, 0)} mm`)} מפל הלחץ ${ltr(si(a.dp, 'Pa'))}, ובקוטר ${ltr(`${num(D2 * 1000, 0)} mm`)} רק ${ltr(si(bb.dp, 'Pa'))}. פי ${ltr(num(a.dp / bb.dp, 1))} פחות.</div>`;
      st.lD = Math.log10(D2 * 1000); st.lv = Math.min(LIM.lv[1], Math.max(LIM.lv[0], Math.log10(bb.V)));
    } else return;
    save(); refresh();
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!f || !(f in LIM)) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    st[f] = Math.min(LIM[f][1], Math.max(LIM[f][0], v)); cmp = ''; save(); refresh(false);
  });
  // drag the point sideways: Re follows the finger, V = Re·μ/(ρD)
  let drag = null;
  const setFrom = (ev) => {
    const sv = cv.querySelector('svg'); if (!sv || !view) return;
    const p = sv.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(sv.getScreenCTM().inverse());
    const Re = 10 ** (RX[0] + ((q.x - view.pl) / (view.W - view.pl - view.pr)) * (RX[1] - RX[0])), o = inp(), fl = FLUIDS[o.fluid];
    st.lv = Math.min(LIM.lv[1], Math.max(LIM.lv[0], Math.log10((Re * fl.mu) / (fl.rho * o.D)))); cmp = ''; refresh(false);
  };
  cv.addEventListener('pointerdown', (ev) => { if (!ev.target.closest('[data-k="pt"]')) return; ev.preventDefault(); drag = ev.pointerId; try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ } });
  cv.addEventListener('pointermove', (ev) => { if (drag === ev.pointerId) setFrom(ev); });
  const end = (ev) => { if (drag !== ev.pointerId) return; drag = null; save(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
}
