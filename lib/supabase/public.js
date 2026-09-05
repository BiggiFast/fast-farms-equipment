// Cookie-free Supabase client for PUBLIC reads.
//
// Public pages show only published content, so they don't need to know who is
// signed in. Skipping cookies means these queries also work at BUILD time
// (inside generateStaticParams), where there is no HTTP request to read
// cookies from.
//
// For anything auth-aware, use ./server.js (Server Components) or
// ./client.js (browser).
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  )
}
