# MrCoryFast.com — Next.js rebuild

The new site. The old static site still lives in `../public/` and is still what
mrcoryfast.com serves. Nothing here is live yet.

## Run it

```bash
cd web
npm run dev
```

Then open http://localhost:3000

> **npm cache note:** this machine has root-owned files in `~/.npm` from an old
> npm bug. If npm fails with `EACCES`, either run
> `sudo chown -R 501:20 "$HOME/.npm"` once to fix it permanently, or prefix
> commands with `npm_config_cache=/tmp/npm-cache`.

## Layout

```
app/
  layout.js              Header, footer, and site-wide metadata — written ONCE
  page.js                Home: the feed of all published updates
  projects/page.js       Project list, split into active vs past
  projects/[slug]/       One project + all its updates
  equipment/page.js      Listings, grouped by category
  equipment/[slug]/      ONE MACHINE PER PAGE — the SEO win
  about/page.js          Bio (still a placeholder — needs your words)
  doug/page.js           In memory of Doug
  admin/                 Private portal — phone-friendly. Sections:
                           updates/    post & edit updates (the main flow)
                           projects/   create & edit projects
                           equipment/  manage listings
components/              Admin forms, photo uploader, shared fields
middleware.js            Protects /admin and keeps the session alive
lib/
  queries.js             Every database read the public site makes
  photos.js              Reads the jsonb photo array; handles legacy image_url
  slug.js                Title -> url-safe-slug
  supabase/public.js     Cookie-free client for public reads (and build time)
  supabase/server.js     Cookie-aware client for Server Components
  supabase/client.js     Browser client for the admin
```

## The three Supabase clients

Not redundant — they solve different problems:

- **public.js** — no cookies. Public pages only show published content, so they
  don't care who's signed in. Skipping cookies is also what lets these queries
  run at build time.
- **server.js** — cookie-aware, for Server Components that need the session.
- **client.js** — browser-side, for the admin forms and photo uploads.

## Not built yet

- RSS feed
- Google Analytics (the old site's G-BDKD0NT6KJ tag needs re-adding, once)
- Real visual design — waiting on the Claude Design wireframes
