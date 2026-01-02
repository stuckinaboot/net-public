# @net-protocol/relay

Net Relay SDK for submitting transactions via x402 payment relay service.

This package provides client-side functionality for interacting with the Net relay service, which allows users to submit on-chain transactions without holding ETH by paying with USDC via x402.

## Installation

```bash
npm install @net-protocol/relay
# or
yarn add @net-protocol/relay
```

## Features

- **Session Management**: Create session tokens for authenticated batch requests
- **Balance Checking**: Check backend wallet balance before submitting transactions
- **Wallet Funding**: Fund backend wallets via x402 payments (USDC)
- **Transaction Submission**: Submit batches of transactions via relay service
- **Retry Logic**: Automatic retry with exponential backoff for failed transactions
- **Transaction Batching**: Automatically batch transactions to respect API limits
- **Confirmation Waiting**: Wait for transaction confirmations on-chain

## Quick Start

### Basic Usage

```typescript
import { createRelaySession, submitTransactionsViaRelay } from "@net-protocol/relay";
import { privateKeyToAccount } from "viem/accounts";

// Create a session token
const account = privateKeyToAccount("0x...");
const { sessionToken } = await createRelaySession({
  apiUrl: "https://api.example.com",
  chainId: 84532,
  operatorAddress: "0x...",
  secretKey: "your-secret-key",
  account,
});

// Submit transactions
const result = await submitTransactionsViaRelay({
  apiUrl: "https://api.example.com",
  chainId: 84532,
  operatorAddress: "0x...",
  secretKey: "your-secret-key",
  transactions: [
    {
      to: "0x...",
      data: "0x...",
    },
  ],
  sessionToken,
});
```

### Using the RelayClient Class

For a more convenient API, use the `RelayClient` class:

```typescript
import { RelayClient } from "@net-protocol/relay";
import { privateKeyToAccount } from "viem/accounts";

const client = new RelayClient({
  apiUrl: "https://api.example.com",
  chainId: 84532,
});

const account = privateKeyToAccount("0x...");

// Create session
const { sessionToken } = await client.createSession({
  operatorAddress: "0x...",
  secretKey: "your-secret-key",
  account,
});

// Check balance
const balance = await client.checkBalance({
  operatorAddress: "0x...",
  secretKey: "your-secret-key",
});

// Fund backend wallet (if needed)
if (!balance.sufficientBalance) {
  const x402Client = client.createX402Client(account);
  await client.fundBackendWallet({
    operatorAddress: "0x...",
    secretKey: "your-secret-key",
    ...x402Client,
  });
}

// Submit transactions
const result = await client.submitTransactions({
  operatorAddress: "0x...",
  secretKey: "your-secret-key",
  transactions: [...],
  sessionToken,
});
```

## API Reference

### Functions

#### `createRelaySession`

Create a relay session token for authenticated batch requests.

```typescript
function createRelaySession(params: {
  apiUrl: string;
  chainId: number;
  operatorAddress: Address;
  secretKey: string;
  account: LocalAccount;
  expiresIn?: number; // Optional, default: 3600 seconds
}): Promise<{ sessionToken: string; expiresAt: number }>;
```

#### `checkBackendWalletBalance`

Check the balance of the backend wallet for a given operator.

```typescript
function checkBackendWalletBalance(params: {
  apiUrl: string;
  chainId: number;
  operatorAddress: Address;
  secretKey: string;
}): Promise<CheckBalanceResult>;
```

#### `fundBackendWallet`

Fund a backend wallet via x402 payment (USDC).

```typescript
function fundBackendWallet(params: {
  apiUrl: string;
  chainId: number;
  operatorAddress: Address;
  secretKey: string;
  fetchWithPayment: typeof fetch;
  httpClient: {
    getPaymentSettleResponse: (getHeader: (name: string) => string | null) => 
      { transaction?: string; txHash?: string } | null;
  };
}): Promise<RelayFundResult>;
```

#### `submitTransactionsViaRelay`

Submit a batch of transactions via the relay service.

```typescript
function submitTransactionsViaRelay(params: {
  apiUrl: string;
  chainId: number;
  operatorAddress: Address;
  secretKey: string;
  transactions: WriteTransactionConfig[];
  sessionToken: string;
}): Promise<RelaySubmitResult>;
```

#### `retryFailedTransactions`

Retry failed transactions with exponential backoff.

```typescript
function retryFailedTransactions(params: {
  apiUrl: string;
  chainId: number;
  operatorAddress: Address;
  secretKey: string;
  failedIndexes: number[];
  originalTransactions: WriteTransactionConfig[];
  backendWalletAddress: Address;
  sessionToken: string;
  config?: RetryConfig;
  recheckFunction?: (
    failedIndexes: number[],
    transactions: WriteTransactionConfig[],
    backendWalletAddress: Address
  ) => Promise<number[]>;
}): Promise<RelaySubmitResult>;
```

#### `waitForConfirmations`

Wait for transaction confirmations on-chain.

```typescript
function waitForConfirmations(params: {
  publicClient: PublicClient;
  transactionHashes: Hash[];
  confirmations?: number; // Default: 1
  timeout?: number; // Default: 60000ms
  onProgress?: (confirmed: number, total: number) => void;
}): Promise<Array<{ hash: Hash; receipt: any }>>;
```

