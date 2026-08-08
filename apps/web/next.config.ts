import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Barrel imports besar di-kompilasi per-nama (bukan seluruh modul) —
  // mempercepat dev/build untuk @openlms/ui dan framer-motion (Next 16:
  // kunci ini berada di bawah `experimental`).
  experimental: {
    optimizePackageImports: ["@openlms/ui", "framer-motion"]
  }
};

export default nextConfig;
