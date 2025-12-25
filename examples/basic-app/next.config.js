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

    // Ensure wagmi and React resolve to single instances to prevent React context issues
    // This is still needed even without transpilation - webpack module resolution requires it
    // When @net-protocol/core imports wagmi/react, webpack can resolve to different instances
    // even without transpilation, so aliases ensure single instances
    const path = require("path");

    // Get the app's node_modules path
    const appNodeModules = path.join(__dirname, "node_modules");

    // Resolve wagmi and React from the app's node_modules
    const wagmiPath = require.resolve("wagmi", { paths: [appNodeModules] });
    const reactPath = require.resolve("react", { paths: [appNodeModules] });
    const reactDomPath = require.resolve("react-dom", {
      paths: [appNodeModules],
    });

    config.resolve.alias = {
      ...config.resolve.alias,
      // Alias wagmi, React, and react-dom to ensure single instances
      wagmi$: wagmiPath,
      react$: reactPath,
      "react-dom$": reactDomPath,
    };

    // Exclude problematic packages from server bundle
    if (isServer) {
      config.externals.push("pino-pretty", "lokijs", "encoding");
    }

    return config;
  },
};

module.exports = nextConfig;
