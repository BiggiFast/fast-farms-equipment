/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hide the floating dev-tools badge. It's development-only and never
  // appears on the deployed site, but it sits over the page while working.
  devIndicators: false,
}

export default nextConfig
