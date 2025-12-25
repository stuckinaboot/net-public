/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile packages that use ESM or have CSS imports
  transpilePackages: ["@rainbow-me/rainbowkit"],
  experimental: {
    esmExternals: "loose",
  },
  webpack: (config, { isServer }) => {
    // Fallbacks for Node.js modules that don't exist in browser
    config.resolve.fallback = { fs: false, net: false, tls: false };

    // Exclude problematic packages from server bundle
    if (isServer) {
      config.externals.push("pino-pretty", "lokijs", "encoding");
    }

    return config;
  },
};

module.exports = nextConfig;
