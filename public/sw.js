// Service Worker for cache management and offline sync support

const APP_VERSION = '1.5.0-offline';
const CACHE_VERSION = 'v' + APP_VERSION;
const ASSET_CACHE = 'assets-' + CACHE_VERSION;
const DOC_CACHE = 'docs-' + CACHE_VERSION;
const MAX_RETRY = 5;
const MAX_BACKOFF_MS = 30000;

/** @type {Array<{id: string, endpoint: string, method: string, data: unknown, status: 'pending' | 'synced' | 'failed', retry_count: number, max_retries: number, next_retry_at: number, timestamp: number, syncedAt?: number, error?: string}>} */
let pendingOperations = [];
let isOnline = true;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => !cacheName.includes(CACHE_VERSION))
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  const reply = (message) => {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage(message);
    }
  };

  if (type === 'QUEUE_OPERATION') {
    pendingOperations.push({
      id: payload?.id || crypto.randomUUID(),
      endpoint: payload?.endpoint,
      method: payload?.method || 'POST',
      data: payload?.data,
      status: 'pending',
      retry_count: 0,
      max_retries: payload?.max_retries || MAX_RETRY,
      next_retry_at: Date.now(),
      timestamp: Date.now(),
    });
    reply({ success: true, queued: pendingOperations.length });
    return;
  }

  if (type === 'CHECK_OFFLINE_STATUS') {
    reply({ isOnline });
    return;
  }

  if (type === 'GET_PENDING_OPS') {
    const pending = pendingOperations.filter((op) => op.status === 'pending');
    reply({
      pending: pending.length,
      failed: pendingOperations.filter((op) => op.status === 'failed').length,
      operations: pending.slice(0, 10),
    });
    return;
  }

  if (type === 'CLEAR_FAILED_OPS') {
    pendingOperations = pendingOperations.filter((op) => op.status !== 'failed');
    reply({ success: true, remaining: pendingOperations.length });
    return;
  }

  if (type === 'SYNC_NOW') {
    void syncPendingOperations();
    reply({ accepted: true });
  }
});

function computeBackoffMs(retryCount) {
  return Math.min(MAX_BACKOFF_MS, Math.max(1000, 1000 * 2 ** retryCount));
}

async function notifyClients(payload) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((client) => client.postMessage(payload));
}

async function checkConnectivity() {
  try {
    const scopeUrl = self.registration?.scope || self.location.origin + '/';
    const response = await fetch(scopeUrl, { method: 'HEAD', cache: 'no-store' });
    isOnline = response.ok;
  } catch {
    isOnline = false;
  }

  await notifyClients({ type: 'ONLINE_STATUS_CHANGED', isOnline });
  return isOnline;
}

async function syncPendingOperations() {
  const online = await checkConnectivity();
  if (!online) return;

  const now = Date.now();
  const candidates = pendingOperations.filter(
    (op) => op.status === 'pending' && op.next_retry_at <= now
  );

  for (const operation of candidates) {
    try {
      const response = await fetch(operation.endpoint, {
        method: operation.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Offline-Sync': 'true',
        },
        body: operation.data == null ? undefined : JSON.stringify(operation.data),
      });

      if (response.ok) {
        operation.status = 'synced';
        operation.syncedAt = Date.now();
        operation.error = undefined;
      } else {
        operation.retry_count += 1;
        operation.error = `HTTP ${response.status}`;
        if (operation.retry_count >= operation.max_retries) {
          operation.status = 'failed';
        } else {
          operation.next_retry_at = Date.now() + computeBackoffMs(operation.retry_count);
        }
      }
    } catch (error) {
      operation.retry_count += 1;
      operation.error = error instanceof Error ? error.message : 'Unknown sync error';
      if (operation.retry_count >= operation.max_retries) {
        operation.status = 'failed';
      } else {
        operation.next_retry_at = Date.now() + computeBackoffMs(operation.retry_count);
      }
    }
  }

  await notifyClients({
    type: 'SYNC_COMPLETE',
    pending: pendingOperations.filter((op) => op.status === 'pending').length,
    failed: pendingOperations.filter((op) => op.status === 'failed').length,
    synced: pendingOperations.filter((op) => op.status === 'synced').length,
  });
}

// Periodic retry worker for queued operations
setInterval(() => {
  void syncPendingOperations();
}, 30000);

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            void caches.open(DOC_CACHE).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    url.pathname.includes('/assets/')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            void caches.open(ASSET_CACHE).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
