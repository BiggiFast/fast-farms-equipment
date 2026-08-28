# Where we left off — 2026-08-27

## The direction

MrCoryFast.com is pivoting from an equipment-sales site to a **creator site**:
a feed of projects Cory is working on, self-hosted so it doesn't depend on
anyone else's algorithm. The equipment sale stays as a section — it's Doug's
equipment (Cory's dad, who died in late 2024), and the sale is being handled
for Cory's mom.

Being rebuilt in **Next.js**, in `web/`, alongside the old static site.
**The old site in `public/` is still what mrcoryfast.com serves. Nothing new
is live.**

## Done

**Database** (migrations 001-003 have been RUN against Supabase)
- `projects` + `updates` tables. An update may belong to a project or stand
  alone. Drafts via `is_published`; `published_at` separate from `created_at`.
- `project-images` storage bucket, separate from `equipment-images`.
- `slug` column on `equipment`, backfilled. All six real listings have good
  year-make-model URLs.

**Next.js app in `web/`** — builds clean, lints clean
- Feed, projects list, project detail, equipment list, **one page per machine**,
  about, Doug.
- `/admin` — private, phone-friendly, sectioned into Updates / Projects /
  Equipment. Photo upload resizes to 1200px before sending.

**Cleanup**
- Deleted orphaned `public/main-index.html` and `public/main-about.html`.
  (`main-styles.css` is NOT dead — it styles the live brand pages.)

## Do this first tomorrow

1. **Run `supabase/migrations/004_relist_equipment.sql`** — decision pending.
   Cory's six real listings are currently `is_active = false` (switched off
   during family drama that has since passed), so the public equipment page
   shows only a "Site UPDATE" post. This relists the six and retires that post.
   Running it makes the equipment publicly visible on the CURRENT live site.
   Cory had not decided yet whether to run it tonight.

2. **Try the admin locally**: `cd web && npm run dev`, open
   `localhost:3000/admin`, sign in with Supabase credentials, post a test
   update. Never yet run by a human — untested end to end.

## Still to build

- RSS feed (important: it's what makes a self-owned feed followable)
- Google Analytics — the old site's `G-BDKD0NT6KJ` tag needs adding once, in
  `app/layout.js`
- **The visual design** — Cory is wireframing in Claude Design. Everything
  built so far is deliberately plain markup waiting to be styled.
- Deploy/cutover plan for pointing mrcoryfast.com at the Next.js app

## Needs Cory, not code

- **About page is still the old placeholder** ("This space is waiting for your
  story"). Needs his actual bio.
- **Doug's page says "passed away one year ago"** — it's been closer to two.
  Naming the year instead would stop it drifting. His words to write, not mine.

## Gotchas

- **npm cache**: `~/.npm` has root-owned files from an old npm bug. npm fails
  with EACCES. Permanent fix: `sudo chown -R 501:20 "$HOME/.npm"`. Workaround
  used so far: prefix commands with `npm_config_cache=/tmp/npm-cache`.
- **Three Supabase clients, on purpose**: `public.js` (no cookies — needed for
  build-time queries), `server.js` (cookie-aware), `client.js` (browser).
- List queries fail soft (return `[]`, log loudly) so a database blip can't
  break a deploy. Detail queries throw deliberately — a blip must not render
  as a 404 and get a listing deindexed.
