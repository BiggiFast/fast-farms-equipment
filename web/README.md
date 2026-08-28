# MrCoryFast.com — Next.js rebuild

The new site. The old static site still lives in `../public/` and is still what
mrcoryfast.com serves. **Nothing here is live yet.**

See `../HANDOFF.md` for overall project status.

## Run it

```bash
cd web
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin (sign in with Supabase email + password)
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
  page.js                Home: the feed of all published updates
  projects/page.js       Project list, split into active vs past
  projects/[slug]/       One project + all its updates
  equipment/page.js      Listings, grouped by category
  equipment/[slug]/      ONE MACHINE PER PAGE — the SEO win
  about/page.js          Bio (still a placeholder — needs Cory's words)
  doug/page.js           In memory of Doug
  admin/
    login/               Sign in. Deliberately outside the (dashboard) group
                         so it shows no nav and no "Sign out"
    (dashboard)/         Everything requiring a login
      updates/           Post & edit updates — the main flow
      projects/          Create & edit projects
      equipment/         Manage listings
lib/
  queries.js             Every database read the public site makes
  adminApi.js            Every write the admin makes
  photos.js              Reads the jsonb photo array; handles legacy image_url
  slug.js                Title -> url-safe-slug
  resizeImage.js         Shrinks phone photos before upload
  supabase/              Three clients — see below
components/              Admin forms, photo uploader, shared fields
proxy.js                 Protects /admin and keeps the session alive
```

## Design status

**The visual design is not done.** Cory is working on it in Claude Design as of
August 2026. Everything here is deliberately plain — semantic markup with
minimal Tailwind, structured so styling can be dropped on without rewriting
the logic.

Colours come from `app/globals.css` and are carried over from the old site's
`main-styles.css` — Cory's own palette, described there as *"Oregon farm in
spring — warm, natural, grounded"*:

```
--color-bg     #fefefe   paper
--color-text   #1a1a1a   ink
--color-gold   #c9a227   from the golden-hour hero photo
--color-earth  #5c4a32
--color-sage   #7a8b6e
```

Exposed to Tailwind as `paper`, `paper-warm`, `ink`, `ink-muted`, `gold`,
`earth`, `sage`, `line`.

**The site is light-only on purpose.** There is no `prefers-color-scheme` block.
The Next.js starter shipped one, which made the whole site render dark on a
dark-mode Mac.

## The three Supabase clients

Not redundant — they solve different problems:

| File | Cookies? | Use for |
|---|---|---|
| `supabase/public.js` | No | Public reads. Cookie-free, which is what lets these run at build time inside `generateStaticParams` |
| `supabase/server.js` | Yes | Server Components that need the session |
| `supabase/client.js` | Yes | Browser — admin forms and uploads |

## Two decisions worth not undoing

**List queries fail soft; detail queries throw.** `getFeed`, `getProjects`, and
`getEquipment` log and return `[]` on error, so a transient database outage
can't break a deploy. `getEquipmentItem` and `getProject` deliberately throw
instead — rendering a blip as "not found" risks a cached 404 getting a live
listing deindexed.

**Inputs are 16px everywhere.** Below that, iOS Safari zooms the page when a
field is focused, which makes every form feel broken on a phone.

## Not built yet

- **The visual design** — the main remaining work
- **RSS feed** — important: it's what makes a self-owned feed followable, and
  independence from platform algorithms is the whole point of the project
- **Google Analytics** — the old site's `G-BDKD0NT6KJ` tag needs adding once,
  in `app/layout.js`
- **Deploy / cutover** — `../vercel.json` currently forces static serving of
  `public/`, so it needs changing before this app can go live
