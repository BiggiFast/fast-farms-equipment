# Equipment Ownership Survey — Functional Spec (Next.js)

## Purpose

A temporary, invite-only survey on mrcoryfast.com that collects family members'
opinions on who originally owned each piece of farm equipment. The goal is to
capture this knowledge before it is lost. It is not a public feature and should
not be indexed or linked from the main site.

Build it to be easy to remove later: keep survey code under `app/survey`,
`app/api/survey`, `app/admin/survey` (or equivalent), and `lib/survey.js`, so
deleting the feature is deleting those folders plus dropping four tables.

---

## Stack

- Next.js (App Router), JavaScript, plain CSS — match whatever conventions the
  migrated app already uses. Do **not** introduce a new UI library or styling
  system for this feature.
- Supabase (PostgreSQL + Storage + Auth)
- Deployed on Vercel, auto-deploy on push to `main`
- Existing admin protected by Supabase Auth

Follow the existing file layout of the migrated site. Where this spec names a
path, treat it as a suggestion that should bend to match what's already there.

---

## Key architectural requirement

**Respondent sign-in is handled server-side. Never in the browser.**

Respondents do not get Supabase Auth accounts. They sign in by typing an email
or phone number that matches an allowlist. That check happens in a Route Handler
using the Supabase **service role key**.

Consequently:

- All four survey tables have RLS enabled with **no policies at all**, plus an
  explicit `REVOKE ALL ... FROM anon, authenticated`. Only the service role
  reaches them. (The revoke matters: it is the durable guarantee, and it aligns
  with the Supabase Data API change requiring explicit grants.)
- The browser never queries survey tables directly. It calls Route Handlers.
- Server-only environment variables, added to `.env.local` and to Vercel:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SURVEY_SESSION_SECRET` (random 32+ bytes, hex)
  - `ADMIN_USER_IDS` (comma-separated Supabase user UUIDs)

  None of these may be prefixed `NEXT_PUBLIC_`.

### Respondent session

On successful sign-in, set a cookie named `survey_session`:

- Value: `{respondentId}.{expiresAtEpochMs}.{hmac}` where the HMAC is
  SHA-256 over `{respondentId}.{expiresAtEpochMs}` keyed with
  `SURVEY_SESSION_SECRET`, using `node:crypto`.
- Verify with `crypto.timingSafeEqual`, never `===`.
- `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `maxAge` 30 days,
  and `secure: process.env.NODE_ENV === 'production'` so local http still works.

**Do not gate `/survey/items` in `middleware.js`.** Next.js middleware runs on
the edge runtime, where `node:crypto` is unavailable, so HMAC verification will
fail there. Verify the cookie inside the page's Server Component and in each
Route Handler instead.

Every survey request re-reads the respondent from the database and confirms
`is_active = true`. Deactivating someone must lock them out on their very next
request, not when their cookie expires.

Put the verify helper in one place (`lib/survey-session.js`) and call it from
every entry point. Do not reimplement it per route.

### Admin authorization

Every survey admin Route Handler must, server-side:

1. Read the Supabase session from cookies (`@supabase/ssr`)
2. Confirm a user exists
3. Confirm `user.id` is in `ADMIN_USER_IDS`

Only then may it touch the service role client.

Step 3 is not optional. Treating "any authenticated Supabase user" as the admin
is a known gap on the Saoirse project; do not reproduce it here. Hiding admin UI
client-side is not authorization.

---

## Database schema

### `survey_respondents`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, default `gen_random_uuid()` |
| name | text | Not null, e.g. "Kaley Fast" |
| is_active | boolean | Not null, default true |
| created_at | timestamptz | Not null, default `now()` |

### `survey_logins`

One respondent can have several approved identifiers (a phone and an email).

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| respondent_id | uuid | FK → survey_respondents, **on delete cascade** |
| identifier | text | Not null, normalized (see below) |
| kind | text | `'email'` or `'phone'` |
| created_at | timestamptz | default `now()` |

