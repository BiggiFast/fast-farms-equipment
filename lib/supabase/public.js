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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Supabase's own error for this is just "supabaseUrl is required", which
  // says nothing about where to fix it. On Vercel the answer is almost always
  // "these were never added to the project's Environment Variables".
  if (!url || !key) {
    const missing = [
      !url && 'NEXT_PUBLIC_SUPABASE_URL',
      !key && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ]
      .filter(Boolean)
      .join(' and ')
    throw new Error(
      `Missing ${missing}. Set them in .env.local for local development, and ` +
        `in the Vercel project's Environment Variables for deploys.`
    )
  }

  return createSupabaseClient(url, key, { auth: { persistSession: false } })
}
