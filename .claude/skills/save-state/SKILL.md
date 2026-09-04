---
name: save-state
description: Save the current state of work so the session can end with nothing lost. Use when Cory says "checkpoint", "save state", "let's document where we are", "I'm stopping for now", or otherwise signals he's pausing. Also run proactively before any long or risky operation.
---

# Save state (a.k.a. "checkpoint")

Invoked as `/save-state`. Named that way because `checkpoint` collides with a
built-in Claude Code command — but "checkpoint" is still the word Cory uses, and
saying it should trigger this.

Cory works on this project in short bursts, sometimes days apart, and a session
may end without warning. A checkpoint makes the repository the source of truth
so that **nothing lives only in the conversation.**

Work through all six steps in order. Do not skip a step because it "probably
didn't change" — check, then say so.

---

## 1. Commit outstanding work

```bash
git status --short
git branch --show-current
```

Commit anything uncommitted, in logical chunks with real messages explaining
*why* (see the existing log for the standard — they explain reasoning, not just
what changed).

- Never commit `.env.local`, `SUPABASE_SERVICE_ROLE_KEY`, or `SURVEY_SESSION_SECRET`.
  Verify with `git ls-files | grep -i env`.
- If the work is half-finished, commit it anyway and label it clearly as
  in-progress. An uncommitted tree is the single biggest loss risk.
- Leave the six loose images in `public/images/` and `Images/` alone unless Cory
  has said what they are.

## 2. Update `HANDOFF.md`

This is the file a future session reads first. It must answer, without the
conversation: *what's done, what's next, what's blocked, what's waiting on Cory.*

Update:
- The `Last updated` date and branch
- **Current state** — what's actually true now, not what was planned
- **Next up** — in priority order
- **Needs Cory, not code** — anything blocked on his input, his words, or a
  credential only he can fetch
- Any new gotcha that cost time to discover

Delete anything no longer true. A stale handoff is worse than none.

## 3. Append to `DECISIONS.md` if anything was decided

Only if a real decision was made — a choice between options, a rejected
approach, a reversal.

Format: date, what was decided, **why**, and any "revisit if" condition. Newest
at the top. Append; never rewrite history. If a past decision was reversed, add
a new entry saying so and referencing the old one.

If Cory pushed back and changed the plan, that belongs here — including that it
was his call.

## 4. Update `web/README.md` if the app's architecture changed

Only for structural change: new folders, new routes, a new convention, a
decision worth not undoing. Not for routine edits.

## 5. Update memory

Memory is for facts that outlive this project's files — who Cory is, how he
works, environment quirks, direction. Not a duplicate of `HANDOFF.md`.

Update when:
- The direction or priorities shifted
- A new environment gotcha appeared
- Something was learned about how Cory prefers to work
- A memory is now **wrong** — fix or delete it, don't leave it

Keep `MEMORY.md` in sync — one line per memory.

## 6. Report back, briefly

Tell Cory:
- What was committed, and the branch
- What changed in the docs
- **What's genuinely next**, in one or two lines
- Anything waiting on him

Keep it short. He's stopping, not starting.

---

## Document roles — keep these boundaries

| File | Job | Changes |
|---|---|---|
| `HANDOFF.md` | Living state. Read first. | Every checkpoint |
| `DECISIONS.md` | Why, append-only | When something is decided |
| `README.md` | Orientation for a stranger | Rarely |
| `docs/SURVEY_SPEC.md` | Survey requirements | When the spec changes |
| `docs/PROJECT_SUMMARY.md` | The original static site | Rarely — mostly frozen |
| `docs/*` | Reference: admin setup, security | Rarely |
| `docs/archive/*` | Finished history | Never |
| `web/README.md` | How the Next.js app works | On architectural change |
| Memory | Cross-session facts about Cory and direction | When durable facts change |

If a new document seems necessary, first check whether it belongs in one of
these. The failure mode for this project is too many overlapping files, not too
few.

---

## Notes

- **This skill only loads at session start.** If it was created or renamed
  during the current session, the Skill tool will report it unknown — just
  follow the six steps directly. It will be available next session.
- Cory is learning web development. Explain jargon plainly in the report-back
  and don't assume shorthand lands.
- If something is genuinely unresolved, write it down as unresolved. Do not
  paper over it — an honest open question is more useful later than a
  confident-sounding guess.
