# Net Protocol Contract Addresses

## Core Contracts (Same on All Chains)

| Contract | Address |
|----------|---------|
| Net | `0x00000000B24D62781dB359b07880a105cD0b64e6` |
| Storage | `0x00000000db40fcb9f4466330982372e27fd7bbf5` |
| ChunkedStorage | `0x000000009a84938a4e3eb31625d916cf202a51e5` |
| StorageRouter | `0x00000000e5c70c57Cba6F48ce72151ae7Cc31B18` |

## Infrastructure (Base)

| Contract | Address |
|----------|---------|
| WETH | `0x4200000000000000000000000000000000000006` |
| UniswapV3Factory | `0x33128a8fC17869897dcE68Ed026d694621f6FDfD` |
| PositionManager | `0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1` |
| SwapRouter | `0x2626664c2603336E57B271c5C0b26F421741e481` |
| LiquidityLocker | `0x00000000a4944d1E707f869356fF4B48e527370f` |

## Netr/Banger Token Factory

| Chain | Chain ID | Banger Address |
|-------|----------|----------------|
| Base | 8453 | `0x000000C91A20BE8342B6D4dfc0947f1Ec5333BF6` |
| Plasma | 9745 | `0x00000000CDaB5161815cD4005fAc11AC3a796F63` |
| Monad | 143 | `0x00000000CDaB5161815cD4005fAc11AC3a796F63` |
| HyperEVM | 999 | `0x000000C91A20BE8342B6D4dfc0947f1Ec5333BF6` |

## Supported Chains

| Chain | Chain ID | Type |
|-------|----------|------|
| Base | 8453 | Mainnet |
| Ethereum | 1 | Mainnet |
| Degen | 666666666 | Mainnet |
| Ham | 5112 | Mainnet |
| Ink | 57073 | Mainnet |
| Unichain | 130 | Mainnet |
| HyperEVM | 999 | Mainnet |
| Plasma | 9745 | Mainnet |
| Monad | 143 | Mainnet |
| Base Sepolia | 84532 | Testnet |
| Sepolia | 11155111 | Testnet |

## Net Contract ABI (Key Functions)

### Reading Messages

```solidity
// Get single message
function getMessage(uint256 index) external view returns (Message memory)

// Get messages in range
function getMessagesInRange(uint256 startIdx, uint256 endIdx) external view returns (Message[] memory)

// Get messages with filter
function getMessagesInRangeForApp(uint256 startIdx, uint256 endIdx, address app) external view returns (Message[] memory)
function getMessagesInRangeForAppUser(uint256 startIdx, uint256 endIdx, address app, address user) external view returns (Message[] memory)
function getMessagesInRangeForAppTopic(uint256 startIdx, uint256 endIdx, address app, bytes32 topic) external view returns (Message[] memory)
function getMessagesInRangeForAppUserTopic(uint256 startIdx, uint256 endIdx, address app, address user, bytes32 topic) external view returns (Message[] memory)

// Get counts
function getTotalMessagesCount() external view returns (uint256)
function getTotalMessagesForAppCount(address app) external view returns (uint256)
function getTotalMessagesForAppUserCount(address app, address user) external view returns (uint256)
function getTotalMessagesForAppTopicCount(address app, bytes32 topic) external view returns (uint256)
function getTotalMessagesForAppUserTopicCount(address app, address user, bytes32 topic) external view returns (uint256)
```

### Message Structure

```solidity
struct Message {
    address app;      // App contract address
    address sender;   // Message sender
    bytes32 topic;    // Topic (bytes32)
    uint48 timestamp; // Block timestamp
    string text;      // Message text
    bytes data;       // Additional data
}
```

## Storage Contract ABI (Key Functions)

```solidity
// Write
function put(bytes32 key, string calldata text, bytes calldata value) external

// Read
function get(bytes32 key, address operator) external view returns (string memory text, bytes memory value)
function getValueAtIndex(bytes32 key, address operator, uint256 index) external view returns (string memory text, bytes memory value)
function getTotalWrites(bytes32 key, address operator) external view returns (uint256)

// Bulk operations
function bulkPut(StorageEntry[] calldata entries) external
function bulkGet(BulkKey[] calldata keys, bool safe) external view returns (StorageResult[] memory)
```

## ChunkedStorage Contract ABI

```solidity
// Write chunks
function put(bytes32 key, string calldata text, bytes[] calldata chunks) external

// Read chunks
function getMetadata(bytes32 key, address operator) external view returns (uint8 chunkCount, string memory originalText)
function getChunks(bytes32 key, address operator, uint8 start, uint8 end) external view returns (bytes[] memory)
function getMetadataAtIndex(bytes32 key, address operator, uint256 index) external view returns (uint8 chunkCount, string memory originalText)
function getChunksAtIndex(bytes32 key, address operator, uint256 index, uint8 start, uint8 end) external view returns (bytes[] memory)
```

## StorageRouter Contract ABI

```solidity
// Automatically detects regular vs chunked storage
function get(bytes32 key, address operator) external view returns (bool isChunkedStorage, string memory text, bytes memory data)
```

## Banger/Netr Token ABI (Key Functions)

### Deployment

```solidity
function generateSalt(
    address deployer,
    uint256 fid,
    string calldata name,
    string calldata symbol,
    string calldata image,
    string calldata animation,
    address metadataAddress,
    string calldata extraStringData,
    uint256 totalSupply
) external view returns (bytes32 salt, address predictedAddress)

function deployToken(
    uint256 supply,
    int24 initialTick,
    bytes32 salt,
    address deployer,
    uint256 fid,
    uint256 mintPrice,
    uint256 mintEndTimestamp,
    uint256 maxMintSupply,
    string calldata name,
    string calldata symbol,
    string calldata image,
    string calldata animation,
    address metadataAddress,
    string calldata extraStringData
) external payable returns (address token, uint256 tokenId)
```

### Token Functions

```solidity
function name() external view returns (string memory)
function symbol() external view returns (string memory)
function totalSupply() external view returns (uint256)
function decimals() external view returns (uint8)
function deployer() external view returns (address)
function fid() external view returns (uint256)
function image() external view returns (string memory)
function animation() external view returns (string memory)
function extraStringData() external view returns (string memory)
```

## Default Values

| Parameter | Value |
|-----------|-------|
| Token Total Supply | 100,000,000,000,000,000,000,000,000 (100B with 18 decimals) |
| Pool Fee Tier | 10000 (1%) |
| Token Decimals | 18 |

### Initial Ticks by Chain

| Chain | Initial Tick | Approx Market Cap |
|-------|--------------|-------------------|
| Base (8453) | -230400 | ~$35k |
| HyperEVM (999) | -177400 | - |
| Plasma (9745) | -147200 | - |
| Monad (143) | -115000 | - |
