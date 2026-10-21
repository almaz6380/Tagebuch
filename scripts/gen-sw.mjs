// Generates dist/sw.js after `expo export -p web`: precaches the whole static
// build so the PWA works offline. A new build gets a new cache name, which
// replaces the old cache on activation. Paths are relative to sw.js, so the
// worker works under any base URL (e.g. /Tagebuch on GitHub Pages).
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const dist = 'dist';

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(dist)
  .map((f) => relative(dist, f).split(sep).join('/'))
  .filter((f) => f !== 'sw.js' && !f.endsWith('.map'));

const version = Date.now().toString(36);

const sw = `const CACHE = 'tagebuch-${version}';
const PRECACHE = ${JSON.stringify(files)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // Pages: network first so updates arrive, cached copy when offline.
    event.respondWith(
      fetch(req).catch(async () => {
        const scope = new URL(self.registration.scope).pathname;
        const page = new URL(req.url).pathname.slice(scope.length).replace(/\\/$/, '') || 'index';
        return (await caches.match(page + '.html')) || (await caches.match(req)) || caches.match('index.html');
      }),
    );
    return;
  }
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
`;

writeFileSync(join(dist, 'sw.js'), sw);
console.log(`sw.js: ${files.length} Dateien vorab gecacht (Version ${version})`);
