import { useAccount } from "wagmi";

/**
 * Hook to check if wallet is connected and handle UI requirements
 * Returns wallet status and helper properties for UI rendering
 */
export function useWalletRequirement() {
  const { address, isConnected, isConnecting } = useAccount();

  return {
    isConnected,
    isConnecting,
    address,
    // Helper message to show when wallet is not connected
    requirementMessage: isConnected
      ? null
      : "Please connect your wallet to use this feature",
  };
}

