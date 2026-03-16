/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suppress Edge Runtime false-positive warnings from jose (jwtVerify) and bullmq
  // These libraries are only used in Node.js API routes, never in the Edge middleware.
  experimental: {
    serverComponentsExternalPackages: ["bullmq", "ioredis"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent webpack from trying to bundle Node-native modules in Edge chunks
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "bullmq",
        "ioredis",
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
