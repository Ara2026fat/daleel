/* عامل الخدمة — دليل الدعاة والمترجمين
   القشرة: cache-first (فتح فوري وبلا إنترنت)
   البيانات: network-first مع رجوع للمخزن (حتى يصل التحديث)
   الخطوط: cache-first بعد أول تحميل (لا تُجلب من الشبكة ثانيةً) */
const SHELL = "daleel-shell-987c038156";
const DATA  = "daleel-data-v1";
const FONTS = "daleel-fonts-v1";
const KEEP  = [SHELL, DATA, FONTS];

const FILES = ["./","./index.html","./manifest.webmanifest",
               "./icon.png","./daleel-data.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)));
  /* بلا skipWaiting: النسخة الجديدة تنتظر موافقة المستخدم */
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => !KEEP.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  /* الخطوط: تُخزَّن بعد أول جلب فيعمل التطبيق بلا إنترنت */
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(FONTS).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => hit))
    );
    return;
  }

  if (url.origin !== location.origin) return;

  /* البيانات: الشبكة أولاً ليصل التحديث، والمخزن شبكة أمان */
  if (url.pathname.endsWith("daleel-data.json")) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(DATA).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then(hit => hit ||
        caches.match("./daleel-data.json")))
    );
    return;
  }

  /* التنقّل: القشرة دائماً (التطبيق أحادي الصفحة) */
  if (req.mode === "navigate") {
    e.respondWith(
      caches.match("./index.html").then(hit => hit || fetch(req))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok && res.type === "basic") {
        const copy = res.clone();
        caches.open(SHELL).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }))
  );
});
