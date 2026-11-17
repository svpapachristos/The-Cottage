# The Cottage: how any chat reads and writes it

The Cottage is Sophia's home base: one place for every project, plan, to-do, question, decision, note, idea and page across game dev, work and school. It replaces "My Brain" (same data), so plans live here instead of being remade in new chats.

**Where it lives.**
- Her own Cottage server, a Cloudflare Worker (`server/`, set up with `SETUP.md`), at `https://the-cottage.<her-subdomain>.workers.dev`. Once she has moved her notes in, it is the real Cottage. Claude reaches it through the **The Cottage** custom connector (tools named `cottage_*`).
- Before the move, and as a fallback: the claude.ai artifact at https://claude.ai/artifact/ASvffwtJSqQ56Dzs2p7SSV (slug `4c80ea5e-2e0e-4190-95c8-135f48dc0bca`), read and written with the artifact database tools (`db_list` / `db_query` / `db_get` / `db_write`).
- If the `cottage_*` tools are in the chat, use them and leave the artifact alone. It goes stale after the move.

## For Claude in any chat (you are Munin)
- **Read first.** Before planning or answering anything about her games, jobs or school, read the cottage. With the connector: `cottage_overview`, then `cottage_search` / `cottage_read` for the project or page you need. Without it: pinned pages (`kind: "doc"`, `pinned: true`), the room or project, and `meta/road`.
- **Write back.** When a chat produces a plan, roadmap, brief, handoff, decision, to-do or idea that Sophia agrees with, save it before the chat ends. Plans become pages (`kind: "doc"`). Don't leave plans only in the chat.
- **Quick, unsorted thoughts** go into the **Book of Shadows** as runes (`cottage_write_rune`, or `area: "book"` with a `suggest`), so Munin in the app can sort them.
- Mark what you add with `"by": "Claude"` and `"seen": false`. The connector does this for you. It shows up as "New from Munin" with a feather.
- **Never delete.** Removing something means hexing it into firewood (`cottage_hex`, or set `wood` to the current time in ms). It lands as a log on the woodpile by the hearth, and only Sophia burns it: she drags the log into the fire, or burns the pile in the closing ritual.
- **Threads.** Each project can have a `thread`: its steps in order toward a waystone, including steps that live in other projects. When a chat plans a project's path, save it as the project's thread (`cottage_save_project`). Tie related things together with `links`.
- **Changing a page:** read it first. The connector keeps the old version in `history` for you. With the artifact tools, push the old `{title, body, at: <old updated>, by}` onto the front of `history` (keep 15 at most), then write the new body and pass the document's version as `ifVersion`.
- Write only what Sophia asked for or clearly agreed to. American spelling.

### Connector tools
| Tool | Does |
|---|---|
| `cottage_overview` | The road, today's picks, every room and project with its next step, runes waiting, pinned pages |
| `cottage_search` | Finds anything by words |
| `cottage_read` | One thing in full: `p:<project id>` (with its thread) or `i:<item id>` (pages include their history) |
| `cottage_write_rune` | A quick thought into the Book of Shadows, with Munin's guess at where it belongs |
| `cottage_save_item` | Creates or updates a to-do, question, note, idea, decision, link, page or log |
| `cottage_save_project` | Creates or updates a project, including its thread, links and object |
| `cottage_hex` | Hexes something into firewood (the old name `cottage_toss` still works) |
| `cottage_reach_waystone` | Marks a milestone on a trail reached or not |

