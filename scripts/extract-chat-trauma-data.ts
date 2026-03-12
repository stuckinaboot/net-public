import { execSync } from "child_process";
import { hexToString, encodeFunctionData, decodeFunctionResult, type Hex, type Abi } from "viem";
import netAbi from "../packages/net-core/src/abis/net.json";
import storageRouterAbi from "../packages/net-storage/src/abis/storage-router.json";
import {
  STORAGE_ROUTER_CONTRACT,
} from "../packages/net-storage/src/constants.js";
import { getStorageKeyBytes } from "../packages/net-storage/src/utils/keyUtils.js";
import {
  PROFILE_METADATA_STORAGE_KEY,
  parseProfileMetadata,
} from "../packages/net-profiles/src/index.js";

const RPC_URL = "https://base.drpc.org";
const NET_CONTRACT = "0x00000000B24D62781dB359b07880a105cD0b64e6";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Hex;

function rpcCall(to: string, data: string): string {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "eth_call",
    params: [{ to, data }, "latest"],
    id: 1,
  });
  // Escape single quotes in body for shell safety
  const escapedBody = body.replace(/'/g, "'\\''");
  const result = execSync(
    `curl -s -m 30 -X POST -H "Content-Type: application/json" -d '${escapedBody}' "${RPC_URL}"`,
    { encoding: "utf-8" }
  );
  const parsed = JSON.parse(result);
  if (parsed.error) {
    throw new Error(`RPC error: ${JSON.stringify(parsed.error)}`);
  }
  return parsed.result;
}

function contractRead(address: string, abi: Abi, functionName: string, args: any[]): any {
  const data = encodeFunctionData({ abi, functionName, args });
  const result = rpcCall(address, data);
  return decodeFunctionResult({ abi, functionName, data: result as Hex });
}

async function main() {
  console.log("Fetching message count from chat-trauma on Base...\n");

  const count = contractRead(
    NET_CONTRACT,
    netAbi as Abi,
    "getTotalMessagesForAppTopicCount",
    [ZERO_ADDRESS, "chat-trauma"]
  ) as bigint;

  const totalCount = Number(count);
  console.log(`Total message count: ${totalCount}\n`);

  if (totalCount === 0) {
    console.log("No messages found.");
    return;
  }

  // Fetch messages in batches
  const BATCH_SIZE = 25;
  const allMessages: Array<{
    sender: string;
    text: string;
    timestamp: bigint;
  }> = [];

  for (let start = 0; start < totalCount; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE, totalCount);
    console.log(`Fetching messages ${start} to ${end}...`);

    const rawMessages = contractRead(
      NET_CONTRACT,
      netAbi as Abi,
      "getMessagesInRangeForAppTopic",
      [BigInt(start), BigInt(end), ZERO_ADDRESS, "chat-trauma"]
    ) as any[];

    for (const msg of rawMessages) {
      allMessages.push({
        sender: (msg.sender || msg[1] || "").toString().toLowerCase(),
        text: msg.text || msg[4] || "",
        timestamp: msg.timestamp || msg[2] || 0n,
      });
    }
  }

  console.log(`\nFetched ${allMessages.length} messages total\n`);

  // Get unique sender addresses
  const uniqueSenders = [...new Set(allMessages.map((m) => m.sender))];
  console.log(`Unique senders: ${uniqueSenders.length}\n`);

  // Convert profile metadata key to bytes32
  const keyBytes = getStorageKeyBytes(PROFILE_METADATA_STORAGE_KEY) as Hex;
  console.log(`Profile metadata key (bytes32): ${keyBytes}\n`);

  // Look up profiles for each sender
  const results: Array<{
    address: string;
    display_name: string | undefined;
    x_username: string | undefined;
    message_count: number;
  }> = [];

  for (const sender of uniqueSenders) {
    const msgCount = allMessages.filter((m) => m.sender === sender).length;
    let displayName: string | undefined;
    let xUsername: string | undefined;

    try {
      const result = contractRead(
        STORAGE_ROUTER_CONTRACT.address,
        storageRouterAbi as Abi,
        "get",
        [keyBytes, sender as Hex]
      ) as any;

      // get returns [isChunkedStorage, text, data(bytes)]
      const isChunked = result[0];
      const text = result[1];
      const dataBytes = result[2] as Hex;

      if (dataBytes && dataBytes !== "0x") {
        let dataStr: string;
        if (isChunked) {
          // Chunked storage - text field may contain useful info
          dataStr = text || "";
        } else {
          dataStr = hexToString(dataBytes);
        }

        if (dataStr) {
          const metadata = parseProfileMetadata(dataStr);
          displayName = metadata?.display_name;
          xUsername = metadata?.x_username;
        }
      }
    } catch (error) {
      // Profile not found is okay
    }

    results.push({
      address: sender,
      display_name: displayName,
      x_username: xUsername,
      message_count: msgCount,
    });

    console.log(
      `  ${sender} → ${displayName || "(no display name)"}${xUsername ? ` (@${xUsername})` : ""} [${msgCount} msgs]`
    );
  }

  console.log("\n--- Summary JSON ---\n");
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
