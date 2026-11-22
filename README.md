# The Cottage

A self-hosted personal knowledge base and planner, built as a pixel-art witch's cottage, with **Munin** the raven as its keeper.

Every project, plan, to-do, question, decision and stray thought across my game development, job search and school lives here, so nothing has to be planned twice. The Cottage is also the **shared memory between me and Claude**: any chat can read and write it through a custom connector, so a new conversation starts from where the last one ended.

It runs on my own Cloudflare Worker with a SQL database, installs as an app on my phone and PC, and is the dataset behind my data-analytics portfolio.

## What it does

- **Four doors, nothing more.** A bar along the bottom: **Home** (Munin's one line, today's one to three things, a box to write anything down, and the cottage), **Write** (the Book of Shadows), **Focus** (the rune table) and **Munin**. Everything else is one tap deeper.
- **Rooms for each part of life.** The Workshop (my studio, Hedgewitch Games), the Coven Chamber and Observatory (my two big games), the Study (school), the Writing Desk (jobs and money), and the Hearth (the big picture). Projects sit on each room's shelf as little objects. Pick one up to see its one next step and the thread of steps toward a milestone.
- **The Book of Shadows: one way in, four bins.** Write anything, from the home screen or the book. Munin pre-picks a bin for each rune (**Do**, **Keep**, **Not sure yet**, **Let go**) and a room, and one tap files it. A **Do** can go straight onto Today.
- **Today and the road.** Today holds only to-dos: pick one to three. Each finished thing lights a lantern on the road out of the cottage, which forks into three trails (Job, Games, School) with milestones called waystones.
- **The rune table.** Set down one project and work on just that, with a focus candle and a jot box for stray thoughts.
- **Nothing is deleted by accident.** Hexing something turns it into a named log on the woodpile. It's only gone when I drag the log into the fire, or burn the pile in the night ritual.
- **The night ritual.** Empty your head, see what you sent out, feed the fire, pick tomorrow's first thing, lights out. Salem the cat curls up by the hearth.

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
  - `mcp.ts`: an MCP server, so Claude can read and write the Cottage from any chat.
  - `ai.ts`: Munin's Hearth brain; every answer reports which model gave it.
- **Offline first:** changes are queued in an outbox on the device and sent when the connection returns. The service worker keeps the app shell (never the notes) so it opens instantly.

## Repo layout

```
src/
  shell.html          markup + styles
  js/01-data.js       rooms, storage, sync with the server, threads and ties
  js/02-art.js        the cottage, rooms, objects and sprites, drawn in code
  js/03-views.js      home, rooms, projects, pages, the Book of Shadows
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

The plan is the blueprint agreed on 21 Nov 2026 (kept as a pinned page inside the Cottage):

| Phase | Build | Status |
|---|---|---|
| 1. Foundation | Font restored, this README, the old claude.ai artifact mode retired, the brain badge, stale records fixed, named woodpile logs | Done |
| 2. The belt | Simple home and four doors, one way in, four bins (Do, Keep, Not sure yet, Let go), Today from Do, the event log; then Munin splits rambles from actions, two-list rooms, room lights | In progress: the visible half and the event log are built |
| 3. Memory | The compass (a living page about goals), a chronicle entry for every working chat, the scrying bowl for undecided things | |
| 4. The mind | Untangling with Claude, morning brief, nudges, patterns Munin notices | |
| 5. Showcase | Munin's Ledger (SQL), job application tracker, spreadsheet export, a public Tableau dashboard (counts and trends only) | |

**As a data portfolio:** the event log records every capture, sort, finish and hex, so my own working habits become a real dataset for SQL, spreadsheets and Tableau. Raw personal notes never leave the Cottage; only counts and trends are published.

## House rules

- Art drawn in code: palette `#0c0618`, `#ff7ad9`, `#dc5aff`; m5x7 for headings. Soft synthesized sound only. No generated images or audio.
- Works on phones.
- Never delete: hex into firewood, and only I burn it.
- Keep data shapes compatible; if one must change, migrate on load.
- A feature unused for two weeks goes on the woodpile.

---

Built by Sophia Papachristos (Hedgewitch Games), with Claude.
