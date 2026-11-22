// ============================================================ 03 · views: what's on screen for each place in the cottage
// Places are named in the address after "#": (nothing) = home, book, library, table, road, room-games, p-orrery, doc-<id>.

function route() { S.route = location.hash.replace(/^#/, ""); S.built = null; render(); window.scrollTo({ top: 0 }); }
addEventListener("hashchange", route);
function parseRoute(r) {
  r = r || "";
  const old = r.match(/^\/(room|p)\/(.+)$/); if (old) return old[1] === "room" ? { v: old[2] === "inbox" ? "book" : "room", id: old[2] } : { v: "p", id: decodeURIComponent(old[2]) };
  if (r === "book" || r === "library" || r === "table" || r === "road") return { v: r };
  let m = r.match(/^room-(\w+)$/); if (m) return m[1] === "book" ? { v: "book" } : { v: "room", id: m[1] };
  m = r.match(/^p-(.+)$/); if (m) return { v: "p", id: m[1] };
  m = r.match(/^doc-(.+)$/); if (m) return { v: "doc", id: m[1] };
  return { v: "home" };
}
const hashFor = { room: k => k === "book" ? "#book" : "#room-" + k, p: id => "#p-" + id, doc: id => "#doc-" + id };
const go = h => { h = h || ""; const cur = location.hash || ""; if (cur === h || (h === "" && !cur) || (h === "#" && !cur)) route(); else location.hash = h; };
function placeOf(it) { if (it.kind === "doc" && !isRune(it)) return hashFor.doc(it.id); if (it.parent && pageOf(it.parent)) return hashFor.doc(it.parent); const r = roomOf(it); if (r === "book") return "#book"; const p = projOf(it); return hashFor.p(p ? p.id : BASKET + r); }

let raf = 0;
function render() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); }
function typing() { const a = document.activeElement; return a && $("view").contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName); }
document.addEventListener("focusout", () => setTimeout(() => { if (S.pending && !typing()) { S.pending = false; render(); } }, 0));
function draw() {
  const notes = [];
  if (S.signin) return;
  if (S.mode === "local") notes.push("This is a local copy of The Cottage, not your Cottage server, so changes save on this device only.");
  if (S.note) notes.push(S.note);
  $("banner").innerHTML = notes.map(n => `<div class="banner">${esc(n)}</div>`).join("");
  $("hdrSub").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  document.body.classList.toggle("night", isNight());
  if (typing()) { S.pending = true; return; }
  if (!S.ready) { $("view").innerHTML = `<div class="empty" style="padding:40px;text-align:center">Lighting the lanterns...</div>`; return; }
  let r = parseRoute(S.route);
  // Parked for now (22 Nov blueprint): the road, the library page and the rune table. Their code and data stay; the
  // screens are just not reachable, so an old link lands back at the cottage.
  if (r.v === "road" || r.v === "library" || r.v === "table") { history.replaceState(null, "", location.pathname + location.search); S.route = ""; r = { v: "home" }; }
  if (!placeLive(r)) r = { v: "home" };
  if (r.v !== "home") PREF.set("lastPlace", S.route);
  walkShell();
  drawCottage(r);
  // At home on a wide screen, the reader keeps the last book you had open, so you never lose your place
  let rr = r;
  if (r.v === "home") { const lr = parseRoute(PREF.get("lastPlace", "")); rr = wideScreen() && lr.v !== "home" && placeLive(lr) ? lr : { v: "home" }; }
  document.body.classList.toggle("reading", r.v !== "home");
  drawReader(rr);
}
function fresh(key, html) { const v = $("reader") || $("view"); if (S.built !== key) { v.innerHTML = html; v.firstElementChild && v.firstElementChild.classList.add("fade"); S.built = key; return true; } return false; }
function crumbs(parts) { return `<div class="crumbs"><button class="closer" data-go="" aria-label="Back to the cottage">‹ Cottage</button><a data-go="" class="home-a">Cottage</a>${parts.map(([t, h]) => `<span class="sep">›</span>${h ? `<a data-go="${esc(h)}">${esc(t)}</a>` : `<span>${esc(t)}</span>`}`).join("")}</div>`; }

// ============================================================ home: Munin's one line, today, a place to write, and the house
// Home answers one question: what do I do next? So it holds only four things: Munin's line, Today (one to three),
// a box to write anything down, and the cottage itself (tap a room to go in). Everything else is one tap deeper.
function vHome() {
  if (fresh("home" + (isNight() ? ":night" : ""), `<div class="home"><div class="homecol" id="today">${homeColumn()}</div>
      <div class="left"><div class="house" id="house"><canvas id="hcv" width="${HW}" height="${HH}"></canvas><div id="hots"></div></div>
      <div class="houselinks"><button class="ghost" data-go="#road">${img("log")} The road</button><button class="ghost" data-go="#library">${img("library")} The library</button></div></div></div>`)) {
    fitHouse();
    $("homeSave").onclick = homeInscribe;
    $("homeIn").onkeydown = e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey || !e.shiftKey && !/\n/.test($("homeIn").value) && $("homeIn").value.length < 140)) { e.preventDefault(); homeInscribe(); } };
  }
  $("todayBox").innerHTML = todayHTML();
  const s = S.scale || 2, todays = new Set(items().filter(i => pickOf(i) === "today" && !i.done).map(roomOf));
  $("hots").innerHTML = Object.entries(ROOMS).map(([k, R]) => {
    const c = counts(k), [x, y, w, h] = R.r;
    // one marker per room at most: runes waiting in the book, or a lantern where today's work lives
    const bad = k === "book" ? (c.all ? `<span class="chipn rune">${c.all} ${c.all === 1 ? "rune" : "runes"}</span>` : "") : todays.has(k) ? `<span class="chipn new">today</span>` : "";
    return `<button class="hot" data-room="${k}" style="left:${x * s}px;top:${y * s}px;width:${w * s}px;height:${h * s}px" aria-label="${esc(R.name)}: ${esc(R.what)}"><span class="bad">${isNight() ? "" : bad}</span><span class="lab">${esc(R.name)}</span></button>`;
  }).join("");
  $("homeMunin").innerHTML = muninHomeHTML();
  $("homeRunes").innerHTML = runesLine();
}
function fitHouse() {
  const wide = innerWidth > 900, avail = wide ? Math.min(520, innerWidth * 0.46) : Math.min(innerWidth - 32, 520);
  S.scale = Math.max(2, Math.min(4, Math.floor(avail / HW)));
  const s = S.scale, h = $("house");
  if (h) { h.style.width = HW * s + "px"; h.style.height = HH * s + "px"; const c = $("hcv"); c.style.width = HW * s + "px"; c.style.height = HH * s + "px"; }
  const rb = $("roadBox"), rc = $("rcv"); if (rb) { rb.style.width = RW * s + "px"; rb.style.height = RH * s + "px"; rc.style.width = RW * s + "px"; rc.style.height = RH * s + "px"; }
}
let lastW = innerWidth;   // phones fire "resize" while scrolling (the address bar), so only react when the width really changes
addEventListener("resize", () => { if (innerWidth === lastW) return; lastW = innerWidth; if ($("house") || $("roadBox")) { fitHouse(); render(); } if ($("scene")) fitScene(); });

