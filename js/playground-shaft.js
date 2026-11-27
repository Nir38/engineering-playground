// playground-shaft.js: the playground's shaft-design mode. A shaft on two bearings with a gear and a
// shoulder, the bending-moment diagram, and the diameter for a target factor of safety by DE-Goodman,
// with Kt/Kf at the shoulder, the Marin factors and the yield check. Math: js/shaft.js (tests/shaft-cases.mjs).
import { designShaft, nDEG, SRC_SH } from './shaft.js';
import { STEELS, SURF, REL } from './fatigue.js';
import { ltr, num, text, arrow, slider, chips, plot, COL, go } from './elec-ui.js';

const KEY = 'mh-pg-shaft-v1';
const LIM = { P: [0.5, 100], rpm: [50, 3000], F: [100, 20000], L: [100, 1000], aL: [0.1, 0.9], Dd: [1.05, 1.5], rd: [0.02, 0.2], n: [1.2, 4] };
const defaults = () => ({ P: 15, rpm: 1000, F: 4000, L: 300, aL: 0.33, Dd: 1.2, rd: 0.05, n: 2, mat: '1045CD', surf: 'machined', rel: 90 });
let st = null;
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') for (const k of Object.keys(st)) if (typeof s[k] === typeof st[k] && (typeof s[k] !== 'number' || Number.isFinite(s[k]))) st[k] = s[k]; } catch (e) { /* ignore */ }
  if (!STEELS[st.mat]) st.mat = '1045CD'; if (!SURF[st.surf]) st.surf = 'machined'; if (!(st.rel in REL)) st.rel = 90;
  for (const [k, [a, b]] of Object.entries(LIM)) st[k] = Math.min(b, Math.max(a, st[k]));
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
const inp = () => ({ P: st.P, rpm: st.rpm, F: st.F, a: st.aL * st.L, L: st.L, Dd: st.Dd, rd: st.rd, Sut: STEELS[st.mat].Sut, Sy: STEELS[st.mat].Sy, surf: st.surf, ke: REL[st.rel], n: st.n });

function drawing(s) {
  const W = 360, H = 228, x0 = 30, x1 = 330, cy = 92, X = (f) => x0 + f * (x1 - x0), ga = X(st.aL), rD = 16, rd = rD / st.Dd;
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" role="img" aria-label="הציר, המיסבים, גלגל השיניים ודיאגרמת המומנט">`;
  // shaft: thick (D) to the right of the shoulder at the gear, thin (d) to the left
  svg += `<rect x="${x0 - 6}" y="${cy - rd}" width="${ga - x0 + 6}" height="${2 * rd}" fill="var(--surface-2)" stroke="var(--text)" stroke-width="1.4"/><rect x="${ga}" y="${cy - rD}" width="${x1 + 6 - ga}" height="${2 * rD}" fill="var(--surface-2)" stroke="var(--text)" stroke-width="1.4"/>`;
  svg += `<circle cx="${ga}" cy="${cy - rd}" r="7" fill="${COL.s}" opacity="0.35"/><circle cx="${ga}" cy="${cy + rd}" r="7" fill="${COL.s}" opacity="0.35"/>`;
  // gear and bearings
  svg += `<rect x="${ga + 4}" y="${cy - 40}" width="14" height="80" fill="${COL.i}" opacity="0.35" stroke="${COL.i}"/>` + text(ga - 4, cy - 26, 'גלגל', COL.i, 'end');
  for (const bx of [x0, x1]) svg += `<polygon points="${bx},${cy + rD + 2} ${bx - 9},${cy + rD + 16} ${bx + 9},${cy + rD + 16}" fill="none" stroke="var(--muted)" stroke-width="1.5"/>`;
  svg += arrow(ga + 11, cy - 64, ga + 11, cy - 42, COL.s, 2.5, 7) + text(ga + 18, cy - 54, `F = ${num(st.F / 1000, 1)} kN`, COL.s, 'start');
  svg += text(ga - 6, cy + 32, 'כתף', COL.s, 'end');
  // bending moment diagram
  const yb = 208, hM = 46;
  svg += `<polygon points="${x0},${yb} ${ga},${yb - hM} ${x1},${yb}" fill="${COL.v}" opacity="0.18" stroke="${COL.v}" stroke-width="1.5"/><line x1="${x0}" y1="${yb}" x2="${x1}" y2="${yb}" stroke="var(--muted)"/>`;
  svg += text(ga, yb - hM - 6, `M = ${num(s.M, 0)} N·m`, COL.v) + text(x0, yb + 14, 'מומנט כפיפה', 'var(--muted)', 'start') + text(x1, yb + 14, `L = ${num(st.L, 0)} mm`, 'var(--muted)', 'end');
  return svg + '</svg>';
}

