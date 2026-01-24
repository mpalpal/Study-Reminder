const CACHE_NAME = "study-log-cache-v1";
const ASSETS = [
  "/",              // index.html
  "/index.html",
  "/styles.css",
  "/main.js",
  "/manifest.json",
  "/icons/icon340.jpeg"
];

// インストール：必要ファイルをキャッシュ
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});mou

// 有効化：古いキャッシュを削除
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// フェッチ：基本はキャッシュ優先、なければネット
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // GET以外は触らない
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          // 成功したらキャッシュに追加（同一オリジンだけ）
          const url = new URL(req.url);
          if (url.origin === location.origin) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          // オフライン時の最低限フォールバック
          return caches.match("/index.html");
        });
    })
  );
});