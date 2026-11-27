// Bolted joint: stiffness, joint constant, preload, loads, separation and factors of safety.
import { joint, kBolt, kMember } from '../js/bolt.js';
import { jointConstant, boltLoad, memberLoad, separationLoad, boltPreload, boltTorque, BOLT_AT } from '../js/formulas.js';
export function boltChecks(check, near) {
  const base = { size: 'M12', cls: '8.8', l: 40, ld: 20, member: 'steel', frac: 0.75, tq: 'zinc' };
  const j = joint({ ...base, P: 10e3 });
  check('bolt: Fi = 0.75·At·Sp, M12 8.8 = 0.75·84.3·580 = 36.7 kN', near(j.Fi, boltPreload(84.3, 580), 1e-12) && Math.abs(j.Fi - 36671) < 1);
  check('bolt: torque T = K·Fi·d = 0.2·36.7 kN·12 mm ≈ 88 N·m', near(j.T, boltTorque(0.2, j.Fi, 12) / 1000, 1e-12) && Math.abs(j.T - 88) < 0.5);
  check('bolt: C = kb/(kb + km) is between 0 and 1, and the members are stiffer than the bolt here', j.C > 0 && j.C < 0.5 && near(j.C, jointConstant(j.kb, j.km), 1e-12));
  check('bolt: bolt and member loads as in formulas.js, and Fb − Fm = P', near(j.Fb, boltLoad(j.C, 10e3, j.Fi), 1e-9) && near(-j.Fm, memberLoad(j.C, 10e3, j.Fi), 1e-9) && near(j.Fb - j.Fm, 10e3, 1e-9));
  check('bolt: separation load P0 = Fi/(1 − C)', near(j.P0, separationLoad(j.C, j.Fi), 1e-9));
  const s = joint({ ...base, P: j.P0 * 1.2 });
  check('bolt: above P0 the joint separates and the bolt carries all of P', s.sep && near(s.Fb, j.P0 * 1.2, 1e-9) && s.Fm === 0);
  check('bolt: at P0 the member load is just 0', Math.abs(joint({ ...base, P: j.P0 }).Fm) < 1e-6);
  check('bolt: a fully threaded grip (ld = 0) gives kb = At·E/l', near(kBolt(113.1, 84.3, 0, 40, 207e3), (84.3 * 207e3) / 40, 1e-9));
  check('bolt: member stiffness grows with d and falls with grip length', kMember(207e3, 16, 40) > kMember(207e3, 12, 40) && kMember(207e3, 12, 40) > kMember(207e3, 12, 80));
  check('bolt: aluminium members are softer, so the bolt takes a larger share (C up)', joint({ ...base, member: 'al', P: 1 }).C > joint({ ...base, P: 1 }).C);
  check('bolt: yield factor np = Fp/Fb, load factor nL = (Fp − Fi)/(C·P), separation n0 = Fi/(P(1 − C))', near(j.np, j.Fp / j.Fb, 1e-12) && near(j.nL, (j.Fp - j.Fi) / (j.C * 10e3), 1e-12) && near(j.n0, j.Fi / (10e3 * (1 - j.C)), 1e-12));
  check('bolt: fatigue Goodman: the point n·σa lies on the line from (σi, 0) to (Sut, Se)', (() => { const Sa = j.nf * j.sa, Sm = j.si + Sa; return near(Sa / j.Se + Sm / j.Sut, 1, 1e-9); })());
  check('bolt: with preload the bolt only sees C·P of the cyclic load: σa = C·P/(2At)', near(j.sa, (j.C * 10e3) / (2 * j.At), 1e-12));
  check('bolt: in Eq. 8-38 a higher preload raises σm and lowers nf a little (the gain is in σa, as long as the joint stays closed)', joint({ ...base, frac: 0.9, P: 10e3 }).nf < joint({ ...base, frac: 0.5, P: 10e3 }).nf);
  check('bolt: 8.8 above M16 is 600/830/660, 10.9 is 830/1040/940', joint({ ...base, size: 'M20', P: 0 }).Sp === 600 && joint({ ...base, cls: '10.9', P: 0 }).Sut === 1040);
  check('bolt: tensile stress area table has M6 to M24', BOLT_AT.M6 === 20.1 && BOLT_AT.M24 === 353);
}