Unique index on `identifier`. Two people must not share one. The admin UI must
surface a readable error on collision, not a raw Postgres message.

**Normalization** — apply identically on save and on sign-in:

- Email: trim, lowercase.
- Phone: strip all non-digits; if 11 digits starting with `1`, drop the leading
  `1`; store the bare 10 digits. So `(555) 123-4567`, `555-123-4567`, and
  `+1 555 123 4567` all match.
- Detect `kind` by presence of `@`.

Put normalization in `lib/survey.js` and call the same function from both paths.
Divergence here is the single most likely cause of "it says I'm not on the list."

### `survey_items`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| title | text | Not null, e.g. "Red disc harrow, north shed" |
| admin_note | text | Nullable. Cory's own note, never shown to respondents |
| source | text | `'upload'` or `'equipment'` |
| equipment_id | uuid | Nullable FK → equipment, **on delete set null** |
| photos | jsonb | `[{ "url": "...", "order": 0 }]` — same shape as equipment |
| is_active | boolean | Not null, default true |
| confirmed_owner | text | Nullable. Set by Cory once he's satisfied |
| sort_order | integer | Not null, default 0 |
| created_at | timestamptz | default `now()` |
| deleted_at | timestamptz | Nullable, soft delete |

`ON DELETE SET NULL` is deliberate: deleting an equipment listing must never
delete a survey item or the answers about it.

Order items by `sort_order`, then `created_at` — `sort_order` defaults to 0, so
without the tiebreaker the order is nondeterministic and cards will appear to
shuffle between page loads.

### `survey_responses`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| item_id | uuid | FK → survey_items, on delete cascade |
| respondent_id | uuid | FK → survey_respondents, on delete cascade |
| owner | text | One of `OWNER_OPTIONS` |
| note | text | Nullable, respondent's free text |
| created_at | timestamptz | default `now()` |
| updated_at | timestamptz | default `now()` |

Unique constraint on `(item_id, respondent_id)`. Answers are upserted on that
constraint. Set `updated_at` explicitly in the route handler on every upsert —
a column default does not fire on update.

### Owner options

Define once in `lib/survey.js`:

```js
export const OWNER_OPTIONS = ['Grandpa', 'Doug', 'Kaley', 'Kirk', 'Not sure'];
export const UNSURE = 'Not sure';
```

Import it everywhere. Both the survey UI and the server-side validation read
this same array, so adding a fifth family member later is a one-line change.

### Storage

New bucket `survey-images`, public read.

Storage policies: `INSERT`/`UPDATE`/`DELETE` for authenticated users only,
`SELECT` for public. This mirrors `equipment-images` and permits the direct
browser upload described below.

Do not reuse `equipment-images` — a separate bucket makes cleanup trivial when
the survey is finished.

Note: photos are publicly readable by URL, same as the equipment images. That is
acceptable here, but do not put anything in this bucket you would not put on the
public site.

---

## Public survey flow

### `/survey` — sign-in page

`app/survey/page.js`

- Single input, `type="text"`, labelled "Enter your email or phone number"
- `inputMode="email"` is a reasonable default; do not force a numeric keypad
- Explanatory text: private family survey, answers recorded under their name
- Submit → `POST /api/survey/login`
- On failure, one neutral message: "We couldn't find that — check with Cory."
  Never reveal whether the identifier exists but is deactivated, and never
  distinguish "not found" from "deactivated"
- If a valid session already exists, redirect to `/survey/items`
- `export const metadata = { robots: { index: false, follow: false } }`

### `/survey/items` — the survey page

`app/survey/items/page.js` — a Server Component that:

1. Reads and verifies `survey_session`
2. Re-checks `is_active`
3. On failure, `redirect('/survey')` before rendering anything
4. On success, loads items and this respondent's existing answers, and passes
   them to a Client Component for the interactive part

Gating in the Server Component means the survey markup never reaches an
unauthorized browser.

Layout, top to bottom:

