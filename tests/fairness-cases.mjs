// Multiple-choice fairness: the right option must not give itself away by length, and no joke distractors.
import { domains } from '../data/catalog.js';
export function fairnessChecks(check) {
  let mcq = 0, longest = 0; const tooLong = [], silly = [];
  const SILLY = /לצבוע את המכונה|בצביעה$|הצבע של השרטוט|תלוי בצבע|תלוי בשעה|הגופן בשרטוט|בגלל הצבע|באג בתוכנה/; // 'paint only the anode' is a real mistake, not a joke
  const len = (s) => String(s).replace(/\$[^$]*\$/g, 'xxxx').length; // a formula counts as a short token
  for (const d of domains.filter((x) => x.module).map((x) => x.module)) for (const s of d.subtopics) for (const q of s.questions) {
    if (q.type !== 'mcq') continue;
    mcq++;
    const L = q.options.map(len), right = L[q.answer], others = L.filter((_, i) => i !== q.answer);
    const avg = others.reduce((a, b) => a + b, 0) / others.length;
    if (right > Math.max(...others)) longest++;
    if (right > 1.6 * avg && right - avg > 12) tooLong.push(q.id);
    if (q.options.some((o, i) => i !== q.answer && SILLY.test(o))) silly.push(q.id);
  }
  check(`MCQ: the right option is the longest in at most 30% (${longest}/${mcq})`, longest / mcq <= 0.3);
  check('MCQ: no right option is far longer than the distractors', !tooLong.length, tooLong.join(', '));
  check('MCQ: no joke distractors', !silly.length, silly.join(', '));
}
