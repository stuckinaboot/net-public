# Group Chat Feature — Exact Implementation Plan

## Phase 1: net-public (SDK + CLI)

### Step 1: Create `packages/net-chats` package

#### 1a. `packages/net-chats/package.json`
```json
{
  "name": "@net-protocol/chats",
  "version": "0.1.0",
  "description": "Group chat functionality for Net Protocol - topic-based chat streams",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "module": "./dist/index.mjs",
  "sideEffects": false,
  "typesVersions": {
    "*": {
      "react": ["./dist/react.d.ts"]
    }
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./react": {
      "types": "./dist/react.d.ts",
      "import": "./dist/react.mjs",
      "require": "./dist/react.js"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup",
    "build:watch": "tsup --watch",
    "clean": "rm -rf dist",
    "typecheck": "tsc --noEmit",
    "prepack": "../../scripts/prepack-modify-deps.sh",
    "prepublishOnly": "yarn build",
    "postpublish": "../../scripts/postpublish-restore-deps.sh",
    "test": "vitest --run",
    "test:watch": "vitest --watch"
  },
  "dependencies": {
    "@net-protocol/core": "file:../net-core",
    "viem": "^2.45.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "wagmi": "^2.15.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true },
    "wagmi": { "optional": true }
  },
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/stuckinaboot/net-public.git",
    "directory": "packages/net-chats"
  },
  "license": "MIT"
}
```

#### 1b. `packages/net-chats/tsconfig.json`
Copy from `net-feeds/tsconfig.json` exactly.

#### 1c. `packages/net-chats/tsup.config.ts`
```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/react.ts"],
  format: ["cjs", "esm"],
  dts: { compilerOptions: { composite: false } },
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "wagmi", "viem", "@net-protocol/core"],
  treeshake: true,
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".js" };
  },
});
```

#### 1d. `packages/net-chats/vitest.config.ts`
```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@net-protocol/core": path.resolve(__dirname, "../net-core/src"),
    },
  },
  test: {
    globals: true,
    include: ["src/__tests__/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});
```

#### 1e. `packages/net-chats/src/constants.ts`
```ts
export const CHAT_TOPIC_PREFIX = "chat-" as const;
```

#### 1f. `packages/net-chats/src/utils/chatUtils.ts`
```ts
import { CHAT_TOPIC_PREFIX } from "../constants";

export function normalizeChatTopic(topic: string): string {
  const trimmed = topic.trim();
  const lowercased = trimmed.toLowerCase();
  if (lowercased.startsWith(CHAT_TOPIC_PREFIX)) {
    return lowercased;
  }
  return `${CHAT_TOPIC_PREFIX}${lowercased}`;
}

export function isChatTopic(topic: string): boolean {
  return topic.toLowerCase().startsWith(CHAT_TOPIC_PREFIX);
}
```

#### 1g. `packages/net-chats/src/types.ts`
```ts
import type { NetMessage, WriteTransactionConfig } from "@net-protocol/core";

export type { NetMessage, WriteTransactionConfig };

export type ChatClientOptions = {
  chainId: number;
  overrides?: { rpcUrls: string[] };
};

export type GetChatMessagesOptions = {
  topic: string;
  maxMessages?: number;
};

export type SendChatMessageOptions = {
  topic: string;
  text: string;
  data?: string;
};

export type UseChatMessagesOptions = {
  chainId: number;
  topic: string;
  maxMessages?: number;
  enabled?: boolean;
};
```

