import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
  },
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
  },
  api: {
    bodyParser: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
