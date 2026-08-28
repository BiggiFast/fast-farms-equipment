import { updateSession } from '@/lib/supabase/middleware'

// Next.js 16 renamed the "middleware" file convention to "proxy".
// Same behaviour, same request lifecycle — only the filename and the export
// shape changed. This runs before every matched request.
export default async function proxy(request) {
  return await updateSession(request)
}

// Only run on admin routes — the public site stays fast and cache-friendly.
export const config = {
  matcher: ['/admin/:path*'],
}
