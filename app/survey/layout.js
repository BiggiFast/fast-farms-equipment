// The survey's own bare layout.
//
// THE TOKEN IS IN THE URL, which makes these pages different from every other
// page on the site. Two consequences drive everything here:
//
// 1. `referrer: 'no-referrer'` — if a visitor clicks a link to another site,
//    the browser normally sends the page's full URL along as the Referer
//    header. On a survey page that URL is a live credential, and it would be
//    handed to whoever they clicked through to.
//
// 2. No outbound links at all. Not the site nav, not the footer's Instagram
//    link. SiteHeader and SiteFooter both bow out for /survey, the same way
//    they already do for /admin, so there is nothing here to click through.
//    Google Analytics is excluded too — see components/Analytics.jsx.
//
// noindex is belt and braces: nothing links here, and robots.txt disallows it.
export const metadata = {
  title: 'Equipment survey',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
}

export default function SurveyLayout({ children }) {
  return <div className="survey">{children}</div>
}
