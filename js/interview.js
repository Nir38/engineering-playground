// interview.js: the "interview" practice mode. Picks a mixed set of questions the way a technical interview
// runs (breadth across topics, some "explain it" questions, more weight on the subtopics where the user
// makes mistakes), sets a time limit per question type, and turns the results into a 0–10 grade with a
// short verdict. Pure functions; the quiz engine in app.js uses them. Tests: tests/interview-cases.mjs.

// the domains of an NPI / mechanical design interview (used when no subtopic is picked)
export const INTERVIEW_DOMAINS = ['strength', 'materials', 'design', 'gdt', 'dfm', 'cad', 'fluids'];
// seconds per question: explain out loud, a calculation, a quick concept question
export const LIMIT = { open: 120, numeric: 180, mcq: 45, tf: 30 };
export const limitFor = (type) => LIMIT[type] || 60;
export const MAX_PER_SUB = 2;

// weight of a subtopic: unseen 1.5, otherwise 1 + 3 × error rate (all wrong → 4, all right → 1)
export function subWeight(stats) {
  const r = (stats && stats.right) || 0, w = (stats && stats.wrong) || 0;
  return r + w === 0 ? 1.5 : 1 + (3 * w) / (r + w);
}

// items: [{ id, sub, type, difficulty }]; stats: { [sub]: { right, wrong } }; rand: () => [0, 1)
// at most MAX_PER_SUB per subtopic and no repeated id; about a third "open" questions when there are any
export function pickInterview(items, stats, count, rand = Math.random) {
  const pool = items.filter((x, i) => items.findIndex((y) => y.id === x.id) === i);
  const wantOpen = Math.min(Math.round(count / 3), pool.filter((x) => x.type === 'open').length);
  const per = {}, out = [];
  const take = (cands, n) => {
    const left = [...cands];
    while (n > 0 && left.length) {
      const ok = left.filter((x) => (per[x.sub] || 0) < MAX_PER_SUB);
      if (!ok.length) break;
      const ws = ok.map((x) => subWeight(stats[x.sub]) * (x.difficulty === 1 ? 0.6 : 1)), tot = ws.reduce((a, b) => a + b, 0);
      let r = rand() * tot, k = 0; while (k < ok.length - 1 && r >= ws[k]) { r -= ws[k]; k++; }
      const it = ok[k]; out.push(it); per[it.sub] = (per[it.sub] || 0) + 1; left.splice(left.indexOf(it), 1); n--;
    }
  };
  take(pool.filter((x) => x.type === 'open'), wantOpen);
  take(pool.filter((x) => !out.includes(x)), count - out.length);
  // shuffle, so the open questions are not all at the start
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

// results: [{ ok, type, sub, t (seconds used), timeout }]
export function grade(results) {
  const n = results.length, right = results.filter((r) => r.ok).length, g = n ? Math.round((10 * right) / n) : 0;
  const slow = results.filter((r) => r.timeout || (r.t != null && r.t > 0.8 * limitFor(r.type))).length;
  const avg = n ? results.reduce((s, r) => s + (r.t || 0), 0) / n : 0;
  const verdict = g >= 8 ? 'מוכן לראיון בנושאים האלה' : g >= 6 ? 'עובר, אבל מראיין יזהה חורים' : 'עדיין לא: לחזור לחומר ולתרגל שוב';
  return { n, right, grade: g, slow, avg, verdict };
}
