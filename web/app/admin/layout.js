// Applies to everything under /admin, INCLUDING the login page.
// Deliberately renders no chrome — the signed-in navigation lives in
// (dashboard)/layout.js so the login screen doesn't show a section nav and a
// "Sign out" link to someone who isn't signed in yet.
export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({ children }) {
  return children
}
