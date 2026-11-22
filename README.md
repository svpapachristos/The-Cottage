# The Cottage

A self-hosted personal memory and knowledge base, built as a pixel-art witch's cottage, with **Munin** the raven as its keeper.

Every project, plan, to-do, question, decision and stray thought across my game development, job search and school lives here, so nothing has to be planned twice. The Cottage is also the **shared memory between me and Claude**: any chat can read and write it through a custom connector, so a new conversation starts from where the last one ended.

It runs on my own Cloudflare Worker with a SQL database, installs as an app on my phone and PC, and is the dataset behind my data-analytics portfolio.

## What it does

The Cottage is a **long-term memory**: a home for the complete version of everything worth remembering, inside a cozy cottage. Right now it's stripped down on purpose to the foundation, **read and write**, and features come back one small grain at a time, only when they earn a place.

- **The house is the way in.** Tap a room. On a PC its books open beside the house; on a phone they slide up over it.
- **A room is a list of books, a book is a list of pages, a page is its text.** Pages can hold pages (a book, its chapters, a page per piece, in plain words, pointing into the real code), and a trail at the top shows the way back up.
- **Write anything with the quill** in the corner. It lands in the Book of Shadows until it's sorted. On a page, **Write a note** keeps the note right on that page.
- **One "…" menu** holds everything else: edit, older versions, a new page inside, move, and hexing into firewood. Nothing is deleted by accident; a hexed thing waits on the woodpile until it's burned.
- **Shared with Claude.** Any chat can read and write the Cottage through a custom connector and sees what I wrote and read, with times (`cottage_recent`), so a new chat starts where the last one ended.

**Hidden for now, not deleted:** Munin's speech and menu, badges, room scenes, next steps, threads, the road, Today and the bins, the rune table, the night ritual, "I get this", previous and next page. Their code and data are still here.

## Three brains, always labeled

A badge shows which brain is answering, wherever Munin speaks:

| Badge | What it is | Where |
|---|---|---|
| **Hearth brain** | A small, free open model on Cloudflare Workers AI (Llama 4 Scout, with fallbacks) | Inside the app: sorting runes, answering questions, weaving threads |
| **Claude** | The thinker. Plans, untangles and builds in a chat, then writes results back through the connector | Things Claude wrote show a feather and a Claude badge |
| **Plain code** | No AI: Munin's own rules | Home-screen greetings, nudges, and the local test copy |

## How it's built

```
 phone / PC (installed web app)           Claude chat
          │  HTTPS + session cookie              │  MCP + OAuth
          ▼                                      ▼
 ┌──────────────── Cloudflare Worker (server/src/index.ts) ────────────────┐
 │  /           the app (server/public, built from src/)                   │
 │  /api/*      sync, batch writes, sign-in, Munin's Hearth brain (ai.ts)  │
 │  /mcp        the Claude connector: cottage_* tools (mcp.ts)             │
 │  /authorize  OAuth consent page, behind my passphrase                   │
 └──────┬──────────────────────┬───────────────────────┬───────────────────┘
        ▼                      ▼                       ▼
   D1 (SQLite)            KV (sign-in)           Workers AI
   docs + rev counter     sessions, OAuth        Hearth brain
   events (the log)
```

- **Front end:** vanilla JavaScript, no framework and no dependencies. All art is drawn in code (pixel art, Bayer dithering) on canvas, and all sound is synthesized. `src/shell.html` holds the markup and styles; `src/js/01-data.js` to `09-table.js` hold the logic, in load order.
- **Build:** `src/build.py` joins the shell and scripts into one page, embeds the m5x7 font, and writes `server/public/` along with the install manifest, service worker and icons (PNG icons are written by hand, with no image libraries).
- **Back end:** a TypeScript Cloudflare Worker.
  - `db.ts`, `schema.sql`: one `docs` table stores every document as JSON. The fields I query (`kind`, `area`, `project`, `done`, `wood`, `updated`) are generated columns with indexes, so it's flexible like a document store but queryable like SQL. A single `rev` counter rises with every write, so each device asks "what changed since N?" and syncs incrementally. Deletes are kept as tombstones so other devices hear about them.
  - **The event log** (`events` table, `/api/events`): one append-only row for every capture, sort, pick, finish, hex, burn, focus session and night closed, from the app and from Claude's connector. It records what happened, when, and which room, project and kind it touched, but never a note's text, so it's safe to chart in public. Sort events also record Munin's pick, so his accuracy can be measured. Each device gives every event its own id, so a resend after a dropped connection is never counted twice.
  - `auth.ts`: passphrase sign-in with rate limiting and a session cookie.
  - `mcp.ts`: an MCP server, so Claude can read and write the Cottage from any chat. `cottage_recent` tells Claude what I wrote and did in a time window, with times in my time zone, read from the notes and the event log.
  - `ai.ts`: Munin's Hearth brain; every answer reports which model gave it.
