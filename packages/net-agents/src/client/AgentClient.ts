/**
 * High-level client for Net Onchain Agents API
 *
 * Provides methods for creating, managing, and interacting with onchain agents,
 * including DM conversations. Follows the same pattern as RelayClient.
 *
 * Agent CRUD and run operations go through the Net backend API.
 * DM reads (conversation listing, history) are direct chain reads.
 * DM sends go through the backend API.
 */

import type { Address, Hex, LocalAccount, PublicClient } from "viem";
import { getPublicClient } from "@net-protocol/core";
import { RELAY_ACCESS_KEY } from "../constants";
import { generateAgentChatTopic } from "../dm/topicUtils";
import { signConversationTopic, getAIChatContractAddress } from "../dm/signature";
import { listConversations, getConversationHistory } from "../dm/history";
import type {
  CreateAgentParams,
  CreateAgentResponse,
  UpdateAgentParams,
  UpdateAgentResponse,
  ListAgentsParams,
  ListAgentsResponse,
  RunAgentParams,
  RunAgentResponse,
  AgentSummary,
  SendAgentMessageParams,
  SendAgentMessageResponse,
  ConversationInfo,
  ChatMessage,
} from "../types";

export class AgentClient {
  private apiUrl: string;
  private chainId: number;

  constructor(options: { apiUrl: string; chainId: number }) {
    this.apiUrl = options.apiUrl;
    this.chainId = options.chainId;
  }

  // ============================================
  // AGENT CRUD
  // ============================================

