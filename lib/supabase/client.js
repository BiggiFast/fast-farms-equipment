// Supabase client for the BROWSER.
// Use this inside components marked "use client" — the admin forms, login,
// photo uploads. It keeps the signed-in session in sync with cookies.
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
