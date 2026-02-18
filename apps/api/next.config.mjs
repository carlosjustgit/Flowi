/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      '/api/**': ['../../packages/core/**/*', '../../packages/schemas/**/*', '../../packages/prompts/**/*', '../../ai-studio-instructions/**/*'],
    },
  },
  transpilePackages: ['@flow/core'],
};

export default nextConfig;