// The home column: built once, then its parts are refreshed in place (so typing in the box is never interrupted).
function homeColumn() {
  const hr = new Date().getHours(), late = hr >= 20 || hr < 4;
  if (isNight()) return `<div id="homeMunin"></div><div id="todayBox"></div><div id="homeRunes" hidden></div><textarea id="homeIn" hidden></textarea><button id="homeSave" hidden></button>`;
  return `<div id="homeMunin"></div>
    <div class="card"><div id="todayBox">${todayHTML()}</div></div>
    <div class="card capture"><label class="lbl" for="homeIn">${img("quill")} What's on your mind?</label>
      <textarea id="homeIn" rows="2" placeholder="Anything at all: a to-do, a worry, an idea, a link. Munin will sort it."></textarea>
      <div class="caprow"><div id="homeRunes" class="sub"></div><button class="main" id="homeSave">Write it down</button></div></div>
    ${late ? `<button class="close-btn" data-ritual><canvas id="moonBtn" width="12" height="12"></canvas>Close up the cottage for the night</button>` : ""}`;
}
function muninHomeHTML() {
  const hr = new Date().getHours(), say = muninLine();
  const hello = isNight() ? "Good night" : hr < 5 ? "Still up" : hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  return `<div class="munin"><canvas id="muninHome" width="16" height="16" data-munin title="Munin"></canvas><div class="bubble" data-say="${esc(say.act || "")}"><span class="hi">${hello}, Sophia</span>${esc(say.text)}${say.go ? `<span class="go">${esc(say.go)} ›</span>` : isNight() ? `<span class="go">Open the cottage back up ›</span>` : ""}</div></div>`;
}
// Today: only things to do (the Do bin), one to three of them.
function todayHTML() {
  const all = items(), todayList = all.filter(i => pickOf(i) === "today").sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || byPinOld(a, b));
  if (isNight()) { const sent = sentToday(), first = night().first && S.items[night().first];
    return `<div class="card"><div class="lbl">${img("log")} Sent out today <span class="c">${sent.length}</span></div>${list(sent.sort(byNew).slice(0, 8), "A resting day. That counts too.", { where: true })}</div>
      ${first ? `<div class="card"><div class="lbl">${img("moon")} Tomorrow starts with</div>${list([first], "", { where: true })}</div>` : ""}`; }
  const left = todayList.filter(i => !i.done).length;
  return `<div class="lbl">${img("todo")} Today <span class="c">${todayList.length ? (left ? left + " to go" : "all sent out ✦") : ""}</span><button class="ghost r" data-plan>${todayList.length ? "Change" : "Plan"}</button></div>
    ${todayList.length ? list(todayList, "", { where: true, noweek: true, notoday: true }) : `<div class="empty" style="padding:2px 6px 8px">Nothing picked yet. One to three small things is plenty.</div><div class="pickbar"><button class="main" data-plan>Pick today's things</button></div>`}`;
}
function runesLine() {
  const n = items().filter(isRune).length;
  return n ? `<a data-go="#book">${img("rune")} ${n} ${n === 1 ? "rune waits" : "runes wait"} for you to sort ›</a>` : `Munin sorts it into the right room.`;
}
function homeInscribe() {
  const t = $("homeIn").value.trim(); if (!t) { $("homeIn").focus(); return; }
  const ids = inscribe(t, false, "home"); $("homeIn").value = ""; $("homeIn").blur();
  pickBins(ids);
  toast(ids.length === 1 ? "Written in the Book of Shadows" : `${ids.length} runes written in the book`, "Sort now", () => go("#book"));
  render();
}

// ============================================================ the road: three trails out of the cottage, with their waystones
function stonesHTML(s) {
  const rd = road();
  return Object.keys(TRAILS).map(k => {
    const st = rd[k] || [], labPos = TRAIL_END[k];
    return st.map((w, n) => { const [sx, sy] = stonePos(k, n, st.length); return `<button class="stone" data-stone="${k}:${n}" title="${esc(TRAILS[k].name + ": " + w.title + (w.done ? " (reached)" : ""))}" aria-label="${esc(TRAILS[k].name + " waystone: " + w.title)}" style="left:${(sx - 4) * s}px;top:${(sy - 9) * s}px;width:${9 * s}px;height:${11 * s}px"></button>`; }).join("")
      + `<span class="lab px" style="position:absolute;left:${Math.max(0, Math.min(RW - 30, labPos[0] - (k === "school" ? 26 : k === "games" ? 12 : 0))) * s}px;top:${(labPos[1] + (k === "games" ? -6 : 2)) * s}px;font-size:16px;color:${TRAILS[k].col};background:rgba(12,6,24,.7);padding:1px 4px 2px;border-radius:4px;pointer-events:none">${esc(TRAILS[k].name)}</span>`;
  }).join("");
}
function vRoad() {
  if (fresh("road", `<div>${crumbs([["The road"]])}<div class="ptitle"><h2>The road</h2><span class="sub">Three trails out of the cottage. Each finished thing lights a lantern; waystones are the milestones.</span></div>
      <div class="road" id="roadBox"><canvas id="rcv" width="${RW}" height="${RH}"></canvas><div id="stones"></div></div><div id="roadAhead" style="margin-top:14px"></div></div>`)) fitHouse();
  $("stones").innerHTML = stonesHTML(S.scale || 2);
  $("roadAhead").innerHTML = roadAhead(sentToday());
}
// The road ahead: for each trail, the next waystone and the next real step toward it.
function roadAhead(sent) {
  const rd = road();
  const rows = Object.entries(TRAILS).map(([k, T]) => {
    const st = rd[k] || [], next = st.find(w => !w.done), doneN = st.filter(w => w.done).length;
    const pips = st.map(w => `<i class="${w.done ? "on" : w === next ? "nx" : ""}" style="${w.done ? "background:" + T.col : ""}"></i>`).join("");
    // which project is walking toward that waystone, and what's its next step?
    const cand = projects().filter(p => trailOf(p) === k).map(p => ({ p, s: nextStep(p), aims: next && threadOf(p).steps.some(x => x.kind === "stone" && x.w.id === next.id) }))
      .filter(x => x.s && x.s.kind !== "stone").sort((a, b) => (b.aims ? 1 : 0) - (a.aims ? 1 : 0) || (pickRank(a.s) - pickRank(b.s)) || (a.p.order ?? 99) - (b.p.order ?? 99));
    const c = cand[0];
    return `<div class="trow"><div class="th"><span class="tn" style="color:${T.col}">${esc(T.name)}</span><span class="pips">${pips}</span><span class="sub">${doneN}/${st.length}</span></div>
      <div class="tw">${next ? `<span class="sub">Next waystone:</span> ${esc(next.title)}` : "Every waystone reached"}</div>
      ${c ? `<button class="tstep" data-go="${esc(hashFor.p(c.p.id))}"><img src="${objURL(c.p)}" alt=""><span><b>${esc(c.s.label)}</b><span class="sub">${esc(c.p.name)}</span></span><span class="chev">›</span></button>` : ""}</div>`;
  }).join("");
  return `<div class="card sending"><div class="lbl">${img("log")} The road ahead <span class="c">${sent.length ? `✦ ${sent.length} ${sent.length === 1 ? "lantern" : "lanterns"} today` : ""}</span><button class="ghost r" data-road>Edit</button></div>${rows}</div>`;
}
const pickRank = s => s && s.it ? ({ today: 0, week: 1 }[s.it.pick] ?? 2) : 3;

