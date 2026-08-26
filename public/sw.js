// Service worker mínimo (Fase 9): solo existe para recibir notificaciones
// push y hacer instalable la PWA (Fase 8) -- sin cache offline todavía, a
// propósito, para no complicar el despliegue con invalidación de caché.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Tarot de Beto", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Tarot de Beto", {
      body: payload.body || "",
      icon: "/assets/logo/icon-192.png",
      badge: "/assets/logo/icon-192.png",
      data: { url: payload.url || "/panel-tarotista" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/panel-tarotista";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    }),
  );
});
