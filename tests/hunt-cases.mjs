// Design-mistake hunt: the cases are well formed and the scoring is right.
import { CASES, spotAt, scoreHunt } from '../js/hunt.js';
export function huntChecks(check) {
  for (const c of CASES) {
    const errs = c.spots.filter((s) => s.err), ok = c.spots.filter((s) => !s.err);
    check(`hunt ${c.id}: at least 3 mistakes and 2 decoys`, errs.length >= 3 && ok.length >= 2);
    check(`hunt ${c.id}: every spot has a title and an explanation, every mistake a fix`, c.spots.every((s) => s.title && s.why && s.why.length > 30 && (!s.err || (s.fix && s.fix.length > 15))));
    check(`hunt ${c.id}: spots are inside the drawing`, c.spots.every((s) => s.x - s.r >= -4 && s.x + s.r <= 364 && s.y - s.r >= -4 && s.y + s.r <= c.H + 4));
    check(`hunt ${c.id}: spots do not overlap (each tap means one thing)`, c.spots.every((a, i) => c.spots.every((b, j) => i === j || Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r - 4)));
    check(`hunt ${c.id}: ids are unique, a brief and a source`, new Set(c.spots.map((s) => s.id)).size === c.spots.length && c.brief && c.source);
    check(`hunt ${c.id}: a tap on each spot centre finds that spot`, c.spots.every((s) => spotAt(c, s.x, s.y) === s));
    check(`hunt ${c.id}: the drawing renders`, typeof c.svg() === 'string' && c.svg().includes('<'));
  }
  const c = CASES[0], errs = c.spots.filter((s) => s.err).map((s) => s.id), decoy = c.spots.find((s) => !s.err).id;
  check('hunt: all mistakes found, no false alarms = 10', scoreHunt(c, errs).grade === 10);
  check('hunt: nothing marked = 0, everything missed', scoreHunt(c, []).grade === 0 && scoreHunt(c, []).missed.length === errs.length);
  check('hunt: a false alarm costs one find', scoreHunt(c, [...errs, decoy]).grade === Math.round((10 * (errs.length - 1)) / errs.length) && scoreHunt(c, [...errs, decoy]).falseAlarms.length === 1);
  check('hunt: the grade never goes below 0', scoreHunt(c, c.spots.filter((s) => !s.err).map((s) => s.id)).grade === 0);
  check('hunt: a tap far from every spot finds nothing', spotAt(c, 5, 225) === null);
}
