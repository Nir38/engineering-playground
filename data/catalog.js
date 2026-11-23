// catalog.js: the list of all domains. A domain with `module` has content;
// the rest are shown as "בקרוב" so the full map is visible from day one.
// To add a domain: create data/<id>.js (see CONTENT-GUIDE.md), import it here.
import strength from './strength.js';
import fluids from './fluids.js';
import materials from './materials.js';
import thermo from './thermo.js';
import electric from './electric.js';

export const domains = [
  { id: 'strength', module: strength },
  { id: 'fluids', module: fluids },
  { id: 'materials', module: materials },
  { id: 'thermo', module: thermo },
  { id: 'electric', module: electric },
  { id: 'design', title: 'תכן רכיבי מכונות', icon: '⚙️', summary: 'ברגים, מסבים, גלגלי שיניים, צירים', soon: true },
  { id: 'gdt', title: 'שרטוט, טולרנסים ו-GD&T', icon: '📐', summary: 'התאמות, טולרנסים גיאומטריים, Datums', soon: true },
  { id: 'dfm', title: 'ייצור ו-DFM', icon: '🏭', summary: 'עיבוד שבבי, פח, יציקה, הזרקה', soon: true },
  { id: 'dynamics', title: 'דינמיקה ורעידות', icon: '〰️', summary: 'קינמטיקה, תדר עצמי, ריסון', soon: true },
  { id: 'fea', title: 'FEA וסימולציה', icon: '🧮', summary: 'רשת, תנאי שפה, אימות תוצאות', soon: true },
  { id: 'cad', title: 'CAD ו-SOLIDWORKS', icon: '🖥️', summary: 'מידול, הרכבות, שרטוטים', soon: true },
];

export function allDomains() {
  return domains.map((d) => (d.module ? { ...d.module, soon: false } : d));
}
