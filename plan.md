# Plan: Add User Upvoting to `@net-protocol/score`

## Decision: Add to `net-score` (not `net-profiles`)

User upvoting lives alongside token upvoting in `packages/net-score/`. Both are upvote systems and consumers already depend on `@net-protocol/score`. No new package needed — just new files within the existing package.

## Files to Create

### 1. `src/abis/user-upvote.json`
- The full ABI for the user upvote contract at `0xa4bc2c63dd0157692fd5f409389e5032e37d8895`
- JSON file, same pattern as existing `src/abis/score.json`, `src/abis/upvote-app.json`, etc.

### 2. `src/user-upvote/types.ts`
- `ParsedUserUpvoteMessage` — decoded message from the contract (upvotedUserString, actualToken, numUpvotes, tokenWethPrice, wethUsdcPrice, alphaWethPrice, userTokenBalance?)
- `TokenAddressExtraction` — { tokenAddresses: string[], validMessages: ParsedUserUpvoteMessage[] }
- `UserUpvote` — enriched upvote data (tokenAddress, numUpvotes, timestamp, priceInUsdc?, userTokenBalance, etc.)
- `UserUpvoteReceived` — received upvote data (upvoterAddress, tokenAddress, numUpvotes, timestamp, etc.)
- `UserUpvoteClientOptions` — constructor options for the client (chainId, overrides?)
- Hook option types: `UseUserUpvotesGivenOptions`, `UseUserUpvotesReceivedOptions`, `UseUserUpvotesGivenPerTokenBatchOptions`, `UseUserUpvotesReceivedPerTokenBatchOptions`

### 3. `src/user-upvote/userUpvoteUtils.ts`
Pure utility functions (no RPC calls):
- `parseUserUpvoteMessage(message, topic)` → `ParsedUserUpvoteMessage | null`
  - Uses viem `decodeAbiParameters` (not ethers)
  - Topic `"ub-{address}"` (received): decodes 7 fields
  - Topic `"g"` (given): decodes 6 fields
  - Returns null on decode errors
- `extractTokenAddressesFromMessages(messages, topic)` → `TokenAddressExtraction`
  - Calls parseUserUpvoteMessage on each, collects unique token addresses + valid messages
- `validateUserUpvoteMessage(message, topic)` → `boolean`
  - Wrapper that returns true if parseable
- `calculatePriceInUsdc(parsedMessage, tokenDecimals?)` → `number | undefined`
  - Pure math: `(tokenWethPrice / 10^(36-tokenDecimals)) * (wethUsdcPrice / 1e6)`
- `calculateUserTokenBalance(rawBalance, tokenDecimals?)` → `number`
  - Pure math: `Number(rawBalance) / 10^tokenDecimals`

### 4. `src/user-upvote/UserUpvoteClient.ts`
Client class following `ScoreClient` pattern:
- Constructor takes `{ chainId, overrides?: { contractAddress?, rpcUrls? } }`
- Creates a `PublicClient` via `getPublicClient()` from `@net-protocol/core`
- Stores `USER_UPVOTE_CONTRACT.address` (overridable)
- Methods (all async, all use `readContract` from `viem/actions`):
  - `getUserUpvotesGiven({ user })` → `Promise<bigint>`
  - `getUserUpvotesReceived({ user })` → `Promise<bigint>`
  - `getUserUpvotesGivenPerTokenBatch({ user, tokens })` → `Promise<bigint[]>`
  - `getUserUpvotesReceivedPerTokenBatch({ user, tokens })` → `Promise<bigint[]>`
  - `getTotalUpvotesPerToken({ token })` → `Promise<bigint>`
  - `getUserTokensInRange({ user, startIndex, endIndex })` → `Promise<{ token: Address; feeTier: number }[]>`
  - `getUserTokenCount({ user })` → `Promise<number>`
  - `isTokenInUserList({ user, token })` → `Promise<boolean>`

### 5. `src/hooks/useUserUpvotesGiven.ts`
- Uses `useReadContract` from wagmi to call `getUserUpvotesGiven(user)`
- Params: `{ chainId, userAddress, enabled? }`
- Returns: `{ upvotes: number, isLoading, error, refetch }`

### 6. `src/hooks/useUserUpvotesReceived.ts`
- Uses `useReadContract` from wagmi to call `getUserUpvotesReceived(user)`
- Params: `{ chainId, userAddress, enabled? }`
- Returns: `{ upvotes: number, isLoading, error, refetch }`

