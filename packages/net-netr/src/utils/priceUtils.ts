import { TOKEN_DECIMALS } from "../constants";
import type { NetrPriceData } from "../types";

export function calculatePriceFromSqrtPriceX96(sqrtPriceX96: bigint, tick: number): NetrPriceData {
  const price = (Number(sqrtPriceX96) / 2 ** 96) ** 2;

  return {
    priceInWeth: price,
    priceInEth: price,
    sqrtPriceX96,
    tick,
  };
}

export function estimateMarketCap(
  priceInEth: number,
  totalSupply: bigint,
  ethPriceUsd?: number
): { marketCapEth: number; marketCapUsd?: number } {
  const totalSupplyTokens = Number(totalSupply) / 10 ** TOKEN_DECIMALS;
  const marketCapEth = priceInEth * totalSupplyTokens;

  return {
    marketCapEth,
    marketCapUsd: ethPriceUsd ? marketCapEth * ethPriceUsd : undefined,
  };
}

export function formatPrice(price: number, significantDigits = 6): string {
  if (price === 0) return "0";
  if (price < 0.000001) return price.toExponential(significantDigits - 1);
  return price.toPrecision(significantDigits);
}

export function priceFromTick(tick: number): number {
  return Math.pow(1.0001, tick);
}

export function tickFromPrice(price: number): number {
  return Math.floor(Math.log(price) / Math.log(1.0001));
}