#### 1h. `packages/net-chats/src/client/ChatClient.ts`
```ts
import { stringToHex } from "viem";
import { NetClient, NULL_ADDRESS, getPublicClient } from "@net-protocol/core";
import { normalizeChatTopic } from "../utils/chatUtils";
import type {
  ChatClientOptions,
  GetChatMessagesOptions,
  SendChatMessageOptions,
  NetMessage,
  WriteTransactionConfig,
} from "../types";

export class ChatClient {
  private netClient: NetClient;
  private chainId: number;

  constructor(params: ChatClientOptions) {
    this.chainId = params.chainId;
    this.netClient = new NetClient({
      chainId: params.chainId,
      overrides: params.overrides,
    });
  }

  async getChatMessages(params: GetChatMessagesOptions): Promise<NetMessage[]> {
    const normalizedTopic = normalizeChatTopic(params.topic);
    const count = await this.netClient.getMessageCount({
      filter: {
        appAddress: NULL_ADDRESS as `0x${string}`,
        topic: normalizedTopic,
      },
    });

    const maxMessages = params.maxMessages ?? 100;
    const startIndex =
      maxMessages === 0 ? count : count > maxMessages ? count - maxMessages : 0;

    return this.netClient.getMessages({
      filter: {
        appAddress: NULL_ADDRESS as `0x${string}`,
        topic: normalizedTopic,
      },
      startIndex,
      endIndex: count,
    });
  }

  async getChatMessageCount(topic: string): Promise<number> {
    const normalizedTopic = normalizeChatTopic(topic);
    return this.netClient.getMessageCount({
      filter: {
        appAddress: NULL_ADDRESS as `0x${string}`,
        topic: normalizedTopic,
      },
    });
  }

  prepareSendChatMessage(params: SendChatMessageOptions): WriteTransactionConfig {
    const normalizedTopic = normalizeChatTopic(params.topic);
    const data = params.data ? stringToHex(params.data) : undefined;
    return this.netClient.prepareSendMessage({
      text: params.text,
      topic: normalizedTopic,
      data,
    });
  }
}
```

#### 1i. `packages/net-chats/src/hooks/useChatMessages.ts`
```ts
import { useMemo } from "react";
import { useNetMessages, useNetMessageCount } from "@net-protocol/core/react";
import { NULL_ADDRESS } from "@net-protocol/core";
import { normalizeChatTopic } from "../utils/chatUtils";
import type { UseChatMessagesOptions } from "../types";

export function useChatMessages({
  chainId,
  topic,
  maxMessages = 100,
  enabled = true,
}: UseChatMessagesOptions) {
  const normalizedTopic = useMemo(() => normalizeChatTopic(topic), [topic]);

  const filter = useMemo(
    () => ({
      appAddress: NULL_ADDRESS as `0x${string}`,
      topic: normalizedTopic,
    }),
    [normalizedTopic]
  );

  const { count: totalCount, isLoading: isLoadingCount } = useNetMessageCount({
    chainId,
    filter,
    enabled,
  });

  const startIndex =
    maxMessages === 0
      ? totalCount
      : totalCount > maxMessages
      ? totalCount - maxMessages
      : 0;

  const { messages, isLoading: isLoadingMessages } = useNetMessages({
    chainId,
    filter,
    startIndex,
    endIndex: totalCount,
    enabled: enabled && totalCount > 0,
  });

  return {
    messages,
    totalCount,
    isLoading: isLoadingCount || isLoadingMessages,
  };
}
```

#### 1j. `packages/net-chats/src/index.ts`
```ts
export { ChatClient } from "./client/ChatClient";
export { normalizeChatTopic, isChatTopic } from "./utils/chatUtils";
export { CHAT_TOPIC_PREFIX } from "./constants";
export type {
  ChatClientOptions,
  GetChatMessagesOptions,
  SendChatMessageOptions,
  UseChatMessagesOptions,
  NetMessage,
  WriteTransactionConfig,
} from "./types";
```

#### 1k. `packages/net-chats/src/react.ts`
```ts
export { useChatMessages } from "./hooks/useChatMessages";
export type { UseChatMessagesOptions } from "./types";
```

#### 1l. `packages/net-chats/src/__tests__/chatUtils.test.ts`
Mirror `feedUtils.test.ts` exactly but with `chat-` prefix:
- `normalizeChatTopic("general")` → `"chat-general"`
- `normalizeChatTopic("chat-general")` → `"chat-general"` (idempotent)
- `normalizeChatTopic("CHAT-General")` → `"chat-general"` (case-insensitive, no double prefix)
- `isChatTopic("chat-general")` → `true`
- `isChatTopic("general")` → `false`
- Whitespace trimming, special characters, etc.

---

### Step 2: CLI commands in `net-cli`

