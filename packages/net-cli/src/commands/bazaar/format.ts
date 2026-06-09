import { parseUnits } from "viem";
import { getErc20PaymentToken } from "@net-protocol/bazaar";
import { exitWithError } from "../../shared/output";

/**
 * Format a price number for display (removes trailing zeros)
 */
export function formatEthPrice(price: number): string {
  return price.toFixed(6).replace(/\.?0+$/, "");
}

/**
 * Parse `--price` for an ERC-20 bazaar command into payment-token base units,
 * and return the payment token's display symbol alongside it.
 *
 * The chain's ERC-20 payment token comes from
 * `getErc20PaymentToken(chainId)` — USDC (6 decimals) on Base, wrapped
 * native (18 decimals) elsewhere. Using a hardcoded scale (e.g.
 * `parseEther`) would silently 10^12-inflate USDC prices on Base.
 *
 * The combined return shape avoids the two-lookup-per-command pattern
 * (one for decimals, one for the success-message symbol).
 */
export function parseErc20Price(
  chainId: number,
  price: string
): { priceWei: bigint; symbol: string } {
  const paymentToken = getErc20PaymentToken(chainId);
  if (!paymentToken) {
    exitWithError(`Chain ${chainId} has no ERC20 payment token configured`);
  }
  return {
    priceWei: parseUnits(price, paymentToken.decimals),
    symbol: paymentToken.symbol,
  };
}
