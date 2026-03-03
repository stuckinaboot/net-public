import { type Address, decodeAbiParameters, isAddressEqual } from "viem";
import type {
  ParsedUserUpvoteMessage,
  TokenAddressExtraction,
  UserUpvote,
  UserUpvoteReceived,
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

/**
 * Client-side validation for upvote parameters.
 * Mirrors contract-side errors for better UX before sending a transaction.
 */
export function validateUpvoteParams(params: {
  sender: Address;
  userToUpvote: Address;
  numUpvotes: number;
}): { valid: boolean; error?: string } {
  if (isAddressEqual(params.sender, params.userToUpvote)) {
    return { valid: false, error: "Cannot upvote yourself" };
  }
  if (!Number.isInteger(params.numUpvotes)) {
    return { valid: false, error: "Number of upvotes must be a whole number" };
  }
  if (params.numUpvotes <= 0) {
    return { valid: false, error: "Number of upvotes must be greater than zero" };
  }
  return { valid: true };
}

/**
 * Calculate the total ETH cost for a given number of upvotes.
 */
export function calculateUpvoteCost(
  numUpvotes: number,
  upvotePrice: bigint
): bigint {
  return BigInt(numUpvotes) * upvotePrice;
}

function computeEnrichedFields(
  parsed: ParsedUserUpvoteMessage,
  tokenInfo?: { name: string; symbol: string; decimals: number }
) {
  const decimals = tokenInfo?.decimals ?? 18;
  const priceInUsdc = calculatePriceInUsdc(parsed, decimals);
  const userTokenBalance = parsed.userTokenBalance
    ? calculateUserTokenBalance(parsed.userTokenBalance, decimals)
    : 0;

  const userTokenBalanceUsdValue =
    priceInUsdc !== undefined && userTokenBalance > 0
      ? priceInUsdc * userTokenBalance
      : undefined;

  return { priceInUsdc, userTokenBalance, userTokenBalanceUsdValue };
}

/**
 * Build an enriched UserUpvote from a parsed message and optional token info.
 */
export function buildUserUpvote(
  parsed: ParsedUserUpvoteMessage,
  timestamp: number,
  tokenInfo?: { name: string; symbol: string; decimals: number }
): UserUpvote {
  return {
    tokenAddress: parsed.actualToken,
    numUpvotes: parsed.numUpvotes,
    timestamp,
    ...computeEnrichedFields(parsed, tokenInfo),
    upvotedUserAddress: parsed.upvotedUserString,
    tokenInfo,
  };
}

/**
 * Build an enriched UserUpvoteReceived from a parsed message, upvoter address, and optional token info.
 */
export function buildUserUpvoteReceived(
  parsed: ParsedUserUpvoteMessage,
  upvoterAddress: string,
  timestamp: number,
  tokenInfo?: { name: string; symbol: string; decimals: number }
): UserUpvoteReceived {
  return {
    upvoterAddress,
    tokenAddress: parsed.actualToken,
    numUpvotes: parsed.numUpvotes,
    timestamp,
    ...computeEnrichedFields(parsed, tokenInfo),
    tokenInfo,
  };
}
