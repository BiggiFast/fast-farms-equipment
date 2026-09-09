# Decisions

Why things are the way they are. **Append-only** — newest at the top. If a
decision is reversed, add a new entry saying so rather than editing the old one.

The point of this file is to stop re-litigating settled questions after a gap in
work, and to make it obvious when something was a deliberate choice rather than
an accident.

---

## 2026-09-08 — Survey merged and live; three changes from using it

**Decided:** Merged `survey` into `main` and deployed. The survey is live on
mrcoryfast.com. Verified against production afterwards rather than trusting the
preview: a bad token returns no survey markup at all, survey pages emit
`no-referrer` and `noindex` with no cross-origin links, every admin route
redirects when signed out, and the public site is untouched — the tractor page
still carries `"price":183000`.

**Decided (Cory's, and better than the original):** the card shows the photos
BEFORE the names. It previously asked people to pick an owner and only then
showed them the machine, which is backwards for a question that is entirely
"do you recognise this?". Name order became Grandpa, Doug, Kirk, Kaley, Not
sure. Neither needed a migration — the CHECK constraint on
`survey_responses.owner` tests membership, not order, and answers store the
name as text.

**Decided:** the photo viewer moves between photos rather than closing between
each. Cory: *"right now i need to hit close on each one and click on the next
one to enlarge it."* Arrows, swipe, keyboard, and a "2 of 3" counter. It
**clamps at the ends rather than wrapping** — jumping from the last photo back
to the first reads as a glitch — and the disabled arrow stays visible, because
a control that vanishes also looks like a fault.

**Decided:** Revoke → Reactivate restores the person's ORIGINAL link, and that
is right. Cory noticed and asked whether reactivating should force a new link.
It should not: a routine pause would then mean re-texting everyone, and the
likely outcome is that Revoke stops being used at all. But the reasoning
exposes a real gap — reactivating after a suspected *leak* puts the leaked link
back in service, and the admin gives no hint which situation you are in.
**Proposed, not yet built:** a confirmation on Reactivate naming the trade-off,
making Regenerate also reactivate so fixing a leak is one tap rather than two,
and surfacing `token_rotated_at` in the row.

**Decided:** the sold grain truck is a separate, optional script rather than
part of the bulk load. The survey records who ORIGINALLY owned each machine,
and that does not stop mattering because the machine is gone — if there is ever
a question about who the proceeds belonged to, the survey is the only record of
what the family remembered. That is Cory's judgement to make about his own
family, not a default to bury in a script.

**A correction worth recording.** Production's `robots.txt` was reported as
being overridden by Cloudflare. It is not — Cloudflare *appends* its managed
AI-crawler block to the origin's file, and the survey rules are present. The
check had been run *during* the deploy, while the old site (which had no
robots.txt at all) was still answering. **Wait for a deploy to finish before
concluding anything from what production returns.**

---

## 2026-09-07 — Survey approved as built; merge before adding real people

**Decided:** The survey is finished as built. Cory tested it on the Vercel
preview and kept it, including the confirmation screen's wording — he asked to
see that copy written out, considered rewriting it, and concluded it was fine.
**His call.** The text is plain content with nothing load-bearing behind it, so
it can be changed at any time without touching the security model.

**Decided:** Merge to `main` BEFORE adding the real people and items, rather
than doing the data entry from the preview.

**Why**, and it is the kind of thing that only bites after the work is done:
the admin's "Copy link" button builds its URL from `window.location.origin`.
Used on a preview deployment it produces a `...vercel.app` link that demands a
Vercel login, so family could not open it. Because preview and production share
one Supabase project, the people and photos *would* save correctly — the data
would be right and only the handed-out links useless, which is exactly the sort
of failure that isn't noticed until somebody says the link doesn't work.

Merging first is safe on its own: `/survey` is unlinked, noindexed and
disallowed in robots.txt, so the visible site does not change.

**Revisit if:** the admin ever needs to be used from more than one domain. The
honest fix would be a configured public base URL rather than reading the
current origin — deliberately not built now, because one domain is the whole
requirement and the extra setting would be one more thing to get wrong.

---

## 2026-09-06 — The survey: five choices, and one bug the checks caught

**Decided:** Built the ownership survey to `SURVEY_SPEC.md` v2 in four stages —
database, family pages, admin, results. On branch `survey`, pushed but not
merged; `main` and production are untouched.

**Committed to a branch rather than `main`, deliberately.** `main` deploys
straight to production and the database is already in place, so merging would
put a live `/survey` on the site within minutes. That should be a decision Cory
makes, not a side effect of the word "commit."

**Answers are append-only, and not even the admin can edit one.** No policy
anywhere permits `UPDATE` on `survey_responses`; the admin has SELECT and DELETE
only. The survey exists because some family members may later dispute who owned
what, and a record its holder can quietly tidy up is worth little to anyone
outside the family. A changed answer leaves both rows, and the Results matrix
flags it.

**"Not sure" is counted but can never win a consensus.** Letting it win would
produce a consensus of "Not sure" on exactly the items most needing a follow-up
call. The winner is chosen from named people only and the unsure count is
reported beside it — "Doug (2 of 4, 1 unsure)". A consequence worth knowing:
one named answer against three unsure reads as "Doug (1 of 4, 3 unsure)". Thin
evidence, but shown with its count rather than as a bare name.
`lib/surveyResults.js` is pure functions so this stays checkable; 15 checks
cover it plus CSV quoting of notes containing commas, quotes and line breaks.

**A fifth `SECURITY DEFINER` function beyond the spec's four.** The spec has
admin policies sub-query `survey_admins` directly, which would recurse when
applied to `survey_admins` itself and would make every other table depend on a
second policy evaluating correctly. `is_survey_admin()` does the lookup with the
owner's privileges and returns a boolean. It is granted to `authenticated` only,
so the spec's real claim — that the four functions are the only *anon*-executable
path — still holds, and `006_VERIFY_survey.sql` asserts it.

**Revocation now shuts a page that is already open.** Cory asked for it after
testing. The database already refused the writes, so nothing was ever at risk;
the page merely *looked* usable, which he judged confusing. It acts on the
refusal reason the function already returns. He explicitly declined extending
this to photo taps: a server check per tap would clutter the access log, which
is the very thing that makes a forwarded link visible. **His call, and the
right trade.**

**The bug the checks caught.** `is_survey_admin()` was left callable by `anon`,
because `REVOKE ... FROM PUBLIC` does not remove a grant Supabase made to
`anon` by name. Harmless in practice — it returns `false` for an anonymous
caller and there is no data behind it — but it broke the rule that there are
exactly four doors. Found by `006_VERIFY_survey.sql` on its first real run,
which is the argument for writing verification that asserts the *design*, not
just that things exist.

**Revisit if:** the survey outlives the equipment listings. Survey items link to
`equipment.id` and copy photo *URLs*, not files — deleting a listing's photos
would break the survey item's images while keeping its answers. Fine for
something short-lived; copy the files into `survey-images` if it isn't.

## 2026-09-04 — Launched, and the four layers that had to be peeled back first

**Decided:** Cut over by merging `nextjs-rebuild` into `main`, which deletes
`vercel.json` and lets Vercel run the Next.js build.

**Why it took four attempts to get a working preview.** Each layer only became
visible once the previous one was fixed:

1. `vercel.json`'s legacy `builds` array made Vercel skip framework detection
   and serve `legacy/public/` statically. The first preview was the *old* site;
   Cory spotted it because the per-machine equipment pages were missing.
2. The app lived in `web/`, while Vercel builds from the repo root. Fixed by
   moving the app to the root and the old site to `legacy/`.
3. The Vercel project had no `NEXT_PUBLIC_SUPABASE_*` environment variables —
   the old static site hardcoded them.
4. The Framework Preset was **Express**, auto-detected in December from the old
   root `package.json`. Harmless while `vercel.json` existed; decisive once it
   was gone.

**A real bug found along the way.** The build failure in (3) should have been
survivable — `safeList` exists so a database problem can't break a deploy. But
`createPublicClient()` was called one line *above* the try/catch meant to
protect it, so every list query threw straight past its own safety net.
Fixed, with a comment saying why it must not be hoisted back out.

**Two regressions caught after launch**, both worse than the 404s that led to
them: the contact page (the phone number was a buyer's only way to reach Cory)
and the password reset page (Supabase recovery emails link to it; losing it
meant a lockout with no way back). Both rebuilt, and the phone number now
appears on the listings page and every machine page rather than only on a
contact page someone has to find.

---

## 2026-09-04 — Analytics excluded from /admin and /survey

**Decided:** `components/Analytics.jsx` skips any path starting with `/admin`
or `/survey`.

**Why:** `/admin` is a private tool used by one person; measuring it only adds
noise. `/survey` matters more — Google Analytics reports the current page path,
and survey URLs will contain a respondent's private token. Loading GA there
would send a live credential to Google on every page view, the same leak the
spec already guards against for the `Referer` header. Recorded in the spec so
the exclusion isn't removed by someone who doesn't know why it exists.

---

## 2026-09-04 — Layout components size themselves; no breaking out with negative margins

**Decided:** The admin layout owns its own container and padding.

**Why:** It previously used `-mx-4 -my-8` to break out of a parent that had
`px-4 py-8`. Porting the site design replaced that parent with a bare flex
column, and the admin was thrown 16px past the left edge of the window with
"Sign out" cut off — no error, nothing in the build output. Cory found it by
looking at the page.

A component positioned by negative margins is silently coupled to its parent's
padding and breaks without warning when that changes.

**Also:** the public site header and footer no longer render on `/admin`. The
admin is a tool, not part of the site, and stacking the two sets of chrome was
what collided.

---

## 2026-09-04 — Survey spec hardened after a second security pass

**Decided:** Added three requirements to `docs/SURVEY_SPEC.md` after Cory asked
whether v2 really removes v1's security exposure.

**What the review confirmed:** v1's worst case was total compromise of the whole
Supabase project — the service role key ignores RLS entirely, so a leak exposed
equipment, projects, updates and auth users, not just the survey. v2 removes
that failure mode rather than mitigating it, because the key no longer exists.

**What it also found — two real gaps in v2 as written:**

1. **`SECURITY DEFINER` functions were not required to pin `search_path`.**
   Without it, a caller can point the search path at objects they control and
   the elevated function operates on those. Classic privilege escalation. Now
   mandatory, along with a ban on dynamic SQL inside these functions.

2. **Referrer leakage.** The token lives in the URL, so clicking any external
   link from a survey page could send it to a third party in the `Referer`
   header. Survey pages now emit `no-referrer` and carry no cross-origin links
   at all — including the site nav and footer, so the survey gets its own bare
   layout.

**Third item — VERIFIED 2026-09-04.** Supabase auth is correctly locked down:
"Allow new users to sign up" off, "Allow anonymous sign-ins" off, manual linking
off, confirm email on, email provider on. Anonymous sign-ins turned out to
matter as much as signups — if enabled, Supabase hands anyone a real
`authenticated` token with no account at all, which is exactly the role the
admin policies grant to. **If either is ever switched on, this design needs
revisiting.**

**Honest residual risk, accepted:** anyone holding a link can answer as that
person, and URLs leak in ways passwords don't. Mitigated by revocation, the
access log, and the confirmation screen — not eliminated. This is the design,
not a defect.

---

## 2026-09-03 — Survey uses token links and introduces no new secrets

**Decided:** Rewrote the survey spec (v2). Respondents get a private link
containing a random 32-character token instead of signing in with an email or
phone number. Admin access is enforced by an RLS policy checking `auth.uid()`
against a `survey_admins` table. Respondents reach data only through four
`SECURITY DEFINER` functions.

**Why:** Cory revealed the real threat model — some family members have an
incentive to avoid establishing ownership so they can later claim machinery.
That makes v1's allowlist the *weaker* design: family already know each other's
phone numbers, so the credential is one an adversary holds by default. A token
must leak to be abused, and leaking is detectable.

Removing the service role key also removes the highest-consequence secret from
what is a **public** GitHub repo. v2 needs no new environment variables at all —
`SUPABASE_SERVICE_ROLE_KEY`, `SURVEY_SESSION_SECRET`, and `ADMIN_USER_IDS` are
all designed out. It further deletes the phone-normalization bug v1 itself
called the most likely cause of "it says I'm not on the list."

**Three additions Cory approved**, all driven by the threat model:
1. Bulk revocation with checkboxes — kill a circulating link from a phone
2. An access log — forwarding becomes visible *before* answers are corrupted
3. Append-only answers — a changed answer is history, not a silent overwrite

**Also:** a full-history CSV export. If the record is ever questioned, an
unalterable log with timestamps is what gives it weight.

**Revisit if:** the survey needs to be opened to people Cory can't text
individually.

---

## 2026-09-03 — A pre-commit hook blocks secret-shaped commits

**Decided:** `.githooks/pre-commit`, enabled via `core.hooksPath`, refuses any
commit containing `.env` files, JWT-shaped strings, `sb_secret_` keys,
`*_SECRET` / `*_SERVICE_ROLE_KEY` with a real value, or PEM private keys.

**Why:** The GitHub repo is **public**. Bots scan public commits for keys within
minutes, so a leaked secret can't be un-leaked by rotating it afterwards. Kept
even though v2 needs no secrets — the guard costs nothing and the next feature
might.

**Bypass:** `git commit --no-verify`, for genuine false positives only.

---

## 2026-09-02 — The state-saving skill is `/save-state`, not `/checkpoint`

**Decided:** The skill is named `save-state`. "Checkpoint" remains the trigger
phrase in its description.

**Why:** `checkpoint` is a built-in Claude Code CLI command, so a skill by that
name can't be invoked — the Skill tool refuses it and points at the built-in.
Discovered by trying to run it. The word Cory actually says is "checkpoint," so
that stays a trigger; only the slash command changed.

---

## 2026-09-02 — Deploy the current design first; no "coming soon" banner

**Decided:** Port the existing visual design into the Next.js app, deploy that,
and apply the new design later as a normal update. No "new site coming soon"
message.

**Why:** Cory suggested a coming-soon banner over the hero. A buyer deciding
whether to call about a $200k tractor reads "unfinished" as "not serious." If
the site looks like it does today, there's no gap to apologize for — the current
design isn't a placeholder, it's a design he chose. Deploying also gets the
per-machine equipment pages indexed by Google weeks earlier than waiting on the
redesign.

**Also decided:** deploy and survey are **separate steps, in that order**. The
cutover has real risk (`vercel.json` forces static serving of `public/`), and it
shouldn't be debugged alongside a new feature carrying service-role keys.

---

## 2026-09-02 — Survey owner options stay as specified

**Decided:** `OWNER_OPTIONS = ['Grandpa', 'Doug', 'Kaley', 'Kirk', 'Not sure']`.
No "Mom" option and no "Someone else" option.

**Why:** Claude raised that the stated purpose mentions Mom's equipment but the
list has no Mom. Cory: all the equipment was Doug's; Mom never owned any
independently, and the family will understand "Doug" to mean that. Every item he
plans to upload belongs to someone on the list, and the free-text note covers
anything unexpected.

**Revisit if:** items start appearing that genuinely belong to nobody listed.

---

## 2026-09-02 — Survey uses the current design, not the new one

**Decided:** The ownership survey mimics the existing site design.

**Why:** It's temporary, invite-only, and unlinked. It shouldn't block on the
redesign, and it shouldn't get its own visual language.

---

## 2026-08-28 — Site is light-only; no dark mode

**Decided:** No `prefers-color-scheme` block in `globals.css`.

**Why:** The Next.js starter shipped one, so the site rendered dark on a
dark-mode Mac. Cory preferred the light theme. Rather than force white, the
palette from the old site's `main-styles.css` was carried over — his own
choices, described there as "Oregon farm in spring."

---

## 2026-08-28 — Equipment relisted; sold items stay hidden

**Decided:** The five remaining machines are active. The 1995 International
Harvester 4900 Grain Truck stays `is_active = false` because **it sold**.

**Why:** All listings had been switched off during family friction, leaving the
public equipment page effectively empty — only a non-equipment "Site UPDATE"
post was visible. That post is now soft-deleted.

**Open:** sold items are currently indistinguishable from hidden ones. A real
`sold` state would let the page stay up marked SOLD rather than 404ing, which is
better for buyer trust and for saved links. Deferred, not rejected.

---

## 2026-08-27 — Content lives in Supabase, not markdown files

**Decided:** Projects and updates are database rows, edited through a web admin.

**Why:** Cory's requirement was posting from his phone while away from the
computer. Markdown-in-the-repo would mean writing a file, committing, and
triggering a rebuild — from a phone, standing in a field. He wouldn't do it.
Supabase publishes instantly with no deploy.

---

## 2026-08-27 — Projects have many updates; updates can stand alone

**Decided:** `updates.project_id` is nullable. An update may belong to a project
or be a standalone post. The feed shows everything chronologically; project
pages collect their own.

**Why:** Cory described wanting to "add an idea or an update to a post" over
time — a build log, not a blog. But forcing every passing thought into a project
adds friction to the thing he most wants to do. The nullable FK supports both.

**Consequence:** deleting a project sets `project_id` to NULL rather than
cascading. Months of daily entries must not vanish because a project was tidied
up.

---

## 2026-08-27 — One page per piece of equipment

**Decided:** Each listing renders server-side at `/equipment/<slug>` with its
own title, description, share image, and Product structured data.

**Why:** Cory's own idea, and the highest-value SEO change available. Listings
previously lived at one URL and were fetched by JavaScript after load, so
crawlers saw an empty page and there was no URL to rank. Now a search for
"New Holland H7230 haybine for sale" can land on that exact machine.

---

## 2026-08-27 — List queries fail soft; detail queries throw

**Decided:** `getFeed`, `getProjects`, `getEquipment` log and return `[]` on
error. `getEquipmentItem` and `getProject` deliberately throw.

**Why:** A transient database outage shouldn't break a deploy or blank the site.
But a detail page rendering a blip as "not found" risks a cached 404 getting a
live listing deindexed — the opposite of the goal.

---

## 2026-08-27 — Rebuild in Next.js rather than extending the static site

**Decided:** Rebuild in Next.js 16 in `web/`, keeping the old site live until
cutover.

**Why:** Four things the static site couldn't do well: shared layouts (adding
Google Analytics meant editing every page by hand), image optimization on a
photo-heavy site, per-page metadata and share cards, and server-rendered content
that search engines can actually read. A growing project feed is exactly what
hand-written HTML is worst at.
