// Every read the public site performs, in one place.
//
// These run on the SERVER (Server Components), so results are baked into the
// HTML before it reaches the browser — which is what makes the content
// visible to search engines.
//
// Row Level Security already hides unpublished and soft-deleted rows from
// anonymous visitors. The explicit filters below are belt-and-braces: they
// document intent at the call site and survive any future policy change.

import { createPublicClient } from '@/lib/supabase/public'

/* ----------------------------------------------------------------- HELPERS */

// List pages fail SOFT: if Supabase is unreachable, return an empty list and
// log loudly rather than taking the whole site (or a deploy) down. The page
// shows its empty state and the next revalidation picks the data back up.
//
// Detail pages deliberately do NOT use this — see getProject / getEquipmentItem.
async function safeList(label, run) {
  try {
    const { data, error } = await run()
    if (error) throw error
    return data ?? []
  } catch (error) {
    console.error(`[queries] ${label} failed:`, error?.message ?? error)
    return []
  }
}

/* ------------------------------------------------------------------ FEED */

// The main feed: every published update, newest first, with the project it
// belongs to (if any) attached.
export async function getFeed({ limit = 50 } = {}) {
  // The client is created INSIDE the callback on purpose: creating it can
  // throw (missing env vars), and that must be caught by safeList like any
  // other failure. Hoisting this line out puts it outside the try/catch.
  return safeList('getFeed', () =>
    createPublicClient()
      .from('updates')
      .select('*, project:projects(id, title, slug)')
      .eq('is_published', true)
      .is('deleted_at', null)
      .order('published_at', { ascending: false })
      .limit(limit)
  )
}

/* -------------------------------------------------------------- PROJECTS */

export async function getProjects() {
  return safeList('getProjects', () =>
    createPublicClient()
      .from('projects')
      .select('*')
      .eq('is_published', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
  )
}

// One project plus its updates. Returns null when the slug doesn't exist,
// which the page turns into a 404.
export async function getProject(slug) {
  const supabase = createPublicClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  if (!project) return null

  const { data: updates, error: updatesError } = await supabase
    .from('updates')
    .select('*')
    .eq('project_id', project.id)
    .eq('is_published', true)
    .is('deleted_at', null)
    .order('published_at', { ascending: false })

  if (updatesError) throw updatesError
  return { ...project, updates: updates ?? [] }
}

/* ------------------------------------------------------------- EQUIPMENT */

export async function getEquipment() {
  return safeList('getEquipment', () =>
    createPublicClient()
      .from('equipment')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
  )
}

// Deliberately throws on failure rather than returning null. A database blip
// must not render as "this tractor does not exist" — a cached 404 could get
// the listing dropped from search results.
export async function getEquipmentItem(slug) {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}
