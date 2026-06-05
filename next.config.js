/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Electron — static export so Next.js runs in the desktop app
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true, // Electron can't use Next.js image optimisation
  },
}

module.exports = nextConfig