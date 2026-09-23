import type { NextConfig } from 'next';

// Static export: the whole app is client-side. No API routes or server functions,
// so it deploys on Vercel Hobby as static files and keeps working offline once loaded.
const nextConfig: NextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
