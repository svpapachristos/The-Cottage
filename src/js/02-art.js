// ============================================================ 02 · art: every picture is drawn here, in code, pixel by pixel
// House palette: night purple #0c0618, pink #ff7ad9, lilac #dc5aff. Bayer dithering for soft shading.

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
function rnd(n) { let s = n * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
function moonPhase() { const syn = 29.530588853, d = (Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5; return ((d % syn) + syn) % syn / syn; }

// ---- little sprites, drawn from letter grids. Each letter is a color; "." is see-through.
const PAL = { k: "#140e1e", d: "#2a2040", l: "#5a3a8a", e: "#ffd070", b: "#6a6078", f: "#8a7a60", g: "#7ae89a", p: "#ff9ac8", w: "#ffe1fa", r: "#ff9a50" };
const SPR = {
  muninIdle: ["................", "................", "..........kkk...", ".........kkkkk..", "........kkkekbb.", "........kkkkkbbb", "........kkkkk...", ".......kkkkkk...", ".....kkkdkkkk...", "....kkkdldkkk...", "...kkkdlldkkk...", "..kkkkddddkk....", ".kkk.kkkkkk.....", "kk.....kkk......", ".......f.f......", "......ff.ff....."],
  muninBlink: null, muninTilt: null, muninSleep: null,
  muninFlyA: [".kk..........kk.", "..kkk......kkk..", "...kkkk..kkkk...", "....kkkkkkkkkbb.", ".....kkkkkkek...", "....kkkkkkkkk...", "...kk...........", "................"],
  muninFlyB: ["................", "................", "......kkkkkkkbb.", ".....kkkkkkkek..", "...kkkkkkkkkk...", "..kkk.kkkk.kkk..", ".kk.....k....kk.", "................"],
  salemSleep: [".........k.k..", "..kkkkkkkkkkk.", ".kkkkkkkkkkkkk", "kkkkkkkkkkkkkk", "kkkkkkkkkkkkk.", ".kkkkkkkkkkk..", "kkk..........."],
  salemSit: [".k.....k.", ".kk...kk.", ".kkkkkkk.", ".kgkkkgk.", ".kkkpkkk.", "..kkkkk..", "..kkkkk..", ".kkkkkkk.", ".kkkkkkkk", ".kkkkkkk.", ".kkkkkkk.", "..kk.kk.."],
};
SPR.muninBlink = SPR.muninIdle.map(r => r.replace("e", "k"));
SPR.muninTilt = ["................", "................", "................", "..........kkk...", ".........kkkkk..", "........kkkekbb.", "........kkkkkbb.", ".......kkkkkk...", ".....kkkdkkkk...", "....kkkdldkkk...", "...kkkdlldkkk...", "..kkkkddddkk....", ".kkk.kkkkkk.....", "kk.....kkk......", ".......f.f......", "......ff.ff....."];
SPR.muninSleep = ["................", "................", "................", "................", "................", "................", ".........kkk....", "......kkkkkkkk..", ".....kkkdkkkkbb.", "....kkkdldkkkk..", "...kkkdlldkkk...", "..kkkkddddkk....", ".kkk.kkkkkk.....", "kk.....kkk......", ".......f.f......", "......ff.ff....."];
function sprite(g, name, x, y, flip, tint) {
  const rows = SPR[name]; const w = rows[0].length;
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < w; i++) { const ch = rows[j][i]; if (ch === ".") continue; g.fillStyle = tint && ch === "k" ? tint : PAL[ch]; g.fillRect(x + (flip ? w - 1 - i : i), y + j, 1, 1); }
}
function muninFrame(t, asleep) {
  if (asleep) return "muninSleep";
  const s = (t * 10 | 0) % 60; if (S.flash.munin && Date.now() - S.flash.munin < 900) return (t * 6 | 0) % 2 ? "muninTilt" : "muninIdle";
  return s === 0 || s === 31 ? "muninBlink" : (s > 40 && s < 48 ? "muninTilt" : "muninIdle");
}

// ---- 8x8 icons for lists and buttons
const ICONS = {
  question: ["..####..", ".##..##.", ".....##.", "....##..", "...##...", "........", "...##...", "........"],
  decision: ["...##...", "..#aa#..", ".#aaaa#.", "#aaaaaa#", ".#aaaa#.", "..#aa#..", "...##...", "........"],
  note: [".######.", "#aaaaaa#", ".#a##a#.", ".#aaaa#.", ".#a##a#.", ".#aaaa#.", "#aaaaaa#", ".######."],
  idea: ["...#....", "...#....", "#.###.#.", ".#####..", "#.###.#.", "...#....", "...#....", "........"],
  link: ["........", ".##.....", "#..#....", "#..##...", ".##..##.", "....#..#", ".....#.#", "......#."],
  log: ["...#....", "..###...", ".#aaa#..", ".#aaa#..", "..###...", "...#....", "...#....", "..###..."],
  todo: ["........", ".######.", ".#....#.", ".#....#.", ".#....#.", ".#....#.", ".######.", "........"],
  doc: ["######..", "#aaaa##.", "#a##a###", "#aaaaaa#", "#a####a#", "#aaaaaa#", "#a###aa#", "########"],
  search: ["..###...", ".#...#..", "#.....#.", "#.....#.", "#.....#.", ".#...#..", "..####..", "......##"],
  menu: ["........", "########", "........", "........", "########", "........", "........", "########"],
  quill: [".......#", "......##", ".....##.", "....##..", "...##...", "..##....", ".#......", "#......."],
  library: ["#.#.##..", "#.#.##..", "#a#a##.#", "#a#a##.#", "#a#a##a#", "#a#a##a#", "#.#.##.#", "########"],
  wood: ["........", "..####..", ".#aaaa#.", "#a#..#a#", "#a#..#a#", ".#aaaa#.", "..####..", "........"],
  rune: ["...#....", "..#.#...", ".#...#..", "...#....", "..###...", "...#....", "..#.#...", ".#...#.."],
  moon: ["..###...", ".##.....", "##......", "##......", "##......", ".##.....", "..###...", "........"],
  feather: ["......##", ".....#a#", "....#a#.", "...#a#..", "..#a#...", ".#a#....", "#.#.....", "#......."],
};
const ICOL = { question: ["#ff7ad9"], decision: ["#9fe6d0", "#3a7a6a"], note: ["#8ac0e8", "#22344a"], idea: ["#ffd070"], link: ["#dc5aff"], log: ["#ffd070", "#ff9a50"], todo: ["#dc5aff"], doc: ["#f3dcff", "#3a2a5a"],
  search: ["#ffe1fa"], menu: ["#ffe1fa"], quill: ["#0c0618"], library: ["#ffe1fa", "#dc5aff"], wood: ["#a0703a", "#d8a060"], rune: ["#9fe6d0"], moon: ["#ffd070"], feather: ["#ffd070", "#fff0c0"] };
const ICON_URL = {};
function icon(k) {
  if (ICON_URL[k]) return ICON_URL[k];
  const c = document.createElement("canvas"); c.width = c.height = 8; const g = c.getContext("2d"), [a, b] = ICOL[k] || ["#ffe1fa"];
  (ICONS[k] || ICONS.note).forEach((row, y) => [...row].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = ch === "a" ? (b || a) : a; g.fillRect(x, y, 1, 1); }));
  return ICON_URL[k] = c.toDataURL();
}
const img = k => `<img class="pi" src="${icon(k)}" alt="">`;
function drawIcons() {
  $("searchBtn").innerHTML = `<img src="${icon("search")}" alt="">`; $("menuBtn").innerHTML = `<img src="${icon("menu")}" alt="">`;
  $("libBtn").innerHTML = `<img src="${icon("library")}" alt="">`;
  $("addFab").innerHTML = `<img src="${icon("quill")}" alt="">`;
}
// The spine of a project's book, colored from its name so it's always the same.
const SPINE_COLS = ["#dc5aff", "#ff7ad9", "#8ac0e8", "#9fe6d0", "#ffd070", "#ffb38a", "#b45ad8", "#4fd17a"];
function nameHash(s) { let h = 0; for (const ch of String(s || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
const SPINE_URL = {};
function spineURL(p) {
  const key = p.name || ""; if (SPINE_URL[key]) return SPINE_URL[key];
  const h = nameHash(key), a = SPINE_COLS[h % 8], b = SPINE_COLS[(h >> 4) % 8];
  const c = document.createElement("canvas"); c.width = 7; c.height = 30; const g = c.getContext("2d");
  g.fillStyle = a; g.fillRect(0, 0, 7, 30); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(5, 0, 2, 30); g.fillStyle = b; g.fillRect(0, 5, 7, 2); g.fillRect(0, 23, 7, 2);
  g.fillStyle = "#ffe1fa"; g.fillRect(2, 12, 3, 1); g.fillRect(2, 14, 3, 1); g.fillRect(2, 16, 2, 1);
  return SPINE_URL[key] = c.toDataURL();
}

// ============================================================ the cottage, in cross-section
const STARS = (() => { const r = rnd(7), a = []; for (let i = 0; i < 70; i++) a.push([Math.floor(r() * HW), Math.floor(r() * 120), r()]); return a; })();
const off = document.createElement("canvas"); off.width = HW; off.height = HH;
let skyLayer = null;
function dither(g, x, y, w, h, a, b, f) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const th = BAYER[((y + j) & 3) * 4 + ((x + i) & 3)]; g.fillStyle = (typeof f === "function" ? f(i, j) : f) > th ? b : a; g.fillRect(x + i, y + j, 1, 1); } }
function buildSky() {   // the parts that never move, drawn once
  const c = document.createElement("canvas"); c.width = HW; c.height = HH; const g = c.getContext("2d");
  dither(g, 0, 0, HW, HH, "#0c0618", "#170c2c", (i, j) => j / HH * 1.2);
  for (let x = 0; x < HW; x++) { const top = 210 + Math.round(Math.sin(x / 26) * 2); dither(g, x, top, 1, HH - top, "#1a3020", "#24402a", 0.3); }
  for (let y = 212; y < HH; y++) { g.fillStyle = "#3a2a30"; g.fillRect(124 - (y - 212), y, 10 + (y - 212) * 2, 1); }
  return c;
}
// o.lightsOut: 0..1 during the closing ritual (windows go dark one by one); o.night: the cottage is asleep.
function drawHouse(t, o = {}) {
  const g = off.getContext("2d"), R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const dith = (x, y, w, h, a, b, f) => dither(g, x, y, w, h, a, b, f);
  if (!skyLayer) skyLayer = buildSky();
  g.drawImage(skyLayer, 0, 0);
  const asleep = o.night || o.lightsOut >= 1;
  for (const [x, y, p] of STARS) { const tw = Math.sin(t * (1 + p * 2) + p * 20); if (tw > (asleep ? -0.6 : -0.3)) R(x, y, 1, 1, tw > 0.7 ? "#ffe1fa" : "#7a6aa0"); }
  const ph = moonPhase(), mx = 22, my = 14;
  for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++) { if (i * i + j * j > 25) continue; const lit = ph < 0.5 ? i > Math.cos(ph * 2 * Math.PI) * Math.sqrt(25 - j * j) : i < -Math.cos(ph * 2 * Math.PI) * Math.sqrt(25 - j * j); R(mx + i, my + j, 1, 1, lit ? "#ffe9c0" : "#2a2240"); }
  // chimney and smoke (thicker while firewood burns)
  R(118, 8, 10, 22, "#3a2a48"); R(117, 7, 12, 3, "#4a3858");
  const burning = S.flash.fire && Date.now() - S.flash.fire < 6000, puffs = burning ? 7 : 4;
  for (let k = 0; k < puffs; k++) { const ph2 = (t * (burning ? 0.6 : 0.35) + k / puffs) % 1, sx = 123 + Math.sin(ph2 * 6 + k) * 3 + ph2 * 6, sy = 6 - ph2 * 14, r2 = 1 + ph2 * 2.5; if (sy > -4) for (let j = -2; j <= 2; j++) for (let i = -3; i <= 3; i++) if (i * i + j * j <= r2 * r2 && BAYER[((j + 8) & 3) * 4 + ((i + 8) & 3)] < 0.7 - ph2 * 0.6) R(Math.round(sx + i), Math.round(sy + j), 1, 1, burning && ph2 < 0.3 ? "#a07a6a" : "#6a5a88"); }
  // roof
  for (let y = 0; y < 32; y++) { const half = Math.round((y + 2) * 78 / 32); R(80 - half, 6 + y, half * 2, 1, (y % 4 === 3) ? "#2a1438" : (y % 8 < 4 ? "#3e1f52" : "#45245a")); }
  R(2, 36, 156, 2, "#5a2a6a");
  // house body, beams and walls
  R(6, 36, 148, 172, "#2b1a48");
  for (const yb of [76, 120, 162]) R(6, yb, 148, 2, "#5a3a30");
  R(79, 38, 2, 38, "#2b1a48"); R(79, 122, 2, 40, "#2b1a48"); R(79, 164, 2, 42, "#2b1a48");
  R(4, 206, 152, 6, "#3a3048"); for (let x = 6; x < 154; x += 7) R(x, 208, 1, 2, "#2a2238");
  // the rooms
  const order = ["stargazer", "coven", "games", "school", "jobs", "book", "life"];
  for (const [k, Rm] of Object.entries(ROOMS)) {
    const [x, y, w, h] = Rm.r; g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); SCENES[k](g, R, dith, x, y, w, h, t, asleep);
    const c = counts(k);
    if (!asleep) fireflies(g, x, y, w, h, t, Math.min(6, c.week), k);
    g.restore();
    const lit = k === "book" ? c.all > 0 : k === "life" ? true : c.todo + c.q > 0;
    let dark = lit ? 0 : 0.42;
    if (o.lightsOut !== undefined) { const at = order.indexOf(k) / order.length; if (o.lightsOut > at) dark = k === "life" ? 0.45 : 0.85; }
    else if (asleep) dark = k === "life" ? 0.45 : 0.85;
    if (dark) { g.fillStyle = `rgba(6,2,16,${dark})`; g.fillRect(x, y, w, h); }
    if (asleep && k === "life") emberGlow(g, x, y, t);
    if (S.hover === k && !asleep) { g.fillStyle = "rgba(255,225,250,0.10)"; g.fillRect(x, y, w, h); g.strokeStyle = "#ffe1fa"; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
  }
}
// Each thing finished this week becomes a firefly drifting in its room.
function fireflies(g, x, y, w, h, t, n, seed) {
  const r = rnd(nameHash(seed) % 997 + 3);
  for (let k = 0; k < n; k++) { const bx = r() * (w - 8) + 4, by = r() * (h - 14) + 4, sp = 0.4 + r() * 0.6, ph = r() * 6;
    const fx = Math.round(x + bx + Math.sin(t * sp + ph) * 4), fy = Math.round(y + by + Math.cos(t * sp * 1.3 + ph) * 3), on = Math.sin(t * 3 + ph * 2) > -0.2;
    if (on) { g.fillStyle = "#fff0a0"; g.fillRect(fx, fy, 1, 1); g.fillStyle = "rgba(255,208,112,0.35)"; g.fillRect(fx - 1, fy, 3, 1); g.fillRect(fx, fy - 1, 1, 3); } }
}
function emberGlow(g, x, y, t) { // the last warm light in a sleeping cottage
  for (let k = 0; k < 10; k++) { const fx = x + 11 + (k * 5) % 14, a = 0.5 + 0.5 * Math.sin(t * 2 + k); g.fillStyle = a > 0.5 ? "#ff9a50" : "#a0402a"; g.fillRect(fx, y + 35 + (k % 2), 1, 1); }
  g.fillStyle = "rgba(255,120,60,0.10)"; g.fillRect(x + 4, y + 16, 40, 26);
}
const SCENES = {
  stargazer(g, R, dith, x, y, w, h, t) {
    R(x, y, w, h, "#1b1838"); R(x, y + h - 5, w, 5, "#3a2418"); for (let i = 0; i < w; i += 9) R(x + i, y + h - 5, 1, 5, "#2a1810");
    const cx = x + 20, cy = y + 16;
    for (let j = -12; j <= 12; j++) for (let i = -12; i <= 12; i++) { const d = i * i + j * j; if (d <= 100) R(cx + i, cy + j, 1, 1, "#0a1030"); else if (d <= 144) R(cx + i, cy + j, 1, 1, "#8a6a20"); }
    R(cx - 10, cy, 21, 1, "#8a6a20"); R(cx, cy - 10, 1, 21, "#8a6a20");
    for (let k = 0; k < 9; k++) { const sx = cx - 8 + (k * 37 % 17), sy = cy - 8 + (k * 23 % 17); if (Math.sin(t * 2 + k) > 0 && (sx - cx) ** 2 + (sy - cy) ** 2 < 90) R(sx, sy, 1, 1, "#ffe1fa"); }
    for (let k = 0; k < 14; k++) R(x + 50 - k, y + 26 - Math.round(k * 0.9), 3, 2, k < 2 ? "#ffd070" : "#c8a050");
    R(x + 49, y + 27, 1, 6, "#5a3a24"); R(x + 46, y + 30, 1, 3, "#5a3a24"); R(x + 53, y + 30, 1, 3, "#5a3a24");
    R(x + 58, y + 6, 10, 13, "#d8c8a0"); for (const [a, b] of [[60, 9], [64, 11], [61, 15], [66, 16], [62, 12]]) R(x + a, y + b, 1, 1, "#3a2a6a");
  },
  coven(g, R, dith, x, y, w, h, t) {
    dith(x, y, w, h, "#26103a", "#2e1646", (i, j) => ((j % 6 === 0) || ((i + (j / 6 | 0) * 4) % 9 === 0)) ? 1 : 0);
    R(x, y + h - 5, w, 5, "#22182e");
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.5);
    for (let a = 0; a < 40; a++) { const ang = a / 40 * Math.PI * 2; if ((a + Math.floor(t * 4)) % 3) R(Math.round(x + 35 + Math.cos(ang) * 17), Math.round(y + h - 3 + Math.sin(ang) * 2), 1, 1, pulse > 0.5 ? "#dc5aff" : "#a040c0"); }
    R(x + 26, y + 20, 18, 12, "#121018"); R(x + 25, y + 19, 20, 2, "#3a3448"); R(x + 27, y + 19, 16, 1, "#4fd17a");
    for (let k = 0; k < 5; k++) { const ph = (t * 0.8 + k / 5) % 1; R(x + 29 + (k * 3), Math.round(y + 18 - ph * 10), 1, 1, ph < 0.6 ? "#7ae89a" : "#3a7a4a"); }
    for (const fx of [29, 33, 37, 41]) R(x + fx, y + 32, 2, 1, Math.sin(t * 9 + fx) > 0 ? "#ffd070" : "#ff7a40");
    for (const cx of [7, 62]) { R(x + cx, y + 22, 2, 9, "#e8d8c0"); R(x + cx, y + 20 + (Math.sin(t * 7 + cx) > 0 ? 0 : 1), 2, 2, "#ffd070"); R(x + cx, y + 19, 1, 1, "#ff9a50"); }
    R(x + 50, y + 8, 18, 2, "#5a3a24"); [["#4fd17a", 51], ["#dc5aff", 56], ["#8ac0e8", 61], ["#ffd070", 65]].forEach(([c, jx]) => { R(x + jx, y + 3, 3, 5, c); R(x + jx, y + 2, 3, 1, "#e8d8c0"); });
  },
  games(g, R, dith, x, y, w, h, t) {
    R(x, y, w, h, "#22163a"); for (let i = 0; i < w; i += 6) R(x + i, y, 1, h - 6, "#281c44");
    R(x, y + h - 6, w, 6, "#3a2418"); for (let i = 3; i < w; i += 11) R(x + i, y + h - 6, 1, 6, "#2a1810");
    R(x + 6, y + 13, 70, 2, "#5a3a24"); R(x + 8, y + 15, 1, 3, "#5a3a24"); R(x + 72, y + 15, 1, 3, "#5a3a24");
    const ps = projects().filter(p => (p.area || "games") === "games").slice(0, 13);
    ps.forEach((p, n) => { R(x + 9 + n * 5, y + 5, 4, 8, SPINE_COLS[nameHash(p.name) % 8]); R(x + 10 + n * 5, y + 7, 2, 2, "#ffe1fa"); });
    R(x + 30, y, 1, 18, "#5a5068"); const sw = Math.round(Math.sin(t * 1.2)); R(x + 27 + sw, y + 18, 7, 7, "#3a2a20"); R(x + 28 + sw, y + 19, 5, 5, "#ffd070");
    for (let j = -9; j <= 9; j++) for (let i = -12; i <= 12; i++) if (i * i / 1.6 + j * j < 70 && BAYER[((j + 12) & 3) * 4 + ((i + 12) & 3)] < 0.18) R(x + 31 + sw + i, y + 22 + j, 1, 1, "#4a3450");
    R(x + 60, y + 28, 62, 3, "#6a4a2a"); R(x + 62, y + 31, 2, 5, "#4a3020"); R(x + 118, y + 31, 2, 5, "#4a3020");
    R(x + 66, y + 20, 7, 8, "#8ac0e8"); R(x + 67, y + 21, 5, 7, "#1a2a40"); R(x + 68, y + 23, 1, 4, "#4fd17a"); R(x + 70, y + 22, 1, 5, "#4fd17a"); R(x + 66, y + 19, 7, 1, "#c8a050");
    const ox = x + 88, oy = y + 22; R(ox - 1, oy - 1, 3, 3, "#ffd070"); for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2; R(Math.round(ox + Math.cos(an) * 6), Math.round(oy + Math.sin(an) * 3), 1, 1, "#8a6a20"); }
    const pa = t * 1.4; R(Math.round(ox + Math.cos(pa) * 6), Math.round(oy + Math.sin(pa) * 3), 2, 2, "#8ac0e8"); R(ox, oy + 3, 1, 3, "#8a6a20");
    R(x + 104, y + 24, 8, 4, "#6a6a80"); R(x + 107, y + 20, 2, 4, "#8a6a40");
    R(x + 124, y + 6, 16, 14, "#8a6a40"); R(x + 125, y + 7, 14, 12, "#a07a48");
    const open = items().filter(i => roomOf(i) === "games" && (openTodo(i) || openQ(i))).length;
    for (let n = 0; n < Math.min(open, 9); n++) { R(x + 126 + (n % 3) * 4, y + 8 + Math.floor(n / 3) * 4, 3, 3, n % 4 === 0 ? "#ff7ad9" : "#ffe1fa"); R(x + 127 + (n % 3) * 4, y + 8 + Math.floor(n / 3) * 4, 1, 1, "#d84a2a"); }
  },
  school(g, R, dith, x, y, w, h, t) {
    R(x, y, w, h, "#1e1a3a"); R(x, y + h - 5, w, 5, "#3a2418");
    R(x + 3, y + 4, 24, 31, "#4a3020"); const bc = ["#d84a2a", "#8ac0e8", "#4fd17a", "#ffd070", "#dc5aff", "#ff7ad9", "#e8d8c0"];
    for (let r2 = 0; r2 < 3; r2++) { R(x + 4, y + 13 + r2 * 10, 22, 1, "#2a1810"); for (let b = 0; b < 7; b++) R(x + 5 + b * 3, y + 6 + r2 * 10, 2, 7 - ((b + r2) % 3), bc[(b * 3 + r2) % 7]); }
    R(x + 34, y + 25, 32, 3, "#6a4a2a"); R(x + 36, y + 28, 2, 7, "#4a3020"); R(x + 62, y + 28, 2, 7, "#4a3020");
    R(x + 40, y + 22, 10, 3, "#e8e0f0"); R(x + 45, y + 22, 1, 3, "#a796c8");
    R(x + 58, y + 14, 1, 11, "#8a6a40"); R(x + 54, y + 11, 9, 4, "#ffd070");
    for (let j = 0; j < 10; j++) for (let i = -j; i <= j; i++) if (BAYER[((j + 2) & 3) * 4 + ((i + 16) & 3)] < 0.25 - j * 0.02) R(x + 58 + i, y + 15 + j, 1, 1, "#5a4a40");
  },
  jobs(g, R, dith, x, y, w, h, t) {
    R(x, y, w, h, "#201a34"); R(x, y + h - 5, w, 5, "#3a2418");
    R(x + 8, y + 7, 12, 11, "#e8e0f0"); R(x + 8, y + 7, 12, 3, "#d84a2a"); R(x + 13, y + 13, 2, 2, "#d84a2a");
    R(x + 42, y + 5, 16, 14, "#8a6a20"); R(x + 43, y + 6, 14, 12, "#d8c8a0"); for (let l = 0; l < 4; l++) R(x + 45, y + 8 + l * 3, 9 - (l % 2) * 3, 1, "#5a4a60");
    R(x + 8, y + 25, 46, 3, "#6a4a2a"); R(x + 10, y + 28, 2, 7, "#4a3020"); R(x + 50, y + 28, 2, 7, "#4a3020");
    const n = Math.min(6, items().filter(i => roomOf(i) === "jobs" && openTodo(i)).length + 1);
    for (let k = 0; k < n; k++) R(x + 14 + (k % 2), y + 23 - k, 10, 1, k % 2 ? "#e8e0f0" : "#c8c0d8");
    R(x + 34, y + 22, 4, 3, "#121018"); R(x + 37, y + 15, 1, 8, "#e8e0f0"); R(x + 38, y + 14, 2, 3, "#e8e0f0");
    R(x + 60, y + 26, 7, 9, "#8ac0e8"); R(x + 61, y + 27, 5, 8, "#1a2a40"); for (let k = 0; k < 4; k++) R(x + 61 + (k % 2) * 2, y + 33 - k, 2, 1, "#ffd070");
  },
  life(g, R, dith, x, y, w, h, t, asleep) {
    dith(x, y, w, h, "#2a1630", "#33193a", (i, j) => (j % 5 === 0 || (i + (j / 5 | 0) * 3) % 7 === 0) ? 1 : 0);
    R(x, y + h - 5, w, 5, "#3a2418");
    R(x + 5, y + 10, 26, 27, "#4a4058"); R(x + 3, y + 8, 30, 3, "#6a4a2a"); R(x + 10, y + 18, 16, 19, "#120a10");             // fireplace
    const burning = S.flash.fire && Date.now() - S.flash.fire < 6000, big = burning ? 1.7 : 1;
    if (!asleep) for (let k = 0; k < 26; k++) { const fx = x + 11 + (k * 5) % 14, hgt = Math.min(18, (4 + Math.abs(Math.sin(t * (burning ? 9 : 6) + k * 1.7)) * 9) * big); R(fx, Math.round(y + 37 - hgt), 1, Math.round(hgt), k % 3 === 0 ? "#ffd070" : k % 3 === 1 ? "#ff9a50" : "#d84a2a"); }
    R(x + 12, y + 35, 12, 2, "#5a3020");
    // candles on the mantel: one for each night in a row the cottage was closed up properly
    const streak = Math.min(5, night().streak || 0);
    for (let k = 0; k < Math.max(1, streak); k++) { const cx = x + 6 + k * 5; R(cx, y + 5, 2, 3, "#e8d8c0"); if (streak) R(cx, y + 4 - (Math.sin(t * 8 + k) > 0.6 ? 1 : 0), 2, 1, Math.sin(t * 8 + k) > 0 ? "#ffd070" : "#ff9a50"); }
    // the woodpile: one log for each thing hexed into firewood, waiting to be dragged into the fire
    if (!S.hideLogs) { const logs = Math.min(9, woodpile().length);
      for (let n = 0; n < logs; n++) { const lx = x + 33 + (n % 3) * 5 + (Math.floor(n / 3) % 2 ? 2 : 0), ly = y + h - 8 - Math.floor(n / 3) * 3; R(lx, ly, 5, 3, "#7a4a28"); R(lx, ly, 1, 3, "#d8a060"); R(lx + 4, ly + 1, 1, 1, "#a0703a"); } }
    for (let j = -2; j <= 2; j++) for (let i = -14; i <= 14; i++) if (i * i / 196 + j * j / 6 <= 1) R(x + 52 + i, y + h - 4 + j, 1, 1, (i + j) % 4 ? "#5a2a5a" : "#7a3a7a");   // rug
    R(x + 52, y + 18, 16, 14, "#8a2a4a"); R(x + 54, y + 22, 12, 6, "#a83a5a"); R(x + 52, y + 31, 2, 3, "#4a3020"); R(x + 66, y + 31, 2, 3, "#4a3020");   // armchair
    // Salem, the cat
    const awake = !asleep && S.flash.salem && Date.now() - S.flash.salem < 2600;
    if (awake) { sprite(g, "salemSit", x + 47, y + h - 15); const hb = (Date.now() - S.flash.salem) / 2600; R(x + 53, Math.round(y + h - 18 - hb * 8), 1, 1, "#ff7ad9"); R(x + 49, Math.round(y + h - 20 - hb * 6), 1, 1, "#ff7ad9"); }
    else { sprite(g, "salemSleep", x + 45, y + h - 9, false, asleep ? "#1a1018" : null); const tl = Math.round(Math.sin(t * 1.4) * 1); R(x + 44, y + h - 3 + tl, 2, 1, "#140e1e");
      if (!asleep && Math.sin(t * 0.5) > 0.97) { R(x + 55, y + h - 7, 1, 1, "#7ae89a"); R(x + 57, y + h - 7, 1, 1, "#7ae89a"); }
      if (asleep || Math.sin(t * 0.3) > 0.4) { const zz = (t * 0.6) % 1; R(x + 60 + Math.round(zz * 3), Math.round(y + h - 12 - zz * 6), 2, 1, "#a796c8"); } }
  },
  book(g, R, dith, x, y, w, h, t, asleep) {
    R(x, y, w, h, "#241a36"); R(x, y + h - 5, w, 5, "#3a2418"); for (let i = 2; i < w; i += 8) R(x + i, y + h - 5, 1, 5, "#2a1810");
    R(x + 48, y + 8, 19, 29, "#6a4a2a"); R(x + 49, y + 9, 17, 28, "#7a5432"); for (let j = 12; j < 36; j += 6) R(x + 49, y + j, 17, 1, "#5a3a22");   // front door
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (i * i + j * j <= 9) R(x + 57 + i, y + 15 + j, 1, 1, asleep ? "#3a2a20" : "#ffd070");
    R(x + 62, y + 24, 2, 2, "#ffd070"); R(x + 44, y + h - 6, 27, 2, "#8a3a5a");
    R(x + 40, y + 8, 2, 2, "#8a6a40"); R(x + 37, y + 10, 8, 2, "#4a1a6a"); R(x + 39, y + 4, 4, 6, "#5a2a7a"); R(x + 40, y + 1, 2, 3, "#5a2a7a");   // witch hat on the hook
    // the lectern and the Book of Shadows
    R(x + 15, y + 22, 3, 15, "#5a3a24"); R(x + 11, y + 35, 11, 2, "#4a3020"); R(x + 6, y + 19, 21, 4, "#6a4a2a");
    const runes = counts("book").all, glow = runes && !asleep;
    R(x + 7, y + 15, 19, 5, "#2a1440"); R(x + 8, y + 15, 8, 4, "#e8d0f0"); R(x + 17, y + 15, 8, 4, "#e8d0f0"); R(x + 16, y + 15, 1, 5, "#2a1440");
    for (let l = 0; l < 3; l++) { R(x + 9, y + 16 + l, 6, 1, glow && Math.sin(t * 3 + l) > 0 ? "#ff7ad9" : "#8a6aa8"); R(x + 18, y + 16 + l, 5 - l, 1, glow && Math.sin(t * 3 + l + 2) > 0 ? "#dc5aff" : "#8a6aa8"); }
    if (glow) { for (let k = 0; k < Math.min(runes, 6); k++) { const ph = (t * 0.5 + k / 6) % 1; R(x + 10 + (k * 5) % 14, Math.round(y + 14 - ph * 12), 1, 1, ph < 0.5 ? "#ff7ad9" : "#7a3a8a"); } }
    // Munin's perch
    R(x + 33, y + 19, 1, 18, "#5a3a24"); R(x + 29, y + 35, 9, 2, "#4a3020"); R(x + 27, y + 18, 13, 1, "#8a6a40");
    sprite(g, muninFrame(t, asleep), x + 25, y + 3);
    R(x + 68, y + 10, 1, 25, "#8a6a40"); for (let k = -2; k <= 2; k++) R(x + 68 + k, y + 33 + Math.abs(k), 1, 4 - Math.abs(k), "#d8b070");   // broom
  },
};

