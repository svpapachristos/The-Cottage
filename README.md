# The Cottage

My single place for everything (formerly "My Brain"): projects, plans, pages, to-dos, questions, decisions, notes, ideas and history, laid out as a pixel witch cottage with one room for each part of life. Munin the raven sorts and answers; Salem the cat sleeps by the Hearth. It runs on my own server, installs as an app on my PC and phone, and Claude connects to it from any chat.

| Room | Holds |
|---|---|
| Workshop | Hedgewitch Games |
| Coven Chamber | Coven |
| Observatory | Stargazer |
| Study | School |
| Writing Desk | Jobs and money |
| Hearth | Life, the big picture, and the woodpile |
| Book of Shadows | Runes (quick thoughts) waiting for Munin to sort into the rooms |

- **Runes** are written in the Book of Shadows (or with the quill button). Munin reads each one right away. If he's sure where it belongs, he flies it there; otherwise it waits in the book with his suggestion.
- **Objects and threads:** each project is an object on its room's shelf (Witchbottle is the terrarium jar). Pick one up to see:
  - the one next step
  - its thread: the steps toward a waystone, even ones in other projects
  - what's tied to it
  - drawers for steps, notes, pages, someday-ideas and history

  Anything that isn't part of a project goes in the room's basket.
- **The rune table** is for working on one thing. Set an object on it to see what's being built, where it's going and what's done, with a focus candle and a jot box. A stray thought goes to Munin instead of pulling you off the task.
- **Pages** hold long plans, roadmaps and briefs, and keep every old version.
- **Hex into firewood** instead of deleting: the note arcs onto the woodpile as a log. In the Hearth you drag a log into the fire to burn it for good, or pull it back off the pile.
- **The Sending:** everything finished today lights a lantern on the road out of the door. The road forks into three trails (Job, Games, School) with waystones for the big milestones.
- **Closing up for the night:**
  1. Empty your head into the book.
  2. See what you sent out.
  3. Feed the fire.
  4. Pick tomorrow's first thing.
  5. Lights out.

## How it's built
**The app** (`src/`): one self-contained page.
- `src/shell.html` holds the layout and styles.
- `src/js/` holds the scripts, in order:

| Script | What it does |
|---|---|
| `01-data` | Storage, server sync and the offline outbox, the woodpile, backups, threads |
| `02-art` | Every picture, drawn in code |
| `03-views` | Home, rooms, the held object, pages, library, the book |
| `04-sheets` | Writing, editing, planning, settings |
| `05-munin` | Sorting, weaving threads, answering |
| `06-ritual` | Closing up for the night |
| `07-sound` | Soft synthesized sounds, off by default |
| `08-main` | Clicks and the animation loop |
| `09-table` | The rune table, baskets, the fireplace |
| `99-start` | Starts the app |

- `python src/build.py` joins them, embeds the m5x7 font, and writes `index.html` plus `server/public/` (with the app manifest, service worker and icons).

**The server** (`server/`): a Cloudflare Worker in TypeScript.

| File | What it does |
|---|---|
| `schema.sql` | The database (Cloudflare D1, which is SQLite) |
| `src/db.ts` | Reading and writing, and syncing changes between devices |
| `src/auth.ts` | Signing in with one passphrase; sessions stored as hashes |
| `src/mcp.ts` | The Claude connector: 8 tools over MCP, behind OAuth |
| `src/ai.ts` | Munin's sorting and answers, with Workers AI |
| `src/index.ts` | The routes, plus the OAuth provider |

Setup: `SETUP.md`. How Claude reads and writes it: `COTTAGE.md`.

### The data side
- **One table, flexible documents, real indexes.** Every note, project and setting is a row in `docs` with its JSON in `data`. The fields the app searches and sorts by (`kind`, `area`, `project`, `done`, `wood`, `updated`) are generated columns pulled out with `json_extract`, so they can be indexed like normal columns while the documents stay schema-free.
- **Syncing devices with a change counter.** Every write bumps one counter (`rev`) inside the same batch as the upsert, so writes are atomic and ordered. A device asks for `rev > N` and gets exactly what changed since it last looked. Deletes are kept as tombstones (`deleted = 1`) so other devices find out about them too.
- **Offline first.** The app keeps a local cache and an outbox of writes. When the connection comes back, it sends them in batches of 100.
- **Security:**
  - The passphrase is checked with a constant-time hash compare, and failed sign-ins are rate-limited.
  - Session tokens are stored only as SHA-256 hashes, in an `HttpOnly`, `Secure` `__Host-` cookie.
  - Every write needs a custom header, which blocks cross-site forgery.
  - The Claude connector uses OAuth 2.1 with PKCE (proof key for code exchange), and the consent page asks for the passphrase again.

## Backups
In the menu, "Download backup" saves everything as one `.json` file, and "Restore from a backup" brings it back (old My Brain backups work too). Keep them in `backups/`.

## Built with
TypeScript, SQLite (D1), Cloudflare Workers, KV and Workers AI, plain JavaScript, canvas pixel art drawn in code with Bayer dithering, WebAudio sounds, and the m5x7 font (Daniel Linssen, CC0). No generated images or audio.
