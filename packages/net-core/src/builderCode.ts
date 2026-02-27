import { Attribution } from "ox/erc8021";

export const BASE_BUILDER_CODE = "bc_d0x2dqkv";
export const BASE_CHAIN_ID = 8453;

/**
 * Data suffix for Base Builder Code attribution (ERC-8021).
 * When appended to transaction calldata, this tags the transaction
 * for builder rewards on Base.
 */
export const BASE_DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [BASE_BUILDER_CODE],
});

/**
 * Returns the Base data suffix only when the chain is Base (8453),
 * otherwise returns undefined.
 */
export function getBaseDataSuffix(
  chainId: number
): `0x${string}` | undefined {
  return chainId === BASE_CHAIN_ID ? BASE_DATA_SUFFIX : undefined;
}
