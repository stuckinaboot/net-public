# Net Protocol Example App

A clean, educational example application demonstrating how to build on Net Protocol using the `@net-protocol/core` and `@net-protocol/storage` SDKs.

## What This Example Demonstrates

This app shows you how to:

- **Read messages** from the blockchain using `useNetMessages` and `useNetMessageCount`
- **Send messages** to the blockchain using Net Protocol's `sendMessage` function
- **Store data** permanently on-chain using the Storage contract
- **List stored content** for a wallet address with `useStorageForOperator`
- **Read stored data** with automatic storage type detection using `useStorage`
- **Connect wallets** and manage blockchain interactions with wagmi + RainbowKit

## Features

### Chat Tab
- Select from predefined topics (general, announcements, dev-chat, support)
- View the most recent 20 messages for each topic
- Send messages that are stored permanently on the blockchain
- Messages are indexed by topic and can be queried by anyone

### Storage Tab
- Upload text/data with a custom key (filename)
- View all your stored content
- Click any item to view its full content
- All data is stored permanently and immutably on-chain

## Prerequisites

- Node.js 18+ and npm/yarn
- A Web3 wallet (MetaMask, Coinbase Wallet, etc.)
- Some ETH on Base for gas fees

## Installation & Setup

1. **Navigate to the example directory:**
   ```bash
   cd examples/basic-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure WalletConnect (Optional):**
   
   Open `src/providers/Providers.tsx` and replace `YOUR_PROJECT_ID` with your WalletConnect Project ID.
   
   Get a free Project ID at [https://cloud.walletconnect.com](https://cloud.walletconnect.com)

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open in browser:**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Important: Next.js Webpack Configuration

**⚠️ Required Configuration**

When using `@net-protocol/core` with Next.js, you **must** configure webpack to ensure `wagmi`, `react`, and `react-dom` resolve to single instances. This prevents React Context issues where hooks from `@net-protocol/core` can't access the WagmiProvider context.

This configuration is already set up in [`next.config.js`](next.config.js) via webpack aliases:

```javascript
webpack: (config, { isServer }) => {
  // ... other config ...
  
  // Ensure wagmi and React resolve to single instances
  const path = require('path');
  const appNodeModules = path.join(__dirname, 'node_modules');
  
  const wagmiPath = require.resolve('wagmi', { paths: [appNodeModules] });
  const reactPath = require.resolve('react', { paths: [appNodeModules] });
  const reactDomPath = require.resolve('react-dom', { paths: [appNodeModules] });
  
  config.resolve.alias = {
    ...config.resolve.alias,
    'wagmi$': wagmiPath,      // Single wagmi instance
    'react$': reactPath,      // Single React instance
    'react-dom$': reactDomPath, // Single React DOM instance
  };
  
  return config;
}
```

**Why is this needed?**

When Next.js transpiles `@net-protocol/core` (via `transpilePackages`), webpack can create separate module instances for `wagmi` and React. Since React Context requires the same React instance, hooks in `@net-protocol/core` that use `wagmi` hooks won't be able to access the WagmiProvider context from your app's `wagmi` instance.

The `$` anchor ensures only exact module imports are aliased (not subpaths like `wagmi/chains`).

**If you're building your own app:**

Copy the webpack configuration from [`next.config.js`](next.config.js) to ensure proper module resolution.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Main page with tab switcher
│   └── globals.css         # Global styles
├── components/
│   ├── layout/
│   │   ├── Header.tsx      # App header with wallet connection
│   │   └── TabLayout.tsx   # Tab navigation
│   ├── chat/
│   │   ├── ChatTab.tsx     # Main chat container
│   │   ├── TopicSelector.tsx
│   │   ├── MessageList.tsx
│   │   └── SendMessage.tsx
│   └── storage/
│       ├── StorageTab.tsx   # Main storage container
│       ├── UploadForm.tsx
│       ├── ContentList.tsx
│       └── ContentView.tsx
├── hooks/
│   └── useWalletRequirement.ts
├── lib/
│   ├── constants.ts        # Chain configs, topics
│   └── utils.ts            # Helper functions
└── providers/
    └── Providers.tsx       # Wagmi, RainbowKit, NetProvider
```

## Key Concepts

### 1. NULL_ADDRESS for Topic-Based Messaging

Net Protocol supports two types of messaging:
- **App-based**: Messages sent via a smart contract app
- **Topic-based**: Global messages organized by topic

This example uses topic-based messaging with `NULL_ADDRESS`:

```typescript
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

useNetMessages({
  chainId: 8453,
  filter: {
    appAddress: NULL_ADDRESS, // Use NULL_ADDRESS for topic-based
    topic: "general"
  }
});
```

### 2. Storage Key Conversion

Storage keys must be in `bytes32` format. The SDK handles conversion:

```typescript
import { getStorageKeyBytes } from "@net-protocol/storage";

// Short strings (≤32 bytes): Converted to bytes32
const key1 = getStorageKeyBytes("my-data");

// Long strings (>32 bytes): Hashed to bytes32
const key2 = getStorageKeyBytes("this-is-a-very-long-key-that-exceeds-32-bytes");
```

### 3. Storage Router for Automatic Type Detection