export function renderShaft(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>⌀ תכן ציר</h2><p class="small muted">ציר מסתובב מעביר מומנט פיתול קבוע, וכוח הגלגל מכופף אותו. כי הציר מסתובב, כל נקודה על פניו עוברת בכל סיבוב ממתיחה ללחיצה: כפיפה מתחלפת. לכן תכן ציר הוא תכן לעייפות, והמקום הקריטי הוא הכתף, שם יש ריכוז מאמץ.</p></div>
    <div class="card pg-stage"><div id="shDraw" style="margin-top:22px"></div><div id="shPlot"></div></div>
    <div class="card" id="shEd"></div>
    <div class="card" id="shRes"></div>`;
  const dv = root.querySelector('#shDraw'), pv = root.querySelector('#shPlot'), ed = root.querySelector('#shEd'), out = root.querySelector('#shRes');
  const editor = () => `<h3 class="pg-h">עומס</h3>${slider('P', 'הספק P', ltr(`${num(st.P, 1)} kW`), LIM.P, 0.5, st.P)}${slider('rpm', 'מהירות n', ltr(`${num(st.rpm, 0)} rpm`), LIM.rpm, 10, st.rpm)}
    ${slider('F', 'כוח רדיאלי של הגלגל F', ltr(`${num(st.F, 0)} N`), LIM.F, 50, st.F)}${slider('L', 'מרחק בין המיסבים L', ltr(`${num(st.L, 0)} mm`), LIM.L, 10, st.L)}${slider('aL', 'מיקום הגלגל a/L', ltr(num(st.aL, 2)), LIM.aL, 0.01, st.aL)}
    <h3 class="pg-h">הכתף</h3>${slider('Dd', 'יחס הקטרים D/d', ltr(num(st.Dd, 2)), LIM.Dd, 0.01, st.Dd)}${slider('rd', 'רדיוס הפילט r/d', ltr(num(st.rd, 3)), LIM.rd, 0.005, st.rd)}
    <h3 class="pg-h">חומר ודרישה</h3>${chips(Object.entries(STEELS).map(([k, m]) => [k, `⁦${m.name}⁩`]), st.mat, 'mat')}${chips(Object.entries(SURF).map(([k, v]) => [k, v.name]), st.surf, 'surf')}
    ${chips(Object.keys(REL).sort((a, b) => a - b).map((k) => [k, `אמינות ${k}%`]), st.rel, 'rel')}${slider('n', 'מקדם ביטחון נדרש n', ltr(num(st.n, 1)), LIM.n, 0.1, st.n)}`;
  const results = (s) => {
    const ok = s.ny >= 1 && s.nf >= st.n - 1e-9;
    return `<div class="pg-status ${ok ? 'good' : 'warn'}">קוטר נדרש בכתף: ${ltr(`d = ${num(s.d, 1)} mm`)}, ובעיגול למעלה ${ltr(`${s.dUse} mm`)}: עייפות ${ltr(`n = ${num(s.nf, 2)}`)}, כניעה ${ltr(`ny = ${num(s.ny, 2)}`)}.</div>
      <div class="pg-max">
      <div><span>מומנט פיתול</span><b>${ltr(`T = P/ω = ${num(s.T, 1)} N·m`)}</b></div><div><span>מומנט כפיפה בגלגל</span><b>${ltr(`M = F·a·b/L = ${num(s.M, 1)} N·m`)}</b></div>
      <div><span>ריכוז מאמץ בכתף</span><b>${ltr(`Kt = ${num(s.Kt, 2)}, Kts = ${num(s.Kts, 2)}`)}</b></div><div><span>רגישות לחריץ</span><b>${ltr(`q = ${num(s.q, 2)}, qs = ${num(s.qs, 2)}`)}</b></div>
      <div><span>מקדמי עייפות</span><b>${ltr(`Kf = ${num(s.Kf, 2)}, Kfs = ${num(s.Kfs, 2)}`)}</b></div><div><span>גבול עייפות</span><b>${ltr(`Se = ${num(s.f.ka, 2)}·${num(s.f.kb, 2)}·${num(s.f.ke, 2)}·Se' = ${num(s.Se, 0)} MPa`)}</b></div></div>
      <p class="small">${ltr('d = [16n/π · (2·Kf·Ma/Se + √3·Kfs·Tm/Sut)]^⅓')} (DE-Goodman, כפיפה מתחלפת ופיתול קבוע). כי ${ltr('kb')}, ${ltr('Kt')} ו-${ltr('q')} תלויים בקוטר, החישוב חוזר על עצמו עד שהקוטר מתייצב, בדיוק כמו בפתרון ידני.</p>
      <p class="small"><b>מה כדאי לנסות:</b> הקטן את רדיוס הפילט וראה את הציר מתעבה. הורד את המהירות באותו הספק: המומנט עולה והציר מתעבה. הזז את הגלגל קרוב למיסב: המומנט יורד. החלף לפלדה חזקה יותר: הקוטר יורד פחות ממה שמצפים, כי ${ltr('Se')} לא גדל באותו יחס כמו ${ltr('Sut')}, וגם הרגישות לחריץ עולה.</p>
      <p class="small muted">מודל: ציר על שני מיסבים עם גלגל אחד, והכתף בצד הגלגל שבו המומנט מקסימלי. בתכן מלא בודקים כל כתף, חריץ ותעלת שגם לאורך הציר, ובודקים גם שקיעה, שיפוע במיסבים ומהירות קריטית. ${ltr('Kt')} לפי ${go('kt', '✱ ריכוזי מאמץ')}, ${ltr('Se')} לפי ${go('fat', '⟳ עייפות')}. המקור: ${SRC_SH}.</p>`;
  };
  const refresh = (full = true) => {
    const s = designShaft(inp()); dv.innerHTML = drawing(s);
    const lo = Math.floor((s.d * 0.6) / 5) * 5, hi = lo + 2 * Math.ceil((s.d * 1.6 - lo) / 10) * 5, xs = [], ys = []; for (let i = 0; i <= 40; i++) { const d = lo + ((hi - lo) * i) / 40; xs.push(d); ys.push(nDEG({ d, Ma: s.M, Tm: s.T, Kf: s.Kf, Kfs: s.Kfs, Se: s.Se, Sut: STEELS[st.mat].Sut })); }
    pv.innerHTML = plot({ xs, series: [{ ys, col: COL.v, label: 'n (עייפות)' }, { ys: xs.map(() => st.n), col: COL.s, label: 'n נדרש', dash: '4 3', w: 1.2 }], units: { x: 'd [mm]', l: 'n' }, marks: [{ x: s.d, label: `${num(s.d, 1)} mm`, col: COL.s }], H: 130 });
    out.innerHTML = results(s);
    if (full) ed.innerHTML = editor();
    else { const tmp = document.createElement('div'); tmp.innerHTML = editor(); const nb = tmp.querySelectorAll('.pg-range b'); ed.querySelectorAll('.pg-range b').forEach((b, i) => { if (nb[i]) b.innerHTML = nb[i].innerHTML; }); }
  };
  refresh();
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]'); if (!b || !['mat', 'surf', 'rel'].includes(b.dataset.act)) return;
    st[b.dataset.act] = b.dataset.act === 'rel' ? Number(b.dataset.v) : b.dataset.v; save(); refresh();
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (!f || !(f in LIM)) return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    st[f] = Math.min(LIM[f][1], Math.max(LIM[f][0], v)); save(); refresh(false);
  });
}
