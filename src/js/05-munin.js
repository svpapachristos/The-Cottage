// ============================================================ 05 · Munin: the cottage's raven. He sorts runes, carries them to rooms, answers questions, and keeps you company.
// In Norse myth Munin means "memory". He is the keeper (his Hearth brain is a small free model on the server, plus plain code)
// and the messenger between the cottage and Claude, who does the deep thinking in chats through the Cottage connector.

// ---- the brain badge: wherever Munin answers, it shows which brain is talking
//   Hearth brain  the small free model on the Cottage server (uses none of Sophia's Claude usage)
//   Claude        the thinker, in a chat through the Cottage connector; Munin carries what it writes home
//   Plain code    no AI at all: Munin's own rules
const MODEL_NAMES = [[/llama-4-scout/i, "Llama 4 Scout"], [/mistral-small/i, "Mistral Small"], [/llama-3\.1-8b/i, "Llama 3.1 8B"]];
function modelName(m) { m = String(m || ""); const hit = MODEL_NAMES.find(([re]) => re.test(m)); return hit ? hit[1] : m.replace(/^@cf\/[^/]+\//, ""); }
const brainNow = () => MUNIN_AI ? "hearth" : "code";
function brainBadge(who, model) {
  if (who === "claude") return `<span class="brain claude" title="Written by Claude in a chat, through your Cottage connector. Munin carried it home.">${img("feather")} Claude</span>`;
  if (who === "hearth") { const n = modelName(model || BRAIN.model); return `<span class="brain hearth" title="Munin's Hearth brain: ${n ? esc(n) + ", " : ""}a small free model on your Cottage server. It uses none of your Claude usage.">Hearth brain${n ? " · " + esc(n) : ""}</span>`; }
  return `<span class="brain code" title="No AI here: Munin's own rules, written in code.">Plain code</span>`;
}
function brainRow() {
  return `<div class="brainrow"><span>Answering here:</span>${brainBadge(brainNow())}<span>Deep thinking:</span>${brainBadge("claude")}<span>in your chats</span></div>`;
}

// ---- what Munin says on the home screen: the most useful thing first
function muninLine() {
  const all = items(), runes = all.filter(isRune).length, fresh = all.filter(i => isNew(i) && !isRune(i)).length;
  const qs = all.filter(openQ), today = all.filter(i => pickOf(i) === "today"), todayLeft = today.filter(i => !i.done).length, hr = new Date().getHours();
  const n = night();
  if (isNight()) return { text: "The cottage is asleep. Salem's curled up by the fire and everything's held until morning.", act: "wake" };
  if (n.lastNight && n.lastNight === nightKey(Date.now() - 864e5) && n.first && S.items[n.first] && !S.items[n.first].done && hr < 14)
    return { text: `Last night you chose to start with "${S.items[n.first].title}". It's at the top of Today.`, act: "reveal:" + n.first, go: "Show me" };
  if (fresh) return { text: `I brought ${fresh} new ${fresh === 1 ? "thing" : "things"} in from your chats. They're marked with a feather.`, act: "fresh", go: "Show me" };
  if (runes) return { text: `${runes} ${runes === 1 ? "rune is" : "runes are"} waiting in the Book of Shadows. Want me to sort ${runes === 1 ? "it" : "them"}?`, act: "book", go: "Open the book" };
  if (!today.length && hr >= 5 && hr < 20) return { text: "Nothing's picked for today yet. Shall we choose up to three things?", act: "plan", go: "Plan today" };
  if (today.length && !todayLeft) return { text: "Everything you picked for today is sent out. The road's glowing. Rest, or pick one more?", act: "plan", go: "Pick one more" };
  if (hr >= 21 || hr < 4) return { text: "It's getting late. Close up the cottage when you're ready, and I'll keep watch.", act: "ritual", go: "Close up" };
  if (qs.length) { const q = qs[0]; return { text: `The ${ROOMS[roomOf(q)].name} has a question waiting: "${snip(q.title, 70)}"`, act: "reveal:" + q.id, go: "Answer it" }; }
  const idle = ["Every finished thing becomes a lantern on the road.", "Write anything in the book. I'll find it a home.", "Ask me anything about your plans. I remember what's written here.", "Salem says hello. Well, he blinked."];
  return { text: (todayLeft ? `${todayLeft} left for today. ` : "") + idle[Math.floor(Date.now() / 3.6e6) % idle.length], act: "munin" };
}
function doSay(act) {
  if (!act) return openMunin();
  if (act === "book") return go("#book");
  if (act === "plan") return openPlan();
  if (act === "ritual") return openRitual();
  if (act === "wake") return wake();
  if (act === "fresh") { const f = items().filter(i => isNew(i) && !isRune(i)).sort(byNew)[0]; if (f) revealItem(f.id); return; }
  if (act.startsWith("reveal:")) return revealItem(act.slice(7));
  openMunin();
}

// ---- Munin's sheet: everything he can do, and a place to ask him things
const ASK_CHIPS = ["What should I focus on today?", "What's waiting on me?", "Where does each game stand?", "What's my plan for money right now?", "What did we get done lately?"];
function openMunin() {
  const runes = items().filter(isRune).length, say = muninLine(), fresh = items().filter(i => isNew(i) && !isRune(i)).length, qs = items().filter(openQ).length;
  openSheet("munin", `<div class="mhead"><canvas id="muninBig" width="16" height="16"></canvas><div><h3>Munin</h3><div class="say">${esc(say.text)}</div>${brainRow()}</div></div>
    <div class="mgrid">
      ${fresh ? `<button data-m="fresh" class="hl"><b>${img("feather")} New from your chats</b><span>${fresh} from Claude</span></button>` : ""}
      ${qs ? `<button data-m="q" class="hl"><b>${img("question")} Waiting on you</b><span>${qs} to decide</span></button>` : ""}
      <button data-m="rune"><b>Write it down</b><span>Anything on your mind</span></button>
      <button data-m="book"><b>Sort the book</b><span>${runes ? runes + " waiting" : "Nothing waiting"}</span></button>
      <button data-m="plan"><b>Plan today</b><span>Pick one to three</span></button>
      <button data-m="table"><b>Focus</b><span>${tableProject() ? "Back to " + esc(tableProject().name) : "Work on one thing"}</span></button>
      <button data-m="road"><b>The road</b><span>Your three trails</span></button>
      <button data-m="library"><b>The library</b><span>Every page and plan</span></button>
      <button data-m="ritual"><b>Close up</b><span>The night ritual</span></button>
    </div>
    <div class="lbl" style="margin-top:6px">Ask me anything</div>
    <div class="chips">${ASK_CHIPS.map(q => `<button class="chip" data-ask="${esc(q)}">${esc(q)}</button>`).join("")}</div>
    <div id="askLog"></div>
    <form id="askForm" style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap"><textarea id="askIn" rows="2" placeholder="Ask about your projects, plans or notes..." style="flex:1 1 240px"></textarea><div class="btns"><button class="main" type="submit">Ask</button><button type="button" id="askWrite" title="Save what you typed as a rune instead">Write it down</button></div></form>
    <div class="sub" id="askNote">${MUNIN_AI ? "I answer only from what's written in the cottage." : S.mode === "local" ? "Asking works when The Cottage is opened from your Cottage server." : "Asking isn't available right now."}</div>`);
  S.flash.munin = Date.now(); sfx("caw");
  drawChat();
  $("sheet").querySelector(".mgrid").onclick = e => { const b = e.target.closest("[data-m]"); if (!b) return; const m = b.dataset.m; closeSheet();
    if (m === "fresh" || m === "q") openSatchel(m === "fresh" ? "new" : "q"); else if (m === "road") go("#road"); else if (m === "rune") openAdd(); else if (m === "book") go("#book"); else if (m === "plan") openPlan(); else if (m === "find") openSearch(); else if (m === "table") go("#table"); else if (m === "library") go("#library"); else if (m === "ritual") openRitual(); };
  $("sheet").querySelector(".chips").onclick = e => { const b = e.target.closest("[data-ask]"); if (b) ask(b.dataset.ask); };
  $("askForm").onsubmit = e => { e.preventDefault(); ask($("askIn").value); };
  $("askIn").onkeydown = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask($("askIn").value); } };
  $("askWrite").onclick = () => { const t = $("askIn").value.trim(); if (!t) return; const ids = inscribe(t, true, "munin"); $("askIn").value = ""; if (!autoFile(ids)) toast("Inscribed in the Book of Shadows"); };
}
function brainText() {
  const P = projects().map(p => `- [p:${p.id}] ${p.name} {${(ROOMS[p.area] || {}).name || ""}} ${p.version ? "(" + p.version + ") " : ""}status: ${p.status || "?"}${p.next ? "; next: " + p.next : ""}${p.link ? "; link: " + p.link : ""}${p.notes ? "\n  about: " + p.notes.replace(/\n/g, " ") : ""}\n  thread: ${threadOf(p).steps.map(x => (x.done ? "[done] " : "") + x.label + (x.kind === "stone" ? " (waystone)" : x.proj && x.proj.id !== p.id ? " (in " + x.proj.name + ")" : "")).join(" → ") || "(none)"}`).join("\n");
  const others = items().filter(i => i.kind !== "doc").sort((a, b) => (a.kind > b.kind ? 1 : -1));
  const I = others.map(i => `- [i:${i.id}] [${KINDS[i.kind]}${i.kind === "todo" || i.kind === "question" ? (i.done ? ", done" : ", open") : ""}${pickOf(i) ? ", picked for " + (pickOf(i) === "today" ? "today" : "this week") : ""}] ${i.title}${i.date ? " (" + i.date + ")" : ""} {${whereText(i)}}${i.body ? ": " + i.body.replace(/\n/g, " ").slice(0, 600) : ""}${i.answer ? " ANSWER: " + i.answer : ""}`).join("\n");
  let budget = 70000;
  const D = items().filter(i => i.kind === "doc").sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || byNew(a, b)).map(d => { const body = (d.body || "").slice(0, Math.max(0, Math.min(6000, budget))); budget -= body.length; return `### [d:${d.id}] ${d.title} {${whereText(d)}}\n${body}${(d.body || "").length > body.length ? "\n(page continues)" : ""}`; }).join("\n\n");
  const R = Object.entries(road()).filter(([k]) => TRAILS[k]).map(([k, st]) => `${TRAILS[k].name} trail: ${st.map(w => (w.done ? "[reached] " : "") + w.title).join(" → ")}`).join("\n");
  return `PROJECTS\n${P || "(none)"}\n\nTHE ROAD (milestones)\n${R}\n\nNOTES, TO-DOS, QUESTIONS, DECISIONS, IDEAS, HISTORY\n${I || "(none)"}\n\nPAGES (long plans and documents)\n${D || "(none)"}\n\nSENT OUT TODAY: ${sentToday().map(i => i.title).join("; ") || "nothing yet"}`;
}
function answerHTML(text) {
  return md(text).replace(/\[\[(i|p|d):([\w.~:@+-]+)\]\]/g, (m, k, id) => {
    if (k === "p") { const p = S.projects[id]; return p ? `<span class="ref" data-ref="p:${esc(id)}">${esc(p.name)}</span>` : ""; }
    const it = S.items[id]; return it ? `<span class="ref" data-ref="i:${esc(id)}">${esc(snip(it.title, 48))}</span>` : "";
  });
}
function drawChat() { const L = $("askLog"); if (!L) return; L.innerHTML = S.chat.map(m => m.role === "user" ? `<div class="q">${esc(m.content)}</div>` : `<div class="a">${brainBadge("hearth", m.model)}${m.content ? answerHTML(m.content) : '<span class="sub">Munin is thinking...</span>'}</div>`).join(""); const last = L.lastElementChild; if (last) last.scrollIntoView({ block: "nearest" }); }
let asking = false;
async function ask(q) {
  q = (q || "").trim(); if (!q || asking || !MUNIN_AI) return;
  asking = true; $("askIn").value = ""; S.flash.munin = Date.now();
  S.chat.push({ role: "user", content: q }); const ans = { role: "assistant", content: "" }; S.chat.push(ans); drawChat();
  const intro = `You are Munin, the raven who keeps Sophia's cottage. The cottage is her personal organizer: she's a Computer Science student and indie game developer (studio: Hedgewitch Games) working toward income now (a job that isn't retail, or money from her games), getting back into school, and a game-dev career.
Rooms: Workshop (Hedgewitch Games), Coven Chamber (Coven), Observatory (Stargazer), Study (school), Writing Desk (jobs and money), Hearth (life, the big picture), and the Book of Shadows (unsorted runes). The road out of the cottage forks into three trails (Job, Games, School) with milestones called waystones.
Answer using ONLY what is written below. Today is ${new Date().toDateString()}.
Speak warmly and plainly, in short sentences, with American spelling. A touch of raven is fine, but be useful first. Use short bullet lists for lists. If the cottage doesn't hold the answer, say so and suggest she write it down. Never invent facts, dates or links.
When you mention a specific note, page or project, add its reference right after it, exactly as written in the data, like [[i:abc]], [[d:abc]] or [[p:abc]]. She can tap those to go there.

${brainText()}`;
  const hist = S.chat.slice(0, -1).slice(-7); while (hist.length && hist[0].role !== "user") hist.shift();
  const msgs = hist.map((m, i) => ({ role: m.role, content: i === 0 ? intro + "\n\nQUESTION: " + m.content : m.content }));
  try { const r = await MUNIN_AI(msgs, { cache: false, onText: ({ text }) => { ans.content = text; drawChat(); } }); ans.content = r.text || ans.content; ans.model = r.model; }
  catch (e) { ans.content = (e && e.text) || (e && e.code === "rate_limited" ? "My feathers need a moment. Try again in a minute." : "Something went wrong while I was thinking. Try again."); }
  asking = false; drawChat();
}

