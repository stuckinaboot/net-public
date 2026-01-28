import { createPublicClient, defineChain, http, type PublicClient } from "viem";
import { readContract } from "viem/actions";
import { getChainRpcUrls, getNetContract } from "@net-protocol/core";
import { STORAGE_CONTRACT } from "@net-protocol/storage";
import { getNetrChainConfig, getNetrContract } from "../chainConfig";
import {
  CHAIN_INITIAL_TICKS,
  DEFAULT_INITIAL_TICK,
  DEFAULT_TOTAL_SUPPLY,
  LP_LOCKER_ABI,
  NETR_TOKEN_ABI,
  UNISWAP_V3_POOL_ABI,
  ZERO_ADDRESS,
} from "../constants";
import type {
  NetrClientOptions,
  NetrDeployConfig,
  NetrDeployTxConfig,
  NetrLockerData,
  NetrPriceData,
  NetrSaltResult,
  NetrStorageData,
  NetrTokenMetadata,
} from "../types";
import { addressToBytes32 } from "../utils/addressUtils";
import { calculatePriceFromSqrtPriceX96 } from "../utils/priceUtils";
import {
  decodeBangerStorageData,
  extractAddressesFromMessageData,
} from "../utils/storageDecoding";

export class NetrClient {
  private client: PublicClient;
  private chainId: number;

  constructor(options: NetrClientOptions) {
    this.chainId = options.chainId;
    const rpcUrls = options.overrides?.rpcUrls || getChainRpcUrls({ chainId: this.chainId });

    if (rpcUrls.length === 0) {
      throw new Error(`No RPC URLs available for chain ID: ${this.chainId}`);
    }

    const chainConfig = getNetrChainConfig(this.chainId);

    this.client = createPublicClient({
      chain: defineChain({
        id: this.chainId,
        name: chainConfig?.name || `Chain ${this.chainId}`,
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: {
          default: { http: rpcUrls },
          public: { http: rpcUrls },
        },
      }),
      transport: http(rpcUrls[0]),
      batch: { multicall: true },
    });
  }

  async getToken(tokenAddress: `0x${string}`): Promise<NetrTokenMetadata | null> {
    try {
      const [name, symbol, deployer, image, animation, fid, totalSupply, decimals, extraStringData] =
        await Promise.all([
          readContract(this.client, {
            address: tokenAddress,
            abi: NETR_TOKEN_ABI,
            functionName: "name",
          }) as Promise<string>,
          readContract(this.client, {
            address: tokenAddress,
            abi: NETR_TOKEN_ABI,
            functionName: "symbol",
          }) as Promise<string>,
          readContract(this.client, {
            address: tokenAddress,
            abi: NETR_TOKEN_ABI,
            functionName: "deployer",
          }) as Promise<`0x${string}`>,
          readContract(this.client, {
            address: tokenAddress,
            abi: NETR_TOKEN_ABI,
            functionName: "image",
          }) as Promise<string>,
          readContract(this.client, {
            address: tokenAddress,
            abi: NETR_TOKEN_ABI,
            functionName: "animation",
          }) as Promise<string>,
          readContract(this.client, {
            address: tokenAddress,
            abi: NETR_TOKEN_ABI,
            functionName: "fid",
          }) as Promise<bigint>,
          readContract(this.client, {
            address: tokenAddress,
            abi: NETR_TOKEN_ABI,
            functionName: "totalSupply",
          }) as Promise<bigint>,
          readContract(this.client, {
            address: tokenAddress,
            abi: NETR_TOKEN_ABI,
            functionName: "decimals",
          }) as Promise<number>,
          readContract(this.client, {
            address: tokenAddress,
            abi: NETR_TOKEN_ABI,
            functionName: "extraStringData",
          }) as Promise<string>,
        ]);

      return { name, symbol, deployer, image, animation, fid, totalSupply, decimals, extraStringData };
    } catch {
      return null;
    }
  }

