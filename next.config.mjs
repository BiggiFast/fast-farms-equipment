/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hide the floating dev-tools badge. It's development-only and never
  // appears on the deployed site, but it sits over the page while working.
  devIndicators: false,

  // The old static site's URLs. People have these bookmarked, they're in
  // sent emails, and Google has them indexed — so they must keep working
  // rather than 404. Permanent (308) so search engines transfer the ranking
  // to the new URL instead of treating it as a separate page.
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/about.html', destination: '/about', permanent: true },
      { source: '/doug.html', destination: '/doug', permanent: true },
      { source: '/equipment/index.html', destination: '/equipment', permanent: true },
      { source: '/equipment/contact.html', destination: '/contact', permanent: true },
      { source: '/equipment/admin.html', destination: '/admin/equipment', permanent: true },

      // Supabase recovery emails already sent point at the .html path.
      // Not permanent: this is a functional endpoint, not a moved page, and
      // a cached 308 on it would be awkward to undo.
      { source: '/reset-password.html', destination: '/reset-password', permanent: false },
    ]
  },
}

export default nextConfig
