// Spaced repetition, answer parsing and state cleanup.
import { review, boxOf, isDue, dueIds, parseAnswer, isCorrect, sanitizeState, spread, INTERVAL_DAYS } from '../js/srs.js';
export function srsChecks(check) {
  const DAY = 86400000, t0 = Date.UTC(2026, 0, 1);
  let r = review({}, true, t0);
  check('SRS: first right answer -> box 1, due in 1 day', r.box === 1 && r.due === t0 + DAY && r.right === 1);
  r = review(r, true, t0 + DAY);
  check('SRS: second right answer -> box 2, due in 3 days', r.box === 2 && r.due === t0 + DAY + 3 * DAY);
  r = review(r, false, t0 + 5 * DAY);
  check('SRS: a wrong answer -> box 1, due again today', r.box === 1 && r.due === t0 + 5 * DAY && r.wrong === 1);
  let b = { right: 0, wrong: 0 }; for (let i = 0; i < 9; i++) b = review(b, true, t0);
  check('SRS: box stops at 5 (60 days)', b.box === 5 && b.due === t0 + INTERVAL_DAYS[5] * DAY);
  check('SRS: old records without boxes get one', boxOf({ right: 0, wrong: 2, last: t0 }).box === 1 && isDue({ right: 0, wrong: 2, last: t0 }, t0) && !isDue({ right: 3, wrong: 0, last: t0 }, t0 + DAY));
  const recs = { a: { right: 3, wrong: 0, box: 3, due: t0 - 5 * DAY }, b: { right: 0, wrong: 1, box: 1, due: t0 - DAY }, c: { right: 0, wrong: 1, box: 1, due: t0 - 3 * DAY } };
  check('SRS: most urgent first (box 1, longest overdue)', dueIds(recs, new Set(['a', 'b', 'c']), t0).join() === 'c,b,a');
  check('SRS: due list ignores unknown ids', dueIds({ a: { right: 0, wrong: 1, last: t0 }, gone: { right: 0, wrong: 1, last: t0 } }, new Set(['a']), t0).join() === 'a');
  // answers typed on a phone
  const cases = [['−20', -20], ['–3.5', -3.5], ['2,5', 2.5], ['1,500', 1500], ['1,500.25', 1500.25], ['1 500', 1500], ['12.6 kN', 12.6], ['-0.149', -0.149], ['abc', NaN], ['1,000,000', 1e6], ['0,25', 0.25]];
  check('answers: phone minus, decimal comma, thousands', cases.every(([s, v]) => (Number.isNaN(v) ? Number.isNaN(parseAnswer(s)) : parseAnswer(s) === v)), JSON.stringify(cases.map(([s]) => parseAnswer(s))));
  check('answers: 0 matches an answer of 0 (absolute floor)', isCorrect(0, 0) && isCorrect(0, 5.8e-16) && !isCorrect(0.1, 0));
  check('answers: 2% relative tolerance', isCorrect(101.9, 100) && !isCorrect(102.1, 100) && isCorrect(-98.5, -100));
  // broken saved data
  const empty = { q: {}, sub: {}, history: [], reports: [], seen: {}, marks: {}, theme: 'auto' };
  const s = sanitizeState({ q: null, sub: { a: { right: 1, wrong: 0 }, b: 'x', c: { right: 'NaN' } }, history: 'oops', theme: 'pink' }, empty);
  check('state: broken fields fall back to defaults', JSON.stringify(s.q) === '{}' && Array.isArray(s.history) && s.theme === 'auto' && Object.keys(s.sub).join() === 'a');
  check('state: not an object -> empty', JSON.stringify(sanitizeState('junk', empty)) === JSON.stringify(empty));
  // spreading duplicates
  const items = ['a', 'a', 'b', 'c', 'c', 'd'].map((id) => ({ id }));
  const sp = spread(items);
  check('quiz: duplicates are kept apart', sp.every((x, i) => i === 0 || x.id !== sp[i - 1].id) && sp.length === items.length);
}
