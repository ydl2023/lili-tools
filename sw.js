/**
 * 里里的工具箱 · Service Worker
 *
 * 策略：网络优先 (Network First)
 * - 每次都从网络拿最新版，保证 GitHub Pages 推新后立即生效
 * - 只有断网时才回退到缓存
 * - API 调用（跨域）直接透传，不走缓存
 *
 * 每次 HTML 代码有变化，顺手把下面的 CACHE_VERSION 数字 +1，
 * 旧缓存就会在下次打开时自动清理，避免用到过时资源。
 */

const CACHE_VERSION = 1;
const CACHE_NAME = `lili-toolbox-v${CACHE_VERSION}`;

// 核心资源，安装时预缓存
const PRECACHE = [
  './',
  './index.html',
  './icon.svg',
  './manifest.webmanifest',
];

// ---- 生命周期 ----

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .catch((e) => console.warn('预缓存失败', e))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('lili-toolbox-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ---- 请求拦截 ----

self.addEventListener('fetch', (event) => {
  // 只处理 GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 跨域请求（AI API）不走缓存，浏览器默认处理
  if (url.origin !== self.location.origin) return;

  // 同源资源：网络优先，失败回退缓存
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 成功就顺便更新缓存
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
            .catch(() => {});  // 配额满等错误静默忽略
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
