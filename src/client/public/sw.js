// Service worker para notificaciones Web Push (fase 9). Sin caché de la app
// ni modo offline: su único trabajo es recibir un `push` del servidor y
// mostrarlo como notificación del sistema, incluso con la pestaña cerrada.

self.addEventListener("push", (event) => {
  let data = { title: "LifeHub", body: "" };
  try {
    if (event.data) data = event.data.json();
  } catch {
    data = { title: "LifeHub", body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "LifeHub", {
      body: data.body,
      tag: data.reminderId,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow("/");
    }),
  );
});
