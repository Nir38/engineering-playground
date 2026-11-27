// pipeflow.js: one pipe run. Reynolds number, regime, Darcy friction factor (64/Re or Colebrook),
// head loss, pressure drop and the pumping power to overcome it. SI units.
// Source: Çengel & Cimbala, Fluid Mechanics, chapter 8 (Eq. 8-57 Colebrook, Table 8-2 roughness,
// Table A-3 water, A-9 air, A-7 engine oil). Tests: tests/columns-cases.mjs.
import { reynolds, frictionFactor, frictionHaaland, darcyHeadLoss, darcyPressureDrop, WATER, AIR, G0 } from './formulas.js';

export const SRC_P = 'Çengel & Cimbala, Fluid Mechanics, פרק 8';
export const FLUIDS = { water: { ...WATER, name: 'מים 20°C' }, air: { ...AIR, name: 'אוויר 20°C' }, oil: { rho: 888.1, mu: 0.8374, name: 'שמן מנוע 20°C' } };
// absolute roughness ε in mm (Table 8-2)
export const PIPES = { plastic: { eps: 0.0015, name: 'פלסטיק / נחושת' }, steel: { eps: 0.045, name: 'פלדה מסחרית' }, galv: { eps: 0.15, name: 'פלדה מגולוונת' }, cast: { eps: 0.26, name: 'ברזל יציקה' } };

export function pipe({ fluid, eps, D, V, L }) {
  const fl = FLUIDS[fluid], Re = reynolds(fl.rho, V, D, fl.mu), rel = eps / 1000 / D;
  const f = frictionFactor(Re, rel), regime = Re < 2300 ? 'laminar' : Re <= 4000 ? 'transitional' : 'turbulent';
  const hL = darcyHeadLoss(f, L, D, V), dp = darcyPressureDrop(f, L, D, V, fl.rho), Q = (Math.PI / 4) * D * D * V;
  return { V, D, Re, rel, f, fH: Re >= 4000 ? frictionHaaland(Re, rel) : NaN, regime, hL, dp, Q, P: dp * Q, rho: fl.rho, g: G0 };
}
// the same flow in a pipe of diameter D2: V scales with 1/D²
export const sameFlow = (o, D2) => pipe({ ...o, D: D2, V: (o.V * o.D * o.D) / (D2 * D2) });
