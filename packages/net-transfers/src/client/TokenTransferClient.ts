import type { Address, PublicClient } from "viem";
import { readContract } from "viem/actions";
import {
  NetClient,
  getPublicClient,
  type NetMessage,
  type NetMessageFilter,
} from "@net-protocol/core";
import { ERC20_ABI, TOKEN_TRANSFER_CONTRACT } from "../constants";
import { getTransferTopic, isNativeToken, parseTransferMessage, validateSendParams } from "../utils";
import type {
  GetTransfersOptions,
  PreparedSend,
  PrepareSendParams,
  TokenTransfer,
  TokenTransferClientOptions,
  TransferQuery,
} from "../types";

/**
 * TokenTransferClient — read transfers sent through NetTokenTransfer and prepare new sends.
 *
 * Sent / received / between lookups use Net's own indexes; per-token lookups use the
 * contract's token index. Results are newest first.
 */
export class TokenTransferClient {
  private client: PublicClient;
  private netClient: NetClient;
  private contractAddress: Address;

  constructor(params: TokenTransferClientOptions) {
    const rpcUrls = params.overrides?.rpcUrls;
    this.client = getPublicClient({ chainId: params.chainId, rpcUrl: rpcUrls });
    this.netClient = new NetClient({
      chainId: params.chainId,
      overrides: rpcUrls ? { rpcUrls } : undefined,
    });
    this.contractAddress =
      params.overrides?.contractAddress ?? TOKEN_TRANSFER_CONTRACT.address;
  }

  /** Total number of transfers matching the query */
  async getTransferCount(query: TransferQuery): Promise<number> {
    if (query.token) {
      const count = await readContract(this.client, {
        address: this.contractAddress,
        abi: TOKEN_TRANSFER_CONTRACT.abi,
        functionName: "getTokenTransferCount",
        args: [query.token],
      });
      return Number(count);
    }
    return this.netClient.getMessageCount({ filter: this.getNetFilter(query) });
  }

  /** Transfers matching the query, newest first */
  async getTransfers(
    query: TransferQuery,
    { limit = 20, offset = 0 }: GetTransfersOptions = {}
  ): Promise<TokenTransfer[]> {
    const count = await this.getTransferCount(query);
    const endIndex = count - offset;
    if (endIndex <= 0 || limit <= 0) return [];
    const startIndex = Math.max(0, endIndex - limit);

    let messages: NetMessage[];
    if (query.token) {
      messages = (await readContract(this.client, {
        address: this.contractAddress,
        abi: TOKEN_TRANSFER_CONTRACT.abi,
        functionName: "getTokenTransfers",
        args: [query.token, BigInt(startIndex), BigInt(endIndex)],
      })) as NetMessage[];
    } else {
      messages = await this.netClient.getMessages({
        filter: this.getNetFilter(query),
        startIndex,
        endIndex,
      });
    }
    return messages.map(parseTransferMessage).reverse();
  }

  /**
   * Build the transactions for a send: any ERC-20 approval still needed, then the send.
   * For ETH (NATIVE_TOKEN_ADDRESS) there are no approvals and `transaction.value` is set.
   */
  async prepareSend(params: PrepareSendParams): Promise<PreparedSend> {
    const error = validateSendParams(params);
    if (error) throw new Error(error);
    const message = params.message ?? "";
    const abi = TOKEN_TRANSFER_CONTRACT.abi;

    if (isNativeToken(params.token)) {
      return {
        approvals: [],
        transaction: {
          to: this.contractAddress,
          abi,
          functionName: "sendNative",
          args: [params.to, message],
          value: params.amount,
        },
      };
    }

    const allowance = await readContract(this.client, {
      address: params.token,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [params.sender, this.contractAddress],
    });

    return {
      approvals:
        allowance >= params.amount
          ? []
          : [
              {
                to: params.token,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [this.contractAddress, params.amount],
              },
            ],
      transaction: {
        to: this.contractAddress,
        abi,
        functionName: "send",
        args: [params.token, params.to, params.amount, message],
      },
    };
  }

  /** Token decimals and symbol (18 / "ETH" for native) */
  async getTokenInfo(token: Address): Promise<{ decimals: number; symbol: string }> {
    if (isNativeToken(token)) return { decimals: 18, symbol: "ETH" };
    const [decimals, symbol] = await Promise.all([
      readContract(this.client, { address: token, abi: ERC20_ABI, functionName: "decimals" }),
      readContract(this.client, { address: token, abi: ERC20_ABI, functionName: "symbol" }),
    ]);
    return { decimals: Number(decimals), symbol };
  }

  private getNetFilter(query: TransferQuery): NetMessageFilter {
    return {
      appAddress: this.contractAddress,
      maker: query.sentBy,
      topic: query.receivedBy ? getTransferTopic(query.receivedBy) : undefined,
    };
  }
}