Net Storage supports multiple storage types based on data size:
- **Regular Storage**: < 20KB
- **Chunked Storage**: 20KB - 80KB (compressed)
- **XML Storage**: Multi-MB (via references)

Use `useRouter: true` to automatically detect the storage type:

```typescript
useStorage({
  chainId: 8453,
  key: "my-key",
  operatorAddress: "0x...",
  useRouter: true, // Automatically detects storage type
  outputFormat: "string" // Get readable text instead of hex
});
```

### 4. Transaction Handling Pattern

Both chat and storage features use wagmi's transaction hooks:

```typescript
const { writeContract, data: hash, isPending } = useWriteContract();
const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

// Track states: idle → pending → confirming → success
```

## Code Walkthrough

### Reading Messages

[`src/components/chat/MessageList.tsx`](src/components/chat/MessageList.tsx)

```typescript
// 1. Get total message count
const { count: totalCount } = useNetMessageCount({
  chainId: 8453,
  filter: { appAddress: NULL_ADDRESS, topic: "general" }
});

// 2. Calculate range for last 20 messages
const endIndex = totalCount || 0;
const startIndex = Math.max(0, endIndex - 20);

// 3. Fetch messages in range
const { messages } = useNetMessages({
  chainId: 8453,
  filter: { appAddress: NULL_ADDRESS, topic: "general" },
  startIndex,
  endIndex
});
```

### Sending Messages

[`src/components/chat/SendMessage.tsx`](src/components/chat/SendMessage.tsx)

```typescript
writeContract({
  address: NET_CONTRACT_ADDRESS,
  abi: NET_CONTRACT_ABI,
  functionName: "sendMessage",
  args: [
    message,  // The message text
    topic,    // The conversation topic
    "0x"      // Optional data (empty in this example)
  ]
});
```

### Storing Data

[`src/components/storage/UploadForm.tsx`](src/components/storage/UploadForm.tsx)

```typescript
import { STORAGE_CONTRACT, getStorageKeyBytes } from "@net-protocol/storage";
import { stringToHex } from "viem";

writeContract({
  address: STORAGE_CONTRACT.address,
  abi: STORAGE_CONTRACT.abi,
  functionName: "put",
  args: [
    getStorageKeyBytes(keyInput),       // bytes32 key
    keyInput,                           // string text (description)
    stringToHex(valueInput)             // bytes value (hex)
  ]
});
```

### Listing Storage

[`src/components/storage/ContentList.tsx`](src/components/storage/ContentList.tsx)

```typescript
// Get all storage entries for a wallet
const { data } = useStorageForOperator({
  chainId: 8453,
  operatorAddress: "0x..."
});

// Returns: [[key, value, timestamp, data], ...]
```

## Dependencies

This example uses:

- **[@net-protocol/core](https://www.npmjs.com/package/@net-protocol/core)** - Core messaging SDK
- **[@net-protocol/storage](https://www.npmjs.com/package/@net-protocol/storage)** - Storage SDK
- **[wagmi](https://wagmi.sh)** - React hooks for Ethereum
- **[@rainbow-me/rainbowkit](https://www.rainbowkit.com)** - Wallet connection UI
- **[Next.js 14](https://nextjs.org)** - React framework
- **[Tailwind CSS](https://tailwindcss.com)** - Styling

## Next Steps

Once you understand this example, try:

1. **Add more topics** - Extend `CHAT_TOPICS` in [`src/lib/constants.ts`](src/lib/constants.ts)
2. **Filter messages by sender** - Add `userAddress` to the filter
3. **Store files** - Extend `UploadForm` to handle file uploads
4. **Add message reactions** - Use Storage to store user reactions
5. **Build an app contract** - Create a smart contract that calls `sendMessageViaApp`
6. **Show version history** - Use `index` parameter in `useStorage` to show historical versions
7. **Support multiple chains** - Add chain selector and update `CHAIN_ID`

## Resources

- [Net Protocol Documentation](https://docs.netprotocol.app)
- [Net Protocol Website](https://netprotocol.app)
- [@net-protocol/core README](../../packages/net-core/README.md)
- [@net-protocol/storage README](../../packages/net-storage/README.md)
- [Wagmi Documentation](https://wagmi.sh)
- [RainbowKit Documentation](https://www.rainbowkit.com)

## Troubleshooting

### "No messages yet"
- Make sure you're connected to Base network (Chain ID: 8453)
- Try switching to a different topic - some topics may not have messages yet

### "Failed to store data"
- Ensure you have enough ETH on Base for gas fees
- Check that your wallet is connected
- Data must be under 20KB for simple storage (use chunked/XML storage for larger data)

### Wallet not connecting
- Make sure you have a Web3 wallet installed
- Check that you're on a supported network
- Try refreshing the page

### "WagmiProviderNotFoundError: useConfig must be used within WagmiProvider"
- **This means the webpack aliases aren't configured correctly**
- Ensure `next.config.js` includes the webpack alias configuration (see "Important: Next.js Webpack Configuration" above)
- Restart your dev server after modifying `next.config.js`
- Verify that `wagmi`, `react`, and `react-dom` are aliased to single instances

## License

MIT

