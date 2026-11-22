// The Claude connector: a small MCP server (Model Context Protocol, over plain HTTP + JSON-RPC).
// Claude reaches it at /mcp after Sophia approves the connection with her passphrase.
// Every tool reads or writes the same database the app uses.
import type { Env } from "./index";
import { loadAll, writeDoc, getDoc, validId, logEvent, eventsFrom, type Doc } from "./db";
import { ROOMS, TRAILS, road, threadOf, nextStep, projects, items, isRune, roomOf, resolve, live, trailOf, type World } from "./cottage";

const PROTOCOLS = ["2026-07-28", "2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const KINDS = ["todo", "question", "note", "idea", "decision", "link", "doc", "log"];
const now = () => Date.now();
const newId = (p: string) => p + "-" + now().toString(36) + Math.random().toString(36).slice(2, 6);
// Times are shown in Sophia's time zone, so "the runes I just wrote" lines up with her clock.
const TZ = "America/New_York";
const fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
function ago(ms: number) { const m = Math.round((now() - ms) / 60000); return m < 1 ? "just now" : m < 60 ? m + " min ago" : m < 48 * 60 ? Math.round(m / 60) + " h ago" : Math.round(m / 1440) + " days ago"; }
const when = (ms: number) => (ms ? `${fmt.format(new Date(ms))} (${ago(ms)})` : "unknown time");
const snip = (s: string, n = 140) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

const TOOLS = [
  { name: "cottage_overview", description: "Munin's view of Sophia's whole cottage: the road (her three trails and their waystones), what's picked for today and this week, runes waiting in the Book of Shadows, questions waiting on her, every project with its next step, and the pinned pages. Call this first in any chat about her games, jobs, school or plans.", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } },
  { name: "cottage_search", description: "Search everything in the cottage (projects, to-dos, notes, decisions, ideas, pages) for words. Returns references like i:<id> or p:<id> to pass to cottage_read.", inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } }, required: ["query"] }, annotations: { readOnlyHint: true } },
  { name: "cottage_read", description: "Read one thing in full by reference: \"p:<project id>\" (the project picked up: its next step, thread, ties, open items and pages), \"i:<item id>\" (a note, to-do or whole page, with its raw JSON), or \"meta:road\".", inputSchema: { type: "object", properties: { ref: { type: "string" } }, required: ["ref"] }, annotations: { readOnlyHint: true } },
  { name: "cottage_recent", description: "What Sophia wrote and did recently, with times in her time zone: the runes she wrote (full text), what was created or changed, and the event log (captures, sorts into bins, picks, finishes, hexes, focus sessions). Call it when she says things like \"check the runes I just wrote\" or talks about what she did today, and at the start of a working chat. Window: the last N hours (default 24), or since: \"last_chronicle\" (since the end of the last working chat) or an ISO date.", inputSchema: { type: "object", properties: { hours: { type: "number", description: "How far back to look, in hours (default 24, max 336)" }, since: { type: "string", description: "\"last_chronicle\", or an ISO date/time such as 2026-11-22T09:00" } } }, annotations: { readOnlyHint: true } },
  { name: "cottage_write_rune", description: "Drop a quick thought into the Book of Shadows for Munin to sort later. Use for unsorted ideas from the chat. Optionally say where it probably belongs.", inputSchema: { type: "object", properties: { text: { type: "string", description: "First line becomes the title" }, kind: { type: "string", enum: KINDS }, area: { type: "string", enum: Object.keys(ROOMS).filter(k => k !== "book") }, project: { type: "string" } }, required: ["text"] } },
  { name: "cottage_save_item", description: "Create or update a note, to-do, question, decision, idea, link, log entry or page (kind \"doc\": plans, roadmaps, briefs; Markdown body). Give id to update (only the fields you pass change; a page's old version is kept in its history). Only save what Sophia asked for or clearly agreed to.", inputSchema: { type: "object", properties: { id: { type: "string" }, kind: { type: "string", enum: KINDS }, title: { type: "string" }, body: { type: "string" }, area: { type: "string", enum: Object.keys(ROOMS) }, project: { type: "string", description: "project id, or empty" }, done: { type: "boolean" }, answer: { type: "string" }, pick: { type: "string", enum: ["", "today", "week"] }, pinned: { type: "boolean" }, link: { type: "string" }, date: { type: "string", description: "YYYY-MM-DD, for log items" }, parent: { type: "string", description: "pages only: the id of the page this one sits inside (a chapter), or empty for a top-level page of its project" }, links: { type: "array", items: { type: "string" }, description: "ties: p:<project id> or i:<item id>" } } } },
  { name: "cottage_save_project", description: "Create or update a project (an object on a room's shelf). Use thread to set its path toward a waystone: an ordered list of \"i:<item id>\" (to-dos anywhere), \"w:<trail>:<waystone id>\" (milestones from meta:road) or {\"t\": \"a step not planned yet\", \"d\": false}.", inputSchema: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, area: { type: "string", enum: Object.keys(ROOMS).filter(k => k !== "book") }, status: { type: "string" }, next: { type: "string" }, notes: { type: "string" }, version: { type: "string" }, link: { type: "string" }, linkLabel: { type: "string" }, trail: { type: "string", enum: ["", "job", "games", "school"] }, obj: { type: "string" }, thread: { type: "array" }, links: { type: "array", items: { type: "string" } } }, required: ["id"] } },
  { name: "cottage_hex", description: "Hex something into firewood instead of deleting it: it lands on the woodpile by the hearth, and only Sophia burns it, by dragging the log into the fire or in her closing ritual. Pass \"i:<id>\" or \"p:<id>\".", inputSchema: { type: "object", properties: { ref: { type: "string" } }, required: ["ref"] } },
  { name: "cottage_reach_waystone", description: "Mark a waystone (milestone) on one of her trails as reached, or not reached.", inputSchema: { type: "object", properties: { trail: { type: "string", enum: ["job", "games", "school"] }, id: { type: "string" }, reached: { type: "boolean" } }, required: ["trail", "id"] } },
];

