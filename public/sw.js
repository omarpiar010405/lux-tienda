// Service worker mínimo: hace la app instalable. Sin caché a propósito
// (el modo sin internet es la Fase 6; ver specs/05-fuera-de-alcance.md).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