// ============================================================ items, in tidy sections
function itemHTML(it, o = {}) {
  const lead = it.kind === "todo" ? `<button class="chk ${it.done ? "on" : ""}" data-toggle="${esc(it.id)}" aria-label="${it.done ? "Mark not done" : "Mark done"}"></button>` : img(it.kind);
  const right = it.kind === "log" && it.date ? it.date.slice(5).replace("-", "/") : it.kind === "decision" ? fmtDate(it.created) : "";
  const open = S.open.has(it.id), pk = pickOf(it);
  const tags = (pk === "today" && !o.notoday ? `<span class="tag tday">today</span>` : pk === "week" && !o.noweek ? `<span class="tag twk">this week</span>` : "") + (isNew(it) ? `<span class="tag new">new</span>` : "");
  if (it.kind === "doc") return `<div class="it" data-it="${esc(it.id)}"><div class="ih" data-go="${esc(hashFor.doc(it.id))}">${lead}<div class="t">${esc(it.title)}${tags}${o.where ? `<span class="where">${esc(whereText(it))}</span>` : ""}</div><span class="m">page</span></div></div>`;
  return `<div class="it ${it.done && it.kind === "todo" ? "done" : ""} ${open ? "open" : ""}" data-it="${esc(it.id)}">
    <div class="ih" data-exp="${esc(it.id)}">${lead}<div class="t">${it.pinned ? '<span class="pin">&#9733;</span> ' : ""}${esc(it.title)}${tags}${o.where ? `<span class="where">${esc(whereText(it))}</span>` : ""}</div>${right ? `<span class="m">${esc(right)}</span>` : ""}</div>
    <div class="ib">${it.body ? `<div class="body">${md(it.body)}</div>` : ""}
      ${it.kind === "question" ? (it.answer ? `<div class="body"><b>Your answer:</b> ${esc(it.answer)}</div>` : `<form class="answer" data-answer="${esc(it.id)}"><input type="text" placeholder="Your answer..."><button type="submit">Answer</button></form>`) : ""}
      <div class="ibm">${it.created ? "Added " + fmtDate(it.created) + (it.by === "Claude" ? ", written by Claude in a chat" : it.by ? " by " + esc(it.by) : "") : ""} &middot; ${esc(whereText(it))}</div>
      <div class="acts">${it.link ? `<a class="play" href="${esc(safeUrl(it.link))}" target="_blank" rel="noopener">Open link</a>` : ""}
        ${it.kind === "todo" && !it.done ? `<button data-pick="${esc(it.id)}:today">${pk === "today" ? "Not today" : "Do today"}</button><button data-pick="${esc(it.id)}:week">${pk === "week" ? "Not this week" : "This week"}</button>` : ""}
        ${it.kind === "question" && !it.done ? `<button data-toggle="${esc(it.id)}">Settled</button>` : ""}
        ${it.kind === "todo" && !it.done ? `<button data-workon="${esc(it.id)}">Work on this</button>` : ""}<button data-edit="${esc(it.id)}">Edit or move</button><button data-pin="${esc(it.id)}">${it.pinned ? "Unpin" : "Pin"}</button><button data-tie="i:${esc(it.id)}">Tie to...</button><button class="ember" data-hex="items:${esc(it.id)}">Hex into firewood</button></div>
    </div></div>`;
}
// Drawers: closed boxes you open one at a time, so a place never shows everything at once.
function drawers(key, boxes) {
  boxes = boxes.filter(b => b.n || b.always);
  const open = S.drawer[key] || "";
  return `<div class="drawers">${boxes.map(b => `<button class="drawer ${open === b.id ? "on" : ""}" data-drawer="${esc(key)}:${b.id}">${img(b.icon)}<span>${esc(b.name)}</span><span class="c">${b.n || ""}</span><span class="chev">${open === b.id ? "▴" : "▾"}</span></button>`).join("")}</div>
    ${boxes.filter(b => b.id === open).map(b => `<div class="card drawerbody">${b.html()}</div>`).join("")}`;
}
function list(arr, empty, o) { return arr.length ? arr.map(i => itemHTML(i, o)).join("") : (empty ? `<div class="empty">${empty}</div>` : ""); }
// All of a place's items, in the same order everywhere: what's next, what needs a decision, what's decided, what's known, what might be, what happened.
function sections(its, ctx) {
  const todo = its.filter(i => i.kind === "todo" && !i.done).sort(byPinOld), done = its.filter(i => i.kind === "todo" && i.done).sort((a, b) => doneAt(b) - doneAt(a));
  const q = its.filter(i => i.kind === "question" && !i.done).sort(byOld), dec = its.filter(i => i.kind === "decision" || (i.kind === "question" && i.done)).sort(byNew);
  const notes = its.filter(i => i.kind === "note" || i.kind === "link").sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || byNew(a, b));
  const ideas = its.filter(i => i.kind === "idea").sort(byNew), hist = its.filter(i => i.kind === "log").sort(byLogDate);
  const card = (k, title, arr, extra = "", always) => (arr.length || always) ? `<div class="card"><div class="lbl">${img(k)} ${title} <span class="c">${arr.length || ""}</span></div>${list(arr, always ? "Nothing yet." : "")}${extra}</div>` : "";
  const showDone = S.open.has("done:" + ctx);
  const left = card("todo", "Next up", todo, `<form class="addline" data-add="${esc(ctx)}"><input type="text" placeholder="Add a step..."><button type="submit">Add</button></form>`
      + (done.length ? `<button class="more" data-showdone="${esc(ctx)}">${showDone ? "Hide" : "Show"} ${done.length} done</button>${showDone ? list(done.slice(0, 40), "") : ""}` : ""), true)
    + card("question", "Waiting on you", q) + card("decision", "Decided", dec);
  const right = card("note", "Notes and links", notes) + card("idea", "Ideas", ideas) + card("log", "History", hist);
  if (!right) return `<div class="cols" style="grid-template-columns:minmax(0,1fr)"><div class="col" style="max-width:760px">${left}</div></div>`;
  return `<div class="cols"><div class="col">${left}</div><div class="col">${right}</div></div>`;
}
function pagesHTML(docs, ctx) {
  const add = `<button class="ghost" data-newdoc="${esc(ctx)}">+ New page</button>`;
  return `<h3 class="sec">${img("doc")} Pages <span class="r">${add}</span></h3>${docs.length ? `<div class="pages">${docs.map(pageCard).join("")}</div>` : `<div class="empty">Plans, roadmaps, briefs and long notes live here, and keep every old version. Nothing here yet.</div>`}`;
}
function pageCard(d) { return `<div class="pagecard" data-go="${esc(hashFor.doc(d.id))}"><div class="n">${d.pinned ? '<span class="pin">&#9733;</span> ' : ""}${esc(d.title)}${isNew(d) ? `<span class="tag new">new</span>` : ""}</div><div class="s">${esc(snip(d.body, 160))}</div><div class="w">${childPages(d).length ? `<b class="inn">${childPages(d).length} ${childPages(d).length === 1 ? "page" : "pages"} inside</b> · ` : ""}${(d.history || []).length ? (d.history.length + 1) + " versions · " : ""}updated ${fmtDate(d.updated || d.created)}</div></div>`; }
const byPage = (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || byNew(a, b);
// Pages inside a page (chapters) read in order: an explicit order number first, then the order they were written.
const byChapter = (a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || (a.created || 0) - (b.created || 0);

// ============================================================ a room
function vRoom(area) {
  if (area === "book") return vBook();
  const R = ROOMS[area], c = counts(area);
  const ps = projects().filter(p => (p.area || "games") === area);
  const roomItems = items().filter(i => roomOf(i) === area && !projOf(i));
  const docs = roomItems.filter(i => i.kind === "doc" && topPage(i)).sort(byPage), loose = roomItems.filter(i => i.kind !== "doc");
  const scene = area === "life" ? `<div class="fireplace big" id="hearthFire"><canvas id="scene" class="scene" data-room="life"></canvas><div class="logs" id="hearthLogs"></div></div>` : `<canvas id="scene" class="scene" data-room="${area}"></canvas>`;
  const html = `<div>${crumbs([[R.name]])}
    ${scene}
    <div class="ptitle"><h2>${esc(R.name)}</h2><span class="sub">${esc(R.what)}${c.todo ? " &middot; " + c.todo + " to do" : ""}${c.week ? " &middot; " + c.week + " finished this week" : ""}</span></div>
    <div id="roomBody"></div></div>`;
  if (fresh("room:" + area, html)) fitScene();
  const wood = area === "life" ? woodpile() : [];
  const basket = basketOf(area), shelf = [...ps, basket];
  $("roomBody").innerHTML = `<div class="shelfh"><h3 class="sec">On the shelf</h3><span class="sub">Pick something up to see its whole thread.</span></div><div class="objs">${shelf.map(objTile).join("")}<button class="obj add" data-newproj="${area}"><span class="plus">+</span><span class="n">New project</span></button></div>
    ${docs.length ? pagesHTML(docs, "room:" + area) : ""}
    ${area === "life" ? woodpileHTML(wood) : ""}`;
  if (area === "life") { $("hearthLogs").innerHTML = logsHTML(wood); wireFireplace("hearthFire"); }
}
// The usual drawers for a set of items. Pass pagesCtx to include a Pages drawer.
function itemDrawers(its, ctx, pagesCtx, docs = []) {
  const todo = its.filter(i => i.kind === "todo" && !i.done).sort(byPinOld), done = its.filter(i => i.kind === "todo" && i.done).sort((a, b) => doneAt(b) - doneAt(a));
  const q = its.filter(i => i.kind === "question" && !i.done).sort(byOld);
  const know = its.filter(i => ["note", "link", "decision"].includes(i.kind) || (i.kind === "question" && i.done)).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || byNew(a, b));
  const ideas = its.filter(i => i.kind === "idea").sort(byNew), hist = [...its.filter(i => i.kind === "log"), ...done].sort((a, b) => (doneAt(b) || Date.parse(b.date || 0) || b.created) - (doneAt(a) || Date.parse(a.date || 0) || a.created));
  const boxes = [
    { id: "steps", name: "Steps", icon: "todo", n: todo.length, always: true, html: () => list(todo, "No open steps.") + `<form class="addline" data-add="${esc(ctx)}"><input type="text" placeholder="Add a step..."><button type="submit">Add</button></form>` },
    { id: "q", name: "Waiting on you", icon: "question", n: q.length, html: () => list(q, "") },
    { id: "know", name: "Notes and decisions", icon: "note", n: know.length, html: () => list(know, "") },
  ];
  if (pagesCtx !== null && pagesCtx !== undefined) boxes.push({ id: "pages", name: "Pages", icon: "doc", n: docs.length, always: true, html: () => (docs.length ? `<div class="pages">${docs.map(pageCard).join("")}</div>` : `<div class="empty">Plans, roadmaps and long notes become pages, and keep every old version.</div>`) + `<div class="btns" style="margin-top:8px"><button data-newdoc="${esc(pagesCtx)}">+ New page</button></div>` });
  boxes.push({ id: "ideas", name: "Someday", icon: "idea", n: ideas.length, html: () => list(ideas, "") });
  boxes.push({ id: "hist", name: "History", icon: "log", n: hist.length, html: () => list(hist.slice(0, 50), "") });
  return boxes;
}
function woodpileHTML(wood) {
  return `<h3 class="sec">${img("wood")} The woodpile</h3>
    <div class="card"><div class="sub">${wood.length ? "Each log is something you hexed into firewood. They're stacked by the hearth up top: drag one into the fire to burn it for good, or pull it back off the pile here." : "No logs on the pile. Hex anything you're done with, and it lands by the hearth as a log."}</div>
    ${wood.length ? `<div style="margin-top:10px">${wood.map(({ col, o }) => `<div class="res" style="cursor:default"><img src="${col === "projects" ? objURL(o) : icon(o.kind || "note")}" alt=""><div style="flex:1;min-width:0"><div class="t">${esc(o.title || o.name)}</div><div class="w">${col === "projects" ? "Project" : KINDS[o.kind] || "Note"} · hexed ${fmtDate(o.wood)}</div></div><button data-unhex="${col}:${esc(o.id)}">Pull it off the pile</button><button class="ember" data-burnone="${col}:${esc(o.id)}" aria-label="Burn ${esc(o.title || o.name)}">Burn</button></div>`).join("")}</div>` : ""}
    ${wood.length > 1 ? `<div class="btns" style="margin-top:10px;justify-content:flex-end"><button class="ember" data-burn>Burn the whole pile</button></div>` : ""}</div>`;
}
function objTile(p) {
  const its = itemsOf(p), t = its.filter(openTodo).length, q = its.filter(openQ).length, n = its.filter(isNew).length;
  const ns = nextStep(p), nextTxt = ns && ns.kind !== "stone" ? ns.label : (p.next || (ns ? "Toward: " + ns.label : p.status || ""));
  return `<div class="obj ${p.virtual ? "basket" : ""}" data-proj="${esc(p.id)}" title="Pick up ${esc(p.name)}"><img class="sprite" src="${objURL(p)}" alt=""><span class="n">${esc(p.name)}</span>
    <span class="nx">${esc(snip(nextTxt, 70))}</span><span class="f">${t ? `<span class="chipn">${t} to do</span>` : ""}${q ? `<span class="chipn q">? ${q}</span>` : ""}${n ? `<span class="chipn new">${n} new</span>` : ""}</span></div>`;
}
function fitScene() {
  const c = $("scene"); if (!c) return; const R = ROOMS[c.dataset.room], [, , w, h] = R.r;
  const s = Math.max(2, Math.min(6, Math.floor(Math.min(($("reader") || $("view")).clientWidth || 360, 720) / w)));
  c.width = w * s; c.height = h * s; c.style.width = w * s + "px"; c.style.height = h * s + "px"; c.dataset.s = s;
  const f = c.parentElement; if (f.classList.contains("fireplace")) { f.style.width = c.style.width; f.style.height = c.style.height; }
}

// ============================================================ a project, picked up and held in your hands
function vProject(id) {
  const p = projectById(id), area = p.area || "games", R = ROOMS[area] || ROOMS.games, ctx = p.virtual ? "room:" + area : "p:" + id;
  const its = itemsOf(p), docs = its.filter(i => i.kind === "doc" && topPage(i)).sort(byPage), rest = its.filter(i => i.kind !== "doc");
  const tr = trailOf(p), th = threadOf(p), ns = nextStep(p), ties = tiesOf(p), qs = rest.filter(openQ);
  $("view").innerHTML = `<div class="${S.built === "p:" + id ? "" : "fade"}">${crumbs([[R.name, hashFor.room(area)], [p.name]])}
    <div class="held">
      <div class="hhead"><img class="sprite big" src="${objURL(p)}" alt="${esc(OBJ_NAMES[objFor(p)] || "")}">
        <div class="ht"><div class="ptitle"><h2>${esc(p.name)}</h2>${p.version ? `<span class="ver">${esc(p.version)}</span>` : ""}${tr && TRAILS[tr] ? `<span class="trailtag" style="color:${TRAILS[tr].col}">${esc(TRAILS[tr].name)} trail</span>` : ""}</div>
          <div class="sub">${esc(p.status || "")}${p.status ? " · " : ""}held from the ${esc(R.name)}</div></div>
        <div class="hb">${p.link ? `<a class="play" href="${esc(safeUrl(p.link))}" target="_blank" rel="noopener">${esc(p.linkLabel || "Open")}</a>` : ""}<button class="main" data-settable="${esc(id)}">Set it on the rune table</button><button data-go="${esc(hashFor.room(area))}">Put it down</button></div></div>
      ${nextBox(p, ns)}
      <div class="hsec"><div class="hl"><span>The thread</span><span class="sub">${th.custom ? "" : "worked out from its steps"}</span><span class="spacer"></span>${p.virtual ? "" : `<button class="ghost" data-thread="${esc(id)}">Edit the thread</button>`}</div>${threadHTML(p, th)}</div>
      ${p.virtual ? "" : ties.length ? `<div class="hsec"><div class="hl"><span>Tied to this</span><span class="spacer"></span><button class="ghost" data-tie="p:${esc(id)}">+ Tie something</button></div><div class="ties">${ties.map(tieChip(id)).join("")}</div></div>` : `<div class="hsec"><div class="hl"><span>Tied to this</span><span class="sub">nothing yet</span><span class="spacer"></span><button class="ghost" data-tie="p:${esc(id)}">+ Tie something</button></div></div>`}
      ${qs.length ? `<div class="hsec"><div class="hl"><span>Waiting on you</span></div>${list(qs, "")}</div>` : ""}
      ${p.notes ? `<details class="about"><summary>About ${esc(p.name)}</summary><div class="body">${md(p.notes)}</div></details>` : ""}
      ${drawers("p:" + id, itemDrawers(rest.filter(i => !openQ(i)), ctx, ctx, docs))}
      <div class="btns" style="margin-top:4px"><button class="ghost" data-addto="${esc(id)}">+ Write a rune here</button><span class="spacer"></span>${p.virtual ? "" : `<button class="ghost" data-editproj="${esc(id)}">Edit project</button>`}</div>
    </div></div>`;
  S.built = "p:" + id;
}
function nextBox(p, ns) {
  if (!ns) return `<div class="nextbox empty"><div><div class="sub">The one next step</div><div>${p.next ? esc(p.next) : "Nothing planned. Add a step, or edit the thread."}</div></div></div>`;
  if (ns.kind === "stone") return p.next ? `<div class="nextbox"><span class="flag" style="background:${TRAILS[ns.trail].col}"></span><div style="flex:1"><div class="sub">The one next step · heading for "${esc(ns.label)}"</div><div>${esc(p.next)}</div></div><button class="pickbtn" data-addstep="${esc(p.id)}">Make it a step</button></div>`
    : `<div class="nextbox stone"><span class="flag" style="background:${TRAILS[ns.trail].col}"></span><div><div class="sub">Next waystone on the ${esc(TRAILS[ns.trail].name)} trail</div><div>${esc(ns.label)}</div></div></div>`;
  if (ns.kind === "text") { const i = (p.thread || []).indexOf(ns.ref); return `<div class="nextbox"><button class="chk" data-tstep="${esc(p.id)}:${i}" aria-label="Mark done"></button><div style="flex:1"><div class="sub">The one next step</div><div>${esc(ns.label)}</div></div></div>`; }
  const it = ns.it, other = ns.proj && ns.proj.id !== p.id ? ns.proj : null, pk = pickOf(it);
  return `<div class="nextbox"><button class="chk" data-toggle="${esc(it.id)}" aria-label="Mark done"></button><div style="flex:1;min-width:0"><div class="sub">The one next step${other ? ` · in ${esc(other.name)}` : ""}</div><div class="nt" data-reveal="${esc(it.id)}">${esc(it.title)}</div></div>
    <button class="pickbtn ${pk === "today" ? "on" : ""}" data-pick="${esc(it.id)}:today">${pk === "today" ? "Today ✓" : "Do today"}</button></div>`;
}
function threadHTML(p, th) {
  const steps = th.steps; if (!steps.length) return `<div class="empty">No steps yet. Add a step below, or let Munin weave a thread.</div>`;
  const firstOpen = steps.findIndex(s => !s.done);
  const doneBefore = steps.slice(0, Math.max(0, firstOpen)).filter(s => s.done);
  const hidden = S.open.has("thread:" + p.id) ? 0 : Math.max(0, doneBefore.length - 2);
  const parts = [];
  if (hidden) parts.push(`<button class="step done more" data-toggleopen="thread:${esc(p.id)}">✓ ${hidden} earlier</button>`);
  steps.forEach((s, n) => {
    if (n < hidden) return;
    const cls = s.done ? "done" : n === firstOpen ? "next" : "";
    let inner = esc(snip(s.label, 60)), extra = "", attr = "";
    if (s.kind === "item") { if (s.proj && s.proj.id !== p.id) extra = `<span class="via">${esc(s.proj.name)}</span>`; attr = `data-reveal="${esc(s.it.id)}"`; }
    else if (s.kind === "stone") { attr = `data-road`; inner = `<span class="flag" style="background:${TRAILS[s.trail].col}"></span>${inner}`; }
    else if (s.kind === "project") attr = `data-go="${esc(hashFor.p(s.p.id))}"`;
    else attr = `data-tstep="${esc(p.id)}:${(p.thread || []).indexOf(s.ref)}"`;
    parts.push(`<button class="step ${cls} k-${s.kind}" ${attr}>${s.done ? "✓ " : ""}${inner}${extra}</button>`);
  });
  return `<div class="thread">${parts.join('<span class="arrow">›</span>')}</div>`;
}
const tieChip = pid => r => {
  const go = r.kind === "project" ? `data-go="${esc(hashFor.p(r.p.id))}"` : r.kind === "item" ? `data-reveal="${esc(r.it.id)}"` : `data-road`;
  const ic = r.kind === "project" ? `<img src="${objURL(r.p)}" alt="">` : r.kind === "item" ? `<img src="${icon(r.it.kind)}" alt="">` : "";
  const where = r.kind === "item" && r.proj ? ` <span class="via">${esc(r.proj.name)}</span>` : "";
  return `<span class="tiechip"><button ${go}>${ic}${esc(snip(r.label, 54))}${where}</button><button class="x" data-untie="p:${esc(pid)}|${esc(r.ref)}" aria-label="Untie">×</button></span>`;
};

// ============================================================ a page (plan, roadmap, brief, long notes)
function vDoc(id) {
  const d = S.items[id], p = projOf(d), area = roomOf(d), R = ROOMS[area];
  const parts = [[R.name, hashFor.room(area)]]; if (p) parts.push([p.name, hashFor.p(p.id)]); for (const up of parentsOf(d)) parts.push([up.title, hashFor.doc(up.id)]); parts.push([d.title]);
  const kids = childPages(d).sort(byChapter);
  const v = S.docVersion && S.docVersion.id === id ? S.docVersion.n : -1, shown = v >= 0 && d.history && d.history[v] ? d.history[v] : null;
  $("view").innerHTML = `<div class="${S.built === "doc:" + id ? "" : "fade"}">${crumbs(parts)}
    <div class="grim"><div class="gh"><h2>${esc(shown ? shown.title : d.title)}</h2>${isNew(d) ? `<span class="tag new">new from Munin</span>` : ""}</div>
      ${shown ? `<div class="banner">You're reading an older version from ${fmtDate(shown.at)}. <button class="ghost" data-docver="-1">Back to the current page</button> <button data-restorever="${v}">Bring this version back</button></div>` : ""}
      <div class="doc">${mdDoc(shown ? shown.body : d.body)}</div>
      ${kids.length || !shown ? `<div class="inside"><h3 class="sec">${img("doc")} ${kids.length ? "Inside this page" : "Pages inside"}</h3>${kids.length ? `<div class="pages">${kids.map(pageCard).join("")}</div>` : `<div class="sub">A page can hold pages: chapters of a project, then the pieces of each chapter.</div>`}<div class="btns" style="margin-top:8px"><button data-newdoc="parent:${esc(id)}">+ New page inside this one</button></div></div>` : ""}
      <div class="ibm" style="margin-top:18px">${d.created ? "Written " + fmtDate(d.created) + (d.by === "Claude" ? " by Claude in a chat" : "") : ""}${d.updated ? " · updated " + fmtDate(d.updated) : ""}${d.link ? ` · <a href="${esc(safeUrl(d.link))}" target="_blank" rel="noopener" style="color:var(--lilac)">source</a>` : ""}</div>
      <div class="btns" style="margin-top:8px"><button class="main" data-editdoc="${esc(id)}">Edit page</button><button data-edit="${esc(id)}">Move or rename</button><button data-pin="${esc(id)}">${d.pinned ? "Unpin" : "Pin"}</button>${(d.history || []).length ? `<button data-dochist="${esc(id)}">${d.history.length} older ${d.history.length === 1 ? "version" : "versions"}</button>` : ""}<span class="spacer"></span><button class="ember" data-hex="items:${esc(id)}">Hex into firewood</button></div></div></div>`;
  S.built = "doc:" + id;
  if (isNew(d)) setTimeout(() => { const x = S.items[id]; if (x && isNew(x)) saveItem(x, { seen: true }); }, 1500);
}

// ============================================================ the library: every page in the cottage
function vLibrary() {
  const docs = items().filter(i => i.kind === "doc" && !isRune(i));
  const pinned = docs.filter(d => d.pinned).sort(byNew);
  const html = [];
  if (pinned.length) html.push(`<h3 class="sec">${img("doc")} The grimoire</h3><div class="sub" style="margin:-4px 0 8px">Pinned pages: the big picture, the rules you've set, the plans everything else follows.</div><div class="pages">${pinned.map(pageCard).join("")}</div>`);
  for (const area of AREA_ORDER) {
    const ds = docs.filter(d => roomOf(d) === area && !d.pinned).sort(byNew); if (!ds.length) continue;
    html.push(`<h3 class="sec">${esc(ROOMS[area].name)} <span class="sub" style="font-family:system-ui;font-size:14px">${esc(ROOMS[area].what)}</span></h3><div class="pages">${ds.map(pageCard).join("")}</div>`);
  }
  $("view").innerHTML = `<div class="${S.built === "library" ? "" : "fade"}">${crumbs([["The library"]])}<div class="ptitle"><h2>The library</h2><span class="sub">Every page in the cottage: ${docs.length} ${docs.length === 1 ? "page" : "pages"}.</span></div>
    <div class="btns" style="margin:10px 0"><button data-newdoc="room:life">+ New page</button></div>
    ${html.join("") || `<div class="card"><div class="lbl">No pages yet</div><div class="sub">Plans, roadmaps and long notes become pages. Munin can bring them in from your chats, too.</div></div>`}</div>`;
  S.built = "library";
}

// ============================================================ the Book of Shadows: runes waiting to be sorted
function vBook() {
  const runes = items().filter(isRune).sort(byOld);
  const html = `<div>${crumbs([["Book of Shadows"]])}
    <canvas id="scene" class="scene" data-room="book"></canvas>
    <div class="ptitle" style="margin-bottom:12px"><h2>Book of Shadows</h2><span class="sub">The one way in. Write anything; then give each rune a bin with one tap.</span></div>
    <div class="bos"><div class="leaf l"><h3>Write a rune</h3>
        <textarea id="runeIn" placeholder="A to-do, an idea, a worry, a link, a whole plan. One rune per line, or a longer one with a blank line between..."></textarea>
        <div class="btns"><span class="spacer"></span><button class="main" id="runeSave">Inscribe</button></div>
        <div class="sub">Each line becomes its own rune; a block with a blank line before it stays together. Ctrl + Enter inscribes.</div>
        <div id="bookTips" class="sub" style="margin-top:auto"></div></div>
      <div class="leaf r" id="runeLeaf"></div></div></div>`;
  if (fresh("book", html)) {
    fitScene();
    $("runeSave").onclick = () => { const ids = inscribe($("runeIn").value); if (ids.length) { $("runeIn").value = ""; $("runeIn").blur(); S.built = "book"; renderRunes(); pickBins(ids); } };
    $("runeIn").onkeydown = e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) $("runeSave").click(); };
  }
  $("bookTips").innerHTML = MUNIN_AI ? (PREF.get("autofile", false) ? "Munin picks a bin for each rune as you write it, and files the ones he's sure about. The rest wait here for one tap." : "Munin picks a bin for each rune as you write it. Nothing moves until you tap one.") : S.mode === "local" ? "In this local copy Munin can't read runes, so each one starts with a best guess. Tap the right bin." : "";
  renderRunes(runes);
}
function renderRunes(runes = items().filter(isRune).sort(byOld)) {
  const leaf = $("runeLeaf"); if (!leaf) return;
  const picked = runes.filter(r => r.suggest && binOf(r) !== "letgo"), unread = runes.filter(r => !r.suggest);
  leaf.innerHTML = `<h3>Waiting runes <span class="sub" style="font-family:system-ui;font-size:14px">${runes.length || ""}</span></h3>
    ${runes.length ? `<div class="sub">Tap a bin to file each rune. The lit one is the best fit so far${MUNIN_AI ? ": Munin's pick once he's read it" : ""}.</div>` : ""}
    <div class="btns">${unread.length && MUNIN_AI ? `<button class="main" id="sortAll">Munin, pick bins</button>` : ""}${picked.length > 1 ? `<button id="sendAll">File ${picked.length === runes.length ? "them all" : picked.length} as Munin picked</button>` : ""}</div>
    <div>${runes.length ? runes.map(runeHTML).join("") : `<div class="empty" style="padding:20px 4px">No runes waiting. Every thought has a home.</div>`}</div>`;
  if ($("sortAll")) $("sortAll").onclick = sortBook;
  if ($("sendAll")) $("sendAll").onclick = () => { const list = items().filter(i => isRune(i) && i.suggest && binOf(i) !== "letgo"); list.forEach((l, n) => setTimeout(() => fileRune(S.items[l.id], binOf(l), l.suggest.area, l.suggest.project, n === list.length - 1 ? undefined : false), n * 140)); };
}
function runeHTML(l) {
  const sg = l.suggest, bin = binOf(l), area0 = sg ? sg.area : guessArea(l.title + " " + (l.body || "")), area = ROOMS[area0] && area0 !== "book" ? area0 : "life";
  const proj = sg && sg.project && live(S.projects[sg.project]) ? S.projects[sg.project] : null, where = bin === "letgo" ? "the woodpile" : ROOMS[area].name + (proj ? " › " + proj.name : "");
  const who = sg ? (l.by === "Claude" ? brainBadge("claude") : brainBadge("hearth")) + " picked" : "Best guess:";
  return `<div class="rune" data-rune="${esc(l.id)}"><div class="rhead">${img(bin === "do" ? "todo" : bin === "scry" ? "question" : (sg ? sg.kind : l.kind) || "note")}<div style="flex:1;min-width:0"><div class="t">${esc(l.title)}</div>${l.body ? `<div class="body sub">${esc(snip(l.body, 220))}</div>` : ""}
    ${l.by === "Claude" ? `<div class="from">${brainBadge("claude")} wrote this in a chat; Munin carried it home</div>` : ""}</div></div>
    <div class="bins" role="group" aria-label="File this rune">${Object.entries(BINS).map(([k, B]) => `<button class="bin b-${k} ${k === bin ? "on" : ""}" data-bin="${esc(l.id)}:${k}"${k === bin ? ' aria-describedby="pick-' + esc(l.id) + '"' : ""}><b>${B.name}</b><span>${B.hint}</span></button>`).join("")}</div>
    <div class="dest" id="pick-${esc(l.id)}"><span>${who} <b>${BINS[bin].name}</b>${bin === "letgo" ? "" : `, in <b>${esc(where)}</b>`}</span><button class="linkbtn" data-destedit="${esc(l.id)}">change room</button><button class="linkbtn" data-edit="${esc(l.id)}">edit</button></div>
    <div class="file" hidden><select data-fr aria-label="Room">${roomSelect(area)}</select><select data-fp aria-label="Project">${projSelect(area, proj ? proj.id : "")}</select></div></div>`;
}
const aOrAn = w => (/^[aeiou]/i.test(w) ? "an " : "a ") + esc(w);
function roomSelect(val, withBook) { return Object.entries(ROOMS).filter(([k]) => withBook || k !== "book").map(([k, R]) => `<option value="${k}" ${k === val ? "selected" : ""}>${esc(R.name)} (${esc(R.what.split(",")[0])})</option>`).join(""); }
function projSelect(area, val) { return `<option value="">No project</option>` + projects().filter(p => (p.area || "games") === area).map(p => `<option value="${esc(p.id)}" ${p.id === val ? "selected" : ""}>${esc(p.name)}</option>`).join(""); }

