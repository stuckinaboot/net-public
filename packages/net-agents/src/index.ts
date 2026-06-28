// Client
export { AgentClient } from "./client/AgentClient";

// DM Utilities
export { generateAgentChatTopic, parseAgentAddressFromTopic, isAgentChatTopic } from "./dm/topicUtils";
export { signConversationTopic, getAIChatContractAddress } from "./dm/signature";
export { listConversations, getConversationHistory } from "./dm/history";
export { isMessageEncrypted, getMessageType } from "./dm/messageTypes";
export type { MessageType } from "./dm/messageTypes";

// External signing helpers (for Bankr or other external signers)
export {
  buildSessionTypedData,
  exchangeSessionSignature,
  buildConversationAuthTypedData,
} from "./externalSigning";
export type {
  SessionTypedData,
  ConversationAuthTypedData,
  BuildSessionResult,
  BuildConversationAuthResult,
} from "./externalSigning";

// Types
export type {
  AgentConfig,
  AgentFilters,
  CreateAgentInput,
  UpdateAgentInput,
  AgentProfileInput,
  AgentSummary,
  AgentRunMode,
  AgentToolAction,
  AutoFundDetails,
  CreateAgentParams,
  UpdateAgentParams,
  ListAgentsParams,
  RunAgentParams,
  CreateAgentResponse,
  UpdateAgentResponse,
  ListAgentsResponse,
  RunAgentResponse,
  SendAgentMessageParams,
  SendAgentMessageResponse,
  ConversationInfo,
  ChatMessage,
} from "./types";

// Constants
export {
  NET_API_URL,
  NET_TESTNET_API_URL,
  RELAY_ACCESS_KEY,
  AI_CHAT_CONTRACT,
  CONVERSATION_AUTH_DOMAIN,
  CONVERSATION_AUTH_TYPES,
  CONVERSATION_INDEX_TOPIC,
  AGENT_LIMITS,
  AGENT_OP_COST_USD,
  MESSAGE_TYPES,
  MESSAGE_VERSION,
  NET_CONTRACT_ADDRESS,
  NET_MESSAGE_COUNT_BULK_HELPER_ADDRESS,
  DEFAULT_MAX_CONVERSATIONS,
  DEFAULT_MAX_HISTORY_MESSAGES,
} from "./constants";
