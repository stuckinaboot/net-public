/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile packages that use ESM or have CSS imports
  // NOTE: @net-protocol/core removed - testing if transpilation is needed
  transpilePackages: ["@rainbow-me/rainbowkit"],
  experimental: {
    esmExternals: "loose",
  },
  webpack: (config, { isServer }) => {
    // Fallbacks for Node.js modules that don't exist in browser
    config.resolve.fallback = { fs: false, net: false, tls: false };

    // NOTE: Testing Option 1 - Removed webpack aliases after removing wagmi from devDependencies
    // If wagmi is only in peerDependencies, webpack should resolve it from app's node_modules

    // Exclude problematic packages from server bundle
    if (isServer) {
      config.externals.push("pino-pretty", "lokijs", "encoding");
    }

    return config;
  },
};

module.exports = nextConfig;
