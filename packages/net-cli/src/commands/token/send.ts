import chalk from "chalk";
import { isAddress, parseUnits, type Address } from "viem";
import { getPublicClient } from "@net-protocol/core";
import { resolveTokenAddress } from "@net-protocol/transfers";
import {
  parseCommonOptionsWithDefault,
  parseReadOnlyOptionsWithDefault,
} from "../../cli/shared";
import { createTokenTransferClient } from "../../shared/client";
import { createWallet, executeTransaction } from "../../shared/wallet";
import { encodeTransaction } from "../../shared/encode";
import { exitWithError } from "../../shared/output";
import { profileUrl } from "../../shared/urls";
import type { TokenSendOptions } from "./types";

/** "ETH" (any case) or an address → token address (zero address for ETH) */
export function resolveTokenArg(token: string): Address {
  const address = resolveTokenAddress(token);
  if (!address) exitWithError(`Invalid --token: ${token} (use a token address or ETH)`);
  return address;
}

/** Parse a human amount ("5", "0.01") into base units, rejecting zero and junk */
export function parseAmount(amount: string, decimals: number): bigint {
  let value: bigint;
  try {
    value = parseUnits(amount, decimals);
  } catch {
    exitWithError(`Invalid --amount: ${amount}`);
  }
  if (value <= 0n) exitWithError("--amount must be greater than zero");
  return value;
}

export async function executeTokenSend(options: TokenSendOptions): Promise<void> {
  const token = resolveTokenArg(options.token);
  if (!isAddress(options.to)) exitWithError(`Invalid --to address: ${options.to}`);
  const to = options.to as Address;
  const message = options.message ?? "";

  const readOnly = parseReadOnlyOptionsWithDefault({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });
  const client = createTokenTransferClient(readOnly);

  let tokenInfo: { decimals: number; symbol: string };
  try {
    tokenInfo = await client.getTokenInfo(token);
  } catch (error) {
    exitWithError(
      `Could not read token ${token}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  const amount = parseAmount(options.amount, tokenInfo.decimals);

  if (options.encodeOnly) {
    if (!options.sender || !isAddress(options.sender)) {
      exitWithError("--sender <address> is required with --encode-only (used to check the token allowance)");
    }
    try {
      const prepared = await client.prepareSend({
        token,
        to,
        amount,
        message,
        sender: options.sender as Address,
      });
      console.log(
        JSON.stringify(
          {
            approvals: prepared.approvals.map((a) => encodeTransaction(a, readOnly.chainId)),
            transaction: encodeTransaction(prepared.transaction, readOnly.chainId),
          },
          null,
          2
        )
      );
    } catch (error) {
      exitWithError(error instanceof Error ? error.message : String(error));
    }
    return;
  }

  const common = parseCommonOptionsWithDefault(
    { privateKey: options.privateKey, chainId: options.chainId, rpcUrl: options.rpcUrl },
    true
  );
  const walletClient = createWallet(common.privateKey, common.chainId, common.rpcUrl);
  const publicClient = getPublicClient({
    chainId: common.chainId,
    rpcUrl: common.rpcUrl ? [common.rpcUrl] : undefined,
  });

  try {
    const prepared = await client.prepareSend({
      token,
      to,
      amount,
      message,
      sender: walletClient.account.address,
    });

    for (const approval of prepared.approvals) {
      console.log(chalk.blue(`Approving ${options.amount} ${tokenInfo.symbol}...`));
      const approvalHash = await executeTransaction(walletClient, approval);
      await publicClient.waitForTransactionReceipt({ hash: approvalHash });
      console.log(chalk.green(`  Approval: ${approvalHash}`));
    }

    console.log(chalk.blue(`Sending ${options.amount} ${tokenInfo.symbol} to ${to}...`));
    const hash = await executeTransaction(walletClient, prepared.transaction);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") exitWithError(`Send reverted: ${hash}`);

    console.log(chalk.green("Sent!"));
    console.log(chalk.white(`  Transaction: ${hash}`));
    console.log(chalk.white(`  Amount: ${options.amount} ${tokenInfo.symbol}`));
    console.log(chalk.white(`  To: ${to}`));
    if (message) console.log(chalk.white(`  Message: ${message}`));
    const url = profileUrl(common.chainId, to);
    if (url) console.log(chalk.white(`  Recipient profile: ${url}`));
  } catch (error) {
    exitWithError(`Failed to send: ${error instanceof Error ? error.message : String(error)}`);
  }
}
