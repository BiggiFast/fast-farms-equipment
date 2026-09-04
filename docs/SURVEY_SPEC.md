# Equipment Ownership Survey — Functional Spec v2

> **v2 supersedes the original allowlist design**, archived at
> `docs/archive/SURVEY_SPEC_v1_allowlist.md`. What changed and why is in
> "Changes from v1" at the end. Most of v1's detail survives — the parts that
> changed are access control and answer storage.

---

## Purpose

A temporary, invite-only survey collecting family members' opinions on who
originally owned each piece of farm equipment, so that knowledge is captured
before it's lost. Not a public feature; not indexed; not linked from the site.

Build it to be easy to remove later: survey code under `app/survey`,
`app/api/survey`, `app/admin/survey`, and `lib/survey.js`, so deleting the
feature is deleting those folders plus dropping five tables.

---

## Threat model — read this first

This is **not** a low-stakes family poll. Some family members have an incentive
to avoid establishing who owned what, so they can later claim machinery as their
own. The design assumes:

- Someone may try to answer **as another person**
- Someone may **forward their link** to let another person answer
- Someone may **revisit and change** an earlier answer once they see where
  things are heading
- The resulting record may need to be **credible to someone outside the family**

Three consequences drive the design:

1. **Revocation must be immediate**, per person, from a phone.
2. **Forwarding must be visible**, not merely reversible after the damage.
3. **Answers are append-only.** A changed answer is history, not an overwrite.

### Why token links beat an email/phone allowlist here

v1 had respondents sign in by typing an email or phone number matched against an
allowlist. Under this threat model that's the *weaker* option: **family members
already know each other's phone numbers.** The credential is something the
adversary has by default. No interception needed.

A token is a random string nobody holds unless it's deliberately shared. It must
leak to be abused, and leaking is detectable (see the access log).

---

## Stack

- Next.js (App Router), JavaScript. Styling follows the site's existing
  conventions in `app/globals.css` — semantic classes, the ported palette. Do
  not introduce a new UI library.
- Supabase (PostgreSQL + Storage + Auth)
- Deployed on Vercel; production deploys from `main`

---

## Key architectural decision: no new secrets

**This feature introduces zero server-only credentials.** It runs on the same
public anon key the rest of the site already uses. That is deliberate — the repo
is public, and a leaked service role key would be unrecoverable.

| v1 required | v2 |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Not needed — RLS enforces admin access |
| `SURVEY_SESSION_SECRET` | Not needed — no signed session; the token is the credential |
| `ADMIN_USER_IDS` | Not needed — admin allowlist is a database table |

### How access is enforced

**Admins** are already authenticated through Supabase Auth. The check moves out
of application code and into the policy itself:

```sql
create policy "admins manage survey items"
  on survey_items for all to authenticated
  using (auth.uid() in (select user_id from survey_admins))
  with check (auth.uid() in (select user_id from survey_admins));
```

The database enforces it. A route handler that forgets to check cannot leak
anything, because there is nothing privileged to leak.

**Respondents** have no account and no identity the database can see. All survey
tables have RLS enabled with **no policies for `anon`**, plus an explicit
`REVOKE ALL ... FROM anon`. Respondents reach their data only through
`SECURITY DEFINER` functions with `EXECUTE` granted to `anon`. Each function
takes the token and validates it internally.

So the public key can do exactly four things, and nothing else:

| Function | Does |
|---|---|
| `survey_open(token, ip, user_agent)` | Validate token, log access, return the respondent's name |
| `survey_load(token, ip, user_agent)` | Return active items plus **this** respondent's current answers |
| `survey_answer(token, item_id, owner, note, ip)` | Append one answer row |
| `survey_progress(token)` | Answered / total count |

Every one re-checks `is_active` and `is_frozen` on each call. Deactivating
someone locks them out on their **very next request**, not when something
expires.

**Rate limiting is not required.** There is no login to brute-force, and
guessing a 32-character random token is not feasible. v1's
`survey_login_attempts` table is dropped from the design.

Put every function call behind one helper in `lib/survey.js`. Do not scatter
`.rpc()` calls through components.

---

## Database schema

Five tables and one view. All have RLS enabled, all revoke `anon`, all grant
admins through `survey_admins`.

### `survey_admins`

Who may administer the survey. Referenced by every admin policy.

| Column | Type | Notes |
|---|---|---|
| user_id | uuid | PK, references `auth.users(id)` on delete cascade |
| note | text | e.g. "Cory" |
| created_at | timestamptz | default `now()` |

Seed with Cory's Supabase user id. This is the one manual step at install.

