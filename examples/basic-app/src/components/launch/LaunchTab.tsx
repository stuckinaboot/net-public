"use client";

import { useWalletRequirement } from "@/hooks/useWalletRequirement";
import { TokenLaunchForm } from "./TokenLaunchForm";

/**
 * LaunchTab component - Main container for token launch functionality
 *
 * Allows users to deploy Netr tokens with:
 * - Token name
 * - Token symbol
 * - Initial buy amount
 *
 * Requires wallet connection for all operations
 */
export function LaunchTab() {
  const { isConnected, requirementMessage, address } = useWalletRequirement();

  if (!isConnected) {
    return (
      <div className="container mx-auto h-full flex items-center justify-center">
        <div className="text-center p-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-yellow-800 dark:text-yellow-200 mb-2">
            {requirementMessage}
          </p>
          <p className="text-sm text-yellow-600 dark:text-yellow-300">
            Token launch requires a connected wallet on Base
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-semibold mb-1">Launch Token</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Deploy a new token on Base with built-in liquidity
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <TokenLaunchForm deployerAddress={address!} />
      </div>
    </div>
  );
}