#### 2a. `packages/net-cli/src/commands/chat/read.ts`
Mirrors `feed/read.ts` but simplified (no comments, no unseen/mark-seen):
- Takes `<chat> [--limit] [--chain-id] [--rpc-url] [--json]`
- Creates `ChatClient`, calls `getChatMessages`
- Formats with `formatMessage` / `messageToJson` from `../shared/output` (reuse existing formatters)
- Chat name normalized via `normalizeChatName` (just lowercase, same pattern as `normalizeFeedName`)

#### 2b. `packages/net-cli/src/commands/chat/send.ts`
Mirrors `feed/post.ts` but simplified (no `--body`, no `--data`, no history):
- Takes `<chat> <message> [--chain-id] [--rpc-url] [--private-key] [--encode-only]`
- Creates `ChatClient`, calls `prepareSendChatMessage`
- Executes transaction via `createWallet` + `executeTransaction`

#### 2c. `packages/net-cli/src/commands/chat/types.ts`
```ts
export function normalizeChatName(chat: string): string {
  return chat.toLowerCase();
}
```

#### 2d. `packages/net-cli/src/commands/chat/index.ts`
```ts
import { Command } from "commander";
import { registerChatReadCommand } from "./read";
import { registerChatSendCommand } from "./send";

export function registerChatCommand(program: Command): void {
  const chatCommand = program
    .command("chat")
    .description("Group chat operations (read/send messages)");
  registerChatReadCommand(chatCommand);
  registerChatSendCommand(chatCommand);
}

export { registerChatReadCommand } from "./read";
export { registerChatSendCommand } from "./send";
```

#### 2e. Edit `packages/net-cli/src/shared/client.ts`
Add:
```ts
import { ChatClient } from "@net-protocol/chats";

export function createChatClient(options: ReadOnlyOptions): ChatClient {
  return new ChatClient({
    chainId: options.chainId,
    overrides: options.rpcUrl ? { rpcUrls: [options.rpcUrl] } : undefined,
  });
}
```

#### 2f. Edit `packages/net-cli/tsup.config.ts`
Add to `entry`:
```ts
"chat/index": "src/commands/chat/index.ts",
```
Add `"@net-protocol/chats"` to `external` array.

#### 2g. Edit `packages/net-cli/package.json`
Add to `exports`:
```json
"./chat": {
  "types": "./dist/chat/index.d.ts",
  "import": "./dist/chat/index.mjs"
}
```
Add to `dependencies`:
```json
"@net-protocol/chats": "^0.1.0"
```

---

### Step 3: Register in botchan CLI

#### 3a. Edit `packages/botchan/src/cli/index.ts`
Add imports:
```ts
import {
  registerChatReadCommand,
  registerChatSendCommand,
} from "@net-protocol/cli/chat";
```
Add registrations after feed commands:
```ts
registerChatReadCommand(program, "chat-read");
registerChatSendCommand(program, "chat-send");
```
Wait — looking at the feed pattern, botchan registers feed commands as top-level (`registerFeedReadCommand(program)` which registers `read <feed>`). For chat, we want `chat read <name>` and `chat send <name> <message>` as a command group. So instead import `registerChatCommand` and register it:
```ts
import { registerChatCommand } from "@net-protocol/cli/chat";
registerChatCommand(program);
```
This gives `botchan chat read <name>` and `botchan chat send <name> <message>`.

#### 3b. Edit `packages/botchan/package.json`
Add to `dependencies`:
```json
"@net-protocol/chats": "file:../net-chats"
```

---

### Step 4: Update monorepo config

#### 4a. Edit `scripts/prepack-modify-deps.sh`
Add to `pkgDirMap`:
```js
'@net-protocol/chats': 'net-chats',
```

#### 4b. Edit `CLAUDE.md`
Add `net-chats` to repo structure, test commands table.

---

## Phase 2: Net website

### Step 5: Enhance `MessagesDisplay` with profile data

#### 5a. Edit `website/src/components/core/types.ts`
Add to `SanitizedOnchainMessageWithRenderContext`:
```ts
profilePicture?: string;
displayName?: string;
```

#### 5b. Edit `website/src/components/core/MessagesDisplay.tsx`
Add imports:
```ts
import { useBulkProfilePictures } from "./net-apps/profile/hooks/useBulkProfilePictures";
import { useBulkDisplayNames } from "./net-apps/profile/hooks/useBulkDisplayNames";
```

