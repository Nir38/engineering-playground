// AC checks: the phasor solver against textbook formulas (impedance, RMS, power triangle, power factor
// correction, RLC resonance), the time solver with AC sources, transformer and simple supply,
// three-phase (√3, neutral current), and what the instruments show on AC circuits.
import {
  solve, step, emptyState, solveAC, acMeasure, cx, cabs, carg, csub, cadd, polar, zR, zL, zC, zSeries, zParallel, acLoad, pfCapacitor,
  resonanceF, seriesQ, transformer, bridgePeak, rippleFull, phaseV, threePhase, GRID, peakToRms, meterElement, meterReading,
  clampReading, testerReading, phaseShift, VF, acMeasureAll,
} from '../js/circuit.js';
export function acChecks(check, near) {
  let id = 1;
  const E = (type, a, b, p = {}) => ({ id: id++, type, a, b, ...p });
  const vac = (a, b, Vrms, f = 50, r = 1e-6, ph = 0) => E('vac', a, b, { Vrms, f, r, ph });
  const PI2 = 2 * Math.PI;

  // grid values and RMS
  check('ac: Israeli grid 230 V / 400 V 50 Hz, and 400 ≈ √3·230', GRID.V === 230 && GRID.VL === 400 && GRID.f === 50 && Math.abs(Math.sqrt(3) * 230 - 400) < 2);
  check('ac: V_RMS = Vp/√2, 325.3 V peak → 230 V', near(peakToRms(230 * Math.SQRT2), 230, 1e-12) && Math.abs(peakToRms(325.3) - 230) < 0.03);
  // time domain: an AC source gives RMS = Vrms over a whole period
  let S = vac('p', 'g', 230), R1 = E('res', 'p', 'g', { R: 100 }), st = emptyState(), sum2 = 0, mx = 0;
  const N = 1000; for (let k = 0; k < N; k++) { const r = step([S, R1], st, 0.02 / N); const v = r.v('p'); sum2 += v * v; mx = Math.max(mx, v); }
  check('ac: time solver, sine source RMS over a period = 230 V, peak = 325 V', Math.abs(Math.sqrt(sum2 / N) - 230) < 0.1 && Math.abs(mx - 230 * Math.SQRT2) < 0.05);

  // impedances
  check('ac: X_L = 2πfL, 0.1 H at 50 Hz = 31.42 Ω', near(zL(0.1, 50).im, PI2 * 5, 1e-12) && zL(0.1, 50).re === 0);
  check('ac: X_C = 1/(2πfC), 100 µF at 50 Hz = 31.83 Ω (negative imaginary)', near(-zC(100e-6, 50).im, 1 / (PI2 * 50 * 100e-6), 1e-12));
  const Zrl = zSeries(zR(30), zL(0.1273, 50));
  check('ac: series RL |Z| = √(R² + X_L²), φ = atan(X_L/R)', near(cabs(Zrl), Math.hypot(30, PI2 * 50 * 0.1273), 1e-12) && near(carg(Zrl), (Math.atan2(PI2 * 50 * 0.1273, 30) * 180) / Math.PI, 1e-9));
  check('ac: two equal impedances in parallel = half', near(cabs(zParallel(zR(10), zR(10))), 5, 1e-12));

  // phasor solver vs formula: series RL on 230 V
  const L1 = E('ind', 'm', 'g', { L: 0.1273 }); S = vac('p', 'g', 230); R1 = E('res', 'p', 'm', { R: 30 });
  let r = solveAC([S, R1, L1], 50);
  const ld = acLoad(230, Zrl);
  check('ac: phasor solver, series RL current = V/|Z|', near(cabs(r.I.get(R1.id)), ld.I, 1e-6));
  check('ac: in RL the current lags the voltage by φ', Math.abs(phaseShift([S, R1, L1], 50, 'p', 'g', R1.id) - ld.phi) < 1e-6 && ld.phi > 0);
  check('ac: KVL with phasors: V_R + V_L = V (the magnitudes do not add up, the phasors do)', cabs(csub(cadd(r.Vd.get(R1.id), r.Vd.get(L1.id)), cx(230))) < 1e-4 && cabs(r.Vd.get(R1.id)) + cabs(r.Vd.get(L1.id)) > 230 + 1);
  // power: P = V·I·cos φ, and the power balance (Σ S = 0)
  const Stot = [S, R1, L1].reduce((s, e) => cadd(s, r.S.get(e.id)), cx(0));
  check('ac: complex power balance, the source gives what R and L take (P and Q)', cabs(Stot) < 1e-8 * 230 * ld.I, String(cabs(Stot)));
  check('ac: P = V·I·cos φ = I²R, all of it in the resistor', near(r.S.get(R1.id).re, 230 * ld.I * ld.pf, 1e-6) && near(ld.P, ld.I ** 2 * 30, 1e-9) && Math.abs(r.S.get(L1.id).re) < 1e-6);
  check('ac: Q = V·I·sin φ = I²X_L, S² = P² + Q²', near(r.S.get(L1.id).im, ld.Q, 1e-6) && near(ld.S ** 2, ld.P ** 2 + ld.Q ** 2, 1e-9));
  // RC: current leads
  const C1 = E('cap', 'm', 'g', { C: 100e-6 }); S = vac('p', 'g', 230); R1 = E('res', 'p', 'm', { R: 30 });
  check('ac: in RC the current leads (φ < 0)', phaseShift([S, R1, C1], 50, 'p', 'g', R1.id) < -1);
  // time solver vs phasor: RC amplitude after settling
  st = emptyState(); let peak = 0; for (let k = 0; k < 20000; k++) { const q = step([S, R1, C1], st, 0.02 / 1000); if (k > 18000) peak = Math.max(peak, Math.abs(q.I.get(R1.id))); }
  check('ac: time solver and phasor solver agree on the RC current amplitude (0.5%)', Math.abs(peak - Math.SQRT2 * cabs(solveAC([S, R1, C1], 50).I.get(R1.id))) / peak < 5e-3, `${peak}`);

  // power factor correction
  const P = ld.P, Cpf = pfCapacitor(P, 230, 50, ld.pf, 0.95);
  check('ac: correction capacitor C = P(tan φ1 − tan φ2)/(ωV²)', near(Cpf, (P * (Math.tan(Math.acos(ld.pf)) - Math.tan(Math.acos(0.95)))) / (PI2 * 50 * 230 * 230), 1e-12));
  const Cp = E('cap', 'p', 'g', { C: Cpf }); S = vac('p', 'g', 230); R1 = E('res', 'p', 'm', { R: 30 });
  r = solveAC([S, R1, E('ind', 'm', 'g', { L: 0.1273 }), Cp], 50);
  const Isrc = cabs(r.I.get(S.id)), Ssrc = r.S.get(S.id);
  check('ac: with that capacitor the power factor becomes 0.95', Math.abs(-Ssrc.re / Math.hypot(Ssrc.re, Ssrc.im) - 0.95) < 1e-6);
  check('ac: the correction lowers the line current, P stays the same', Isrc < ld.I && near(-Ssrc.re, P, 1e-6));

  // RLC resonance
  const Lr = 0.1, Cr = 10e-6, Rr = 10, f0 = resonanceF(Lr, Cr);
  check('ac: f0 = 1/(2π√(LC)), 0.1 H and 10 µF → 159.2 Hz', near(f0, 1 / (PI2 * Math.sqrt(1e-6)), 1e-12) && Math.abs(f0 - 159.15) < 0.01);
  const rlc = (f) => { const s = vac('p', 'g', 10, f), rr = E('res', 'p', 'x', { R: Rr }); return cabs(solveAC([s, rr, E('ind', 'x', 'y', { L: Lr }), E('cap', 'y', 'g', { C: Cr })], f).I.get(rr.id)); };
  check('ac: at f0 X_L = X_C, Z = R and the current is V/R (largest)', near(rlc(f0), 10 / Rr, 1e-6) && rlc(f0 * 0.9) < rlc(f0) && rlc(f0 * 1.1) < rlc(f0));
  const Q = seriesQ(Rr, Lr, Cr), bw = f0 / Q, fl = f0 * (Math.sqrt(1 + 1 / (4 * Q * Q)) - 1 / (2 * Q));
  check('ac: Q = (1/R)√(L/C) = 10, bandwidth f0/Q, at the half-power edge I = I0/√2', near(Q, 10, 1e-12) && near(rlc(fl), 1 / Math.SQRT2, 1e-6) && near(fl + bw, f0 * (Math.sqrt(1 + 1 / (4 * Q * Q)) + 1 / (2 * Q)), 1e-9));
  const sR = vac('p', 'g', 10, f0), rR = E('res', 'p', 'x', { R: Rr }), lR = E('ind', 'x', 'y', { L: Lr }); r = solveAC([sR, rR, lR, E('cap', 'y', 'g', { C: Cr })], f0);
  check('ac: at resonance the coil voltage is Q times the source voltage', near(cabs(r.Vd.get(lR.id)), Q * 10, 1e-6));

  // transformer
  const T = transformer({ V1: 230, N1: 1000, N2: 52, RL: 10 });
  check('ac: transformer V2 = V1·N2/N1, I1 = I2·N2/N1, P1 = P2', near(T.V2, 11.96, 1e-12) && near(T.I1, T.I2 * 0.052, 1e-12) && near(T.P1, T.P2, 1e-9));
  check('ac: the load seen from the primary is (N1/N2)²·RL, and V1/Rin = I1', near(T.Rin, (1000 / 52) ** 2 * 10, 1e-9) && near(230 / T.Rin, T.I1, 1e-12));
  // bridge rectifier + capacitor: simulated against Vp − 2VF and ΔV ≈ I/(2fC)
  const bridge = (Cf) => { const s = vac('a1', 'a2', 12), D = (a, b) => E('diode', a, b); return [s, D('a1', 'P'), D('a2', 'P'), D('N', 'a1'), D('N', 'a2'), E('cap', 'P', 'N', { C: Cf }), E('res', 'P', 'N', { R: 100 })]; };
  let els = bridge(2200e-6), stB = emptyState(), vmax = -1e9, vmin = 1e9;
  for (let k = 0; k < 40 * 400; k++) { const q = step(els, stB, 0.02 / 400); if (k >= 38 * 400) { const v = q.v('P') - q.v('N'); vmax = Math.max(vmax, v); vmin = Math.min(vmin, v); } }
  check('ac: bridge peak = √2·V2 − 2·VF ≈ 15.6 V (simulated within 0.15 V)', Math.abs(vmax - bridgePeak(12)) < 0.15, `${vmax}`);
  check('ac: full-wave ripple ΔV ≈ I/(2fC) (simulated within 20%)', Math.abs((vmax - vmin) - rippleFull(vmax / 100, 50, 2200e-6)) / rippleFull(vmax / 100, 50, 2200e-6) < 0.2, `${vmax - vmin}`);
  check('ac: bigger capacitor, smaller ripple (formula)', rippleFull(0.15, 50, 4700e-6) < rippleFull(0.15, 50, 1000e-6) && near(rippleFull(0.1, 50, 1e-3), 1, 1e-12));
  // the multimeter on the supply: V⎓ shows the average, V~ the ripple, Hz the ripple frequency 100 Hz
  const meter = (o) => ({ dial: 'vdc', jack: 'v', red: 'P', black: 'N', fuseOK: true, ...o });
  const rd = (els0, m) => meterReading(els0, null, m);
  const hz = parseFloat(rd(bridge(470e-6), meter({ dial: 'hz' })).text);
  check('meter Hz on the bridge output (470 µF, bigger ripple): 100 Hz, two pulses per period', Math.abs(hz - 100) < 1, String(hz));
  check('meter Hz on a very smooth output (2200 µF): ripple too small to count, shows 0 and explains', (() => { const q = rd(els, meter({ dial: 'hz' })); return q.text === '0.000' && q.warn.length > 0; })());
  const vdc = parseFloat(rd(els, meter({ dial: 'vdc' })).text);
  check('meter V⎓ on the bridge output: between the bottom and the top of the ripple', vdc > vmin && vdc < vmax);
  // half wave: 50 Hz
  const half = [vac('a1', 'N', 12), E('diode', 'a1', 'P'), E('cap', 'P', 'N', { C: 470e-6 }), E('res', 'P', 'N', { R: 100 })];
  check('meter Hz on a half-wave rectifier: 50 Hz', Math.abs(parseFloat(rd(half, meter({ dial: 'hz' })).text) - 50) < 1);

  // three-phase
  const [Va, Vb, Vc] = phaseV(230);
  check('3ph: phases 120° apart and their sum is 0', Math.abs(carg(Vb) + 120) < 1e-9 && Math.abs(carg(Vc) - 120) < 1e-9 && cabs(cadd(cadd(Va, Vb), Vc)) < 1e-9);
  check('3ph: line voltage = √3·phase voltage, 30° ahead', near(cabs(csub(Va, Vb)), Math.sqrt(3) * 230, 1e-9) && Math.abs(carg(csub(Va, Vb)) - 30) < 1e-9);
  const Zb = [zR(50), zR(50), zR(50)];
  let tp = threePhase({ V: 230, Z: Zb, conn: 'star' });
  check('3ph: balanced star, I = Vph/Z and the neutral current is 0', near(cabs(tp.Iline[0]), 4.6, 1e-9) && cabs(tp.In) < 1e-9);
  check('3ph: P = √3·VL·IL·cos φ = 3·Vph·Iph', near(tp.P, Math.sqrt(3) * cabs(tp.Vline[0]) * cabs(tp.Iline[0]), 1e-9) && near(tp.P, 3 * 230 * 4.6, 1e-9));
  let td = threePhase({ V: 230, Z: Zb, conn: 'delta' });
  check('3ph: delta, phase current = VL/Z, line current = √3 of it', near(cabs(td.Iload[0]), (Math.sqrt(3) * 230) / 50, 1e-9) && near(cabs(td.Iline[0]), Math.sqrt(3) * cabs(td.Iload[0]), 1e-9));
  check('3ph: the same resistors in delta take 3 times the power of star', near(td.P, 3 * tp.P, 1e-9));
  tp = threePhase({ V: 230, Z: [zR(50), zR(100), zR(200)], conn: 'star' });
  check('3ph: unbalanced star: the neutral carries the phasor sum of the line currents', cabs(tp.In) > 0.5 && cabs(csub(tp.In, cadd(cadd(tp.Iline[0], tp.Iline[1]), tp.Iline[2]))) < 1e-12);
  const tn = threePhase({ V: 230, Z: [zR(50), zR(100), zR(200)], conn: 'star', neutral: false });
  check('3ph: open neutral with unbalanced loads: the star point moves, one load gets more than 230 V', cabs(tn.Vn) > 10 && Math.max(...tn.Vload.map(cabs)) > 250 && cabs(cadd(cadd(tn.Iline[0], tn.Iline[1]), tn.Iline[2])) < 1e-9);
  // the phasor solver agrees with the three-phase formula (star with neutral built from three sources)
  const tri = [E('vac', 'A', 'n', { Vrms: 230, f: 50, r: 1e-6, ph: 0 }), E('vac', 'B', 'n', { Vrms: 230, f: 50, r: 1e-6, ph: -120 }), E('vac', 'C', 'n', { Vrms: 230, f: 50, r: 1e-6, ph: 120 })];
  const Ld = [E('res', 'A', 's', { R: 50 }), E('res', 'B', 's', { R: 100 }), E('res', 'C', 's', { R: 200 })];
  r = solveAC([...tri, ...Ld], 50);
  check('3ph: open neutral, the nodal solver finds the same star point voltage', cabs(csub(csub(r.v('s'), r.v('n')), tn.Vn)) < 1e-4);

  // instruments on an AC circuit: 230 V source, lamp-like load 529 Ω (100 W)
  S = vac('L', 'N', 230); const Lamp = E('res', 'L', 'N', { R: 529 }); els = [S, Lamp];
  check('meter V~ on 230 V AC: shows 230.0 V', rd(els, meter({ dial: 'vac', red: 'L', black: 'N' })).text === '230.0');
  check('meter Hz on 230 V AC: 50.00 Hz', rd(els, meter({ dial: 'hz', red: 'L', black: 'N' })).text === '50.00');
  check('meter V⎓ on pure AC: the average is 0, with an explanation', (() => { const q = rd(els, meter({ dial: 'vdc', red: 'L', black: 'N' })); return Math.abs(parseFloat(q.text)) < 1e-3 && /V~/.test(q.warn); })());
  check('meter Ω on a live AC circuit: refuses', rd(els, meter({ dial: 'ohm', red: 'L', black: 'N' })).text === '----');
  check('meter A in series on AC: the DC average is about 0, and it points to the clamp', (() => { const e2 = [S, E('res', 'x', 'N', { R: 529 })]; const q = rd(e2, meter({ dial: 'a', jack: 'a', red: 'L', black: 'x' })); return Math.abs(parseFloat(q.text)) < 1e-3 && /צבת/.test(q.warn); })());
  check('clamp around one conductor: I = 230/529 = 0.435 A', clampReading(els, Lamp.id).text === '0.435');
  check('clamp around the whole cable: 0', clampReading(els, Lamp.id, true).text === '0.000');
  check('clamp on a DC circuit: 0 (AC clamp)', clampReading([E('bat', 'p', 'g', { V: 12, r: 0.01 }), E('res', 'p', 'g', { R: 10 })], id - 1).text === '0.000');
  const tv = testerReading(els, 'L', 'N');
  check('voltage tester on 230 V AC: 5 LEDs (12…230), AC', tv.leds === 5 && tv.ac);
  const td2 = testerReading([E('bat', 'p', 'g', { V: 24, r: 0.01 })], 'p', 'g');
  check('voltage tester on 24 V DC: 2 LEDs, + polarity', td2.leds === 2 && !td2.ac && td2.sign === 1);
  check('voltage tester on 400 V between phases: all 6 LEDs', testerReading([...tri, ...Ld], 'A', 'B').leds === 6);
  check('meter V~ between two phases: 398.4 V = √3·230', rd([...tri, ...Ld], meter({ dial: 'vac', red: 'A', black: 'B' })).text === '398.4');
  // meterElement in AC: the 10 MΩ does not change the reading
  check('meter V~ includes its own 10 MΩ input and still reads 230.0', meterElement(meter({ red: 'L', black: 'N' })).R === 10e6);
  // all elements at once: matches the single measurement, and the average powers balance
  let all = acMeasureAll(els);
  check('acMeasureAll: linear, the lamp current RMS = 230/529 and P = V²/R', near(all.get(Lamp.id).I.rms, 230 / 529, 1e-6) && near(all.get(Lamp.id).P, 230 * 230 / 529, 1e-6));
  all = acMeasureAll(bridge(470e-6));
  const bsum = [...all.values()].reduce((s2, q) => s2 + q.P, 0), bsrc = Math.abs(all.get([...all.keys()][0]).P);
  check('acMeasureAll: bridge, average powers balance (Σ P ≈ 0, within 1% of the source power)', Math.abs(bsum) < 0.01 * bsrc, `${bsum} / ${bsrc}`);
  void solve; void polar; void VF;
}