// ============================================================ The Sending: the road out of the front door
// Things finished today become lanterns along the path; the path forks into three trails with waystones.
const roadOff = document.createElement("canvas"); roadOff.width = RW; roadOff.height = RH;
let roadLayer = null;
const FORK = [129, 22];
const TRAIL_END = { job: [12, 74], games: [80, 80], school: [150, 70] };
const TRAIL_CTRL = { job: [70, 26], games: [104, 64], school: [148, 40] };
function bez(a, c, b, t) { const u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; }
function stonePos(trail, n, total) { const t = (n + 1) / (total + 0.4); return bez(FORK, TRAIL_CTRL[trail], TRAIL_END[trail], t).map(Math.round); }
function buildRoadLayer() {
  const c = document.createElement("canvas"); c.width = RW; c.height = RH; const g = c.getContext("2d");
  dither(g, 0, 0, RW, RH, "#14281a", "#1c3422", (i, j) => 0.3 + Math.sin(i * 0.3 + j * 0.2) * 0.15);
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  // the path from the door down to the fork
  for (let y = 0; y <= FORK[1]; y++) { const p = y / FORK[1], wdt = Math.round(32 - p * 26), cx = Math.round(129 + (1 - p) * 0); R(cx - (wdt >> 1), y, wdt, 1, "#4a3638"); R(cx - (wdt >> 1), y, 1, 1, "#2a1e22"); R(cx + (wdt >> 1) - 1, y, 1, 1, "#2a1e22"); if (y % 3 === 0) R(cx - (wdt >> 1) + ((y * 7) % Math.max(1, wdt)), y, 1, 1, "#5a4644"); }
  // the three trails
  for (const k of Object.keys(TRAILS)) for (let s = 0; s <= 1; s += 0.004) { const [px, py] = bez(FORK, TRAIL_CTRL[k], TRAIL_END[k], s); R(Math.round(px) - 1, Math.round(py) - 1, 3, 3, "#433034"); if (Math.random() < 0.06) R(Math.round(px), Math.round(py), 1, 1, "#5a4644"); }
  // tufts and tiny flowers
  const r = rnd(11); for (let n = 0; n < 60; n++) { const fx = Math.floor(r() * RW), fy = Math.floor(r() * RH); R(fx, fy, 1, 1, n % 7 === 0 ? "#dc5aff" : n % 5 === 0 ? "#ff7ad9" : "#2e4a30"); }
  return c;
}
function lanternSpots(n) { const a = []; for (let k = 0; k < n; k++) { const row = Math.floor(k / 2), side = k % 2 ? 1 : -1, y = 3 + row * 4; const p = Math.min(1, y / FORK[1]), wdt = 32 - p * 26; a.push([Math.round(129 + side * (wdt / 2 + 2)) - (side < 0 ? 1 : 0), y]); } return a; }
function drawRoad(t, cv) {
  const g = roadOff.getContext("2d"), R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  if (!roadLayer) roadLayer = buildRoadLayer();
  g.drawImage(roadLayer, 0, 0);
  const asleep = isNight();
  // lanterns for what was sent out today
  const sent = sentToday().length, spots = lanternSpots(Math.min(sent, 10));
  spots.forEach(([lx, ly], k) => { R(lx, ly, 1, 4, "#5a5068"); const fl = Math.sin(t * 7 + k * 1.3) > -0.4; R(lx - 1, ly - 2, 3, 3, fl ? "#ffd070" : "#ff9a50"); g.fillStyle = "rgba(255,208,112,0.18)"; g.fillRect(lx - 3, ly - 4, 7, 7); });
  // waystones along each trail
  const rd = road();
  for (const k of Object.keys(TRAILS)) {
    const stones = rd[k] || [], nextIdx = stones.findIndex(s => !s.done);
    stones.forEach((s, n) => {
      const [sx, sy] = stonePos(k, n, stones.length);
      R(sx - 2, sy - 6, 5, 7, s.done ? "#7a7090" : "#4a4460"); R(sx - 3, sy, 7, 1, "#2a2438"); R(sx - 1, sy - 7, 3, 1, s.done ? "#7a7090" : "#4a4460");
      const runeCol = s.done ? TRAILS[k].col : n === nextIdx ? (Math.sin(t * 3) > 0 ? "#8a7aa8" : "#5a5078") : "#3a3450";
      R(sx, sy - 5, 1, 4, runeCol); R(sx - 1, sy - 4, 1, 1, runeCol); R(sx + 1, sy - 3, 1, 1, runeCol);
      if (s.done && !asleep) { g.fillStyle = "rgba(255,225,250,0.10)"; g.fillRect(sx - 4, sy - 8, 9, 10); }
    });
  }
  // a mote of light travelling down a trail, each time something is sent
  for (const m of (S.motes || [])) { const age = (Date.now() - m.t0) / 2600; if (age > 1) continue; let px, py;
    if (age < 0.3) { const p = age / 0.3; px = 129; py = p * FORK[1]; } else { const stones = rd[m.trail] || []; const ni = Math.max(0, stones.findIndex(s => !s.done)); const tt = (ni + 1) / (stones.length + 0.4) * ((age - 0.3) / 0.7); [px, py] = bez(FORK, TRAIL_CTRL[m.trail] || TRAIL_CTRL.games, TRAIL_END[m.trail] || TRAIL_END.games, tt); }
    R(Math.round(px), Math.round(py), 2, 2, "#fff0a0"); g.fillStyle = "rgba(255,208,112,0.4)"; g.fillRect(Math.round(px) - 1, Math.round(py) - 1, 4, 4); }
  if (asleep) { g.fillStyle = "rgba(4,2,12,0.55)"; g.fillRect(0, 0, RW, RH); spots.forEach(([lx, ly]) => R(lx - 1, ly - 2, 3, 3, "#a06a30")); }
  const c2 = cv.getContext("2d"); c2.imageSmoothingEnabled = false; c2.drawImage(roadOff, 0, 0);
}