// ---- runes: write them into the book, sort them, send them
function inscribe(text, single, source) {   // returns the ids of the new runes; source (home, book, quill...) goes in the event log
  text = String(text || "").trim(); if (!text) return [];
  let chunks;
  if (single) chunks = [text];
  else {
    chunks = [];
    for (const block of text.split(/\n\s*\n/)) {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
      const together = lines.length > 1 && (/^#/.test(lines[0]) || lines.some(l => l.length > 160) || lines.length > 12);
      if (together) chunks.push(block.trim()); else for (const l of lines) chunks.push(l.replace(/^[-*•]\s+/, ""));
    }
  }
  const ids = []; EV.src = source || "book";
  chunks.forEach((c, n) => {
    const { title, body } = splitTitle(c), link = (c.match(/https?:\/\/\S+/) || [""])[0], kind = guessKind(c);
    const id = newId("r"); ids.push(id);
    put("items", id, { kind, title: title.slice(0, 200), body, area: "book", project: "", link, done: false, pinned: false, created: Date.now() + n, by: "Sophia" });
  });
  EV.src = ""; sfx("rune");
  return ids;
}
// ============================================================ the four bins
// Every rune ends up in one of four bins. Munin pre-picks one (and a room); Sophia confirms with one tap.
const BINS = {
  do:    { name: "Do", hint: "a small action" },
  keep:  { name: "Keep", hint: "a note, idea or plan" },
  scry:  { name: "Not sure yet", hint: "decide later" },
  letgo: { name: "Let go", hint: "to the woodpile" },
};
const KEEP_KINDS = ["note", "idea", "decision", "link", "doc"];
const binOfKind = k => k === "todo" ? "do" : k === "question" ? "scry" : "keep";
function binOf(l) { const sg = l.suggest; return sg && BINS[sg.bin] ? sg.bin : binOfKind(sg ? sg.kind : l.kind); }
// Munin reads new runes and pre-picks a bin and a room for each. With "Munin files on his own" turned on,
// the ones he's sure about (Do or Keep) are filed straight away; otherwise everything waits in the book for one tap.
function pickBins(ids, speak) {
  if (!MUNIN_AI || !ids || !ids.length) return false;
  const runes = ids.map(id => S.items[id]).filter(Boolean);
  S.flash.munin = Date.now();
  classify(runes.map(l => l.title + (l.body ? "\n" + l.body : ""))).then(out => {
    let filed = 0;
    runes.forEach((l, n) => { const v = out[n], cur = S.items[l.id]; if (!v || !cur || !isRune(cur)) return;
      saveItem(cur, { suggest: v });
      if (PREF.get("autofile", false) && v.sure && (v.bin === "do" || v.bin === "keep")) { setTimeout(() => fileRune(S.items[l.id], v.bin, v.area, v.project, false), filed * 260); filed++; } });
    if (filed) { sfx("send"); toast(`Munin filed ${filed === 1 ? "it" : filed}`); }
    else if (speak) toast(runes.length === 1 ? "Munin picked a bin for it" : "Munin picked a bin for each", "Open the book", () => go("#book"));
  }).catch(() => { if (speak) toast("Safe in the Book of Shadows", "Open the book", () => go("#book")); });
  return true;
}
const autoFile = ids => pickBins(ids, true);   // the older name, used by the quill, the ritual and the rune table
function fileRune(l, bin, area, project, last) {
  if (!l || !BINS[bin]) return;
  // the event log keeps which bin you chose and what Munin had picked, so you can see how often he gets it right
  const pick = l.suggest ? { munin: binOf(l) } : { guess: binOf(l) }, auto = last === false && !!l.suggest && PREF.get("autofile", false);
  if (bin === "letgo") { logEvent("sort", l, { bin, ...pick }); const el = document.querySelector(`[data-rune="${CSS.escape(l.id)}"]`); hex("items", l.id, el); return; }
  const sg = l.suggest || {};
  const kind = bin === "do" ? "todo" : bin === "scry" ? "question" : KEEP_KINDS.includes(sg.kind) ? sg.kind : KEEP_KINDS.includes(l.kind) ? l.kind : "note";
  sendRune(l, area, project, kind, last, bin === "scry" ? { scry: Date.now() } : null, bin);
  logEvent("sort", S.items[l.id], { bin, ...pick, auto: auto || undefined });
}
async function classify(texts) {
  const prompt = `Sort notes into a personal organizer shaped like a cottage. Reply with JSON only: an array with one object per note, in order: {"bin": one of "do","keep","scry","letgo", "kind": one of "todo","note","idea","question","link","decision","doc", "area": one of ${JSON.stringify(AREA_ORDER)}, "project": one of ${JSON.stringify(projects().map(p => p.id))} or "", "title": a short title in the person's own words (under 80 characters), "sure": true only if it obviously belongs in that area and project, otherwise false}.
Areas: games = Hedgewitch Games (her small witchy browser games, the website, itch.io, ads); coven = Coven, her big witch roguelite and life's work; stargazer = Stargazer, her universe simulation; school = college, reapplying, choosing a degree; jobs = job search, resume, money, DLTracker; life = everything else, including the big picture.
Projects: ${projects().map(p => p.id + " = " + p.name + " (" + p.area + ")").join("; ")}.
"todo" = something to do; "question" = something to decide or answer later; "decision" = something already decided; "idea" = a possible future thing; "link" = mainly a URL; "doc" = a long plan or document with several parts; otherwise "note". Pick a project only when the note is clearly about it.
Bins: "do" = a small concrete action she can do in one sitting (kind "todo"); "keep" = something to remember: a note, idea, decision, link, plan or a feeling worth writing down; "scry" = she's unsure, torn or lost about it, or it needs deciding later (kind "question"); "letgo" = only if the note itself says it's finished with or no longer matters.
Notes: ${JSON.stringify(texts.map(t => t.slice(0, 1500)))}`;
  const v = await MUNIN_AI.json(prompt);
  const arr = Array.isArray(v) ? v : (v && Array.isArray(v.notes) ? v.notes : [v]);
  return arr.map(x => x && typeof x === "object" ? { bin: BINS[x.bin] ? x.bin : binOfKind(x.kind), kind: KINDS[x.kind] && x.kind !== "log" ? x.kind : "note", area: ROOMS[x.area] && x.area !== "book" ? x.area : "life", project: live(S.projects[x.project]) ? x.project : "", title: String(x.title || "").slice(0, 120), sure: x.sure === true } : null);
}
async function sortBook() {
  const runes = items().filter(isRune).sort(byOld);
  if (!MUNIN_AI || !runes.length) return;
  const b = $("sortAll"); if (b) { b.textContent = "Munin is reading..."; b.disabled = true; }
  S.flash.munin = Date.now();
  try {
    for (let i = 0; i < runes.length; i += 20) {
      const part = runes.slice(i, i + 20), out = await classify(part.map(l => l.title + (l.body ? "\n" + l.body : "")));
      part.forEach((l, n) => { const v = out[n]; if (v) saveItem(S.items[l.id] || l, { suggest: v }); });
    }
    sfx("caw"); toast("Munin picked a bin for each rune");
  } catch (e) { toast("Munin couldn't sort them this time"); render(); }
}
function sendRune(l, area, project, kind, last, extra, bin) {
  if (!l || !ROOMS[area] || area === "book") return;
  const el = document.querySelector(`[data-rune="${CSS.escape(l.id)}"]`);
  const d = { ...l, ...(extra || {}), area, project: project && live(S.projects[project]) ? project : "", kind: KINDS[kind] ? kind : l.kind }; delete d.suggest;
  if (d.kind === "doc" && !d.body) { d.body = d.title; }
  put("items", l.id, d);
  fly(el ? el.getBoundingClientRect() : null);
  if (last === false) return;
  sfx("send");
  const where = d.project ? S.projects[d.project].name : "the " + ROOMS[area].name, there = () => go(placeOf(S.items[l.id] || d));
  if (bin === "do") toast("A to-do in " + where, "Do it today", () => { const it = S.items[l.id]; if (it) { saveItem(it, { pick: "today" }); toast("On Today"); } });
  else if (bin === "keep") toast("Kept in " + where, "Go there", there);
  else if (bin === "scry") toast("Not sure yet: it waits in " + where, "Go there", there);
  else toast("Munin took it to " + where, "Go there", there);
}
// Munin flies across the screen with a rune.
function fly(from) {
  const c = document.createElement("canvas"); c.width = 16; c.height = 8; c.className = "flyer"; document.body.appendChild(c);
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
  const x0 = from ? from.left + from.width / 2 - 24 : innerWidth - 90, y0 = from ? from.top + 10 : innerHeight - 140, x1 = innerWidth + 40, y1 = Math.max(-40, y0 - 260), t0 = performance.now(), dur = 950;
  const step = now => {
    const p = Math.min(1, (now - t0) / dur), e = p * p;
    c.style.left = (x0 + (x1 - x0) * e) + "px"; c.style.top = (y0 + (y1 - y0) * p - Math.sin(p * Math.PI) * 40) + "px";
    g.clearRect(0, 0, 16, 8); sprite(g, ((now / 90) | 0) % 2 ? "muninFlyA" : "muninFlyB", 0, 0);
    if (p < 1) requestAnimationFrame(step); else c.remove();
  };
  requestAnimationFrame(step);
}
// Finishing something: a lantern lights, a mote of light runs down its trail, and Munin hops.
function cheer(it) {
  const p = projOf(it), trail = (p && trailOf(p)) || AREA_TRAIL[roomOf(it)] || "games";
  (S.motes = (S.motes || []).filter(m => Date.now() - m.t0 < 3000)).push({ t0: Date.now(), trail: TRAILS[trail] ? trail : "games" });
  S.flash.munin = Date.now();
  if (it.kind === "todo") { sfx("done"); const n = sentToday().length + (S.items[it.id] && S.items[it.id].done ? 0 : 1); toast(n === 1 ? "Sent out. The first lantern of the day is lit" : `Sent out. ${n} lanterns on the road today`); }
  else if (it.kind === "question") { sfx("done"); toast("Settled. It moves to Decided"); }
}
function petSalem() { S.flash.salem = Date.now(); sfx("purr"); }

// Munin weaves a thread for a project: its steps in order, borrowing steps from other projects, ending at a waystone.
async function weave(p) {
  const tr = trailOf(p), cands = items().filter(i => i.kind === "todo" && !i.done && (i.project === p.id || (projOf(i) && trailOf(projOf(i)) === tr)));
  const stones = Object.entries(road()).filter(([k]) => TRAILS[k]).flatMap(([k, st]) => (st || []).map(w => ({ ref: "w:" + k + ":" + w.id, t: TRAILS[k].name + " trail: " + w.title + (w.done ? " (reached)" : "") })));
  const prompt = `Plan the path of one project in a personal organizer. Reply with JSON only: an array of at most 8 steps, in the order they should happen, ending with the waystone (milestone) the project is heading toward. Each step is either a reference string copied exactly from the lists below, or {"t": "short new step"} for a missing step (at most 3 of those).
Project: ${p.name}. Status: ${p.status || "?"}. Next: ${p.next || "?"}. About: ${(p.notes || "").slice(0, 600)}
To-dos you may use (ref = title, project): ${cands.map(i => "i:" + i.id + " = " + i.title + ", " + (projOf(i) ? projOf(i).name : "")).join("; ")}
Waystones: ${stones.map(s => s.ref + " = " + s.t).join("; ")}
Prefer this project's own to-dos, add another project's to-do only when this project truly needs it, and end with the nearest unreached waystone it helps reach.`;
  const v = await MUNIN_AI.json(prompt);
  const arr = Array.isArray(v) ? v : v && Array.isArray(v.steps) ? v.steps : [];
  return arr.map(x => typeof x === "string" ? (resolve(x) ? x : null) : x && x.t ? { t: String(x.t).slice(0, 140), d: false } : null).filter(Boolean).slice(0, 10);
}
