import chalk from "chalk";
import { NetrClient, isNetrSupportedChain } from "@net-protocol/netr";
import { parseReadOnlyOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import type { TokenInfoOptions } from "./types";

/**
 * Execute the token info command
 */
export async function executeTokenInfo(options: TokenInfoOptions): Promise<void> {
  const readOnlyOptions = parseReadOnlyOptions({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  if (!isNetrSupportedChain(readOnlyOptions.chainId)) {
    exitWithError(
      `Chain ${readOnlyOptions.chainId} is not supported for Netr tokens`
    );
  }

  const client = new NetrClient({
    chainId: readOnlyOptions.chainId,
    overrides: options.rpcUrl ? { rpcUrls: [options.rpcUrl] } : undefined,
  });

  const tokenAddress = options.address as `0x${string}`;

  try {
    // Fetch token data in parallel
    const [token, storageData, price] = await Promise.all([
      client.getToken(tokenAddress),
      client.getStorageData(tokenAddress),
      client.getPrice(tokenAddress),
    ]);

    if (!token) {
      exitWithError(`Token not found at address ${tokenAddress}`);
      return;
    }

    // Fetch locker data if available
    let locker = null;
    if (storageData?.lockerAddress) {
      locker = await client.getLocker(storageData.lockerAddress);
    }

    if (options.json) {
      const output = {
        address: tokenAddress,
        chainId: readOnlyOptions.chainId,
        token: {
          name: token.name,
          symbol: token.symbol,
          deployer: token.deployer,
          image: token.image,
          animation: token.animation || null,
          fid: token.fid.toString(),
          totalSupply: token.totalSupply.toString(),
          decimals: token.decimals,
          extraStringData: token.extraStringData || null,
        },
        pool: storageData?.poolAddress || null,
        locker: storageData?.lockerAddress || null,
        price: price
          ? {
              priceInEth: price.priceInEth,
              priceInWeth: price.priceInWeth,
              tick: price.tick,
            }
          : null,
        lockerInfo: locker
          ? {
              owner: locker.owner,
              duration: locker.duration.toString(),
              endTimestamp: locker.endTimestamp.toString(),
              version: locker.version,
            }
          : null,
      };
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    // Human-readable output
    console.log(chalk.white.bold("\nToken Info:\n"));
    console.log(`  ${chalk.cyan("Address:")} ${tokenAddress}`);
    console.log(`  ${chalk.cyan("Chain ID:")} ${readOnlyOptions.chainId}`);
    console.log(`  ${chalk.cyan("Name:")} ${token.name}`);
    console.log(`  ${chalk.cyan("Symbol:")} ${token.symbol}`);
    console.log(`  ${chalk.cyan("Deployer:")} ${token.deployer}`);
    console.log(`  ${chalk.cyan("FID:")} ${token.fid.toString()}`);
    console.log(`  ${chalk.cyan("Image:")} ${token.image}`);
    if (token.animation) {
      console.log(`  ${chalk.cyan("Animation:")} ${token.animation}`);
    }
    if (token.extraStringData) {
      console.log(`  ${chalk.cyan("Extra Data:")} ${token.extraStringData}`);
    }

    if (storageData?.poolAddress) {
      console.log(`  ${chalk.cyan("Pool:")} ${storageData.poolAddress}`);
    }

    if (storageData?.lockerAddress) {
      console.log(`  ${chalk.cyan("Locker:")} ${storageData.lockerAddress}`);
    }

    if (price) {
      console.log(`  ${chalk.cyan("Price:")} ${price.priceInEth} ETH`);
    }

    if (locker) {
      const endDate = new Date(Number(locker.endTimestamp) * 1000);
      console.log(
        `  ${chalk.cyan("Lock Ends:")} ${endDate.toLocaleDateString()}`
      );
    }

    console.log();
  } catch (error) {
    exitWithError(
      `Failed to get token info: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
