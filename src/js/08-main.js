// ============================================================ 08 · events and the animation loop

document.addEventListener("click", e => {
  const t = e.target;
  if (t.closest("[data-stop]")) return;
  if (t.closest("[data-moreact]")) closeSheet();   // a "…" menu choice: close the menu, then the handlers below do the choice
  const tog = t.closest("[data-toggle]");
  if (tog) { e.stopPropagation(); const it = S.items[tog.dataset.toggle]; if (it) setDone(it, !it.done); return; }
  const pk = t.closest("[data-pick]");
  if (pk) { const [id, which] = pk.dataset.pick.split(":"), it = S.items[id]; if (it) { const now = it.pick === which ? "" : which; saveItem(it, { pick: now }); if (sheetMode === "plan") { pk.parentElement.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === pk && !!now)); const c = items().filter(openTodo), nT = c.filter(i => i.pick === "today").length, nW = c.filter(i => i.pick === "week").length; $("planCount").innerHTML = `Today: <b style="color:${nT > 3 ? "var(--pink)" : "var(--gold)"}">${nT}</b> · This week: <b style="color:${nW > 5 ? "var(--pink)" : "var(--ice)"}">${nW}</b>${nT > 3 || nW > 5 ? " · that's a lot. Is it doable?" : ""}`; } else toast(now === "today" ? "Picked for today" : now === "week" ? "Picked for this week" : "Unpicked"); } return; }
  const pin = t.closest("[data-pin]"); if (pin) { const it = S.items[pin.dataset.pin]; if (it) saveItem(it, { pinned: !it.pinned }); return; }
  const hx = t.closest("[data-hex]"); if (hx) { const [col, id] = hx.dataset.hex.split(/:(.+)/); const wasDoc = parseRoute(S.route).v === "doc"; const row = hx.closest(".it, .rune, .grim") || hx; hex(col, id, row); if (wasDoc) go(placeOf({ ...S.items[id], kind: "note" })); return; }
  const dr = t.closest("[data-drawer]"); if (dr) { const [key, id] = dr.dataset.drawer.split(/:(?=[^:]+$)/); S.drawer[key] = S.drawer[key] === id ? "" : id; render(); return; }
  const to = t.closest("[data-toggleopen]"); if (to) { const k = to.dataset.toggleopen; S.open.has(k) ? S.open.delete(k) : S.open.add(k); render(); return; }
  const stt = t.closest("[data-settable]"); if (stt) { closeSheet(); setTable(stt.dataset.settable); return; }
  if (t.closest("[data-cleartable]")) { clearTable(); toast("Lifted off the table"); go(""); return; }
  if (t.closest("[data-swaptable]")) { swapTable(); return; }
  const cdl = t.closest("[data-candle]"); if (cdl) { candle(cdl.dataset.candle); return; }
  const cdm = t.closest("[data-candlemins]"); if (cdm) { candle(null, +cdm.dataset.candlemins); return; }
  const jt = t.closest("[data-jot]"); if (jt) { jot(jt.dataset.jot); return; }
  const wo = t.closest("[data-workon]"); if (wo) { const it = S.items[wo.dataset.workon]; if (it) { if (!it.pick) saveItem(it, { pick: "today" }); setTable(projOf(it) ? projOf(it).id : BASKET + roomOf(it)); } return; }
  const b1 = t.closest("[data-burnone]"); if (b1) { const [col, id] = b1.dataset.burnone.split(/:(.+)/); burnOne(col, id).then(() => toast("It went up in sparks")); return; }
  const as = t.closest("[data-addstep]"); if (as) { const p = S.projects[as.dataset.addstep]; if (p && p.next) { put("items", newId("t"), { kind: "todo", title: p.next.slice(0, 200), body: "", area: p.area || "games", project: p.id, link: "", done: false, pinned: false, created: Date.now(), by: "Sophia" }); toast("It's a step now, at the front of the thread"); } return; }
  const th = t.closest("[data-thread]"); if (th) { openThread(th.dataset.thread); return; }
  const ti = t.closest("[data-tie]"); if (ti) { openTie(ti.dataset.tie); return; }
  const ut = t.closest("[data-untie]"); if (ut) { const [a, b] = ut.dataset.untie.split("|"); untie(a, b); toast("Untied"); return; }
  const sat = t.closest("[data-satchel]"); if (sat) { openSatchel(sat.dataset.satchel); return; }
  const ts = t.closest("[data-tstep]"); if (ts) { const [pid, n] = ts.dataset.tstep.split(/:(?=[^:]+$)/), p = S.projects[pid]; if (p && Array.isArray(p.thread) && p.thread[+n] && typeof p.thread[+n] === "object") { const th2 = p.thread.slice(); th2[+n] = { ...th2[+n], d: !th2[+n].d }; put("projects", pid, { ...p, thread: th2 }); if (th2[+n].d) cheer({ kind: "todo", project: pid, area: p.area, id: "" }); } return; }
  const rvl = t.closest("[data-reveal]"); if (rvl) { revealInPlace(rvl.dataset.reveal); return; }
  const uh = t.closest("[data-unhex]"); if (uh) { const [col, id] = uh.dataset.unhex.split(/:(.+)/); unhex(col, id); toast("Pulled back out of the woodpile"); return; }
  if (t.closest("[data-burn]")) { const b = t.closest("[data-burn]"); if (b.dataset.armed) { b.disabled = true; burnAll().then(n => toast(`The fire took ${n} ${n === 1 ? "log" : "logs"}`)); } else { b.dataset.armed = "1"; b.textContent = "Tap again to burn them for good"; } return; }
  const ed = t.closest("[data-edit]"); if (ed) { openEdit(ed.dataset.edit); return; }
  const ex = t.closest("[data-exp]"); if (ex && !t.closest("button,a,input,form")) { const id = ex.dataset.exp; S.open.has(id) ? S.open.delete(id) : S.open.add(id); ex.parentElement.classList.toggle("open"); const it = S.items[id]; if (it && isNew(it)) saveItem(it, { seen: true }); return; }
  const room = t.closest("[data-room]"); if (room && room.classList.contains("hot")) { enterRoom(room.dataset.room); return; }
  const st = t.closest("[data-stone]"); if (st) { const [k, n] = st.dataset.stone.split(":"), w = (road()[k] || [])[+n]; if (w) toast(`${TRAILS[k].name} trail: ${w.title}${w.done ? " (reached)" : ""}`, "Edit the road", openRoad); return; }
  const ref = t.closest("[data-ref]"); if (ref) { const [k, id] = ref.dataset.ref.split(/:(.+)/); closeSheet(); if (k === "p") go(hashFor.p(id)); else revealItem(id); return; }
  const say = t.closest("[data-say]"); if (say) { doSay(say.dataset.say); return; }
  if (t.closest("[data-munin]")) { openMunin(); return; }
  if (t.closest("[data-plan]")) { openPlan(); return; }
  if (t.closest("[data-road]")) { openRoad(); return; }
  if (t.closest("[data-ritual]")) { openRitual(); return; }
  if (t.closest("[data-seenall]")) { if (sheetMode === "satchel") closeSheet(); const f = items().filter(i => isNew(i) && !isRune(i)); f.forEach((i, n) => setTimeout(() => saveItem(S.items[i.id] || i, { seen: true }), n * 40)); toast("All caught up"); return; }
  const nd = t.closest("[data-newdoc]"); if (nd) { openDocEdit(null, nd.dataset.newdoc); return; }
  const edd = t.closest("[data-editdoc]"); if (edd) { openDocEdit(edd.dataset.editdoc); return; }
  const dh = t.closest("[data-dochist]"); if (dh) { openDocHistory(dh.dataset.dochist); return; }
  const dv = t.closest("[data-docver]"); if (dv) { const r = parseRoute(S.route); S.docVersion = { id: r.id, n: +dv.dataset.docver }; closeSheet(); S.built = null; render(); window.scrollTo({ top: 0 }); return; }
  const rv = t.closest("[data-restorever]"); if (rv) { const r = parseRoute(S.route), d = S.items[r.id], v = d && d.history && d.history[+rv.dataset.restorever]; if (v) { savePage(d, v.title, v.body); S.docVersion = null; toast("That version is back (the newer one is kept too)"); } return; }
  const qf = t.closest("[data-quill]"); if (qf) { openQuill(qf.dataset.quill); return; }
  const qs = t.closest("[data-quillsave]"); if (qs) { saveQuill(qs.dataset.quillsave); return; }
  const mo = t.closest("[data-more]"); if (mo) { const [w, id] = mo.dataset.more.split(/:(.+)/); openMore(w, id); return; }
  if (t.closest("[data-closesheet]")) { closeSheet(); return; }
  const und = t.closest("[data-understood]"); if (und) { const d = S.items[und.dataset.understood]; if (d) { setUnderstood(d, !d.understood); if (!d.understood) { sfx("rune"); toast("Marked as understood"); } } return; }
  const sc = t.closest("canvas.scene, canvas.roomcv"); if (sc && sc.dataset.room === "life") { const r = sc.getBoundingClientRect(), s = r.width / 71, x = (e.clientX - r.left) / s, y = (e.clientY - r.top) / s; if (x > 42 && x < 66 && y > 24) petSalem(); return; }
  const gl = t.closest("[data-go]"); if (gl) { go(gl.dataset.go); return; }
  const pr = t.closest("[data-proj]"); if (pr) { go(hashFor.p(pr.dataset.proj)); return; }
  const np = t.closest("[data-newproj]"); if (np) { openProjectEdit(null, np.dataset.newproj); return; }
  const ep = t.closest("[data-editproj]"); if (ep) { openProjectEdit(ep.dataset.editproj); return; }
  const at = t.closest("[data-addto]"); if (at) { const p = projectById(at.dataset.addto); openAdd({ area: p.area || "games", project: p.virtual ? "" : p.id }); return; }
  const sd = t.closest("[data-showdone]"); if (sd) { const k = "done:" + sd.dataset.showdone; S.open.has(k) ? S.open.delete(k) : S.open.add(k); S.built = null; render(); return; }
  const bn = t.closest("[data-bin]"); if (bn) { const [id, bin] = bn.dataset.bin.split(/:(?=[^:]+$)/), l = S.items[id], box = bn.closest(".rune"); if (l && box) fileRune(l, bin, box.querySelector("[data-fr]").value, box.querySelector("[data-fp]").value); return; }
  const de = t.closest("[data-destedit]"); if (de) { const f = de.closest(".rune").querySelector(".file"); f.hidden = !f.hidden; de.textContent = f.hidden ? "change room" : "hide"; return; }
  const sn = t.closest("[data-send]"); if (sn) { const l = S.items[sn.dataset.send], box = sn.closest(".rune"); if (l) sendRune(l, box.querySelector("[data-fr]").value, box.querySelector("[data-fp]").value, box.querySelector("[data-fk]").value); return; }
});
document.addEventListener("change", e => { const fr = e.target.closest("[data-fr]"); if (fr) { const box = fr.closest(".rune"); if (box) box.querySelector("[data-fp]").innerHTML = projSelect(fr.value, ""); } });
document.addEventListener("submit", e => {
  const add = e.target.closest("[data-add]");
  if (add) { e.preventDefault(); const inp = add.querySelector("input"), t = inp.value.trim(); if (!t) return; const ctx = add.dataset.add, [kind, key] = ctx.split(":");
    const area = kind === "p" ? (S.projects[key].area || "games") : key, project = kind === "p" ? key : "";
    inp.value = ""; inp.blur(); put("items", newId("t"), { kind: "todo", title: t, body: "", area, project, link: "", done: false, pinned: false, created: Date.now(), by: "Sophia" }); sfx("rune"); toast("Added"); return; }
  const bn2 = e.target.closest("[data-booknote]");
  if (bn2) { e.preventDefault(); const inp = bn2.querySelector("input"), t = inp.value.trim(), p = projectById(bn2.dataset.booknote); if (!t || !p) return;
    inp.value = ""; inp.blur(); EV.src = "book-note"; put("items", newId("n"), { kind: "note", title: t.slice(0, 200), body: t.length > 200 ? t : "", area: p.area || "games", project: p.virtual ? "" : p.id, link: "", done: false, pinned: false, created: Date.now(), seen: true }); EV.src = "";
    S.open.add("slips:" + p.id); sfx("rune"); toast("Tucked into the book"); return; }
  const pn = e.target.closest("[data-pagenote]");
  if (pn) { e.preventDefault(); const ta = pn.querySelector("textarea"), d = S.items[pn.dataset.pagenote]; if (!d || !ta.value.trim()) return;
    addNote(d, ta.value); ta.value = ""; ta.blur(); sfx("rune"); toast("Written in the margin"); return; }
  const an = e.target.closest("[data-answer]");
  if (an) { e.preventDefault(); const it = S.items[an.dataset.answer], v = an.querySelector("input").value.trim(); if (it && v) { an.querySelector("input").blur(); saveItem(it, { answer: v, done: true, doneAt: Date.now() }); cheer({ ...it, kind: "question" }); } return; }
});
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && e.target.id === "qText") { e.preventDefault(); const b = document.querySelector("[data-quillsave]"); if (b) saveQuill(b.dataset.quillsave); return; }
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && e.target.closest && e.target.closest("[data-pagenote] textarea")) { e.preventDefault(); e.target.form.requestSubmit(); return; }
  if (e.key === "Escape") { if ($("ritual").classList.contains("open") && RIT.step < 4) closeRitual(); else closeSheet(); return; }
  if (sheetMode || $("ritual").classList.contains("open") || /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "")) return;
  if (e.key === "/" || (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey))) { e.preventDefault(); openSearch(); }
  else if (e.key.toLowerCase() === "n" && !e.ctrlKey && !e.metaKey) { e.preventDefault(); openAdd(); }
  else if (e.key.toLowerCase() === "m" && !e.ctrlKey && !e.metaKey) { e.preventDefault(); openMunin(); }
});
document.addEventListener("pointerdown", () => { if (PREF.get("sound", false)) audioOn(); }, { passive: true });
document.addEventListener("mouseover", e => { const h = e.target.closest(".hot"); S.hover = h ? h.dataset.room : null; });
$("searchBtn").onclick = openSearch; $("menuBtn").onclick = openMenu;
// The four doors. Home is the cottage and today; Write is the Book of Shadows; Focus is the rune table; Munin opens his perch.
document.querySelector(".doors").onclick = e => { const b = e.target.closest("[data-door]"); if (!b) return; const d = b.dataset.door; closeSheet();
  if (d === "home") go(""); else if (d === "write") go("#book"); else if (d === "focus") go("#table"); else openMunin(); };
