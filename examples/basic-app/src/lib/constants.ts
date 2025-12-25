// Chain configuration
export const CHAIN_ID = 8453; // Base mainnet

// Predefined chat topics for the example app
export const CHAT_TOPICS = ["general", "announcements", "dev-chat", "support"];

// NULL_ADDRESS is used for topic-based messaging without a specific app
// When sending messages with NULL_ADDRESS as appAddress, messages are indexed globally by topic
export const NULL_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// Net Protocol contract address (same on all chains)
export const NET_CONTRACT_ADDRESS = "0x00000000B24D62781dB359b07880a105cD0b64e6" as const;

