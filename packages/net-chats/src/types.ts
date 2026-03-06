import type {
  NetMessage,
  WriteTransactionConfig,
} from "@net-protocol/core";

// Re-export NetMessage for convenience
export type { NetMessage, WriteTransactionConfig };

/**
 * Options for creating a ChatClient instance
 */
export type ChatClientOptions = {
  chainId: number;
  overrides?: { rpcUrls: string[] };
};

/**
 * Options for getting chat messages via ChatClient
 */
export type GetChatMessagesOptions = {
  topic: string;
  maxMessages?: number;
};

/**
 * Options for preparing a chat message transaction
 */
export type SendChatMessageOptions = {
  topic: string;
  text: string;
  data?: string;
};

/**
 * Options for the useChatMessages hook
 */
export type UseChatMessagesOptions = {
  chainId: number;
  topic: string;
  maxMessages?: number; // Defaults to 100 if not provided
  enabled?: boolean; // Defaults to true if not provided
};
