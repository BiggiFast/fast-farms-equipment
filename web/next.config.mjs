/** @type {import('next').NextConfig} */
const nextConfig = {
  // The old static site's package.json sits one level up, which makes Next
  // guess the wrong workspace root. Pin it to this folder.
  turbopack: {
    root: import.meta.dirname,
  },

  // Hide the floating dev-tools badge. It's development-only and never
  // appears on the deployed site, but it sits over the page while working.
  devIndicators: false,
}

export default nextConfig
