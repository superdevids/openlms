import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Barrel imports besar di-kompilasi per-nama (bukan seluruh modul) —
  // mempercepat dev/build untuk @opensis/ui dan framer-motion (Next 16:
  // kunci ini berada di bawah `experimental`).
  experimental: {
    optimizePackageImports: ["@opensis/ui", "framer-motion"]
  },
  // Output produksi mandiri (standalone) untuk Docker — server Next.js +
  // node_modules minimum yang diperlukan di apps/web/.next/standalone.
  output: "standalone",
  // Monorepo: tracing dari root workspace agar paket @opensis/* ikut terbawa
  // ke output standalone (bukan hanya apps/web).
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Security headers (F hardening): anti-clickjacking, nosniff, referrer,
  // permissions policy, dan CSP dasar. CSP mengizinkan inline style (branding
  // CSS vars) + data: image + ws/wss (realtime) seperti kebijakan API.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
