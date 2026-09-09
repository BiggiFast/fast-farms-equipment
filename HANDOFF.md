# HANDOFF — MrCoryFast.com

**Last updated: 2026-09-08 — THE SURVEY IS LIVE. Test data cleared; awaiting real people**
**Branch: `main` at `f7161ae` — merged and deployed. The `survey` branch is now redundant**

Start here. This is the living "where are we" document.

- **Why** something is the way it is → `DECISIONS.md`
- How the app works → `docs/APP_NOTES.md`
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

Rebuilt in **Next.js 16**, at the **repository root**. The original static site
is preserved in `legacy/` and is not served.

> ## ✅ Launched 2026-09-04
>
> **mrcoryfast.com now serves the Next.js site.** The cutover was merging
> `nextjs-rebuild` into `main`, which removed `vercel.json` and let Vercel run
> the Next.js build.
>
> **Rollback**, if ever needed: `git revert -m 1 3885684 && git push`. That
> restores `vercel.json` and the old static site within a couple of minutes.

---

## Current state

### Done and verified

**Database** — migrations 001-004 applied to Supabase
- `projects` + `updates` tables
- `project-images` storage bucket, separate from `equipment-images`
- `slug` column on `equipment`, backfilled
- Equipment relisted; the non-equipment "Site UPDATE" post retired

**Next.js app at the repo root** — builds clean, lints clean
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

**The family equipment survey** — LIVE on 2026-09-08
- Database applied to **live Supabase** already: five tables, one view, four
  `SECURITY DEFINER` functions, the `survey-images` bucket, Cory seeded as the
  only survey admin. Verified by `006_VERIFY_survey.sql` (all PASS) and
  `006_VERIFY_survey_live.sql` (all PASS)
- Family pages: confirmation screen, the survey itself, auto-save, photo zoom
- Admin: **People** (revoke / reactivate / regenerate / freeze, device count,
  visit history), **Items** (photograph one, or pull from an equipment
  listing), **Results** (matrix, consensus, inline confirmed owner, two CSVs)
- Revoking someone now shuts a page they already have open, on their next tap
- Photos come before the names on each card, and the viewer moves between
  them with arrows, swipe, keyboard and a "2 of 3" counter
- **Verified against production** after the merge: a bad token returns no
  survey markup at all (0 cards, 0 radios, 0 names); survey pages emit
  `no-referrer` and `noindex` and contain no cross-origin links; every
  `/admin/survey*` route 307s to login; home, equipment, contact, Doug and
  about all 200; the tractor page still carries `"price":183000`
- 15 checks pass on the consensus rules and CSV quoting, 9 on photo navigation
- **Test data cleared 2026-09-08.** The survey currently has no people and no
  items — that is the next job, not a fault

**Safety**
- `.githooks/pre-commit` blocks secret-shaped commits. Repo is public
- `app/robots.js` is **new** — the site previously had no robots.txt at all.
  Allows the site, disallows `/admin`, `/survey`, `/api`

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

## What shipped 2026-09-04

Steps 1-6 of the plan are done.

- **Design ported** — the site looks as it did before, so nobody arrived to
  find a renovation in progress
- **Deployed** — via a Vercel preview first, then merged to `main`
- **Per-machine equipment pages**, server rendered with their own titles,
  descriptions, share images and `Product` structured data carrying the price.
  Verified live: `/equipment/2014-case-ih-magnum-380-tractor` returns a real
  title and `"price":183000` in the crawlable HTML
- **Google Analytics** (`G-BDKD0NT6KJ`) — written once in the layout, and
  deliberately excluded from `/admin` and `/survey`
- **Old URLs redirect** — `/about.html`, `/doug.html`, `/equipment/*.html`,
  `/reset-password.html`
- **Contact and password reset restored** — see below

### Two near-misses worth remembering

Checking the post-launch 404s turned up two things the cutover had silently
dropped:

1. **The contact page.** It carried the phone number, 503-383-9702, and was the
   only way a buyer could reach Cory. Rebuilt at `/contact`, added to the nav,
   and the number now also appears on the listings page and on every individual
   machine page. This one would have cost real sales, invisibly.
2. **The password reset page.** Supabase recovery emails link to
   `/reset-password.html`. A forgotten admin password would have meant a dead
   link and no way back in.

Neither would have surfaced until it bit.

---

