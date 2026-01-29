import React from "react";
import { render, renderHook, type RenderOptions, type RenderHookOptions } from "@testing-library/react";
import { TestProviders } from "./test-providers";
import type { MockWagmiOptions } from "./mock-wagmi-config";

interface ExtendedRenderOptions extends Omit<RenderOptions, "wrapper"> {
  wagmiOptions?: MockWagmiOptions;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: ExtendedRenderOptions = {}
) {
  const { wagmiOptions, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <TestProviders wagmiOptions={wagmiOptions}>{children}</TestProviders>
    ),
    ...renderOptions,
  });
}

export function renderHookWithProviders<Result, Props>(
  hook: (props: Props) => Result,
  options: RenderHookOptions<Props> & { wagmiOptions?: MockWagmiOptions } = {}
) {
  const { wagmiOptions, ...hookOptions } = options;

  return renderHook(hook, {
    wrapper: ({ children }) => (
      <TestProviders wagmiOptions={wagmiOptions}>{children}</TestProviders>
    ),
    ...hookOptions,
  });
}
