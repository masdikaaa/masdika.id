import type { NextConfig } from "next";
import { config } from "dotenv";
import { join } from "path";
import { existsSync } from "fs";

// Load .env from the root of the monorepo for build-time operations
const envPath = existsSync(join(process.cwd(), ".env"))
  ? join(process.cwd(), ".env")
  : existsSync(join(process.cwd(), "../../.env"))
    ? join(process.cwd(), "../../.env")
    : join(__dirname, "../../.env");
config({ path: envPath });

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  output: "standalone",
  experimental: {
    // Raise body size limit for server actions (admin needs up to 5GB)
    serverActions: {
      bodySizeLimit: "5gb",
    },
    // proxyClientMaxBodySize replaces middlewareClientMaxBodySize to configure max body size for Next.js API route bodies in App Router.
    proxyClientMaxBodySize: "10gb",
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/storage-api/:path*",
        // In local mode it tries localhost, in docker it tries minio
        destination: process.env.MINIO_EXEC_MODE === "docker"
          ? `http://minio:${process.env.MINIO_PORT || 9000}/:path*`
          : `http://${process.env.MINIO_ENDPOINT || '127.0.0.1'}:${process.env.MINIO_PORT || 9000}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Clickjacking protection
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // MIME sniffing protection
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrer info control
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Legacy XSS filter (for older browsers)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Feature/Permission policy — deny all risky APIs
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), bluetooth=(), serial=()" },
          // Force HTTPS for 1 year (production only)
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Cross-Origin Resource Policy
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          // Cross-Origin Opener Policy — prevents cross-origin window.opener attacks
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Inline scripts needed for Next.js hydration + Framer Motion + Cloudflare Analytics + Turnstile
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://challenges.cloudflare.com",
              // Inline styles needed for Tailwind/CSS-in-JS
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Google Fonts
              "font-src 'self' https://fonts.gstatic.com data:",
              // Images: self, base64, and all HTTPS sources (for remote images)
              "img-src 'self' data: blob: https:",
              // YouTube iframes + Cloudflare Turnstile
              "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://challenges.cloudflare.com",
              // API, WebSocket, and third-party connections
              "connect-src 'self' https://api.groq.com wss: ws: https: https://cloudflareinsights.com https://challenges.cloudflare.com",
              // Audio/Video: self and blob
              "media-src 'self' blob:",
              // No plugins (Flash etc.)
              "object-src 'none'",
              // Prevent base tag hijacking
              "base-uri 'self'",
              // Restrict form submissions
              "form-action 'self'",
              // Prevent embedding in foreign iframes
              "frame-ancestors 'self' https://challenges.cloudflare.com",
              // Block upgrade insecure requests in production
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
