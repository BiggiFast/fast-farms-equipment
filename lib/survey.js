// Everything the survey feature needs from the database, in one place.
//
// The survey is deliberately quarantined: it lives in `app/survey`,
// `app/api/survey`, `app/admin/survey` and this file, so that removing it when
// it has served its purpose is deleting those folders and dropping the tables.
//
// WHY THIS FILE EXISTS AT ALL: respondents have no account. Every survey table
// is closed to the public key, and the only way in is four database functions
// that take the person's token and validate it themselves. Those `.rpc()`
// calls belong here and nowhere else — scattering them through components is
// how one of them eventually gets called without its token.
//
// See docs/SURVEY_SPEC.md and supabase/migrations/006_survey.sql.

/* ------------------------------------------------------------------ ANSWERS */

// The only answers anyone can give. Kept in step with the CHECK constraint on
// survey_responses.owner — if you change one, change the other. The database
// is the backstop: a value missing from that constraint cannot be stored even
// if it reaches the server.
// Order matters on screen but not in the database: the CHECK constraint on
// survey_responses.owner tests membership, so these can be rearranged freely
// without a migration. Adding or renaming one DOES need the constraint changed
// to match.
export const OWNER_OPTIONS = ['Grandpa', 'Doug', 'Kirk', 'Kaley', 'Not sure']

// "Not sure" is a real, useful answer — it is not the same as no answer — but
// it must never win a consensus. Counting it produces a result of "Not sure"
// on exactly the items that most need a phone call. Exported so the Results
// screen and the CSV agree on which name is the special one.
export const UNSURE = 'Not sure'

// A note longer than this is truncated by the database rather than rejected,
// so a long memory is never lost to a silent failure. Mirrored here so the
// textarea can warn before it happens.
export const MAX_NOTE_LENGTH = 2000

/* -------------------------------------------------------------------- TOKEN */

// 16 random bytes as hex. Checked before anything hits the database so that a
// truncated copy-paste fails as "this link isn't active" rather than as an
// error, and so junk never reaches the access log.
const TOKEN_PATTERN = /^[0-9a-f]{32}$/

export function isWellFormedToken(token) {
  return typeof token === 'string' && TOKEN_PATTERN.test(token)
}
