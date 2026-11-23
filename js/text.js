// text.js: turns content text into safe HTML.
// - escapes HTML, **bold**, [[link]] -> plain name; $math$ stays for KaTeX auto-render
// - bidi: Hebrew is RTL while math, numbers and units are LTR. Every "$math$ unit"
//   and every "number unit" run is wrapped in an isolated LTR span, so the browser
//   cannot reorder its pieces around Hebrew text, e.g. "($E=200$ GPa, $\nu=0.3$)".

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const UNIT = '[A-Za-zµμΩ°%][A-Za-z0-9µμΩ°%·²³⁻¹]*(?:/[A-Za-z0-9µμ°²³]+)?';
// number (optionally a range or product) followed by an optional Latin unit
const NUM_UNIT = new RegExp(`\\d[\\d.,]*(?:\\s?[-–×x]\\s?\\d[\\d.,]*)?(?:\\s?(?:${UNIT}))?(?![\\p{L}\\d])`, 'gu');
const LEAD_UNIT = new RegExp(`^\\s?(?:${UNIT})(?![\\p{L}\\d])`, 'u');
// a run needs isolation only if it has a Latin unit or is a range/product
const NEEDS_LTR = /[A-Za-zµμΩ°%×–]|\d\s?[-x]\s?\d/;

function bidiText(t) {
  return esc(t).replace(NUM_UNIT, (m) => (NEEDS_LTR.test(m) ? `<span class="ltr">${m}</span>` : m));
}

export function rich(s) {
  const parts = String(s ?? '').split(/(\$[^$]+\$)/);
  let out = '';
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      const next = parts[i + 1] || '';
      const m = next.match(LEAD_UNIT);
      const unit = m ? m[0] : '';
      if (unit) parts[i + 1] = next.slice(unit.length);
      out += `<span class="ltr">${esc(parts[i])}${esc(unit)}</span>`;
    } else out += bidiText(parts[i]);
  }
  return out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[\[(.+?)\]\]/g, '$1');
}
