'use client'

// Every write the admin performs. Runs in the browser as the signed-in user,
// so Supabase's RLS policies are what actually authorise each call — this
// file is convenience, not security.
import { createClient } from '@/lib/supabase/client'

/* ------------------------------------------------------------------ LISTS */
// Admin lists include drafts and exclude soft-deleted rows.

export async function listUpdates() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('updates')
    .select('*, project:projects(id, title, slug)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function listProjects() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function listEquipment() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/* ------------------------------------------------------------- SINGLE ROW */

export async function getRow(table, id) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

/* ----------------------------------------------------------- SAVE / DELETE */

// One save for create and update: no id means insert.
export async function saveRow(table, id, values) {
  const supabase = createClient()

  const query = id
    ? supabase.from(table).update(values).eq('id', id).select().single()
    : supabase.from(table).insert(values).select().single()

  const { data, error } = await query
  if (error) throw error
  return data
}

// Soft delete everywhere — consistent with the rest of the project, and
// recoverable if you tap the wrong row on a phone.
export async function softDelete(table, id) {
  const supabase = createClient()
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
