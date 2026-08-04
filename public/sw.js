// Service Worker para suporte a notificações nativas (PWA)
const CACHE_NAME = "ibgs-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const client = clients.find((c) => c.visibilityState === "visible");
      if (client) {
        client.focus();
        client.navigate(url);
      } else {
        self.clients.openWindow(url);
      }
    })
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || "Alerta Licitação", {
        body: data.body || "",
        icon: "https://base44.com/logo_v2.svg",
        badge: "https://base44.com/logo_v2.svg",
        data: { url: data.url || "/" },
      })
    );
  } catch {
    event.waitUntil(
      self.registration.showNotification("Alerta Licitação", {
        body: event.data.text(),
        icon: "https://base44.com/logo_v2.svg",
        badge: "https://base44.com/logo_v2.svg",
        data: { url: "/" },
      })
    );
  }
});
