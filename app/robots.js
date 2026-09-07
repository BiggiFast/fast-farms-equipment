// What crawlers may and may not visit.
//
// Until now the site had no robots.txt at all, which means "crawl everything".
// That was fine when everything was public. It stops being fine the moment a
// URL on this domain is also a credential.
//
// /survey — a survey URL contains a respondent's private token. Nothing links
//   to one, so a crawler has no way to find it, but a token can escape in ways
//   nobody planned: a screenshot, a forwarded message, a browser extension
//   that phones home. This is the last line rather than the first.
//
// /admin and /api — tools, not pages. Nothing there belongs in a search result.
//
// Worth knowing: robots.txt is a public file and asks politely. It keeps
// well-behaved crawlers out; it is not a lock, and it does not hide that these
// paths exist. The actual locks are in the database.
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/survey', '/api'],
    },
  }
}
