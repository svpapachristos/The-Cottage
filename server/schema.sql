-- The Cottage's database (Cloudflare D1, which is SQLite).
-- The server runs this itself on first use, so there's no migration step to remember.
--
-- One table holds every document: items (notes, to-dos, pages...), projects, and a few meta documents.
-- Each document is stored as JSON, and the fields we search and sort by are pulled out of the JSON
-- into generated columns, so they can be indexed like normal columns without a fixed schema.

CREATE TABLE IF NOT EXISTS docs (
  col      TEXT    NOT NULL CHECK (col IN ('items', 'projects', 'meta')),
  id       TEXT    NOT NULL,
  data     TEXT    NOT NULL DEFAULT '{}',          -- the document itself, as JSON
  rev      INTEGER NOT NULL,                       -- which change this was (for syncing devices)
  deleted  INTEGER NOT NULL DEFAULT 0,
  kind     TEXT    GENERATED ALWAYS AS (json_extract(data, '$.kind'))    VIRTUAL,
  area     TEXT    GENERATED ALWAYS AS (json_extract(data, '$.area'))    VIRTUAL,
  project  TEXT    GENERATED ALWAYS AS (json_extract(data, '$.project')) VIRTUAL,
  done     INTEGER GENERATED ALWAYS AS (json_extract(data, '$.done'))    VIRTUAL,
  wood     INTEGER GENERATED ALWAYS AS (json_extract(data, '$.wood'))    VIRTUAL,
  updated  INTEGER GENERATED ALWAYS AS (json_extract(data, '$.updated')) VIRTUAL,
  PRIMARY KEY (col, id)
);
CREATE INDEX IF NOT EXISTS docs_by_rev     ON docs (rev);
CREATE INDEX IF NOT EXISTS docs_by_project ON docs (col, project);
CREATE INDEX IF NOT EXISTS docs_by_kind    ON docs (col, kind, done);

-- A single counter that goes up by one with every change. Devices ask "what changed since N?".
CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL);
INSERT OR IGNORE INTO counters (name, value) VALUES ('rev', 0);

-- The event log: one row for everything that happens in the cottage (written down, sorted, picked, finished,
-- hexed, burned, focused on). It keeps what happened, when and where, never the text of a note, so it is safe
-- to chart in public. Rows are only ever added, and they stay even after the thing they describe is burned.
CREATE TABLE IF NOT EXISTS events (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  cid      TEXT    UNIQUE,                         -- an id made by the device, so a resend is never counted twice
  at       INTEGER NOT NULL,                       -- when it happened (ms since 1970)
  type     TEXT    NOT NULL,                       -- capture, sort, pick, finish, reopen, settle, hex, unhex, burn, focus, close, create, edit, waystone
  who      TEXT    NOT NULL DEFAULT 'Sophia',      -- Sophia, or Claude (through the connector)
  ref      TEXT,                                   -- what it happened to: i:<item id> or p:<project id>
  kind     TEXT,                                   -- the item's kind afterward (todo, note, question...)
  area     TEXT,                                   -- its room afterward
  project  TEXT,                                   -- its project afterward
  bin      TEXT,                                   -- sort events: do, keep, scry or letgo
  extra    TEXT                                    -- a little JSON: where it was written, Munin's pick, today or week
);
CREATE INDEX IF NOT EXISTS events_by_at   ON events (at);
CREATE INDEX IF NOT EXISTS events_by_type ON events (type, at);