#### `batchTransactions`

Batch transactions to respect API limits.

```typescript
function batchTransactions(
  transactions: WriteTransactionConfig[]
): WriteTransactionConfig[][];
```

#### `createRelayX402Client`

Create an x402 client for relay payments.

```typescript
function createRelayX402Client(
  account: LocalAccount,
  chainId?: number
): {
  fetchWithPayment: typeof fetch;
  httpClient: {
    getPaymentSettleResponse: (getHeader: (name: string) => string | null) => 
      { transaction?: string; txHash?: string } | null;
  };
};
```

### Classes

#### `RelayClient`

High-level class-based API for the relay service.

```typescript
class RelayClient {
  constructor(options: { apiUrl: string; chainId: number });
  
  createSession(params: {...}): Promise<{ sessionToken: string; expiresAt: number }>;
  checkBalance(params: {...}): Promise<CheckBalanceResult>;
  fundBackendWallet(params: {...}): Promise<RelayFundResult>;
  submitTransactions(params: {...}): Promise<RelaySubmitResult>;
  retryFailedTransactions(params: {...}): Promise<RelaySubmitResult>;
  createX402Client(account: LocalAccount): {...};
}
```

## Types

### `CheckBalanceResult`

```typescript
interface CheckBalanceResult {
  backendWalletAddress: Address;
  balanceWei: string;
  balanceEth: string;
  sufficientBalance: boolean;
  minRequiredWei: string;
  minRequiredEth: string;
}
```

### `RelayFundResult`

```typescript
interface RelayFundResult {
  paymentTxHash: Hash;
  backendWalletAddress: Address;
}
```

### `RelaySubmitResult`

```typescript
interface RelaySubmitResult {
  transactionHashes: Hash[];
  successfulIndexes: number[];
  failedIndexes: number[];
  errors: { index: number; error: string }[];
  backendWalletAddress: Address;
  appFeeTransactionHash: Hash; // Always included
}
```

### `RetryConfig`

```typescript
interface RetryConfig {
  maxRetries?: number; // Default: 3
  initialDelay?: number; // Default: 1000ms
  maxDelay?: number; // Default: 30000ms
  backoffMultiplier?: number; // Default: 2
}
```

## Constants

- `MAX_TRANSACTIONS_PER_BATCH`: Maximum transactions per batch (100)
- `MAX_BATCH_SIZE_BYTES`: Maximum batch size in bytes (900KB)
- `MAX_TRANSACTION_SIZE_BYTES`: Maximum transaction size in bytes (100KB)

## Usage Examples

### Complete Upload Flow

```typescript
import {
  RelayClient,
  batchTransactions,
  waitForConfirmations,
} from "@net-protocol/relay";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const client = new RelayClient({
  apiUrl: "https://api.example.com",
  chainId: 84532,
});

const account = privateKeyToAccount("0x...");
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// 1. Create session
const { sessionToken } = await client.createSession({
  operatorAddress: account.address,
  secretKey: "your-secret-key",
  account,
});

// 2. Check balance
const balance = await client.checkBalance({
  operatorAddress: account.address,
  secretKey: "your-secret-key",
});

// 3. Fund if needed
if (!balance.sufficientBalance) {
  const x402Client = client.createX402Client(account);
  await client.fundBackendWallet({
    operatorAddress: account.address,
    secretKey: "your-secret-key",
    ...x402Client,
  });
}

// 4. Prepare transactions
const transactions = [
  // ... your transactions
];

// 5. Batch transactions
const batches = batchTransactions(transactions);

// 6. Submit each batch
const allHashes: Hash[] = [];
for (const batch of batches) {
  const result = await client.submitTransactions({
    operatorAddress: account.address,
    secretKey: "your-secret-key",
    transactions: batch,
    sessionToken,
  });
  
  allHashes.push(...result.transactionHashes);
  
  // Retry failed transactions if any
  if (result.failedIndexes.length > 0) {
    const retryResult = await client.retryFailedTransactions({
      operatorAddress: account.address,
      secretKey: "your-secret-key",
      failedIndexes: result.failedIndexes,
      originalTransactions: batch,
      backendWalletAddress: result.backendWalletAddress,
      sessionToken,
    });
    
    allHashes.push(...retryResult.transactionHashes);
  }
}

// 7. Wait for confirmations
const receipts = await waitForConfirmations({
  publicClient,
  transactionHashes: allHashes,
  confirmations: 1,
  onProgress: (confirmed, total) => {
    console.log(`Confirmed ${confirmed}/${total}`);
  },
});
```

## Chain Support

The package supports multiple chains via the `chainId` parameter:

- **Base Sepolia** (84532): Uses x402.org facilitator
- **Base Mainnet** (8453): Uses Coinbase CDP facilitator (automatic)

## Error Handling

All functions throw errors with descriptive messages. Common error scenarios:

- **Session expired**: Session token has expired, create a new one
- **Insufficient balance**: Backend wallet needs funding
- **Payment failed**: x402 payment could not be processed
- **Transaction failed**: Transaction was rejected by the network
- **Rate limit**: Too many requests, retry after delay

## License

MIT

