// catalog.js: the list of all domains. A domain with `module` has content;
// the rest are shown as "בקרוב" so the full map is visible from day one.
// To add a domain: create data/<id>.js (see CONTENT-GUIDE.md), import it here.
import strength from './strength.js';
import fluids from './fluids.js';
import materials from './materials.js';
import thermo from './thermo.js';
import electric from './electric.js';
import design from './design.js';
import gdt from './gdt.js';
import mfg from './mfg.js';
import dynamics from './dynamics.js';
import fea from './fea.js';
import cad from './cad.js';

export const domains = [
  { id: 'strength', module: strength },
  { id: 'fluids', module: fluids },
  { id: 'materials', module: materials },
  { id: 'thermo', module: thermo },
  { id: 'electric', module: electric },
  { id: 'design', module: design },
  { id: 'gdt', module: gdt },
  { id: 'dfm', module: mfg },
  { id: 'dynamics', module: dynamics },
  { id: 'fea', module: fea },
  { id: 'cad', module: cad },
];

export function allDomains() {
  return domains.map((d) => (d.module ? { ...d.module, soon: false } : d));
}
