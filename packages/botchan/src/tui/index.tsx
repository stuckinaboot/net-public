import React from "react";
import { render } from "ink";
import { App } from "./App";
import { DEFAULT_CHAIN_ID } from "../utils/config";

interface TuiOptions {
  chainId?: number;
  rpcUrl?: string;
}

/**
 * Launch the interactive TUI
 */
export async function launchTui(options: TuiOptions): Promise<void> {
  const chainId = options.chainId ?? DEFAULT_CHAIN_ID;
  const rpcUrl = options.rpcUrl;

  // Clear screen before rendering TUI
  console.clear();

  const { waitUntilExit } = render(
    <App chainId={chainId} rpcUrl={rpcUrl} onExit={() => process.exit(0)} />
  );

  await waitUntilExit();
}
