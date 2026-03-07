import { stringToHex } from "viem";
import { NetClient, NULL_ADDRESS } from "@net-protocol/core";
import { normalizeChatTopic } from "../utils/chatUtils";
import type {
  ChatClientOptions,
  GetChatMessagesOptions,
  SendChatMessageOptions,
  NetMessage,
  WriteTransactionConfig,
} from "../types";

/**
 * Client class for interacting with Net Protocol group chats.
 * Provides non-React methods for reading and writing to chats.
 */
export class ChatClient {
  private netClient: NetClient;
  private chainId: number;

  /**
   * Creates a new ChatClient instance.
   *
   * @param params - Client configuration
   * @param params.chainId - Chain ID to interact with
   * @param params.overrides - Optional RPC URL overrides
   */
  constructor(params: ChatClientOptions) {
    this.chainId = params.chainId;
    this.netClient = new NetClient({
      chainId: params.chainId,
      overrides: params.overrides,
    });
  }

  /**
   * Gets messages from a group chat.
   *
   * @param params - Chat message options
   * @param params.topic - Topic name (will be auto-prefixed with "chat-" if not already present)
   * @param params.maxMessages - Maximum number of messages to fetch (default: 100)
   * @returns Array of chat messages (NetMessage[])
   *
   * @example
   * ```ts
   * const client = new ChatClient({ chainId: 8453 });
   * const messages = await client.getChatMessages({ topic: "general", maxMessages: 100 });
   * ```
   */
  async getChatMessages(params: GetChatMessagesOptions): Promise<NetMessage[]> {
    const normalizedTopic = normalizeChatTopic(params.topic);

    const count = await this.netClient.getMessageCount({
      filter: {
        appAddress: NULL_ADDRESS as `0x${string}`,
        topic: normalizedTopic,
      },
    });

    const maxMessages = params.maxMessages ?? 100;
    const startIndex =
      maxMessages === 0 ? count : count > maxMessages ? count - maxMessages : 0;

    const messages = await this.netClient.getMessages({
      filter: {
        appAddress: NULL_ADDRESS as `0x${string}`,
        topic: normalizedTopic,
      },
      startIndex,
      endIndex: count,
    });

    return messages;
  }

  /**
   * Gets the total count of messages in a group chat.
   *
   * @param topic - Topic name (will be auto-prefixed with "chat-" if not already present)
   * @returns Total number of messages in the chat
   *
   * @example
   * ```ts
   * const client = new ChatClient({ chainId: 8453 });
   * const count = await client.getChatMessageCount("general");
   * ```
   */
  async getChatMessageCount(topic: string): Promise<number> {
    const normalizedTopic = normalizeChatTopic(topic);

    const count = await this.netClient.getMessageCount({
      filter: {
        appAddress: NULL_ADDRESS as `0x${string}`,
        topic: normalizedTopic,
      },
    });

    return count;
  }

  /**
   * Prepares a transaction configuration for sending a message to a group chat.
   * Does not submit the transaction - you must submit it using your wallet library.
   *
   * @param params - Send message options
   * @param params.topic - Topic name (will be auto-prefixed with "chat-" if not already present)
   * @param params.text - Message text content
   * @param params.data - Optional arbitrary data (string will be converted to hex bytes)
   * @returns Transaction configuration ready to be submitted
   *
   * @example
   * ```ts
   * const client = new ChatClient({ chainId: 8453 });
   * const config = client.prepareSendChatMessage({
   *   topic: "general",
   *   text: "Hello everyone!",
   * });
   * // Then submit using your wallet library
   * ```
   */
  prepareSendChatMessage(params: SendChatMessageOptions): WriteTransactionConfig {
    const normalizedTopic = normalizeChatTopic(params.topic);
    const data = params.data ? stringToHex(params.data) : undefined;

    return this.netClient.prepareSendMessage({
      text: params.text,
      topic: normalizedTopic,
      data,
    });
  }
}
