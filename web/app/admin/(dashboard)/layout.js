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

export default function AdminLayout({ children }) {
  return (
    <div className="-mx-4 -my-8">
      <div className="border-b bg-paper-warm">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <span className="text-sm font-semibold">Admin</span>
          <SignOutButton />
        </div>
        {/* Scrolls sideways on a narrow phone instead of wrapping into a mess */}
        <nav className="flex gap-1 px-2 pb-2 overflow-x-auto">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="whitespace-nowrap rounded px-3 py-2 text-sm border"
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="px-4 py-6">{children}</div>
    </div>
  )
}
