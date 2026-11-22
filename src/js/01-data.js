// ============================================================ 01 · data: the rooms, what's saved, and how it syncs
// Everything lives in two collections, "items" and "projects", plus a few "meta" documents.
// Two ways to run:
//   server mode  opened from Sophia's own Cottage server: synced through its API, the same on every device,
//                and readable by Claude in any chat through the Cottage connector. This is the real Cottage.
//   local mode   opened as a file (for testing): kept in this browser only (localStorage).
// (The old claude.ai artifact mode was retired in phase 1 of the blueprint, 21 Nov 2026.)

const ROOMS = {
  stargazer: { name: "Observatory", what: "Stargazer", r: [8, 38, 71, 38] },
  coven:     { name: "Coven Chamber", what: "Coven", r: [81, 38, 71, 38] },
  games:     { name: "Workshop", what: "Hedgewitch Games", r: [8, 78, 144, 42] },
  school:    { name: "Study", what: "School", r: [8, 122, 71, 40] },
  jobs:      { name: "Writing Desk", what: "Jobs and money", r: [81, 122, 71, 40] },
  life:      { name: "Hearth", what: "Life, the big picture, and the woodpile", r: [8, 164, 71, 42] },
  book:      { name: "Book of Shadows", what: "Runes waiting for Munin to sort", r: [81, 164, 71, 42] },
};
const AREA_ORDER = ["games", "coven", "stargazer", "school", "jobs", "life"];
const KINDS = { todo: "To-do", question: "Question", note: "Note", idea: "Idea", decision: "Decision", link: "Link", doc: "Page", log: "Done" };
// The three trails of The Sending, and which rooms walk them.
const TRAILS = {
  job:    { name: "Job", what: "A paycheck, never retail again", col: "#9fe6d0" },
  games:  { name: "Games", what: "Shipped games and income from them", col: "#ff7ad9" },
  school: { name: "School", what: "Back in school, on the right degree", col: "#8ac0e8" },
};
const AREA_TRAIL = { games: "games", coven: "games", stargazer: "games", jobs: "job", school: "school" };
const DEFAULT_ROAD = {
  job: [
    { id: "w-job-ready", title: "Resume, cover letter and GitHub ready", done: true },
    { id: "w-job-interview", title: "First interview", done: false },
    { id: "w-job-paycheck", title: "First paycheck that isn't retail", done: false },
    { id: "w-job-field", title: "A job in data, QA or game dev (work from home if possible)", done: false },
  ],
  games: [
    { id: "w-g-studio", title: "Studio named: Hedgewitch Games", done: true },
    { id: "w-g-itch", title: "A game on itch.io (Witchbottle)", done: true },
    { id: "w-g-site", title: "Website live", done: true },
    { id: "w-g-ads", title: "Ads on the website", done: true },
    { id: "w-g-dollar", title: "First dollar from games", done: false },
    { id: "w-g-paid", title: "First paid game", done: false },
    { id: "w-g-steam", title: "A game on Steam", done: false },
  ],
  school: [
    { id: "w-s-path", title: "Choose the path: CS or computer engineering", done: true },
    { id: "w-s-papers", title: "Reapplication paperwork done", done: false },
    { id: "w-s-enrolled", title: "Enrolled again", done: false },
    { id: "w-s-intern", title: "An internship", done: false },
  ],
};
const HW = 160, HH = 224;                                    // the house picture, in pixels before scaling
const RW = 160, RH = 84;                                     // the road picture

