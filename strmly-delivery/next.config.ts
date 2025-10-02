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
   images: {
    domains: [
      'strmly-videos-dev-mumbai-2.s3.ap-south-1.amazonaws.com'
    ],
  },
};

export default nextConfig;
