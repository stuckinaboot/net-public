import { Abi, PublicClient, createPublicClient, defineChain, http } from "viem";
import { NET_CONTRACT_ABI } from "./constants";

interface ChainConfig {
  name: string;
  rpcUrls: string[];
  netContractAddress: `0x${string}`;
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer?: {
    name: string;
    url: string;
  };
}

// Internal chain configuration (not exported)
const CHAIN_CONFIG: Record<number, ChainConfig> = {
  // Base Mainnet
  8453: {
    name: "Base",
    rpcUrls: [
      "https://base-mainnet.public.blastapi.io",
      "https://mainnet.base.org",
      "https://base.drpc.org",
      "https://base.llamarpc.com",
    ],
    netContractAddress: "0x00000000B24D62781dB359b07880a105cD0b64e6",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorer: { name: "BaseScan", url: "https://basescan.org" },
  },
  // Ethereum Mainnet
  1: {
    name: "Ethereum",
    rpcUrls: ["https://eth.llamarpc.com", "https://rpc.ankr.com/eth"],
    netContractAddress: "0x00000000B24D62781dB359b07880a105cD0b64e6",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorer: { name: "Etherscan", url: "https://etherscan.io" },
  },
  // Degen Chain
  666666666: {
    name: "Degen",
    rpcUrls: ["https://rpc.degen.tips"],
    netContractAddress: "0x00000000B24D62781dB359b07880a105cD0b64e6",
    nativeCurrency: { name: "Degen", symbol: "DEGEN", decimals: 18 },
    blockExplorer: { name: "DegenScan", url: "https://explorer.degen.tips" },
  },
  // Ham Chain
  5112: {
    name: "Ham",
    rpcUrls: ["https://rpc.ham.fun"],
    netContractAddress: "0x00000000B24D62781dB359b07880a105cD0b64e6",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorer: {
      name: "Ham Chain Explorer",
      url: "https://explorer.ham.fun",
    },
  },
  // Ink Chain
  57073: {
    name: "Ink",
    rpcUrls: ["https://rpc-qnd.inkonchain.com"],
    netContractAddress: "0x00000000B24D62781dB359b07880a105cD0b64e6",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorer: {
      name: "Ink Chain Explorer",
      url: "https://explorer.inkonchain.com",
    },
  },
  // Unichain
  130: {
    name: "Unichain",
    rpcUrls: ["https://mainnet.unichain.org"],
    netContractAddress: "0x00000000B24D62781dB359b07880a105cD0b64e6",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorer: { name: "Uniscan", url: "https://uniscan.xyz" },
  },
  // Hyperliquid EVM
  999: {
    name: "HyperEVM",
    rpcUrls: ["https://rpc.hyperliquid.xyz/evm"],
    netContractAddress: "0x00000000B24D62781dB359b07880a105cD0b64e6",
    nativeCurrency: { name: "Hype", symbol: "HYPE", decimals: 18 },
    blockExplorer: {
      name: "Hyperliquid",
      url: "https://hyperliquid.cloud.blockscout.com/",
    },
  },
  // Plasma Chain
  9745: {
    name: "Plasma",
    rpcUrls: ["https://rpc.plasma.to"],
    netContractAddress: "0x00000000B24D62781dB359b07880a105cD0b64e6",
    nativeCurrency: { name: "Plasma", symbol: "PLASMA", decimals: 18 },
    blockExplorer: { name: "Plasma Explorer", url: "https://plasmascan.to" },
  },
  // Monad Chain
  143: {
    name: "Monad",
    rpcUrls: ["https://rpc3.monad.xyz"],
    netContractAddress: "0x00000000B24D62781dB359b07880a105cD0b64e6",
    nativeCurrency: { name: "Monad", symbol: "MONAD", decimals: 18 },
    blockExplorer: { name: "Monad Scan", url: "https://monadscan.com/" },
  },
  // Base Sepolia (testnet)
  84532: {
    name: "Base Sepolia",
    rpcUrls: ["https://sepolia.base.org"],
    netContractAddress: "0x00000000B24D62781dB359b07880a105cD0b64e6",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorer: {
      name: "BaseSepoliaScan",
      url: "https://sepolia.basescan.org",
    },
  },
  // Sepolia (testnet)
  11155111: {
    name: "Sepolia",
    rpcUrls: ["https://rpc.sepolia.org"],
    netContractAddress: "0x00000000B24D62781dB359b07880a105cD0b64e6",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorer: {
      name: "Sepolia Etherscan",
      url: "https://sepolia.etherscan.io",
    },
  },
};

// Global RPC override map
let globalRpcOverrides: Record<number, string[]> = {};

/**
 * Get chain name for a given chain ID
 */
export function getChainName(params: { chainId: number }): string | undefined {
  return CHAIN_CONFIG[params.chainId]?.name;
}

/**
 * Get RPC URLs for a chain (checks global override, then per-call override, then defaults)
 */
export function getChainRpcUrls(params: {
  chainId: number;
  rpcUrl?: string | string[];
}): string[] {
  // Per-call override takes precedence
  if (params.rpcUrl) {
    return Array.isArray(params.rpcUrl) ? params.rpcUrl : [params.rpcUrl];
  }

  // Check global override map (set by NetProvider or setChainRpcOverrides)
  const globalOverride = globalRpcOverrides[params.chainId];
  if (globalOverride) {
    return globalOverride;
  }

  // Fall back to defaults
  return CHAIN_CONFIG[params.chainId]?.rpcUrls || [];
}

/**
 * Get Net contract for a specific chain
 */
export function getNetContract(chainId: number): {
  address: `0x${string}`;
  abi: Abi;
} {
  const config = CHAIN_CONFIG[chainId];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return {
    address: config.netContractAddress,
    abi: NET_CONTRACT_ABI,
  };
}

/**
 * Get PublicClient for a chain
 */
export function getPublicClient(params: {
  chainId: number;
  rpcUrl?: string | string[];
}): PublicClient {
  const config = CHAIN_CONFIG[params.chainId];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${params.chainId}`);
  }

  const rpcUrls = getChainRpcUrls({
    chainId: params.chainId,
    rpcUrl: params.rpcUrl,
  });

  return createPublicClient({
    chain: defineChain({
      id: params.chainId,
      name: config.name,
      nativeCurrency: config.nativeCurrency || {
        name: "Ether",
        symbol: "ETH",
        decimals: 18,
      },
      rpcUrls: {
        default: { http: rpcUrls },
        public: { http: rpcUrls },
      },
      blockExplorers: config.blockExplorer
        ? {
            default: config.blockExplorer,
          }
        : undefined,
    }),
    transport: http(),
    batch: { multicall: true },
  });
}

/**
 * Set global RPC overrides for chains
 */
export function setChainRpcOverrides(overrides: {
  [chainId: number]: string[];
}): void {
  globalRpcOverrides = { ...globalRpcOverrides, ...overrides };
}
