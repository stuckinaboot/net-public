import { execSync } from "child_process";
import { encodeFunctionData, decodeFunctionResult, type Hex, type Abi } from "viem";
import netAbi from "../packages/net-core/src/abis/net.json";

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
  const escapedBody = body.replace(/'/g, "'\\''");
  const result = execSync(
    `curl -s -m 30 -X POST -H "Content-Type: application/json" -d '${escapedBody}' "${RPC_URL}"`,
    { encoding: "utf-8" }
  );
  const parsed = JSON.parse(result);
  if (parsed.error) throw new Error(`RPC error: ${JSON.stringify(parsed.error)}`);
  return parsed.result;
}

function contractRead(address: string, abi: Abi, functionName: string, args: any[]): any {
  const data = encodeFunctionData({ abi, functionName, args });
  const result = rpcCall(address, data);
  return decodeFunctionResult({ abi, functionName, data: result as Hex });
}

async function main() {
  const count = contractRead(
    NET_CONTRACT, netAbi as Abi, "getTotalMessagesForAppTopicCount",
    [ZERO_ADDRESS, "chat-trauma"]
  ) as bigint;
  const totalCount = Number(count);
  console.log(`Total messages: ${totalCount}\n`);

  const BATCH_SIZE = 25;
  let axiomMentions = 0;

  for (let start = 0; start < totalCount; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE, totalCount);
    const rawMessages = contractRead(
      NET_CONTRACT, netAbi as Abi, "getMessagesInRangeForAppTopic",
      [BigInt(start), BigInt(end), ZERO_ADDRESS, "chat-trauma"]
    ) as any[];

    for (let i = 0; i < rawMessages.length; i++) {
      const msg = rawMessages[i];
      const sender = (msg.sender || msg[1] || "").toString().toLowerCase();
      const text = msg.text || msg[4] || "";
      if (/axiom/i.test(text) || /axiom/i.test(sender)) {
        axiomMentions++;
        console.log(`[msg #${start + i}] sender=${sender}`);
        console.log(`  text: ${text.slice(0, 200)}`);
        console.log();
      }
    }
  }

  console.log(`\nTotal messages mentioning "Axiom": ${axiomMentions}`);
}

main().catch(console.error);
