/**
 * SIMADU Service Worker — Web Push Notifications
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'SIMADU Notifikasi', body: event.data.text() };
    }
  }

  const base = self.registration.scope ? new URL(self.registration.scope).pathname.replace(/\/+$/, '') : '/simadu';
  const title = data.title || 'SIMADU — BPS Kab. Batang Hari';
  const iconUrl = data.icon ? (data.icon.startsWith('http') || data.icon.startsWith(base) ? data.icon : `${base}${data.icon.startsWith('/') ? '' : '/'}${data.icon}`) : `${base}/favicon.png`;
  const badgeUrl = data.badge ? (data.badge.startsWith('http') || data.badge.startsWith(base) ? data.badge : `${base}${data.badge.startsWith('/') ? '' : '/'}${data.badge}`) : `${base}/favicon.png`;

  const options = {
    body: data.body || 'Ada pembaruan status tugas kegiatan statistik.',
    icon: iconUrl,
    badge: badgeUrl,
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: data.data || { url: '/dashboard' },
    actions: [
      { action: 'open', title: 'Buka SIMADU' },
      { action: 'close', title: 'Tutup' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const rawUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/dashboard';
  let targetUrl;
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    targetUrl = rawUrl;
  } else {
    const cleanPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
    const base = self.registration.scope ? new URL(self.registration.scope).pathname.replace(/\/+$/, '') : '/simadu';
    targetUrl = cleanPath.startsWith(base) ? cleanPath : `${base}${cleanPath}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Jika ada window SIMADU yang sudah terbuka, fokuskan dan arahkan URL
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Jika belum terbuka, buka window baru
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
