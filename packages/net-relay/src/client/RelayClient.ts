import type { LocalAccount, Address } from "viem/accounts";
import type { PublicClient, Hash } from "viem";
import type { WriteTransactionConfig } from "@net-protocol/core";
import { createRelaySession } from "../session";
import { checkBackendWalletBalance } from "../balance";
import { fundBackendWallet } from "../fund";
import { submitTransactionsViaRelay } from "../submit";
import { retryFailedTransactions } from "../retry";
import { createRelayX402Client } from "./x402Client";
import type {
  CheckBalanceResult,
  RelayFundResult,
  RelaySubmitResult,
  RetryFailedTransactionsParams,
  RetryConfig,
  FundBackendWalletParams,
  SubmitTransactionsViaRelayParams,
} from "../types";

/**
 * High-level client for Net Relay Service
 *
 * Provides a convenient class-based API that stores apiUrl and chainId,
 * reducing boilerplate when making multiple relay calls.
 */
export class RelayClient {
  private apiUrl: string;
  private chainId: number;

  constructor(options: { apiUrl: string; chainId: number }) {
    this.apiUrl = options.apiUrl;
    this.chainId = options.chainId;
  }

  /**
   * Create a relay session token
   *
   * @param params - Session creation parameters (apiUrl and chainId are already set)
   * @returns Session token and expiration timestamp
   */
  async createSession(params: {
    operatorAddress: Address;
    secretKey: string;
    account: LocalAccount;
    expiresIn?: number;
  }): Promise<{ sessionToken: string; expiresAt: number }> {
    return createRelaySession({
      apiUrl: this.apiUrl,
      chainId: this.chainId,
      ...params,
    });
  }

  /**
   * Check backend wallet balance
   *
   * @param params - Balance check parameters (apiUrl and chainId are already set)
   * @returns Result with balance information
   */
  async checkBalance(params: {
    operatorAddress: Address;
    secretKey: string;
  }): Promise<CheckBalanceResult> {
    return checkBackendWalletBalance({
      apiUrl: this.apiUrl,
      chainId: this.chainId,
      ...params,
    });
  }

  /**
   * Fund backend wallet via x402 payment
   *
   * @param params - Funding parameters (apiUrl and chainId are already set)
   * @returns Result with paymentTxHash and backendWalletAddress
   */
  async fundBackendWallet(params: {
    operatorAddress: Address;
    secretKey: string;
    fetchWithPayment: typeof fetch;
    httpClient: FundBackendWalletParams["httpClient"];
    /** Optional custom USDC amount. If not provided, uses default minimum. */
    amount?: number;
  }): Promise<RelayFundResult> {
    return fundBackendWallet({
      apiUrl: this.apiUrl,
      chainId: this.chainId,
      ...params,
    });
  }

  /**
   * Submit transactions via relay
   *
   * @param params - Submission parameters (apiUrl and chainId are already set)
   * @returns Result with transaction hashes and success/failure tracking
   */
  async submitTransactions(params: {
    operatorAddress: Address;
    secretKey: string;
    transactions: WriteTransactionConfig[];
    sessionToken: string;
  }): Promise<RelaySubmitResult> {
    return submitTransactionsViaRelay({
      apiUrl: this.apiUrl,
      chainId: this.chainId,
      ...params,
    });
  }

  /**
   * Retry failed transactions with exponential backoff
   *
   * @param params - Retry parameters (apiUrl and chainId are already set)
   * @returns Final success/failure status after retries
   */
  async retryFailedTransactions(params: {
    operatorAddress: Address;
    secretKey: string;
    failedIndexes: number[];
    originalTransactions: WriteTransactionConfig[];
    backendWalletAddress: Address;
    config?: RetryConfig;
    sessionToken: string;
    recheckFunction?: RetryFailedTransactionsParams["recheckFunction"];
  }): Promise<RelaySubmitResult> {
    return retryFailedTransactions({
      apiUrl: this.apiUrl,
      chainId: this.chainId,
      ...params,
    });
  }

  /**
   * Create x402 client for relay payments
   *
   * @param account - User's local account
   * @returns Object with fetchWithPayment and httpClient
   */
  createX402Client(account: LocalAccount) {
    return createRelayX402Client(account, this.chainId);
  }
}

