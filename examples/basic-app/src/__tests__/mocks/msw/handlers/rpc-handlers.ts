import { http, HttpResponse } from "msw";

// Mock RPC responses for blockchain interactions
const createRpcResponse = (result: unknown, id: number = 1) => ({
  jsonrpc: "2.0",
  id,
  result,
});

// Handler for JSON-RPC requests
const handleRpcRequest = (body: { method: string; params?: unknown[]; id: number }) => {
  const { method, id } = body;

  switch (method) {
    case "eth_chainId":
      return createRpcResponse("0x2105", id); // Base mainnet (8453)

    case "eth_blockNumber":
      return createRpcResponse("0x1000000", id);

    case "eth_getBalance":
      return createRpcResponse("0xde0b6b3a7640000", id); // 1 ETH

    case "eth_call":
      // Return empty data for contract calls
      return createRpcResponse("0x", id);

    case "eth_sendTransaction":
      // Return mock transaction hash
      return createRpcResponse("0x" + "ef".repeat(32), id);

    case "eth_getTransactionReceipt":
      return createRpcResponse(
        {
          transactionHash: "0x" + "ef".repeat(32),
          blockNumber: "0x1000000",
          blockHash: "0x" + "11".repeat(32),
          status: "0x1",
          gasUsed: "0x5208",
        },
        id
      );

    case "eth_estimateGas":
      return createRpcResponse("0x5208", id); // 21000 gas

    case "eth_gasPrice":
      return createRpcResponse("0x3b9aca00", id); // 1 gwei

    case "eth_getCode":
      // Return some bytecode to indicate a contract exists
      return createRpcResponse("0x6080604052", id);

    case "eth_getTransactionCount":
      return createRpcResponse("0x1", id);

    case "net_version":
      return createRpcResponse("8453", id);

    default:
      console.log(`MSW: Unhandled RPC method ${method}`);
      return createRpcResponse(null, id);
  }
};

export const rpcHandlers = [
  // Handle Base mainnet RPC
  http.post("https://mainnet.base.org", async ({ request }) => {
    const body = (await request.json()) as { method: string; params?: unknown[]; id: number };
    return HttpResponse.json(handleRpcRequest(body));
  }),

  // Handle common RPC endpoints (Alchemy, Infura, etc.)
  http.post(/https:\/\/.*\.alchemy\.com.*/, async ({ request }) => {
    const body = (await request.json()) as { method: string; params?: unknown[]; id: number };
    return HttpResponse.json(handleRpcRequest(body));
  }),

  http.post(/https:\/\/.*\.g\.alchemy\.com.*/, async ({ request }) => {
    const body = (await request.json()) as { method: string; params?: unknown[]; id: number };
    return HttpResponse.json(handleRpcRequest(body));
  }),

  http.post(/https:\/\/.*\.infura\.io.*/, async ({ request }) => {
    const body = (await request.json()) as { method: string; params?: unknown[]; id: number };
    return HttpResponse.json(handleRpcRequest(body));
  }),
];