// ============================================================ markdown: short notes and full pages
function inline(s) {
  return s.replace(/`([^`]+)`/g, (m, c) => "\u0000" + btoa(unescape(encodeURIComponent(c))) + "\u0000")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:!?]|$)/g, "$1<i>$2</i>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[^"'>=])(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
    .replace(/\u0000([A-Za-z0-9+/=]*)\u0000/g, (m, b) => "<code>" + decodeURIComponent(escape(atob(b))) + "</code>");
}
function md(s) {   // short notes: paragraphs, bullets, bold, links
  const out = []; let ul = false;
  for (const raw of esc(s).split("\n")) {
    const line = inline(raw);
    const m = line.match(/^\s*[-*] (.*)/) || line.match(/^\s*\d+\. (.*)/);
    if (m) { if (!ul) { out.push("<ul>"); ul = true; } out.push("<li>" + m[1] + "</li>"); continue; }
    if (ul) { out.push("</ul>"); ul = false; }
    if (line.trim()) out.push("<p>" + line.replace(/^#+\s*/, "") + "</p>");
  }
  if (ul) out.push("</ul>");
  return out.join("");
}
function mdDoc(src) {   // full pages: headings, lists, tables, quotes, code, checkboxes
  const L = esc(src || "").split("\n"), out = []; let i = 0;
  const isTable = n => /^\s*\|.*\|\s*$/.test(L[n] || "") && /^\s*\|[\s:|-]+\|\s*$/.test(L[n + 1] || "");
  while (i < L.length) {
    const line = L[i];
    if (/^\s*```/.test(line)) { const buf = []; i++; while (i < L.length && !/^\s*```/.test(L[i])) buf.push(L[i++]); i++; out.push("<pre><code>" + buf.join("\n") + "</code></pre>"); continue; }
    let m = line.match(/^(#{1,4})\s+(.*)/); if (m) { out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); i++; continue; }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { out.push("<hr>"); i++; continue; }
    if (isTable(i)) {
      const cells = r => r.trim().replace(/^\||\|$/g, "").split("|").map(c => inline(c.trim()));
      const head = cells(L[i]); i += 2; const rows = [];
      while (i < L.length && /^\s*\|.*\|\s*$/.test(L[i])) rows.push(cells(L[i++]));
      out.push(`<div class="tw"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`); continue;
    }
    if (/^\s*&gt;\s?/.test(line)) { const buf = []; while (i < L.length && /^\s*&gt;\s?/.test(L[i])) buf.push(inline(L[i++].replace(/^\s*&gt;\s?/, ""))); out.push("<blockquote>" + buf.join("<br>") + "</blockquote>"); continue; }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line), tag = ordered ? "ol" : "ul", buf = [];
      while (i < L.length && /^\s*([-*]|\d+\.)\s+/.test(L[i])) {
        let t = L[i].replace(/^\s*([-*]|\d+\.)\s+/, ""), ind = (L[i].match(/^\s*/)[0].length >= 2) ? ' style="margin-left:18px"' : "";
        t = t.replace(/^\[( |x|X)\]\s*/, (m0, c) => `<span class="cb ${c.trim() ? "on" : ""}"></span>`);
        buf.push(`<li${ind}>${inline(t)}</li>`); i++;
      }
      out.push(`<${tag}>${buf.join("")}</${tag}>`); continue;
    }
    if (!line.trim()) { i++; continue; }
    const buf = [line]; i++;
    while (i < L.length && L[i].trim() && !/^(#{1,4}\s|\s*```|\s*([-*]|\d+\.)\s+|\s*&gt;|\s*\|)/.test(L[i])) buf.push(L[i++]);
    out.push("<p>" + buf.map(inline).join("<br>") + "</p>");
  }
  return out.join("");
}

