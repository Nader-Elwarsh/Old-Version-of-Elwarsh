const CACHE_NAME = "workshop-v11-39";
importScripts("./notif-shared.js");
const CORE_FILES = [
  "./",
  "./index.html",
  "./route.html",
  "./followup.html",
  "./customers.html",
  "./customer.html",
  "./devices.html",
  "./device.html",
  "./requests.html",
  "./request.html",
  "./inventory.html",
  "./part.html",
  "./settings.html",
  "./treasury.html",
  "./wallets.html",
  "./wallet.html",
  "./tasks.html",
  "./reports.html",
  "./style.css",
  "./shared-data.js",
  "./global-search.js",
  "./image-store.js",
  "./migrations.js",
  "./treasury.js",
  "./wallets.js",
  "./tasks.js",
  "./app-shared.js",
  "./app-dashboard-reports.js",
  "./app-customers.js",
  "./app-devices.js",
  "./app-requests.js",
  "./app-settings-lists.js",
  "./app-parts.js",
  "./app-settings.js",
  "./app-delete-tools.js",
  "./app-route-followup.js",
  "./app-data-management.js",
  "./app-quick-add.js",
  "./app-notifications-bootstrap.js",
  "./workshop-mini-simple-ui.js",
  "./workshop-mini-enhancements.js",
  "./reports.js",
  "./print-share.js",
  "./print-share.css",
  "./manifest.json",
  "./icon-192-v11-4-1.png",
  "./icon-512-v11-4-1.png",
  "./notif-shared.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // HTML pages: cache by pathname, not by query string.
  // This makes customer.html?id=..., device.html?id=... and request.html?id=...
  // open correctly while offline; the app-*.js files read the ID from the URL.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          const cacheKey = new Request(url.origin + url.pathname, {method:"GET"});
          caches.open(CACHE_NAME).then(cache => cache.put(cacheKey, copy));
          return response;
        })
        .catch(() => {
          const cacheKey = new Request(url.origin + url.pathname, {method:"GET"});
          return caches.match(cacheKey).then(cached => cached || caches.match("./index.html"));
        })
    );
    return;
  }

  // Static files: network first when online so a newly deployed version is
  // picked up quickly; fall back to the local cache when offline.
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

/* ---------------------------------------------------------------------
   إشعارات في الخلفية (Periodic Background Sync) — دعم أفضل مجهود:
   شغالة فعليًا على أندرويد/كروم لو التطبيق متثبت على الشاشة الرئيسية،
   والمتصفح هو اللي بيقرر التوقيت الفعلي (مش مضمون بالظبط، ومش مدعوم
   خالص على آيفون Safari). البيانات بتوصل من IndexedDB (notif-shared.js)
   لأن الـ Service Worker مايقدرش يقرأ localStorage مباشرة.
--------------------------------------------------------------------- */
async function runNotificationCheck() {
  let snap = await notifGet("snapshot");
  if (!snap) return;
  let today = new Date().toISOString().slice(0, 10);
  let lastDate = await notifGet("lastNotifiedDate");
  if (lastDate === today) return;
  let shown = false;
  if (snap.today && snap.today.length) {
    await self.registration.showNotification("📅 مواعيد اليوم", {
      body: `عندك ${snap.today.length} زيارة/زيارات اليوم.`,
      icon: "./icon-192-v11-4-1.png", tag: "wf-today",
      data: { url: "./requests.html?bucket=today" }
    });
    shown = true;
  }
  if (snap.overdue && snap.overdue.length) {
    await self.registration.showNotification("⚠️ أوامر متأخرة", {
      body: `فيه ${snap.overdue.length} أمر متأخر محتاج متابعة.`,
      icon: "./icon-192-v11-4-1.png", tag: "wf-overdue",
      data: { url: "./requests.html?bucket=overdue" }
    });
    shown = true;
  }
  if (snap.lowStock && snap.lowStock.length) {
    await self.registration.showNotification("📉 قطع منخفضة", {
      body: `فيه ${snap.lowStock.length} صنف وصل للحد الأدنى في المخزن.`,
      icon: "./icon-192-v11-4-1.png", tag: "wf-lowstock",
      data: { url: "./inventory.html?bucket=low" }
    });
    shown = true;
  }
  if (shown) await notifSet("lastNotifiedDate", today);
}

self.addEventListener("periodicsync", event => {
  if (event.tag === "workshop-check") event.waitUntil(runNotificationCheck());
});

self.addEventListener("sync", event => {
  if (event.tag === "workshop-check-once") event.waitUntil(runNotificationCheck());
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  let url = (event.notification.data && event.notification.data.url) || "./index.html";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then(list => {
      for (const c of list) { if ("focus" in c) { c.postMessage({ type: "GO_TO", url }); return c.focus(); } }
      return self.clients.openWindow(url);
    })
  );
});