function overview(W: World): string {
  const its = items(W), out: string[] = [];
  const rd = road(W);
  out.push("# The cottage, as Munin sees it\n\n## The road");
  for (const k of Object.keys(TRAILS)) { const st = rd[k] || []; out.push(`- **${TRAILS[k]} trail**: ` + st.map((w: Doc) => `${w.done ? "✓ " : ""}${w.title} [w:${k}:${w.id}]`).join(" → ")); }
  const pick = (w: string) => its.filter(i => i.kind === "todo" && !i.done && i.pick === w);
  out.push("\n## Today\n" + (pick("today").map(i => `- ${i.title} [i:${i.id}]`).join("\n") || "- nothing picked"));
  out.push("\n## This week\n" + (pick("week").map(i => `- ${i.title} [i:${i.id}]`).join("\n") || "- nothing picked"));
  const runes = its.filter(isRune);
  if (runes.length) out.push("\n## Runes waiting in the Book of Shadows (newest first)\n" + runes.sort((a, b) => (b.created || 0) - (a.created || 0)).map(i => `- ${snip(i.title)} · written ${when(i.created)} [i:${i.id}]`).join("\n"));
  const qs = its.filter(i => i.kind === "question" && !i.done && !isRune(i));
  if (qs.length) out.push("\n## Waiting on Sophia\n" + qs.map(i => `- ${snip(i.title)} [i:${i.id}]`).join("\n"));
  out.push("\n## Projects, room by room");
  for (const [area, name] of Object.entries(ROOMS)) {
    if (area === "book") continue;
    const ps = projects(W).filter(p => (p.area || "games") === area); if (!ps.length) continue;
    out.push(`### ${name}`);
    for (const p of ps) { const n = nextStep(W, p), open = its.filter(i => i.project === p.id && i.kind === "todo" && !i.done).length;
      out.push(`- **${p.name}** [p:${p.id}]${p.version ? " " + p.version : ""}${p.status ? ": " + snip(p.status, 90) + "." : ""} Next: ${n ? (n.kind === "stone" ? (p.next || "toward " + n.label) : n.label) : p.next || "nothing planned"}${open ? ` (${open} open)` : ""}`); }
  }
  const pinned = its.filter(i => i.kind === "doc" && i.pinned && !isRune(i));
  if (pinned.length) out.push("\n## Pinned pages (read these for the big picture)\n" + pinned.map(d => `- ${d.title} [i:${d.id}]`).join("\n"));
  return out.join("\n");
}
function search(W: World, q: string, limit = 20): string {
  const w = q.toLowerCase().split(/\s+/).filter(Boolean); if (!w.length) return "Give some words to search for.";
  const hit = (s: string) => { s = s.toLowerCase(); return w.every(x => s.includes(x)); };
  const res: string[] = [];
  for (const p of projects(W)) if (hit([p.name, p.status, p.next, p.notes].join(" "))) res.push(`- project **${p.name}** [p:${p.id}]`);
  for (const i of items(W)) if (hit([i.title, i.body, i.answer].join(" "))) res.push(`- ${i.kind} **${snip(i.title, 100)}** in ${ROOMS[roomOf(i)].split(" (")[0]}${i.project && W.projects[i.project] ? " › " + W.projects[i.project].name : ""} [i:${i.id}]`);
  return res.length ? res.slice(0, limit).join("\n") + (res.length > limit ? `\n…and ${res.length - limit} more` : "") : "Nothing matches.";
}
// ---- the library of layers: a page can sit inside another page (a chapter), as deep as needed
const pageOk = (W: World, id: string) => { const d = W.items[id]; return d && live(d) && d.kind === "doc" ? d : null; };
function parentsOf(W: World, d: Doc): Doc[] {   // the chain above a page, outermost first
  const out: Doc[] = [], seen = new Set([d.id]); let cur = d;
  while (cur.parent && !seen.has(cur.parent) && pageOk(W, cur.parent)) { cur = W.items[cur.parent]; seen.add(cur.id); out.unshift(cur); }
  return out;
}
function pagesTree(W: World, project: string, parent: string, depth: number): string {
  if (depth > 6) return "";
  const kids = items(W).filter(i => i.kind === "doc" && (i.project || "") === (project || "") && (pageOk(W, i.parent) ? i.parent : "") === parent && i.id !== parent)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(a.title).localeCompare(b.title));
  return kids.map(d => "  ".repeat(depth) + `- ${d.title} [i:${d.id}]` + (pagesTree(W, project, d.id, depth + 1) ? "\n" + pagesTree(W, project, d.id, depth + 1) : "")).join("\n");
}

