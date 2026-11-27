// Stress concentration factors: limits, chart values and notch sensitivity.
import { ktHole, ktEllipse, ktShoulder, sqrtA, qNotch, kf } from '../js/kt.js';
export function ktChecks(check, near) {
  check('Kt hole: a small hole in a wide plate gives 3 (Kirsch)', near(ktHole(0), 3, 1e-12));
  check('Kt hole: falls as the hole fills the width (net section), about 2.16 at d/W = 0.5', Math.abs(ktHole(0.5) - 2.16) < 0.01 && ktHole(0.2) > ktHole(0.5));
  check('Kt ellipse: a circle (a = b) gives 3, a/b = 5 gives 11, a/b → 0 gives 1', near(ktEllipse(1, 1), 3, 1e-12) && near(ktEllipse(5, 1), 11, 1e-12) && near(ktEllipse(1e-9, 1), 1, 1e-6));
  // Shigley Fig. A-15-7 to A-15-9 read at D/d = 1.5, r/d = 0.1: tension ≈ 1.8–1.9, bending ≈ 1.6–1.75, torsion ≈ 1.4
  const t = ktShoulder(1.5, 1, 0.1, 'axial').Kt, b = ktShoulder(1.5, 1, 0.1, 'bend').Kt, q = ktShoulder(1.5, 1, 0.1, 'tors').Kt;
  check('Kt shoulder, D/d 1.5, r/d 0.1: tension ≈ 1.85, bending ≈ 1.74, torsion ≈ 1.41 (same order as the charts)', Math.abs(t - 1.85) < 0.02 && Math.abs(b - 1.74) < 0.02 && Math.abs(q - 1.41) < 0.02, `${t} ${b} ${q}`);
  check('Kt shoulder: tension > bending > torsion for the same shape', t > b && b > q);
  check('Kt shoulder: a larger fillet radius lowers Kt (all loads)', ['axial', 'bend', 'tors'].every((l) => ktShoulder(1.5, 1, 0.05, l).Kt > ktShoulder(1.5, 1, 0.1, l).Kt && ktShoulder(1.5, 1, 0.1, l).Kt > ktShoulder(1.5, 1, 0.2, l).Kt));
  check('Kt shoulder: the two fit ranges meet at h/r = 2 (no jump)', ['axial', 'bend'].every((l) => Math.abs(ktShoulder(1.5, 1, 0.125, l).Kt - ktShoulder(1.5, 1, 0.12499, l).Kt) < 0.02));
  check('Kt shoulder: says when h/r is outside the fit', ktShoulder(1.5, 1, 0.01, 'tors').ok === false && ktShoulder(1.5, 1, 0.1, 'tors').ok === true);
  check('notch: √a = 0.062 √in for Sut = 100 kpsi (Shigley Eq. 6-35a)', Math.abs(sqrtA(689.476, 'bend') - 0.0623) < 0.0005);
  check('notch: q grows with the radius and with Sut (strong steel is more notch sensitive)', qNotch(700, 3, 'bend') > qNotch(700, 0.5, 'bend') && qNotch(1400, 1, 'bend') > qNotch(500, 1, 'bend'));
  check('notch: Kf is between 1 and Kt', near(kf(2.5, 0), 1, 1e-12) && near(kf(2.5, 1), 2.5, 1e-12) && kf(2.5, qNotch(700, 1, 'bend')) < 2.5);
}
