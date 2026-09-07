'use client'

// Everything the SURVEY ADMIN reads and writes. Runs in the browser as the
// signed-in user, so the RLS policies in 006_survey.sql are what actually
// authorise each call — this file is convenience, not security. A signed-in
// Supabase user who isn't in `survey_admins` gets nothing back from any of it.
//
// Kept apart from lib/adminApi.js so that deleting the survey later is
// deleting whole files rather than picking functions out of shared ones.
// The generic saveRow / softDelete in adminApi.js are reused for items.

import { createClient } from '@/lib/supabase/client'

/* ----------------------------------------------------------------- PEOPLE */

// One row per family member, with the two numbers that matter:
//   answers — how far along they are
//   devices — how many distinct device+address pairs opened their link
//
// The device count is the forwarding signal. It's assembled here from the raw
// access log rather than in SQL, because the log for a family-sized survey is
// small and a database view would be one more thing to remove afterwards.
export async function listRespondents() {
  const supabase = createClient()

  const [people, log] = await Promise.all([
    supabase
      .from('survey_respondents')
      .select('*, answers:survey_responses(count)')
      .order('created_at', { ascending: true }),
    supabase
      .from('survey_access_log')
      .select('respondent_id, ip, user_agent, occurred_at')
      .order('occurred_at', { ascending: false })
      .limit(5000),
  ])

  if (people.error) throw people.error
  if (log.error) throw log.error

  const visits = new Map()
  for (const row of log.data ?? []) {
    if (!visits.has(row.respondent_id)) visits.set(row.respondent_id, [])
    visits.get(row.respondent_id).push(row)
  }

  return (people.data ?? []).map((person) => {
    const theirs = visits.get(person.id) ?? []
    const devices = new Set(
      theirs.map((v) => `${v.ip ?? '?'}|${v.user_agent ?? '?'}`)
    )

    return {
      ...person,
      // PostgREST returns an embedded count as [{ count: n }].
      answerCount: person.answers?.[0]?.count ?? 0,
      visitCount: theirs.length,
      deviceCount: devices.size,
      // Already sorted newest-first by the query above.
      lastSeen: theirs[0]?.occurred_at ?? null,
      visits: theirs,
    }
  })
}

// 16 random bytes as hex — the same shape the database generates, and the same
// length the survey functions insist on. Produced by the browser's
// cryptographic generator, not Math.random, which is predictable enough to
// guess and has no business anywhere near a credential.
export function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function addRespondent(name) {
  const supabase = createClient()
  // No token supplied: the column's default generates one.
  const { data, error } = await supabase
    .from('survey_respondents')
    .insert({ name })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRespondents(ids, values) {
  const supabase = createClient()
  const { error } = await supabase
    .from('survey_respondents')
    .update(values)
    .in('id', ids)
  if (error) throw error
}

// A new link, and the old one dead on its very next request. Answers are
// untouched — this is the fix for both "she lost the text" and "this one got
// passed around", and it must never cost anybody their answers.
//
// One at a time, because every person needs a DIFFERENT token: a single
// bulk update would hand the same string to everyone selected and quietly
// merge them into one identity.
export async function regenerateTokens(ids) {
  const supabase = createClient()
  for (const id of ids) {
    const { error } = await supabase
      .from('survey_respondents')
      .update({ token: newToken(), token_rotated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }
}

// A real delete, and the only one in the survey. Their answers and access
// history go with it (on delete cascade). Revoke is almost always what you
// actually want — it kills the link and keeps the record.
export async function deleteRespondent(id) {
  const supabase = createClient()
  const { error } = await supabase
    .from('survey_respondents')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/* ------------------------------------------------------------------ ITEMS */

export async function listSurveyItems() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('survey_items')
    .select('*, responses:survey_responses(count)')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error

  return (data ?? []).map((item) => ({
    ...item,
    responseCount: item.responses?.[0]?.count ?? 0,
  }))
}

// The equipment picker. Only live listings, and it reports which ones are
// already in the survey so the same machine can't be added twice.
export async function listEquipmentForPicker() {
  const supabase = createClient()

  const [equipment, existing] = await Promise.all([
    supabase
      .from('equipment')
      .select('id, name, photos, image_url')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name', { ascending: true }),
    supabase
      .from('survey_items')
      .select('equipment_id')
      .not('equipment_id', 'is', null)
      .is('deleted_at', null),
  ])

  if (equipment.error) throw equipment.error
  if (existing.error) throw existing.error

  const used = new Set((existing.data ?? []).map((row) => row.equipment_id))
  return (equipment.data ?? []).map((row) => ({
    ...row,
    alreadyAdded: used.has(row.id),
  }))
}

// Create a survey item from an equipment listing.
//
// The photo URLs are copied but the FILES are not — they still live in the
// equipment-images bucket. If a listing's photos are deleted later, this
// item's images break. That's an acceptable trade for a survey that will
// outlive nothing; if it ever needs to outlive the listings, the files have
// to be copied into survey-images instead.
export async function addItemsFromEquipment(rows) {
  const supabase = createClient()

  const payload = rows.map((row, index) => ({
    title: row.name,
    source: 'equipment',
    equipment_id: row.id,
    photos: normalisePhotos(row),
    sort_order: index,
  }))

  const { error } = await supabase.from('survey_items').insert(payload)
  if (error) throw error
}

// Older equipment rows predate the photos column and carry a single
// image_url instead — same shape lib/photos.js already handles on read.
function normalisePhotos(row) {
  if (Array.isArray(row.photos) && row.photos.length > 0) return row.photos
  if (row.image_url) {
    return [{ url: row.image_url, is_main: true, sort_order: 0 }]
  }
  return []
}

/* ---------------------------------------------------------------- RESULTS */

// Everything the Results screen needs, in one go.
//
// People includes REVOKED and FROZEN respondents on purpose. Someone whose
// link was killed still answered, and their answers still count — dropping
// them from the matrix would quietly rewrite the record, which is the one
// thing this survey exists to prevent.
//
// Items include hidden ones for the same reason: taking an item out of the
// survey stops new answers, it does not retract the ones already given.
export async function loadResults() {
  const supabase = createClient()

  const [items, people, responses] = await Promise.all([
    supabase
      .from('survey_items')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('survey_respondents')
      .select('id, name, is_active, is_frozen')
      .order('created_at', { ascending: true }),
    supabase
      .from('survey_responses')
      .select('*')
      .order('created_at', { ascending: false }),
  ])

  if (items.error) throw items.error
  if (people.error) throw people.error
  if (responses.error) throw responses.error

  return {
    items: items.data ?? [],
    people: people.data ?? [],
    responses: responses.data ?? [],
  }
}

// Cory's conclusion for one item. Separate from the item editor so it can be
// changed inline while reading the matrix, which is when he'll actually decide.
export async function setConfirmedOwner(itemId, owner) {
  const supabase = createClient()
  const { error } = await supabase
    .from('survey_items')
    .update({ confirmed_owner: owner || null })
    .eq('id', itemId)
  if (error) throw error
}