## Next up

The survey went live on 2026-09-08 and the test data has been cleared. What
remains is data entry, and it is Cory's to do — no code is blocking it.

**1. Load the equipment into the survey** — paste
`supabase/migrations/009_LOAD_equipment_items.sql`. Adds one survey item per
live listing, photos carried across. Safe to re-run; it skips listings already
in the survey and will not overwrite an edited title.

Optionally also `009_LOAD_sold_grain_truck.sql`. The truck is hidden from the
equipment page because it sold, but the survey records who ORIGINALLY owned
each machine, and that does not stop mattering because the machine is gone.
**Cory's call, deliberately left as a separate script.** If it reports nothing
added, the stored name doesn't contain "4900" and the filter needs adjusting.

**2. Add the real people** — admin → Survey → People. Then **Copy link** and
text each person their own. Copy from **www.mrcoryfast.com/admin**, never a
preview deployment: the button builds its URL from the address you are viewing
it at, and a `...vercel.app` link demands a Vercel login that family do not
have.

**3. Watch the People tab** as answers come in. The **devices** count is the
forwarding signal — one or two is normal, three or more is worth a look. Revoke
kills a link on its very next request; Regenerate replaces it and keeps the
answers.

### Then, when the survey is done

- **Export both CSVs** from Results and keep them somewhere outside this
  website. The history file is the one that answers the question if the record
  is ever disputed.
- **Remove the feature** if wanted: delete `app/survey`, `app/api/survey`,
  `app/admin/survey`, `lib/survey*.js`, then drop the five tables, the view,
  the five functions and the `survey-images` bucket. The teardown list is at
  the top of `supabase/migrations/006_survey.sql`.

### Other work, unblocked

- **RSS feed** — what makes a self-owned feed followable. Independence from
  platform algorithms is the point of the project.
- **Apply the new design** when Cory's wireframes are ready. Edit
  `app/globals.css`, not every component.
- **Revoke → Reactivate restores the ORIGINAL link.** Cory spotted this and
  asked whether it should. It should — forcing a new link on every reactivate
  would mean re-texting everyone after a routine pause. But the admin gives no
  hint which situation you are in, and reactivating after a *leak* puts the
  leaked link back in service. Proposed and not yet built: a confirmation on
  Reactivate naming the trade-off, making Regenerate also reactivate so fixing
  a leak is one tap, and showing `token_rotated_at` in the row. ~20 lines, no
  database change.

### Smaller, when convenient

- **The admin's layout** is functional but plain. Cory: *"something that we can
  work on as we go."* Not blocking.
- **A `sold` state for equipment**, so sold machines show as SOLD rather than
  disappearing. The grain truck is currently just hidden.
- **`legacy/`** can be deleted whenever it stops being a useful reference —
  it's in git history regardless.
- **Survey lockout on photo taps.** Revocation shuts the page on any answer or
  note, but not on merely enlarging a photo — nothing is recorded either way.
  Cory considered it and said leave it: a server check per photo tap would
  clutter the visit log, which is what makes a forwarded link visible.

## Needs Cory, not code

- **About page is still the old placeholder** — "This space is waiting for your
  story." Needs his actual bio. No framework fixes this.
- **Doug's page says "passed away one year ago."** Per `PROJECT_SUMMARY.md` he
  died in **December 2024**, so it's closer to two years. Naming the year would
  stop it drifting every year. **His words to write — do not silently edit.**

---

## How to run it

