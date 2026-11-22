// ============================================================ 04 · sheets: the panels that slide in for writing, editing, finding and planning

let sheetMode = null;
function openSheet(mode, html, wide) { sheetMode = mode; const sh = $("sheet"); sh.innerHTML = html; sh.classList.toggle("wide", !!wide); sh.classList.add("open"); $("veil").classList.add("open"); sh.scrollTop = 0; lightDoor(); }
function closeSheet() { $("sheet").classList.remove("open"); $("veil").classList.remove("open"); sheetMode = null; lightDoor(); }
$("veil").onclick = closeSheet;
function context() { const r = parseRoute(S.route); if (r.v === "p" && projectById(r.id)) { const pr = projectById(r.id); return { area: pr.area || "games", project: pr.virtual ? "" : pr.id }; }
  if (r.v === "table" && tableProject()) { const pr = tableProject(); return { area: pr.area || "games", project: pr.virtual ? "" : pr.id }; } if (r.v === "room" && ROOMS[r.id]) return { area: r.id, project: "" }; if (r.v === "doc" && S.items[r.id]) { const d = S.items[r.id]; return { area: roomOf(d), project: d.project || "" }; } return null; }

// ---- write a rune (the quill)
function openAdd(preset) {
  const ctx = preset || context(), here = ctx && ctx.area !== "book";
  const hereName = here ? (ctx.project && S.projects[ctx.project] ? S.projects[ctx.project].name : "the " + ROOMS[ctx.area].name) : "";
  openSheet("add", `<h3>${img("quill")} Write a rune</h3>
    <textarea id="aText" rows="5" placeholder="Anything: a to-do, an idea, a question, a link, a whole plan..."></textarea>
    <div class="chips" id="aDest">${here ? `<button class="chip on" data-dest="here">Put it in ${esc(hereName)}</button>` : ""}<button class="chip ${here ? "" : "on"}" data-dest="book">${MUNIN_AI && PREF.get("autofile", false) ? "Give it to Munin" : "Into the Book of Shadows"}</button></div>
    <div id="aHere" ${here ? "" : "hidden"}><div class="chips" id="aKinds">${["auto", "todo", "note", "idea", "question", "decision", "link", "doc"].map(k => `<button class="chip ${k === "auto" ? "on" : ""}" data-ak="${k}">${k === "auto" ? "Figure it out" : KINDS[k]}</button>`).join("")}</div></div>
    <div class="sub" id="aHint">${here ? "" : bookHint()}</div>
    <div class="btns"><span class="spacer"></span><span class="sub" id="aStatus"></span><button class="main" id="aSave">${here ? "Write it down" : "Inscribe"}</button></div>`);
  let kind = "auto", dest = here ? "here" : "book";
  $("aDest").onclick = e => { const b = e.target.closest("[data-dest]"); if (!b) return; dest = b.dataset.dest; [...$("aDest").children].forEach(c => c.classList.toggle("on", c === b)); $("aHere").hidden = dest !== "here"; $("aHint").textContent = dest === "book" ? bookHint() : ""; $("aSave").textContent = dest === "book" ? "Inscribe" : "Write it down"; };
  $("aKinds").onclick = e => { const b = e.target.closest("[data-ak]"); if (!b) return; kind = b.dataset.ak; [...$("aKinds").children].forEach(c => c.classList.toggle("on", c === b)); };
  $("aSave").onclick = async () => {
    const text = $("aText").value.trim(); if (!text) return;
    if (dest === "book") { const ids = inscribe(text, true, "quill"); closeSheet(); if (!autoFile(ids)) toast("Inscribed in the Book of Shadows", "Open the book", () => go("#book")); return; }
    if (dest === "auto") { $("aStatus").textContent = "Munin is reading..."; $("aSave").disabled = true; const it = inscribe(text, true)[0]; try { const [v] = await classify([text]); if (v) { closeSheet(); sendRune(S.items[it], v.area, v.project, v.kind, true); return; } } catch (e) { } closeSheet(); toast("Munin couldn't decide, so it's waiting in the book", "Open the book", () => go("#book")); return; }
    addHere(text, kind, ctx.area, ctx.project); closeSheet();
  };
  $("aText").onkeydown = e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) $("aSave").click(); };
  setTimeout(() => $("aText").focus(), 50);
}
const bookHint = () => MUNIN_AI && PREF.get("autofile", false) ? "Munin reads it right away and carries it to the right room. If he isn't sure, it waits in the Book of Shadows." : "It waits in the Book of Shadows until you, or Munin, send it to a room.";
function splitTitle(text) { const lines = text.split("\n"); let title = lines[0].replace(/^#+\s*/, "").trim(), body = lines.slice(1).join("\n").trim(); if (title.length > 140) { body = text; title = title.slice(0, 80).replace(/\s+\S*$/, "") + "..."; } return { title, body }; }
function guessKind(text) {
  const { title } = splitTitle(text), link = (text.match(/https?:\/\/\S+/) || [""])[0];
  if (text.length > 500 || /^#{1,3}\s/m.test(text)) return "doc";
  return /^(todo|to do|to-do|remember to|need to|i need to|i should)\b/i.test(text) ? "todo" : /\?\s*$/.test(title) ? "question" : link && text.replace(link, "").trim().length < 20 ? "link" : "note";
}
function addHere(text, kind, area, project) {
    if (kind === "auto") kind = guessKind(text);
  const { title, body } = splitTitle(text), link = (text.match(/https?:\/\/\S+/) || [""])[0];
  const id = newId(kind.slice(0, 1));
  put("items", id, { kind, title: title.slice(0, 200), body, area, project: project || "", link, done: false, pinned: false, created: Date.now(), by: "Sophia" });
  sfx("rune");
  toast("Written in " + (project && S.projects[project] ? S.projects[project].name : "the " + ROOMS[area].name));
  if (kind === "doc") go(hashFor.doc(id));
}
function guessArea(t) {
  if (/\bcoven\b(?! slice)|hexweaver|unmaking|necromancer|diviner/i.test(t)) return "coven";
  if (/stargazer|galax|universe sim/i.test(t)) return "stargazer";
  if (/school|oneonta|stony brook|class|degree|semester|enroll|professor|homework|exam|computer engineering/i.test(t)) return "school";
  if (/\bjob|resume|cover letter|interview|apply|application|dltracker|excel|\bsql\b|power ?bi|paycheck|retail/i.test(t)) return "jobs";
  if (/game|itch|orrery|star forge|hedge|witchbottle|constellation|potion|cloudflare|website|github|repo|playtest|shop|slice/i.test(t)) return "games";
  return "life";
}

// ---- edit or move an item
function openEdit(id) {
  const it = S.items[id]; if (!it) return; const area = roomOf(it);
  openSheet("edit", `<h3>${img(it.kind)} ${it.kind === "doc" ? "Move or rename" : "Edit"}</h3>
    <label>Title<input type="text" id="eTitle" value="${esc(it.title)}"></label>
    ${it.kind === "doc" ? "" : `<label>Details<textarea id="eBody" rows="6">${esc(it.body || "")}</textarea></label>`}
    ${it.kind === "question" ? `<label>Your answer<textarea id="eAns" rows="2">${esc(it.answer || "")}</textarea></label>` : ""}
    <div class="line"><label>Kind<select id="eKind">${Object.entries(KINDS).map(([k, n]) => `<option value="${k}" ${k === it.kind ? "selected" : ""}>${n}</option>`).join("")}</select></label>
      <label>Room<select id="eRoom">${roomSelect(area, true)}</select></label></div>
    <label>Project<select id="eProj"></select></label>
    <label>Link<input type="url" id="eLink" value="${esc(it.link || "")}" placeholder="https://..."></label>
    ${it.kind === "log" ? `<label>Date<input type="text" id="eDate" value="${esc(it.date || "")}" placeholder="${dayKey()}"></label>` : ""}
    <div class="checks">${it.kind === "todo" || it.kind === "question" ? `<label><input type="checkbox" id="eDone" ${it.done ? "checked" : ""}> Done</label>` : ""}<label><input type="checkbox" id="ePin" ${it.pinned ? "checked" : ""}> Pinned</label></div>
    <div class="sub">${it.created ? "Added " + fmtDate(it.created) + (it.by === "Claude" ? ", written by Claude in a chat" : it.by ? " by " + esc(it.by) : "") : ""}</div>
    <div class="btns"><button class="main" id="eSave">Save</button><button id="eCancel">Cancel</button><span class="spacer"></span><button class="ember" id="eHex">Hex into firewood</button></div>`);
  const fill = v => { const a = $("eRoom").value; $("eProj").innerHTML = a === "book" ? `<option value="">No project</option>` : projSelect(a, v); $("eProj").disabled = a === "book"; };
  fill(it.project); $("eRoom").onchange = () => fill("");
  $("eSave").onclick = () => {
    const ans = $("eAns") ? $("eAns").value.trim() : (it.answer || ""); let done = $("eDone") ? $("eDone").checked : !!it.done; if (it.kind === "question" && ans && !it.answer) done = true;
    const d = { ...it, title: $("eTitle").value.trim() || "(untitled)", kind: $("eKind").value, area: $("eRoom").value, project: $("eRoom").value === "book" ? "" : $("eProj").value, link: $("eLink").value.trim(), done, pinned: $("ePin").checked, answer: ans };
    if ($("eBody")) d.body = $("eBody").value.trim();
    if (done && !it.done) d.doneAt = Date.now(); if (!done) d.doneAt = 0;
    if ($("eDate")) d.date = $("eDate").value.trim(); if (d.area !== "book") delete d.suggest;
    put("items", id, d); closeSheet(); toast("Saved");
    if (done && !it.done) cheer(d);
  };
  $("eCancel").onclick = closeSheet;
  $("eHex").onclick = () => { closeSheet(); hex("items", id); if (parseRoute(S.route).v === "doc") history.back(); };
}
function openProjectEdit(id, area) {
  const p = id ? S.projects[id] : { name: "", area: area || "games", status: "", version: "", link: "", linkLabel: "", next: "", notes: "", trail: "" };
  openSheet("proj", `<h3>${id ? "Edit project" : "New project"}</h3>
    <label>Name<input type="text" id="pName" value="${esc(p.name)}"></label>
    <div class="line"><label>Room<select id="pArea">${roomSelect(p.area || "games")}</select></label><label>Version<input type="text" id="pVer" value="${esc(p.version || "")}"></label></div>
    <label>Its object in the room<select id="pObj"><option value="">Munin picks (${esc(OBJ_NAMES[objFor(p.name ? p : { id: "", name: "" })] || "book")})</option>${Object.entries(OBJ_NAMES).map(([k, n]) => `<option value="${k}" ${p.obj === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
    <label>Which trail does it walk?<select id="pTrail"><option value="">The room decides (${esc(TRAILS[AREA_TRAIL[p.area]] ? TRAILS[AREA_TRAIL[p.area]].name : "none")})</option>${Object.entries(TRAILS).map(([k, T]) => `<option value="${k}" ${p.trail === k ? "selected" : ""}>${esc(T.name)}: ${esc(T.what)}</option>`).join("")}</select></label>
    <label>Where it stands<input type="text" id="pStatus" value="${esc(p.status || "")}"></label>
    <label>Next step<textarea id="pNext" rows="2">${esc(p.next || "")}</textarea></label>
    <div class="line"><label>Link<input type="url" id="pLink" value="${esc(p.link || "")}"></label><label>Button says<input type="text" id="pLL" value="${esc(p.linkLabel || "")}" placeholder="Play, Open, Brief..."></label></div>
    <label>About it<textarea id="pNotes" rows="6">${esc(p.notes || "")}</textarea></label>
    <div class="btns"><button class="main" id="pSave">Save</button><button id="pCancel">Cancel</button><span class="spacer"></span>${id ? `<button class="ember" id="pHex">Hex into firewood</button>` : ""}</div>`);
  $("pSave").onclick = () => {
    const d = { ...p, name: $("pName").value.trim() || "Untitled", area: $("pArea").value, trail: $("pTrail").value, obj: $("pObj").value, version: $("pVer").value.trim(), status: $("pStatus").value.trim(), next: $("pNext").value.trim(), link: $("pLink").value.trim(), linkLabel: $("pLL").value.trim(), notes: $("pNotes").value.trim() };
    if (!d.created) d.created = Date.now();
    const pid = id || (d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || "project") + "-" + Date.now().toString(36).slice(-4);
    put("projects", pid, d); closeSheet(); toast("Saved"); if (!id) go(hashFor.p(pid));
  };
  $("pCancel").onclick = closeSheet;
  if (id) $("pHex").onclick = () => { closeSheet(); hex("projects", id); go(hashFor.room(p.area || "games")); };
}

// ---- pages: write and edit, with every old version kept
function openDocEdit(id, ctx) {
  const d = id ? S.items[id] : null, [ck, key] = (ctx || "room:life").split(":");
  const area = d ? roomOf(d) : ck === "p" ? (S.projects[key].area || "games") : key, project = d ? d.project : ck === "p" ? key : "";
  openSheet("doc", `<h3>${img("doc")} ${d ? "Edit page" : "New page"}</h3>
    <label>Title<input type="text" id="dTitle" value="${esc(d ? d.title : "")}" placeholder="Plan, roadmap, brief, notes..."></label>
    <label>Page <span>Headings start with #, lists with -, tables with |. ${d ? "The old version is kept." : ""}</span><textarea id="dBody" class="big" placeholder="# A heading&#10;&#10;Write the page here.">${esc(d ? d.body || "" : "")}</textarea></label>
    <div class="btns"><button class="main" id="dSave">${d ? "Save page" : "Add page"}</button><button id="dCancel">Cancel</button></div>`, true);
  $("dSave").onclick = () => {
    const title = $("dTitle").value.trim() || "Untitled page", body = $("dBody").value.replace(/\s+$/, "");
    if (d) { savePage(d, title, body); closeSheet(); toast("Page saved"); return; }
    const nid = newId("doc"); put("items", nid, { kind: "doc", title, body, area, project: project || "", link: "", done: false, pinned: false, created: Date.now(), by: "Sophia" }); closeSheet(); sfx("rune"); go(hashFor.doc(nid));
  };
  $("dCancel").onclick = closeSheet;
  setTimeout(() => $(d ? "dBody" : "dTitle").focus(), 50);
}
function openDocHistory(id) {
  const d = S.items[id]; if (!d) return; const h = d.history || [];
  openSheet("hist", `<h3>${img("doc")} Older versions</h3><div class="sub">Every time this page changes, the old version is kept here.</div>
    <div class="res sel" data-docver="-1"><img src="${icon("doc")}" alt=""><div><div class="t">${esc(d.title)}</div><div class="w">Current version · ${fmtDate(d.updated)}${d.by ? " · " + (d.by === "Claude" ? "by Claude" : esc(d.by)) : ""}</div></div></div>
    ${h.map((v, n) => `<div class="res" data-docver="${n}"><img src="${icon("doc")}" alt=""><div><div class="t">${esc(v.title)}</div><div class="w">${fmtDate(v.at)} ${new Date(v.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}${v.by ? " · " + (v.by === "Claude" ? "by Claude" : esc(v.by)) : ""} · ${esc(snip(v.body, 60))}</div></div></div>`).join("")}
    <div class="btns"><button id="hClose">Close</button></div>`);
  $("hClose").onclick = closeSheet;
}

// ---- plan today and this week
function openPlan() {
  const todos = items().filter(openTodo);
  const groups = AREA_ORDER.map(a => [a, todos.filter(i => roomOf(i) === a).sort(byPinOld)]).filter(([, l]) => l.length);
  const row = i => { const pk = i.pick || ""; return `<div class="pr" data-planrow="${esc(i.id)}"><div class="t">${esc(i.title)}${projOf(i) ? `<span class="sub"> · ${esc(projOf(i).name)}</span>` : ""}</div><span class="seg"><button class="td ${pk === "today" ? "on" : ""}" data-pick="${esc(i.id)}:today">Today</button><button class="wk ${pk === "week" ? "on" : ""}" data-pick="${esc(i.id)}:week">Week</button></span></div>`; };
  const nT = todos.filter(i => i.pick === "today").length, nW = todos.filter(i => i.pick === "week").length;
  openSheet("plan", `<h3>${img("todo")} Plan the day and week</h3>
    <div class="sub">Pick up to <b style="color:var(--gold)">3 for today</b> and <b style="color:var(--ice)">5 for this week</b>. Fewer is fine. You can add more later.</div>
    <div class="sub" id="planCount">Today: <b style="color:${nT > 3 ? "var(--pink)" : "var(--gold)"}">${nT}</b> · This week: <b style="color:${nW > 5 ? "var(--pink)" : "var(--ice)"}">${nW}</b>${nT > 3 || nW > 5 ? " · that's a lot. Is it doable?" : ""}</div>
    <div class="plan">${groups.length ? groups.map(([a, l]) => `<div class="grp"><div class="gh">${esc(ROOMS[a].name)}</div>${l.map(row).join("")}</div>`).join("") : `<div class="empty">No open to-dos anywhere. Write a rune with the quill.</div>`}</div>
    <div class="btns"><button class="main" id="planDone">Done</button></div>`);
  $("planDone").onclick = closeSheet;
}

// ---- the road: edit the trails' waystones
function openRoad() {
  const rd = JSON.parse(JSON.stringify(road()));
  const paint = () => {
    $("roadEd").innerHTML = Object.entries(TRAILS).map(([k, T]) => `<div class="card" style="margin-top:8px"><div class="lbl" style="color:${T.col}">${esc(T.name)} trail <span class="c">${esc(T.what)}</span></div>
      ${(rd[k] || []).map((w, n) => `<div class="stonerow"><input type="checkbox" data-sd="${k}:${n}" ${w.done ? "checked" : ""} aria-label="Reached"><input type="text" data-st="${k}:${n}" value="${esc(w.title)}"><button data-sup="${k}:${n}" aria-label="Move up" ${n ? "" : "disabled"}>↑</button><button class="ember" data-sx="${k}:${n}" aria-label="Remove">×</button></div>`).join("")}
      <button class="ghost" data-sadd="${k}">+ Add a waystone</button></div>`).join("");
  };
  openSheet("road", `<h3>${img("log")} The road</h3><div class="sub">Each trail is a path out of the cottage, and the waystones are the milestones along it, in order. Tick one when you reach it.</div><div id="roadEd"></div>
    <div class="btns"><button class="main" id="roadSave">Save the road</button><button id="roadCancel">Cancel</button></div>`);
  paint();
  $("roadEd").oninput = e => { const s = e.target.dataset.st; if (s) { const [k, n] = s.split(":"); rd[k][+n].title = e.target.value; } };
  $("roadEd").onchange = e => { const s = e.target.dataset.sd; if (s) { const [k, n] = s.split(":"); rd[k][+n].done = e.target.checked; if (e.target.checked) rd[k][+n].doneAt = Date.now(); } };
  $("roadEd").onclick = e => {
    const up = e.target.closest("[data-sup]"), x = e.target.closest("[data-sx]"), add = e.target.closest("[data-sadd]");
    if (up) { const [k, n] = up.dataset.sup.split(":"); const a = rd[k]; [a[+n - 1], a[+n]] = [a[+n], a[+n - 1]]; paint(); }
    if (x) { const [k, n] = x.dataset.sx.split(":"); rd[k].splice(+n, 1); paint(); }
    if (add) { const k = add.dataset.sadd; (rd[k] = rd[k] || []).push({ id: newId("w"), title: "", done: false }); paint(); const ins = $("roadEd").querySelectorAll(`[data-st^="${k}:"]`); ins[ins.length - 1].focus(); }
  };
  $("roadSave").onclick = () => { for (const k of Object.keys(TRAILS)) rd[k] = (rd[k] || []).filter(w => w.title.trim()); const before = road(); putMeta("road", { ...rd, updated: Date.now() }); closeSheet();
    const newly = Object.keys(TRAILS).flatMap(k => (rd[k] || []).filter(w => w.done && !((before[k] || []).find(b => b.id === w.id && b.done))));
    if (newly.length) { sfx("stone"); toast("Waystone reached: " + newly[0].title); } else toast("The road is saved"); };
  $("roadCancel").onclick = closeSheet;
}

// ---- find anything
function openSearch() {
  openSheet("search", `<h3>${img("search")} Find</h3><input type="search" id="sq" placeholder="Search rooms, projects, pages and notes..." autocomplete="off"><div id="sres"></div>`);
  let sel = 0;
  const run = () => {
    const q = $("sq").value.trim().toLowerCase(), w = q.split(/\s+/).filter(Boolean);
    if (!w.length) { $("sres").innerHTML = `<div class="sub" style="padding:6px">Try "hosting", "Shroom-Mother", "resume" or "computer engineering".</div>`; return; }
    const hit = s => { s = s.toLowerCase(); return w.every(x => s.includes(x)); };
    const res = [];
    for (const [k, R] of Object.entries(ROOMS)) if (hit(R.name + " " + R.what)) res.push({ t: R.name, w: R.what, k: "log", go: hashFor.room(k) });
    for (const p of projects()) if (hit([p.name, p.status, p.version, p.next, p.notes].join(" "))) res.push({ t: p.name, w: (ROOMS[p.area] || ROOMS.games).name + " · project", k: "library", go: hashFor.p(p.id) });
    for (const i of items().sort((a, b) => (a.kind === "doc" ? 0 : 1) - (b.kind === "doc" ? 0 : 1) || byNew(a, b))) if (hit([i.title, i.body, i.answer, KINDS[i.kind]].join(" "))) res.push({ t: i.title, w: KINDS[i.kind] + " · " + whereText(i), k: i.kind, item: i.id });
    sel = Math.min(sel, Math.max(0, res.length - 1));
    $("sres").innerHTML = res.length ? res.slice(0, 50).map((r, n) => `<div class="res ${n === sel ? "sel" : ""}" data-n="${n}"><img src="${icon(r.k)}" alt=""><div><div class="t">${hl(r.t, q)}</div><div class="w">${esc(r.w)}</div></div></div>`).join("") : `<div class="sub" style="padding:6px">Nothing matches. Try fewer words, or ask Munin.</div>`;
    $("sres").onclick = e => { const el = e.target.closest("[data-n]"); if (el) pick(res[+el.dataset.n]); };
    $("sq").onkeydown = e => { if (e.key === "ArrowDown") { sel = Math.min(res.length - 1, sel + 1); run(); e.preventDefault(); } else if (e.key === "ArrowUp") { sel = Math.max(0, sel - 1); run(); e.preventDefault(); } else if (e.key === "Enter" && res[sel]) pick(res[sel]); };
  };
  const pick = r => { closeSheet(); if (r.item) revealItem(r.item); else go(r.go); };
  $("sq").oninput = () => { sel = 0; run(); }; run(); setTimeout(() => $("sq").focus(), 50);
}
function hl(text, q) { const t = esc(text), w = q.split(/\s+/).filter(x => x.length > 1).map(x => esc(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")); return w.length ? t.replace(new RegExp("(" + w.join("|") + ")", "gi"), "<mark>$1</mark>") : t; }
function revealInPlace(id) {
  const it = S.items[id]; if (!it) return; closeSheet();
  const r = parseRoute(S.route);
  if (r.v === "p" && (it.project === r.id || (isBasketId(r.id) && !projOf(it) && BASKET + roomOf(it) === r.id)) && it.kind !== "doc") {
    const box = it.kind === "question" && !it.done ? "" : it.kind === "todo" ? (it.done ? "hist" : "steps") : it.kind === "idea" ? "ideas" : it.kind === "log" ? "hist" : "know";
    if (box) S.drawer["p:" + r.id] = box; S.open.add(id); S.built = null; render();
    setTimeout(() => { const el = document.querySelector(`[data-it="${CSS.escape(id)}"]`); if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); el.animate([{ background: "#3a2060" }, { background: "transparent" }], { duration: 1400 }); } }, 120);
    if (isNew(it)) setTimeout(() => { const x = S.items[id]; if (x && isNew(x)) saveItem(x, { seen: true }); }, 1200);
    return;
  }
  revealItem(id);
}
function revealItem(id) {
  const it = S.items[id]; if (!it) return;
  if (it.kind === "doc" && !isRune(it)) { go(hashFor.doc(id)); return; }
  S.open.add(id);
  const pj = projOf(it), key = "p:" + (pj ? pj.id : BASKET + roomOf(it));
  S.drawer[key] = it.kind === "question" && !it.done ? "" : it.kind === "todo" ? (it.done ? "hist" : "steps") : it.kind === "idea" ? "ideas" : it.kind === "log" ? "hist" : "know";
  go(placeOf(it));
  setTimeout(() => { const el = document.querySelector(`[data-it="${CSS.escape(id)}"], [data-rune="${CSS.escape(id)}"]`); if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); el.animate([{ background: "#3a2060" }, { background: "transparent" }], { duration: 1400 }); } }, 160);
  if (isNew(it)) setTimeout(() => { const x = S.items[id]; if (x && isNew(x)) saveItem(x, { seen: true }); }, 1200);
}

// ---- cottage keeping: backups, sound, how it works
function openMenu() {
  const snd = PREF.get("sound", false), af = PREF.get("autofile", false);
  openSheet("menu", `<h3>${img("menu")} Cottage keeping</h3>
    <div class="card"><div class="lbl">Sound</div><div class="sub">Soft chimes when you inscribe, send and finish things, a crackle when wood burns, and Salem's purr. Off unless you turn it on, and only on this device.</div>
      <div class="btns" style="margin-top:8px"><button class="${snd ? "main" : ""}" id="sndBtn">${snd ? "Sound is on" : "Sound is off"}</button></div></div>
    <div class="card"><div class="lbl">Munin files runes on his own</div><div class="sub">When you write a rune, Munin reads it right away. If he's sure where it belongs, he takes it there; if not, it waits in the Book of Shadows with his suggestion.</div>
      <div class="btns" style="margin-top:8px"><button class="${af ? "main" : ""}" id="afBtn">${af ? "On" : "Off"}</button></div></div>
    <div class="card"><div class="lbl">Back up everything</div><div class="sub">Saves every room, project, page and note into one file on your device. You can restore from it any time.</div>
      <div class="btns" style="margin-top:8px"><button class="main" id="bkSave">Download backup</button></div></div>
    <div class="card"><div class="lbl">Restore from a backup</div><div class="sub">Brings back everything in a backup file (old My Brain backups work too). Things already here stay; ones with the same id are replaced by the backup's version.</div>
      <div class="btns" style="margin-top:8px"><input type="file" id="bkFile" accept=".json,application/json"><span class="sub" id="bkStatus"></span></div></div>
    <div class="card"><div class="lbl">Open it like an app</div><div class="sub">${SERVER ? "On your phone, open this page in your browser and use \"Add to Home Screen\" (Safari: Share, then Add to Home Screen). On your computer, use the install icon in the address bar, or the browser menu's \"Install The Cottage\". It opens in its own window, and everything stays in sync." : "Open your Cottage server's address to install it as an app on your phone or computer. This local copy is only for testing."}</div></div>
    <div class="card"><div class="lbl">How it's kept</div><div class="sub">${S.mode === "server" ? "Kept on your own Cottage server (Cloudflare), behind your passphrase. The same on every device, and Claude can read and add to it through your Cottage connector." : "Saved on this device only (a local copy for testing)."} ${items().length} things in ${projects().length} projects, ${items().filter(i => i.kind === "doc").length} pages, ${woodpile().length} on the woodpile.</div></div>
    <div class="btns">${SERVER ? `<button class="ghost" id="mOut">Lock the door (sign out)</button>` : ""}<span class="spacer"></span><button id="mClose">Close</button></div>`);
  $("mClose").onclick = closeSheet; if ($("mOut")) $("mOut").onclick = signOut;
  $("sndBtn").onclick = () => { const on = !PREF.get("sound", false); PREF.set("sound", on); if (on) { audioOn(); sfx("rune"); } $("sndBtn").textContent = on ? "Sound is on" : "Sound is off"; $("sndBtn").classList.toggle("main", on); };
  $("afBtn").onclick = () => { const on = !PREF.get("autofile", false); PREF.set("autofile", on); $("afBtn").textContent = on ? "On" : "Off"; $("afBtn").classList.toggle("main", on); };
  $("bkSave").onclick = backup;
  $("bkFile").onchange = e => { const f = e.target.files[0]; if (f) restore(f, t => { if ($("bkStatus")) $("bkStatus").textContent = t; }); };
}

// ---- the thread: put a project's steps in order, from anywhere in the cottage, ending at a waystone
function openThread(pid) {
  const p = S.projects[pid]; if (!p) return;
  let refs = (Array.isArray(p.thread) && p.thread.length ? p.thread : threadOf(p).steps.map(s => s.ref)).slice();
  const label = r => { const x = resolve(r); if (!x) return null; return x.kind === "item" ? `${esc(x.label)}${x.proj && x.proj.id !== pid ? ` <span class="sub">· ${esc(x.proj.name)}</span>` : ""}${x.done ? ' <span class="sub">(done)</span>' : ""}` : x.kind === "stone" ? `<span class="flag" style="background:${TRAILS[x.trail].col}"></span>${esc(x.label)} <span class="sub">· waystone</span>` : x.kind === "project" ? `${esc(x.label)} <span class="sub">· project</span>` : `${esc(x.label)} <span class="sub">· a step to plan</span>`; };
  const todos = items().filter(i => i.kind === "todo" && !i.done).sort((a, b) => (a.project === pid ? 0 : 1) - (b.project === pid ? 0 : 1) || byPinOld(a, b));
  const stones = Object.entries(road()).filter(([k]) => TRAILS[k]).flatMap(([k, st]) => (st || []).map(w => ["w:" + k + ":" + w.id, TRAILS[k].name + ": " + w.title + (w.done ? " (reached)" : "")]));
  openSheet("thread", `<h3><img src="${objURL(p)}" alt="" style="width:36px;height:36px;image-rendering:pixelated"> The thread</h3>
    <div class="sub">The steps ${esc(p.name)} walks, in order, toward a waystone. Steps can live in other projects too, like the website's Cloudflare setup.</div>
    <div id="thRows"></div>
    <div class="card"><div class="lbl" style="font-size:18px">Add a step</div>
      <div class="addline" style="margin-top:0"><input type="text" id="thNew" placeholder="A new step for ${esc(p.name)}..."><button id="thNewBtn">Add</button></div>
      <label style="margin-top:8px">Or a step from anywhere<select id="thTodo"><option value="">Choose a to-do...</option>${todos.map(i => `<option value="i:${esc(i.id)}">${esc(snip(i.title, 70))} · ${esc(whereText(i))}</option>`).join("")}</select></label>
      <label style="margin-top:8px">Or a waystone<select id="thStone"><option value="">Choose a waystone...</option>${stones.map(([r, t]) => `<option value="${esc(r)}">${esc(t)}</option>`).join("")}</select></label></div>
    <div class="btns">${MUNIN_AI ? `<button id="thWeave">Munin, weave it</button>` : ""}<span class="sub" id="thStatus"></span><span class="spacer"></span><button class="ghost" id="thAuto">Back to automatic</button></div>
    <div class="btns"><button class="main" id="thSave">Save the thread</button><button id="thCancel">Cancel</button></div>`);
  const paint = () => { $("thRows").innerHTML = refs.length ? refs.map((r, n) => { const l = label(r); return l ? `<div class="stonerow"><span class="sub" style="width:18px">${n + 1}</span><span style="flex:1;min-width:0">${l}</span><button data-tu="${n}" ${n ? "" : "disabled"} aria-label="Move up">↑</button><button data-td="${n}" ${n < refs.length - 1 ? "" : "disabled"} aria-label="Move down">↓</button><button class="ember" data-tx="${n}" aria-label="Remove">×</button></div>` : ""; }).join("") : `<div class="empty">No steps yet.</div>`; };
  paint();
  $("thRows").onclick = e => { const u = e.target.closest("[data-tu]"), d = e.target.closest("[data-td]"), x = e.target.closest("[data-tx]");
    if (u) { const n = +u.dataset.tu; [refs[n - 1], refs[n]] = [refs[n], refs[n - 1]]; } else if (d) { const n = +d.dataset.td; [refs[n + 1], refs[n]] = [refs[n], refs[n + 1]]; } else if (x) refs.splice(+x.dataset.tx, 1); else return; paint(); };
  const addNew = () => { const t = $("thNew").value.trim(); if (!t) return; const nid = newId("t"); put("items", nid, { kind: "todo", title: t.slice(0, 200), body: "", area: p.area || "games", project: pid, link: "", done: false, pinned: false, created: Date.now(), by: "Sophia" }); const stoneAt = refs.findIndex(r => typeof r === "string" && r.startsWith("w:")); if (stoneAt >= 0) refs.splice(stoneAt, 0, "i:" + nid); else refs.push("i:" + nid); $("thNew").value = ""; paint(); };
  $("thNewBtn").onclick = addNew; $("thNew").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); addNew(); } };
  $("thTodo").onchange = e => { if (e.target.value && !refs.includes(e.target.value)) { const at = refs.findIndex(r => typeof r === "string" && r.startsWith("w:")); if (at >= 0) refs.splice(at, 0, e.target.value); else refs.push(e.target.value); paint(); } e.target.value = ""; };
  $("thStone").onchange = e => { if (e.target.value && !refs.includes(e.target.value)) { refs.push(e.target.value); paint(); } e.target.value = ""; };
  $("thAuto").onclick = () => { const d = { ...p }; delete d.thread; put("projects", pid, d); closeSheet(); toast("The thread follows its steps again"); };
  $("thSave").onclick = () => { put("projects", pid, { ...p, thread: refs }); closeSheet(); toast("Thread saved"); };
  $("thCancel").onclick = closeSheet;
  if ($("thWeave")) $("thWeave").onclick = async () => { $("thStatus").textContent = "Munin is weaving..."; $("thWeave").disabled = true;
    try { const out = await weave(p); if (out && out.length) { refs = out; paint(); $("thStatus").innerHTML = brainBadge("hearth") + " wove this thread. Save it if it looks right."; } else $("thStatus").textContent = "Munin couldn't find a thread this time."; }
    catch (e) { $("thStatus").textContent = "Munin couldn't weave it this time."; } $("thWeave").disabled = false; };
}

// ---- tie two things together: they show up on each other's cards
function openTie(fromRef) {
  const from = resolve(fromRef); if (!from) return;
  openSheet("tie", `<h3>${img("link")} Tie to...</h3><div class="sub">Tie <b>${esc(from.label)}</b> to a project or note somewhere else in the cottage. Each will show the other under "Tied to this".</div>
    <input type="search" id="tq" placeholder="Search projects and notes..." autocomplete="off"><div id="tres"></div><div class="btns"><button id="tClose">Done</button></div>`);
  const run = () => {
    const q = $("tq").value.trim().toLowerCase(), w = q.split(/\s+/).filter(Boolean), hit = s => w.every(x => s.toLowerCase().includes(x));
    const res = [...projects().filter(p => "p:" + p.id !== fromRef && (!w.length || hit(p.name + " " + p.status))).map(p => ({ ref: "p:" + p.id, t: p.name, w: "Project · " + ROOMS[p.area || "games"].name, ic: objURL(p) })),
      ...(w.length ? items().filter(i => "i:" + i.id !== fromRef && !isRune(i) && hit(i.title + " " + (i.body || ""))).sort(byNew).slice(0, 30).map(i => ({ ref: "i:" + i.id, t: i.title, w: KINDS[i.kind] + " · " + whereText(i), ic: icon(i.kind) })) : [])];
    $("tres").innerHTML = res.slice(0, 40).map((r, n) => `<div class="res" data-n="${n}"><img src="${r.ic}" alt=""><div><div class="t">${esc(r.t)}</div><div class="w">${esc(r.w)}</div></div></div>`).join("") || `<div class="sub" style="padding:6px">Nothing matches.</div>`;
    $("tres").onclick = e => { const el = e.target.closest("[data-n]"); if (!el) return; const r = res[+el.dataset.n]; tie(fromRef, r.ref); toast("Tied to " + r.t); el.style.opacity = .5; };
  };
  $("tq").oninput = run; run(); $("tClose").onclick = closeSheet; setTimeout(() => $("tq").focus(), 50);
}

// ---- Munin's satchel: what he's carrying for you (new things from chats, questions waiting)
function openSatchel(which) {
  const all = items();
  if (which === "new") { const f = all.filter(i => isNew(i) && !isRune(i)).sort(byNew);
    openSheet("satchel", `<h3>${img("feather")} New from Munin</h3><div class="sub">Written by Claude in your chats; Munin carried them home. Opening one marks it read.</div>${list(f, "All caught up.", { where: true })}<div class="btns"><button data-seenall>Mark all read</button><button id="sClose">Close</button></div>`); }
  else { const q = all.filter(openQ).sort(byOld);
    openSheet("satchel", `<h3>${img("question")} Waiting on you</h3><div class="sub">Questions only you can answer. Answered ones move to Decided.</div>${list(q, "Nothing waiting.", { where: true })}<div class="btns"><button id="sClose">Close</button></div>`); }
  $("sClose").onclick = closeSheet;
}
