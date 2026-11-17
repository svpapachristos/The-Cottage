// What the cottage means: rooms, trails, threads. The same rules the app uses, so Claude sees what Sophia sees.
import type { Doc } from "./db";

export const ROOMS: Record<string, string> = { games: "Workshop (Hedgewitch Games)", coven: "Coven Chamber (Coven)", stargazer: "Observatory (Stargazer)", school: "Study (school)", jobs: "Writing Desk (jobs and money)", life: "Hearth (life, the big picture)", book: "Book of Shadows (runes waiting to be sorted)" };
export const TRAILS: Record<string, string> = { job: "Job", games: "Games", school: "School" };
const AREA_TRAIL: Record<string, string> = { games: "games", coven: "games", stargazer: "games", jobs: "job", school: "school" };
export type World = { items: Record<string, Doc>; projects: Record<string, Doc>; meta: Record<string, Doc> };

export const live = (o: Doc | undefined) => !!o && !o.wood;
export const roomOf = (it: Doc) => (it.area === "inbox" || it.area === "book" || !ROOMS[it.area] ? "book" : it.area);
export const isRune = (it: Doc) => roomOf(it) === "book";
export const trailOf = (p: Doc) => p.trail || AREA_TRAIL[p.area] || "";
export function road(W: World): Record<string, Doc[]> { const r = W.meta.road; return r && r.job ? r : { job: [], games: [], school: [] }; }

export function resolve(W: World, ref: any): { kind: string; ref: any; label: string; done: boolean; it?: Doc; p?: Doc; proj?: Doc; trail?: string } | null {
  if (ref && typeof ref === "object") return { kind: "text", ref, label: ref.t || "", done: !!ref.d };
  const s = String(ref || "");
  if (s.startsWith("i:")) { const it = W.items[s.slice(2)]; if (!live(it)) return null; const proj = it.project && live(W.projects[it.project]) ? W.projects[it.project] : undefined; return { kind: "item", ref: s, it, label: it.title, done: it.kind === "log" || it.kind === "decision" || !!it.done, proj }; }
  if (s.startsWith("p:")) { const p = W.projects[s.slice(2)]; return live(p) ? { kind: "project", ref: s, p, label: p.name, done: false } : null; }
  if (s.startsWith("w:")) { const [, k, id] = s.split(":"); const w = (road(W)[k] || []).find((x: Doc) => x.id === id); return w ? { kind: "stone", ref: s, trail: k, label: w.title, done: !!w.done } : null; }
  return null;
}
export function threadOf(W: World, p: Doc) {
  if (Array.isArray(p.thread) && p.thread.length) return p.thread.map((r: any) => resolve(W, r)).filter(Boolean) as NonNullable<ReturnType<typeof resolve>>[];
  const its = Object.values(W.items).filter(i => live(i) && i.project === p.id && i.kind === "todo");
  const doneAt = (i: Doc) => i.doneAt || (i.done ? i.updated : 0) || 0;
  const rank = (i: Doc) => ({ today: 0, week: 1 } as any)[i.pick] ?? 2;
  const done = its.filter(i => i.done).sort((a, b) => doneAt(b) - doneAt(a)).slice(0, 1);
  const open = its.filter(i => !i.done).sort((a, b) => rank(a) - rank(b) || (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.created || 0) - (b.created || 0));
  const steps = [...done, ...open].map(i => resolve(W, "i:" + i.id));
  const tr = trailOf(p), st = (road(W)[tr] || []).find((w: Doc) => !w.done);
  if (st) steps.push(resolve(W, `w:${tr}:${st.id}`));
  return steps.filter(Boolean) as NonNullable<ReturnType<typeof resolve>>[];
}
export function nextStep(W: World, p: Doc) { const st = threadOf(W, p); return st.find(s => !s.done && s.kind !== "stone") || st.find(s => !s.done) || null; }
export const projects = (W: World) => Object.values(W.projects).filter(live).sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || String(a.name).localeCompare(b.name));
export const items = (W: World) => Object.values(W.items).filter(live);
