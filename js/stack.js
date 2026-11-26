// stack.js: one-dimensional tolerance stack-up. Each dimension has a nominal, an upper and a lower
// tolerance, and a direction (+1 adds to the gap, −1 takes from it). Unequal tolerances are first turned
// into a mean and an equal ± (mean shift), as in Fischer, Mechanical Tolerance Stackup and Analysis.
// Worst case adds the ± values; RSS adds them as √Σt², which assumes each part is normal with ±t = ±3σ,
// centred and independent. A seeded Monte Carlo checks the RSS answer. Tests: tests/stack-cases.mjs.
import { stackWorst, stackRSS } from './formulas.js';

export const SRC_T = 'Fischer, Mechanical Tolerance Stackup and Analysis';
export const center = ({ nom, up, lo }) => ({ mean: nom + (up + lo) / 2, t: (up - lo) / 2 });

export function stack(dims) {
  const c = dims.map((d) => ({ ...d, ...center(d) }));
  const nom = c.reduce((s, d) => s + d.dir * d.nom, 0), mean = c.reduce((s, d) => s + d.dir * d.mean, 0);
  const ts = c.map((d) => d.t), wc = stackWorst(ts), rss = stackRSS(ts);
  const sumT = ts.reduce((a, b) => a + b, 0), sumT2 = ts.reduce((a, b) => a + b * b, 0);
  const parts = c.map((d) => ({ ...d, wcPct: sumT > 0 ? (100 * d.t) / sumT : 0, rssPct: sumT2 > 0 ? (100 * d.t * d.t) / sumT2 : 0 }));
  return { nom, mean, wc, rss, wcMin: mean - wc, wcMax: mean + wc, rssMin: mean - rss, rssMax: mean + rss, sigma: rss / 3, parts };
}

// standard normal CDF (Abramowitz & Stegun 7.1.26, error < 1.5e-7)
export function phi(z) {
  const x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}
// expected fraction of assemblies outside [lsl, usl] (either may be null), with σ = rss/3
export function rejectFrac(s, lsl, usl) {
  if (s.sigma <= 0) return (lsl != null && s.mean < lsl) || (usl != null && s.mean > usl) ? 1 : 0;
  return (lsl != null ? phi((lsl - s.mean) / s.sigma) : 0) + (usl != null ? 1 - phi((usl - s.mean) / s.sigma) : 0);
}

// seeded random numbers, so the same scene always shows the same histogram
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function monteCarlo(dims, n = 20000, seed = 1) {
  const c = dims.map((d) => ({ ...d, ...center(d) })), r = rng(seed), out = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    let g = 0;
    for (const d of c) { const u = 1 - r(), v = r(); g += d.dir * (d.mean + (d.t / 3) * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)); }
    out[k] = g;
  }
  let m = 0; for (const g of out) m += g; m /= n;
  let v = 0; for (const g of out) v += (g - m) ** 2;
  return { samples: out, mean: m, sd: Math.sqrt(v / (n - 1)), frac: (lsl, usl) => out.reduce((s, g) => s + ((lsl != null && g < lsl) || (usl != null && g > usl) ? 1 : 0), 0) / n };
}