// ---- what happened recently: runes, changes and the event log, with times
async function recent(env: Env, W: World, a: any): Promise<string> {
  let from = now() - Math.min(336, Math.max(1, Number(a.hours) || 24)) * 3600e3, label = `the last ${Math.min(336, Math.max(1, Number(a.hours) || 24))} hours`;
  if (a.since === "last_chronicle") {
    const last = Object.values(W.items).filter(i => i.kind === "log" && i.by === "Claude" && /^Chronicle/i.test(i.title || "")).sort((x, y) => (y.created || 0) - (x.created || 0))[0];
    if (last) { from = last.created; label = `since the last chronicle ("${snip(last.title, 60)}", ${when(last.created)})`; }
  } else if (a.since) { const t = Date.parse(a.since); if (!isNaN(t)) { from = t; label = "since " + when(t); } }
  const out: string[] = [`# What happened ${label}`, `Times are in Sophia's time zone (${TZ}). It's now ${fmt.format(new Date())}.`];
  const runes = Object.values(W.items).filter(i => live(i) && isRune(i) && (i.created || 0) >= from).sort((x, y) => (y.created || 0) - (x.created || 0));
  out.push("\n## Runes written (newest first)\n" + (runes.map(i => `- ${when(i.created)}${i.by === "Claude" ? " · by Claude" : ""} [i:${i.id}]\n  ${snip(i.title + (i.body ? " — " + i.body : ""), 600)}`).join("\n") || "- none"));
  const changed = Object.values(W.items).filter(i => !isRune(i) && Math.max(i.updated || 0, i.created || 0) >= from).sort((x, y) => (y.updated || y.created || 0) - (x.updated || x.created || 0)).slice(0, 40);
  out.push("\n## Created or changed\n" + (changed.map(i => `- ${when(i.updated || i.created)}: ${i.wood ? "hexed " : (i.created || 0) >= from ? "new " : ""}${i.kind}${i.done ? " (done)" : ""} \"${snip(i.title, 90)}\" in ${ROOMS[roomOf(i)].split(" (")[0]}${i.project && W.projects[i.project] ? " › " + W.projects[i.project].name : ""}${i.by === "Claude" ? " · by Claude" : ""} [i:${i.id}]`).join("\n") || "- nothing"));
  let evs: any[] = []; try { evs = await eventsFrom(env.DB, from, 400); } catch (e) { }
  if (evs.length) {
    const counts: Record<string, number> = {}; for (const e of evs) counts[e.type] = (counts[e.type] || 0) + 1;
    const name = (ref: string) => { if (!ref) return ""; const [k, id] = [ref.slice(0, 1), ref.slice(2)]; const o = k === "i" ? W.items[id] : k === "p" ? W.projects[id] : null; return o ? `"${snip(o.title || o.name, 60)}"` : ref.startsWith("w:") ? "waystone " + ref.split(":")[2] : "(burned or gone)"; };
    out.push("\n## The event log\n" + Object.entries(counts).map(([t, n]) => `${n} ${t}`).join(", ") + "\n" + evs.slice(-60).map(e => `- ${fmt.format(new Date(e.at))}: ${e.type}${e.who === "Claude" ? " (Claude)" : ""} ${name(e.ref)}${e.bin ? " → " + e.bin : ""}${e.extra && e.extra.munin && e.bin ? (e.extra.munin === e.bin ? " (Munin's pick)" : ` (Munin picked ${e.extra.munin})`) : ""}${e.extra && e.extra.pick ? " → " + e.extra.pick : ""}${e.extra && e.extra.source ? " from " + e.extra.source : ""}${e.extra && e.extra.project && e.type === "focus" ? " on " + (W.projects[e.extra.project] ? W.projects[e.extra.project].name : e.extra.project) : ""}`).join("\n"));
  } else out.push("\n## The event log\n- nothing logged in this window" + (from < 1795320000000 ? " (the log started on 22 Nov 2026)" : ""));
  return out.join("\n");
}

