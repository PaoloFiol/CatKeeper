# CatKeeper

**Every cat. Every colony. One place.**

CatKeeper turns scattered cat colony chats and photos into organized sightings, feeding records, and care tasks—helping rescue teams track every cat and coordinate care.

Built by Paolo, Kevin, and Raf for the DeepStation hackathon, November 7–8, 2026, and the bonus challenge **Cat colony updates scattered across chats and photos**.

[Open CatKeeper](https://catkeeper-colonies.paolo-fiol97.chatgpt.site) · [Try the app](https://catkeeper-colonies.paolo-fiol97.chatgpt.site/dashboard)

![A fictional ginger cat in a sunlit courtyard](public/images/catkeeper-courtyard.webp)

## What it does

- **Update inbox:** Paste a conversation, review each proposed update, and attach its photo.
- **Shared colony records:** Track confirmed cats, feeding visits, and care concerns across browsers.
- **Identity review:** Confirm whether a sighting belongs to an existing cat before changing the census.
- **Source history:** Preserve original messages, photos, and identity decisions; reopen a mistaken decision when safe.
- **Care coordination:** Claim and resolve tasks, set deadlines, and see overdue follow-ups.
- **Cat directory:** Search cats by name or colony and track confirmed TNR status.
- **Duplicate handling:** Skip repeated imports and safely retry saves.
- **Export:** Download shared records as JSON.

## Try the complete workflow

1. Open the app and select **Inbox**.
2. Choose **Try a sample conversation**, then **Review proposed updates**.
3. Review the feeding event, uncertain cat sighting, and feeding-coverage request. Optionally attach a fictional photo to its update.
4. Confirm the batch. Unidentified sightings wait for identity review without increasing the census.
5. Review the sighting as Mango, then claim the resulting task on the **Action board**.
6. Open **Source history** to see the original evidence and decisions. Another browser sees saved changes on refresh or the eight-second polling cycle.

The public demo can be browsed without signing in. Saving records, claiming tasks, and uploading photos require ChatGPT sign-in. Signed-in visitors share the fictional demo workspace.

## Current AI status

**No live LLM is connected.** Update suggestions currently use explicit text rules. Cat candidates use the colony and described coat; uploaded photos are stored and displayed, not analyzed. People confirm identities and TNR status.

The next AI integration is structured extraction from conversations and photos, with source evidence and human review. There is currently no WhatsApp integration or push notification service.

## Technology

- React, TypeScript, and Vinext (Vite with Next.js-compatible app routes)
- Cloudflare Workers for server routes
- Cloudflare D1 and Drizzle for shared records and migrations
- Cloudflare R2 for uploaded photos
- Sites hosting and Sign in with ChatGPT
- Lucide icons and a custom responsive interface

## Local development

Requires **Node.js 22.13 or later**, npm, and Git.

```sh
git clone https://github.com/PaoloFiol/CatKeeper.git
cd CatKeeper
npm ci
npm run build
```

Apply the database schema to the local preview database once:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_silly_proteus.sql
```

Start development:

```sh
npm run dev -- --host 127.0.0.1
```

Open the localhost URL printed in the terminal. The local database is initialized with fictional colonies and cats on first access. Local development simulates ChatGPT sign-in at `/signin-with-chatgpt?return_to=/dashboard`; this simulation is excluded from production builds.

Local D1 and R2 data are separate from production. A fresh clone does not contain the hosted database or uploaded files.

## Checks

```sh
node --experimental-strip-types --test tests/workspace.test.mjs
npm run build
node node_modules/typescript/bin/tsc --noEmit
```

The workflow tests cover duplicate imports, retry safety, identity confirmation and correction, census changes, task ownership, older feeding reports, and input validation.

## Source map

| Location | Purpose |
| --- | --- |
| `app/landing.tsx`, `app/landing.css` | Landing page |
| `app/dashboard/page.tsx` | Dashboard, cats, colonies, reviews, and tasks |
| `app/inbox.tsx`, `app/inbox.css` | Conversation inbox and evidence history |
| `app/api/` | Shared workspace and photo endpoints |
| `lib/model.ts` | Record types and fictional seed data |
| `lib/intake.ts` | Text-based update proposals |
| `lib/workspace.ts` | Validated commands and record transitions |
| `db/`, `drizzle/` | Schema and migration |
| `tests/` | Workflow tests |

## Deployment

The existing public Site is configured by `.openai/hosting.json`. Its `DB` and `BUCKET` bindings are provisioned by Sites. Authentication is supplied by the hosting platform; the application is not configured as a standalone GitHub Pages site.

**Pushing to this GitHub repository does not automatically update the live Site.** Publish through Sites after testing changes. The repository contains the app source and deployment configuration, not runtime records or credentials.

See [platform development notes](docs/PLATFORM.md) for build, storage, and authentication details. Deployments outside Sites need equivalent database, storage, and trusted authentication integrations.

## Prototype scope

Use fictional information in this public hackathon demo. The current implementation stores a bounded workspace document with revision checks; larger rescue operations would need a more granular data model, membership controls, and operational hardening.

The hero image is AI-generated fictional artwork. Third-party notices are retained in `vendor/` and `scripts/vite/`.
