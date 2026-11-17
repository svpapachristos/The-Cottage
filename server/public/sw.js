// The Cottage's service worker: keeps the app itself on the device so it opens instantly, even offline.
// It never stores your notes (those come from the server and are cached by the app); it only caches the page and icons.
const CACHE = "cottage-shell-v1";
const SHELL = ["./", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || /^\/(api|mcp|authorize|oauth|\.well-known)/.test(url.pathname)) return;
  // the page: try the network first (so updates arrive), fall back to the saved copy when offline
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request).then(m => m || caches.match("./"))));
});
