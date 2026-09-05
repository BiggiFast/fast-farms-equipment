# Decisions

Why things are the way they are. **Append-only** — newest at the top. If a
decision is reversed, add a new entry saying so rather than editing the old one.

The point of this file is to stop re-litigating settled questions after a gap in
work, and to make it obvious when something was a deliberate choice rather than
an accident.

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
