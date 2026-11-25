// playground-tunnel.js: the playground's live wind tunnel. A real (viscous) 2D flow solved in the
// browser with the lattice Boltzmann method (js/lbm.js): wakes, separation and vortex streets.
import { createTunnel, U_IN, NU_MIN, pointInPoly, rotatePoly, frontal, sheddingPeriod } from './lbm.js';
import { makeAirfoil, paramsFrom } from './airfoil.js';
import { esc } from './text.js';

const KEY = 'mh-pg-tunnel-v1';
const NX = 150, NY = 96, W = 360, H = 230, CX = 40, CY = 47.7; // the body sits a hair off centre so the wake can choose a side
const SHAPES = [
  { id: 'cyl', name: 'גליל', angle: false, Re: 100 },
  { id: 'plate', name: 'לוח', angle: true, a0: 90, Re: 100 },
  { id: 'square', name: 'ריבוע', angle: true, a0: 0, Re: 100 },
  { id: 'wing', name: 'כנף', angle: true, a0: 8, Re: 400 },
  { id: 'car', name: 'מכונית', angle: false, Re: 250 },
  { id: 'draw', name: 'ציור חופשי', angle: false, Re: 150 },
];
const VIEWS = [['curl', 'סחרור'], ['speed', 'מהירות'], ['p', 'לחץ']];
let st = null;
const defaults = () => ({ shape: 'cyl', angle: 0, Re: 100, view: 'curl', tool: 'flow', mask: '' });
function load() {
  st = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') { if (SHAPES.some((q) => q.id === s.shape)) st.shape = s.shape; for (const k of ['angle', 'Re']) if (Number.isFinite(s[k])) st[k] = s[k]; if (VIEWS.some(([v]) => v === s.view)) st.view = s.view; if (typeof s.mask === 'string') st.mask = s.mask; } } catch (e) { /* ignore */ }
}
const save = () => { try { const { tool, ...rest } = st; localStorage.setItem(KEY, JSON.stringify(rest)); } catch (e) { /* ignore */ } };
// solid cells <-> run lengths (fluid, solid, fluid, ...)
const encode = (a) => { const out = []; let cur = 0, n = 0; for (let k = 0; k < a.length; k++) { if (a[k] !== cur) { out.push(n); cur = a[k]; n = 0; } n++; } out.push(n); return out.join(','); };
const decode = (s, a) => { a.fill(0); if (!s) return; let k = 0, v = 0; for (const n of s.split(',').map(Number)) { if (!Number.isFinite(n)) return; a.fill(v, k, Math.min(a.length, k + n)); k += n; v ^= 1; } };

function carPoly() { // a generic car side view, 60 cells long, on the floor (y up)
  const P = [[0, 9], [2, 14], [14, 17], [24, 18], [32, 27], [46, 27], [54, 19], [60, 17], [60, 8], [56, 5], [4, 5], [0, 7]];
  return P.map(([x, y]) => [x + 22, y + 3]); // a small gap under the wheels, so air can pass beneath
}
function paint(T) {
  const sh = st.shape, s = T.solid; s.fill(0);
  if (sh === 'draw') { decode(st.mask, s); return; }
  let inside;
  if (sh === 'cyl') inside = (x, y) => (x - CX) ** 2 + (y - CY) ** 2 <= 64;
  else if (sh === 'plate' || sh === 'square') {
    const w = sh === 'plate' ? 1.5 : 8, P = rotatePoly([[CX - 8, CY - w], [CX + 8, CY - w], [CX + 8, CY + w], [CX - 8, CY + w]], CX, CY, st.angle);
    inside = (x, y) => pointInPoly(x, y, P);
  } else if (sh === 'wing') {
    const a = makeAirfoil({ ...paramsFrom(0.12, 0.03), alphaDeg: 0 }), P = rotatePoly(a.outline.map((p) => [CX + 2 + p.x * 10, CY + p.y * 10]), CX + 2, CY, -st.angle);
    inside = (x, y) => pointInPoly(x, y, P);
  } else if (sh === 'car') {
    const P = carPoly(), wheel = (x, y, cx) => (x - cx) ** 2 + (y - 8) ** 2 <= 16;
    inside = (x, y) => pointInPoly(x, y, P) || wheel(x, y, 33) || wheel(x, y, 71);
  }
  for (let y = 1; y < NY - 1; y++) for (let x = 1; x < NX - 1; x++) if (inside(x + 0.5, y + 0.5)) s[y * NX + x] = 1;
}
const refLen = (T) => (st.shape === 'wing' ? 40 : Math.max(1, frontal(T))); // chord for the wing, frontal height for the rest
const reMax = (T) => Math.floor((U_IN * refLen(T)) / NU_MIN / 10) * 10;
// the Re the user asked for, limited by what this body allows (a small drawing allows less)
const reEff = () => Math.max(10, Math.min(st.Re, reMax(TT)));
let TT = null;

