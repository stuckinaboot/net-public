# @net-protocol/storage

**Status: Alpha** - Usable but may have breaking changes over time. Suitable for early adopters and testing.

Net Storage SDK for permanent onchain key-value storage built on Net Protocol.

## What is Net Storage?

Net Storage provides permanent, versioned key-value storage on the blockchain. Every write creates a new version, preserving complete history. Unlike traditional databases, Storage data is:

- **Immutable**: Once stored, data cannot be modified
- **Versioned**: Complete history of all changes preserved
- **Transparent**: All data is publicly verifiable
- **Decentralized**: No central servers or databases

## Storage Types

Net Storage supports three storage patterns for different file sizes:

### Regular Storage

**Best for**: Small data (≤ 20KB)  
**How it works**: Stores data directly as Net messages  
**Use cases**: User settings, configuration, small metadata

### Chunked Storage

**Best for**: Medium files (20KB-80KB)  
**How it works**: Compresses data (gzip) and splits into 20KB chunks  
**Use cases**: Images, documents, medium-sized data  
**Note**: ChunkedStorage is typically used internally by XML Storage. For direct usage, see `StorageClient.prepareChunkedPut()`.

### XML Storage

**Best for**: Large files (> 20KB) or files containing XML references
**How it works**: Splits large files into 80KB pieces (configurable via `chunkSize`), stores each using ChunkedStorage (compressed and chunked into 20KB pieces), maintains references as XML metadata
**Use cases**: Videos, large images, datasets, any large file

## What can you do with this package?

- **Store data permanently**: Write key-value pairs that persist forever on the blockchain
- **Access version history**: Read any historical version of stored data
- **Store files of any size**: From small settings to multi-MB files
- **Build storage apps**: Create applications that need permanent, verifiable data storage

This package provides both React hooks (for UI) and client classes (for non-React code).

## Learn More

- [Net Storage Documentation](https://docs.netprotocol.app/docs/apps/storage/01-overview) - Complete storage documentation
- [Storage Developer Guide](https://docs.netprotocol.app/docs/apps/storage/03-developer-guide) - Technical implementation details
- [Net Protocol Documentation](https://docs.netprotocol.app) - Core protocol documentation

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
import {
  useStorage,
  useXmlStorage,
  useStorageFromRouter,
} from "@net-protocol/storage";

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

// Storage with output format options
function StorageWithFormat() {
  // Get data as plain string (default is hex)
  const { data: stringData } = useStorage({
    chainId: 8453,
    key: "my-key",
    operatorAddress: "0x...",
    outputFormat: "string", // Returns plain string instead of hex
  });

  // Use StorageRouter for automatic detection (latest version only)
  const { data: routerData } = useStorage({
    chainId: 8453,
    key: "my-key",
    operatorAddress: "0x...",
    useRouter: true, // Automatically detects regular vs chunked storage
    outputFormat: "string",
  });

  // Get historical version
  const { data: historicalData } = useStorage({
    chainId: 8453,
    key: "my-key",
    operatorAddress: "0x...",
    index: 0, // 0-based index for historical versions
    outputFormat: "string",
  });
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

// XML storage with format options
function XmlWithFormats() {
  // Return as tuple format with hex output
  const { data: tupleData } = useXmlStorage({
    chainId: 8453,
    key: "my-xml-key",
    operatorAddress: "0x...",
    returnFormat: "tuple", // Returns [text, data] tuple
    outputFormat: "hex", // Data is hex string (default)
    useRouter: true, // Use StorageRouter for automatic detection
  });

  // Return as tuple format with string output
  const { data: tupleStringData } = useXmlStorage({
    chainId: 8453,
    key: "my-xml-key",
    operatorAddress: "0x...",
    returnFormat: "tuple",
    outputFormat: "string", // Data is plain string
  });

  // Return as object format (default)
  const {
    data: objectData,
    filename,
    isXml,
  } = useXmlStorage({
    chainId: 8453,
    key: "my-xml-key",
    operatorAddress: "0x...",
    returnFormat: "object", // Returns { data, filename, isLoading, error, isXml }
  });
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
  fileToDataUri,
  detectFileTypeFromBase64,
  base64ToDataUri,
  OPTIMAL_CHUNK_SIZE,
} from "@net-protocol/storage";

// Generate storage key bytes
const keyBytes = getStorageKeyBytes("my-key");

// Chunk data for storage
const chunks = chunkDataForStorage("large data string");

// Assemble chunks
const assembled = assembleChunks(chunks);

// Parse XML references
const references = parseNetReferences('<net k="hash" v="0.0.1" />');

// Process data for XML storage (default 80KB chunk size)
const result = processDataForStorage(data, operatorAddress, storageKey);

// Process with custom chunk size (40KB)
const result2 = processDataForStorage(data, operatorAddress, storageKey, 40000);
```

### File Utilities

```typescript
import {
  fileToDataUri,
  detectFileTypeFromBase64,
  base64ToDataUri,
} from "@net-protocol/storage";

// Convert File/Blob to data URI (browser-only)
// Note: fileToDataUri requires browser APIs (FileReader) and should only be used in browser environments
const file = event.target.files[0];
const dataUri = await fileToDataUri(file);
// Returns: "data:application/pdf;base64,JVBERi0xLjQK..."

// Detect file type from raw base64 data (works in both browser and Node.js)
const base64Data = "JVBERi0xLjQK..."; // Raw base64 without prefix
const mimeType = detectFileTypeFromBase64(base64Data);
// Returns: "application/pdf"

// Convert raw base64 to data URI with automatic type detection (works in both browser and Node.js)
const dataUri = base64ToDataUri(base64Data);
// Returns: "data:application/pdf;base64,JVBERi0xLjQK..."
// Falls back to "application/octet-stream" if type cannot be detected
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
- `prepareXmlStorage(params)` - Prepare XML storage transactions (supports optional `chunkSize`)

### Constants

- `OPTIMAL_CHUNK_SIZE` - Default chunk size for XML storage (80000 bytes)

## Storage Types

### Regular Storage

Simple key-value storage using `Storage.sol`. Values are stored directly on-chain.

### Chunked Storage

Large data storage using `ChunkedStorage.sol`. Data is compressed (gzip) and split into 20KB chunks.

### XML Storage

Hierarchical storage using XML references. Supports recursive resolution and operator inheritance.

## License

MIT