  /**
   * Create a new onchain agent.
   *
   * Requires sufficient Net credits ($0.03 USD minimum).
   */
  async createAgent(params: CreateAgentParams): Promise<CreateAgentResponse> {
    const response = await fetch(`${this.apiUrl}/api/agents/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken: params.sessionToken,
        chainId: this.chainId,
        config: params.config,
        ...(params.profile ? { profile: params.profile } : {}),
      }),
    });

    return this.parseResponse<CreateAgentResponse>(response);
  }

  /**
   * Update an existing agent's config and/or profile.
   */
  async updateAgent(params: UpdateAgentParams): Promise<UpdateAgentResponse> {
    const response = await fetch(`${this.apiUrl}/api/agents/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken: params.sessionToken,
        chainId: this.chainId,
        agentId: params.agentId,
        ...(params.config ? { config: params.config } : {}),
        ...(params.profile ? { profile: params.profile } : {}),
      }),
    });

    return this.parseResponse<UpdateAgentResponse>(response);
  }

  /**
   * List all agents owned by the authenticated user.
   */
  async listAgents(params: ListAgentsParams): Promise<ListAgentsResponse> {
    const response = await fetch(`${this.apiUrl}/api/agents/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken: params.sessionToken,
        chainId: this.chainId,
      }),
    });

    return this.parseResponse<ListAgentsResponse>(response);
  }

  /**
   * Get a single agent by ID.
   *
   * Fetches the full agent list and finds the matching agent.
   * (No dedicated backend endpoint — same approach as the frontend.)
   */
  async getAgent(
    sessionToken: string,
    agentId: string,
  ): Promise<AgentSummary | null> {
    const result = await this.listAgents({ sessionToken });
    if (!result.success || !result.agents) return null;
    return result.agents.find((a) => a.config.id === agentId) ?? null;
  }

  /**
   * Hide an agent (soft-delete).
   */
  async hideAgent(
    sessionToken: string,
    agentId: string,
  ): Promise<UpdateAgentResponse> {
    return this.updateAgent({
      sessionToken,
      agentId,
      config: { hidden: true },
    });
  }

  /**
   * Unhide a previously hidden agent.
   */
  async unhideAgent(
    sessionToken: string,
    agentId: string,
  ): Promise<UpdateAgentResponse> {
    return this.updateAgent({
      sessionToken,
      agentId,
      config: { hidden: false },
    });
  }

  /**
   * Execute one agent cycle.
   *
   * The agent fetches context (feeds/chats), calls an LLM, and may
   * post/comment/chat. All execution happens server-side.
   */
  async runAgent(params: RunAgentParams): Promise<RunAgentResponse> {
    const response = await fetch(`${this.apiUrl}/api/agents/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken: params.sessionToken,
        chainId: this.chainId,
        agentId: params.agentId,
        ...(params.mode ? { mode: params.mode } : {}),
      }),
    });

    return this.parseResponse<RunAgentResponse>(response);
  }

  // ============================================
  // DM / CHAT
  // ============================================

  /**
   * Send a DM to an onchain agent and get its AI response.
   *
   * If no topic is provided, generates a new one (starts a new conversation).
   * If no userSignature is provided, signs the topic automatically using the account.
   *
   * @param params - Message parameters
   * @param account - LocalAccount for signing (required if userSignature is not provided)
   * @returns AI response with transaction hash, or throws on error
   */
  async sendMessage(
    params: SendAgentMessageParams,
    account?: LocalAccount,
  ): Promise<SendAgentMessageResponse & { topic: string }> {
    // Generate topic if not provided
    const topic = params.topic ?? generateAgentChatTopic(params.agentAddress);

    // Sign topic if signature not provided
    let userSignature = params.userSignature;
    if (!userSignature) {
      if (!account) {
        throw new Error(
          "Either userSignature or account must be provided for DM signing",
        );
      }
      userSignature = await signConversationTopic(account, topic, this.chainId);
    }

    const response = await fetch(`${this.apiUrl}/api/chat/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chainId: this.chainId,
        sessionToken: params.sessionToken,
        topic,
        message: params.message,
        userSignature,
        ...(params.encryption ? { encryption: params.encryption } : {}),
      }),
    });

    // Normalize success and failure into one shape so callers can switch on
    // result.success without having to also wrap try/catch.
    const data = (await response.json().catch(
      () => ({}) as Record<string, unknown>,
    )) as SendAgentMessageResponse & { error?: string };

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Chat message failed: ${response.status}`,
        topic,
      };
    }

    return { ...data, success: true, topic };
  }

  /**
   * List all DM conversations for a user.
   *
   * Reads directly from the chain (no backend call), same as the frontend.
   *
   * @param userAddress - User's wallet address
   * @param opts.limit - Max conversations to fetch
   * @param opts.publicClient - Optional custom PublicClient
   */
  async listConversations(
    userAddress: Address,
    opts?: { limit?: number; publicClient?: PublicClient },
  ): Promise<ConversationInfo[]> {
    const client = opts?.publicClient ?? getPublicClient({ chainId: this.chainId });
    const chatContract = getAIChatContractAddress(this.chainId);
    return listConversations(client, chatContract, userAddress, opts?.limit);
  }

  /**
   * Load full conversation history for a DM topic.
   *
   * Reads directly from the chain (no backend call), same as the frontend.
   *
   * @param userAddress - User's wallet address
   * @param topic - Conversation topic
   * @param opts.limit - Max recent messages to fetch
   * @param opts.publicClient - Optional custom PublicClient
   */
  async getConversationHistory(
    userAddress: Address,
    topic: string,
    opts?: { limit?: number; publicClient?: PublicClient },
  ): Promise<ChatMessage[]> {
    const client = opts?.publicClient ?? getPublicClient({ chainId: this.chainId });
    const chatContract = getAIChatContractAddress(this.chainId);
    return getConversationHistory(client, chatContract, userAddress, topic, opts?.limit);
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Get the relay access key (public constant used for session creation).
   * Convenience getter so SDK users don't need to import from constants.
   */
  static get relayAccessKey(): string {
    return RELAY_ACCESS_KEY;
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const data = await response.json().catch(() => ({} as Record<string, string>));
    if (!response.ok) {
      const errorMsg = (data as Record<string, string>).error || `Request failed: ${response.status}`;
      return { success: false, error: errorMsg } as T;
    }
    return data as T;
  }
}
