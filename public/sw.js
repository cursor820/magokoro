/* まごころ Service Worker
   目的: インストール可能化（ホーム画面追加）とオフラインでのアプリ起動。
   方針:
   - 同一オリジンの静的アセット(JS/CSS/画像/フォント)だけをキャッシュする
   - HTMLナビゲーションはネットワーク優先＋オフライン時のみキャッシュにフォールバック（更新が確実に届く）
   - Firebase(Firestore/Auth)やGoogle Fonts等のクロスオリジンは一切触らずネットワークへ素通し（リアルタイム性を壊さない）
*/
const CACHE = "magokoro-cache-v1";
const STATIC_RE = /\.(?:js|css|png|jpe?g|svg|webp|gif|woff2?|ttf|ico|webmanifest)$/i;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(["/", "/index.html"]).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 別オリジン（Firebase・Google Fonts・Wikipedia等）はSWで扱わずネットワークに任せる
  if (url.origin !== self.location.origin) return;

  // ページ遷移: ネットワーク優先。取得できたら最新のindexをキャッシュ更新、失敗時のみキャッシュ
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("/index.html").then((r) => r || caches.match("/")))
    );
    return;
  }

  // 静的アセット: stale-while-revalidate（表示は即キャッシュ、裏で最新を取得して差し替え）
  if (STATIC_RE.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