  async getStorageData(tokenAddress: `0x${string}`): Promise<NetrStorageData | null> {
    try {
      const netrContract = getNetrContract(this.chainId);
      const storageKey = addressToBytes32(tokenAddress);

      const storageResult = (await readContract(this.client, {
        address: STORAGE_CONTRACT.address,
        abi: STORAGE_CONTRACT.abi,
        functionName: "get",
        args: [storageKey, netrContract.address],
      })) as [string, string];

      const storageData = decodeBangerStorageData(storageResult?.[1]);
      if (!storageData) return null;

      if (storageData.messageIndex > 0n) {
        const netContract = getNetContract(this.chainId);
        const message = (await readContract(this.client, {
          address: netContract.address,
          abi: netContract.abi,
          functionName: "getMessage",
          args: [storageData.messageIndex.toString()],
        })) as { data: string } | undefined;

        if (message?.data) {
          const { poolAddress, lockerAddress } = extractAddressesFromMessageData(message.data);
          return { ...storageData, poolAddress, lockerAddress };
        }
      }

      return storageData;
    } catch {
      return null;
    }
  }

  async getPrice(tokenAddress: `0x${string}`): Promise<NetrPriceData | null> {
    try {
      const storageData = await this.getStorageData(tokenAddress);
      if (!storageData?.poolAddress) return null;

      return this.getPriceFromPool(storageData.poolAddress);
    } catch {
      return null;
    }
  }

  async getPriceFromPool(poolAddress: `0x${string}`): Promise<NetrPriceData | null> {
    try {
      const slot0 = (await readContract(this.client, {
        address: poolAddress,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: "slot0",
      })) as [bigint, number, number, number, number, number, boolean];

      return calculatePriceFromSqrtPriceX96(slot0[0], slot0[1]);
    } catch {
      return null;
    }
  }

  async getLocker(lockerAddress: `0x${string}`): Promise<NetrLockerData | null> {
    try {
      const [owner, duration, end, version] = await Promise.all([
        readContract(this.client, {
          address: lockerAddress,
          abi: LP_LOCKER_ABI,
          functionName: "owner",
        }) as Promise<`0x${string}`>,
        readContract(this.client, {
          address: lockerAddress,
          abi: LP_LOCKER_ABI,
          functionName: "duration",
        }) as Promise<bigint>,
        readContract(this.client, {
          address: lockerAddress,
          abi: LP_LOCKER_ABI,
          functionName: "end",
        }) as Promise<bigint>,
        readContract(this.client, {
          address: lockerAddress,
          abi: LP_LOCKER_ABI,
          functionName: "version",
        }) as Promise<string>,
      ]);

      return { owner, duration, endTimestamp: end, version };
    } catch {
      return null;
    }
  }

  async generateSalt(config: NetrDeployConfig): Promise<NetrSaltResult | null> {
    try {
      const netrContract = getNetrContract(this.chainId);
      const totalSupply = config.totalSupply ?? DEFAULT_TOTAL_SUPPLY;

      const result = (await readContract(this.client, {
        address: netrContract.address,
        abi: netrContract.abi,
        functionName: "generateSalt",
        args: [
          config.deployer,
          config.fid ?? 0n,
          config.name,
          config.symbol,
          config.image,
          config.animation ?? "",
          config.metadataAddress ?? ZERO_ADDRESS,
          config.extraStringData ?? "",
          totalSupply,
        ],
      })) as [string, string];

      return {
        salt: result[0] as `0x${string}`,
        predictedAddress: result[1] as `0x${string}`,
      };
    } catch {
      return null;
    }
  }

  buildDeployConfig(config: NetrDeployConfig, salt: `0x${string}`): NetrDeployTxConfig {
    const netrContract = getNetrContract(this.chainId);
    const totalSupply = config.totalSupply ?? DEFAULT_TOTAL_SUPPLY;
    const initialTick = config.initialTick ?? CHAIN_INITIAL_TICKS[this.chainId] ?? DEFAULT_INITIAL_TICK;

    return {
      address: netrContract.address,
      abi: netrContract.abi,
      functionName: "deployToken",
      args: [
        totalSupply,
        initialTick,
        salt,
        config.deployer,
        config.fid ?? 0n,
        config.mintPrice ?? 0n,
        config.mintEndTimestamp ?? 0n,
        config.maxMintSupply ?? 0n,
        config.name,
        config.symbol,
        config.image,
        config.animation ?? "",
        config.metadataAddress ?? ZERO_ADDRESS,
        config.extraStringData ?? "",
      ],
      chainId: this.chainId,
    };
  }

  getChainId(): number {
    return this.chainId;
  }
}
