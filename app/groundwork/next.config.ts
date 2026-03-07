import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.solana.com wss://*.solana.com https://*.helius.dev https://*.plaid.com https://cdn.plaid.com",
              "frame-src 'self' https://*.plaid.com https://cdn.plaid.com",
              "script-src-elem 'self' 'unsafe-inline' https://cdn.plaid.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
