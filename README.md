# Cat Keeper

**A little care, together.**

Cat Keeper helps volunteers and rescue teams coordinate care for community cats. Volunteers send photos and quick updates through a personal chat link. Cathy, the AI assistant, turns those messages into feeding records, sightings, and urgent care alerts connected to a shared rescue workspace.

Built by Paolo, Kevin, and Raf for the **DevDay Exchange Community Hackathon: Miami**, November 7–8, 2026, and the bonus challenge **Cat colony updates scattered across chats and photos**.

This repository contains the final hackathon app, originally developed in [kevinfiol/cat_colony_app](https://github.com/kevinfiol/cat_colony_app), with subsequent interface improvements. It replaces the earlier Sites prototype.

## What it does

- **Volunteer chats:** Share a personal link to collect messages, photos, and optional locations.
- **AI-assisted recordkeeping:** Cathy identifies the relevant colony and uses tools to record feedings, sightings, and care concerns.
- **Rescue dashboard:** See colony totals, urgent cases, new cat reports, and decisions waiting for review.
- **Cat profiles:** Keep photos, markings, sightings, history, and confirmed neuter status together.
- **Human review:** Confirm newly reported cats, review possible duplicates, and approve AI-requested changes to adopted, missing, or deceased status.
- **Urgent care follow-up:** Reply directly to volunteers, mark concerns handled, and preserve the follow-up note.
- **Live updates:** Server-sent events refresh conversations and dashboard notifications as updates arrive.
- **Responsive interface:** A shared navigation system, mobile menu, cat search, and the original Fredoka/Nunito typography and lavender palette.

## Run locally

Requires **Node.js 24 or later** and **pnpm**. The package manager version is declared in `package.json`.

```sh
git clone https://github.com/PaoloFiol/CatKeeper.git
cd CatKeeper
pnpm install
```

Copy `.env.example` to `.env` and add your OpenAI API key:

```dotenv
OPENAI_API_KEY=your_key_here
```

Start the app, binding it to this computer:

```sh
# macOS / Linux
HOST=127.0.0.1 pnpm dev
```

```powershell
# Windows PowerShell
$env:HOST = '127.0.0.1'
pnpm dev
```

Open **http://127.0.0.1:3000/admin** for the rescue workspace. Add a colony, add a known cat if appropriate, and create a volunteer chat. Open its personal `/chat/...` link in another tab to try the volunteer workflow. Volunteer messages trigger Cathy; messages sent from the admin chat are direct rescue replies.

`pnpm dev` and `pnpm start` apply pending database migrations automatically. For a separate migration step, run `pnpm migrate`.

### Optional sample data

On an empty database, `pnpm seed` creates fictional colony reports using the included sample photos. **Seeding calls the OpenAI API** and may incur API charges. It is optional; you can create records through the admin interface instead.

### Configuration and storage

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Enables Cathy and AI processing of rescue follow-up notes |
| `HOST` | Bind address; use `127.0.0.1` for local use |
| `PORT` | Server port; defaults to `3000` |
| `DB_PATH` | SQLite file; defaults to `data/app.db` |
| `GEOCODER_URL` | Optional Photon-compatible address lookup endpoint |

Messages, records, and uploaded photos are stored in SQLite. `.env`, `data/`, and installed dependencies are excluded from Git. This checkout does not include local databases or the configured API key.

The current app is intended for local demonstration: admin routes do not require sign-in, and anyone with a volunteer chat link can post in that conversation.

## Where the LLM is used

`src/agent.js` defines Cathy with the **OpenAI Agents SDK**, using `gpt-5.4-nano`. Cathy receives volunteer messages and attached photos, looks up colonies and known cats, and calls tools to update records. It can flag urgent concerns such as injury, sickness, pregnancy, kittens, or missing feeding coverage. Uncertain identities and important status changes use human review.

A second agent interprets an admin's handled-case note and can apply supported follow-up changes. Admin chat replies themselves are written by the rescue team.

There is no WhatsApp integration or push notification service; the volunteer chat runs in the browser.

## Technology

- Node.js and native `node:sqlite`
- h3 server and Tempura server-rendered templates
- OpenAI Agents SDK and Zod
- Plain JavaScript, CSS, and server-sent events
- Versioned SQL migrations

## Checks

```sh
pnpm test
```

The current tests cover colony location validation, address lookup, notifications, and review decisions.

## Source map

| Path | Purpose |
| --- | --- |
| `src/server.js` | Routes, forms, uploads, live updates, and template rendering |
| `src/agent.js` | AI agents, tools, and approval handling |
| `src/db.js` | SQLite queries and record operations |
| `src/views/` | Landing page, dashboard, chats, colonies, and cat profiles |
| `src/public/` | Shared styles and browser interactions |
| `migrations/` | Database schema changes |
| `scripts/` | Migration and optional sample-data scripts |
| `test/` | Automated checks |

Sample cat photographs and their licenses are credited in [seed/photos/CREDITS.md](seed/photos/CREDITS.md).