// ============================================================ the walk, grain 0 (22 Nov 2026): read and write only
// The house with its room names; a room is a plain list of books; a book is a plain list of pages; a page is its text
// and its notes. One quill in the corner writes anything into the Book of Shadows; a page has "Write a note"; the
// rest of the actions live in one "…" menu. Everything else is hidden for now (data kept), and comes back one grain
// at a time. On a wide screen the reader sits beside the house; on a phone it slides up over it.
// (The older screens above — vHome, vRoom, vProject, vDoc, vLibrary, vRoad, vBook — are parked, not deleted.)
const wideScreen = () => innerWidth >= 900;
function placeLive(r) {
  if (r.v === "room") return !!ROOMS[r.id];
  if (r.v === "p") return !!projectById(r.id);
  if (r.v === "doc") return live(S.items[r.id]) && S.items[r.id].kind === "doc";
  return r.v === "home" || r.v === "book";
}
function walkShell() {
  if ($("walk")) return;
  $("view").innerHTML = `<div class="walk" id="walk">
    <section class="cot" id="cot" aria-label="The cottage"><div class="house" id="house"><canvas id="hcv" width="${HW}" height="${HH}"></canvas><div id="hots"></div></div></section>
    <section class="reader" id="reader" aria-label="The open book"></section></div>
    <button class="quillfab" data-quill="" aria-label="Write anything"><img src="${icon("quill")}" alt=""><span>Write</span></button>`;
  S.built = null; fitHouse();
}
function areaOfRoute(r) { return r.v === "room" ? r.id : r.v === "book" ? "book" : r.v === "p" ? (projectById(r.id) || {}).area : r.v === "doc" ? roomOf(S.items[r.id]) : ""; }
function drawCottage(r) {
  const s = S.scale || 2, here = areaOfRoute(r);
  $("hots").innerHTML = Object.entries(ROOMS).map(([k, R]) => { const [x, y, w, h] = R.r;
    return `<button class="hot${k === here ? " on" : ""}" data-room="${k}" style="left:${x * s}px;top:${y * s}px;width:${w * s}px;height:${h * s}px" aria-label="${esc(R.name)}"><span class="lab">${esc(R.name)}</span></button>`; }).join("");
}
function drawReader(rr) {
  const el = $("reader");
  if (rr.v === "home") { if (S.built !== "rhome") { el.innerHTML = `<div class="rhint fade"><div class="px">Pick a room</div></div>`; S.built = "rhome"; } return; }
  if (rr.v === "room") return rr.id === "book" ? rShadows() : rRoom(rr.id);
  if (rr.v === "book") return rShadows();
  if (rr.v === "p") return rBook(rr.id);
  if (rr.v === "doc") return rPage(rr.id);
}
function readerPaint(key, html) {
  const el = $("reader"), first = S.built !== key;
  el.innerHTML = `<div class="${first ? "fade" : ""}">${html}</div>`;
  if (first) { if (!wideScreen()) el.scrollTop = 0; else window.scrollTo({ top: 0 }); }
  S.built = key;
}
const rowGo = (go, label, sub) => `<button class="row0" data-go="${esc(go)}"><span class="rt">${esc(label)}${sub ? `<span class="rs">${esc(sub)}</span>` : ""}</span><span class="chev" aria-hidden="true">›</span></button>`;
const moreBtn = (what, id) => `<button class="morebtn" data-more="${what}:${esc(id)}" aria-label="More">…</button>`;