After `sanitizedOnchainMessages` memo, extract unique sender addresses:
```ts
const uniqueSenderAddresses = useMemo(() => {
  const set = new Set<string>();
  sanitizedOnchainMessages.forEach((m) => set.add(m.sender.toLowerCase()));
  return Array.from(set) as `0x${string}`[];
}, [sanitizedOnchainMessages]);
```

Call profile hooks:
```ts
const { profilePictureMap } = useBulkProfilePictures({
  chainId,
  addresses: uniqueSenderAddresses,
  enabled: uniqueSenderAddresses.length > 0,
});

const { displayNameMap } = useBulkDisplayNames({
  chainId,
  addresses: uniqueSenderAddresses,
  enabled: uniqueSenderAddresses.length > 0,
});
```

In the `useAsyncEffect` where `finalTransformedMessages` is built, add profile data:
```ts
const finalTransformedMessages = await Promise.all(
  finalMessages.map(async (message, msgIdx) => {
    // ... existing appName and messageTextNode logic ...
    return {
      ...message,
      appName,
      transformedMessage: messageTextNode,
      profilePicture: profilePictureMap.get(message.fullSender?.toLowerCase() ?? ""),
      displayName: displayNameMap.get(message.fullSender?.toLowerCase() ?? ""),
    };
  })
);
```

#### 5c. Edit `website/src/components/core/DefaultMessageRenderer.tsx`
Add imports:
```ts
import ProfilePicture from "./net-apps/profile/components/ProfilePicture";
```

Replace the sender display section (currently shows `message.senderEnsName || message.sender`) to also use profile picture and display name:
```tsx
<div className="flex items-center gap-2">
  {message.profilePicture && (
    <ProfilePicture
      imageUrl={message.profilePicture}
      address={message.fullSender || message.sender}
      size="sm"
    />
  )}
  {isProfileSupportedChain ? (
    <Link
      href={`/app/profile/${getOpenSeaChainString(props.chainId)}/${
        message.fullSender || message.sender
      }`}
      className="hover:underline text-blue-400"
    >
      {message.displayName || message.senderEnsName || message.sender}
    </Link>
  ) : (
    <>{message.displayName || message.senderEnsName || message.sender}</>
  )}
</div>
```

Also update `AppMessageRendererProps` type to include `profilePicture?: string` and `displayName?: string` if it's defined in `types.ts`.

---

### Step 6: New group chat route

#### 6a. Create `website/src/app/app/chat/[chainIdString]/[chatName]/page.tsx`
```tsx
"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import BasePageCard from "@/components/core/BasePageCard";
import Link from "next/link";
import { getChainByOpenSeaChainString } from "@/config/chains";
import { NULL_ADDRESS } from "@/app/constants";
import EmbeddableMessagesDisplay from "@/components/core/EmbeddableMessagesDisplay";

export default function GroupChatPage(
  props: { params: Promise<{ chainIdString: string; chatName: string }> }
) {
  const params = use(props.params);
  const chain = getChainByOpenSeaChainString(params.chainIdString);
  const chatTopic = `chat-${params.chatName.toLowerCase()}`;

  return (
    <BasePageCard
      coreUiConfig={{
        hideNavigationToolbar: true,
        hideConnectWallet: false,
        hideTitle: false,
      }}
      description={
        <div>
          <Link
            href={`/app/botchan/${params.chainIdString}?tab=chats`}
            className="text-green-400 hover:text-green-300 hover:underline text-sm mb-2 inline-block"
          >
            ← Chats
          </Link>
          <h1 className="text-xl capitalize">{params.chatName}</h1>
          <p className="text-gray-400 text-sm">Group chat</p>
        </div>
      }
      content={{
        node: (
          <EmbeddableMessagesDisplay
            onlyEnableForChainId={chain?.id}
            basePageCardUiConfig={{
              hideTitle: true,
              hideConnectWallet: true,
              hideNavigationToolbar: true,
              hideSearchButton: true,
              hideBookmarkButton: true,
            }}
            pageCardDescription={<></>}
            messageDisplayFilter={{
              appAddress: NULL_ADDRESS,
              topic: chatTopic,
            }}
          />
        ),
      }}
    />
  );
}
```

Existing `/app/chat/[chainIdString]/page.tsx` is left untouched.

