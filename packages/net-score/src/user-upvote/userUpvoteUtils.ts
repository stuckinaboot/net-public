import { decodeAbiParameters } from "viem";
import type {
  ParsedUserUpvoteMessage,
  TokenAddressExtraction,
  UserUpvoteNetMessage,
} from "./types";

/**
 * Parse a Net protocol message from the user upvote contract.
 *
 * Two formats based on topic:
 * - Topic "ub-{address}" (received upvotes): 7 fields including userTokenBalance
 * - Topic "g" (given upvotes): 6 fields without userTokenBalance
 */
export function parseUserUpvoteMessage(
  message: UserUpvoteNetMessage,
  topic: string
): ParsedUserUpvoteMessage | null {
  try {
    if (topic.startsWith("ub-")) {
      // Received upvotes: 7 fields
      const [
        upvotedUserString,
        actualToken,
        numUpvotes,
        tokenWethPrice,
        wethUsdcPrice,
        alphaWethPrice,
        userTokenBalance,
      ] = decodeAbiParameters(
        [
          { type: "string" },
          { type: "address" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
        ],
        message.data
      );
      return {
        upvotedUserString: upvotedUserString as string,
        actualToken: actualToken as string,
        numUpvotes: Number(numUpvotes),
        tokenWethPrice: tokenWethPrice as bigint,
        wethUsdcPrice: wethUsdcPrice as bigint,
        alphaWethPrice: alphaWethPrice as bigint,
        userTokenBalance: userTokenBalance as bigint,
      };
    } else {
      // Given upvotes (topic "g"): 6 fields
      const [
        upvotedUserString,
        actualToken,
        numUpvotes,
        tokenWethPrice,
        wethUsdcPrice,
        alphaWethPrice,
      ] = decodeAbiParameters(
        [
          { type: "string" },
          { type: "address" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
        ],
        message.data
      );
      return {
        upvotedUserString: upvotedUserString as string,
        actualToken: actualToken as string,
        numUpvotes: Number(numUpvotes),
        tokenWethPrice: tokenWethPrice as bigint,
        wethUsdcPrice: wethUsdcPrice as bigint,
        alphaWethPrice: alphaWethPrice as bigint,
      };
    }
  } catch {
    return null;
  }
}

/**
 * Extract unique token addresses from an array of Net messages.
 */
export function extractTokenAddressesFromMessages(
  messages: UserUpvoteNetMessage[],
  topic: string
): TokenAddressExtraction {
  const tokenSet = new Set<string>();
  const validMessages: ParsedUserUpvoteMessage[] = [];

  for (const message of messages) {
    const parsed = parseUserUpvoteMessage(message, topic);
    if (parsed) {
      tokenSet.add(parsed.actualToken.toLowerCase());
      validMessages.push(parsed);
    }
  }

  return {
    tokenAddresses: Array.from(tokenSet),
    validMessages,
  };
}

/**
 * Validate that a Net message can be parsed as a user upvote message.
 */
export function validateUserUpvoteMessage(
  message: UserUpvoteNetMessage,
  topic: string
): boolean {
  return parseUserUpvoteMessage(message, topic) !== null;
}

/**
 * Calculate the USDC price from a parsed user upvote message.
 *
 * The contract emits (halfWei * 1e18) / amountRaw for tokenWethPrice,
 * so we divide by 10^(36 - tokenDecimals) to get the actual price.
 */
export function calculatePriceInUsdc(
  parsedMessage: ParsedUserUpvoteMessage,
  tokenDecimals: number = 18
): number | undefined {
  const { tokenWethPrice, wethUsdcPrice } = parsedMessage;
  if (tokenWethPrice > 0n && wethUsdcPrice > 0n) {
    const scale = 10 ** (36 - tokenDecimals);
    const tokenWethPriceNum = Number(tokenWethPrice) / scale;
    const wethUsdcPriceNum = Number(wethUsdcPrice) / 1e6;
    return tokenWethPriceNum * wethUsdcPriceNum;
  }
  return undefined;
}

/**
 * Calculate the human-readable token balance from a raw bigint value.
 */
export function calculateUserTokenBalance(
  rawBalance: bigint,
  tokenDecimals: number = 18
): number {
  return Number(rawBalance) / Math.pow(10, tokenDecimals);
}
