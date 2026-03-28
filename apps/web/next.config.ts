import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@bin/shared', '@bin/supabase'],
};

export default nextConfig;
