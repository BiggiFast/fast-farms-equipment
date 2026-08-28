import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Runs on every /admin request. Two jobs:
//   1. Refresh the login session so you aren't kicked out mid-post.
//   2. Bounce anyone not signed in to the login page.
export async function updateSession(request) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Must be getUser(), not getSession() — getUser revalidates against the
  // Supabase server, so a forged cookie can't get someone in.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    // Remember where they were headed, so login can send them back
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Already signed in? Skip the login page.
  if (user && pathname === '/admin/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
