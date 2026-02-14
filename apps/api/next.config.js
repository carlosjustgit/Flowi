/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@flow/core'],
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  }
};

export default nextConfig;
