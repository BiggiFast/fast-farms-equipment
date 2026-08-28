import Link from 'next/link'
import './globals.css'

// Written ONCE, applied to every page. This is the thing that replaces
// pasting the same header, footer, and analytics tag into every .html file.
export const metadata = {
  metadataBase: new URL('https://mrcoryfast.com'),
  title: {
    default: 'Cory Fast',
    // Every child page becomes "About — Cory Fast" automatically
    template: '%s — Cory Fast',
  },
  description:
    'Projects, updates, and what I am working on. Plus farm equipment for sale.',
  openGraph: {
    siteName: 'Cory Fast',
    type: 'website',
  },
}

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  { href: '/equipment', label: 'Equipment' },
  { href: '/about', label: 'About' },
]

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="border-b">
          <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-wide">
              CORY FAST
            </Link>
            <nav className="flex gap-4 text-sm">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8">
          {children}
        </main>

        <footer className="border-t">
          <div className="mx-auto max-w-4xl px-4 py-6 text-sm flex justify-between">
            <span>&copy; {new Date().getFullYear()} Cory Fast</span>
            <a
              href="https://instagram.com/mrcoryfast"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
          </div>
        </footer>
      </body>
    </html>
  )
}
