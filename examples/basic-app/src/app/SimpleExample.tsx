"use client";

import { useEffect, useState } from "react";
import { useNetMessageCount } from "@net-protocol/core";
import { base } from "wagmi/chains";
import { NULL_ADDRESS } from "@/lib/constants";

/**
 * Simple example - just use one hook to test if WagmiProvider is working
 * Waits for client-side mount before using hooks
 */
export default function SimpleExample() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't use hooks until mounted (ensures WagmiProvider is ready)
  if (!isMounted) {
    return <div className="p-8">Waiting for providers...</div>;
  }

  return <MessageCount />;
}

function MessageCount() {
  const { count, isLoading, error } = useNetMessageCount({
    chainId: base.id,
    filter: {
      appAddress: NULL_ADDRESS,
      topic: "general",
    },
  });

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <pre className="bg-red-100 p-4 rounded">{String(error)}</pre>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Net Example</h1>
      {isLoading ? (
        <p>Loading message count...</p>
      ) : (
        <p>Message count: {count}</p>
      )}
    </div>
  );
}
