import chalk from "chalk";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { NetClient, getChainRpcUrls } from "@net-protocol/core";
import { parseCommonOptions, parseReadOnlyOptions } from "../../cli/shared";
import { createNetClient } from "../../shared/client";
import { encodeTransaction } from "../../shared/encode";
import { exitWithError } from "../../shared/output";
import type { MessageSendOptions } from "./types";

function prepareMessageConfig(client: NetClient, options: MessageSendOptions) {
  return client.prepareSendMessage({
    text: options.text,
    topic: options.topic ?? "",
    data: options.data as `0x${string}` | undefined,
  });
}

/**
 * Execute the message send command
 */
export async function executeSend(options: MessageSendOptions): Promise<void> {
  if (options.encodeOnly) {
    executeEncodeOnly(options);
    return;
  }

  const commonOptions = parseCommonOptions({
    privateKey: options.privateKey,
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const client = createNetClient(commonOptions);
  const txConfig = prepareMessageConfig(client, options);

  const account = privateKeyToAccount(commonOptions.privateKey);
  const rpcUrls = getChainRpcUrls({
    chainId: commonOptions.chainId,
    rpcUrl: commonOptions.rpcUrl,
  });

  const walletClient = createWalletClient({
    account,
    transport: http(rpcUrls[0]),
  });

  console.log(chalk.blue("Sending message..."));

  try {
    const hash = await walletClient.writeContract({
      address: txConfig.to,
      abi: txConfig.abi,
      functionName: txConfig.functionName,
      args: txConfig.args,
      chain: null,
    });

    const topicLine = options.topic ? `\n  Topic: ${options.topic}` : "";
    console.log(
      chalk.green(
        `Message sent successfully!\n  Transaction: ${hash}\n  Text: ${options.text}${topicLine}`
      )
    );
  } catch (error) {
    exitWithError(
      `Failed to send message: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Execute encode-only mode - output transaction data as JSON
 */
function executeEncodeOnly(options: MessageSendOptions): void {
  const readOnlyOptions = parseReadOnlyOptions({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const client = new NetClient({ chainId: readOnlyOptions.chainId });
  const txConfig = prepareMessageConfig(client, options);
  const encoded = encodeTransaction(txConfig, readOnlyOptions.chainId);

  console.log(JSON.stringify(encoded, null, 2));
}
