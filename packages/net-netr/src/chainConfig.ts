import type { Abi } from "viem";
import { BANGER_V4_ABI } from "./constants";

interface NetrChainConfig {
  name: string;
  bangerV4Address: `0x${string}`;
  wethAddress: `0x${string}`;
  storageAddress: `0x${string}`;
  netAddress: `0x${string}`;
}

const NETR_CHAIN_CONFIG: Record<number, NetrChainConfig> = {
  8453: {
    name: "Base",
    bangerV4Address: "0x000000C91A20BE8342B6D4dfc0947f1Ec5333BF6",
    wethAddress: "0x4200000000000000000000000000000000000006",
    storageAddress: "0x00000000db40fcb9f4466330982372e27fd7bbf5",
    netAddress: "0x00000000B24D62781dB359b07880a105cD0b64e6",
  },
  9745: {
    name: "Plasma",
    bangerV4Address: "0x00000000CDaB5161815cD4005fAc11AC3a796F63",
    wethAddress: "0x4200000000000000000000000000000000000006",
    storageAddress: "0x00000000db40fcb9f4466330982372e27fd7bbf5",
    netAddress: "0x00000000B24D62781dB359b07880a105cD0b64e6",
  },
  143: {
    name: "Monad",
    bangerV4Address: "0x00000000CDaB5161815cD4005fAc11AC3a796F63",
    wethAddress: "0x4200000000000000000000000000000000000006",
    storageAddress: "0x00000000db40fcb9f4466330982372e27fd7bbf5",
    netAddress: "0x00000000B24D62781dB359b07880a105cD0b64e6",
  },
  999: {
    name: "HyperEVM",
    bangerV4Address: "0x000000C91A20BE8342B6D4dfc0947f1Ec5333BF6",
    wethAddress: "0x4200000000000000000000000000000000000006",
    storageAddress: "0x00000000db40fcb9f4466330982372e27fd7bbf5",
    netAddress: "0x00000000B24D62781dB359b07880a105cD0b64e6",
  },
};

export function getNetrContract(chainId: number): { address: `0x${string}`; abi: Abi } {
  const config = NETR_CHAIN_CONFIG[chainId];
  if (!config) {
    throw new Error(`Netr: Unsupported chain ID: ${chainId}`);
  }
  return { address: config.bangerV4Address, abi: BANGER_V4_ABI };
}

export function getNetrChainConfig(chainId: number): NetrChainConfig | undefined {
  return NETR_CHAIN_CONFIG[chainId];
}

export function isNetrSupportedChain(chainId: number): boolean {
  return chainId in NETR_CHAIN_CONFIG;
}

export function getNetrSupportedChainIds(): number[] {
  return Object.keys(NETR_CHAIN_CONFIG).map(Number);
}

export function getWethAddress(chainId: number): `0x${string}` | undefined {
  return NETR_CHAIN_CONFIG[chainId]?.wethAddress;
}

export function getStorageAddress(chainId: number): `0x${string}` | undefined {
  return NETR_CHAIN_CONFIG[chainId]?.storageAddress;
}

export function getNetAddress(chainId: number): `0x${string}` | undefined {
  return NETR_CHAIN_CONFIG[chainId]?.netAddress;
}
