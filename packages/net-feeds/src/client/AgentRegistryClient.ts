import { NetClient } from "@net-protocol/core";
import {
  AGENT_REGISTRY_CONTRACT,
  AGENT_TOPIC,
} from "../constants";
import type {
  WriteTransactionConfig,
  RegisteredAgent,
} from "../types";

/**
 * Options for creating an AgentRegistryClient instance
 */
export type AgentRegistryClientOptions = {
  chainId: number;
  overrides?: { rpcUrls: string[] };
};

/**
 * Options for getting registered agents
 */
export type GetRegisteredAgentsOptions = {
  maxAgents?: number; // Defaults to 100 if not provided
};

/**
 * Client class for interacting with the AgentRegistry contract.
 * Provides non-React methods for registering and discovering agents.
 */
export class AgentRegistryClient {
  private netClient: NetClient;

  /**
   * Creates a new AgentRegistryClient instance.
   *
   * @param params - Client configuration
   * @param params.chainId - Chain ID to interact with
   * @param params.overrides - Optional RPC URL overrides
   */
  constructor(params: AgentRegistryClientOptions) {
    this.netClient = new NetClient({
      chainId: params.chainId,
      overrides: params.overrides,
    });
  }

  /**
   * Checks if an address is registered as an agent.
   *
   * @param address - The address to check
   * @returns True if registered, false otherwise
   */
  async isAgentRegistered(address: `0x${string}`): Promise<boolean> {
    const count = await this.netClient.getMessageCount({
      filter: {
        appAddress: AGENT_REGISTRY_CONTRACT.address,
        maker: address,
        topic: AGENT_TOPIC,
      },
    });

    return count > 0;
  }

  /**
   * Gets all registered agents.
   *
   * @param options - Options for fetching agents
   * @param options.maxAgents - Maximum number of agents to fetch (default: 100)
   * @returns Array of registered agents
   */
  async getRegisteredAgents(
    options: GetRegisteredAgentsOptions = {}
  ): Promise<RegisteredAgent[]> {
    const maxAgents = options.maxAgents ?? 100;

    // Get total count of registered agents
    const count = await this.netClient.getMessageCount({
      filter: {
        appAddress: AGENT_REGISTRY_CONTRACT.address,
        topic: AGENT_TOPIC,
      },
    });

    if (count === 0) {
      return [];
    }

    // Calculate pagination (get most recent agents)
    const startIndex = count > maxAgents ? count - maxAgents : 0;

    // Get messages from the registry
    const messages = await this.netClient.getMessages({
      filter: {
        appAddress: AGENT_REGISTRY_CONTRACT.address,
        topic: AGENT_TOPIC,
      },
      startIndex,
      endIndex: count,
    });

    // Parse messages into RegisteredAgent objects
    return messages.map((msg) => ({
      address: msg.sender,
      timestamp: Number(msg.timestamp),
    }));
  }

  /**
   * Gets the count of registered agents.
   *
   * @returns Total number of registered agents
   */
  async getRegisteredAgentCount(): Promise<number> {
    return this.netClient.getMessageCount({
      filter: {
        appAddress: AGENT_REGISTRY_CONTRACT.address,
        topic: AGENT_TOPIC,
      },
    });
  }

  /**
   * Prepares a transaction configuration for registering as an agent.
   * Does not submit the transaction - you must submit it using your wallet library.
   *
   * @returns Transaction configuration ready to be submitted
   */
  prepareRegisterAgent(): WriteTransactionConfig {
    return {
      abi: AGENT_REGISTRY_CONTRACT.abi,
      to: AGENT_REGISTRY_CONTRACT.address,
      functionName: "registerAgent",
      args: [],
    };
  }

  /**
   * Gets the contract address for the AgentRegistry.
   *
   * @returns The contract address
   */
  getContractAddress(): `0x${string}` {
    return AGENT_REGISTRY_CONTRACT.address;
  }
}
