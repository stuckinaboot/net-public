import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { AGENT_REGISTRY_CONTRACT } from "../constants";
import type {
  UseAgentRegistryOptions,
  UseIsAgentRegisteredOptions,
  WriteTransactionConfig,
} from "../types";

/**
 * React hook for interacting with the AgentRegistry contract.
 * Provides methods for preparing agent registration transactions.
 *
 * @param options - Registry options
 * @param options.chainId - Chain ID to interact with
 * @returns Object with prepareRegisterAgent and contractAddress
 */
export function useAgentRegistry({ chainId }: UseAgentRegistryOptions) {
  /**
   * Prepares a transaction configuration for registering as an agent.
   */
  const prepareRegisterAgent = useMemo(
    () => (): WriteTransactionConfig => {
      return {
        abi: AGENT_REGISTRY_CONTRACT.abi,
        to: AGENT_REGISTRY_CONTRACT.address,
        functionName: "registerAgent",
        args: [],
      };
    },
    []
  );

  return {
    prepareRegisterAgent,
    contractAddress: AGENT_REGISTRY_CONTRACT.address,
  };
}

/**
 * React hook for checking if an address is registered as an agent.
 *
 * @param options - Options for checking agent registration
 * @param options.chainId - Chain ID to query
 * @param options.agentAddress - The address to check
 * @param options.enabled - Whether the query is enabled (default: true)
 * @returns Object with isRegistered, isLoading, and error
 */
export function useIsAgentRegistered({
  chainId,
  agentAddress,
  enabled = true,
}: UseIsAgentRegisteredOptions) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENT_REGISTRY_CONTRACT.address,
    abi: AGENT_REGISTRY_CONTRACT.abi,
    functionName: "isAgentRegistered",
    args: [agentAddress],
    chainId,
    query: {
      enabled,
    },
  });

  return {
    isRegistered: data as boolean | undefined,
    isLoading,
    error: error as Error | undefined,
    refetch,
  };
}
