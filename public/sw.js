// Service worker para notificações push do Gestor de Licitações IBGS
const CACHE_NAME = "ibgs-licitacoes-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Permite que a página dispare notificações mesmo em background
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Novas licitações encontradas";
  const options = {
    body: data.body || "Há novas licitações para suas buscas salvas.",
    icon: "https://base44.com/logo_v2.svg",
    badge: "https://base44.com/logo_v2.svg",
    data: { url: data.url || "/" },
    tag: data.tag || "ibgs-licitacao",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Abre o app ao clicar na notificação
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const client = clients.find((c) => c.url.includes(url));
      if (client) return client.focus();
      return self.clients.openWindow(url);
    })
  );
});
