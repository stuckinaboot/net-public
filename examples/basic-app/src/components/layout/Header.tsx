"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

/**
 * Header component with app title and wallet connection
 * Uses RainbowKit's ConnectButton for a complete wallet connection UI
 */
export function Header() {
  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Net Protocol Example App</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Learn how to build with Net Protocol
          </p>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}

