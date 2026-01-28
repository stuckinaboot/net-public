# Net Protocol SDK Patterns

## Installation

```bash
npm install @net-protocol/core @net-protocol/storage @net-protocol/netr viem
```

## Core SDK (@net-protocol/core)

### NetClient for Non-React

```typescript
import { NetClient } from "@net-protocol/core";

const client = new NetClient({ chainId: 8453 });

// Get messages
const messages = await client.getMessages({
  filter: { appAddress: "0x..." },
  startIndex: 0,
  endIndex: 10,
});

// Get message count
const count = await client.getMessageCount({
  filter: { topic: "announcements" },
});

// Prepare send message transaction
const txConfig = client.prepareSendMessage({
  text: "Hello Net!",
  topic: "greetings",
  data: "0x", // optional hex data
});
```

### React Hooks

```typescript
import { useNetMessages, NetProvider } from "@net-protocol/core";

function App() {
  return (
    <NetProvider>
      <MyComponent />
    </NetProvider>
  );
}

function MyComponent() {
  const { messages, isLoading } = useNetMessages({
    chainId: 8453,
    filter: { appAddress: "0x..." },
  });

  return <div>Messages: {messages.length}</div>;
}
```

## Storage SDK (@net-protocol/storage)

### StorageClient for Non-React

```typescript
import { StorageClient } from "@net-protocol/storage";

const client = new StorageClient({ chainId: 8453 });

// Read storage (latest version)
const data = await client.get({
  key: "my-key",
  operator: "0x...",
});
// Returns: { text: "description", value: "0x..." }

// Read with XML resolution (for large files)
const resolved = await client.readStorageData({
  key: "my-key",
  operator: "0x...",
});
// Returns: { text: "...", data: "full content", isXml: true/false }

// Read historical version
const historical = await client.getValueAtIndex({
  key: "my-key",
  operator: "0x...",
  index: 0, // 0 = oldest version
});

// Get total versions
const versions = await client.getTotalWrites({
  key: "my-key",
  operator: "0x...",
});

// Prepare storage transaction
const txConfig = client.preparePut({
  key: "my-key",
  text: "description",
  value: "data to store",
});

// Prepare XML storage (multiple transactions for large files)
const { transactionConfigs, topLevelHash } = client.prepareXmlStorage({
  data: largeFileContent,
  operatorAddress: "0x...",
  storageKey: "large-file",
  filename: "data.json",
});
```

### React Hooks

```typescript
import { useStorage, useXmlStorage } from "@net-protocol/storage";

function StorageComponent() {
  const { data, isLoading } = useStorage({
    chainId: 8453,
    key: "my-key",
    operatorAddress: "0x...",
  });

  // For large files with XML
  const { data: xmlData, isXml } = useXmlStorage({
    chainId: 8453,
    key: "large-file",
    operatorAddress: "0x...",
  });
}
```

## Netr SDK (@net-protocol/netr)

### Token Deployment

```typescript
import { NetrClient, DEFAULT_TOTAL_SUPPLY } from "@net-protocol/netr";

const client = new NetrClient({ chainId: 8453 });

// Generate salt and predict token address
const saltResult = await client.generateSalt({
  name: "My Token",
  symbol: "MTK",
  image: "https://example.com/image.png",
  deployer: "0xYourAddress",
});

console.log(`Predicted address: ${saltResult.predictedAddress}`);

// Build deploy transaction
const txConfig = client.buildDeployConfig(
  {
    name: "My Token",
    symbol: "MTK",
    image: "https://example.com/image.png",
    deployer: "0xYourAddress",
    // Optional NFT drop settings
    mintPrice: 0n,
    mintEndTimestamp: 0n,
    maxMintSupply: 0n,
  },
  saltResult.salt
);

// Execute with wagmi or viem wallet client
```

### Deploy with Initial Buy

```typescript
const txConfig = client.buildDeployConfig(
  {
    name: "My Token",
    symbol: "MTK",
    image: "https://example.com/image.png",
    deployer: "0xYourAddress",
    initialBuy: BigInt("1000000000000000"), // 0.001 ETH in wei
  },
  saltResult.salt
);

// txConfig.value will be set to the initialBuy amount
```

### Chain Configuration

```typescript
import {
  getInitialTick,
  getMintPrice,
  getNetrSupportedChainIds,
  isNetrSupportedChain,
} from "@net-protocol/netr";

// Check if chain supports token deployment
if (isNetrSupportedChain(chainId)) {
  const tick = getInitialTick(chainId);   // Chain-specific initial tick
  const price = getMintPrice(chainId);     // Chain-specific mint price
}

// Get all supported chain IDs
const chainIds = getNetrSupportedChainIds(); // [8453, 9745, 143, 999]
```

### Token Information

```typescript
const client = new NetrClient({ chainId: 8453 });

// Get token metadata
const token = await client.getToken("0xTokenAddress");
console.log(token?.name, token?.symbol, token?.image);

// Get price
const price = await client.getPrice("0xTokenAddress");
console.log(`Price: ${price?.priceInEth} ETH`);

// Get pool and locker addresses
const storage = await client.getStorageData("0xTokenAddress");
console.log(`Pool: ${storage?.poolAddress}`);
console.log(`Locker: ${storage?.lockerAddress}`);
```

### React Hooks

```typescript
import { useNetrToken, useNetrPrice } from "@net-protocol/netr";

function TokenInfo({ tokenAddress }) {
  const { data: token } = useNetrToken({
    chainId: 8453,
    tokenAddress,
  });

  const { data: price } = useNetrPrice({
    chainId: 8453,
    tokenAddress,
    refreshInterval: 5000,
  });

  return (
    <div>
      <h1>{token?.name} ({token?.symbol})</h1>
      <p>Price: {price?.priceInEth} ETH</p>
    </div>
  );
}
```

## Chain Configuration

```typescript
import { getPublicClient, getChainRpcUrls } from "@net-protocol/core";

// Get viem public client
const client = getPublicClient({
  chainId: 8453,
  rpcUrl: "https://custom-rpc.com", // optional
});

// Get RPC URLs for a chain
const rpcUrls = getChainRpcUrls({ chainId: 8453 });
```

## Custom RPC Configuration

```typescript
import { setChainRpcOverrides, NetClient } from "@net-protocol/core";

// Global override (affects all clients)
setChainRpcOverrides({
  8453: ["https://custom-base-rpc.com"],
});

// Per-client override
const client = new NetClient({
  chainId: 8453,
  overrides: { rpcUrls: ["https://client-specific-rpc.com"] },
});
```

## Transaction Execution

```typescript
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount("0x...");
const walletClient = createWalletClient({
  account,
  transport: http("https://mainnet.base.org"),
});

// Execute a prepared transaction
const hash = await walletClient.writeContract({
  address: txConfig.to,
  abi: txConfig.abi,
  functionName: txConfig.functionName,
  args: txConfig.args,
  chain: null,
});
```

## Error Handling

```typescript
try {
  const data = await client.readStorageData({ key, operator });
} catch (error) {
  if (error.message === "StoredDataNotFound") {
    console.log("Key not found");
  }
}
```

## Utilities

```typescript
import { getStorageKeyBytes, chunkDataForStorage } from "@net-protocol/storage";
import { addressToBytes32 } from "@net-protocol/netr";

// Convert string key to bytes32
const keyBytes = getStorageKeyBytes("my-key");

// Chunk large data for storage
const chunks = chunkDataForStorage(largeString);

// Convert address to bytes32 (for token storage lookups)
const storageKey = addressToBytes32("0xTokenAddress");
```
