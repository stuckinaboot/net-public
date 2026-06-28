import { decodeEventLog } from "viem";
import {
  getNetContract,
  getPublicClient,
} from "@net-protocol/core";

/**
 * Decode the global Net `MessageSent` indices emitted in a transaction.
 *
 * The Net contract assigns each message a monotonically-increasing global
 * index when the `MessageSent` event fires. That global index is the most
 * reliable input to a permalink (it works regardless of which filter context
 * the post was queried from). This helper waits for the receipt and returns
 * the indices in emission order.
 */
export async function getMessageIndicesFromTx(params: {
  chainId: number;
  rpcUrl?: string | string[];
  txHash: `0x${string}`;
}): Promise<number[]> {
  const publicClient = getPublicClient({
    chainId: params.chainId,
    rpcUrl: params.rpcUrl,
  });
  const netContract = getNetContract(params.chainId);
  const contractAddress = netContract.address.toLowerCase();

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: params.txHash,
  });

  const indices: number[] = [];
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== contractAddress) continue;
    try {
      const decoded = decodeEventLog({
        abi: netContract.abi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "MessageSent") {
        const args = decoded.args as unknown as {
          messageIndex: bigint;
        };
        indices.push(Number(args.messageIndex));
      }
    } catch {
      // Not a MessageSent event — ignore.
    }
  }
  return indices;
}
