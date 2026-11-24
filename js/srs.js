// srs.js: spaced repetition (Leitner boxes), answer parsing and checking, saved-state cleanup.
// Pure functions, checked in tests/srs-cases.mjs.

const DAY = 24 * 3600 * 1000;
// days until the next review for boxes 1..5 (a wrong answer goes back to box 1, due again today)
export const INTERVAL_DAYS = [0, 1, 3, 7, 21, 60];

// update one question's record after an answer
export function review(rec = {}, ok, now = Date.now()) {
  const r = { right: 0, wrong: 0, ...rec };
  ok ? r.right++ : r.wrong++;
  r.last = now;
  r.box = ok ? Math.min(5, (r.box || 0) + 1) : 1;
  r.due = ok ? now + INTERVAL_DAYS[r.box] * DAY : now; // wrong: review again today
  return r;
}
// records saved before boxes existed: derive a box and a due date from the counts
export function boxOf(r) {
  if (r.box) return r;
  const box = r.wrong > r.right ? 1 : Math.min(5, 1 + r.right - r.wrong);
  return { ...r, box, due: (r.last || 0) + (r.wrong > r.right ? 0 : INTERVAL_DAYS[box] * DAY) };
}
export const isDue = (r, now = Date.now()) => { const b = boxOf(r); return (b.due || 0) <= now; };
// due ids, most urgent first: lowest box (recent mistakes), then the longest overdue
export function dueIds(records, valid, now = Date.now()) {
  return Object.entries(records || {}).filter(([id, r]) => valid.has(id) && r && isDue(r, now))
    .map(([id, r]) => [id, boxOf(r)]).sort((a, b) => a[1].box - b[1].box || (a[1].due || 0) - (b[1].due || 0)).map(([id]) => id);
}
export const DAILY_LIMIT = 25; // a review session that fits one sitting; the rest waits for the next days

// parse what the learner typed: phone minus signs, decimal comma, thousands separators
export function parseAnswer(raw) {
  let t = String(raw || '').trim().replace(/[−‒–—﹣－]/g, '-').replace(/\s+/g, '');
  const commas = (t.match(/,/g) || []).length;
  if (commas && t.includes('.')) t = t.replace(/,/g, ''); // 1,500.5
  else if (commas === 1 && !/^\-?\d{1,3},\d{3}$/.test(t)) t = t.replace(',', '.'); // 2,5 -> 2.5
  else t = t.replace(/,/g, ''); // 1,500 or 1,000,000
  t = t.replace(/[^\d.eE+-]/g, '');
  const v = parseFloat(t);
  return Number.isFinite(v) ? v : NaN;
}
// relative tolerance, with an absolute floor so that answers of (almost) 0 can be matched
export const isCorrect = (v, answer, tol = 0.02) => Math.abs(v - answer) <= Math.max(tol * Math.abs(answer), 1e-9);

// make a saved state safe to use: right types for every field, drop broken entries
export function sanitizeState(raw, empty) {
  const s = { ...empty };
  if (!raw || typeof raw !== 'object') return s;
  const obj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  for (const k of ['q', 'sub', 'seen', 'marks']) if (obj(raw[k])) s[k] = raw[k];
  for (const k of ['history', 'reports']) if (Array.isArray(raw[k])) s[k] = raw[k].filter((x) => x && typeof x === 'object');
  if (typeof raw.theme === 'string' && ['auto', 'dark', 'light'].includes(raw.theme)) s.theme = raw.theme;
  for (const k of ['q', 'sub']) for (const [id, r] of Object.entries(s[k])) if (!obj(r) || !Number.isFinite(r.right) || !Number.isFinite(r.wrong)) delete s[k][id];
  return s;
}

// keep two copies of the same exercise apart when possible
export function spread(items) {
  const a = items.slice();
  for (let i = 1; i < a.length; i++) {
    if (a[i].id !== a[i - 1].id) continue;
    const j = a.findIndex((x, k) => k > i && x.id !== a[i - 1].id && (k + 1 >= a.length || a[k + 1].id !== a[i].id));
    if (j > 0) [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
