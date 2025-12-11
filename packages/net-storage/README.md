# @net-protocol/storage

Net Storage SDK for key-value storage on the Net protocol. Supports regular storage, chunked storage, and XML storage patterns.

## Installation

```bash
npm install @net-protocol/storage
# or
yarn add @net-protocol/storage
```

## Dependencies

- `@net-protocol/core` - Core Net protocol SDK
- `viem` - Ethereum library
- `pako` - Compression library (for chunked storage)
- `wagmi` (peer dependency) - Required for React hooks only
- `react` (peer dependency) - Required for React hooks only

## Usage

### React Hooks

```typescript
import { useStorage, useXmlStorage, useStorageFromRouter } from "@net-protocol/storage";

// Basic storage read
function MyComponent() {
  const { data, isLoading, error } = useStorage({
    chainId: 8453,
    key: "my-key",
    operatorAddress: "0x...",
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  const [text, data] = data || [];
  return <div>{text}</div>;
}

// XML storage with recursive resolution
function XmlComponent() {
  const { data, isLoading, isXml } = useXmlStorage({
    chainId: 8453,
    key: "my-xml-key",
    operatorAddress: "0x...",
  });

  return <div>{data}</div>;
}

// Storage from router (handles chunked storage)
function StorageComponent() {
  const { data, isLoading } = useStorageFromRouter({
    chainId: 8453,
    storageKey: "0x...",
    operatorAddress: "0x...",
  });

  return <div>{data?.[1]}</div>;
}
```

### StorageClient (Non-React)

```typescript
import { StorageClient } from "@net-protocol/storage";

// Create client
const client = new StorageClient({
  chainId: 8453,
  overrides: { rpcUrls: ["https://custom-rpc.com"] }, // Optional
});

// Get storage value
const data = await client.get({
  key: "my-key",
  operator: "0x...",
});

// Get historical version
const historical = await client.getValueAtIndex({
  key: "my-key",
  operator: "0x...",
  index: 0, // 0-based index
});

// Get via StorageRouter (handles chunked storage)
const routerData = await client.getViaRouter({
  key: "my-key",
  operator: "0x...",
});

// Read with XML resolution
const xmlData = await client.readStorageData({
  key: "my-xml-key",
  operator: "0x...",
});
```

### Utilities

```typescript
import {
  getStorageKeyBytes,
  chunkDataForStorage,
  assembleChunks,
  parseNetReferences,
  processDataForStorage,
} from "@net-protocol/storage";

// Generate storage key bytes
const keyBytes = getStorageKeyBytes("my-key");

// Chunk data for storage
const chunks = chunkDataForStorage("large data string");

// Assemble chunks
const assembled = assembleChunks(chunks);

// Parse XML references
const references = parseNetReferences("<net k=\"hash\" v=\"0.0.1\" />");

// Process data for XML storage
const result = processDataForStorage(data, operatorAddress);
```

## API Reference

### React Hooks

- `useStorage` - Read storage value (latest or historical)
- `useStorageForOperator` - Get all storage keys for an operator
- `useStorageForOperatorAndKey` - Get storage value by operator and key
- `useBulkStorage` - Bulk read storage values
- `useStorageTotalWrites` - Get total number of versions
- `useXmlStorage` - Read XML storage with recursive resolution
- `useStorageFromRouter` - Read from StorageRouter (handles chunked storage)
- `useStorageFromRouterWithXml` - Same as above with XML resolution

### StorageClient Methods

- `get(params)` - Get storage value (latest)
- `getValueAtIndex(params)` - Get storage value at historical index
- `getTotalWrites(params)` - Get total number of versions
- `bulkGet(params)` - Bulk read storage values
- `getViaRouter(params)` - Get via StorageRouter (handles chunked storage)
- `getChunkedMetadata(params)` - Get chunked storage metadata
- `getChunked(params)` - Get chunked storage chunks
- `getForOperator(params)` - Get all keys for operator
- `getForOperatorAndKey(params)` - Get storage by operator and key
- `readStorageData(params)` - Read with XML resolution
- `readChunkedStorage(params)` - Read chunked storage with decompression

## Storage Types

### Regular Storage

Simple key-value storage using `Storage.sol`. Values are stored directly on-chain.

### Chunked Storage

Large data storage using `ChunkedStorage.sol`. Data is compressed (gzip) and split into 20KB chunks.

### XML Storage

Hierarchical storage using XML references. Supports recursive resolution and operator inheritance.

## License

MIT

