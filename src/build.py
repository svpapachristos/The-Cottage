# Builds The Cottage into ../server/public/: the app page your Cottage server hands out, plus what makes it installable.
# It joins the page shell with every script in js/ (in name order) and embeds the m5x7 font (Daniel Linssen, CC0).
# For a quick local test, open server/public/index.html straight from disk: it runs in local mode (this browser only).
# Run:  python src/build.py   (from the repo root, or python build.py from here)
import base64, glob, json, os, struct, zlib
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.join(here, "..")
font = base64.b64encode(open(os.path.join(here, "m5x7.ttf"), "rb").read()).decode()
shell = open(os.path.join(here, "shell.html"), encoding="utf-8").read()
scripts = [open(p, encoding="utf-8").read() for p in sorted(glob.glob(os.path.join(here, "js", "*.js")))]
page = shell.replace("FONT_B64", font).replace("/*SCRIPTS*/", "\n".join(scripts))

def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w", encoding="utf-8", newline="\n").write(text)

# ---- the server copy, installable as an app
pwa = ('<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icon-192.png">\n'
       '<link rel="apple-touch-icon" href="apple-touch-icon.png">\n<meta name="apple-mobile-web-app-capable" content="yes">\n'
       '<meta name="apple-mobile-web-app-title" content="Cottage">\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">')
pub = os.path.join(root, "server", "public")
write(os.path.join(pub, "index.html"), page.replace("<!--PWA-->", pwa))
write(os.path.join(pub, "manifest.webmanifest"), json.dumps({
    "name": "The Cottage", "short_name": "Cottage", "description": "Sophia's home base, kept by Munin the raven.",
    "start_url": "./", "scope": "./", "display": "standalone", "background_color": "#0c0618", "theme_color": "#0c0618",
    "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
              {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}, indent=1))
write(os.path.join(pub, "sw.js"), """// The Cottage's service worker: keeps the app itself on the device so it opens instantly, even offline.
// It never stores your notes (those come from the server and are cached by the app); it only caches the page and icons.
const CACHE = "cottage-shell-v1";
const SHELL = ["./", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || /^\\/(api|mcp|authorize|oauth|\\.well-known)/.test(url.pathname)) return;
  // the page: try the network first (so updates arrive), fall back to the saved copy when offline
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request).then(m => m || caches.match("./"))));
});
""")

# ---- icons: the little pixel cottage, scaled up with crisp edges (PNG written by hand, no libraries needed)
NIGHT = (12, 6, 24)
def cottage_pixels():
    px = [[NIGHT] * 16 for _ in range(16)]
    def R(x, y, w, h, c):
        for j in range(y, y + h):
            for i in range(x, x + w):
                if 0 <= i < 16 and 0 <= j < 16: px[j][i] = c
    hexc = lambda h: tuple(int(h[k:k + 2], 16) for k in (1, 3, 5))
    for (x, y) in [(3, 2), (6, 1), (12, 3), (14, 6), (1, 5)]: R(x, y, 1, 1, hexc("#7a6aa0"))
    R(10, 2, 2, 4, hexc("#3a2a48")); R(11, 0, 2, 1, hexc("#6a5a88"))
    for y in range(6): R(8 - y - 1, 4 + y, (y + 1) * 2 + 1, 1, hexc("#45245a") if y % 2 else hexc("#3e1f52"))
    R(3, 10, 11, 5, hexc("#2b1a48")); R(5, 11, 3, 3, hexc("#ffd070")); R(9, 11, 3, 4, hexc("#7a5432")); R(2, 15, 13, 1, hexc("#24402a"))
    return px
def png(path, size, pad=0):
    px, inner = cottage_pixels(), size - 2 * pad
    scale = inner // 16; off = (size - scale * 16) // 2
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            i, j = (x - off) // scale, (y - off) // scale
            row += bytes(px[j][i] if 0 <= i < 16 and 0 <= j < 16 and x >= off and y >= off else NIGHT)
        rows.append(bytes(row))
    raw = zlib.compress(b"".join(rows), 9)
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    data = bytes([0x89]) + b"PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)) + chunk(b"IDAT", raw) + chunk(b"IEND", b"")
    open(path, "wb").write(data)
png(os.path.join(pub, "icon-192.png"), 192, 16)
png(os.path.join(pub, "icon-512.png"), 512, 32)
png(os.path.join(pub, "icon-maskable-512.png"), 512, 96)
png(os.path.join(pub, "apple-touch-icon.png"), 180, 18)
print(len(page.encode()), "bytes,", len(scripts), "scripts; wrote server/public/")
