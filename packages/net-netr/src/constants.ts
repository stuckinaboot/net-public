import type { Abi } from "viem";
import bangerv4Abi from "./abis/bangerv4.json";
import lpLockerAbi from "./abis/lp-locker.json";
import netrTokenAbi from "./abis/netr-token.json";
import uniswapV3PoolAbi from "./abis/uniswap-v3-pool.json";

export const BANGER_V4_ABI = bangerv4Abi as Abi;
export const NETR_TOKEN_ABI = netrTokenAbi as Abi;
export const LP_LOCKER_ABI = lpLockerAbi as Abi;
export const UNISWAP_V3_POOL_ABI = uniswapV3PoolAbi as Abi;

export const DEFAULT_TOTAL_SUPPLY = BigInt("100000000000000000000000000000");
export const DEFAULT_INITIAL_TICK = -230400;
export const POOL_FEE_TIER = 10000;
export const TOKEN_DECIMALS = 18;
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export const CHAIN_INITIAL_TICKS: Record<number, number> = {
  8453: -230400,
  999: -177400,
  9745: -147200,
  143: -115000,
};