const S = { items: {}, projects: {}, meta: {}, ready: false, mode: "loading", note: "", open: new Set(), chat: [], hover: null, pending: false, flash: {}, drawer: {}, table: { running: false, start: 0, mins: 25, left: 0 } };
let MUNIN_AI = null, SERVER = false;   // MUNIN_AI: Munin's Hearth brain (null when there isn't one); SERVER: running on Sophia's own Cottage server
// Which brain is answering, for the badge: the Hearth brain's model name (from the server), or "" when Munin only has plain code.
const BRAIN = { model: "" };
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const newId = p => p + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const snip = (s, n = 120) => { s = String(s || "").replace(/[#*`>|]/g, "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "..." : s; };
const fmtDate = ms => ms ? new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
const safeUrl = u => /^https?:\/\//i.test(String(u || "")) ? u : "#";
const pad2 = n => String(n).padStart(2, "0");
const dayKey = (d = new Date()) => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
// A "night" runs from 5 in the morning to 5 the next morning, so closing up at 1am still counts as last night.
const nightKey = (ms = Date.now()) => dayKey(new Date(ms - 5 * 3600e3));
const startOfDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const startOfWeek = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };

// ---- what counts as what
const live = o => o && !o.wood;                                             // not hexed into firewood
const items = () => Object.values(S.items).filter(live);
const projects = () => Object.values(S.projects).filter(live).sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || String(a.name).localeCompare(b.name));
const projOf = it => { const p = it && it.project && S.projects[it.project]; return live(p) ? p : null; };
const roomOf = it => it.area === "inbox" || it.area === "book" || !ROOMS[it.area] ? "book" : it.area;   // old "Mailbox" notes now sit in the book
const isRune = it => roomOf(it) === "book";
const openTodo = i => i.kind === "todo" && !i.done && !isRune(i), openQ = i => i.kind === "question" && !i.done && !isRune(i);
const isNew = i => i.seen === false;
const doneAt = i => i.doneAt || (i.done ? i.updated : 0) || 0;
const doneToday = () => items().filter(i => i.kind === "todo" && i.done && doneAt(i) >= startOfDay());
const loggedToday = () => items().filter(i => i.kind === "log" && (i.date === dayKey() || (!i.date && (i.created || 0) >= startOfDay())));
const sentToday = () => [...doneToday(), ...loggedToday()];
const pickOf = i => (i.kind === "todo" && (!i.done || doneAt(i) >= startOfDay())) ? (i.pick || "") : "";
const road = () => { const r = S.meta.road; return r && r.job ? r : DEFAULT_ROAD; };
const night = () => S.meta.night || {};
const isNight = () => night().closed === nightKey();
function counts(area) {
  const its = items().filter(i => roomOf(i) === area);
  const wk = startOfWeek();
  return { todo: its.filter(openTodo).length, q: its.filter(openQ).length, all: its.length, fresh: its.filter(isNew).length,
    projects: projects().filter(p => (p.area || "games") === area).length, week: its.filter(i => i.kind === "todo" && i.done && doneAt(i) >= wk).length };
}
function trailOf(p) { return p.trail || AREA_TRAIL[p.area] || ""; }
function whereText(it) { const p = projOf(it); const R = ROOMS[roomOf(it)]; return p ? R.name + " › " + p.name : R.name; }

// ---- sorting
const byOld = (a, b) => (a.created || 0) - (b.created || 0);
const byNew = (a, b) => (b.updated || b.created || 0) - (a.updated || a.created || 0);
const byPinOld = (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || byOld(a, b);
const byLogDate = (a, b) => String(b.date || "").localeCompare(String(a.date || "")) || (b.created || 0) - (a.created || 0);

// ============================================================ storage
const LS = {
  get(k) { try { return JSON.parse(localStorage.getItem("brain_" + k)) || {}; } catch (e) { return {}; } },
  set(k, v) { try { localStorage.setItem("brain_" + k, JSON.stringify(v)); } catch (e) {} },
};
const PREF = {   // per-device settings (sound), never synced
  get(k, d) { try { const v = localStorage.getItem("cottage_pref_" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("cottage_pref_" + k, JSON.stringify(v)); } catch (e) {} },
};
function put(col, id, data) {
  const body = { ...data, updated: Date.now() }; delete body.id;
  for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k];
  S[col][id] = { ...body, id }; render();
  if (SERVER) return serverWrite(col, id, body);
  const all = LS.get(col); all[id] = body; LS.set(col, all); return Promise.resolve();
}
function del(col, id) {
  delete S[col][id]; render();
  if (SERVER) return serverWrite(col, id, null);
  const all = LS.get(col); delete all[id]; LS.set(col, all); return Promise.resolve();
}
function putMeta(key, data) {
  S.meta[key] = data; render();
  if (SERVER) return serverWrite("meta", key, data);
  const m = LS.get("meta"); m[key] = data; LS.set("meta", m); return Promise.resolve();
}
// Small helpers so the rest of the code reads like what it does.
const saveItem = (it, changes) => put("items", it.id, { ...it, ...changes });
function setDone(it, done) {
  const ch = { done, doneAt: done ? Date.now() : 0 };
  if (it.kind === "question" && done && !it.answer) ch.answer = it.answer || "";
  saveItem(it, ch);
  if (done) { cheer(it); }
}
// Hexing something turns it into a log for the woodpile by the Hearth: hidden everywhere else.
// Sophia burns logs by dragging them into the fire herself, or pulls one back off the pile if she changes her mind.
function hex(col, id, fromEl) { const o = S[col][id]; if (!o) return; toss(fromEl ? fromEl.getBoundingClientRect() : null); put(col, id, { ...o, wood: Date.now() }); toast("Hexed into firewood. It's on the woodpile", "Undo", () => unhex(col, id)); }
function unhex(col, id) { const o = S[col][id]; if (!o) return; const d = { ...o }; delete d.wood; put(col, id, d); }
const woodpile = () => [...Object.values(S.items).filter(i => i.wood).map(i => ({ col: "items", o: i })), ...Object.values(S.projects).filter(p => p.wood).map(p => ({ col: "projects", o: p }))].sort((a, b) => b.o.wood - a.o.wood);
async function burnOne(col, id) { await del(col, id); S.flash.fire = Date.now(); sfx("burn"); }
async function burnAll() { const w = woodpile(); for (const { col, o } of w) await del(col, o.id); S.flash.fire = Date.now(); sfx("burn"); return w.length; }
// Pages keep their old versions, so a changed plan never loses how we got here.
function savePage(it, title, body) {
  const hist = Array.isArray(it.history) ? it.history.slice() : [];
  if (it.body !== undefined && (it.body !== body || it.title !== title) && (it.body || it.title)) hist.unshift({ title: it.title || "", body: it.body || "", at: it.updated || it.created || Date.now(), by: it.by || "" });
  saveItem(it, { title, body, history: hist.slice(0, 15), by: "Sophia" });
}

// ============================================================ loading
async function init() {
  drawIcons(); route(); tick();
  if (await serverStart()) { /* running on the Cottage server */ }
  else {
    S.mode = "local"; S.items = LS.get("items"); S.projects = LS.get("projects"); S.meta = LS.get("meta"); S.ready = true;
    for (const [id, v] of Object.entries(S.items)) v.id = id; for (const [id, v] of Object.entries(S.projects)) v.id = id;
    render();
  }
}
// ============================================================ backups
function backupData() {
  const strip = o => { const d = { ...o }; delete d.id; return d; };
  return { app: "the-cottage", version: 3, exported: new Date().toISOString(), meta: S.meta, focus: S.meta.focus || null,
    projects: Object.fromEntries(Object.entries(S.projects).map(([k, v]) => [k, strip(v)])), items: Object.fromEntries(Object.entries(S.items).map(([k, v]) => [k, strip(v)])) };
}
async function backup() {
  const name = "the-cottage-backup-" + dayKey() + ".json", data = JSON.stringify(backupData(), null, 1);
  try {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type: "application/json" })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast("Backup saved");
  } catch (e) { toast("Couldn't save the backup here"); }
}
async function restore(file, status) {
  let data; try { data = JSON.parse(await file.text()); } catch (e) { status("That file isn't a Cottage backup."); return; }
  if (!data || !/^(my-brain|the-cottage)$/.test(data.app) || typeof data.items !== "object") { status("That file isn't a Cottage backup."); return; }
  const jobs = [...Object.entries(data.projects || {}).map(([k, v]) => ["projects", k, v]), ...Object.entries(data.items || {}).map(([k, v]) => ["items", k, v])];
  let n = 0;
  if (SERVER) {   // send in batches of 100: much faster than one by one
    const ok = jobs.filter(([col, id, v]) => v && typeof v === "object" && /^[\w.~:@+-]{1,180}$/.test(id));
    for (const [col, id, v] of ok) S[col][id] = { ...v, id };
    for (let i = 0; i < ok.length; i += 100) { await apiCall("POST", "/api/batch", { ops: ok.slice(i, i + 100).map(([col, id, data]) => ({ col, id, data })) }); n = Math.min(ok.length, i + 100); status(`Restoring ${n} of ${ok.length}...`); }
    const meta = data.meta || (data.focus ? { focus: data.focus } : {});
    const mops = Object.entries(meta).filter(([k, v]) => v && typeof v === "object" && /^[\w-]{1,40}$/.test(k)).map(([id, data]) => ({ col: "meta", id, data }));
    if (mops.length) await apiCall("POST", "/api/batch", { ops: mops });
    SV.rev = 0; await serverSync(); status(`Restored ${n} things.`); toast("Backup restored"); return;
  }
  for (const [col, id, v] of jobs) { if (!v || typeof v !== "object" || !/^[\w.~:@+-]{1,180}$/.test(id)) continue; await put(col, id, v); n++; status(`Restoring ${n} of ${jobs.length}...`); }
  const meta = data.meta || (data.focus ? { focus: data.focus } : {});
  for (const [k, v] of Object.entries(meta)) if (v && typeof v === "object" && /^[\w-]{1,40}$/.test(k)) await putMeta(k, v);
  status(`Restored ${n} things.`); toast("Backup restored");
}