```bash
npm install
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin (Supabase email + password)
- From a phone on the same wifi: use the Network URL Next prints on startup

---

## Gotchas worth knowing

**Cloudflare sits in front of Vercel, and APPENDS to `robots.txt`.** It does
not replace it: the served file is Cloudflare's managed AI-crawler block
followed by the rules from `app/robots.js`. This briefly looked like an
override and was reported as one — wrongly. The cause was checking *during* a
deploy, when the old site (which had no robots.txt at all) was still answering.
**Wait for a deploy to finish before concluding anything from what production
returns.** The file now carries two `User-agent: *` groups, which is untidy but
works — the standard says groups sharing a user-agent are merged, and Google
and Bing both do.

**Vercel's Overview page only ever shows the PRODUCTION deployment.** Both
links on it are aliases for `main`. A branch preview lives under the
**Deployments** tab, on the row whose source branch is not `main`. This cost
time — the survey looked absent when it was simply on another branch.
The branch alias also follows a predictable shape:
`<project>-git-<branch>-<scope>.vercel.app`.

**"Copy link" inherits the address you're viewing the admin at.** It is built
from `window.location.origin`, so a link copied from a preview deployment
points at `...vercel.app` and requires a Vercel login to open. Always copy
survey links from the real domain. See "Next up" for why this dictates the
order of the remaining steps.

**Supabase's SQL editor shows only the LAST statement's result.** Not one table
per statement — the last one wins and the rest are silently hidden. This cost
real time: a check script full of separate queries appeared to run and reported
nothing. Every `PREVIEW` / `VERIFY` / `LOOK` script is therefore written as
**one single query**, usually a `union all`, so all its rows come back together.

**`REVOKE ... FROM PUBLIC` does not remove a grant made to a named role.**
Supabase hands `anon` EXECUTE on new functions in the `public` schema
*directly*, so revoking from `PUBLIC` leaves that grant standing. `anon` must be
named: `revoke all on function ... from anon`. This slipped through on
`is_survey_admin()` and was caught by `006_VERIFY_survey.sql` — which is the
argument for having written that file at all.

**Route segment config is being removed in Next 16.** `export const dynamic`
and `revalidate` still work today but are gone once Cache Components is enabled,
and `dynamic.md` has already disappeared from the bundled docs. The survey pages
rely on `headers()` instead, which forces dynamic rendering on its own.

**macOS screenshot drag-and-drop doesn't reach Claude.** Dragging from the
floating thumbnail passes a path under `/var/folders/.../NSIRD_screencaptureui_*`
that macOS wipes the moment the drag ends, so the image never arrives. Save it
(it lands on the Desktop) and drag it from there, or paste with **Ctrl+V**.
For SQL results, pasting the text is better than a screenshot anyway.

**The domain redirects to www.** `mrcoryfast.com` → `www.mrcoryfast.com`.
`metadataBase` in `app/layout.js` points at the www form to match. Don't change
it back — share cards and canonical URLs would then all carry a redirect.

**Vercel's Framework Preset must stay Next.js.** It was set to Express, auto
detected in December from the old root `package.json`. It didn't matter while
`vercel.json` existed, because a `builds` array overrides project settings
entirely — which is exactly why the first preview silently built the old site.

**Negative margins couple a component to its parent.** The admin used
`-mx-4 -my-8` to break out of a container that had padding. Porting the site
design removed that padding, and the admin was thrown against the window edge
with no error. Layout components should size themselves.

**Preview deployments are protected.** Vercel requires you to be signed in to
open a preview URL. Good — nobody stumbles onto the new site early — but it
means automated checks against a preview URL get an SSO redirect, not the page.

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

- **`main` is live** at `f7161ae`, and now includes the survey
- **`survey`** is merged and redundant; it can be deleted
- `nextjs-rebuild` is also long merged and can be deleted
- Vercel deploys production from `main`; every other branch gets a protected
  preview. **Cloudflare sits in front of Vercel** on this domain
- Remote: github.com/BiggiFast/fast-farms-equipment

The Next app is at the repository root. `legacy/` holds the original static
site and is not served.

### The survey's SQL scripts

All under `supabase/migrations/`. The `006_` files have already been applied to
the live database — they are recorded here, not pending.

| File | What it is |
|---|---|
| `006_survey.sql` | The migration. Safe to re-run |
| `006_SEED_admin.sql` | Makes Cory the survey admin. Required, or the admin shows nothing |
| `006_PREVIEW_first.sql` | Read-only pre-flight check |
| `006_VERIFY_survey.sql` | Read-only. How the database is configured |
| `006_VERIFY_survey_live.sql` | Read-only. How it actually behaves |
| `007_TEST_DATA.sql` | Creates "Test Person" + items from the equipment listings |
| `007_TEST_DATA_CLEANUP.sql` | Removes them. **Run before real links go out** |
| `008_LOOK_answers.sql` | Read-only. Every answer, current and superseded |
| `008_LOOK_access.sql` | Read-only. Who opened a link, from how many devices |
| `009_LOAD_equipment_items.sql` | Loads the live listings into the survey. Safe to re-run |
| `009_LOAD_sold_grain_truck.sql` | Optional. The sold truck, as a separate decision |