function doorOf(r) { return r.v === "book" ? "write" : r.v === "table" ? "focus" : "home"; }
function lightDoor() { const d = sheetMode === "munin" ? "munin" : doorOf(parseRoute(S.route)); document.querySelectorAll(".doors [data-door]").forEach(b => { b.classList.toggle("on", b.dataset.door === d); b.toggleAttribute("aria-current", b.dataset.door === d); }); }
// Tapping a room opens its shelf in the reader; the cottage stays where it is (no zoom: the house never leaves the screen)
function enterRoom(k) { sfx("rune"); go(hashFor.room(k)); }

// ---- the animation loop: about nine frames a second is plenty for pixel art, and kind to batteries
let lastFrame = 0;
function tick(now = 0) {
  requestAnimationFrame(tick);
  if (now - lastFrame < 110 || document.hidden) return; lastFrame = now; const t = now / 1000;
  drawLogo($("logo"), t); drawLogo($("doorHomeCv"), t); drawMuninHead($("muninFabCv"), t); if ($("signinCv")) drawLogo($("signinCv"), t);
  if ($("muninHome")) drawMuninBig($("muninHome"), t);
  if ($("muninBig")) drawMuninBig($("muninBig"), t);
  if ($("moonBtn") && !$("moonBtn").dataset.d) { drawMoon($("moonBtn")); $("moonBtn").dataset.d = 1; }
  const hc = $("hcv"), rc = $("rcv"), lo = $("loCv"), scenes = [...document.querySelectorAll("canvas.scene, canvas.roomcv")];
  S.hideLogs = !!document.querySelector(".fireplace");   // the fireplace shows the logs as things you can drag
  if (hc || scenes.length || lo) {
    drawHouse(t, lo ? { lightsOut: Math.min(1, (now - (S.loStart || now)) / 4500) } : { night: isNight() });
    if (hc) hc.getContext("2d").drawImage(off, 0, 0);
    if (lo) lo.getContext("2d").drawImage(off, 0, 0);
    for (const sc of scenes) { const R = ROOMS[sc.dataset.room]; if (!R) continue; const [x, y, w, h] = R.r, s = +sc.dataset.s || 3, g = sc.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(off, x, y, w, h, 0, 0, w * s, h * s); }
  }
  if (rc) drawRoad(t, rc);
  if ($("tableCv")) drawTable(t);
  candleTick();
}
