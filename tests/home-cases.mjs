// Home electricity checks: the breaker curve against the IEC 60898-1 test points, the RCD against
// IEC 61008-1, circuit currents, short-circuit current, touching a faulty case with and without earth,
// the fault-finding readings, and the two-way / boiler switching logic.
import {
  tripTime, breakerStep, MAG, rcdTripTime, RCD_IDN, CIRCUITS, MAIN, appCurrent, circuitCurrent, totalCurrent, loopR, shortCurrent, RHO_CU,
  touch, readings, consistent, FAULTS, twoWay, withCross, boilerOn, V,
} from '../js/home.js';
import { RHO, GRID } from '../js/circuit.js';
export function homeChecks(check, near) {
  // breaker: the IEC 60898-1 test points, for 10 A and 16 A, B and C
  for (const In of [10, 16]) for (const c of ['B', 'C']) {
    check(`home: MCB ${c}${In} does not trip at 1.13·In within 1 h`, tripTime(1.13 * In, In, c) > 3600);
    check(`home: MCB ${c}${In} trips at 1.45·In within 1 h`, tripTime(1.45 * In, In, c) < 3600);
    check(`home: MCB ${c}${In} at 2.55·In trips between 1 s and 60 s`, tripTime(2.55 * In, In, c) > 1 && tripTime(2.55 * In, In, c) < 60);
    check(`home: MCB ${c}${In} instant (< 0.1 s) at the top of its magnetic band`, tripTime(MAG[c][1] * In, In, c) < 0.1);
    check(`home: MCB ${c}${In} not instant just below the magnetic band`, tripTime(MAG[c][0] * In * 0.99, In, c) > 0.1);
  }
  check('home: MCB at its rated current never trips', tripTime(16, 16, 'B') === Infinity);
  check('home: more current, faster trip (thermal curve falls)', tripTime(20, 16) > tripTime(24, 16) && tripTime(24, 16) > tripTime(32, 16));
  // thermal memory: a constant 1.45·In trips after t(1.45·In)
  const st = { heat: 0, tripped: false }, tt = tripTime(23.2, 16); let t = 0;
  while (!st.tripped && t < 7200) { breakerStep(st, 23.2, 16, 'B', 1); t += 1; }
  check('home: breaker heat integral trips after t(I)', Math.abs(t - tt) <= 1.01, `${t} vs ${tt}`);
  // RCD
  check('home: RCD 30 mA (OSH G16)', RCD_IDN === 0.03);
  check('home: RCD does not trip below IΔn/2 (15 mA)', rcdTripTime(0.014) === Infinity);
  check('home: RCD trips at IΔn within 0.3 s', rcdTripTime(0.03) <= 0.3);
  check('home: RCD trips at 5·IΔn within 0.04 s', rcdTripTime(0.15) <= 0.04);
  // circuits
  check('home: kettle 2000 W on 230 V = 8.7 A', near(appCurrent({ P: 2000 }), 8.696, 1e-3));
  check('home: a load with pf 0.9 takes P/(V·pf)', near(appCurrent({ P: 1500, pf: 0.9 }), 1500 / 207, 1e-9));
  const kit = CIRCUITS.find((c) => c.id === 'kitchen'), on = { k1: true, k3: true };
  check('home: kettle + dishwasher on a 16 A circuit = 17.4 A, more than 16 A: trips after a while, not at once', near(circuitCurrent(kit, on), 4000 / 230, 1e-9) && tripTime(circuitCurrent(kit, on), 16) > 600);
  const two = { s3: true, s4: true, k1: true, k3: true };
  check('home: total current adds the circuits', near(totalCurrent(two), 8000 / 230, 1e-9) && near(totalCurrent(two, { sock: true }), 4000 / 230, 1e-9));
  check('home: main 40 A = 1×40 connection, 9.2 kW at 230 V', MAIN.In === 40 && near(MAIN.In * V, 9200, 1e-12));
  check('home: every circuit in the example list has In and a cable size, 1.5 mm² only on 10 A', CIRCUITS.every((c) => c.In > 0 && c.mm2 > 0) && CIRCUITS.filter((c) => c.mm2 === 1.5).every((c) => c.In <= 10));
  // short circuit
  check('home: loop resistance = supply + 2ρL/A (out and back)', near(loopR(20, 2.5, 0.3), 0.3 + (2 * 1.68e-8 * 20) / 2.5e-6, 1e-12) && RHO_CU === RHO.cu);
  const Ik = shortCurrent(20, 2.5, 0.3);
  check('home: short at a socket 20 m away: hundreds of amps, more than 5·In: a B16 trips instantly', Ik > 5 * 16 && tripTime(Ik, 16, 'B') < 0.1, String(Ik));
  check('home: a long thin cable lowers the short current (why cable length matters)', shortCurrent(60, 1.5) < shortCurrent(10, 2.5));
  // touching a faulty case
  const bad = touch({ earthed: false });
  check('home: no earth: the body takes 230/(R_body + R_floor) = 115 mA, far above 30 mA', near(bad.Ibody, 0.115, 1e-3) && bad.rcdTrips);
  check('home: no earth and no RCD: nothing disconnects', !touch({ earthed: false, rcd: false }).rcdTrips);
  const good = touch({ earthed: true });
  check('home: with earth: hundreds of amps to PE, the B16 breaker trips at once and the RCD too', good.If > 5 * 16 && good.mcbTime < 0.1 && good.rcdTrips, String(good.If));
  check('home: with earth the case is at about half of 230 V during the fault (PE as thick as the phase), less than without earth', good.Vcase > 0.3 * V && good.Vcase < 0.6 * V && good.Vcase < bad.Vcase);
  check('home: no earth: 115 mA through the body does not trip a 16 A breaker, only the RCD', bad.mcbTime === Infinity);
  // fault-finding readings
  check('home: healthy socket: L-N 230, L-PE 230, N-PE about 0', (() => { const r = readings('ok'); return r.LN === 230 && r.LPE === 230 && r.NPE < 5; })());
  check('home: broken neutral: L-N 0 but N-PE 230 (the neutral is live through the device)', (() => { const r = readings('brokenN'); return r.LN === 0 && r.NPE === 230 && r.LPE === 230; })());
  check('home: swapped L and N: L-N still 230 (V~ has no sign), but L-PE 0 and N-PE 230', (() => { const r = readings('swap'); return r.LN === 230 && r.LPE < 5 && r.NPE === 230; })());
  check('home: broken PE: only the continuity test shows it (OL)', readings('brokenPE').PEohm === Infinity && readings('brokenPE').LN === 230);
  check('home: broken phase vs tripped breaker: same at the socket, different at the panel', JSON.stringify(readings('brokenL')) === JSON.stringify(readings('mcb')) && readings('brokenL', 'panel').LN === 230 && readings('mcb', 'panel').LN === 0);
  check('home: one L-N reading of 0 fits three faults', consistent([{ point: 'socket', pair: 'LN', value: 0 }]).length === 3);
  check('home: L-N 0 at the socket and 230 at the panel: broken L or broken N', JSON.stringify(consistent([{ point: 'socket', pair: 'LN', value: 0 }, { point: 'panel', pair: 'LN', value: 230 }]).sort()) === JSON.stringify(['brokenL', 'brokenN']));
  check('home: every fault can be told apart from the others with all the measurements', FAULTS.every((f) => { const all = ['socket', 'panel'].flatMap((p) => ['LN', 'LPE', 'NPE', 'PEohm'].map((pair) => ({ point: p, pair, value: readings(f.id, p)[pair] }))); const c = consistent(all); return c.length === 1 && c[0] === f.id; }));
  // switching logic
  check('home: two-way switching: the lamp is on when both switches agree, and either switch toggles it', twoWay(0, 0) && !twoWay(0, 1) && twoWay(1, 1) && twoWay(0, 0) !== twoWay(1, 0) && twoWay(0, 0) !== twoWay(0, 1));
  check('home: intermediate switch: any of three switches toggles the lamp', [0, 1].every((a) => [0, 1].every((x) => [0, 1].every((b) => withCross(a, x, b) !== withCross(1 - a, x, b) && withCross(a, x, b) !== withCross(a, 1 - x, b) && withCross(a, x, b) !== withCross(a, x, 1 - b)))));
  check('home: boiler heats only with the switch on, the clock on (if used) and the thermostat closed', boilerOn({ sw: true, clock: true, clockOn: true, thermo: true }) && !boilerOn({ sw: true, clock: true, clockOn: false, thermo: true }) && boilerOn({ sw: true, clock: false, clockOn: false, thermo: true }) && !boilerOn({ sw: false, clock: false, thermo: true }) && !boilerOn({ sw: true, clock: false, thermo: false }));
  check('home: grid 230 V is the same in home.js and circuit.js', V === GRID.V);
}