### `survey_respondents`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, default `gen_random_uuid()` |
| name | text | Not null, e.g. "Kaley Fast" |
| token | text | Not null, **unique**. `encode(gen_random_bytes(16), 'hex')` — 32 chars |
| is_active | boolean | Not null, default true. **The kill switch** |
| is_frozen | boolean | Not null, default false. Answers become read-only |
| token_rotated_at | timestamptz | Set when a link is regenerated |
| created_at | timestamptz | default `now()` |

Index on `token`. Never expose `token` in any payload except the admin UI.

### `survey_items`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| title | text | Not null, e.g. "Red disc harrow, north shed" |
| admin_note | text | Nullable. Cory's own note, **never** shown to respondents |
| source | text | `'upload'` or `'equipment'` |
| equipment_id | uuid | Nullable FK → `equipment`, **on delete set null** |
| photos | jsonb | `[{ "url": "...", "is_main": true, "sort_order": 0 }]` |
| is_active | boolean | Not null, default true |
| confirmed_owner | text | Nullable. Cory's conclusion; **never** sent to respondents |
| sort_order | integer | Not null, default 0 |
| created_at | timestamptz | default `now()` |
| deleted_at | timestamptz | Nullable, soft delete |

`ON DELETE SET NULL` is deliberate: deleting an equipment listing must never
delete a survey item or the answers about it.

Order by `sort_order`, then `created_at`. `sort_order` defaults to 0, so without
the tiebreaker cards shuffle between page loads.

**The photo shape matches `equipment` and `updates`** so `lib/photos.js` works
unchanged. (v1 specified `{url, order}`; corrected here.)

### `survey_responses` — append-only

**Every answer is a new row. Nothing is ever updated.**

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| item_id | uuid | FK → `survey_items`, on delete cascade |
| respondent_id | uuid | FK → `survey_respondents`, on delete cascade |
| owner | text | One of `OWNER_OPTIONS` |
| note | text | Nullable, trimmed, capped at 2000 chars |
| created_at | timestamptz | default `now()` |
| ip | text | Nullable, from `x-forwarded-for` |

**No unique constraint on `(item_id, respondent_id)`** — that's the point.
Someone who answers "Grandpa" on Tuesday and "Kirk" on Friday leaves both rows.

### `survey_current_responses` — view

The latest answer per person per item.

```sql
create view survey_current_responses as
select distinct on (item_id, respondent_id) *
from survey_responses
order by item_id, respondent_id, created_at desc;
```

Everything reading "the current answer" reads this. The Results matrix flags any
pair with more than one row as **changed**, and the history is one click away.

### `survey_access_log`

