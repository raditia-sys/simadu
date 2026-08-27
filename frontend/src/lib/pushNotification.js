/**
 * Push Notification Utility for SIMADU
 */

export function isPushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getNotificationPermission() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'default', 'granted', 'denied'
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getServiceWorkerConfig() {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '') + '/';
  const swPath = `${base}sw.js`;
  return { swPath, scope: base };
}

export async function registerServiceWorker() {
  if (!isPushSupported()) return null;
  try {
    const { swPath, scope } = getServiceWorkerConfig();
    const reg = await navigator.serviceWorker.register(swPath, { scope });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

export async function checkIsSubscribed() {
  if (!isPushSupported()) return false;
  try {
    const { swPath } = getServiceWorkerConfig();
    const reg = await navigator.serviceWorker.getRegistration(swPath);
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return sub !== null;
  } catch (error) {
    return false;
  }
}

export async function subscribeToPush(api) {
  if (!isPushSupported()) {
    throw new Error('Browser Anda tidak mendukung Web Push Notifications.');
  }

  // Minta izin notifikasi browser
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    throw new Error(perm === 'denied' ? 'Izin notifikasi diblokir oleh browser Anda.' : 'Izin notifikasi belum diberikan.');
  }

  const reg = await registerServiceWorker();
  if (!reg) {
    throw new Error('Gagal mendaftarkan Service Worker browser.');
  }

  // Dapatkan VAPID public key dari backend
  const vapidRes = await api.get('/notifications/vapid-key');
  if (!vapidRes.success || !vapidRes.data?.publicKey) {
    throw new Error(vapidRes.message || 'Gagal memuat kunci otentikasi VAPID dari server.');
  }

  const applicationServerKey = urlBase64ToUint8Array(vapidRes.data.publicKey);

  let subscription = await reg.pushManager.getSubscription();
  if (subscription) {
    // Unsubscribe subscription lama jika ada
    try {
      await subscription.unsubscribe();
    } catch (e) {}
  }

  // Buat subscription baru
  subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });

  const subJson = subscription.toJSON();

  // Kirim ke backend
  const res = await api.post('/notifications/subscribe', {
    endpoint: subJson.endpoint,
    keys: {
      p256dh: subJson.keys?.p256dh,
      auth: subJson.keys?.auth,
    },
  });

  if (!res.success) {
    throw new Error(res.message || 'Gagal menyimpan data langganan notifikasi ke server.');
  }

  return true;
}

export async function unsubscribeFromPush(api) {
  if (!isPushSupported()) return false;
  try {
    const { swPath } = getServiceWorkerConfig();
    const reg = await navigator.serviceWorker.getRegistration(swPath);
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await api.post('/notifications/unsubscribe', { endpoint });
      }
    }
    return true;
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return false;
  }
}

export async function testPushNotification(api) {
  return await api.post('/notifications/test-push', {});
}
