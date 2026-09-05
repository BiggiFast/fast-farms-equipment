'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'

const GA_ID = 'G-BDKD0NT6KJ'

// Analytics is deliberately NOT loaded everywhere.
//
// /admin — it's a private tool used by one person. Measuring it adds noise to
//   the numbers and tells us nothing.
//
// /survey — this one matters. Google Analytics reports the current page path,
//   and survey URLs will contain a respondent's private token
//   (/survey/k3n8fj2m9x7qp4wv6htz). Loading GA there would hand a live
//   credential to Google on every page view. See docs/SURVEY_SPEC.md, which
//   makes the same point about the Referer header.
const EXCLUDED = ['/admin', '/survey']

export default function Analytics() {
  const pathname = usePathname()

  if (EXCLUDED.some((prefix) => pathname.startsWith(prefix))) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  )
}
