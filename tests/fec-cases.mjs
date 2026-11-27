// Fe–Fe3C diagram: key points, phases in each region, lever rule and slow-cooled microconstituents.
import { phasesAt, micro, tA3, tAcm, tLiq, tSol, cA3, cAcm } from '../js/fec.js';
import { pearliteFraction, pearliteFractionHyper } from '../js/formulas.js';
export function fecChecks(check, near) {
  const ph = (C, T) => phasesAt(C, T).map((p) => p.ph).join('+');
  check('Fe-C: A3 runs from 912 °C at 0% to 727 °C at 0.76%, Acm from 0.76% to 2.14% at 1147 °C', near(tA3(0), 912, 1e-12) && near(tA3(0.76), 727, 1e-12) && near(tAcm(2.14), 1147, 1e-12) && near(cA3(727), 0.76, 1e-12) && near(cAcm(1147), 2.14, 1e-12));
  check('Fe-C: liquidus meets the eutectic at 4.3% and 1147 °C, pure iron melts at 1538 °C', near(tLiq(4.3), 1147, 1e-12) && near(tLiq(0), 1538, 1e-12) && near(tSol(2.14), 1147, 1e-12));
  check('Fe-C: phases by region: 0.4% at 900 °C is γ, at 760 °C α+γ, at 600 °C α+Fe3C', ph(0.4, 900) === 'g' && ph(0.4, 760) === 'a+g' && ph(0.4, 600) === 'a+c');
  check('Fe-C: 1.2% at 800 °C is γ+Fe3C, at 1000 °C γ; 3% at 1200 °C is γ+L; 6% at 1180 °C is L+Fe3C; 1600 °C is liquid', ph(1.2, 800) === 'g+c' && ph(1.2, 1000) === 'g' && ph(3, 1200) === 'g+L' && ph(6, 1180) === 'L+c' && ph(0.5, 1600) === 'L');
  check('Fe-C: fractions in a two-phase field add to 1, and the overall carbon balances', [[0.4, 760], [1.2, 800], [0.4, 600], [3, 1200]].every(([C, T]) => { const p = phasesAt(C, T); return near(p[0].W + p[1].W, 1, 1e-12) && near(p[0].W * p[0].C + p[1].W * p[1].C, C, 1e-9); }));
  check('Fe-C: just below 727 °C, 0.40% C: pearlite 0.51 and proeutectoid ferrite 0.49 (Callister, the app\'s example)', (() => { const m = micro(0.4); return Math.abs(m.parts[1].W - 0.51) < 0.005 && near(m.parts[1].W, pearliteFraction(0.4), 1e-12); })());
  check('Fe-C: 0.76% is all pearlite, 1.2% is pearlite + proeutectoid cementite', micro(0.76).kind === 'eut' && near(micro(1.2).parts[0].W, pearliteFractionHyper(1.2), 1e-12));
  check('Fe-C: just below 727 °C a 0.76% steel is 89% ferrite and 11% Fe3C (phases)', (() => { const p = phasesAt(0.76, 726.9); return Math.abs(p[0].W - 0.89) < 0.005; })());
}
