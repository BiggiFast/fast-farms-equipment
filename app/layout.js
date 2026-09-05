import { Bebas_Neue, EB_Garamond, Montserrat } from 'next/font/google'
import Analytics from '@/components/Analytics'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import './globals.css'

// Self-hosted by Next rather than fetched from Google's CDN on every visit:
// faster, and no flash of unstyled text.
const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
})

const garamond = EB_Garamond({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-eb-garamond',
  display: 'swap',
})

const montserrat = Montserrat({
  weight: ['300', '400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
})

export const metadata = {
  // www is canonical — the bare domain 302s to it. metadataBase makes every
  // relative image and canonical URL absolute, so pointing it at the
  // redirecting host would put a redirect in every share card and canonical
  // tag. Search engines follow those, but it wastes a hop and muddies which
  // URL is authoritative.
  metadataBase: new URL('https://www.mrcoryfast.com'),
  title: {
    default: 'Cory Fast',
    template: '%s — Cory Fast',
  },
  description:
    'Projects, updates, and what I am working on. Plus farm equipment for sale.',
  openGraph: {
    siteName: 'Cory Fast',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${bebas.variable} ${garamond.variable} ${montserrat.variable}`}
    >
      <body>
        <Analytics />
        <SiteHeader />
        <main className="site-main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
