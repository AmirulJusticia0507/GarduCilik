/**
 * Service worker GarduCilik.
 *
 * Strategi:
 * - Navigasi: network-first, fallback ke halaman yang pernah dikunjungi,
 *   shell "/", lalu halaman /offline. Tidak ada data simulasi yang disimpan,
 *   sehingga kondisi lama tidak pernah disajikan sebagai kondisi waktu nyata.
 * - Aset statis Next.js: cache-first karena nama file sudah ber-hash.
 * - Permintaan lain: langsung ke jaringan tanpa cache.
 */
const CACHE_PREFIX = "garducilik";
const CACHE_VERSION = "v1";
const CORE_CACHE = `${CACHE_PREFIX}-core-${CACHE_VERSION}`;
const PAGE_CACHE = `${CACHE_PREFIX}-pages-${CACHE_VERSION}`;
const ASSET_CACHE = `${CACHE_PREFIX}-assets-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CORE_CACHE);
      await Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })),
        ),
      );

      // Simpan seluruh chunk build agar kunjungan pertama tetap bisa
      // dihidrasi saat offline. Daftar aset dibuat setelah `next build`.
      const staticAssets = new Set();

      try {
        const response = await fetch("/precache-manifest.json", {
          cache: "no-store",
        });

        if (response.ok) {
          const manifest = await response.json();
          for (const asset of manifest.assets ?? []) {
            if (
              typeof asset === "string" &&
              asset.startsWith("/_next/static/")
            ) {
              staticAssets.add(asset);
            }
          }
        }
      } catch {
        // Manifest belum tersedia (misalnya build lama); lanjutkan dengan
        // pemindaian HTML di bawah.
      }

      // Fallback: ambil aset Next.js yang dirujuk langsung oleh shell.
      const shell = await cache.match("/");
      if (shell) {
        const html = await shell.text();

        for (const match of html.matchAll(
          /(?:src|href)="(\/_next\/static\/[^"?#]+)"/g,
        )) {
          staticAssets.add(match[1]);
        }
      }

      await Promise.allSettled(
        [...staticAssets].map((url) =>
          cache.add(new Request(url, { cache: "reload" })),
        ),
      );

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const activeCaches = new Set([CORE_CACHE, PAGE_CACHE, ASSET_CACHE]);
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter(
            (name) => name.startsWith(CACHE_PREFIX) && !activeCaches.has(name),
          )
          .map((name) => caches.delete(name)),
      );

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

async function handleNavigation(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const copy = response.clone();
      void caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
    }

    return response;
  } catch {
    const cachedPage = await caches.match(request);
    if (cachedPage) {
      return cachedPage;
    }

    const cachedShell = await caches.match("/");
    if (cachedShell) {
      return cachedShell;
    }

    return (
      (await caches.match(OFFLINE_URL)) ??
      new Response("Halaman tidak tersedia saat offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function handleStaticAsset(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const copy = response.clone();
      void caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  } catch {
    return new Response("Aset tidak tersedia saat offline.", {
      status: 504,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    ["script", "style", "font", "image"].includes(request.destination);

  if (isStaticAsset) {
    event.respondWith(handleStaticAsset(request));
  }
});