- **Offline first:** changes are queued in an outbox on the device and sent when the connection returns. The service worker keeps the app shell (never the notes) so it opens instantly.

## Repo layout

```
src/
  shell.html          markup + styles
  js/01-data.js       rooms, storage, sync with the server, threads and ties
  js/02-art.js        the cottage, rooms, objects and sprites, drawn in code
  js/03-views.js      the walk (the cottage, room shelves, books, pages), the Book of Shadows, and the parked older screens
  js/04-sheets.js     add/edit sheets, page history, settings, thread editor
  js/05-munin.js      Munin: his line, asking, sorting runes, the brain badge
  js/06-ritual.js     the night ritual
  js/07-sound.js      synthesized sound
  js/08-main.js       routing and the click handler
  js/09-table.js      the rune table, the fireplace and woodpile, baskets
  build.py            builds server/public/
  m5x7.ttf            pixel font by Daniel Linssen (CC0)
server/
  src/                the Worker (index, db, auth, mcp, ai, cottage, pages)
  schema.sql          the database
  public/             the built app (generated by build.py: don't edit by hand)
  wrangler.jsonc      Worker config: D1, KV and AI bindings
```

## Running it

**Build the app** (Python 3, no packages needed):

```
python src/build.py
```

**Quick local test:** open `server/public/index.html` straight from disk. It runs in local mode: everything is saved in that browser only, and Munin uses plain code (no Hearth brain).

**Run the server locally:**

```
cd server
npm install
echo COTTAGE_PASSPHRASE=a-throwaway-test-passphrase > .dev.vars
npm run dev
```

`.dev.vars` is gitignored. Local dev uses throwaway local copies of the database, never the live one.

**Deploy:** pushing to `main` redeploys through Cloudflare Workers Builds. The D1 database, KV namespace and AI binding are created on the first deploy. Set the `COTTAGE_PASSPHRASE` secret in the Cloudflare dashboard. To connect Claude, add a custom connector pointing at `https://<your-worker>.workers.dev/mcp`.

## Where it's going

The plan is the blueprint (a pinned page inside the Cottage): **a long-term memory, one grain at a time.** Understand before building; each grain is one small change that lives in the app for a few days before we keep it or cut it.

| # | Grain | Status |
|---|---|---|
| 0 | Read and write only: the house, plain lists of books and pages, the quill, notes on pages, one "…" menu | Built 22 Nov |
| — | Move in every project, each with a manual written from the code or real documents | In progress |
| 1 | Clean the shelves: audit every room, merge duplicates, flag stale pages | Next |
| 2+ | Decided by what I reach for and can't find | |

**As a data portfolio:** the event log records every capture, sort, finish and hex, so my own working habits become a real dataset for SQL, spreadsheets and Tableau. Raw personal notes never leave the Cottage; only counts and trends are published.

## House rules

- Art drawn in code: palette `#0c0618`, `#ff7ad9`, `#dc5aff`; m5x7 for headings. Soft synthesized sound only. No generated images or audio.
- Works on phones.
- Never delete: hex into firewood, and only I burn it.
- Keep data shapes compatible; if one must change, migrate on load.
- A feature unused for two weeks goes on the woodpile.

---

Built by Sophia Papachristos (Hedgewitch Games), with Claude.