Makes forwarding visible.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| respondent_id | uuid | FK → `survey_respondents`, on delete cascade |
| occurred_at | timestamptz | default `now()` |
| ip | text | From `x-forwarded-for` (first entry — it's a comma-separated list) |
| user_agent | text | Truncated to 300 chars |

Written by `survey_open` and `survey_load`. Never shown to respondents.

### Owner options

Defined once in `lib/survey.js`, imported everywhere, and validated server-side
against the same array:

```js
export const OWNER_OPTIONS = ['Grandpa', 'Doug', 'Kaley', 'Kirk', 'Not sure']
export const UNSURE = 'Not sure'
```

Also enforced by a `CHECK` constraint on `survey_responses.owner`, so a bad
value can't reach the table even if application validation is bypassed.

### Storage

New bucket `survey-images`, public read; insert/update/delete for authenticated
users only. Mirrors `equipment-images` and permits direct browser upload.

Separate from `equipment-images` so cleanup is trivial when the survey is done.
Photos are publicly readable by URL, same as equipment images — don't put
anything in there you wouldn't put on the public site.

---

## Public survey flow

### `/survey/[token]` — confirmation

`app/survey/[token]/page.js`, a Server Component.

1. Calls `survey_open(token, ip, ua)`
2. Invalid, inactive, or unknown token → render a neutral "This link isn't
   active. Check with Cory." **Do not** distinguish invalid from revoked
3. Valid → show the name and a single button

```
        You're answering as
           Kaley Fast

     [  That's me — start  ]

     Not you? Please don't
     continue — text Cory.
```

This is the forwarding check. Someone handed a link that isn't theirs sees a
name that isn't theirs, and an honest person stops.

`export const metadata = { robots: { index: false, follow: false } }`

### `/survey/[token]/items` — the survey

Server Component. Re-validates the token, calls `survey_load`, passes results to
a Client Component. Gating in the Server Component means the survey markup never
reaches an unauthorized browser.

Top to bottom:

1. "Hi Kaley" and a link back to the confirmation screen
2. Short intro: what it's for, no wrong answers, "Not sure" is genuinely useful
3. Progress: "12 of 34 answered"
4. One card per active item, in order:
   - **Title**
   - **Radio group**, one per `OWNER_OPTIONS`, single select
   - **Photos** below the radios, tappable to enlarge full-screen
   - **Optional note**, placeholder "Anything you remember about it? (optional)"
5. When everything is answered: "That's all of them, thank you" — a real end,
   not an ambiguous end of list

If `is_frozen`, render everything read-only with a short banner explaining
answers are locked and to contact Cory.

**Behaviour**

- **Auto-save.** Radio change saves immediately. The note saves on a ~800ms
  debounce **and** on blur — blur alone isn't enough, because closing a mobile
  browser mid-typing never fires it.
- **Per-card save state**: saving / saved / failed, with a retry control. Never
  fail silently.
- **Ignore stale responses.** Tapping three radios quickly can return out of
  order. Track a request sequence per card; apply only the newest.
- **Blind survey.** Never send another respondent's answers, `admin_note`, or
  `confirmed_owner` to the client. Not hidden in the DOM — not in the payload.
  This is enforced by the functions, which return only the caller's rows.
- **Resumable.** Returning shows previous answers pre-selected.
- **Mobile-first.** Large tap targets, generous spacing between radios, photos
  sized for a phone, `loading="lazy"` below the fold, 16px inputs (below that,
  iOS Safari zooms on focus).

---

## Route handlers

Under `app/api/survey/`. All read headers, so all are dynamic. They exist to
capture the real client IP, which a browser call can't supply honestly.

| Route | Method | Purpose |
|---|---|---|
| `answer/route.js` | POST | `{ token, item_id, owner, note }` → `survey_answer` |

Reads and passes `x-forwarded-for` (first entry). Validation lives in the
database function — `owner` must be in `OWNER_OPTIONS`, the item must be active
and not deleted, the respondent must be active and not frozen, and
`respondent_id` is derived from the **token**, never from the request body.

Reads happen in Server Components; only writes need a handler.

---

## Admin

A **Survey** section in the existing admin, alongside Updates / Projects /
Equipment. Access is enforced by RLS through `survey_admins` — there is no
application-level admin check to forget, and no admin-only key.

### Tab 1 — People

The revocation console. Must be usable one-handed on a phone.

Table, one row per respondent:

| Name | Link | Last seen | Devices | Answers | Status | ☑ |
|---|---|---|---|---|---|---|

- **Link** — "Copy link" button. Shows the full URL only on request
- **Last seen** — most recent access
- **Devices** — distinct IP/user-agent pairs in the access log. **This is the
  forwarding signal.** One or two is normal. Four across three locations is a
  circulating link. Highlight anything above two
- **Answers** — count submitted
- **Status** — Active / Revoked / Frozen
- **Checkbox** for bulk actions

Bulk actions on selected rows:

- **Revoke** — `is_active = false`. Link dies on the next request. Answers kept
- **Reactivate**
- **Regenerate link** — new token, old link dead immediately, answers kept.
  For "she lost the text" and for "this one got passed around"
- **Freeze** — answers become read-only, viewing still allowed

Single-respondent actions: add, rename, delete (with a warning that answers go
too — prefer Revoke).

Clicking a row opens their **access history**: every visit with time, IP, and
device.

### Tab 2 — Items

- List with thumbnail, title, active/inactive, confirmed owner, response count
- **Upload from phone**: `<input type="file" accept="image/*" multiple>`,
  resized client-side to 1200px, uploaded **directly from the browser to
  Supabase Storage** using the admin's authenticated session.

  Do not proxy uploads through a route handler — Vercel caps serverless request
  bodies around 4.5MB and several photos will exceed it. Direct-to-storage also
  matches how the equipment admin already works.
- **Pull from existing equipment listings**: a picker over current equipment.
  Selecting one creates an item with `source='equipment'`, `equipment_id` set,
  and photo URLs copied across.

  These reference files in `equipment-images`, not copies. If a listing's photos
  are later deleted the survey item's images break. Acceptable for a short-lived
  survey; if it may outlive the listings, copy the files into `survey-images`.
- Edit title, reorder (`sort_order`), add an admin note
- **Active/inactive** per item — inactive disappears from the survey but keeps
  its answers
- **Set confirmed owner** — `OWNER_OPTIONS` or blank. Cory's record only
- Soft delete

### Tab 3 — Results

The payoff. A matrix:

- **Rows**: items (thumbnail + title)
- **Columns**: one per respondent, **including revoked and frozen ones** —
  their answers still count
- **Cells**: that person's current pick, with a marker for a note (tap to read)
  and a distinct marker when the answer was **changed** — tap for the full
  history with timestamps
- **Consensus**: most-picked name and the split, e.g. "Doug (3 of 4)"

  **Exclude "Not sure" from the winner.** Report it separately —
  "Doug (2 of 4, 1 unsure)". Counting it produces a nonsense consensus of
  "Not sure" on exactly the items most needing follow-up.

  Distinguish visually: unanimous / majority / tied / nobody knows /
  unanswered. Tied and nobody-knows are the ones needing a phone call.
- **Confirmed owner**: editable inline
- Filters: unanswered, disputed, unconfirmed, nobody-knows, **changed answers**
- **Export CSV**

The matrix will be wide. Let it scroll horizontally inside its own container;
the page must not scroll sideways.

**CSV requirements:** one row per item; per respondent, a column for their
current answer and one for their note; consensus; confirmed owner; a flag for
any changed answer. Quote every field and escape embedded quotes — notes will
contain commas and line breaks. Include a UTF-8 BOM so Excel doesn't mangle it.

A **second CSV — full history** — one row per answer ever given, with
respondent, item, owner, note, timestamp, and IP. This is the audit trail. If
the record is ever questioned, this is the file that answers it.

---

## Non-goals

- Respondents cannot add items or see each other's answers
- No email or SMS sending — Cory texts each link himself
- No public visibility: `/survey` is unlinked and disallowed in `app/robots.js`
- No password reset — there are no passwords

---

## Acceptance checklist

**Access**
- [ ] A valid token link opens the confirmation screen showing the right name
- [ ] An invalid, revoked, or made-up token shows the same neutral message
- [ ] Revoking locks the person out on their very next request
- [ ] Regenerating a link kills the old one immediately and keeps answers
- [ ] A frozen respondent can view but not change anything
- [ ] `/survey/[token]/items` with a bad token contains **no survey markup** in
      the response body

**Survey**
- [ ] Answers save automatically and survive closing and reopening the browser
- [ ] A note typed and then closed without blurring is still saved
- [ ] Tapping several radios quickly leaves the last tap as the current answer
- [ ] A failed save shows a retry, not silence
- [ ] The payload contains no other respondent's answers, no `admin_note`, and
      no `confirmed_owner`
- [ ] Usable one-handed on a phone

**Integrity**
- [ ] Changing an answer creates a **second row**; the first still exists
- [ ] The Results matrix marks changed answers and shows the history
- [ ] The history CSV contains every answer ever given, with timestamps
- [ ] Opening a link from a second device increments the Devices count

**Admin**
- [ ] A logged-in Supabase user **not** in `survey_admins` cannot read or write
      any survey table — verified against the live database, not just the UI
- [ ] Four photos from an iPhone upload successfully in one go
- [ ] An existing equipment listing pulls in with its photos
- [ ] Deactivating an item removes it from the survey without deleting answers
- [ ] Consensus excludes "Not sure" from the winner and reports it separately
- [ ] An item everyone answered "Not sure" looks different from an unanswered one
- [ ] Bulk-revoking three selected people works from a phone
- [ ] CSV opens cleanly in Excel with notes containing commas and line breaks

**Safety**
- [ ] All five survey tables are unreadable with the public anon key
- [ ] The four `SECURITY DEFINER` functions are the only anon-executable path
- [ ] **No new environment variables exist.** `grep -r "SERVICE_ROLE\|SESSION_SECRET" web/` returns nothing
- [ ] `/survey` is noindex and disallowed in robots.txt
- [ ] Existing public pages and admin are unchanged

---

## Changes from v1

| v1 | v2 | Why |
|---|---|---|
| Email/phone allowlist sign-in | Per-person token links | Family already know each other's phone numbers — the allowlist credential is one the adversary has by default |
| Service role key in route handlers | `SECURITY DEFINER` functions + RLS | Removes the highest-consequence secret from a public repo |
| HMAC session cookie + secret | The token is the credential | Nothing to sign, nothing to leak, no edge-runtime crypto problem |
| `ADMIN_USER_IDS` env var | `survey_admins` table | Enforced by the database, not by remembering to check |
| Login rate-limit table | Dropped | No login to brute-force; a 32-char token isn't guessable |
| Phone/email normalization | Dropped | v1 called this the most likely source of "it says I'm not on the list" — it can no longer happen |
| Answers upserted | Append-only history + view | A changed answer must be visible, not silent |
| — | Access log | Forwarding becomes detectable before answers are corrupted |
| — | Freeze respondent | Lock a completed set of answers |
| — | Confirmation screen | An honest person given a forwarded link stops |
| `photos: [{url, order}]` | `[{url, is_main, sort_order}]` | Matches `equipment` and `updates`, so `lib/photos.js` works unchanged |
| "four survey tables" | Five, all covered | v1's blanket RLS statement missed the rate-limit table |
