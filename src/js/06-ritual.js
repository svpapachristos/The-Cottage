// ============================================================ 06 · closing up the cottage for the night
// Five small steps: empty your head, see what you sent out, feed the fire from the woodpile, pick tomorrow's first thing, lights out.

const RIT = { step: 0, first: "", firstNew: "", burned: 0 };
const RIT_STEPS = 5;
function openRitual() {
  closeSheet(); RIT.step = 0; RIT.first = ""; RIT.firstNew = ""; RIT.burned = 0;
  $("ritual").classList.add("open"); drawRitual(); sfx("caw");
}
function closeRitual() { $("ritual").classList.remove("open"); $("ritual").innerHTML = ""; render(); }
function ritualFrame(title, body, buttons) {
  return `<div class="rbox"><div class="rsteps">${Array.from({ length: RIT_STEPS }, (_, i) => `<i class="${i <= RIT.step ? "on" : ""}"></i>`).join("")}</div>
    <h3>${title}</h3>${body}<div class="btns" style="margin-top:4px">${buttons}</div></div>`;
}
function drawRitual() {
  const box = $("ritual"), s = RIT.step;
  if (s === 0) {
    box.innerHTML = ritualFrame("Empty your head", `<div class="sub">Anything still buzzing around? Write it here and it goes into the Book of Shadows, so you don't have to hold it overnight. One thought per line.</div>
      <textarea id="ritHead" rows="6" placeholder="That bug in Orrery... email the registrar... idea for a potion shop customer..."></textarea>`,
      `<span class="spacer"></span><button id="ritCancel">Not tonight</button><button class="main" id="ritNext">Next</button>`);
    $("ritNext").onclick = () => { const t = $("ritHead").value.trim(); if (t) { const ids = inscribe(t); if (!autoFile(ids)) toast(ids.length + (ids.length === 1 ? " rune" : " runes") + " safe in the book"); } RIT.step = 1; drawRitual(); };
    $("ritCancel").onclick = closeRitual;
    setTimeout(() => $("ritHead") && $("ritHead").focus(), 60);
  } else if (s === 1) {
    const sent = sentToday().sort(byNew);
    box.innerHTML = ritualFrame("What you sent out today", `<div class="sub">${sent.length ? `${sent.length} ${sent.length === 1 ? "lantern" : "lanterns"} on the road tonight. Each one is a thing you finished.` : "No lanterns today, and that's all right. Rest days keep the cottage standing."}</div>
      <div class="rlist">${sent.map(i => `<div class="pr" style="cursor:default"><span class="lant">✦</span><div>${esc(i.title)}<span class="w">${esc(whereText(i))}</span></div></div>`).join("")}</div>`,
      `<button id="ritBack">Back</button><span class="spacer"></span><button class="main" id="ritNext">Next</button>`);
    $("ritBack").onclick = () => { RIT.step = 0; drawRitual(); }; $("ritNext").onclick = () => { RIT.step = 2; drawRitual(); };
  } else if (s === 2) {
    const wood = woodpile();
    box.innerHTML = ritualFrame("Feed the fire", `<div class="sub">${wood.length ? `${wood.length} ${wood.length === 1 ? "log is" : "logs are"} on the woodpile: old ideas, finished notes, plans that changed. Drag ${wood.length === 1 ? "it" : "each one"} into the fire, or leave ${wood.length === 1 ? "it" : "them"} for another night.` : RIT.burned ? `The fire took ${RIT.burned} ${RIT.burned === 1 ? "log" : "logs"}. Warm and crackling.` : "No logs on the pile tonight. The fire's warm anyway. You can pet Salem."}</div>
      ${fireplaceHTML(wood, "ritFire")}`,
      `<button id="ritBack">Back</button><span class="spacer"></span>${wood.length > 1 ? `<button class="ember" id="ritBurn">Burn them all</button>` : ""}<button class="main" id="ritNext">${wood.length ? "Leave the rest" : "Next"}</button>`);
    $("ritBack").onclick = () => { RIT.step = 1; drawRitual(); };
    $("ritNext").onclick = () => { RIT.step = 3; drawRitual(); };
    if ($("ritBurn")) $("ritBurn").onclick = async () => { $("ritBurn").disabled = true; RIT.burned += await burnAll(); drawRitual(); };
    wireFireplace("ritFire", () => { RIT.burned++; setTimeout(drawRitual, 700); });
  } else if (s === 3) {
    const todos = items().filter(openTodo).sort((a, b) => ({ today: 0, week: 1 }[a.pick] ?? 2) - ({ today: 0, week: 1 }[b.pick] ?? 2) || byPinOld(a, b));
    box.innerHTML = ritualFrame("Tomorrow's first thing", `<div class="sub">Pick one thing to start with tomorrow, so the morning already knows where to go. Or write a new one.</div>
      <input type="text" id="ritNew" placeholder="Or write it here..." value="${esc(RIT.firstNew)}">
      <div class="rlist" id="ritList">${todos.slice(0, 40).map(i => `<div class="pr ${RIT.first === i.id ? "sel" : ""}" data-first="${esc(i.id)}"><span>${pickOf(i) === "today" ? "☀" : pickOf(i) === "week" ? "◇" : "·"}</span><div>${esc(i.title)}<span class="w">${esc(whereText(i))}</span></div></div>`).join("") || `<div class="empty">No open to-dos. Write one above, or skip.</div>`}</div>`,
      `<button id="ritBack">Back</button><span class="spacer"></span><button id="ritSkip">Skip</button><button class="main" id="ritNext">Lights out</button>`);
    $("ritList").onclick = e => { const r = e.target.closest("[data-first]"); if (!r) return; RIT.first = r.dataset.first; RIT.firstNew = ""; $("ritNew").value = ""; [...$("ritList").children].forEach(c => c.classList.toggle("sel", c === r)); };
    $("ritNew").oninput = e => { RIT.firstNew = e.target.value; if (RIT.firstNew) { RIT.first = ""; [...$("ritList").children].forEach(c => c.classList.remove("sel")); } };
    $("ritBack").onclick = () => { RIT.step = 2; drawRitual(); };
    $("ritSkip").onclick = () => { RIT.first = ""; RIT.firstNew = ""; lightsOut(); };
    $("ritNext").onclick = lightsOut;
  } else {
    const first = RIT.first && S.items[RIT.first];
    box.innerHTML = `<div class="rbox"><div class="lightsout">
      <canvas id="loCv" width="${HW}" height="${HH}" style="width:${HW * 2}px;height:${HH * 2}px"></canvas>
      <div class="gn">Good night, Sophia</div>
      <div class="sub" style="font-size:15px">Everything's written down and held. ${first ? `Tomorrow starts with "${esc(first.title)}".` : ""} Munin's keeping watch, and Salem's already asleep.</div>
      <button class="main" id="ritDone">Good night</button></div></div>`;
    $("ritDone").onclick = () => { closeRitual(); go(""); };
  }
}
function lightsOut() {
  let firstId = RIT.first;
  if (!firstId && RIT.firstNew.trim()) { firstId = newId("t"); put("items", firstId, { kind: "todo", title: RIT.firstNew.trim().slice(0, 200), body: "", area: guessArea(RIT.firstNew), project: "", link: "", done: false, pinned: false, created: Date.now(), by: "Sophia", pick: "today" }); }
  else if (firstId && S.items[firstId]) saveItem(S.items[firstId], { pick: "today" });
  const prev = night(), key = nightKey(), yesterday = nightKey(Date.now() - 864e5);
  const streak = prev.lastNight === key ? (prev.streak || 1) : prev.lastNight === yesterday ? (prev.streak || 0) + 1 : 1;
  putMeta("night", { closed: key, lastNight: key, closedAt: Date.now(), first: firstId || "", streak });
  RIT.first = firstId; RIT.step = 4; S.loStart = performance.now(); drawRitual(); sfx("night");
}
function wake() { const n = night(); putMeta("night", { ...n, closed: "" }); S.flash.munin = Date.now(); toast("The cottage is open again"); }
