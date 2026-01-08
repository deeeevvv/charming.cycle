const CACHE_NAME = 'charming-cycle-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './logo.jpeg',
  './bg.jpg',
  './bg1.jpg',
  './img.jpg',
  './img.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});