// ---- a little message at the bottom of the screen, sometimes with a button
function toast(t, linkText, onLink) {
  const el = $("toast"); el.innerHTML = esc(t) + (linkText ? `<a id="toastLink">${esc(linkText)}</a>` : ""); el.classList.add("show");
  if (linkText) $("toastLink").onclick = () => { el.classList.remove("show"); onLink(); };
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), linkText ? 4200 : 2200);
}


// ============================================================ threads and ties
// A reference points at something in the cottage: "i:<item id>", "p:<project id>" or "w:<trail>:<waystone id>".
// A thread step is a reference, or {t: "text", d: false} for a step that isn't a to-do yet.
function resolve(ref) {
  if (ref && typeof ref === "object") return { kind: "text", ref, label: ref.t || "", done: !!ref.d };
  const s = String(ref || "");
  if (s.startsWith("i:")) { const it = S.items[s.slice(2)]; return live(it) ? { kind: "item", ref: s, it, label: it.title, done: it.kind === "log" || it.kind === "decision" || !!it.done, proj: projOf(it) } : null; }
  if (s.startsWith("p:")) { const p = S.projects[s.slice(2)]; return live(p) ? { kind: "project", ref: s, p, label: p.name, done: false } : null; }
  if (s.startsWith("w:")) { const [, k, id] = s.split(":"); const w = (road()[k] || []).find(x => x.id === id); return w ? { kind: "stone", ref: s, trail: k, w, label: w.title, done: !!w.done } : null; }
  return null;
}
const refKey = r => typeof r.ref === "string" ? r.ref : "t:" + (r.ref.t || "");
// A project's thread: the steps it walks toward a waystone. Written by hand (or by Munin), or worked out from its to-dos.
function threadOf(p) {
  if (Array.isArray(p.thread) && p.thread.length) return { steps: p.thread.map(resolve).filter(Boolean), custom: true };
  const its = itemsOf(p).filter(i => i.kind === "todo");
  const done = its.filter(i => i.done).sort((a, b) => doneAt(b) - doneAt(a)).slice(0, 1);
  const rank = i => ({ today: 0, week: 1 }[i.pick] ?? 2);
  const open = its.filter(i => !i.done).sort((a, b) => rank(a) - rank(b) || byPinOld(a, b));
  const steps = [...done, ...open].map(i => resolve("i:" + i.id));
  const tr = trailOf(p), st = (road()[tr] || []).find(w => !w.done);
  if (st) steps.push(resolve("w:" + tr + ":" + st.id));
  return { steps: steps.filter(Boolean), custom: false };
}
// The one next thing to do: the first unfinished step that isn't just a milestone.
function nextStep(p) { const st = threadOf(p).steps; return st.find(s => !s.done && s.kind !== "stone") || st.find(s => !s.done) || null; }
function tiesOf(p) {
  if (p.virtual) return [];
  const mine = new Set(itemsOf(p).map(i => "i:" + i.id)), out = new Map();
  const add = ref => { if (!ref || ref === "p:" + p.id || mine.has(ref) || out.has(ref)) return; const r = resolve(ref); if (r) out.set(ref, r); };
  (p.links || []).forEach(add);
  for (const i of items()) { const ls = i.links || []; if (i.project === p.id) ls.forEach(add); else if (ls.includes("p:" + p.id) || ls.some(l => mine.has(l))) add("i:" + i.id); }
  for (const q of projects()) if ((q.links || []).includes("p:" + p.id)) add("p:" + q.id);
  const inThread = new Set(threadOf(p).steps.map(refKey));
  return [...out.values()].filter(r => !inThread.has(r.ref));
}
function tie(fromRef, toRef) {
  if (!fromRef || !toRef || fromRef === toRef) return;
  const [k, id] = fromRef.split(/:(.+)/), col = k === "p" ? "projects" : "items", o = S[col][id]; if (!o) return;
  const links = Array.isArray(o.links) ? o.links.slice() : []; if (!links.includes(toRef)) links.push(toRef);
  put(col, id, { ...o, links });
}
function untie(fromRef, toRef) {
  const [k, id] = fromRef.split(/:(.+)/), col = k === "p" ? "projects" : "items", o = S[col][id];
  if (o && Array.isArray(o.links) && o.links.includes(toRef)) { put(col, id, { ...o, links: o.links.filter(l => l !== toRef) }); return; }
  // the tie may have been made from the other side
  const [k2, id2] = toRef.split(/:(.+)/), col2 = k2 === "p" ? "projects" : "items", o2 = S[col2][id2];
  if (o2 && Array.isArray(o2.links)) put(col2, id2, { ...o2, links: o2.links.filter(l => l !== fromRef) });
}


