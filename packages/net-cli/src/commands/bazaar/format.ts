/**
 * Format a price number for display (removes trailing zeros)
 */
export function formatEthPrice(price: number): string {
  return price.toFixed(6).replace(/\.?0+$/, "");
}