## Rooms (`area`)
| area | Room | Holds |
|---|---|---|
| games | Workshop | Hedgewitch Games: the small browser games, website, itch.io, ads |
| coven | Coven Chamber | Coven, her big witch roguelite (life's work) |
| stargazer | Observatory | Stargazer, her universe simulation |
| school | Study | Getting back into school, choosing a degree |
| jobs | Writing Desk | Job search, resume, money, the Cottage as her SQL/data project |
| life | Hearth | Life, the big picture (the grimoire pages), and the woodpile |
| book | Book of Shadows | Runes waiting to be sorted (old notes may still say `inbox`; same thing) |

Every room's shelf ends with a basket, **Odds and ends**: the items in that room that don't belong to a project. Its id is `_loose-<area>` (for example `_loose-games`). It isn't stored anywhere; it's those items gathered together.

## Data
**`items/<id>`**: everything except projects.
| Field | Meaning |
|---|---|
| kind | `todo`, `question` (waiting on her), `note`, `idea`, `decision`, `link`, `doc` (a page: plan, roadmap, brief, handoff), `log` (something done) |
| title, body | Text. Pages use Markdown: `#` headings, `-` lists, `\|` tables, `**bold**`, links |
| area, project | Room, and a project id or "" (no project means it's in the room's basket) |
| done, doneAt | To-dos and questions; `doneAt` (ms) lights a lantern on The Sending that day |
| answer | Her answer to a question (answered questions count as done and show under Decided) |
| pick | `today` or `week`: on her Today / This week lists |
| pinned | Shown first; pinned pages form the grimoire in the library |
| link, date | Optional URL; `date` (`YYYY-MM-DD`) on `log` items |
| suggest | Book of Shadows only: `{kind, area, project, title, sure}`, where Munin thinks it belongs |
| jotFrom | A rune jotted at the rune table: the id of the project that was on the table |
| history | Pages only: older versions, newest first, `[{title, body, at, by}]` |
| seen | `false` = new from Munin (feather) until she opens it |
| wood | ms when hexed into firewood (hidden everywhere except the woodpile) |
| links | Ties to other things: `["p:<project id>", "i:<item id>"]`. Each side shows the other under "Tied to this" |
| created, updated | ms since 1970 |
| by | `Sophia` or `Claude` |

**`projects/<id>`**:
- Fields: name, area, status, version, link, linkLabel (button text such as "Play"), next (next step, used when there are no steps), notes (About), order, trail (`job`, `games`, `school`, or "" to follow the room), obj, thread, links, wood, created, updated.
- **obj** is its object on the shelf: `jar`, `orrery`, `star`, `army`, `chart`, `potion`, `chest`, `wand`, `globe`, `cauldron`, `telescope`, `ledger`, `letter`, `cap`, `feather` or `book`. "" lets the app pick.
- **thread** is the project's steps in order, each one a reference:
  - `"i:<item id>"`: a to-do anywhere in the cottage
  - `"w:<trail>:<waystone id>"`: a milestone
  - `{"t": "a step not planned yet", "d": false}`: a step not planned yet

  With no thread, the app works one out from the project's to-dos plus its trail's next waystone. The first unfinished step is "the one next step".

**`meta/road`**: The Sending's three trails, each a list of waystones in order: `{job: [...], games: [...], school: [...]}`, each `{id, title, done, doneAt}`.
**`meta/table`**: what's on the rune table: `{project, since}` (a project id or basket id, or "" for an empty table).
**`meta/night`**: the closing ritual: `{closed, lastNight, closedAt, first, streak}` (`closed` is the night's date while the cottage is asleep; `first` is tomorrow's first thing).
**`meta/focus`**: old "today's focus" text from My Brain (no longer shown).

## The app
- **Home:** the cottage in cross-section. Rooms light up when something's waiting, fireflies mark things finished this week, Salem sleeps by the Hearth (pet him), and Munin perches by the Book of Shadows. The Sending road shows lanterns for today's finished things and three trails with waystones. Alongside are:
  - Munin's greeting and satchel (runes waiting, new from chats, questions waiting)
  - The rune table card
  - Today, with This week folded under it
  - The road ahead
  - "Close up the cottage for the night"
- **Three layers:** the road is the why, the shelves are the what, and the rune table is the now.
- **Rooms** show projects as objects on a shelf, plus the room's basket. Picking one up shows the held card: the one next step, the thread, what's tied to it, questions waiting, and drawers (Steps, Notes and decisions, Pages, Someday, History).
- **The rune table** holds one thing set down to work on. It shows that object on a rune circle, with one rune lit for each finished step. It has a focus candle (15, 25, 45 or 60 minutes) and four panels:
  - Being built: the one next step
  - Where we're going: the waystone and the thread
  - What we've done
  - Thoughts: a jot box that goes to Munin and the Book of Shadows, so a stray thought doesn't pull her off the task
- **Hexing** throws the note onto the woodpile as a log. In the Hearth the logs sit by the fire: drag one in to burn it for good, or pull it back off the pile.
- **Munin** files new runes on his own when he's sure where they belong (a setting in Cottage keeping); the rest wait in the Book of Shadows with his suggestion.
- **Closing ritual:** empty your head into the book, see what you sent out, feed the fire (drag the logs in, or burn them all), pick tomorrow's first thing, lights out.
- **Code:** `Documents\GitHub\MyBrain`.
  - App: `src/shell.html` + `src/js/*.js`; `python src/build.py` writes `index.html` (the artifact) and `server/public/` (the app the server hands out, with its install files).
  - Server: `server/` (Worker, D1 database, sign-in, Claude connector).
- **Backups:** Cottage keeping (menu) > Download backup. Restore accepts old My Brain backups too.
