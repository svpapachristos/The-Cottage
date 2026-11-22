// ============================================================ 09 · the rune table, the fireplace, and the baskets
// The rune table is where you set down the one thing you're working on. It shows what's being built,
// where it's going, what's already done, and a place to drop stray thoughts for Munin, with a candle
// that burns while you work.

// ---- baskets: every room has one for the odds and ends that don't belong to a project
const BASKET = "_loose-";
const isBasketId = id => String(id || "").startsWith(BASKET);
function basketOf(area) { return { id: BASKET + area, name: "Odds and ends", area, obj: "basket", virtual: true, status: "Everything in the " + ROOMS[area].name + " that isn't part of a project", trail: AREA_TRAIL[area] || "" }; }
function projectById(id) { return isBasketId(id) ? (ROOMS[id.slice(BASKET.length)] && id.slice(BASKET.length) !== "book" ? basketOf(id.slice(BASKET.length)) : null) : (live(S.projects[id]) ? S.projects[id] : null); }
function itemsOf(p) { return p.virtual ? items().filter(i => roomOf(i) === p.area && !projOf(i)) : items().filter(i => i.project === p.id); }
OBJ.basket = { pal: { w: "#a0703a", d: "#7a4a28", h: "#d8a060", s: "#ffe1fa", g: "#4fd17a" }, g: ["............", "...hhhhhh...", "..h......h..", "..h..s.g.h..", ".wwwwwwwwww.", ".wdwdwdwdww.", ".wwdwdwdwdw.", ".wdwdwdwdww.", "..wwdwdwdw..", "..wwwwwwww..", "............", "............"] };
OBJ_NAMES.basket = "basket";

