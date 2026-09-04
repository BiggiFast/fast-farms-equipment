# HANDOFF — MrCoryFast.com

**Last updated: 2026-09-03**
**Branch: `nextjs-rebuild` (not `main`)**

Start here. This is the living "where are we" document.

- **Why** something is the way it is → `DECISIONS.md`
- How the new app works → `web/README.md`
- The survey requirements → `docs/SURVEY_SPEC.md`
- The original static site → `docs/PROJECT_SUMMARY.md`

Say **"checkpoint"** at the end of a work session and this file gets updated
along with everything else. See `.claude/skills/save-state/`.

---

## The direction

MrCoryFast.com is becoming a **creator site**: a feed of projects Cory is
working on, with updates posted over time. The goal is a following that isn't
dependent on someone else's algorithm — so self-hosting and RSS matter, not
just appearance.

The **equipment sale stays** as a section people can still use. It's Doug's
equipment — Cory's father, who died in December 2024 — and the sale is being
handled for Cory's mom.

Being rebuilt in **Next.js 16**, in `web/`, alongside the old static site.

> **The old site in `public/` is still what mrcoryfast.com serves.
> Nothing new is live. No deploy has happened.**

---

## Current state

### Done and verified

**Database** — migrations 001-004 applied to Supabase
- `projects` + `updates` tables
- `project-images` storage bucket, separate from `equipment-images`
- `slug` column on `equipment`, backfilled
- Equipment relisted; the non-equipment "Site UPDATE" post retired

**Next.js app in `web/`** — builds clean, lints clean
- Feed, projects list, project detail, equipment list, **one page per machine**,
  about, Doug
- `/admin` — private, phone-friendly, sectioned Updates / Projects / Equipment
- Verified working locally: 5 equipment pages render with their own titles and
  Product structured data carrying the price

**Design ported** — 2026-09-03
- The Next.js app now looks like the current site: full-viewport hero with its
  gradient overlay, transparent header over it, solid header elsewhere, the
  three-font system (EB Garamond / Bebas Neue / Montserrat), warm palette,
  category pills, footer
- Written as semantic classes in `app/globals.css`, not Tailwind utilities, so
  swapping in the new design later is one file
- Fonts self-hosted via `next/font` rather than fetched from Google per visit
- The homepage feed renders only once something is published, so today it looks
  byte-for-byte like the live site

**Safety**
- `.githooks/pre-commit` blocks secret-shaped commits. Repo is public

**Cleanup**
- Removed orphaned `public/main-index.html`, `public/main-about.html`
- `main-styles.css` is **NOT** dead — it styles the live brand pages

### Live equipment (5 listings)

```
/equipment/2014-case-ih-magnum-380-tractor
/equipment/case-2023-farmall-140a-with-l140-loader
/equipment/case-ih-combination-harrow-cultivator-with-basket-roller
/equipment/new-holland-240-fp-corn-chopper-with-chopper-head
/equipment/new-holland-h7230-haybine-hay-conditioner
```

The 1995 International Harvester 4900 Grain Truck is intentionally hidden —
**it sold**. Five old test rows (`tractor`, `chevy truck`, `dodge pickup`,
`Cultivator`, `cultivator 197`) are soft-deleted and should stay that way.

---

## In progress — as of 2026-09-03

**Waiting on Cory to read `docs/SURVEY_SPEC.md` (v2).** He'll get to it
tomorrow. Nothing else is blocked.

The survey spec was rewritten today after he described the real threat model:
some family members have an incentive to avoid establishing who owned what, so
they can later claim machinery as their own. See `DECISIONS.md` for the full
reasoning. v1 is archived at `docs/archive/SURVEY_SPEC_v1_allowlist.md`.

He is also still designing the new layout in Claude Design, in spurts.

---

## Next up — agreed plan, in this order

1. ~~**Port the existing design into the Next.js app**~~ **DONE 2026-09-03.**
   The site now looks like the current one: hero, three-font system, warm
   palette, category pills, footer. Verified in the browser by Cory.
2. **Push the branch and check the Vercel preview.** Confirmed safe: Vercel
   deploys production only from `main`, there are no deploy hooks, and the
   current `vercel.json` uses the legacy `builds` array which makes Vercel skip
   framework detection entirely — so a branch push cannot affect the live site.
   **Note the repo is PUBLIC.**
3. **Cut over mrcoryfast.com.** This is the `vercel.json` rewrite. Rollback is
   reverting one file.
4. **Build the survey** per `docs/SURVEY_SPEC.md` v2, in stages: schema and the
   four SECURITY DEFINER functions, then the token pages, then admin
   People/Items, then Results + both CSV exports.
5. **RSS feed** — what makes a self-owned feed followable.
6. **Google Analytics** — `G-BDKD0NT6KJ`, once, in `app/layout.js`.
7. **Apply the new design** when the wireframes are ready. Same mechanism as
   step 1 — edit `app/globals.css`, not every component.

### Nothing to fetch before the survey

Earlier this file said Cory needed a `SUPABASE_SERVICE_ROLE_KEY` and his
Supabase user UUID. **The service role key is no longer needed** — v2 designs it
out entirely. The only manual step is seeding `survey_admins` with his user id,
which is a one-line SQL insert we can generate at build time.

## Needs Cory, not code

- **About page is still the old placeholder** — "This space is waiting for your
  story." Needs his actual bio. No framework fixes this.
- **Doug's page says "passed away one year ago."** Per `PROJECT_SUMMARY.md` he
  died in **December 2024**, so it's closer to two years. Naming the year would
  stop it drifting every year. **His words to write — do not silently edit.**

---

## How to run it

```bash
cd web
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin (Supabase email + password)
- From a phone on the same wifi: use the Network URL Next prints on startup

---

## Gotchas worth knowing

**npm cache is broken on this machine.** `~/.npm` contains root-owned files from
an old npm bug; npm fails with `EACCES`. Permanent fix, run once:

```bash
sudo chown -R 501:20 "$HOME/.npm"
```

Workaround used so far: prefix commands with `npm_config_cache=/tmp/npm-cache`.

**Three Supabase clients, on purpose** — not redundant:
| File | Cookies? | For |
|---|---|---|
| `lib/supabase/public.js` | No | Public reads. Cookie-free so it also works at build time inside `generateStaticParams` |
| `lib/supabase/server.js` | Yes | Server Components needing the session |
| `lib/supabase/client.js` | Yes | Browser — admin forms, uploads |

**List queries fail soft, detail queries throw.** Lists log and return `[]` so a
database blip can't break a deploy. Detail pages deliberately throw instead — a
blip rendering as "not found" risks a cached 404 getting a live listing
deindexed.

**`proxy.js`, not `middleware.js`.** Next 16 renamed the convention. This file
guards `/admin`; if you touch it, re-verify that a signed-out request to
`/admin` still 307s to `/admin/login`.

**Commits are scanned for secrets.** `.githooks/pre-commit` blocks anything
secret-shaped — env files, JWTs, PEM keys, `*_SECRET` with a real value. Enabled
with `git config core.hooksPath .githooks`; re-run that after a fresh clone.
The repo is **public**, so a leaked key can't be un-leaked by rotating it.

**The admin is light-only by design.** `globals.css` has no
`prefers-color-scheme` block. The starter's dark override was removed because
the site rendered dark on a dark-mode Mac.

---

## Branch and repo

- Working branch: **`nextjs-rebuild`** — nothing pushed to GitHub yet
- `main` is untouched and is what Vercel deploys
- Remote: github.com/BiggiFast/fast-farms-equipment

If `web/` seems to vanish, you're on `main`. `git checkout nextjs-rebuild`
brings it back.