// ---- a room: a plain list of its books
function rRoom(area) {
  const R = ROOMS[area];
  const ps = projects().filter(p => (p.area || "games") === area).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  const loose = items().filter(i => i.kind === "doc" && roomOf(i) === area && !projOf(i) && topPage(i)).sort(byPage);
  const basket = basketOf(area), inBasket = itemsOf(basket).filter(i => i.kind !== "doc").length;
  const rows = [...ps.map(p => rowGo(hashFor.p(p.id), p.name)), ...loose.map(d => rowGo(hashFor.doc(d.id), d.title)), ...(inBasket ? [rowGo(hashFor.p(basket.id), basket.name)] : [])];
  readerPaint("room:" + area, `${crumbs([[R.name]])}<h2 class="px rtitle0">${esc(R.name)}</h2><div class="list0">${rows.join("") || `<div class="empty">Nothing on these shelves yet.</div>`}</div>`);
}
// ---- a book: a plain list of its pages
function rBook(id) {
  const p = projectById(id), area = p.area || "games", R = ROOMS[area] || ROOMS.games;
  const pages = itemsOf(p).filter(i => i.kind === "doc" && topPage(i)).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || byChapter(a, b));
  const loose = p.virtual ? itemsOf(p).filter(i => i.kind !== "doc").sort(byNew) : [];
  readerPaint("p:" + id, `${crumbs([[R.name, hashFor.room(area)], [p.name]])}<div class="titlerow"><h2 class="px rtitle0">${esc(p.name)}</h2>${p.virtual ? "" : moreBtn("p", id)}</div>
    <div class="list0">${pages.map(d => rowGo(hashFor.doc(d.id), d.title)).join("")}${loose.map(i => `<button class="row0" data-edit="${esc(i.id)}"><span class="rt">${esc(i.title)}</span></button>`).join("")}${pages.length || loose.length ? "" : `<div class="empty">No pages in this book yet.</div>`}</div>`);
}
// ---- a page: its text, the pages inside it, and your notes
function rPage(id) {
  const d = S.items[id], p = projOf(d), area = roomOf(d), R = ROOMS[area];
  const parts = [[R.name, hashFor.room(area)]]; if (p) parts.push([p.name, hashFor.p(p.id)]); for (const up of parentsOf(d)) parts.push([up.title, hashFor.doc(up.id)]); parts.push([d.title]);
  const kids = childPages(d).sort(byChapter), notes = notesOn(d);
  const v = S.docVersion && S.docVersion.id === id ? S.docVersion.n : -1, shown = v >= 0 && d.history && d.history[v] ? d.history[v] : null;
  readerPaint("doc:" + id, `${crumbs(parts)}
    <div class="titlerow"><h2 class="px rtitle0">${esc(shown ? shown.title : d.title)}</h2>${moreBtn("doc", id)}</div>
    ${shown ? `<div class="banner">You're reading an older version from ${fmtDate(shown.at)}. <button class="ghost" data-docver="-1">Back to the current page</button> <button data-restorever="${v}">Bring this version back</button></div>` : ""}
    <div class="doc">${mdDoc(shown ? shown.body : d.body)}</div>
    ${kids.length ? `<div class="list0 kids">${kids.map(k => rowGo(hashFor.doc(k.id), k.title)).join("")}</div>` : ""}
    ${notes.length ? `<div class="notes0">${notes.map(n => `<div class="note0" data-it="${esc(n.id)}">${md(n.title + (n.body ? "\n" + n.body : ""))}<button class="nsm" data-edit="${esc(n.id)}">${n.by === "Claude" ? "Claude" : "You"} · ${fmtDate(n.created)}</button></div>`).join("")}</div>` : ""}
    <button class="writenote" data-quill="${esc(id)}">Write a note</button>`);
  markRead(d);
  if (isNew(d)) setTimeout(() => { const x = S.items[id]; if (x && isNew(x)) saveMark(x, { seen: true }); }, 1500);
}
// ---- the Book of Shadows: everything you wrote that isn't sorted yet, newest first
function rShadows() {
  const runes = items().filter(isRune).sort(byNew);
  readerPaint("shadows", `${crumbs([["Book of Shadows"]])}<h2 class="px rtitle0">Book of Shadows</h2>
    <div class="list0">${runes.map(i => `<button class="row0" data-edit="${esc(i.id)}"><span class="rt">${esc(snip(i.title, 120))}<span class="rs">${fmtDate(i.created)}</span></span></button>`).join("") || `<div class="empty">Nothing waiting. Everything you write with the quill lands here until it's sorted.</div>`}</div>`);
}
// ---- the quill: write anything (into the Book of Shadows), or a note on the page you're reading
function openQuill(pageId) {
  const d = pageId ? S.items[pageId] : null;
  openSheet("quill", `<h3>${d ? "A note on this page" : "Write anything"}</h3>
    <textarea id="qText" rows="6" placeholder="${d ? "Your note..." : "A thought, a to-do, an idea, a worry. It goes into the Book of Shadows."}"></textarea>
    <div class="qrow"><button class="ghost" data-closesheet>Cancel</button><button class="main" data-quillsave="${d ? esc(pageId) : ""}">${d ? "Add the note" : "Write it down"}</button></div>`);
  setTimeout(() => $("qText") && $("qText").focus(), 60);
}
function saveQuill(pageId) {
  const t = ($("qText") || {}).value || ""; if (!t.trim()) { $("qText").focus(); return; }
  if (pageId && S.items[pageId]) { addNote(S.items[pageId], t); closeSheet(); sfx("rune"); toast("Noted on the page"); return; }
  const ids = inscribe(t, false, "quill"); closeSheet(); pickBins(ids, false); sfx("rune");
  toast(ids.length === 1 ? "Written in the Book of Shadows" : `${ids.length} runes written in the Book of Shadows`); render();
}
// ---- the "…" menu: everything else you can do to a book or page, kept out of sight
function openMore(what, id) {
  if (what === "doc") { const d = S.items[id]; if (!d) return;
    openSheet("more", `<h3>${esc(snip(d.title, 60))}</h3><div class="menu0">
      <button data-moreact data-editdoc="${esc(id)}">Edit this page</button>
      ${(d.history || []).length ? `<button data-moreact data-dochist="${esc(id)}">Older versions</button>` : ""}
      <button data-moreact data-newdoc="parent:${esc(id)}">New page inside this one</button>
      <button data-moreact data-edit="${esc(id)}">Move it</button>
      <button data-moreact class="ember" data-hex="items:${esc(id)}">Hex it into firewood</button></div>`); }
  else { const p = projectById(id); if (!p) return;
    openSheet("more", `<h3>${esc(p.name)}</h3><div class="menu0">
      <button data-moreact data-newdoc="p:${esc(id)}">New page in this book</button>
      <button data-moreact data-editproj="${esc(id)}">Edit this book</button></div>`); }
}
