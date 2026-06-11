import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['jsonwebtoken'],
  env: {
    NEXT_PUBLIC_BASE_URL: 'https://classlogger.com',
  },
};

export default nextConfig;