### 7. `src/hooks/useUserUpvotesGivenPerTokenBatch.ts`
- Uses `useReadContract` from wagmi to call `getUserUpvotesGivenPerTokenBatch(user, tokens)`
- Params: `{ chainId, userAddress, tokenAddresses, enabled? }`
- Returns: `{ upvoteCounts: number[], isLoading, error, refetch }`

### 8. `src/hooks/useUserUpvotesReceivedPerTokenBatch.ts`
- Uses `useReadContract` from wagmi to call `getUserUpvotesReceivedPerTokenBatch(user, tokens)`
- Params: `{ chainId, userAddress, tokenAddresses, enabled? }`
- Returns: `{ upvoteCounts: number[], isLoading, error, refetch }`

### 9. `src/__tests__/userUpvoteUtils.test.ts`
Tests for all pure utility functions:
- `parseUserUpvoteMessage` — test both 6-field (given) and 7-field (received) formats, test invalid data returns null
- `extractTokenAddressesFromMessages` — test deduplication, test mixed valid/invalid messages
- `validateUserUpvoteMessage` — test valid/invalid
- `calculatePriceInUsdc` — test with known values, test zero prices return undefined
- `calculateUserTokenBalance` — test various decimals (18, 6, 8)

### 10. `src/__tests__/UserUpvoteClient.test.ts`
Tests for the client class constructor and method signatures. Contract reads will be mocked via vitest.

## Files to Modify

### 11. `src/constants.ts`
Add at the end:
```typescript
import userUpvoteAbi from "./abis/user-upvote.json";

export const USER_UPVOTE_CONTRACT = {
  address: "0xa4bc2c63dd0157692fd5f409389e5032e37d8895" as Address,
  abi: userUpvoteAbi as Abi,
} as const;
```

### 12. `src/index.ts`
Add exports for:
- `UserUpvoteClient` class
- `USER_UPVOTE_CONTRACT` constant
- All user-upvote types (`ParsedUserUpvoteMessage`, `TokenAddressExtraction`, `UserUpvote`, `UserUpvoteReceived`, `UserUpvoteClientOptions`, hook option types)
- All pure utility functions (`parseUserUpvoteMessage`, `extractTokenAddressesFromMessages`, `validateUserUpvoteMessage`, `calculatePriceInUsdc`, `calculateUserTokenBalance`)

### 13. `src/react.ts`
Add exports for:
- `useUserUpvotesGiven`
- `useUserUpvotesReceived`
- `useUserUpvotesGivenPerTokenBatch`
- `useUserUpvotesReceivedPerTokenBatch`
- Re-export user-upvote hook option types

### 14. `src/types.ts`
Add the hook option types here (alongside existing `UseUpvotesOptions`, etc.):
- `UseUserUpvotesGivenOptions`
- `UseUserUpvotesReceivedOptions`
- `UseUserUpvotesGivenPerTokenBatchOptions`
- `UseUserUpvotesReceivedPerTokenBatchOptions`

## Files NOT Changed

- `tsup.config.ts` — no change (already builds `src/index.ts` + `src/react.ts`)
- `package.json` — no change (no new dependencies needed; viem + wagmi already there)
- `vitest.config.ts` — no change (test glob already covers `src/__tests__/**/*.test.ts`)
- `scripts/prepack-modify-deps.sh` — no change (net-score already in the map)

## Implementation Order

1. Create `src/abis/user-upvote.json` (the ABI)
2. Create `src/user-upvote/types.ts` (types)
3. Create `src/user-upvote/userUpvoteUtils.ts` (pure utils)
4. Create `src/user-upvote/UserUpvoteClient.ts` (client class)
5. Update `src/constants.ts` (add USER_UPVOTE_CONTRACT)
6. Update `src/index.ts` (add all exports)
7. Create 4 hook files in `src/hooks/`
8. Update `src/react.ts` (add hook exports)
9. Update `src/types.ts` (add hook option types)
10. Create `src/__tests__/userUpvoteUtils.test.ts`
11. Create `src/__tests__/UserUpvoteClient.test.ts`
12. Run `yarn test` in `packages/net-score` to verify
13. Run `yarn build` in `packages/net-score` to verify build
