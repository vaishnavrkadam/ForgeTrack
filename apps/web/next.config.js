/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@forgetrack/contracts', '@forgetrack/shared'],
};

module.exports = nextConfig;
