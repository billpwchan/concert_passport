import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  agentRules: false,
  output: 'standalone',
  turbopack: { root: process.cwd() },
  experimental: { cpus: 1 },
  poweredByHeader: false,
};

export default nextConfig;
