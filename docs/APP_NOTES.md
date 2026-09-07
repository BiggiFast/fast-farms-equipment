# App notes

How the Next.js app works. For how to run it and where everything lives, see
the root `README.md`; for current status see `../HANDOFF.md`.

The app sits at the repository root — Vercel builds from there. The original
static site is preserved in `legacy/` and is **not** served.

**Live since 2026-09-04.**

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
  robots.js              What crawlers may visit. Disallows /admin, /survey, /api
  survey/                THE FAMILY SURVEY — invite-only, unlinked, noindexed
    layout.js            Bare layout: no nav, no footer, no referrer
    [token]/             Confirmation: "You're answering as Kaley Fast"
    [token]/items/       The survey itself
  api/survey/answer/     The only survey write. Exists to capture the real IP
  admin/
    login/               Sign in. Deliberately outside the (dashboard) group
                         so it shows no nav and no "Sign out"
    (dashboard)/         Everything requiring a login
      updates/           Post & edit updates — the main flow
      projects/          Create & edit projects
      equipment/         Manage listings
      survey/            People (revocation console), Items, Results + CSVs
lib/
  queries.js             Every database read the public site makes
  adminApi.js            Every write the admin makes
  survey.js              Survey constants shared with the browser
  surveyApi.js           The four survey database functions, in one place
  surveyAdmin.js         Survey admin reads and writes
  surveyResults.js       Consensus scoring and CSV building (pure functions)
  photos.js              Reads the jsonb photo array; handles legacy image_url
  slug.js                Title -> url-safe-slug
  resizeImage.js         Shrinks phone photos before upload
  supabase/              Three clients — see below
components/              Admin forms, photo uploader, shared fields
proxy.js                 Protects /admin and keeps the session alive
```

## Design status

**The current site's design has been ported** (2026-09-03), so this app looks
like mrcoryfast.com does today. Cory is separately designing a new layout in
Claude Design; when it's ready it replaces what's in `app/globals.css`.

Public pages use **semantic CSS classes**, not Tailwind utilities —
`.site-header`, `.hero`, `.equipment-card`, `.feed-item`. That keeps them close
to the original stylesheet and means the redesign is one file rather than every
component. Tailwind is still loaded and still styles the **admin**, which is a
tool and doesn't need the site's visual language.

Fonts are self-hosted through `next/font` (EB Garamond, Bebas Neue, Montserrat)
and exposed as `--font-eb-garamond`, `--font-bebas`, `--font-montserrat`.

The header has two variants, chosen by pathname in `components/SiteHeader.jsx`:
`overlay` (transparent, over the full-screen hero — home only) and `solid`
(in the flow, dark text — everywhere else).

Colours come from `app/globals.css`, carried over from the old site's
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

## Routing notes

`next.config.mjs` redirects every URL the old static site used — `/about.html`,
`/doug.html`, `/equipment/index.html`, `/equipment/contact.html`,
`/equipment/admin.html` — because people have them bookmarked and Google has
them indexed. 308 for moved pages so ranking transfers.

`/reset-password.html` is 307, not 308: it's a functional endpoint that Supabase
recovery emails point at, and a permanently cached redirect there would be hard
to undo.

## The admin and the survey have no site chrome

`SiteHeader` and `SiteFooter` return `null` on `/admin` **and `/survey`**, for
two different reasons.

The admin is a tool, not part of the site, and the two sets of navigation
collided.

The survey reason is stricter: a survey URL contains a respondent's private
token, and every outbound link is a chance for the browser to hand that URL to
another site as the `Referer` header. The footer's Instagram link was exactly
that. Survey pages carry **no cross-origin links or scripts at all**, and set
`referrer: 'no-referrer'`. The admin layout sizes
itself — do **not** reintroduce negative margins to break out of a parent
container, which is how it previously broke.

## Analytics is not loaded everywhere

`components/Analytics.jsx` skips `/admin` and `/survey`. The survey exclusion
matters: GA reports the page path, and survey URLs contain a respondent's
private token.

## The survey

Built 2026-09-06, on branch `survey`. Full reasoning in `SURVEY_SPEC.md` and
`../supabase/migrations/006_survey.sql`.

**Quarantined on purpose.** Everything lives in `app/survey`, `app/api/survey`,
`app/admin/survey` and `lib/survey*.js`, so removing the feature later is
deleting those plus dropping five tables and one bucket.

**It adds no new secrets.** It runs on the same public anon key as the rest of
the site. The five survey tables refuse `anon` outright — RLS with no anon
policies, plus an explicit `REVOKE` — and the only way in is four
`SECURITY DEFINER` functions that take the person's token and validate it
themselves. A route handler that forgets to check cannot leak anything, because
there is nothing privileged for it to reach.

**Three rules not to undo:**

- **Answers are append-only.** No policy anywhere permits `UPDATE` on
  `survey_responses`. The admin can read and delete an answer but never edit
  one — a record its holder can quietly tidy up is worth little to anyone
  outside the family. A changed mind leaves both rows.
- **The gate is in the Server Component**, not in `SurveyForm`. If the token
  isn't live, the page returns before the form renders, so survey markup never
  reaches the browser at all. An early return inside a Client Component would
  still ship it in the HTML.
- **`is_survey_admin()` must be revoked from `anon` by name.** Supabase grants
  EXECUTE on new functions to `anon` *directly*, and `REVOKE ... FROM PUBLIC`
  does not remove a grant made to a named role. This was caught by
  `006_VERIFY_survey.sql`, which is why that file exists.

**Consensus excludes "Not sure" from the winner** and reports it alongside —
counting it produces a consensus of "Not sure" on exactly the items most needing
a follow-up call. `lib/surveyResults.js` is pure functions so this stays
checkable.

## Not built yet

- **RSS feed** — important: it's what makes a self-owned feed followable, and
  independence from platform algorithms is the whole point of the project
- **The new visual design**, when Cory's wireframes are ready — edit
  `app/globals.css`, not every component