// ============================================================ the Cottage server: Sophia's own home for the data
// When the app is opened from its own server, it talks to the server's API:
// changes are sent right away (and queued if the connection drops), and it checks for changes from other devices every few seconds.
const SV = { rev: 0, outbox: [], timer: 0, syncing: false };
async function apiCall(method, path, body) {
  const r = await fetch(path, { method, credentials: "same-origin", headers: { "X-Cottage": "1", ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
  if (r.status === 401) { showSignIn(); throw Object.assign(new Error("signed out"), { code: "signed_out" }); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.message || data.error || "request failed"), { code: data.error || "http_" + r.status, text: data.message });
  return data;
}
async function serverStart() {
  if (!/^https?:$/.test(location.protocol)) return false;
  let r; try { r = await fetch("/api/me", { credentials: "same-origin" }); } catch (e) { r = null; }
  if (!r) { const c = LS.get("cottage_cache"); if (c && c.rev) { SERVER = true; S.mode = "server"; loadCache(c); S.note = "You're offline. Showing what was here last time; changes will sync when you're back."; S.ready = true; render(); return true; } return false; }
  const kind = r.headers.get("Content-Type") || "";
  if (r.status === 401 && kind.includes("json")) { SERVER = true; S.mode = "server"; showSignIn(); return true; }
  if (!r.ok || !kind.includes("json")) return false;
  SERVER = true; S.mode = "server";
  try { BRAIN.model = (await r.json()).model || ""; } catch (e) { }
  SV.outbox = (LS.get("cottage_outbox") || {}).ops || [];
  const c = LS.get("cottage_cache"); if (c && c.rev) { loadCache(c); S.ready = true; render(); }
  setupServerMunin();
  await serverSync(); flushOutbox();
  clearInterval(SV.timer); SV.timer = setInterval(() => { if (!document.hidden) { serverSync(); flushOutbox(); } }, 12000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { serverSync(); flushOutbox(); } });
  addEventListener("online", () => { S.note = ""; serverSync(); flushOutbox(); });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  return true;
}
function loadCache(c) { for (const col of ["items", "projects", "meta"]) { S[col] = {}; for (const [id, v] of Object.entries(c[col] || {})) S[col][id] = col === "meta" ? v : { ...v, id }; } SV.rev = c.rev || 0; }
function saveCache() { const strip = o => Object.fromEntries(Object.entries(o).map(([k, v]) => { const d = { ...v }; delete d.id; return [k, d]; })); LS.set("cottage_cache", { rev: SV.rev, items: strip(S.items), projects: strip(S.projects), meta: S.meta }); }
async function serverSync() {
  if (SV.syncing) return; SV.syncing = true;
  try {
    const { rev, docs } = await apiCall("GET", "/api/sync?since=" + (SV.rev || 0));
    if (!SV.rev) { S.items = {}; S.projects = {}; S.meta = {}; }
    const pending = new Set(SV.outbox.map(o => o.col + "/" + o.id));
    for (const d of docs) { if (pending.has(d.col + "/" + d.id)) continue;   // our own unsent change wins until it's sent
      if (d.deleted) delete S[d.col][d.id]; else S[d.col][d.id] = d.col === "meta" ? d.data : { ...d.data, id: d.id }; }
    SV.rev = rev; S.ready = true; if (S.note.startsWith("You're offline")) S.note = "";
    if (docs.length || !LS.get("cottage_cache").rev) saveCache();
    if (docs.length) render(); else if (!S.built) render();
  } catch (e) { if (e.code !== "signed_out" && !S.note) { S.note = "You're offline. Changes are kept on this device and will sync when you're back."; render(); } }
  SV.syncing = false;
}
function serverWrite(col, id, data) {
  SV.outbox = SV.outbox.filter(o => !(o.col === col && o.id === id)); SV.outbox.push({ col, id, data });
  LS.set("cottage_outbox", { ops: SV.outbox }); saveCache();
  return flushOutbox();
}
let flushing = null;
function flushOutbox() {
  if (flushing) return flushing;
  if (!SV.outbox.length) return Promise.resolve();
  flushing = (async () => {
    while (SV.outbox.length) {
      const batch = SV.outbox.slice(0, 100);
      try { const r = await apiCall("POST", "/api/batch", { ops: batch }); SV.outbox = SV.outbox.filter(o => !batch.includes(o)); LS.set("cottage_outbox", { ops: SV.outbox }); if (r.rev && r.rev === SV.rev + batch.length) SV.rev = r.rev; }
      catch (e) { if (e.code !== "signed_out") { S.note = "You're offline. Changes are kept on this device and will sync when you're back."; render(); } break; }
    }
  })().finally(() => { flushing = null; });
  return flushing;
}
// Munin's Hearth brain: a small free model on the server (Workers AI). Each answer says which model gave it.
function setupServerMunin() {
  const chat = async (msgs, opts = {}) => { const r = await apiCall("POST", "/api/ai/chat", { messages: typeof msgs === "string" ? [{ role: "user", content: msgs }] : msgs }); if (r.model) BRAIN.model = r.model; if (opts.onText) opts.onText({ text: r.text }); return { text: r.text, model: r.model || BRAIN.model }; };
  chat.json = async prompt => { const r = await apiCall("POST", "/api/ai/json", { prompt }); if (r.model) BRAIN.model = r.model; return r.result; };
  MUNIN_AI = chat;
}
function showSignIn(msg) {
  S.mode = "server"; S.ready = false; S.signin = true; document.body.classList.add("signedout");
  $("view").innerHTML = `<div class="signin fade"><canvas id="signinCv" width="16" height="16"></canvas><h2 class="px">Welcome home</h2><p class="sub">Say the passphrase and the door opens.</p>
    <form id="signinForm"><input type="password" id="signinPass" placeholder="Your cottage passphrase" autocomplete="current-password" required><button class="main" type="submit">Open the door</button></form><p class="sub" id="signinMsg">${esc(msg || "")}</p></div>`;
  $("banner").innerHTML = "";
  setTimeout(() => $("signinPass") && $("signinPass").focus(), 60);
  $("signinForm").onsubmit = async e => {
    e.preventDefault(); $("signinMsg").textContent = "Opening...";
    try { const r = await fetch("/api/login", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passphrase: $("signinPass").value }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { $("signinMsg").textContent = d.message || "That didn't work."; return; }
      S.signin = false; document.body.classList.remove("signedout"); SERVER = false; sfx("caw"); await serverStart(); route();
    } catch (err) { $("signinMsg").textContent = "Couldn't reach the cottage. Check your connection."; }
  };
}
async function signOut() { try { await apiCall("POST", "/api/logout", {}); } catch (e) { } LS.set("cottage_cache", {}); LS.set("cottage_outbox", {}); location.reload(); }
