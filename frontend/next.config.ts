import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for production Docker deployment.
  // This produces a minimal server.js + required files without full node_modules.
  output: "standalone",
};

export default nextConfig;
