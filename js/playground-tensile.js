// playground-tensile.js: the playground's tensile test. A dog-bone specimen that stretches, necks and breaks,
// the engineering stress-strain curve with the current point, 0.2% offset, unloading line, true curve,
// a second material to compare, and E, Sy, Sut, elongation, resilience and toughness.
// Model and data: js/tensile.js (tests/tensile-cases.mjs).
import { model, permanent, trueSS, MATS, SRC_T } from './tensile.js';
import { ltr, num, text, chips, slider, COL } from './elec-ui.js';

const KEY = 'mh-pg-tensile-v1';
const defaults = () => ({ mat: 's1020', cmp: 'none', e: 0.05, zoom: 'all', unload: false, tru: false });
let st = null;
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') for (const k of Object.keys(st)) if (typeof s[k] === typeof st[k]) st[k] = s[k]; } catch (e) { /* ignore */ }
  if (!MATS[st.mat]) st.mat = 's1020'; if (st.cmp !== 'none' && !MATS[st.cmp]) st.cmp = 'none'; if (!['all', 'el'].includes(st.zoom)) st.zoom = 'all';
  st.e = Math.min(model(st.mat).ef * 1.05, Math.max(0, Number.isFinite(st.e) ? st.e : 0.05));
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };

function specimen(m) {
  const W = 360, H = 90, cy = 45, e = Math.min(st.e, m.ef), broken = st.e > m.ef, g0 = 140, g = g0 * (1 + e * 1.2), x0 = (W - g) / 2 - 50, x1 = (W + g) / 2 + 50;
  const neck = e > m.eu ? Math.min(1, (e - m.eu) / (m.ef - m.eu)) : 0, hw = 12 * (1 - 0.15 * Math.min(e, m.eu) / Math.max(m.eu, 1e-6)), nw = hw * (1 - 0.45 * neck), mid = W / 2;
  const col = broken ? COL.s : e > m.Sy / m.Emod + 0.002 ? COL.i : COL.v;
  // outline of the top half from left to right; the bottom is its mirror
  const top = [[x0, 22], [x0 + 40, 22], [x0 + 50, hw + 4], [x0 + 56, hw], [mid - 34, hw], [mid - 14, (hw + nw) / 2], [mid, nw], [mid + 14, (hw + nw) / 2], [mid + 34, hw], [x1 - 56, hw], [x1 - 50, hw + 4], [x1 - 40, 22], [x1, 22]];
  const pts = [...top.map(([x, h]) => `${x.toFixed(1)},${(cy - h).toFixed(1)}`), ...top.slice().reverse().map(([x, h]) => `${x.toFixed(1)},${(cy + h).toFixed(1)}`)].join(' ');
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="דגם המתיחה">`;
  s += `<polygon points="${pts}" fill="${col}" fill-opacity="0.25" stroke="${col}" stroke-width="1.5"/>`;
  if (broken) s += `<rect x="${mid - 3}" y="${cy - 26}" width="6" height="52" fill="var(--surface)"/>`;
  s += `<rect x="${x0 - 14}" y="${cy - 28}" width="16" height="56" fill="var(--muted)" opacity="0.6"/><rect x="${x1 - 2}" y="${cy - 28}" width="16" height="56" fill="var(--muted)" opacity="0.6"/>`;
  s += text(mid, 12, broken ? 'נשבר!' : neck > 0 ? 'צוואר (necking)' : e > m.Sy / m.Emod + 0.002 ? 'פלסטי' : 'אלסטי', col);
  return s + '</svg>';
}

function chart(m, c) {
  const W = 360, H = 240, pl = 40, pr = 12, pt = 30, pb = 26, el = st.zoom === 'el';
  const xmax = el ? Math.max(0.006, (m.Sy / m.Emod) * 3) : Math.max(m.ef, c ? c.ef : 0) * 1.08;
  const curves = [m, c].filter(Boolean), ymax = Math.max(...curves.map((q) => q.Sut * (st.tru ? (1 + q.eu) : 1))) * 1.12;
  const X = (e) => pl + (e / xmax) * (W - pl - pr), Y = (s) => H - pb - (s / ymax) * (H - pt - pb);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="עקום מאמץ-עיבור"><defs><clipPath id="tsClip"><rect x="${pl}" y="${pt - 4}" width="${W - pl - pr}" height="${H - pt - pb + 4}"/></clipPath></defs>`;
  s += `<line x1="${pl}" y1="${H - pb}" x2="${W - pr}" y2="${H - pb}" stroke="var(--muted)"/><line x1="${pl}" y1="${pt}" x2="${pl}" y2="${H - pb}" stroke="var(--muted)"/>`;
  const path = (q, col, dash, upTo = q.ef) => { let p = ''; const n = 160; for (let i = 0; i <= n; i++) { const e = (Math.min(upTo, xmax) * i) / n, sg = q.sigma(e); p += `${X(e).toFixed(1)},${Y(sg).toFixed(1)} `; } return `<polyline clip-path="url(#tsClip)" points="${p}" fill="none" stroke="${col}" stroke-width="2.2" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`; };
  if (c) s += path(c, COL.q, '5 3') + text(X(Math.min(c.ef, xmax)) - 2, Y(c.sigma(Math.min(c.ef, xmax))) - 6, c.name, COL.q, 'end');
  s += path(m, COL.v);
  if (st.tru) { let p = ''; for (let i = 0; i <= 80; i++) { const e = (Math.min(m.eu, xmax) * i) / 80, t = trueSS(m.sigma(e), e); p += `${X(t.e).toFixed(1)},${Y(t.s).toFixed(1)} `; } s += `<polyline clip-path="url(#tsClip)" points="${p}" fill="none" stroke="${COL.p}" stroke-width="2" stroke-dasharray="2 3"/>` + text(X(Math.log(1 + Math.min(m.eu, xmax))), Y(m.Sut * (1 + m.eu)) - 6, 'אמיתי', COL.p, 'end'); }
  // 0.2% offset and markers
  const ey = m.Sy / m.Emod + 0.002;
  s += `<line clip-path="url(#tsClip)" x1="${X(0.002)}" y1="${Y(0)}" x2="${X(0.002 + (m.Sy * 1.15) / m.Emod)}" y2="${Y(m.Sy * 1.15)}" stroke="var(--muted)" stroke-dasharray="3 3"/>`;
  s += `<circle cx="${X(ey)}" cy="${Y(m.Sy)}" r="3.5" fill="${COL.i}"/>` + text(X(ey) + 5, Y(m.Sy) + 12, 'Sy', COL.i, 'start');
  if (!el) s += `<circle cx="${X(m.eu)}" cy="${Y(m.Sut)}" r="3.5" fill="${COL.s}"/>` + text(X(m.eu), Y(m.Sut) - 7, 'Sut', COL.s) + `<circle cx="${X(m.ef)}" cy="${Y(m.sigma(m.ef))}" r="3.5" fill="var(--text)"/>` + text(X(m.ef) - 3, Y(m.sigma(m.ef)) + 14, 'שבר', '', 'end');
  // unloading line from the current point
  const e = Math.min(st.e, m.ef), sg = m.sigma(e);
  if (st.unload && e > ey * 0.5 && e <= m.ef) { const ep = permanent(m, e); s += `<line x1="${X(e)}" y1="${Y(sg)}" x2="${X(ep)}" y2="${Y(0)}" stroke="${COL.s}" stroke-width="1.8" stroke-dasharray="4 2"/>` + text(X(ep), H - pb + 12, 'עיבור קבוע', COL.s); }
  if (st.e <= xmax) s += `<circle cx="${X(e)}" cy="${Y(sg)}" r="7" fill="${COL.i}" stroke="#fff" stroke-width="2"/>`;
  s += text(W - pr, H - 2, 'ε (עיבור)', '', 'end') + text(pl + 70, pt - 10, 'σ [MPa]', '', 'start') + text(pl - 3, Y(m.Sut) + 3, num(m.Sut, 0), 'var(--muted)', 'end') + text(pl - 3, Y(m.Sy) + 3, num(m.Sy, 0), 'var(--muted)', 'end');
  return s + '</svg>';
}

