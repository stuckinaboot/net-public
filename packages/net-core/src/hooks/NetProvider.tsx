import React, { useEffect } from "react";
import { setChainRpcOverrides } from "../chainConfig";

export function NetProvider({
  children,
  overrides,
}: {
  children: React.ReactNode;
  overrides?: {
    rpcUrls?: { [chainId: number]: string[] };
  };
}) {
  // Set global RPC overrides when component mounts or overrides change
  useEffect(() => {
    if (overrides?.rpcUrls) {
      setChainRpcOverrides(overrides.rpcUrls);
    }
  }, [overrides?.rpcUrls]);

  return <>{children}</>;
}

