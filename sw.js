// Service worker: makes the app work offline and update itself.
// Strategy: network first (so new content arrives when online), cache fallback (offline).
// Bump VERSION on every release so old caches are cleaned.
const VERSION = 'mh-3.17.0';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/app.js', 'js/text.js', 'js/srs.js', 'js/beam.js', 'js/playground.js', 'js/pulleys.js', 'js/playground-pulleys.js', 'js/truss.js', 'js/playground-truss.js', 'js/hydro.js', 'js/playground-fluid.js', 'js/vibration.js', 'js/playground-vib.js', 'js/fbd.js', 'js/playground-fbd.js', 'js/airfoil.js', 'js/playground-air.js', 'js/lbm.js', 'js/playground-tunnel.js', 'js/mohr.js', 'js/fatigue.js', 'js/stack.js', 'js/playground-tol.js', 'js/playground-fat.js', 'js/columns.js', 'js/pipeflow.js', 'js/playground-buck.js', 'js/playground-moody.js', 'js/interview.js', 'js/hunt.js', 'js/playground-hunt.js', 'js/kt.js', 'js/playground-kt.js', 'js/bolt.js', 'js/playground-bolt.js', 'js/gears.js', 'js/playground-gears.js', 'js/springs.js', 'js/playground-springs.js', 'js/shaft.js', 'js/playground-shaft.js', 'js/playground-mohr.js', 'js/circuit.js', 'js/playground-circuit.js', 'js/elec-ui.js', 'js/dmm.js', 'js/playground-ac.js', 'js/playground-trans.js', 'js/playground-xfmr.js', 'js/playground-3ph.js', 'js/home.js', 'js/playground-home.js', 'js/playground-wiring.js', 'js/playground-faults.js', 'js/machines.js', 'js/playground-motors.js', 'js/playground-pump.js', 'js/playground-appliances.js', 'js/scenes.js', 'js/playground-saved.js', 'js/formulas.js', 'js/generators.js', 'js/diagrams.js',
  'data/catalog.js', 'data/strength.js', 'data/fluids.js', 'data/materials.js', 'data/thermo.js', 'data/electric.js', 'data/design.js', 'data/gdt.js', 'data/mfg.js', 'data/dynamics.js', 'data/fea.js', 'data/cad.js',
  'vendor/katex/katex.min.css', 'vendor/katex/katex.min.js', 'vendor/katex/auto-render.min.js',
  'vendor/katex/fonts/KaTeX_Main-Regular.woff2', 'vendor/katex/fonts/KaTeX_Math-Italic.woff2',
  'vendor/katex/fonts/KaTeX_Main-Bold.woff2', 'vendor/katex/fonts/KaTeX_Size1-Regular.woff2',
  'vendor/katex/fonts/KaTeX_Size2-Regular.woff2', 'vendor/katex/fonts/KaTeX_AMS-Regular.woff2',
  'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    // no-cache: ask the server every time (a cheap 304 when nothing changed), so the browser's HTTP cache
    // never serves an old module next to new ones right after a release
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});