// ============================================================ small animated pictures: the logo, Munin's button, the moon
function drawLogo(cv, t) {   // a tiny cottage with a lit window and a curl of smoke
  const g = cv.getContext("2d"), R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  g.clearRect(0, 0, 16, 16);
  R(10, 2, 2, 4, "#3a2a48"); const sp = (t * 0.7) % 1; R(10 + Math.round(Math.sin(sp * 6)), Math.round(1 - sp * 2), 2, 1, "#6a5a88");
  for (let y = 0; y < 6; y++) R(8 - y - 1, 4 + y, (y + 1) * 2 + 1, 1, y % 2 ? "#45245a" : "#3e1f52");
  R(3, 10, 11, 5, "#2b1a48"); R(5, 11, 3, 3, isNight() ? "#3a2a20" : (Math.sin(t * 3) > -0.8 ? "#ffd070" : "#ff9a50")); R(9, 11, 3, 4, "#7a5432"); R(2, 15, 13, 1, "#24402a");
}
function drawMuninHead(cv, t) {   // Munin's face for his button
  const g = cv.getContext("2d"), R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  g.clearRect(0, 0, 16, 16);
  const blink = ((t * 10 | 0) % 50) === 0, tilt = S.flash.munin && Date.now() - S.flash.munin < 900 ? 1 : 0, asleep = isNight();
  for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const dx = i - 7.5, dy = j - 8.5 - tilt; if (dx * dx / 30 + dy * dy / 34 < 1) R(i, j, 1, 1, (i + j) % 5 === 0 && dy > 2 ? "#2a2040" : "#140e1e"); }
  R(9, 12 - tilt, 1, 1, "#5a3a8a"); R(4, 12 - tilt, 2, 1, "#2a2040");
  R(12, 7 + tilt, 3, 2, "#6a6078"); R(14, 8 + tilt, 2, 1, "#6a6078"); R(12, 9 + tilt, 2, 1, "#4a4058");
  if (asleep) R(8, 7, 3, 1, "#3a3050"); else if (blink) R(9, 7 + tilt, 2, 1, "#3a3050"); else { R(9, 6 + tilt, 2, 2, "#ffd070"); R(10, 6 + tilt, 1, 1, "#140e1e"); }
  R(5, 3 - tilt, 1, 1, "#5a3a8a");
}
function drawMoon(cv) { const g = cv.getContext("2d"); g.clearRect(0, 0, 12, 12); for (let j = 0; j < 12; j++) for (let i = 0; i < 12; i++) { const a = (i - 6) ** 2 + (j - 6) ** 2, b = (i - 8) ** 2 + (j - 4.5) ** 2; if (a < 25 && b > 16) { g.fillStyle = "#ffd070"; g.fillRect(i, j, 1, 1); } } }
function drawMuninBig(cv, t) { // Munin full body, for his sheet and the home greeting
  const g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height); g.imageSmoothingEnabled = false;
  sprite(g, muninFrame(t, isNight()), 0, 0);
}