export function renderTensile(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>📈 ניסוי מתיחה</h2><p class="small muted">מותחים דגם עד שהוא נשבר ומודדים כוח והתארכות. בהתחלה הוא קפיץ (אלסטי), אחר כך נכנע ומתארך לצמיתות (פלסטי), מתחזק (התקשות בעיבוד), יוצר צוואר ונשבר. גרור את העיבור או לחץ "הפעל".</p></div>
    <div class="card pg-stage"><div id="tsSpec" style="margin-top:22px"></div><div id="tsChart"></div></div>
    <div class="card" id="tsEd"></div>
    <div class="card" id="tsRes"></div>`;
  const sp = root.querySelector('#tsSpec'), ch = root.querySelector('#tsChart'), ed = root.querySelector('#tsEd'), out = root.querySelector('#tsRes');
  const editor = () => { const m = model(st.mat); return `${slider('e', 'עיבור ε (התארכות יחסית)', ltr(`${num(st.e * 100, 2)}%`), [0, +(m.ef * 1.05).toFixed(4)], 0.0005, st.e)}
    <div class="chips"><button class="chip" data-act="play">▶ הפעל ניסוי</button><button class="chip" data-act="unload" aria-pressed="${st.unload}">↘ פריקה מהנקודה</button><button class="chip" data-act="tru" aria-pressed="${st.tru}">עקום אמיתי</button><button class="chip" data-act="zoom" aria-pressed="${st.zoom === 'el'}">🔍 אזור אלסטי</button></div>
    <h3 class="pg-h">חומר</h3>${chips(Object.entries(MATS).map(([k, v]) => [k, v.name]), st.mat, 'mat')}
    <h3 class="pg-h">השוואה ל</h3>${chips([['none', 'בלי'], ...Object.entries(MATS).filter(([k]) => k !== st.mat).map(([k, v]) => [k, v.name])], st.cmp, 'cmp')}`; };
  const results = (m) => {
    const e = Math.min(st.e, m.ef), sg = m.sigma(e), ep = permanent(m, e);
    return `<div class="pg-max">
      <div><span>מודול אלסטיות</span><b>${ltr(`E = ${num(m.E, 1)} GPa`)}</b></div><div><span>חוזק כניעה (0.2%)</span><b>${ltr(`Sy = ${m.Sy} MPa`)}</b></div>
      <div><span>חוזק מתיחה</span><b>${ltr(`Sut = ${m.Sut} MPa`)}</b></div><div><span>התארכות בשבר</span><b>${ltr(`${m.el}%`)}</b></div>
      <div><span>אנרגיה אלסטית (resilience)</span><b>${ltr(`Ur = Sy²/2E = ${num(m.Ur * 1000, 0)} kJ/m³`)}</b></div><div><span>קשיחות (toughness, שטח העקום)</span><b>${ltr(`≈ ${num(m.Ut, 0)} MJ/m³`)}</b></div>
      <div><span>בנקודה</span><b>${ltr(st.e > m.ef ? 'נשבר' : `σ = ${num(sg, 0)} MPa`)}</b></div><div><span>עיבור קבוע אם פורקים</span><b>${ltr(st.e > m.ef ? '—' : `${num(ep * 100, 2)}%`)}</b></div></div>
      <p class="small"><b>מה כדאי לנסות:</b> לחץ "פריקה מהנקודה" אחרי הכניעה: הפריקה מקבילה לקו האלסטי, ונשאר עיבור קבוע. אם מותחים שוב, החומר ייכנע רק במאמץ שבו עצרת: זו התקשות בעיבוד, ולכן פלדה משוכה בקר (CD) חזקה יותר ופחות רקיעה מאותה פלדה מעורגלת בחם. השווה פלדה לאלומיניום: אותו גרף בהגדלה מראה ש-E של אלומיניום שליש מפלדה. "עקום אמיתי" מחשב לפי שטח החתך הרגעי, ולכן הוא ממשיך לעלות.</p>
      <p class="small muted">${ltr('E, Sy, Sut')} וההתארכות מהטבלאות: ${m.src} (ערכי מינימום בפלדות, ערכים טיפוסיים בחומרים מחושלים). צורת העקום בין הנקודות היא מודל (Ramberg-Osgood עד המקסימום, וירידה בצוואר) ונועדה להמחשה, ולכן גם הקשיחות היא הערכה. ההתארכות של הדגם בציור מוגזמת. המקורות: ${SRC_T}.</p>`;
  };
  const refresh = (full = true) => {
    const m = model(st.mat), c = st.cmp !== 'none' ? model(st.cmp) : null;
    sp.innerHTML = specimen(m); ch.innerHTML = chart(m, c); out.innerHTML = results(m);
    if (full) ed.innerHTML = editor();
    else { const b = ed.querySelector('.pg-range b'); if (b) b.innerHTML = ltr(`${num(st.e * 100, 2)}%`); const r = ed.querySelector('[data-f="e"]'); if (r && r !== document.activeElement) r.value = st.e; }
  };
  refresh();
  let anim = 0;
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'play') {
      cancelAnimationFrame(anim); const m = model(st.mat); st.e = 0; let last = 0;
      const tick = (t) => { if (!root.isConnected) return; if (last) { const dt = (t - last) / 1000; st.e += dt * (st.e < m.Sy / m.Emod * 2 ? m.Sy / m.Emod : m.ef / 5); if (st.e >= m.ef * 1.02) { st.e = m.ef * 1.02; refresh(false); save(); return; } refresh(false); } last = t; anim = requestAnimationFrame(tick); };
      anim = requestAnimationFrame(tick); return;
    }
    cancelAnimationFrame(anim);
    if (act === 'mat') { st.mat = b.dataset.v; if (st.cmp === st.mat) st.cmp = 'none'; st.e = Math.min(st.e, model(st.mat).ef * 1.05); }
    else if (act === 'cmp') st.cmp = b.dataset.v;
    else if (act === 'unload') st.unload = !st.unload;
    else if (act === 'tru') st.tru = !st.tru;
    else if (act === 'zoom') st.zoom = st.zoom === 'el' ? 'all' : 'el';
    else return;
    save(); refresh();
  });
  root.addEventListener('input', (ev) => {
    if (ev.target.dataset.f !== 'e') return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    cancelAnimationFrame(anim); st.e = v; save(); refresh(false);
  });
}
