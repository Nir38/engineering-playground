// playground-buck.js: the playground's column-buckling mode. A column with its end conditions and buckled
// shape, and the σcr–slenderness chart (Johnson parabola, then Euler) with the column's point on it.
// Math: js/columns.js (tests/columns-cases.mjs).
import { column, scrAt, ENDS, MATS, SRC_C } from './columns.js';
import { ltr, num, si, text, arrow, slider, chips, COL } from './elec-ui.js';

const KEY = 'mh-pg-buck-v1';
const LIM = { L: [0.1, 4], lP: [-1, 2.7], Sy: [150, 700], d: [5, 100], D: [10, 150], t: [1, 15], b: [10, 150], h: [3, 50] };
const KINDS = { rod: 'מוט מלא', tube: 'צינור', rect: 'פס שטוח' };
const defaults = () => ({ ends: 'pp', mat: 'steel', kind: 'rod', L: 1.5, lP: 0.7, Sy: 250, d: 20, D: 40, t: 3, b: 50, h: 10 });
let st = null;
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') for (const k of Object.keys(st)) if (typeof s[k] === typeof st[k] && (typeof s[k] !== 'number' || Number.isFinite(s[k]))) st[k] = s[k]; } catch (e) { /* ignore */ }
  if (!ENDS[st.ends]) st.ends = 'pp'; if (!MATS[st.mat]) st.mat = 'steel'; if (!KINDS[st.kind]) st.kind = 'rod';
  clamp();
}
function clamp() { for (const [k, [a, b]] of Object.entries(LIM)) st[k] = Math.min(b, Math.max(a, st[k])); st.t = Math.min(st.t, st.D / 2 - 0.5); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
const sec = () => ({ kind: st.kind, d: st.d / 1000, D: st.D / 1000, t: st.t / 1000, b: st.b / 1000, h: st.h / 1000 });
const P = () => 10 ** st.lP * 1000;
const A = () => column({ sec: sec(), L: st.L, K: ENDS[st.ends].K, E: MATS[st.mat].E, Sy: st.Sy * 1e6, P: P() });

// buckled shape along the height (s = 0 bottom, 1 top), max 1
const SHAPE = { pp: (s) => Math.sin(Math.PI * s), ff: (s) => (1 - Math.cos(2 * Math.PI * s)) / 2, fp: (s) => (s * s * (1 - s)) / (4 / 27), fr: (s) => 1 - Math.cos((Math.PI * s) / 2) };
function columnSvg(r) {
  const W = 360, H = 230, x0 = 110, yb = 205, yt = 50, ratio = Math.min(1.3, 1 / r.n), amp = 6 + 34 * Math.min(1, ratio), bad = r.n < 1, col = bad ? COL.s : COL.v;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="העמוד, תנאי הקצה וצורת הקריסה">`;
  s += `<line x1="${x0}" y1="${yt}" x2="${x0}" y2="${yb}" stroke="var(--muted)" stroke-dasharray="4 4"/>`;
  let p = ''; for (let i = 0; i <= 40; i++) { const sN = i / 40; p += `${(x0 + amp * SHAPE[st.ends](sN)).toFixed(1)},${(yb - sN * (yb - yt)).toFixed(1)} `; }
  s += `<polyline points="${p}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round" opacity="0.85"/>`;
  const fixed = (y, up) => `<rect x="${x0 - 26}" y="${up ? y - 10 : y}" width="52" height="10" fill="var(--muted)" opacity="0.5"/>`;
  const pin = (y, up) => `<polygon points="${x0},${y} ${x0 - 10},${up ? y - 14 : y + 14} ${x0 + 10},${up ? y - 14 : y + 14}" fill="none" stroke="var(--muted)" stroke-width="2"/>`;
  const bot = st.ends === 'pp' ? pin(yb, false) : fixed(yb, false), top = st.ends === 'ff' ? fixed(yt, true) : st.ends === 'fr' ? '' : pin(yt, true);
  s += bot + top + arrow(x0, yt - 40, x0, yt - (st.ends === 'fr' ? 2 : 14), COL.i, 3, 8) + text(x0 + 10, yt - 28, `P = ${si(P(), 'N')}`, COL.i, 'start');
  // effective length bracket
  const KL = ENDS[st.ends].K, hgt = yb - yt, bx = 230;
  s += text(bx, yt + hgt / 2 - 18, `K = ${KL}`, '', 'start') + text(bx, yt + hgt / 2, `KL = ${num(KL * st.L, 2)} m`, '', 'start') + text(bx, yt + hgt / 2 + 18, `L = ${num(st.L, 2)} m`, 'var(--muted)', 'start');
  s += text(bx, yt + hgt / 2 + 38, ENDS[st.ends].name, 'var(--muted)', 'start');
  return s + '</svg>';
}

let lmax = 250;
function chartSvg(r) {
  const W = 360, H = 220, pl = 40, pr = 12, pt = 26, pb = 28, E = MATS[st.mat].E, Sy = st.Sy * 1e6;
  lmax = Math.max(200, r.lam * 1.25, r.lam1 * 1.4);
  const smax = Sy * 1.25 / 1e6, X = (l) => pl + (l / lmax) * (W - pl - pr), Y = (sm) => H - pb - (Math.min(sm, smax) / smax) * (H - pt - pb);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="מאמץ קריסה מול תמירות">`;
  s += `<line x1="${pl}" y1="${H - pb}" x2="${W - pr}" y2="${H - pb}" stroke="var(--muted)"/><line x1="${pl}" y1="${pt}" x2="${pl}" y2="${H - pb}" stroke="var(--muted)"/>`;
  s += `<line x1="${pl}" y1="${Y(st.Sy)}" x2="${W - pr}" y2="${Y(st.Sy)}" stroke="${COL.s}" stroke-dasharray="5 3"/>` + text(W - pr, Y(st.Sy) - 4, 'Sy', COL.s, 'end');
  let eu = '', jo = '', eg = '';
  for (let i = 1; i <= 60; i++) {
    const l = (lmax * i) / 60, se = (Math.PI ** 2 * E) / l ** 2 / 1e6;
    if (l >= r.lam1) eu += `${X(l).toFixed(1)},${Y(se).toFixed(1)} `; else if (se < smax) eg += `${X(l).toFixed(1)},${Y(se).toFixed(1)} `;
  }
  for (let i = 0; i <= 30; i++) { const l = (r.lam1 * i) / 30; jo += `${X(l).toFixed(1)},${Y(scrAt(l, E, Sy) / 1e6).toFixed(1)} `; }
  eu = `${X(r.lam1).toFixed(1)},${Y(Sy / 2e6).toFixed(1)} ${eu}`;
  s += `<polyline points="${eg}" fill="none" stroke="${COL.v}" stroke-width="1.2" stroke-dasharray="3 3"/><polyline points="${eu}" fill="none" stroke="${COL.v}" stroke-width="2.5"/><polyline points="${jo}" fill="none" stroke="${COL.q}" stroke-width="2.5"/>`;
  s += `<line x1="${X(r.lam1)}" y1="${Y(Sy / 2e6)}" x2="${X(r.lam1)}" y2="${H - pb}" stroke="var(--muted)" stroke-dasharray="2 3"/>` + text(X(r.lam1), H - pb + 12, `λ1 = ${num(r.lam1, 0)}`, 'var(--muted)');
  s += text(X(r.lam1 * 0.45), Y(st.Sy * 0.88) + 14, 'Johnson', COL.q) + text(Math.min(W - pr - 20, X(r.lam1 * 1.5)), Y(scrAt(r.lam1 * 1.5, E, Sy) / 1e6) - 8, 'Euler', COL.v, 'start');
  const sig = r.sigma / 1e6, bad = r.n < 1;
  s += `<line x1="${X(r.lam)}" y1="${Y(r.scr / 1e6)}" x2="${X(r.lam)}" y2="${Y(sig)}" stroke="var(--muted)" stroke-dasharray="2 2"/>`;
  s += `<circle cx="${X(r.lam)}" cy="${Y(r.scr / 1e6)}" r="4" fill="${COL.v}"/><circle cx="${X(r.lam)}" cy="${Y(sig)}" r="7" fill="${bad ? COL.s : COL.p}" stroke="#fff" stroke-width="2"/>`;
  s += text(pl + 4, pt - 10, 'σ [MPa]', '', 'start') + text(W - pr, H - 2, 'λ = KL/r', '', 'end') + text(pl - 3, Y(st.Sy) + 4, num(st.Sy, 0), 'var(--muted)', 'end');
  return s + '</svg>';
}

export function renderBuck(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>⇩ קריסת עמודים</h2><p class="small muted">עמוד ארוך ודק בלחיצה לא נכשל בכניעה, הוא מתכופף הצידה (קורס) במאמץ נמוך בהרבה. מה שקובע הוא התמירות ${ltr('λ = KL/r')}: אורך אפקטיבי חלקי רדיוס ההתמד.</p></div>
    <div class="card pg-stage"><div id="bkCol"></div><div id="bkChart"></div></div>
    <div class="card" id="bkEd"></div>
    <div class="card" id="bkRes"></div>`;
  const cv = root.querySelector('#bkCol'), ch = root.querySelector('#bkChart'), ed = root.querySelector('#bkEd'), out = root.querySelector('#bkRes');
  const mm = (f, lab) => slider(f, lab, ltr(`${num(st[f], 0)} mm`), LIM[f], 1, st[f]);
  const editor = () => `<h3 class="pg-h">תנאי קצה</h3>${chips(Object.entries(ENDS).map(([k, v]) => [k, `${v.name} (K = ${v.K})`]), st.ends, 'ends')}
    <h3 class="pg-h">חתך</h3>${chips(Object.entries(KINDS), st.kind, 'kind')}
    ${st.kind === 'rod' ? mm('d', 'קוטר d') : st.kind === 'tube' ? mm('D', 'קוטר חיצוני D') + slider('t', 'עובי דופן t', ltr(`${num(st.t, 1)} mm`), LIM.t, 0.5, st.t) : mm('b', 'רוחב b') + mm('h', 'עובי h')}
    <h3 class="pg-h">חומר ועומס</h3>${chips(Object.entries(MATS).map(([k, v]) => [k, `${v.name} (E = ${num(v.E / 1e9, 1)} GPa)`]), st.mat, 'mat')}
    ${slider('Sy', 'חוזק כניעה Sy', ltr(`${num(st.Sy, 0)} MPa`), LIM.Sy, 5, st.Sy)}${slider('L', 'אורך L', ltr(`${num(st.L, 2)} m`), LIM.L, 0.05, st.L)}${slider('lP', 'עומס לחיצה P', ltr(si(P(), 'N')), LIM.lP, 0.01, st.lP)}`;
  const results = (r) => {
    const st1 = r.n < 1 ? `<div class="pg-status bad">העמוד קורס: ${ltr(`P = ${si(P(), 'N')}`)} גדול מ-${ltr(`Pcr = ${si(r.Pcr, 'N')}`)}.</div>`
      : `<div class="pg-status ${r.n < 2 ? 'warn' : 'good'}">מחזיק, עם מקדם ביטחון לקריסה ${ltr(`n = ${num(r.n, 2)}`)}.${r.n < 2 ? ' בקריסה נהוג מרווח גדול, כי סטייה קטנה בישרות או בעומס מורידה את העומס הקריטי.' : ''}</div>`;
    return `${st1}<div class="pg-max">
      <div><span>שטח ${ltr('A')}</span><b>${ltr(`${num(r.A * 1e6, 1)} mm²`)}</b></div><div><span>מומנט התמד ${ltr('I')} (הציר החלש)</span><b>${ltr(`${num(r.I * 1e12, 0)} mm⁴`)}</b></div>
      <div><span>רדיוס התמד</span><b>${ltr(`r = √(I/A) = ${num(r.r * 1000, 2)} mm`)}</b></div><div><span>תמירות</span><b>${ltr(`λ = KL/r = ${num(r.lam, 0)}`)}</b></div>
      <div><span>גבול Euler/Johnson</span><b>${ltr(`λ1 = π√(2E/Sy) = ${num(r.lam1, 0)}`)}</b></div><div><span>שיטה</span><b>${r.euler ? 'Euler (עמוד ארוך)' : 'Johnson (עמוד בינוני)'}</b></div>
      <div><span>מאמץ קריסה</span><b>${ltr(`σcr = ${num(r.scr / 1e6, 0)} MPa`)}</b></div><div><span>עומס קריסה</span><b>${ltr(`Pcr = ${si(r.Pcr, 'N')}`)}</b></div>
      <div><span>מאמץ בפועל</span><b>${ltr(`P/A = ${num(r.sigma / 1e6, 1)} MPa`)}</b></div><div><span>עומס כניעה בלבד</span><b>${ltr(`Sy·A = ${si(r.Py, 'N')}`)}</b></div></div>
      <p class="small">${ltr('Euler: Pcr = π²EI/(KL)²')}. ${ltr('Johnson: σcr = Sy − (Sy·λ/2π)²/E')}. הם נפגשים ב-${ltr('λ1')} במאמץ ${ltr('Sy/2')}. מתחת ל-${ltr('λ1')} נוסחת Euler נותנת מאמץ גבוה מדי (הקו המקווקו), ולכן משתמשים ב-Johnson.</p>
      <p class="small"><b>מה כדאי לנסות:</b> בעמוד ארוך, הגדל את ${ltr('Sy')}: עומס הקריסה לא משתנה, כי Euler תלוי רק ב-${ltr('E')}. פלדה חזקה יותר לא עוזרת, קיבוע הקצוות כן (פי 4 מפרק-פרק לקבוע-קבוע). החלף מוט מלא בצינור עם שטח דומה: ${ltr('r')} גדל, והעמוד חזק הרבה יותר באותו משקל. פס שטוח קורס סביב הציר החלש שלו.</p>
      <p class="small muted">ערכי K כאן הם התאורטיים. בתכן אמיתי לוקחים ערכים גדולים יותר, כי קיבוע מלא לא קיים במציאות. E מטבלה A-5. המקור: ${SRC_C}.</p>`;
  };
  const refresh = (full = true) => {
    const r = A(); cv.innerHTML = columnSvg(r); ch.innerHTML = chartSvg(r); out.innerHTML = results(r);
    if (full) ed.innerHTML = editor();
    else { const tmp = document.createElement('div'); tmp.innerHTML = editor(); const nb = tmp.querySelectorAll('.pg-range b'); ed.querySelectorAll('.pg-range b').forEach((b, i) => { if (nb[i]) b.innerHTML = nb[i].innerHTML; }); }
  };
  refresh();
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]'); if (!b || !['ends', 'kind', 'mat'].includes(b.dataset.act)) return;
    st[b.dataset.act] = b.dataset.v; clamp(); save(); refresh();
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!f || !(f in LIM)) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    st[f] = v; clamp(); save(); refresh(false);
  });
}