function readRef(W: World, ref: string): string {
  if (ref === "meta:road") return "```json\n" + JSON.stringify(road(W), null, 1) + "\n```";
  if (ref.startsWith("p:")) {
    const p = W.projects[ref.slice(2)]; if (!p) return "No such project.";
    const its = items(W).filter(i => i.project === p.id), th = threadOf(W, p), n = nextStep(W, p);
    const line = (i: Doc) => `- ${i.kind}${i.done ? " (done)" : ""}: ${snip(i.title, 120)} [i:${i.id}]`;
    const ties = (p.links || []).map((r: string) => resolve(W, r)).filter(Boolean).map((r: any) => `- ${r.label} [${r.ref}]`);
    return [`# ${p.name}${p.version ? " " + p.version : ""}${p.wood ? " (hexed into firewood, on the woodpile)" : ""}`, `Room: ${ROOMS[p.area || "games"]}. Trail: ${TRAILS[trailOf(p)] || "none"}. Status: ${p.status || "?"}`,
      `**The one next step:** ${n ? n.label : p.next || "nothing planned"}`,
      "## The thread" + (Array.isArray(p.thread) && p.thread.length ? "" : " (worked out from its to-dos)") + "\n" + (th.map(s => `- ${s.done ? "✓ " : ""}${s.label}${s.kind === "stone" ? " (waystone)" : s.proj && s.proj.id !== p.id ? ` (in ${s.proj.name})` : ""} [${typeof s.ref === "string" ? s.ref : "text"}]`).join("\n") || "- no steps"),
      ties.length ? "## Tied to this\n" + ties.join("\n") : "", p.notes ? "## About\n" + p.notes : "",
      "## Open\n" + (its.filter(i => !i.done && ["todo", "question"].includes(i.kind)).map(line).join("\n") || "- nothing open"),
      "## Notes, decisions, ideas\n" + (its.filter(i => ["note", "decision", "idea", "link"].includes(i.kind)).map(line).join("\n") || "- none"),
      "## Pages (chapters, with the pages inside them)\n" + (pagesTree(W, p.id, "", 0) || "- none"),
      "## Raw project JSON\n```json\n" + JSON.stringify(p, null, 1) + "\n```"].filter(Boolean).join("\n\n");
  }
  if (ref.startsWith("i:")) {
    const it = W.items[ref.slice(2)]; if (!it) return "No such item.";
    const body = it.kind === "doc" ? it.body || "" : "";
    const meta = { ...it }; if (it.kind === "doc") { delete meta.body; meta.history = (it.history || []).map((h: Doc) => ({ title: h.title, at: h.at, by: h.by })); }
    const trail = it.kind === "doc" ? parentsOf(W, it).map(d => " › " + d.title).join("") : "";
    const inside = it.kind === "doc" ? pagesTree(W, it.project, it.id, 0) : "";
    return `# ${it.title}\n${it.kind} in ${ROOMS[roomOf(it)]}${it.project && W.projects[it.project] ? " › " + W.projects[it.project].name : ""}${trail}${it.wood ? " (hexed into firewood, on the woodpile)" : ""}\nWritten ${when(it.created)}${it.updated && it.updated - (it.created || 0) > 60000 ? " · last changed " + when(it.updated) : ""}${it.by ? " · by " + it.by : ""}\n\n${body ? body + "\n\n" : ""}${inside ? "## Pages inside this one\n" + inside + "\n\n" : ""}## Raw JSON\n\`\`\`json\n${JSON.stringify(meta, null, 1)}\n\`\`\``;
  }
  return "Unknown reference. Use p:<id>, i:<id> or meta:road.";
}

