// The database: reading and writing documents, and keeping every device in sync.
import schema from "../schema.sql";

export type Col = "items" | "projects" | "meta";
export const COLS: Col[] = ["items", "projects", "meta"];
export type Doc = Record<string, any>;
const ID = /^[\w.~:@+-]{1,180}$/;
export const validId = (id: string) => ID.test(id);

let ready: Promise<void> | null = null;
// Create the tables the first time the Worker runs (safe to repeat).
export function ensureSchema(db: D1Database): Promise<void> {
  if (!ready) ready = (async () => {
    const statements = schema.split(/;\s*(?:\n|$)/).map(s => s.replace(/--.*$/gm, "").trim()).filter(Boolean);
    await db.batch(statements.map(s => db.prepare(s)));
  })().catch(e => { ready = null; throw e; });
  return ready;
}

// Write one or more documents in a single transaction. data = null deletes (kept as a tombstone so other devices learn).
export async function writeDocs(db: D1Database, ops: { col: Col; id: string; data: Doc | null }[]): Promise<number> {
  await ensureSchema(db);
  const stmts: D1PreparedStatement[] = [];
  for (const { col, id, data } of ops) {
    if (!COLS.includes(col) || !validId(id)) throw new Error("bad document address: " + col + "/" + id);
    stmts.push(db.prepare("UPDATE counters SET value = value + 1 WHERE name = 'rev'"));
    stmts.push(db.prepare(
      `INSERT INTO docs (col, id, data, rev, deleted) VALUES (?1, ?2, ?3, (SELECT value FROM counters WHERE name = 'rev'), ?4)
       ON CONFLICT (col, id) DO UPDATE SET data = excluded.data, rev = excluded.rev, deleted = excluded.deleted`
    ).bind(col, id, JSON.stringify(data ?? {}), data ? 0 : 1));
  }
  stmts.push(db.prepare("SELECT value FROM counters WHERE name = 'rev'"));
  const res = await db.batch(stmts);
  return (res[res.length - 1].results[0] as any).value as number;
}
export const writeDoc = (db: D1Database, col: Col, id: string, data: Doc | null) => writeDocs(db, [{ col, id, data }]);

// Everything that changed after `since` (0 = everything that exists).
export async function changesSince(db: D1Database, since: number) {
  await ensureSchema(db);
  const rows = since > 0
    ? await db.prepare("SELECT col, id, data, deleted, rev FROM docs WHERE rev > ?1 ORDER BY rev").bind(since).all()
    : await db.prepare("SELECT col, id, data, deleted, rev FROM docs WHERE deleted = 0 ORDER BY rev").all();
  const rev = ((await db.prepare("SELECT value FROM counters WHERE name = 'rev'").first()) as any)?.value ?? 0;
  return { rev, docs: (rows.results as any[]).map(r => ({ col: r.col as Col, id: r.id as string, deleted: !!r.deleted, data: r.deleted ? null : JSON.parse(r.data) })) };
}

export async function getDoc(db: D1Database, col: Col, id: string): Promise<Doc | null> {
  await ensureSchema(db);
  const r = (await db.prepare("SELECT data FROM docs WHERE col = ?1 AND id = ?2 AND deleted = 0").bind(col, id).first()) as any;
  return r ? JSON.parse(r.data) : null;
}

// The whole cottage in memory: small enough (a few hundred documents) to load at once for Munin's tools.
export async function loadAll(db: D1Database) {
  const { docs } = await changesSince(db, 0);
  const S = { items: {} as Record<string, Doc>, projects: {} as Record<string, Doc>, meta: {} as Record<string, Doc> };
  for (const d of docs) S[d.col][d.id] = { ...d.data, id: d.id };
  return S;
}