// ---- the fireplace: logs on the woodpile you can drag into the fire
const FIRE_ZONE = [9, 16, 19, 22];   // the fireplace opening, in Hearth room pixels: x, y, w, h
let LOG_URL = "";
function logURL() {
  if (LOG_URL) return LOG_URL;
  const c = document.createElement("canvas"); c.width = 10; c.height = 5; const g = c.getContext("2d");
  g.fillStyle = "#7a4a28"; g.fillRect(1, 0, 8, 5); g.fillStyle = "#5a3418"; g.fillRect(1, 3, 8, 1); g.fillStyle = "#d8a060"; g.fillRect(0, 0, 2, 5); g.fillStyle = "#a0703a"; g.fillRect(0, 1, 1, 3); g.fillRect(8, 2, 2, 1);
  return LOG_URL = c.toDataURL();
}
// The logs by the hearth, placed in room pixels as percentages so they scale with any size of fireplace.
// Each log carries a name tag (what it was, when it was hexed): tap a log to read it, and it rides along while you drag.
function logName(col, o) { return { name: o.title || o.name || "Something old", what: (col === "projects" ? "Project" : KINDS[o.kind] || "Note") + (o.wood ? " · hexed " + fmtDate(o.wood) : "") }; }
function logsHTML(wood) {
  return wood.slice(0, 9).map(({ col, o }, n) => { const lx = 31 + (n % 3) * 4 + (Math.floor(n / 3) % 2 ? 2 : 0), ly = 42 - 8 - Math.floor(n / 3) * 3, L = logName(col, o);
    return `<button class="log" data-log="${col}:${esc(o.id)}" style="left:${(lx / 71 * 100).toFixed(2)}%;top:${(ly / 42 * 100).toFixed(2)}%" aria-label="Log: ${esc(L.name)}, ${esc(L.what)}. Drag into the fire to burn it"><img src="${logURL()}" alt=""><span class="logtag" aria-hidden="true"><b>${esc(snip(L.name, 48))}</b><small>${esc(L.what)}</small></span></button>`; }).join("")
    + (wood.length > 9 ? `<span class="morelogs">+${wood.length - 9}</span>` : "");
}
function fireplaceHTML(wood, id) {
  const s = 4;
  return `<div class="fireplace" id="${id}" style="width:${71 * s}px;height:${42 * s}px">
    <canvas class="roomcv" id="${id}-cv" data-room="life" data-s="${s}" width="${71 * s}" height="${42 * s}"></canvas>
    <div class="logs">${logsHTML(wood)}</div></div>`;
}
// Drag a log: drop it in the fireplace to burn it, anywhere else and it rolls back onto the pile.
function wireFireplace(id, onBurn) {
  const box = $(id); if (!box) return;
  box.querySelectorAll(".log").forEach(el => {
    el.onpointerdown = e => {
      e.preventDefault(); el.setPointerCapture(e.pointerId);
      const start = { x: e.clientX, y: e.clientY }; let moved = false;
      box.querySelectorAll(".log.show").forEach(x => { if (x !== el) x.classList.remove("show"); });
      el.classList.add("dragging");
      el.onpointermove = ev => { const dx = ev.clientX - start.x, dy = ev.clientY - start.y; if (Math.abs(dx) + Math.abs(dy) > 4) moved = true; el.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 12}deg)`; };
      el.onpointerup = el.onpointercancel = async ev => {
        el.onpointermove = el.onpointerup = el.onpointercancel = null; el.classList.remove("dragging");
        const r = box.getBoundingClientRect(), s = r.width / 71, er = el.getBoundingClientRect(), cx = (er.left + er.width / 2 - r.left) / s, cy = (er.top + er.height / 2 - r.top) / s;
        const [fx, fy, fw, fh] = FIRE_ZONE, inFire = cx > fx - 2 && cx < fx + fw + 2 && cy > fy - 2 && cy < fy + fh + 4;
        if (moved && inFire) {
          el.classList.add("burning"); const [col, oid] = el.dataset.log.split(/:(.+)/); const o = S[col][oid];
          setTimeout(async () => { await burnOne(col, oid); toast(`"${snip(o ? o.title || o.name : "", 40)}" went up in sparks`); if (onBurn) onBurn(); }, 380);
        } else {
          el.style.transition = "transform .3s ease"; el.style.transform = ""; setTimeout(() => { el.style.transition = ""; }, 320);
          if (!moved) { el.classList.toggle("show"); clearTimeout(el.tagT); if (el.classList.contains("show")) { sfx("rune"); el.tagT = setTimeout(() => el.classList.remove("show"), 4000); } }
        }
      };
    };
  });
}

// ---- the rune table
const tableMeta = () => S.meta.table || {};
function tableProject() { const id = tableMeta().project; return id ? projectById(id) : null; }
function setTable(pid) { putMeta("table", { project: pid, since: Date.now() }); S.flash.munin = Date.now(); sfx("rune"); go("#table"); }
function clearTable() { putMeta("table", { project: "", since: Date.now() }); }
function candleState() { const c = PREF.get("candle", null); return c && c.mins ? c : { mins: 25, endAt: 0, left: 0 }; }
function candleLeft(c = candleState()) { return c.endAt ? Math.max(0, c.endAt - Date.now()) : c.left || 0; }
function vTable() {
  const p = tableProject();
  if (!p) {
    const todays = [...new Set(items().filter(i => pickOf(i) === "today" && !i.done).map(i => projOf(i) ? projOf(i).id : BASKET + roomOf(i)))].map(projectById).filter(Boolean);
    const rest = projects().filter(x => !todays.includes(x));
    $("view").innerHTML = `<div class="${S.built === "table" ? "" : "fade"}">${crumbs([["The rune table"]])}
      <div class="ptitle"><h2>The rune table</h2><span class="sub">Set one thing down and work on just that.</span></div>
      ${todays.length ? `<h3 class="sec">From today's picks</h3><div class="objs">${todays.map(x => `<button class="obj" data-settable="${esc(x.id)}"><img class="sprite" src="${objURL(x)}" alt=""><span class="n">${esc(x.name)}</span><span class="nx">${esc(snip((nextStep(x) || {}).label || x.next || "", 60))}</span></button>`).join("")}</div>` : ""}
      <h3 class="sec">Everything on the shelves</h3><div class="objs">${rest.map(x => `<button class="obj" data-settable="${esc(x.id)}"><img class="sprite" src="${objURL(x)}" alt=""><span class="n">${esc(x.name)}</span><span class="nx">${esc(ROOMS[x.area || "games"].name)}</span></button>`).join("")}</div></div>`;
    S.built = "table"; return;
  }
  const th = threadOf(p), ns = nextStep(p), its = itemsOf(p), tr = trailOf(p);
  const doneSteps = [...its.filter(i => (i.kind === "todo" && i.done) || i.kind === "log")].sort((a, b) => (doneAt(b) || b.created) - (doneAt(a) || a.created));
  const upcoming = th.steps.filter(s => !s.done && (!ns || refKey(s) !== refKey(ns))).slice(0, 2);
  const stone = th.steps.find(s => s.kind === "stone" && !s.done) || (tr && (road()[tr] || []).find(w => !w.done) ? { label: (road()[tr] || []).find(w => !w.done).title, trail: tr } : null);
  const jotted = items().filter(i => isRune(i) && i.jotFrom === p.id).sort(byNew).slice(0, 4);
  const c = candleState(), left = candleLeft(c), running = !!c.endAt && left > 0;
  const fresh = S.built !== "table:" + p.id;
  if (fresh) {
    $("view").innerHTML = `<div class="fade">${crumbs([["The rune table"]])}
      <div class="tablewrap"><canvas id="tableCv" class="tablecv" width="200" height="96" aria-label="${esc(p.name)} on the rune table"></canvas></div>
      <div class="candlebar" id="candleBar"></div>
      <div class="tgrid" id="tgrid"></div>
      <div class="btns" style="margin-top:12px;justify-content:center"><button data-go="${esc(hashFor.p(p.id))}">Open the whole thing</button><button data-swaptable>Set something else down</button><button class="ghost" data-cleartable>Lift it off the table</button></div></div>`;
    S.built = "table:" + p.id; fitTable();
  }
  $("candleBar").innerHTML = `<span class="sub">Candle</span>${[15, 25, 45, 60].map(m => `<button class="chip ${c.mins === m ? "on" : ""}" data-candlemins="${m}">${m} min</button>`).join("")}
    <button class="${running ? "" : "main"}" data-candle="${running ? "pause" : "light"}">${running ? "Pause" : left && left < c.mins * 60000 ? "Relight" : "Light the candle"}</button>${left && left < c.mins * 60000 ? `<button class="ghost" data-candle="snuff">Snuff it</button>` : ""}<span class="ctime" id="candleTime">${fmtLeft(left || c.mins * 60000)}</span>`;
  if (!typing()) $("tgrid").innerHTML = `
    <div class="card tp"><div class="lbl">${img("todo")} Being built</div>
      <div class="tobj"><img class="sprite" src="${objURL(p)}" alt=""><div><div class="px tname">${esc(p.name)}</div><div class="sub">${esc(snip(p.status || "", 90))}</div></div></div>
      ${nextBox(p, ns)}
      ${upcoming.length ? `<div class="sub" style="margin-top:8px">Then: ${upcoming.map(s => esc(snip(s.label, 50))).join(" › ")}</div>` : ""}</div>
    <div class="card tp"><div class="lbl">${img("log")} Where we're going</div>
      ${stone ? `<div class="goal"><span class="flag" style="background:${TRAILS[stone.trail] ? TRAILS[stone.trail].col : "#dc5aff"}"></span><div><div class="sub">${TRAILS[stone.trail] ? TRAILS[stone.trail].name + " trail" : "Next waystone"}</div><div>${esc(stone.label)}</div></div></div>` : `<div class="empty">No waystone on this one's thread yet.</div>`}
      ${threadHTML(p, th)}
      ${!p.virtual ? `<div class="btns" style="margin-top:6px"><button class="ghost" data-thread="${esc(p.id)}">Edit the thread</button></div>` : ""}</div>
    <div class="card tp"><div class="lbl">${img("rune")} What we've done <span class="c">${doneSteps.length || ""}</span></div>
      ${doneSteps.length ? `<div class="runes">${doneSteps.slice(0, 7).map(i => `<div class="litrune"><span class="glyph">ᚱ</span><span>${esc(snip(i.title, 70))}</span><span class="sub">${i.kind === "log" && i.date ? i.date.slice(5).replace("-", "/") : fmtDate(doneAt(i) || i.created)}</span></div>`).join("")}</div>` : `<div class="empty">Nothing finished here yet. The first rune lights up when you finish a step.</div>`}</div>
    <div class="card tp"><div class="lbl">${img("quill")} Thoughts</div>
      <div class="sub" style="margin:-2px 0 6px">Anything that pops into your head: jot it here and keep going. Munin takes it to the Book of Shadows and sorts it later.</div>
      <textarea id="jotIn" rows="3" placeholder="A stray thought..."></textarea>
      <div class="btns" style="margin-top:6px"><span class="spacer"></span><button class="main" data-jot="${esc(p.id)}">Give it to Munin</button></div>
      ${jotted.length ? `<div class="sub" style="margin-top:8px">Jotted while working:</div>${jotted.map(i => `<div class="sub">· ${esc(snip(i.title, 70))}</div>`).join("")}` : ""}</div>`;
}
function fmtLeft(ms) { const m = Math.floor(ms / 60000), s = Math.floor(ms % 60000 / 1000); return m + ":" + pad2(s); }
function fitTable() { const c = $("tableCv"); if (!c) return; const s = Math.max(2, Math.min(5, Math.floor(Math.min($("view").clientWidth, 1000) / 200))); c.style.width = 200 * s + "px"; c.style.height = 96 * s + "px"; }
addEventListener("resize", fitTable);
function candle(action, mins) {
  const c = candleState();
  if (mins) { if (!c.endAt) { c.mins = mins; c.left = 0; } PREF.set("candle", c); render(); return; }
  if (action === "light") { const left = c.left && c.left < c.mins * 60000 ? c.left : c.mins * 60000; c.endAt = Date.now() + left; c.left = 0; sfx("rune"); S.flash.munin = Date.now(); }
  else if (action === "pause") { c.left = candleLeft(c); c.endAt = 0; }
  else if (action === "snuff") { c.endAt = 0; c.left = 0; }
  PREF.set("candle", c); render();
}
// Checked every frame by the animation loop: when the candle burns down, Munin says so.
function candleTick() {
  const c = candleState(); if (!c.endAt) return;
  if (Date.now() >= c.endAt) { c.endAt = 0; c.left = 0; PREF.set("candle", c); sfx("stone"); S.flash.munin = Date.now(); toast("The candle has burned down. Stand up, stretch, then light another if you like"); render(); }
  else if ($("candleTime")) $("candleTime").textContent = fmtLeft(c.endAt - Date.now());
}
function jot(pid) {
  const el = $("jotIn"), t = el ? el.value.trim() : ""; if (!t) return;
  const ids = inscribe(t, true); ids.forEach(id => { const it = S.items[id]; if (it) S.items[id] = { ...it, jotFrom: pid }; if (it) put("items", id, { ...it, jotFrom: pid }); });
  el.value = ""; if (!autoFile(ids)) toast("Munin took it to the Book of Shadows"); fly(el.getBoundingClientRect());
}
function swapTable() {
  openSheet("swap", `<h3>${img("todo")} Set something else down</h3><div class="objs">${projects().map(x => `<button class="obj" data-settable="${esc(x.id)}"><img class="sprite" src="${objURL(x)}" alt=""><span class="n">${esc(x.name)}</span></button>`).join("")}</div>`);
}

// The rune table, drawn: a stone circle on a wooden table, the object floating above it, a candle and Munin.
function drawTable(t) {
  const cv = $("tableCv"); if (!cv) return; const p = tableProject(); if (!p) return;
  const g = cv.getContext("2d"), R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  dither(g, 0, 0, 200, 60, "#160c2a", "#1e1236", (i, j) => 0.35 + Math.sin(i * 0.07) * 0.1 + j / 200);
  // a window with the real moon, and shelves
  R(14, 8, 26, 26, "#3a2a48"); R(16, 10, 22, 22, "#0a1030"); R(26, 10, 2, 22, "#3a2a48"); R(16, 20, 22, 2, "#3a2a48");
  const ph = moonPhase(); for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (i * i + j * j <= 9) R(21 + i, 15 + j, 1, 1, (ph < 0.5 ? i > Math.cos(ph * 2 * Math.PI) * 3 : i < -Math.cos(ph * 2 * Math.PI) * 3) ? "#ffe9c0" : "#2a2240");
  R(150, 14, 40, 2, "#5a3a24"); [["#4fd17a", 152], ["#dc5aff", 158], ["#8ac0e8", 165], ["#ffd070", 172], ["#ff7ad9", 180]].forEach(([c, x], n) => { R(x, 6 + (n % 2), 4, 8 - (n % 2), c); R(x, 5 + (n % 2), 4, 1, "#e8d8c0"); });
  // the table
  R(0, 60, 200, 36, "#4a2e1c"); for (let y = 62; y < 96; y += 5) R(0, y, 200, 1, "#3e2616"); R(0, 60, 200, 2, "#6a4a2a");
  // the rune circle: one rune lit for each finished step
  const done = itemsOf(p).filter(i => (i.kind === "todo" && i.done) || i.kind === "log").length, lit = Math.min(12, done);
  const cx = 100, cy = 76, rx = 52, ry = 13, running = !!candleState().endAt;
  for (let a = 0; a < 120; a++) { const an = a / 120 * Math.PI * 2; R(Math.round(cx + Math.cos(an) * rx), Math.round(cy + Math.sin(an) * ry), 1, 1, (a + Math.floor(t * (running ? 8 : 2))) % 10 < 7 ? "#dc5aff" : "#7a3a9a"); }
  for (let a = 0; a < 90; a++) { const an = a / 90 * Math.PI * 2; R(Math.round(cx + Math.cos(an) * (rx - 7)), Math.round(cy + Math.sin(an) * (ry - 3)), 1, 1, "#5a2a7a"); }
  for (let k = 0; k < 12; k++) { const an = k / 12 * Math.PI * 2 - Math.PI / 2, rxx = Math.round(cx + Math.cos(an) * (rx - 3.5)), ryy = Math.round(cy + Math.sin(an) * (ry - 1.5)), on = k < lit;
    const col = on ? (Math.sin(t * 3 + k) > -0.3 ? "#ffd070" : "#ff7ad9") : "#4a3060"; R(rxx, ryy - 2, 1, 4, col); R(rxx - 1, ryy - 1, 1, 1, col); R(rxx + 1, ryy, 1, 1, col); }
  // a glow under the object, and the object itself, bobbing gently
  for (let j = -6; j <= 6; j++) for (let i = -20; i <= 20; i++) if (i * i / 400 + j * j / 36 < 1 && BAYER[((j + 8) & 3) * 4 + ((i + 20) & 3)] < 0.45 - (i * i / 400 + j * j / 36) * 0.4) R(cx + i, cy - 2 + j, 1, 1, "#7a3aa0");
  const o = OBJ[objFor(p)], bob = Math.round(Math.sin(t * 1.6) * 2), ox = cx - 18, oy = 34 + bob;
  o.g.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== ".") R(ox + x * 3, oy + y * 3, 3, 3, o.pal[ch] || "#ffe1fa"); }));
  if (running) for (let k = 0; k < 6; k++) { const ph2 = (t * 0.5 + k / 6) % 1; R(Math.round(cx - 30 + k * 12 + Math.sin(ph2 * 6 + k) * 3), Math.round(cy - 4 - ph2 * 40), 1, 1, ph2 < 0.6 ? "#ffd070" : "#a07ad0"); }
  // the candle: it gets shorter as the time burns down
  const c = candleState(), frac = c.endAt ? Math.max(0, (c.endAt - Date.now()) / (c.mins * 60000)) : c.left ? c.left / (c.mins * 60000) : 1;
  const ch = Math.max(2, Math.round(20 * frac)), bx = 34, by = 70;
  R(bx - 5, by, 14, 3, "#8a6a40"); R(bx - 3, by - 1, 10, 1, "#a0804a");
  R(bx, by - ch, 4, ch, "#e8d8c0"); R(bx + 3, by - ch, 1, ch, "#c8b8a0"); R(bx + 1, by - ch - 2, 1, 2, "#3a2a20");
  if (c.endAt) { const f = Math.sin(t * 9) > 0; R(bx, by - ch - 5, 3, 3, f ? "#ffd070" : "#ff9a50"); R(bx + 1, by - ch - 7, 1, 2, "#fff0c0"); g.fillStyle = "rgba(255,208,112,0.10)"; g.fillRect(bx - 12, by - ch - 16, 28, 24); }
  // Munin, perched on the table's edge
  const fr = muninFrame(t, false), rows = SPR[fr];
  rows.forEach((row, y) => [...row].forEach((ch2, x) => { if (ch2 !== ".") R(150 + (15 - x) * 2, 30 + y * 2, 2, 2, PAL[ch2]); }));
}
