/**
 * EIP-712 conversation authorization signing.
 *
 * The NetAIChat contract requires a ConversationAuth signature over the topic
 * to prove the user authorized the conversation. This is a different EIP-712
 * domain than the relay session signature.
 */

import type { Address, Hex, LocalAccount } from "viem";
import {
  AI_CHAT_CONTRACT,
  CONVERSATION_AUTH_DOMAIN,
  CONVERSATION_AUTH_TYPES,
} from "../constants";

/**
 * Get the AI Chat contract address for a chain.
 *
 * @param chainId - Chain ID
 * @returns Contract address
 * @throws If the contract is not deployed on the given chain
 */
export function getAIChatContractAddress(chainId: number): Address {
  const address = AI_CHAT_CONTRACT[chainId];
  if (!address) {
    throw new Error(`AI Chat contract not deployed on chain ${chainId}`);
  }
  return address;
}

/**
 * Sign a conversation topic using EIP-712 ConversationAuth.
 *
 * @param account - Local account (private key) to sign with
 * @param topic - Conversation topic string
 * @param chainId - Chain ID
 * @returns The hex signature
 */
export async function signConversationTopic(
  account: LocalAccount,
  topic: string,
  chainId: number,
): Promise<Hex> {
  const contractAddress = getAIChatContractAddress(chainId);

  const signature = await account.signTypedData({
    domain: {
      ...CONVERSATION_AUTH_DOMAIN,
      chainId,
      verifyingContract: contractAddress,
    },
    types: CONVERSATION_AUTH_TYPES,
    primaryType: "ConversationAuth",
    message: { topic },
  });

  return signature;
}