// ============================================================ project objects: each project is a little thing you can pick up
// 12x12 letter grids. Each object has its own small palette.
const OBJ = {
  jar: { pal: { c: "#a0703a", g: "#8ac0e8", w: "#d8f0ff", p: "#4fd17a", d: "#5a3a24" }, g: ["....cccc....", "....cccc....", "...gwwwwg...", "..g......g..", "..g..p...g..", "..g.ppp..g..", "..g..p.p.g..", "..g.pppp.g..", "..gddddddg..", "..gddddddg..", "...gggggg...", "............"] },
  orrery: { pal: { b: "#c8a050", y: "#ffd070", u: "#8ac0e8", k: "#5a3a24" }, g: ["....bbbb....", "..bb....bb..", ".b...u....b.", ".b........b.", "b....yy....b", "b...yyyy...b", "b...yyyy...b", "b....yy....b", ".b........b.", "..bb...ubb..", "....bbbb....", ".....kk....."] },
  star: { pal: { y: "#ffd070", o: "#ff9a50", w: "#fff0c0" }, g: [".....yy.....", ".....yy.....", "....yooy....", "yyyyyooyyyyy", ".yyoowooooy.", "..yyoooooy..", "...yooooy...", "..yyoyyoyy..", "..yyy..yyy..", ".yy......yy.", ".y........y.", "............"] },
  army: { pal: { h: "#6a6a80", c: "#c8784a", e: "#140e1e", s: "#8a4a2a" }, g: ["....hhhh....", "...hhhhhh...", "....cccc....", "....ceec....", "....cccc....", "..cccccccc..", "..c.ssss.c..", "..c.cccc.c..", "....cccc....", "....c..c....", "....c..c....", "...cc..cc..."] },
  chart: { pal: { p: "#a07a48", w: "#1a1440", s: "#ffe1fa", l: "#ff7ad9" }, g: ["............", ".pppppppppp.", "pwwwwwwwwwwp", "pw.s....s.wp", "pw..l..l..wp", "pw...s....wp", "pw..l.l...wp", "pw.s...s..wp", "pwwwwwwwwwwp", ".pppppppppp.", "............", "............"] },
  potion: { pal: { c: "#a0703a", g: "#8ac0e8", m: "#ff7ad9", w: "#ffe1fa" }, g: [".....cc.....", ".....cc.....", "....gggg....", "....g..g....", "...g....g...", "..g......g..", "..gmmmmmmg..", "..gmwmmmmg..", "..gmmmmmmg..", "...gmmmmg...", "....gggg....", "............"] },
  chest: { pal: { w: "#7a4a28", y: "#ffd070", k: "#140e1e", d: "#5a3018" }, g: ["............", "..wwwwwwww..", ".wyyyyyyyyw.", ".wddddddddw.", ".yyyyyyyyyy.", ".wwwwyywwww.", ".wwwwykwwww.", ".wwwwwwwwww.", ".wddddddddw.", ".yyyyyyyyyy.", "............", "............"] },
  wand: { pal: { w: "#8a6a40", l: "#dc5aff", s: "#ffe1fa" }, g: ["........s.s.", ".........l..", "........sls.", ".......ww...", "......ww....", ".....ww.....", "....ww......", "...ww.......", "..ww........", ".ww.........", "ww..........", "............"] },
  globe: { pal: { u: "#8ac0e8", g: "#4fd17a", b: "#c8a050" }, g: ["....uuuu....", "..uuggguuu..", ".uugggguuuu.", ".uuuggguuuu.", "uuuuuguuuggu", "uuuuuuuugggu", "uuuuuuuuuggu", ".uuggguuuuu.", ".uugggguuuu.", "..uuggguuu..", "....uuuu....", "....bbbb...."] },
  cauldron: { pal: { k: "#2a2438", g: "#7ae89a", o: "#ff9a50", r: "#4a4460" }, g: ["...g..g.....", "....gg..g...", "..rrrrrrrr..", ".kggggggggk.", ".kkkkkkkkkk.", ".kkkkkkkkkk.", ".kkkkkkkkkk.", "..kkkkkkkk..", "...kkkkkk...", "..k......k..", ".ooo.oo.ooo.", "............"] },
  telescope: { pal: { b: "#c8a050", y: "#ffd070", l: "#5a3a24" }, g: ["..........bb", "........bbbb", "......bbbbb.", "....bbbbb...", "..ybbbb.....", "..yyb.......", "....l.......", "...l.l......", "..l...l.....", ".l.....l....", "l.......l...", "............"] },
  ledger: { pal: { k: "#a796c8", m: "#9fe6d0", g: "#ff7ad9", y: "#ffd070", p: "#dc5aff" }, g: ["............", ".k..........", ".k........p.", ".k........p.", ".k....g...p.", ".k....g...p.", ".k.m..g...p.", ".k.m..g.y.p.", ".k.m..g.y.p.", ".kkkkkkkkkkk", "............", "............"] },
  letter: { pal: { w: "#e8e0f0", r: "#d84a2a", s: "#a796c8" }, g: ["............", "............", ".wwwwwwwwww.", ".ws......sw.", ".w.s....s.w.", ".w..s..s..w.", ".w...rr...w.", ".w...rr...w.", ".wwwwwwwwww.", "............", "............", "............"] },
  cap: { pal: { k: "#3a2a6a", y: "#ffd070", b: "#8ac0e8", r: "#e8e0f0" }, g: [".....kk.....", "...kkkkkk...", ".kkkkkkkkkk.", "...kkkkkk.y.", "...kkkkkk.y.", "....kkkk..y.", "..........y.", ".bbbbbbbbbb.", ".brrrrrrrrb.", ".bbbbbbbbbb.", "............", "............"] },
  feather: { pal: { l: "#dc5aff", p: "#ffe1fa" }, g: ["..........ll", ".........lpl", "........lpl.", ".......lpl..", "......lpl...", ".....lpl....", "....lpl.....", "...lpl......", "..lpl.......", "..ll........", ".l..........", "l..........."] },
  book: { pal: { b: "#5a3a8a", p: "#e8d0f0", k: "#3a2058" }, g: ["............", ".bbbbbbbbb..", ".bpppppppbk.", ".bp.....pbk.", ".bp.....pbk.", ".bpppppppbk.", ".bp.....pbk.", ".bp.....pbk.", ".bpppppppbk.", ".bbbbbbbbbk.", "..kkkkkkkkk.", "............"] },
};
const OBJ_NAMES = { jar: "terrarium jar", orrery: "little orrery", star: "forge star", army: "clay soldier", chart: "star chart", potion: "potion flask", chest: "shop chest", wand: "wand", globe: "little globe", cauldron: "cauldron", telescope: "telescope", ledger: "ledger", letter: "letter", cap: "scholar's cap", feather: "raven feather", book: "book" };
function objFor(p) {
  if (p.obj && OBJ[p.obj]) return p.obj;
  const n = (p.id + " " + p.name).toLowerCase();
  const rules = [["witchbottle|terrarium|jar", "jar"], ["orrery", "orrery"], ["forge|star forge", "star"], ["army|battler|soldier", "army"], ["constellation", "chart"], ["potion", "potion"], ["shop|workbench|chest", "chest"], ["slice", "wand"], ["site|website|web", "globe"], ["coven", "cauldron"], ["stargazer|universe", "telescope"], ["tracker|dltracker|data|sql", "ledger"], ["job|resume|career", "letter"], ["school|college|degree", "cap"], ["brain|cottage", "feather"]];
  for (const [re, o] of rules) if (new RegExp(re).test(n)) return o;
  return "book";
}
const OBJ_URL = {};
function objURL(p) {
  const k = typeof p === "string" ? p : objFor(p); if (OBJ_URL[k]) return OBJ_URL[k];
  const o = OBJ[k], c = document.createElement("canvas"); c.width = c.height = 12; const g = c.getContext("2d");
  o.g.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = o.pal[ch] || "#ffe1fa"; g.fillRect(x, y, 1, 1); }));
  return OBJ_URL[k] = c.toDataURL();
}

