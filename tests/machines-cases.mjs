// Machines checks: DC motor line and power balance, PWM, induction motor (synchronous speed, Kloss,
// operating point, V/f), the rotating field, the capacitor motor, pump and system curves with the
// affinity laws, and two appliance formulas.
import {
  dcMotor, pwmAvg, syncRpm, slipOf, kloss, smFromRated, inductionPoint, smAt, field3, starDelta, capMotor, field2,
  pumpH, systemH, operatingPoint, pumpEta, hydPower, affinityLaws, heatTime, carnotCOP, rpm, rad,
} from '../js/machines.js';
import { syncSpeed, slip } from '../js/formulas.js';
export function machinesChecks(check, near) {
  // DC motor
  const m = { V: 24, Ra: 0.5, k: 0.1 };
  const d0 = dcMotor({ ...m, T: 0 }), d1 = dcMotor({ ...m, T: 0.5 });
  check('machines: DC no-load speed ω0 = V/k = 240 rad/s', near(d0.w, 240, 1e-12) && near(d0.w0, 240, 1e-12));
  check('machines: DC stall torque kV/Ra = 4.8 N·m, start current V/Ra = 48 A', near(d0.Tstall, 4.8, 1e-12) && near(d0.Istart, 48, 1e-12) && Math.abs(dcMotor({ ...m, T: 4.8 }).w) < 1e-9);
  check('machines: DC V = E + Ia·Ra and T = k·Ia', near(d1.E + d1.Ia * m.Ra, 24, 1e-12) && near(d1.Ia, 5, 1e-12));
  check('machines: DC power balance V·Ia = T·ω + Ia²·Ra', near(d1.Pin, d1.Pout + d1.Ia ** 2 * m.Ra, 1e-12) && d1.eta < 1 && d1.eta > 0);
  check('machines: DC speed falls linearly with torque', near(d0.w - dcMotor({ ...m, T: 1 }).w, 2 * (d0.w - d1.w), 1e-9));
  check('machines: PWM average = D·V, and half the voltage gives about half the no-load speed', near(pwmAvg(0.5, 24), 12, 1e-12) && near(dcMotor({ ...m, V: pwmAvg(0.5, 24), T: 0 }).w, 120, 1e-12));
  check('machines: rpm ↔ rad/s', near(rpm(rad(1500)), 1500, 1e-12) && near(rad(60), 2 * Math.PI, 1e-12));
  // induction motor
  check('machines: synchronous speed 120f/p: 4 poles at 50 Hz = 1500 rpm, 2 poles = 3000 (same as formulas.js)', syncRpm(50, 4) === 1500 && syncRpm(50, 2) === 3000 && syncRpm(50, 4) === syncSpeed(50, 4));
  check('machines: slip (ns − n)/ns, 1440 rpm on 1500 = 4%', near(slipOf(1500, 1440), 0.04, 1e-12) && near(slipOf(1500, 1440), slip(1500, 1440), 1e-12));
  const sm = smFromRated(0.04, 2.5);
  check('machines: Kloss: rated torque at rated slip when Tmax/Tn = 2.5', near(kloss(0.04, 2.5, sm), 1, 1e-9));
  check('machines: Kloss: the maximum is Tmax, at s = sm', near(kloss(sm, 2.5, sm), 2.5, 1e-12) && kloss(sm * 0.9, 2.5, sm) < 2.5 && kloss(sm * 1.1, 2.5, sm) < 2.5);
  check('machines: no torque at synchronous speed (s = 0)', kloss(0, 2.5, sm) === 0);
  const op = inductionPoint({ f: 50, poles: 4, Tmax: 2.5, sm, TL: () => 1 });
  check('machines: operating point with the rated load is the rated slip (1440 rpm)', Math.abs(op.n - 1440) < 0.01 && near(op.T, 1, 1e-6));
  check('machines: a load above Tmax stalls the motor', inductionPoint({ f: 50, poles: 4, Tmax: 2.5, sm, TL: () => 3 }) === null);
  const fan = (n) => (n / 1500) ** 2; // fan torque ∝ n²
  const o50 = inductionPoint({ f: 50, poles: 4, Tmax: 2.5, sm, TL: fan }), o25 = inductionPoint({ f: 25, poles: 4, Tmax: 2.5, sm: smAt(sm, 50, 25), TL: fan });
  check('machines: V/f at 25 Hz: synchronous speed halves, the fan runs a little under 750 rpm', o25.ns === 750 && o25.n < 750 && o25.n > 700 && o50.n > 1400);
  check('machines: V/f keeps the slip speed (rpm) at the same torque', near(kloss((smAt(sm, 50, 25) * 0.5), 2.5, smAt(sm, 50, 25)), kloss(sm * 0.5, 2.5, sm), 1e-12));
  check('machines: star-delta start: current and torque 1/3', near(starDelta.I, 1 / 3, 1e-12) && near(starDelta.T, 1 / 3, 1e-12) && near((1 / Math.sqrt(3)) ** 2, starDelta.T, 1e-12));
  // rotating field
  const mags = Array.from({ length: 50 }, (_, k) => field3(k / 2500).mag);
  check('machines: three-phase field has a constant size 1.5·Bm', mags.every((x) => Math.abs(x - 1.5) < 1e-9));
  const a0 = field3(0).ang, a1 = field3(1 / 200).ang; // a quarter period later
  check('machines: and it turns one revolution per period (2 poles): 90° after T/4', Math.abs(Math.abs(a1 - a0) - Math.PI / 2) < 1e-9);
  // capacitor motor
  const cm = { Rm: 10, Lm: 0.08, Ra: 20, La: 0.08 }; // example windings
  const noC = capMotor({ ...cm, C: 0 }), withC = capMotor({ ...cm, C: 96e-6 });
  check('machines: without a capacitor the two winding currents are only a little apart (< 35°)', Math.abs(noC.shift) < 35);
  check('machines: the right capacitor in the auxiliary winding brings the shift to about 90°', Math.abs(withC.shift - 90) < 5, `${withC.shift}`);
  const circ = Array.from({ length: 40 }, (_, k) => field2(k / 2000, 90).mag), line = Array.from({ length: 40 }, (_, k) => field2(k / 2000, 0));
  check('machines: two coils with 90° shift make a rotating field of constant size, 0° only a pulsating line', circ.every((x) => Math.abs(x - 1) < 1e-9) && line.every((p) => Math.abs(p.x - p.y) < 1e-12));
  // pump
  const P = { H0: 40, a: 2000, Hs: 10, k: 1000 };
  const opP = operatingPoint(P);
  check('machines: operating point: pump head = system head', near(pumpH(opP.Q, P.H0, P.a), systemH(opP.Q, P.Hs, P.k), 1e-9) && near(opP.Q, 0.1, 1e-9));
  const thr = operatingPoint({ ...P, k: 3000 });
  check('machines: closing a valve (steeper system): less flow, more head', thr.Q < opP.Q && thr.H > opP.H);
  const slow = operatingPoint({ ...P, r: 0.8 });
  check('machines: slower pump: less flow and less head', slow.Q < opP.Q && slow.H < opP.H);
  const af = affinityLaws(0.1, 30, 4000, 0.8);
  check('machines: affinity laws Q ∝ n, H ∝ n², P ∝ n³', near(af.Q, 0.08, 1e-12) && near(af.H, 19.2, 1e-12) && near(af.P, 2048, 1e-12));
  check('machines: the pump curve keeps its shape under the affinity laws (point (Q,H) → (rQ, r²H))', near(pumpH(0.05 * 0.8, 40, 2000, 0.8), pumpH(0.05, 40, 2000) * 0.64, 1e-12));
  check('machines: with no static head, the operating point scales by the affinity laws', (() => { const a = operatingPoint({ H0: 40, a: 2000, Hs: 0, k: 1000 }), b = operatingPoint({ H0: 40, a: 2000, Hs: 0, k: 1000, r: 0.8 }); return near(b.Q, 0.8 * a.Q, 1e-9) && near(b.H, 0.64 * a.H, 1e-9) && near(hydPower(b.Q, b.H), 0.512 * hydPower(a.Q, a.H), 1e-9); })());
  check('machines: hydraulic power ρgQH: 0.1 m³/s at 20 m = 19.6 kW', near(hydPower(0.1, 20), 19620, 1e-12));
  check('machines: efficiency peaks at the BEP, which moves with speed', near(pumpEta(0.1, 0.8, 0.1), 0.8, 1e-12) && pumpEta(0.06, 0.8, 0.1) < 0.8 && near(pumpEta(0.08, 0.8, 0.1, 0.8), 0.8, 1e-12));
  // appliances
  check('machines: heating 80 L of water by 40 °C with 2.5 kW takes m·c·ΔT/P = 1.49 h', near(heatTime(80, 4186, 40, 2500) / 3600, 1.488, 1e-3));
  check('machines: Carnot COP of a fridge, −18 °C inside and 35 °C at the condenser = 4.8', near(carnotCOP(255.15, 308.15), 4.814, 1e-3));
}