1. Header: "Hi [first name]" and a sign-out link
2. Short intro: what this is for, that there are no wrong answers, and that
   "Not sure" is a genuinely useful answer
3. Progress: "12 of 34 answered"
4. One card per active item, in order, each containing:
   - **Title** (heading)
   - **Radio group** — one per `OWNER_OPTIONS` entry, single select
   - **Photo(s)** below the radios, tappable to enlarge full-screen
   - **Optional note field**, placeholder "Anything you remember about it?
     (optional)"
5. A closing state when every item is answered — a simple "That's all of them,
   thank you" rather than an ambiguous end of list

Behaviour requirements:

- **Auto-save.** Radio change saves immediately. The note field saves on a
  ~800ms debounce **and** on blur — blur alone is not enough, because closing a
  mobile browser mid-typing never fires it.
- **Per-card save state.** Saving / saved / failed. A failed save must show a
  retry control, never fail silently.
- **Ignore stale responses.** If someone taps three radios quickly, responses can
  return out of order. Track a request sequence per card and apply only the
  newest; last write wins.
- **Blind survey.** Never send another respondent's answers or `confirmed_owner`
  to the client. Not hidden in the DOM — not in the payload at all.
- **Resumable.** Returning later shows their previous answers pre-selected.
- **Mobile-first.** This will be filled out on phones. Large tap targets,
  generous spacing between radio options, photos sized for a phone screen,
  `loading="lazy"` on images below the fold.

---

## Route handlers

All under `app/api/survey/`. All read cookies, so all are dynamic.

| Route | Method | Purpose |
|---|---|---|
| `login/route.js` | POST | Body `{ identifier }`. Normalize, look up in `survey_logins`, confirm respondent `is_active`, set cookie. Rate limited (below) |
| `logout/route.js` | POST | Clear the cookie |
| `items/route.js` | GET | Active non-deleted items plus **this respondent's** answers only |
| `answer/route.js` | POST | Body `{ item_id, owner, note }`. Upsert on `(item_id, respondent_id)` |

`answer` must validate server-side that `owner` is in `OWNER_OPTIONS`, that the
item exists and is active and not deleted, and must take `respondent_id` from
the **session cookie only** — never from the request body.

Trim `note` and cap it at a sane length (2000 chars).

### Rate limiting

In-memory counters do not work on Vercel — each request may hit a fresh
serverless instance, so the counter resets and the limit is decorative.

Use a small table instead:

```sql
create table survey_login_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  attempted_at timestamptz not null default now(),
  succeeded boolean not null default false
);
create index on survey_login_attempts (ip, attempted_at desc);
```

Before processing a login, count failed attempts from that IP in the last 15
minutes. Over 10, return 429. Read the IP from the `x-forwarded-for` header.

This is a family survey, so the goal is stopping casual guessing, not a
determined attacker. Do not over-engineer it.

---

## Admin additions

A **Survey** section inside the existing admin, behind Supabase Auth **and** the
`ADMIN_USER_IDS` check. Three tabs.

### Tab 1 — People

- Table: name, approved logins, active/inactive, count of answers submitted
- Add a respondent: name plus one or more identifiers; `kind` auto-detected;
  allow several per person
- Add or remove identifiers on an existing respondent
- **Active/inactive toggle** — the kill switch. Inactive means no sign-in and
  existing sessions die on their next request. Answers are kept
- Delete requires confirmation and warns that answers go with them

### Tab 2 — Items

- List with thumbnail, title, active/inactive, confirmed owner, response count
- **Upload from phone.** `<input type="file" accept="image/*" multiple>`. Resize
  client-side to 1200px max width, then upload **directly from the browser to
  Supabase Storage** using the admin's authenticated Supabase session.

  Do not proxy uploads through a Route Handler — Vercel caps serverless request
  bodies at roughly 4.5MB and multiple photos will exceed it. Direct-to-storage
  also matches how the equipment admin already works.

  After upload, POST the resulting URLs to a Route Handler that writes the
  `survey_items` row with the service role key.