async function callTool(env: Env, name: string, a: any): Promise<string> {
  const db = env.DB;
  if (name === "cottage_overview") return overview(await loadAll(db));
  if (name === "cottage_search") return search(await loadAll(db), String(a.query || ""), Math.min(50, Number(a.limit) || 20));
  if (name === "cottage_read") return readRef(await loadAll(db), String(a.ref || ""));
  if (name === "cottage_recent") return recent(env, await loadAll(db), a || {});
  if (name === "cottage_write_rune") {
    const text = String(a.text || "").trim(); if (!text) throw new Error("text is empty");
    const [first, ...rest] = text.split("\n"), id = newId("r");
    const d: Doc = { kind: a.kind && KINDS.includes(a.kind) ? a.kind : "note", title: first.slice(0, 200), body: rest.join("\n").trim(), area: "book", project: "", link: (text.match(/https?:\/\/\S+/) || [""])[0], done: false, pinned: false, created: now(), updated: now(), by: "Claude", seen: false };
    if (a.area) d.suggest = { kind: d.kind, area: a.area, project: a.project || "", title: d.title };
    await writeDoc(db, "items", id, d); await logEvent(db, { type: "capture", who: "Claude", ref: "i:" + id, kind: d.kind, area: "book", extra: { source: "chat" } });
    return `Inscribed in the Book of Shadows [i:${id}].`;
  }
  if (name === "cottage_save_item") {
    const id = a.id ? String(a.id) : newId(String(a.kind || "n").slice(0, 1)); if (!validId(id)) throw new Error("bad id");
    const old = (await getDoc(db, "items", id)) || null;
    if (!old && (!a.kind || !a.title)) throw new Error("a new item needs kind and title");
    const d: Doc = { ...(old || { done: false, pinned: false, link: "", body: "", created: now(), by: "Claude", project: "" }) };
    for (const k of ["kind", "title", "body", "area", "project", "done", "answer", "pick", "pinned", "link", "date", "links"]) if (a[k] !== undefined) d[k] = a[k];
    if (a.parent !== undefined) {   // a page inside a chapter: the parent must be another page, and never itself or one of its own pages
      const par = String(a.parent || "");
      if (par) { const W = await loadAll(db), pd = W.items[par]; if (!pd || pd.kind !== "doc" || par === id) throw new Error("parent must be another page");
        let up = pd, hops = 0; while (up && up.parent && hops++ < 20) { if (up.parent === id) throw new Error("that would put a page inside itself"); up = W.items[up.parent]; } }
      d.parent = par;
    }
    if (!d.area) d.area = "book";
    if (a.done === true && !(old && old.done)) d.doneAt = now();
    if (old && d.kind === "doc" && (a.body !== undefined || a.title !== undefined) && (old.body !== d.body || old.title !== d.title))
      d.history = [{ title: old.title || "", body: old.body || "", at: old.updated || old.created || now(), by: old.by || "" }, ...(old.history || [])].slice(0, 15);
    d.updated = now(); d.seen = false; if (!old) d.by = "Claude";
    await writeDoc(db, "items", id, d);
    const type = !old ? "create" : a.done === true && !old.done ? (d.kind === "question" ? "settle" : "finish") : a.done === false && old.done ? "reopen" : "edit";
    await logEvent(db, { type, who: "Claude", ref: "i:" + id, kind: d.kind, area: d.area, project: d.project || "", extra: a.pick !== undefined && a.pick !== (old && old.pick) ? { pick: a.pick } : undefined });
    return `${old ? "Updated" : "Saved"} ${d.kind} "${d.title}" [i:${id}].`;
  }
  if (name === "cottage_save_project") {
    const id = String(a.id || ""); if (!validId(id)) throw new Error("bad id");
    const old = await getDoc(db, "projects", id);
    if (!old && !a.name) throw new Error("a new project needs a name");
    const d: Doc = { ...(old || { area: "games", status: "", next: "", notes: "", version: "", link: "", order: 50, created: now() }) };
    for (const k of ["name", "area", "status", "next", "notes", "version", "link", "linkLabel", "trail", "obj", "thread", "links"]) if (a[k] !== undefined) d[k] = a[k];
    d.updated = now(); await writeDoc(db, "projects", id, d); await logEvent(db, { type: old ? "edit" : "create", who: "Claude", ref: "p:" + id, area: d.area, project: id });
    return `${old ? "Updated" : "Created"} project "${d.name}" [p:${id}].`;
  }
  if (name === "cottage_hex" || name === "cottage_toss") {
    const ref = String(a.ref || ""), col = ref.startsWith("p:") ? "projects" : ref.startsWith("i:") ? "items" : null; if (!col) throw new Error("use i:<id> or p:<id>");
    const id = ref.slice(2), old = await getDoc(db, col, id); if (!old) throw new Error("not found");
    await writeDoc(db, col, id, { ...old, wood: now(), updated: now() }); await logEvent(db, { type: "hex", who: "Claude", ref: ref, kind: old.kind, area: old.area, project: col === "projects" ? id : old.project || "" }); return `Hexed "${old.title || old.name}" into firewood. It's on the woodpile by the hearth until Sophia burns it (she can pull it back off the pile any time before then).`;
  }
  if (name === "cottage_reach_waystone") {
    const r = (await getDoc(db, "meta", "road")) || {}; const st = r[a.trail] || []; const w = st.find((x: Doc) => x.id === a.id); if (!w) throw new Error("no such waystone");
    w.done = a.reached !== false; if (w.done) w.doneAt = now(); r.updated = now(); await writeDoc(db, "meta", "road", r); await logEvent(db, { type: "waystone", who: "Claude", ref: `w:${a.trail}:${a.id}`, extra: { reached: w.done } }); return `${w.done ? "Reached" : "Not reached"}: ${w.title}.`;
  }
  throw new Error("unknown tool " + name);
}

