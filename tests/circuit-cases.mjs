// Circuit checks: Ohm and Kirchhoff, series / parallel / divider / Wheatstone, power balance,
// RC and RL time constants, diode, fuse, cable resistance, and what the multimeter shows.
import { solve, step, emptyState, cableR, lampR, VF, meterElement, meterReading, RHO } from '../js/circuit.js';
export function circuitChecks(check, near) {
  let id = 1;
  const E = (type, a, b, p = {}) => ({ id: id++, type, a, b, ...p });
  const bat = (a, b, V, r = 1e-6) => E('bat', a, b, { V, r });
  const sumAt = (els, r, node) => els.reduce((s, e) => s + (e.a === node ? r.I.get(e.id) : 0) - (e.b === node ? r.I.get(e.id) : 0), 0);

  // Ohm: 12 V over 6 Ω
  let B = bat('p', 'n', 12), R1 = E('res', 'p', 'n', { R: 6 });
  let r = solve([B, R1]);
  check('circuit: Ohm, 12 V over 6 Ω gives 2 A', near(r.I.get(R1.id), 2, 1e-6));
  check('circuit: the battery current is the same (KCL), and flows out of +', near(-r.I.get(B.id), 2, 1e-6));
  // internal resistance: V = E − I·r
  B = bat('p', 'n', 12, 0.5); R1 = E('res', 'p', 'n', { R: 5.5 }); r = solve([B, R1]);
  check('circuit: internal resistance, terminal voltage = E − I·r = 11 V', near(r.v('p') - r.v('n'), 11, 1e-9) && near(r.I.get(R1.id), 2, 1e-9));
  // series and parallel, divider
  B = bat('a', 'g', 10); const Ra = E('res', 'a', 'm', { R: 1000 }), Rb = E('res', 'm', 'g', { R: 3000 });
  r = solve([B, Ra, Rb]);
  check('circuit: divider, Vout = V·R2/(R1 + R2) = 7.5 V', near(r.v('m') - r.v('g'), 7.5, 1e-6));
  const P1 = E('res', 'a', 'g', { R: 100 }), P2 = E('res', 'a', 'g', { R: 300 }); B = bat('a', 'g', 6);
  r = solve([B, P1, P2]);
  check('circuit: parallel, 100 Ω ∥ 300 Ω = 75 Ω, total 80 mA', near(-r.I.get(B.id), 6 / 75, 1e-6) && near(r.I.get(P1.id), 0.06, 1e-6));
  // Wheatstone bridge: balanced → no current in the middle
  const wb = () => { B = bat('t', 'g', 10); return [B, E('res', 't', 'x', { R: 100 }), E('res', 'x', 'g', { R: 200 }), E('res', 't', 'y', { R: 50 }), E('res', 'y', 'g', { R: 100 })]; };
  let els = [...wb(), E('res', 'x', 'y', { R: 500 })]; r = solve(els);
  check('circuit: balanced Wheatstone bridge (R1/R2 = R3/R4): no current through the bridge', Math.abs(r.I.get(els[5].id)) < 1e-9);
  check('circuit: KCL holds at every node of the bridge', ['t', 'x', 'y'].every((n) => Math.abs(sumAt(els, r, n)) < 1e-6));
  els[4].R = 120; r = solve(els);
  check('circuit: unbalanced bridge: current flows across', Math.abs(r.I.get(els[5].id)) > 1e-4);
  // power balance: what the battery gives = what the resistors take
  const pAbs = els.reduce((s, e) => s + r.Vd.get(e.id) * r.I.get(e.id), 0);
  check('circuit: power balance (Σ V·I = 0, the battery gives what the resistors use)', Math.abs(pAbs) < 1e-6, String(pAbs));
  // KVL around the loop of the divider
  B = bat('a', 'g', 10); els = [B, E('res', 'a', 'm', { R: 1000 }), E('res', 'm', 'g', { R: 3000 })]; r = solve(els);
  check('circuit: KVL, the voltages around the loop sum to 0', Math.abs(r.Vd.get(els[1].id) + r.Vd.get(els[2].id) - r.Vd.get(els[0].id)) < 1e-6);
  // RC charging: after τ the capacitor is at 63.2%
  const RCrun = () => {
    const C = E('cap', 'm', 'g', { C: 100e-6 }); els = [bat('a', 'g', 10), E('res', 'a', 'm', { R: 1000 }), C];
    const st = emptyState(), tau = 0.1, dt = tau / 2000; for (let k = 0; k < 2000; k++) step(els, st, dt);
    return st.vc.get(C.id);
  };
  check('circuit: RC charging, V(τ) = V0·(1 − 1/e) = 6.32 V', Math.abs(RCrun() - 10 * (1 - Math.exp(-1))) < 0.01);
  // RL: i(τ) = 63.2% of V/R, τ = L/R
  const L = E('ind', 'm', 'g', { L: 1 }); els = [bat('a', 'g', 10), E('res', 'a', 'm', { R: 10 }), L];
  let st = emptyState(); for (let k = 0; k < 2000; k++) step(els, st, 0.1 / 2000);
  check('circuit: RL, i(τ = L/R) = (V/R)·(1 − 1/e)', Math.abs(st.il.get(L.id) - 1 * (1 - Math.exp(-1))) < 0.002, String(st.il.get(L.id)));
  // diode: forward drop, reverse blocks
  let D = E('diode', 'a', 'm'); els = [bat('a', 'g', 5), D, E('res', 'm', 'g', { R: 1000 })]; r = solve(els);
  check('circuit: diode forward, about 0.7 V across it, (5 − 0.7)/1 kΩ', Math.abs(r.Vd.get(D.id) - VF) < 0.01 && Math.abs(r.I.get(D.id) - 4.3e-3) < 2e-5);
  D = E('diode', 'm', 'a'); els = [bat('a', 'g', 5), D, E('res', 'm', 'g', { R: 1000 })]; r = solve(els);
  check('circuit: diode reversed, blocks (almost no current)', Math.abs(r.I.get(D.id)) < 1e-6);
  // fuse blows in a short, not in normal use
  const F = E('fuse', 'a', 'm', { I: 2 }); els = [bat('a', 'g', 12, 0.05), F, E('res', 'm', 'g', { R: 12 })];
  check('circuit: fuse 2 A with a 1 A load does not blow', step(els, emptyState(), 1e-3).blown.length === 0);
  els.push(E('wire', 'm', 'g')); check('circuit: a short (wire across the load) blows the fuse', step(els, emptyState(), 1e-3).blown.length === 1);
  // cable and lamp
  check('circuit: cable R = ρL/A, 20 m of 1.5 mm² copper = 0.224 Ω', near(cableR(20, 1.5, 'cu'), (RHO.cu * 20) / 1.5e-6, 1e-12) && Math.abs(cableR(20, 1.5, 'cu') - 0.224) < 1e-3);
  check('circuit: lamp 12 V 6 W has R = V²/P = 24 Ω', near(lampR(12, 6), 24, 1e-12));
  // open switch: nothing flows
  const S = E('sw', 'a', 'm', { on: false }); els = [bat('a', 'g', 9), S, E('res', 'm', 'g', { R: 10 })]; r = solve(els);
  check('circuit: open switch, no current, all the voltage across the switch', Math.abs(r.I.get(S.id)) < 1e-6 && near(r.Vd.get(S.id), 9, 1e-6));

  // ---------- multimeter ----------
  const meter = (o) => ({ dial: 'vdc', jack: 'v', red: null, black: null, fuseOK: true, ...o });
  const read = (els0, m, state = emptyState()) => { const me = meterElement(m), all = me ? [...els0, me] : els0, live = step(all, state, 1e-3); return { live, R: meterReading(els0, live, m, state) }; };
  els = [bat('a', 'g', 10), E('res', 'a', 'm', { R: 1000 }), E('res', 'm', 'g', { R: 3000 })];
  check('meter V⎓: across the 3 kΩ resistor shows 7.499 V (the 10 MΩ input loads it a little: 7.4994)', read(els, meter({ red: 'm', black: 'g' })).R.text === '7.499');
  check('meter V⎓: probes the other way round show −7.500', read(els, meter({ red: 'g', black: 'm' })).R.text === '-7.499');
  check('meter V~ on a DC circuit shows 0 and explains', (() => { const q = read(els, meter({ dial: 'vac', red: 'm', black: 'g' })).R; return q.text === '0.000' && q.warn.length > 0; })());
  check('meter OFF shows nothing', read(els, meter({ dial: 'off', red: 'm', black: 'g' })).R.text === '');
  // current: open the circuit, put the meter in the gap
  els = [bat('a', 'g', 10), E('res', 'x', 'm', { R: 1000 }), E('res', 'm', 'g', { R: 3000 })]; // gap between a and x
  check('meter mA in series: 10 V / (4 kΩ + 1 Ω shunt) = 2.499 mA', read(els, meter({ dial: 'ma', jack: 'ma', red: 'a', black: 'x' })).R.text === '2.499');
  check('meter A in series: 0.002 A (the A range has less resolution)', read(els, meter({ dial: 'a', jack: 'a', red: 'a', black: 'x' })).R.text === '0.002');
  check('meter on A with the red probe still in V: shows 0 and says to move it', (() => { const q = read(els, meter({ dial: 'a', jack: 'v', red: 'a', black: 'x' })).R; return q.text === '0.000' && /שקע A/.test(q.warn); })());
  // the classic mistake: A jack across a battery = short through the meter
  const short = read([bat('a', 'g', 12, 0.05)], meter({ dial: 'vdc', jack: 'a', red: 'a', black: 'g' }));
  check('meter: red probe in the A jack across a battery = a short, more than the 10 A fuse', Math.abs(short.live.I.get('meter')) > 10 && /שקע הזרם/.test(short.R.warn));
  // resistance: only on a dead circuit
  els = [E('sw', 'a', 'b', { on: false }), bat('b', 'g', 10), E('res', 'a', 'm', { R: 1000 }), E('res', 'm', 'g', { R: 3000 })];
  check('meter Ω: 1 kΩ + 3 kΩ in series, circuit off, shows 4.000 kΩ', (() => { const q = read(els, meter({ dial: 'ohm', red: 'a', black: 'g' })).R; return q.text === '4.000' && q.unit === 'kΩ'; })());
  els[0].on = true;
  check('meter Ω on a live circuit: refuses (----) and warns', read(els, meter({ dial: 'ohm', red: 'm', black: 'g' })).R.text === '----');
  check('meter Ω: a wire beeps (continuity), an open circuit shows OL', (() => { const w = [E('wire', 'p', 'q'), E('res', 'q', 'z', { R: 1e3 })]; return read(w, meter({ dial: 'ohm', red: 'p', black: 'q' })).R.beep && read([E('res', 'p', 'q', { R: 10 })], meter({ dial: 'ohm', red: 'p', black: 'z' })).R.text === 'OL'; })());
  // diode test
  D = E('diode', 'p', 'q');
  check('meter diode test: forward about 0.7 V, reverse OL', (() => { const f = read([D], meter({ dial: 'diode', red: 'p', black: 'q' })).R, b = read([D], meter({ dial: 'diode', red: 'q', black: 'p' })).R; return Math.abs(parseFloat(f.text) - VF) < 0.06 && b.text === 'OL'; })());
  // capacitance
  check('meter capacitance: a 100 µF capacitor reads 100 µF', (() => { const q = read([E('cap', 'p', 'q', { C: 100e-6 })], meter({ dial: 'cap', red: 'p', black: 'q' })).R; return Math.abs(parseFloat(q.text) - 100) < 1 && q.unit === 'µF'; })());
  check('meter capacitance: a resistor alone reads 0', read([E('res', 'p', 'q', { R: 1e3 })], meter({ dial: 'cap', red: 'p', black: 'q' })).R.text === '0.000');
}