---

### Step 7: Botchan hub "Chats" tab

#### 7a. Edit `website/src/app/app/botchan/[chainIdString]/page.tsx`

Add `"chats"` to `VALID_TABS`:
```ts
const VALID_TABS = ["home", "explore", "agents", "chats"] as const;
```

Add tab trigger:
```tsx
<TabsTrigger value="chats" className="flex-1 data-[state=inactive]:text-gray-300 text-sm">
  Chats
</TabsTrigger>
```

Add tab content:
```tsx
<TabsContent value="chats" className="mt-4">
  <ChatsTab chainIdString={params.chainIdString} />
</TabsContent>
```

#### 7b. Create `website/src/components/core/net-apps/content-feed/ChatsTab.tsx`
Simple component with a text input and "Join" button. On submit, navigates to `/app/chat/[chainIdString]/[chatName]`.

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChatsTab({ chainIdString }: { chainIdString: string }) {
  const router = useRouter();
  const [chatName, setChatName] = useState("");

  const handleJoin = () => {
    const name = chatName.trim().toLowerCase();
    if (name) {
      router.push(`/app/chat/${chainIdString}/${name}`);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">
        Enter a chat name to join a group conversation.
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="e.g. general, crypto, agents..."
          value={chatName}
          onChange={(e) => setChatName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          className="flex-1"
        />
        <Button onClick={handleJoin} disabled={!chatName.trim()}>
          Join Chat
        </Button>
      </div>
    </div>
  );
}
```

---

## File Change Summary

### New files (net-public)
| File | Description |
|------|-------------|
| `packages/net-chats/package.json` | Package config |
| `packages/net-chats/tsconfig.json` | TypeScript config |
| `packages/net-chats/tsup.config.ts` | Build config |
| `packages/net-chats/vitest.config.ts` | Test config |
| `packages/net-chats/src/index.ts` | Main exports |
| `packages/net-chats/src/react.ts` | React hook exports |
| `packages/net-chats/src/constants.ts` | `CHAT_TOPIC_PREFIX` |
| `packages/net-chats/src/types.ts` | Type definitions |
| `packages/net-chats/src/client/ChatClient.ts` | Client class |
| `packages/net-chats/src/hooks/useChatMessages.ts` | React hook |
| `packages/net-chats/src/utils/chatUtils.ts` | Topic normalization |
| `packages/net-chats/src/__tests__/chatUtils.test.ts` | Unit tests |
| `packages/net-cli/src/commands/chat/index.ts` | Chat command group |
| `packages/net-cli/src/commands/chat/read.ts` | `chat read` command |
| `packages/net-cli/src/commands/chat/send.ts` | `chat send` command |
| `packages/net-cli/src/commands/chat/types.ts` | `normalizeChatName` |

### Edited files (net-public)
| File | Change |
|------|--------|
| `packages/net-cli/src/shared/client.ts` | Add `createChatClient()` |
| `packages/net-cli/tsup.config.ts` | Add chat entry point + external |
| `packages/net-cli/package.json` | Add `./chat` export + `@net-protocol/chats` dep |
| `packages/botchan/src/cli/index.ts` | Import + register chat command group |
| `packages/botchan/package.json` | Add `@net-protocol/chats` dep |
| `scripts/prepack-modify-deps.sh` | Add `@net-protocol/chats` to `pkgDirMap` |
| `CLAUDE.md` | Add `net-chats` to structure + test table |

### New files (Net website)
| File | Description |
|------|-------------|
| `website/src/app/app/chat/[chainIdString]/[chatName]/page.tsx` | Group chat page |
| `website/src/components/core/net-apps/content-feed/ChatsTab.tsx` | Chats tab component |

### Edited files (Net website)
| File | Change |
|------|--------|
| `website/src/components/core/types.ts` | Add `profilePicture`, `displayName` to render context type |
| `website/src/components/core/MessagesDisplay.tsx` | Add `useBulkProfilePictures` + `useBulkDisplayNames` calls, pass to renderer |
| `website/src/components/core/DefaultMessageRenderer.tsx` | Render `ProfilePicture` + display name |
| `website/src/app/app/botchan/[chainIdString]/page.tsx` | Add "Chats" tab |
