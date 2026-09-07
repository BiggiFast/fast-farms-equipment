// Every call into the survey's database functions, in one place.
//
// Respondents have no account. All five survey tables refuse the public key
// outright, and the only way in is the four SECURITY DEFINER functions in
// supabase/migrations/006_survey.sql, each of which takes the person's token
// and validates it itself. Those `.rpc()` calls belong here and nowhere else —
// scattering them through components is how one of them eventually gets called
// without its token, or with the wrong one.
//
// Shared constants live in lib/survey.js instead, because a Client Component
// imports those and importing this file would drag the whole Supabase library
// into the browser bundle for no reason.

import { createPublicClient } from '@/lib/supabase/public'
import { isWellFormedToken } from '@/lib/survey'

/* ------------------------------------------------------------------- IP */

// x-forwarded-for is a chain — "the visitor, proxy1, proxy2" — and only the
// first entry is the actual person. Read on the server because a browser
// cannot report its own address honestly, and the whole point of logging it is
// to notice when one link starts arriving from several places.
export function clientIp(headerList) {
  const forwarded = headerList.get('x-forwarded-for')
  if (!forwarded) return null
  return forwarded.split(',')[0]?.trim() || null
}

/* -------------------------------------------------------------- INTERNAL */

// A failure here THROWS rather than returning null, and the distinction
// matters more than it looks.
//
// `null` means "this link is not a live one" — the screen says so, politely.
// If a database hiccup also came back as null, a family member holding a
// perfectly good link would be told it had been revoked, and the natural
// reaction to that is to assume they've been cut out. Better a plain error
// page they'll read as "something broke, try again".
async function callSurveyFunction(fn, args) {
  const { data, error } = await createPublicClient().rpc(fn, args)
  if (error) {
    throw new Error(`[survey] ${fn} failed: ${error.message ?? error}`)
  }
  return data
}

/* ----------------------------------------------------------------- READS */

// Whose link is this? Returns { name, is_frozen }, or null for anything that
// isn't currently live — unknown, revoked, or malformed alike. The caller must
// not tell those apart on screen either.
export async function openSurvey(token, { ip = null, userAgent = null } = {}) {
  if (!isWellFormedToken(token)) return null

  // survey_open RETURNS TABLE, so Supabase hands back an array of rows.
  // No rows is the "not a live link" answer.
  const rows = await callSurveyFunction('survey_open', {
    p_token: token,
    p_ip: ip,
    p_user_agent: userAgent,
  })
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

// The survey itself: { name, is_frozen, items: [{ id, title, photos, owner,
// note }] }, where owner/note are THIS person's current answer or null.
// Null for any link that isn't live.
//
// The function returns those five fields by name — never admin_note, never
// confirmed_owner, never anyone else's answers. The blindness is enforced in
// the database, not here, so a mistake in this file cannot leak them.
export async function loadSurvey(token, { ip = null, userAgent = null } = {}) {
  if (!isWellFormedToken(token)) return null

  return await callSurveyFunction('survey_load', {
    p_token: token,
    p_ip: ip,
    p_user_agent: userAgent,
  })
}

// { answered, total } for the confirmation screen, so somebody coming back
// after a few days can see where they left off. Null if the link isn't live.
export async function getProgress(token) {
  if (!isWellFormedToken(token)) return null

  return await callSurveyFunction('survey_progress', { p_token: token })
}

/* ----------------------------------------------------------------- WRITE */

// Append one answer. Never an update — every answer is a new row, and a
// changed mind leaves both.
//
// Returns { ok: true } or { ok: false, reason } where reason is one of
// inactive | frozen | unknown_item | bad_owner.
//
// Note there is no respondent argument. The database derives who this is from
// the token alone, so there is nothing here anyone could tamper with to answer
// as somebody else.
export async function appendAnswer({
  token,
  itemId,
  owner,
  note = null,
  ip = null,
}) {
  if (!isWellFormedToken(token)) return { ok: false, reason: 'inactive' }

  return await callSurveyFunction('survey_answer', {
    p_token: token,
    p_item_id: itemId,
    p_owner: owner,
    p_note: note,
    p_ip: ip,
  })
}