// ============================================================ hexing something into firewood
// A little hearth peeks up from the corner, and the note crumples into a ball and lands on the woodpile as a log.
function toss(from) {
  let h = $("tossHearth");
  if (!h) { h = document.createElement("canvas"); h.id = "tossHearth"; h.className = "roomcv tossh"; h.dataset.room = "life"; h.dataset.s = "2"; h.width = 142; h.height = 84; h.setAttribute("aria-hidden", "true"); document.body.appendChild(h); }
  h.classList.add("show"); clearTimeout(toss.t); toss.t = setTimeout(() => h.classList.remove("show"), 2800);
  const ball = document.createElement("canvas"); ball.width = 6; ball.height = 6; ball.className = "paperball"; document.body.appendChild(ball);
  const g = ball.getContext("2d"); [[1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [3, 1], [4, 1], [0, 2], [2, 2], [3, 2], [4, 2], [5, 2], [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [1, 4], [2, 4], [3, 4], [4, 4], [2, 5], [3, 5]].forEach(([x, y], n) => { g.fillStyle = n % 4 === 0 ? "#c8b0d8" : "#f3e6ff"; g.fillRect(x, y, 1, 1); });
  const x0 = from ? from.left + Math.min(from.width, 60) / 2 : innerWidth / 2, y0 = from ? from.top + 6 : innerHeight / 2;
  const x1 = 16 + 38 * 2 - 9, y1 = innerHeight - 16 - 84 + 34 * 2 - 9, t0 = performance.now(), dur = 820;   // lands on the woodpile
  sfx("toss");
  const step = now => {
    const p = Math.min(1, (now - t0) / dur), arc = Math.sin(p * Math.PI) * Math.min(220, Math.abs(y1 - y0) * 0.6 + 120);
    ball.style.left = (x0 + (x1 - x0) * p) + "px"; ball.style.top = (y0 + (y1 - y0) * p - arc) + "px"; ball.style.transform = `rotate(${p * 540}deg) scale(${1 - p * 0.35})`;
    if (p < 1) requestAnimationFrame(step); else ball.remove();
  };
  requestAnimationFrame(step);
}
