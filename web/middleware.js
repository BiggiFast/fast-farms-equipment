import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request) {
  return await updateSession(request)
}

// Only run on admin routes — the public site stays fast and cache-friendly.
export const config = {
  matcher: ['/admin/:path*'],
}
