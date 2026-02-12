import { useMemo } from "react";
import { useNetMessages, useNetMessageCount } from "@net-protocol/core/react";
import { AGENT_REGISTRY_CONTRACT, AGENT_TOPIC } from "../constants";
import type { UseRegisteredAgentsOptions, RegisteredAgent } from "../types";

/**
 * React hook for fetching all registered agents from the AgentRegistry contract.
 *
 * @param options - Options for fetching agents
 * @param options.chainId - Chain ID to query
 * @param options.maxAgents - Maximum number of agents to fetch (default: 100)
 * @param options.enabled - Whether the query is enabled (default: true)
 * @returns Object with agents, totalCount, isLoading, and refetch
 */
export function useRegisteredAgents({
  chainId,
  maxAgents = 100,
  enabled = true,
}: UseRegisteredAgentsOptions) {
  // Build filter for AgentRegistry app messages
  const filter = useMemo(
    () => ({
      appAddress: AGENT_REGISTRY_CONTRACT.address,
      topic: AGENT_TOPIC,
    }),
    []
  );

  // Get total count of registered agents
  const { count: totalCount, isLoading: isLoadingCount } = useNetMessageCount({
    chainId,
    filter,
    enabled,
  });

  // Calculate pagination (get most recent agents)
  const startIndex =
    maxAgents === 0
      ? totalCount
      : totalCount > maxAgents
      ? totalCount - maxAgents
      : 0;

  // Get messages from the registry
  const {
    messages,
    isLoading: isLoadingMessages,
    refetch,
  } = useNetMessages({
    chainId,
    filter,
    startIndex,
    endIndex: totalCount,
    enabled: enabled && totalCount > 0,
  });

  // Parse messages into RegisteredAgent objects
  const agents: RegisteredAgent[] = useMemo(() => {
    if (!messages) return [];

    return messages.map((msg) => ({
      address: msg.sender,
      timestamp: Number(msg.timestamp),
    }));
  }, [messages]);

  return {
    agents,
    totalCount,
    isLoading: isLoadingCount || isLoadingMessages,
    refetch,
  };
}