- **Pull from existing equipment listings.** A picker over current equipment;
  selecting one creates a `survey_items` row with `source='equipment'`,
  `equipment_id` set, and the photo URLs copied across.

  These are references to files in `equipment-images`, not copies. If a listing's
  photos are later deleted, the survey item's images break. Acceptable for a
  short-lived survey — but if the survey may outlive the listings, copy the files
  into `survey-images` instead.
- Edit title, reorder (`sort_order`), add an admin note
- **Active/inactive toggle** per item — inactive disappears from the survey but
  keeps its answers
- **Set confirmed owner** — dropdown of `OWNER_OPTIONS` or blank. For Cory's
  record only; never sent to respondents
- Soft delete

### Tab 3 — Results

The payoff. A matrix:

- **Rows**: items (thumbnail + title)
- **Columns**: one per respondent, including inactive ones — their answers still
  count
- **Cells**: that person's pick, with a marker when they left a note; tap or
  hover to read it
- **Consensus column**: the most-picked name and the split, e.g. "Doug (3 of 4)"

  **Exclude "Not sure" from the winner calculation.** Report it separately, e.g.
  "Doug (2 of 4, 1 unsure)". Counting it as a vote produces a nonsense consensus
  of "Not sure" on exactly the items most needing follow-up.

  Distinguish visually: unanimous / majority / tied or split / nobody knows /
  unanswered. Split and nobody-knows are the ones needing a phone call.
- **Confirmed owner**: editable inline
- Filters: unanswered, disputed, unconfirmed, nobody-knows
- **Export CSV**

CSV requirements: one row per item; a column per respondent for their answer and
another for their note; consensus; confirmed owner. Quote every field and escape
embedded quotes — notes will contain commas and line breaks. Include a UTF-8 BOM
so Excel doesn't mangle it.

The CSV matters more than the website. This data should outlive both.

---

## Non-goals

- Respondents cannot add items or see each other's answers
- No email or SMS sending
- No password reset — Cory manages identifiers by hand
- No public visibility: `/survey` is unlinked from navigation and disallowed in
  `app/robots.js`

---

## Acceptance checklist

**Access**
- [ ] A respondent on the allowlist signs in with phone or email in any common
      format: `5551234567`, `(555) 123-4567`, `+1 555-123-4567`
- [ ] Someone not on the list cannot sign in, and the message is identical for
      "not found" and "deactivated"
- [ ] Deactivating a respondent locks them out on their very next request, with
      no sign-out required
- [ ] Eleven rapid failed logins from one IP returns 429
- [ ] Hitting `/survey/items` with no cookie redirects, and the survey markup is
      absent from the response body
- [ ] A tampered cookie value is rejected

**Survey**
- [ ] Answers save automatically and survive closing and reopening the browser
- [ ] A note typed and then closed without blurring is still saved
- [ ] Tapping several radios quickly leaves the last tap as the stored answer
- [ ] A failed save shows a retry, not silence
- [ ] The `/api/survey/items` payload contains no other respondent's answers and
      no `confirmed_owner`
- [ ] Usable one-handed on a phone

**Admin**
- [ ] A logged-in Supabase user whose id is not in `ADMIN_USER_IDS` gets 403
      from every survey admin route
- [ ] Four photos from an iPhone upload successfully in one go
- [ ] An existing equipment listing pulls into the survey with its photos
- [ ] Deactivating an item removes it from the survey without deleting answers
- [ ] Consensus excludes "Not sure" from the winner and reports it separately
- [ ] An item where everyone answered "Not sure" is visually distinct from one
      nobody has answered
- [ ] CSV opens cleanly in Excel with notes containing commas and line breaks
      intact

**Safety**
- [ ] All four survey tables are unreadable with the public anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` and `SURVEY_SESSION_SECRET` appear nowhere in
      the client bundle (grep the build output)
- [ ] `/survey` is noindex and disallowed in robots.txt
- [ ] Existing public equipment pages and admin are unchanged
