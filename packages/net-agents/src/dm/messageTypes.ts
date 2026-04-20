/**
 * Message type detection for on-chain chat messages.
 *
 * The data field of each message encodes a version byte + type marker.
 * Used to determine whether a message is from the user or AI, and
 * whether it's encrypted.
 */

import { MESSAGE_TYPES, MESSAGE_VERSION } from "../constants";

export type MessageType =
  | "human"
  | "ai"
  | "encrypted_human"
  | "encrypted_ai"
  | "unknown";

/**
 * Check if a message is encrypted by examining its data field.
 */
export function isMessageEncrypted(data: `0x${string}` | string): boolean {
  if (!data || data === "0x" || data.length < 6) return false;
  try {
    const markerHex = data.slice(4, 6);
    const marker = parseInt(markerHex, 16);
    return (
      marker === MESSAGE_TYPES.ENCRYPTED_HUMAN ||
      marker === MESSAGE_TYPES.ENCRYPTED_AI
    );
  } catch {
    return false;
  }
}

/**
 * Get the message type from its data field.
 */
export function getMessageType(data: `0x${string}` | string): MessageType {
  if (!data || data === "0x" || data.length < 6) return "unknown";
  try {
    const markerHex = data.slice(4, 6);
    const marker = parseInt(markerHex, 16);
    switch (marker) {
      case MESSAGE_TYPES.HUMAN:
        return "human";
      case MESSAGE_TYPES.AI:
        return "ai";
      case MESSAGE_TYPES.ENCRYPTED_HUMAN:
        return "encrypted_human";
      case MESSAGE_TYPES.ENCRYPTED_AI:
        return "encrypted_ai";
      default:
        return "unknown";
    }
  } catch {
    return "unknown";
  }
}
