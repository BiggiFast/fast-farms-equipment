'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Two variants, matching the original site:
//   overlay — transparent, sits on top of the full-screen hero (home only)
//   solid   — in the flow with dark text (everywhere else)
const NAV = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  { href: '/equipment', label: 'Equipment' },
  { href: '/about', label: 'About' },
]

export default function SiteHeader() {
  const pathname = usePathname()
  const isHome = pathname === '/'

  return (
    <header className={`site-header ${isHome ? 'overlay' : 'solid'}`}>
      <Link
        href="/"
        className={`site-logo ${isHome ? 'site-logo-large' : ''}`}
      >
        CORY
      </Link>
      <nav className="site-nav">
        {NAV.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? 'active' : undefined}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
