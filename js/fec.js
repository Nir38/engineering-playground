// fec.js: the iron–iron carbide (Fe–Fe3C) phase diagram for the playground. Key points: FE_C in
// formulas.js (Callister, Materials Science and Engineering, ch. 9). The phase boundaries between the key
// points are drawn as straight lines (the real ones are slightly curved), and the δ-ferrite corner above
// 1394 °C is left out. The Fe3C liquidus end at 1227 °C is approximate (Callister Fig. 9.24 shows it dashed).
// Tests: tests/fec-cases.mjs.
import { FE_C, leverRule } from './formulas.js';

export const SRC_FC = 'Callister, Materials Science and Engineering, פרק 9';
const { eutectoidC: E, eutectoidT: TE, ferriteMaxC: AF, cementiteC: CM, austeniteMaxC: GM, eutecticC: EU, eutecticT: TU, A3pure } = FE_C;
export const TM = 1538, TCM = 1227; // melting point of iron; top of the Fe3C liquidus (approx.)

// boundary lines, each as composition at temperature T
const lin = (T, T0, C0, T1, C1) => C0 + ((C1 - C0) * (T - T0)) / (T1 - T0);
export const cA3 = (T) => lin(T, A3pure, 0, TE, E);              // γ / α+γ
export const cAlpha = (T) => (T >= TE ? lin(T, A3pure, 0, TE, AF) : (AF * Math.max(T, 0)) / TE); // α / α+γ and α / α+Fe3C
export const cAcm = (T) => lin(T, TE, E, TU, GM);                 // γ / γ+Fe3C
export const cSolidus = (T) => lin(T, TM, 0, TU, GM);             // γ / γ+L
export const cLiqL = (T) => lin(T, TM, 0, TU, EU);                // L / L+γ
export const cLiqR = (T) => lin(T, TCM, CM, TU, EU);              // L / L+Fe3C
// temperature of a boundary at composition C (for drawing and tests)
export const tA3 = (C) => A3pure + ((TE - A3pure) * C) / E;
export const tAcm = (C) => TE + ((TU - TE) * (C - E)) / (GM - E);
export const tLiq = (C) => (C <= EU ? TM + ((TU - TM) * C) / EU : TU + ((TCM - TU) * (C - EU)) / (CM - EU));
export const tSol = (C) => (C <= GM ? TM + ((TU - TM) * C) / GM : TU);

const NAMES = { L: 'נוזל (L)', g: 'אוסטניט (γ)', a: 'פריט (α)', c: 'צמנטיט (Fe₃C)' };
// phases at (C wt%, T °C): [{ ph, C, W }] with compositions and mass fractions (lever rule)
export function phasesAt(C, T) {
  const two = (p1, c1, p2, c2) => { const W2 = Math.min(1, Math.max(0, leverRule(C, c1, c2))); return [{ ph: p1, C: c1, W: 1 - W2 }, { ph: p2, C: c2, W: W2 }]; };
  const one = (p) => [{ ph: p, C, W: 1 }];
  if (T >= tLiq(C)) return one('L');
  if (T >= TU) {
    if (C <= GM && T <= tSol(C)) return one('g');
    if (C <= EU) return two('g', cSolidus(T), 'L', cLiqL(T));
    return two('L', cLiqR(T), 'c', CM);
  }
  if (T >= TE) {
    if (C <= E) { if (T >= tA3(C)) return one('g'); if (C <= cAlpha(T)) return one('a'); return two('a', cAlpha(T), 'g', cA3(T)); }
    if (C <= GM && T >= tAcm(C)) return one('g');
    return two('g', cAcm(T), 'c', CM);
  }
  if (C <= cAlpha(T)) return one('a');
  return two('a', cAlpha(T), 'c', CM);
}
export const phaseName = (p) => NAMES[p];

// microconstituents just below 727 °C after slow cooling (Callister 9.19–9.22)
export function micro(C) {
  if (C <= AF) return { kind: 'ferrite', parts: [{ name: 'פריט', W: 1 }] };
  if (C < E - 1e-9) { const Wp = leverRule(C, AF, E); return { kind: 'hypo', parts: [{ name: 'פריט ראשוני (פרואוטקטואידי)', W: 1 - Wp }, { name: 'פרליט', W: Wp }] }; }
  if (Math.abs(C - E) <= 1e-9) return { kind: 'eut', parts: [{ name: 'פרליט', W: 1 }] };
  if (C <= GM) { const Wp = (CM - C) / (CM - E); return { kind: 'hyper', parts: [{ name: 'פרליט', W: Wp }, { name: 'צמנטיט ראשוני (פרואוטקטואידי)', W: 1 - Wp }] }; }
  return { kind: 'castiron', parts: [] };
}