async function handle(env: Env, msg: any): Promise<any | null> {
  const { id, method, params } = msg || {};
  const ok = (result: any) => ({ jsonrpc: "2.0", id, result }), err = (code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });
  if (id === undefined || id === null) return null;   // a notification: nothing to answer
  try {
    if (method === "initialize") {
      const v = PROTOCOLS.includes(params?.protocolVersion) ? params.protocolVersion : "2025-06-18";
      return ok({ protocolVersion: v, capabilities: { tools: { listChanged: false } }, serverInfo: { name: "the-cottage", title: "The Cottage", version: "1.0.0" },
        instructions: "This is Sophia's Cottage, her home base for every plan, project and thought (games, jobs, school). You are Munin, its raven. Call cottage_overview before planning anything about her work. Save plans she agrees with as pages (cottage_save_item, kind doc) and project paths as threads (cottage_save_project). Never delete: hex things into firewood with cottage_hex, and leave the burning to her. American spelling." });
    }
    if (method === "ping") return ok({});
    if (method === "tools/list") return ok({ tools: TOOLS });
    if (method === "tools/call") {
      try { const text = await callTool(env, params?.name, params?.arguments || {}); return ok({ content: [{ type: "text", text }] }); }
      catch (e: any) { return ok({ content: [{ type: "text", text: "Couldn't do that: " + (e?.message || e) }], isError: true }); }
    }
    if (method === "resources/list") return ok({ resources: [] });
    if (method === "prompts/list") return ok({ prompts: [] });
    return err(-32601, "Method not found: " + method);
  } catch (e: any) { return err(-32603, String(e?.message || e)); }
}

export const mcpHandler = {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "GET") return new Response("This connector answers POST requests only.", { status: 405, headers: { Allow: "POST" } });
    if (req.method === "DELETE") return new Response(null, { status: 204 });
    if (req.method !== "POST") return new Response(null, { status: 405 });
    let body: any; try { body = await req.json(); } catch { return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 }); }
    const msgs = Array.isArray(body) ? body : [body];
    const out = (await Promise.all(msgs.map(m => handle(env, m)))).filter(Boolean);
    if (!out.length) return new Response(null, { status: 202 });
    return Response.json(Array.isArray(body) ? out : out[0], { headers: { "Cache-Control": "no-store" } });
  },
};
