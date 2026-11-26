import chalk from "chalk";
import { formatUnits, isAddress, type Address } from "viem";
import {
  TokenTransferClient,
  isNativeToken,
  type TokenTransfer,
  type TransferQuery,
} from "@net-protocol/transfers";
import { parseReadOnlyOptionsWithDefault } from "../../cli/shared";
import { createTokenTransferClient } from "../../shared/client";
import { exitWithError } from "../../shared/output";
import { profileUrl, tokenUrl } from "../../shared/urls";
import { resolveTokenArg } from "./send";
import type { TokenTransfersOptions } from "./types";

function requireAddress(value: string, flag: string): Address {
  if (!isAddress(value)) exitWithError(`Invalid ${flag} address: ${value}`);
  return value as Address;
}

/** Turn CLI flags into exactly one lookup */
export function buildTransferQuery(options: TokenTransfersOptions): TransferQuery {
  const sentBy = options.sentBy ?? options.from;
  const receivedBy = options.receivedBy ?? options.to;
  if (options.token) {
    if (sentBy || receivedBy) {
      exitWithError("--token can't be combined with sender/recipient filters; filter those results by token instead");
    }
    return { token: resolveTokenArg(options.token) };
  }
  if (sentBy && receivedBy) {
    return {
      sentBy: requireAddress(sentBy, "--from/--sent-by"),
      receivedBy: requireAddress(receivedBy, "--to/--received-by"),
    };
  }
  if (sentBy) return { sentBy: requireAddress(sentBy, "--sent-by") };
  if (receivedBy) return { receivedBy: requireAddress(receivedBy, "--received-by") };
  exitWithError("Provide --sent-by, --received-by, --from with --to, or --token");
}

async function loadTokenInfo(
  client: TokenTransferClient,
  transfers: TokenTransfer[]
): Promise<Map<string, { decimals: number; symbol: string } | null>> {
  const tokens = [...new Set(transfers.map((t) => t.token.toLowerCase()))];
  const entries = await Promise.all(
    tokens.map(async (token) => {
      try {
        return [token, await client.getTokenInfo(token as Address)] as const;
      } catch {
        return [token, null] as const;
      }
    })
  );
  return new Map(entries);
}

export async function executeTokenTransfers(options: TokenTransfersOptions): Promise<void> {
  const query = buildTransferQuery(options);
  const limit = options.limit ? parseInt(options.limit, 10) : 20;
  const offset = options.offset ? parseInt(options.offset, 10) : 0;
  if (!(limit > 0) || !(offset >= 0)) exitWithError("--limit must be positive and --offset non-negative");

  const readOnly = parseReadOnlyOptionsWithDefault({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });
  const client = createTokenTransferClient(readOnly);

  try {
    const { total, transfers } = await client.getTransfers(query, { limit, offset });
    const tokenInfo = await loadTokenInfo(client, transfers);

    const rows = transfers.map((t) => {
      const info = tokenInfo.get(t.token.toLowerCase());
      return {
        from: t.from,
        to: t.to,
        token: isNativeToken(t.token) ? "native" : t.token,
        symbol: info?.symbol ?? null,
        amount: info ? formatUnits(t.amount, info.decimals) : null,
        amountRaw: t.amount.toString(),
        message: t.message,
        timestamp: t.timestamp,
        fromProfileUrl: profileUrl(readOnly.chainId, t.from),
        toProfileUrl: profileUrl(readOnly.chainId, t.to),
        tokenUrl: isNativeToken(t.token) ? null : tokenUrl(readOnly.chainId, t.token),
      };
    });

    if (options.json) {
      console.log(JSON.stringify({ total, offset, transfers: rows }, null, 2));
      return;
    }

    if (rows.length === 0) {
      console.log(chalk.yellow("No transfers found"));
      return;
    }
    console.log(chalk.white(`${total} transfer(s); showing ${rows.length} newest from offset ${offset}\n`));
    for (const row of rows) {
      const when = new Date(row.timestamp * 1000).toISOString().replace("T", " ").slice(0, 19);
      const amount = row.amount ? `${row.amount} ${row.symbol}` : `${row.amountRaw} (raw) ${row.token}`;
      console.log(chalk.cyan(`${when}  ${row.from} → ${row.to}`));
      console.log(chalk.white(`  ${amount}${row.message ? `  "${row.message}"` : ""}`));
    }
  } catch (error) {
    exitWithError(`Failed to read transfers: ${error instanceof Error ? error.message : String(error)}`);
  }
}
