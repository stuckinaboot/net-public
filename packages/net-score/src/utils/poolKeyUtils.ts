import { encodeAbiParameters, type Address } from "viem";
import type { PoolKey } from "../types";

/**
 * Encode a PoolKey struct to bytes for scoreStoredContext.
 * Returns "0x" for invalid or missing pool keys.
 */
export const encodePoolKey = (poolKey?: PoolKey | null): `0x${string}` => {
  if (!poolKey || !isValidPoolKey(poolKey)) {
    return "0x";
  }

  try {
    return encodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            { name: "currency0", type: "address" },
            { name: "currency1", type: "address" },
            { name: "fee", type: "uint24" },
            { name: "tickSpacing", type: "int24" },
            { name: "hooks", type: "address" },
          ],
        },
      ],
      [
        {
          currency0: poolKey.currency0 as Address,
          currency1: poolKey.currency1 as Address,
          fee: poolKey.fee,
          tickSpacing: poolKey.tickSpacing,
          hooks: poolKey.hooks as Address,
        },
      ]
    );
  } catch {
    return "0x";
  }
};

function isValidPoolKey(poolKey: PoolKey): boolean {
  return (
    poolKey.fee !== undefined ||
    poolKey.tickSpacing !== undefined ||
    poolKey.currency0 !== undefined
  );
}
