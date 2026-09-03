# HANDOFF — MrCoryFast.com

**Last updated: 2026-09-02**
**Branch: `nextjs-rebuild` (not `main`)**

Start here. This is the living "where are we" document.

- **Why** something is the way it is → `DECISIONS.md`
- How the new app works → `web/README.md`
- The survey requirements → `docs/SURVEY_SPEC.md`
- The original static site → `docs/PROJECT_SUMMARY.md`

Say **"checkpoint"** at the end of a work session and this file gets updated
along with everything else. See `.claude/skills/checkpoint/`.

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

## In progress — as of 2026-09-02

**Cory is designing the new layout in Claude Design**, in spurts as time allows.

Separately, he's specced a **family equipment-ownership survey**
(`docs/SURVEY_SPEC.md`) — an invite-only survey asking relatives who originally
owned each machine, to capture that knowledge before it's lost. The spec was
reviewed and is sound; three questions were resolved on 2026-09-02 (see
`DECISIONS.md`).

---

## Next up — agreed plan, in this order

The survey needs the site deployed, and the deploy shouldn't be tangled up with
a new feature. So:

1. **Port the existing design into the Next.js app** — carry across the hero,
   nav, fonts (EB Garamond, Bebas Neue, Montserrat) and card styling from
   `main-styles.css` / `styles.css`. Not a redesign; the goal is that the new
   site looks like the current one.
2. **Push the branch and check a Vercel preview URL.** A branch deploy, not the
   real domain. Nothing public changes.
3. **Cut over mrcoryfast.com** once the preview looks right. `vercel.json` needs
   changing — it currently forces static serving of `public/`. Rollback is
   reverting one file.
4. **Build the survey** per `docs/SURVEY_SPEC.md`, in stages: schema and
   sign-in, then the survey page, then admin People/Items, then Results + CSV.
5. **RSS feed** — what makes a self-owned feed followable. Independence from
   platform algorithms is the point of the project; without RSS there's no way
   to subscribe.
6. **Google Analytics** — `G-BDKD0NT6KJ`, added once in `app/layout.js`.
7. **Apply the new design** when the wireframes are ready. Same mechanism as
   step 1 — a swap, not a rebuild.

### Before the survey can be built

Cory needs to fetch two things:

- **`SUPABASE_SERVICE_ROLE_KEY`** — Supabase dashboard, Settings → API.
  **This key bypasses all security rules.** Never commit it, never prefix it
  `NEXT_PUBLIC_`, never let it reach a browser.
- **His Supabase user UUID**, for `ADMIN_USER_IDS`.

`SURVEY_SESSION_SECRET` can be generated locally.

### Deferred, not forgotten

- **A "Sold" state for equipment.** Sold items are currently just hidden. A
  real sold flag would keep the page up marked SOLD rather than 404ing — better
  for buyer trust and for anyone who saved the link.
- **Screenshots in `public/images/` and `Images/IMG_2651 e1.jpg`** are untracked
  and unsorted. Nobody has decided whether they're site assets or working files.

---

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
