import Link from 'next/link'
import SignOutButton from '@/components/SignOutButton'

export const metadata = {
  title: 'Admin',
  // Keep the admin out of Google entirely
  robots: { index: false, follow: false },
}

const SECTIONS = [
  { href: '/admin', label: 'Home' },
  { href: '/admin/updates', label: 'Updates' },
  { href: '/admin/projects', label: 'Projects' },
  { href: '/admin/equipment', label: 'Equipment' },
]

// Self-contained: this layout does not assume anything about its parent's
// padding. It used to break out of one with negative margins, which silently
// stopped working when the site's CSS changed and threw the whole admin
// against the left edge of the window.
export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b bg-paper-warm">
        <div className="mx-auto w-full max-w-3xl px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/admin" className="text-sm font-semibold">
            Admin
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="underline">
              View site
            </Link>
            <SignOutButton />
          </div>
        </div>

        {/* Scrolls sideways on a narrow phone instead of wrapping into a mess */}
        <div className="mx-auto w-full max-w-3xl overflow-x-auto">
          <nav className="flex gap-2 px-4 pb-3">
            {SECTIONS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="whitespace-nowrap rounded border px-3 py-2 text-sm"
              >
                {s.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  )
}
