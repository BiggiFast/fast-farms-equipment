/** @type {import('next').NextConfig} */
const nextConfig = {
  // The old static site's package.json sits one level up, which makes Next
  // guess the wrong workspace root. Pin it to this folder.
  turbopack: {
    root: import.meta.dirname,
  },
}

export default nextConfig
