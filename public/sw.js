// 補給管理システム Service Worker
const CACHE = 'trail-supply-v3';

// インストール時にキャッシュするURLをすべて列挙
const PRECACHE = [
  '/trail-supply/',
  '/trail-supply/index.html',
  '/trail-supply/assets/index.js',
  '/trail-supply/assets/index.css',
  '/trail-supply/pwa-192x192.png',
  '/trail-supply/pwa-512x512.png',
  '/trail-supply/manifest.webmanifest',
];

// インストール: 全ファイルをキャッシュに入れてから即有効化
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// 有効化: 古いキャッシュを削除して全クライアントを掌握
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// フェッチ: キャッシュ優先、なければネットワーク（新しいものはキャッシュに追加）
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // キャッシュがあればすぐ返し、バックグラウンドで更新
        fetch(event.request)
          .then((res) => {
            if (res && res.ok) {
              caches.open(CACHE).then((c) => c.put(event.request, res));
            }
          })
          .catch(() => {});
        return cached;
      }

      // キャッシュなし: ネットワーク取得してキャッシュに追加
      return fetch(event.request)
        .then((res) => {
          if (res && res.ok) {
            caches.open(CACHE).then((c) => c.put(event.request, res.clone()));
          }
          return res;
        })
        .catch(() => {
          // オフライン時のナビゲーションはindex.htmlを返す
          if (event.request.mode === 'navigate') {
            return caches.match('/trail-supply/index.html');
          }
        });
    })
  );
});
