/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse is a CommonJS lib with a test harness that touches the FS at import;
  // keep it server-side only.
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
  },
};

export default nextConfig;