const num = (n, d = 3) => (Number.isFinite(n) ? String(Number(n.toPrecision(d))) : '—');
const ltr = (s) => `<span class="ltr">${esc(s)}</span>`;
function rgbOf(css, fb) { const m = /^#([0-9a-f]{6})$/i.exec(css.trim()); if (!m) return fb; const v = parseInt(m[1], 16); return [v >> 16, (v >> 8) & 255, v & 255]; }

export function renderTunnel(root) {
  load();
  root.innerHTML = `
    <div class="card pg-intro"><h2>🌬 מנהרת רוח חיה</h2><p class="small muted">זרימה צמיגה אמיתית, מחושבת בזמן אמת בשיטת Lattice Boltzmann: שובל, היפרדות זרימה ושרשרת מערבולות.</p>
      <div class="pg-templates">${SHAPES.map((q) => `<button class="chip" data-shape="${q.id}">${esc(q.name)}</button>`).join('')}</div></div>
    <div class="card pg-stage"><canvas id="pgTunCanvas" class="pg-air-cv" role="img" aria-label="מנהרת רוח: זרימה סביב גוף"></canvas>
      <div class="chips" id="pgTunView"></div><p class="small muted pg-hint" id="pgTunHint"></p></div>
    <div class="card" id="pgTunEdit"></div>
    <div class="card" id="pgTunRes"></div>`;
  const cv = root.querySelector('#pgTunCanvas'), ed = root.querySelector('#pgTunEdit'), out = root.querySelector('#pgTunRes'), vw = root.querySelector('#pgTunView'), hint = root.querySelector('#pgTunHint');
  const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const off = document.createElement('canvas'); off.width = NX; off.height = NY;
  const oc = off.getContext('2d'), img = oc.createImageData(NX, NY);
  const T = createTunnel(NX, NY); TT = T;
  let playing = true, spf = 4, raf = 0, avgFx = 0, avgFy = 0, nAvg = 0, hist = [], lastRes = 0, bg = [18, 30, 32], fg = [229, 238, 236];
  const P = Array.from({ length: 260 }, () => [Math.random() * NX, 1 + Math.random() * (NY - 2)]);

  const theme = () => { const cs = getComputedStyle(document.documentElement); bg = rgbOf(cs.getPropertyValue('--surface'), bg); fg = rgbOf(cs.getPropertyValue('--text'), fg); };
  const resetStats = () => { avgFx = 0; avgFy = 0; nAvg = 0; hist = []; };
  function setup(restart = true) {
    paint(T);
    T.setViscosity((U_IN * refLen(T)) / reEff());
    if (restart) T.reset(); else T.updateSolid();
    resetStats(); theme();
  }
  const mix = (c, t) => [bg[0] + (c[0] - bg[0]) * t, bg[1] + (c[1] - bg[1]) * t, bg[2] + (c[2] - bg[2]) * t];
  const RED = [239, 68, 68], BLUE = [59, 130, 246], YEL = [250, 204, 21];
  function render() {
    const d = img.data, q = 0.5 * U_IN * U_IN;
    for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
      const k = y * NX + x, o = 4 * ((NY - 1 - y) * NX + x); let c;
      if (T.solid[k]) c = fg;
      else if (st.view === 'speed') { const s = Math.min(1, Math.hypot(T.ux[k], T.uy[k]) / (1.6 * U_IN)); c = s < 0.6 ? mix(BLUE, s / 0.6) : s < 0.85 ? [BLUE[0] + (YEL[0] - BLUE[0]) * ((s - 0.6) / 0.25), BLUE[1] + (YEL[1] - BLUE[1]) * ((s - 0.6) / 0.25), BLUE[2] + (YEL[2] - BLUE[2]) * ((s - 0.6) / 0.25)] : [YEL[0] + (RED[0] - YEL[0]) * ((s - 0.85) / 0.15), YEL[1] + (RED[1] - YEL[1]) * ((s - 0.85) / 0.15), YEL[2] + (RED[2] - YEL[2]) * ((s - 0.85) / 0.15)]; }
      else if (st.view === 'p') { const cp = Math.max(-1, Math.min(1, ((T.rho[k] - 1) / 3) / q)); c = mix(cp > 0 ? RED : BLUE, Math.abs(cp)); }
      else { const w = (x > 0 && y > 0 && x < NX - 1 && y < NY - 1) ? T.curl(k) : 0, t = Math.max(-1, Math.min(1, w / 0.03)); c = mix(t > 0 ? RED : BLUE, Math.abs(t)); }
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
    oc.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = true; g.drawImage(off, 0, 0, W, H);
    g.fillStyle = `rgba(${fg.join(',')},0.75)`;
    for (const p of P) { g.fillRect((p[0] / NX) * W - 0.9, H - (p[1] / NY) * H - 0.9, 1.8, 1.8); }
    // wind arrow
    g.strokeStyle = g.fillStyle = `rgb(${fg.join(',')})`; g.lineWidth = 2; g.beginPath(); g.moveTo(8, H - 12); g.lineTo(40, H - 12); g.stroke();
    g.beginPath(); g.moveTo(46, H - 12); g.lineTo(38, H - 16); g.lineTo(38, H - 8); g.closePath(); g.fill();
    g.font = 'bold 12px system-ui, sans-serif'; g.textAlign = 'left'; g.fillText(`Re = ${num(reEff())}`, 52, H - 8);
    if (!playing) { g.textAlign = 'right'; g.fillText('⏸', W - 8, 16); }
  }
  // tracer particles ride the local velocity; new ones enter at the inlet
  function moveParticles(n) {
    for (const p of P) {
      const x = Math.min(NX - 2, Math.max(1, p[0])), y = Math.min(NY - 2, Math.max(1, p[1])), k = Math.floor(y) * NX + Math.floor(x);
      p[0] += T.ux[k] * n; p[1] += T.uy[k] * n;
      if (p[0] >= NX - 1 || p[1] < 1 || p[1] > NY - 2 || T.solid[k]) { p[0] = Math.random() * 3; p[1] = 1 + Math.random() * (NY - 2); }
    }
  }
  function advance(n) {
    for (let i = 0; i < n; i++) {
      T.step(); avgFx += T.Fx; avgFy += T.Fy; nAvg++;
      if (T.steps % 4 === 0) { hist.push([T.steps, T.Fy]); if (hist.length > 1500) hist.shift(); }
    }
    if (nAvg > 6000) { avgFx *= 0.5; avgFy *= 0.5; nAvg *= 0.5; } // a running mean that forgets the start
  }
  // jump ahead: about two trips of the air through the tunnel, in small chunks so the page stays responsive
  let ffLeft = 0;
  function pump() {
    if (!ffLeft || !root.isConnected) return;
    const n = Math.min(150, ffLeft); advance(n); moveParticles(n); ffLeft -= n; render(); out.innerHTML = results();
    if (ffLeft) setTimeout(pump, 0); else all();
  }
  function tick() {
    const t0 = performance.now();
    advance(spf);
    moveParticles(spf);
    const ms = performance.now() - t0; spf = Math.max(1, Math.min(12, Math.round(spf * (ms > 10 ? 0.8 : ms < 6 ? 1.25 : 1)) || 1));
  }
  const loop = (now) => {
    if (!root.isConnected) return;
    if (playing && !ffLeft) tick();
    render();
    if (now - lastRes > 500) { out.innerHTML = results(); lastRes = now; }
    raf = requestAnimationFrame(loop);
  };

  function editor() {
    const sh = SHAPES.find((q) => q.id === st.shape), mx = reMax(T);
    return `<h3 class="pg-h">הגוף והזרימה</h3>
      <label class="pg-range"><span>מספר Reynolds <b>${ltr(`Re = ${num(reEff())}`)}</b></span><input type="range" data-f="Re" min="10" max="${mx}" step="10" value="${reEff()}"></label>
      ${sh.angle ? `<label class="pg-range"><span>${st.shape === 'wing' ? 'זווית התקפה' : 'זווית לזרימה'} <b>${ltr(`${num(st.angle)}°`)}</b></span><input type="range" data-f="angle" min="${st.shape === 'wing' ? -10 : 0}" max="${st.shape === 'wing' ? 30 : 90}" step="1" value="${st.angle}"></label>` : ''}
      <div class="chips"><button class="chip" data-act="play">${playing ? '⏸ השהה' : '▶ המשך'}</button><button class="chip" data-act="ff" ${ffLeft ? 'disabled' : ''}>⏩ קפוץ קדימה</button><button class="chip" data-act="reset">↺ מחדש</button></div>
      <div class="chips"><button class="chip" data-tool="flow" aria-pressed="${st.tool === 'flow'}">👁 צפייה</button><button class="chip" data-tool="paint" aria-pressed="${st.tool === 'paint'}">✏ צייר מכשול</button><button class="chip" data-tool="erase" aria-pressed="${st.tool === 'erase'}">🧽 מחק</button></div>
      <p class="small muted">${ltr(`Re = U·L/ν`)}: יחס בין כוחות האינרציה לכוחות הצמיגות. L הוא ${st.shape === 'wing' ? 'המיתר' : 'הגובה שהרוח רואה'}. כאן ${ltr(`Re`)} עד ${ltr(num(mx))}, כי מעבר לזה החישוב בפלאפון כבר לא יציב.</p>`;
  }
  const NOTES = {
    cyl: 'מתחת לבערך Re = 47 נשארות מאחורי הגליל שתי מערבולות צמודות וסימטריות. מעל זה הן מתחילות להשתחרר לסירוגין: שרשרת Kármán. זה מה שגורם לכבלים ולארובות לזמזם ולרטוט ברוח.',
    plate: 'לוח ניצב לרוח: הזרימה נפרדת מהקצוות החדים, ונוצר שובל רחב עם לחץ נמוך מאחור. זה הגרר הגבוה ביותר כאן. סובב את הלוח ל-0° ותראה כמה הגרר צונח.',
    square: 'בריבוע ההיפרדות קבועה בפינות, ולכן הגרר כמעט לא תלוי ב-Re. בגליל נקודת ההיפרדות זזה.',
    wing: 'בזווית קטנה הזרימה צמודה לכנף, והשובל דק. הגדל את הזווית מעל בערך 15°: הזרימה נפרדת מגב הכנף, מופיעות מערבולות גדולות, והעילוי מפסיק לעלות. זו הזדקרות (stall), מה שבמצב הכנף האידאלי לא ראית.',
    car: 'הרוח נפרדת בקצה הגג ובאחורי המכונית, ונוצר שובל של לחץ נמוך שמושך את המכונית לאחור. רוב הגרר במכונית בא מהשובל הזה, ולכן מעצבים זנב שמצמצם אותו. הרצפה כאן זזה עם הרוח, כמו במנהרות רוח עם מסוע.',
    draw: 'צייר גוף משלך בכלי "צייר מכשול" ונסה: מה קורה לשובל כשמחדדים את הצד האחורי? (רמז: זו הסיבה לצורת טיפה).',
  };
  function results() {
    const L = refLen(T), q = 0.5 * U_IN * U_IN * L, CD = nAvg ? avgFx / nAvg / q : 0, CL = nAvg ? avgFy / nAvg / q : 0;
    const per = sheddingPeriod(hist), St = per ? L / per / U_IN : null, early = T.steps < 3 * NX / U_IN / 2;
    const fl = (T.steps * U_IN) / NX;
    return `<h3 class="pg-h">מדידות</h3>
      <div class="pg-max">
        <div><span>מקדם גרר</span><b>${early ? '…' : ltr(`C_D = ${num(CD)}`)}</b></div>
        <div><span>מקדם עילוי</span><b>${early ? '…' : ltr(`C_L = ${num(Math.abs(CL) < 0.005 ? 0 : CL, 2)}`)}</b></div>
        <div><span>תדירות מערבולות</span><b>${St && !early ? ltr(`St = ${num(St, 2)}`) : 'אין'}</b></div>
        <div><span>זמן ריצה</span><b>${ltr(num(fl, 2))} מעברים</b></div>
      </div>
      <p class="small muted">${early ? 'המדידות מתייצבות אחרי שהאוויר עובר את המנהרה בערך פעם וחצי. ' : ''}ממוצע לאורך זמן. ${ltr('C_D = F/(½ρU²L)')}, ו-${ltr('St = f·L/U')} הוא התדירות חסרת הממדים של השרת המערבולות.</p>
      <p class="small">${NOTES[st.shape]}</p>
      <h3 class="pg-h">כמה זה אמיתי?</h3>
      <p class="small muted">זו זרימה צמיגה אמיתית, אבל דו־ממדית, ב-${ltr('Re')} של עשרות עד מאות. במכונית או במטוס ${ltr('Re')} הוא מיליונים והזרימה טורבולנטית ותלת־ממדית. לכן התמונה נכונה איכותית: היפרדות, שובל ומערבולות. המספרים גבוהים מהספרות, כי קירות המנהרה קרובים והרשת גסה. לגליל ב-${ltr('Re = 100')} יוצא כאן ${ltr('St ≈ 0.2')}, ובספרות, בלי קירות, בערך 0.16.</p>`;
  }
  const viewChips = () => VIEWS.map(([v, t]) => `<button class="chip" data-view="${v}" aria-pressed="${st.view === v}">${t}</button>`).join('');
  const HINTS = { curl: 'סחרור: אדום = סיבוב נגד כיוון השעון, כחול = עם כיוון השעון.', speed: 'מהירות: כחול = איטי, צהוב ואדום = מהיר מהרוח.', p: 'לחץ: אדום = לחץ גבוה, כחול = לחץ נמוך (יניקה).' };
  const all = () => { ed.innerHTML = editor(); vw.innerHTML = viewChips(); hint.textContent = `${HINTS[st.view]} הנקודות הן חלקיקי עשן שנעים עם האוויר.${st.tool !== 'flow' ? ' גרור על השרטוט כדי לצייר או למחוק.' : ''}`; out.innerHTML = results(); root.querySelectorAll('[data-shape]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.shape === st.shape))); };
  setup(); all(); raf = requestAnimationFrame(loop);

  root.addEventListener('click', (ev) => {
    const sb = ev.target.closest('[data-shape]');
    if (sb) { const sh = SHAPES.find((q) => q.id === sb.dataset.shape); st.shape = sh.id; st.angle = sh.a0 || 0; st.Re = sh.Re; if (sh.id === 'draw') st.tool = 'paint'; setup(); save(); all(); return; }
    const vb = ev.target.closest('[data-view]'); if (vb) { st.view = vb.dataset.view; save(); all(); return; }
    const tb = ev.target.closest('[data-tool]'); if (tb) { st.tool = tb.dataset.tool; all(); return; }
    const b = ev.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'play') playing = !playing;
    else if (b.dataset.act === 'reset') { T.reset(); resetStats(); }
    else if (b.dataset.act === 'ff') { if (!ffLeft) { ffLeft = Math.round((2 * NX) / U_IN); setTimeout(pump, 0); } }
    all();
  });
  root.addEventListener('input', (ev) => {
    const f = ev.target.dataset.f; if (f !== 'Re' && f !== 'angle') return;
    const v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return;
    st[f] = v;
    if (f === 'angle') { paint(T); T.updateSolid(); } // the flow keeps going around the turned body
    T.setViscosity((U_IN * refLen(T)) / reEff()); resetStats(); save();
    const tmp = document.createElement('div'); tmp.innerHTML = editor(); const nb = tmp.querySelectorAll('.pg-range b'); ed.querySelectorAll('.pg-range b').forEach((x, i) => { if (nb[i]) x.innerHTML = nb[i].innerHTML; });
  });
  // painting obstacles with a finger
  let drawing = null;
  const cell = (ev) => { const r = cv.getBoundingClientRect(); return [((ev.clientX - r.left) / r.width) * NX, (1 - (ev.clientY - r.top) / r.height) * NY]; };
  const brush = ([x, y]) => {
    const v = st.tool === 'paint' ? 1 : 0;
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { if (i * i + j * j > 5) continue; const X = Math.floor(x) + i, Y = Math.floor(y) + j; if (X > 1 && Y > 0 && X < NX - 2 && Y < NY - 1) T.solid[Y * NX + X] = v; }
    T.updateSolid();
  };
  cv.addEventListener('pointerdown', (ev) => {
    if (st.tool === 'flow') return;
    ev.preventDefault(); drawing = ev.pointerId; try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
    if (st.shape !== 'draw') { st.shape = 'draw'; root.querySelectorAll('[data-shape]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.shape === 'draw'))); }
    brush(cell(ev));
  });
  cv.addEventListener('pointermove', (ev) => { if (drawing === ev.pointerId) brush(cell(ev)); });
  const end = (ev) => {
    if (drawing !== ev.pointerId) return; drawing = null;
    st.mask = encode(T.solid); T.setViscosity((U_IN * refLen(T)) / reEff()); resetStats(); save(); all();
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.style.touchAction = 'none';
  return () => cancelAnimationFrame(raf);
}
