// playground-fat.js: the playground's fatigue mode. Endurance limit with the Marin factors, and the
// load point on the Goodman diagram (with Soderberg, Gerber and Langer yield); drag the point.
// Math: js/fatigue.js (tests/stack-cases.mjs). Steel data: Shigley Table A-20 (minimum values).
import { analyze, SURF, LOAD, REL, STEELS, SRC_F } from './fatigue.js';
import { ltr, num, text, slider, chips, COL, go } from './elec-ui.js';

const KEY = 'mh-pg-fat-v1';
const LIM = { Sut: [300, 1400], Sy: [150, 1300], smax: [-300, 700], smin: [-500, 700], Kf: [1, 3], d: [3, 250] };
const CASES = { rev: { name: 'ציר מסתובב (R = −1)', smax: 150, smin: -150 }, pulse: { name: 'פועם 0 → מקס׳ (R = 0)', smax: 250, smin: 0 }, mean: { name: 'מאמץ ממוצע גבוה', smax: 320, smin: 200 } };
const defaults = () => ({ mat: '1045CD', Sut: 630, Sy: 530, smax: 250, smin: 0, Kf: 1, d: 25, surf: 'machined', load: 'bend', rel: 50 });
let st = null;
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') for (const k of Object.keys(st)) if (typeof s[k] === typeof st[k] && (typeof s[k] !== 'number' || Number.isFinite(s[k]))) st[k] = s[k]; } catch (e) { /* ignore */ }
  if (!SURF[st.surf]) st.surf = 'machined'; if (!LOAD[st.load]) st.load = 'bend'; if (!(st.rel in REL)) st.rel = 50; if (st.mat !== 'custom' && !STEELS[st.mat]) st.mat = 'custom';
  clamp();
}
function clamp() {
  for (const [k, [a, b]] of Object.entries(LIM)) st[k] = Math.min(b, Math.max(a, st[k]));
  st.Sy = Math.min(st.Sy, st.Sut); if (st.smin > st.smax) st.smin = st.smax;
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
const A = () => analyze(st);

// the diagram: σm across, σa up. view is kept for the drag
let view = null;
function diagram(r) {
  const W = 360, H = 266, pl = 40, pr = 14, pt = 34, pb = 30;
  const xmin = r.sm < 0 ? -st.Sy : 0, xmax = st.Sut * 1.06, ymax = Math.max(r.Se, st.Sy, r.sa) * 1.12;
  const X = (v) => pl + ((v - xmin) / (xmax - xmin)) * (W - pl - pr), Y = (v) => H - pb - (v / ymax) * (H - pt - pb);
  view = { xmin, xmax, ymax, W, H, pl, pr, pt, pb };
  const L = (x1, y1, x2, y2, col, w = 2, dash = '') => `<line x1="${X(x1).toFixed(1)}" y1="${Y(y1).toFixed(1)}" x2="${X(x2).toFixed(1)}" y2="${Y(y2).toFixed(1)}" stroke="${col}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" id="pgFatDia" role="img" aria-label="דיאגרמת Goodman עם נקודת העומס">`;
  // safe zone: under both the fatigue line and the yield line
  const safe = [];
  for (let i = 0; i <= 40; i++) { const x = xmin + ((xmax - xmin) * i) / 40; if (x > st.Sut) break; const fl = x <= 0 ? r.Se : r.Se * (1 - x / st.Sut), yl = st.Sy - Math.abs(x), y = Math.max(0, Math.min(fl, yl)); safe.push(`${X(x).toFixed(1)},${Y(y).toFixed(1)}`); }
  s += `<polygon points="${X(xmin).toFixed(1)},${Y(0).toFixed(1)} ${safe.join(' ')} ${X(Math.min(st.Sut, xmax)).toFixed(1)},${Y(0).toFixed(1)}" fill="${COL.p}" opacity="0.12"/>`;
  s += L(xmin, 0, xmax, 0, 'var(--muted)', 1) + L(0, 0, 0, ymax, 'var(--muted)', 1);
  // criteria
  let gp = ''; for (let i = 0; i <= 30; i++) { const x = (st.Sut * i) / 30; gp += `${X(x).toFixed(1)},${Y(r.Se * (1 - (x / st.Sut) ** 2)).toFixed(1)} `; }
  s += `<polyline points="${gp}" fill="none" stroke="${COL.q}" stroke-width="1.5" stroke-dasharray="5 3"/>`;
  s += L(0, r.Se, st.Sy, 0, 'var(--muted)', 1.5, '2 3') + L(0, st.Sy, st.Sy, 0, COL.s, 1.5, '6 3') + L(0, r.Se, st.Sut, 0, COL.v, 2.5);
  if (xmin < 0) s += L(-Math.max(0, st.Sy - r.Se), r.Se, 0, r.Se, COL.v, 2.5) + L(-st.Sy, 0, 0, st.Sy, COL.s, 1.5, '6 3');
  // load line and the point
  const k = r.n.goodman, ex = Math.min(k, 1.6) * 1.0;
  if (r.sa > 0 || r.sm !== 0) s += L(0, 0, r.sm * Math.max(ex, 1.05), r.sa * Math.max(ex, 1.05), 'var(--muted)', 1, '3 3');
  if (r.sm >= 0 && Number.isFinite(k) && k * r.sm <= xmax && k * r.sa <= ymax) s += `<circle cx="${X(k * r.sm).toFixed(1)}" cy="${Y(k * r.sa).toFixed(1)}" r="3.5" fill="${COL.v}"/>`;
  const bad = r.gov < 1;
  s += `<circle data-k="pt" cx="${X(r.sm).toFixed(1)}" cy="${Y(r.sa).toFixed(1)}" r="9" fill="${bad ? COL.s : COL.i}" stroke="#fff" stroke-width="2"/>`;
  // labels
  s += text(X(0) - 4, Y(r.Se) + 4, 'Se', COL.v, 'end') + text(X(0) - 4, Y(st.Sy) + 4, 'Sy', COL.s, 'end') + text(X(st.Sut), H - pb + 13, 'Sut', COL.v) + text(X(st.Sy), H - pb + 13, 'Sy', COL.s);
  s += text(W - pr, H - 4, 'σm [MPa]', '', 'end') + text(pl + 4, pt - 6, 'σa [MPa]', '', 'start');
  s += text(W - pr, pt - 18, 'Goodman', COL.v, 'end') + text(W - pr, pt - 5, 'Gerber', COL.q, 'end') + text(W - pr, pt + 8, 'Soderberg', 'var(--muted)', 'end') + text(W - pr, pt + 21, 'Langer (כניעה)', COL.s, 'end');
  return s + '</svg>';
}

export function renderFat(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>⟳ עייפות ו-Goodman</h2><p class="small muted">חלק שעובד במחזורים נכשל במאמץ נמוך בהרבה מ-${ltr('Sut')}. מחשבים גבול עייפות מתוקן ${ltr('Se')} לחלק האמיתי, ובודקים איפה נקודת העומס (${ltr('σm, σa')}) נמצאת. גרור את הנקודה הכתומה.</p></div>
    <div class="card pg-stage"><div id="ftDia"></div></div>
    <div class="card" id="ftEd"></div>
    <div class="card" id="ftRes"></div>`;
  const dv = root.querySelector('#ftDia'), ed = root.querySelector('#ftEd'), out = root.querySelector('#ftRes');
  const editor = () => `<h3 class="pg-h">חומר</h3>${chips([...Object.entries(STEELS).map(([k, m]) => [k, `⁦${m.name}⁩`]), ['custom', 'אחר']], st.mat, 'mat')}
    ${slider('Sut', 'חוזק מתיחה Sut', ltr(`${num(st.Sut, 0)} MPa`), LIM.Sut, 10, st.Sut)}${slider('Sy', 'חוזק כניעה Sy', ltr(`${num(st.Sy, 0)} MPa`), LIM.Sy, 10, st.Sy)}
    <h3 class="pg-h">העומס</h3>${chips(Object.entries(CASES).map(([k, c]) => [k, c.name]), '', 'case')}
    ${slider('smax', 'מאמץ מקסימלי σmax (נומינלי)', ltr(`${num(st.smax, 0)} MPa`), LIM.smax, 5, st.smax)}${slider('smin', 'מאמץ מינימלי σmin (נומינלי)', ltr(`${num(st.smin, 0)} MPa`), LIM.smin, 5, st.smin)}
    ${slider('Kf', 'ריכוז מאמץ בעייפות Kf', ltr(num(st.Kf, 2)), LIM.Kf, 0.05, st.Kf)}
    <h3 class="pg-h">מקדמי Marin</h3>
    <p class="small muted">גימור שטח (ka)</p>${chips(Object.entries(SURF).map(([k, v]) => [k, v.name]), st.surf, 'surf')}
    <p class="small muted">סוג עומס (kb, kc)</p>${chips(Object.entries(LOAD).map(([k, v]) => [k, v.name]), st.load, 'load')}
    ${st.load === 'axial' ? '' : slider('d', 'קוטר d (kb)', ltr(`${num(st.d, 0)} mm`), LIM.d, 1, st.d)}
    <p class="small muted">אמינות (ke)</p>${chips(Object.keys(REL).sort((a, b) => a - b).map((k) => [k, `${k}%`]), st.rel, 'rel')}`;
  const results = (r) => {
    const f = r.f, rows = [['ka גימור', f.ka], ['kb גודל', f.kb], ['kc עומס', f.kc], ['kd טמפרטורה', f.kd], ['ke אמינות', f.ke]];
    const verdict = r.gov < 1 ? `<div class="pg-status bad">ייכשל: ${r.mode === 'yield' ? 'כבר במחזור הראשון החלק נכנע (Langer)' : 'בעייפות לפני מיליון מחזורים (Goodman)'}. n = ${num(r.gov, 2)}.</div>`
      : `<div class="pg-status ${r.gov < 1.5 ? 'warn' : 'good'}">מחזיק לחיים ארוכים, עם מקדם ביטחון n = ${num(r.gov, 2)} (${r.mode === 'yield' ? 'הכניעה קובעת' : 'העייפות קובעת'}).${r.gov < 1.5 ? ' מרווח קטן: חומר או ריכוז מאמץ שונים במעט יכולים להפיל אותו.' : ''}</div>`;
    return `${verdict}<h3 class="pg-h">גבול העייפות</h3>
      <table class="pg-table"><tbody><tr><td>${ltr("Se' = 0.5·Sut")} (פלדה)</td><td>${ltr(`${num(r.Se1, 0)} MPa`)}</td></tr>${rows.map(([n, v]) => `<tr><td>${n}</td><td>${ltr(num(v, 3))}</td></tr>`).join('')}<tr><th>${ltr("Se = ka·kb·kc·kd·ke·Se'")}</th><th>${ltr(`${num(r.Se, 0)} MPa`)}</th></tr></tbody></table>
      <h3 class="pg-h">העומס ומקדמי הביטחון</h3><div class="pg-max">
      <div><span>מאמץ ממוצע σm</span><b>${ltr(`${num(r.sm, 0)} MPa`)}</b></div><div><span>משרעת σa</span><b>${ltr(`${num(r.sa, 0)} MPa`)}</b></div><div><span>יחס מאמצים R</span><b>${ltr(num(r.R, 2))}</b></div>
      <div><span>Goodman</span><b>${ltr(`n = ${num(r.n.goodman, 2)}`)}</b></div><div><span>Gerber</span><b>${ltr(`n = ${num(r.n.gerber, 2)}`)}</b></div><div><span>Soderberg</span><b>${ltr(`n = ${num(r.n.soderberg, 2)}`)}</b></div><div><span>Langer (כניעה)</span><b>${ltr(`n = ${num(r.n.langer, 2)}`)}</b></div></div>
      <p class="small">${ltr('Goodman: σa/Se + σm/Sut = 1/n')}. Gerber קרוב יותר לניסויים ופחות שמרני, Soderberg הכי שמרני. בתכן נהוג Goodman. הנקודה הכחולה על הקו היא היכן שהעומס היה נכשל אם היה גדל פי n באותו יחס.</p>
      <p class="small"><b>מה כדאי לנסות:</b> עבור מ"מושחז" ל"מחושל" וראה כמה ${ltr('Se')} יורד. העלה את ${ltr('Kf')} ל-2, כמו כתף חדה בציר. בחר "מאמץ ממוצע גבוה" ושנה ל-Gerber וראה שהקווים נפרדים. מאמץ ממוצע לחיצה (σm שלילי) לא מזיק לעייפות, ולכן עושים shot peening.</p>
      <p class="small muted">${ltr("Se' = 0.5 Sut")} נכון לפלדות עד ${ltr('Sut = 1400 MPa')}. לאלומיניום אין גבול עייפות, ולכן המצב הזה לא מתאים לו. ${ltr('Kf = 1 + q(Kt − 1)')}. לעומס משולב (כפיפה עם פיתול) מחשבים קודם מאמץ von Mises, ראה ${go('mohr', '◯ מעגל Mohr')}. המקור: ${SRC_F}. נתוני הפלדות מטבלה A-20 (ערכי מינימום).</p>`;
  };
  const refresh = (full = true) => {
    const r = A(); dv.innerHTML = diagram(r); out.innerHTML = results(r);
    if (full) ed.innerHTML = editor();
    else { const tmp = document.createElement('div'); tmp.innerHTML = editor(); const nb = tmp.querySelectorAll('.pg-range b'); ed.querySelectorAll('.pg-range b').forEach((b, i) => { if (nb[i]) b.innerHTML = nb[i].innerHTML; }); ed.querySelectorAll('.pg-range input').forEach((el) => { if (el !== document.activeElement && el.dataset.f in st) el.value = st[el.dataset.f]; }); }
  };
  refresh();
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const v = b.dataset.v, act = b.dataset.act;
    if (act === 'mat') { st.mat = v; if (STEELS[v]) { st.Sut = STEELS[v].Sut; st.Sy = STEELS[v].Sy; } }
    else if (act === 'case') { st.smax = CASES[v].smax; st.smin = CASES[v].smin; }
    else if (act === 'surf' || act === 'load') st[act] = v;
    else if (act === 'rel') st.rel = Number(v);
    else return;
    clamp(); save(); refresh();
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!f || !(f in LIM)) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    st[f] = v; if (f === 'Sut' || f === 'Sy') st.mat = 'custom';
    if (f === 'smin' && st.smin > st.smax) st.smax = st.smin;
    clamp(); save(); refresh(false);
    if (f === 'Sut' || f === 'Sy') ed.querySelectorAll('[data-act="mat"]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.v === 'custom')));
  });
  // drag the load point: it sets the local (σm, σa); the nominal stresses are those ÷ Kf
  let drag = null;
  const setFrom = (ev) => {
    const sv = dv.querySelector('svg'); if (!sv || !view) return;
    const p = sv.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(sv.getScreenCTM().inverse());
    const sm = view.xmin + ((q.x - view.pl) / (view.W - view.pl - view.pr)) * (view.xmax - view.xmin), sa = Math.max(0, ((view.H - view.pb - q.y) / (view.H - view.pt - view.pb)) * view.ymax);
    st.smax = Math.round((sm + sa) / st.Kf / 5) * 5; st.smin = Math.round((sm - sa) / st.Kf / 5) * 5; clamp(); refresh(false);
  };
  dv.addEventListener('pointerdown', (ev) => { if (!ev.target.closest('[data-k="pt"]')) return; ev.preventDefault(); drag = ev.pointerId; try { dv.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ } });
  dv.addEventListener('pointermove', (ev) => { if (drag === ev.pointerId) setFrom(ev); });
  const end = (ev) => { if (drag !== ev.pointerId) return; drag = null; save(); };
  dv.addEventListener('pointerup', end); dv.addEventListener('pointercancel', end);
}
