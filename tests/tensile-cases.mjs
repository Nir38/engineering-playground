// Tensile test model: passes through the table values, elastic slope, offset yield, unloading, true stress.
import { model, permanent, trueSS, MATS } from '../js/tensile.js';
export function tensileChecks(check, near) {
  for (const k of Object.keys(MATS)) {
    const m = model(k);
    check(`tensile ${k}: elastic slope is E at small strain`, near(m.sigma(1e-5) / 1e-5, m.Emod, 0.01));
    check(`tensile ${k}: 0.2% offset yield gives Sy (by definition of the curve)`, near(m.sigma(m.Sy / m.Emod + 0.002), m.Sy, 1e-6));
    check(`tensile ${k}: the maximum is Sut, at the uniform strain εu`, near(m.sigma(m.eu), m.Sut, 1e-6) && m.sigma(m.eu * 0.9) < m.Sut && m.sigma(m.eu + (m.ef - m.eu) * 0.5) < m.Sut);
    check(`tensile ${k}: breaks at the elongation from the table`, m.sigma(m.ef * 1.0001) === 0 && m.sigma(m.ef) > 0);
  }
  const s = model('s1020');
  check('tensile: resilience Ur = Sy²/2E = 210²/(2·207000) = 0.107 MJ/m³', near(s.Ur, 210 ** 2 / (2 * 207e3), 1e-12) && Math.abs(s.Ur - 0.1065) < 0.0005);
  check('tensile: toughness is between Sy·εf and Sut·εf', s.Ut > 210 * 0.25 && s.Ut < 380 * 0.25);
  check('tensile: unloading is elastic: permanent strain = ε − σ/E, almost zero well below yield (the model has no sharp yield point)', near(permanent(s, 0.05), 0.05 - s.sigma(0.05) / s.Emod, 1e-12) && permanent(s, 0.0005) < 2e-5);
  check('tensile: true stress σ(1 + ε) and true strain ln(1 + ε)', (() => { const t = trueSS(400, 0.1); return near(t.s, 440, 1e-12) && near(t.e, Math.log(1.1), 1e-12); })());
  check('tensile: cold-drawn 1045 is stronger but less ductile than hot-rolled 1020', model('s1045').Sut > s.Sut && model('s1045').ef < s.ef);
}
