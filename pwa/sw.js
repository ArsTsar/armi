// Service worker Арми: сеть-first для всего, офлайн-фолбэк на кеш.
// Так приложение открывается без интернета (оболочка + последний CSS),
// но обновления приходят сразу, без старых версий из кеша.
const CACHE = 'armi-9-2';
const CORE = [
  '/armi/',
  '/armi/index.html',
  '/armi/manifest.json',
  '/armi/icons/icon-192.png',
  '/armi/icons/icon-512.png',
  '/armi/icons/icon-maskable-512.png',
  '/armi/favicon-32.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // API не кешируем никогда (чат, ASR, конспекты)
  if (url.pathname.startsWith('/api/')) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((hit) => hit || caches.match('/armi/index.html'))
      )
  );
});
