# MrCoryFast.com

Personal site for Cory Fast — a **creator site**: a feed of projects, with the
farm equipment sale kept as one section.

Built with Next.js 16, Supabase, and deployed on Vercel.

> **Start with [`HANDOFF.md`](HANDOFF.md)** for current status and what's next.

## Run it

```bash
npm install
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin (Supabase email + password)
- **From your phone**: use the `Network:` URL Next prints on startup, on the
  same wifi. Worth doing — the admin was built for phone use.

> **npm cache note:** this machine has root-owned files in `~/.npm` from an old
> npm bug. If npm fails with `EACCES`, either run
> `sudo chown -R 501:20 "$HOME/.npm"` once to fix it permanently, or prefix
> commands with `npm_config_cache=/tmp/npm-cache`.

## Layout

```
app/
  layout.js              Header, footer, and site-wide metadata — written ONCE
  page.js                Home: the hero, plus the feed once anything is posted
  projects/              Project list and per-project pages with their updates
  equipment/             Listings, and ONE PAGE PER MACHINE — the SEO win
  about/  doug/          About, and the memorial page for Cory's father
  admin/
    login/               Sign in. Outside the (dashboard) group so it shows
                         no nav and no "Sign out" to someone signed out
    (dashboard)/         Everything requiring a login: updates, projects,
                         equipment
lib/
  queries.js             Every database read the public site makes
  adminApi.js            Every write the admin makes
  photos.js              Reads the jsonb photo array; handles legacy image_url
  supabase/              Three clients — see docs/APP_NOTES.md
components/              Site chrome, admin forms, photo uploader
proxy.js                 Protects /admin and keeps the session alive
supabase/migrations/     Every schema change, in order
legacy/                  The original static site. NOT served — kept for
                         reference while the new design is in progress
```

## Where the documentation lives

| File | What it's for |
|---|---|
| **[`HANDOFF.md`](HANDOFF.md)** | **Read first.** Current state, what's next, what's blocked |
| [`DECISIONS.md`](DECISIONS.md) | Why things are the way they are. Append-only |
| [`docs/APP_NOTES.md`](docs/APP_NOTES.md) | How the app works: the three Supabase clients, the CSS approach, decisions worth not undoing |
| [`docs/SURVEY_SPEC.md`](docs/SURVEY_SPEC.md) | Spec for the family equipment-ownership survey |
| [`docs/PROJECT_SUMMARY.md`](docs/PROJECT_SUMMARY.md) | The original static site, now in `legacy/` |
| [`docs/`](docs/) | Reference: admin setup, security |
| [`docs/archive/`](docs/archive/) | Finished history. Kept, not maintained |

### Secret protection

**This repo is public.** A `pre-commit` hook in `.githooks/` blocks commits
containing anything secret-shaped — JWTs, private keys, `.env` files, or a
variable named `*_SECRET` / `*_SERVICE_ROLE_KEY` with a real value.

It's enabled by `git config core.hooksPath .githooks`, which is already set on
this machine. After a fresh clone, run that once to turn it back on.

Secrets belong in `.env.local` (gitignored) and in Vercel's Environment
Variables. `git commit --no-verify` bypasses the hook — use it only when you're
certain it's a false alarm.

The Supabase **anon** key is safe in the browser by design; Row Level Security
is what protects the data.

### Saving state between sessions

Work happens in short bursts, so there is a `/save-state` command
(`.claude/skills/save-state/`). Say **"checkpoint"** or "I am stopping for now"
and Claude commits outstanding work, updates `HANDOFF.md`, logs any decisions,
and refreshes its memory — so nothing lives only in a chat window.
