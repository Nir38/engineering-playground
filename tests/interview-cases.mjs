// Interview mode: question picking, time limits and the grade.
import { pickInterview, subWeight, grade, limitFor, MAX_PER_SUB } from '../js/interview.js';
export function interviewChecks(check) {
  let seed = 3; const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const items = [];
  for (let s = 0; s < 8; s++) for (let k = 0; k < 6; k++) items.push({ id: `s${s}q${k}`, sub: `s${s}`, type: k === 0 ? 'open' : k % 2 ? 'mcq' : 'numeric', difficulty: 1 + (k % 3) });
  const p = pickInterview(items, {}, 10, rand);
  check('interview: picks the number asked for, no repeats', p.length === 10 && new Set(p.map((x) => x.id)).size === 10);
  const per = {}; p.forEach((x) => (per[x.sub] = (per[x.sub] || 0) + 1));
  check('interview: at most 2 questions per subtopic (breadth like a real interview)', Object.values(per).every((c) => c <= MAX_PER_SUB));
  check('interview: about a third are "explain it" (open) questions', p.filter((x) => x.type === 'open').length === 3);
  check('interview: a repeated id in the pool is picked once', pickInterview([...items, ...items], {}, 10, rand).length === 10);
  check('interview: when the pool is small, returns what it can (2 per subtopic)', pickInterview(items.filter((x) => x.sub === 's0'), {}, 10, rand).length === 2);
  check('interview: weight 1 when always right, 4 when always wrong, 1.5 unseen', subWeight({ right: 5, wrong: 0 }) === 1 && subWeight({ right: 0, wrong: 3 }) === 4 && subWeight() === 1.5);
  // weak subtopics come up more often
  const stats = { s0: { right: 0, wrong: 9 } }; for (let s = 1; s < 8; s++) stats[`s${s}`] = { right: 9, wrong: 0 };
  let weak = 0, runs = 300; for (let k = 0; k < runs; k++) weak += pickInterview(items, stats, 4, rand).filter((x) => x.sub === 's0').length;
  check('interview: a subtopic with many mistakes is picked much more often than the rest', weak / runs > 1.2, String(weak / runs));
  check('interview: time limits: explain 2 min, calculation 3 min, multiple choice 45 s', limitFor('open') === 120 && limitFor('numeric') === 180 && limitFor('mcq') === 45);
  const g = grade([{ ok: true, type: 'mcq', t: 10 }, { ok: true, type: 'open', t: 110 }, { ok: false, type: 'numeric', timeout: true, t: 180 }, { ok: true, type: 'mcq', t: 20 }]);
  check('interview: grade 3 of 4 = 8/10, two slow answers (over 80% of the time)', g.grade === 8 && g.right === 3 && g.slow === 2 && g.avg === 80);
  check('interview: below 6 says to go back to the material', grade([{ ok: false, type: 'mcq' }, { ok: true, type: 'mcq' }, { ok: false, type: 'mcq' }]).verdict.includes('לחזור'));
}
