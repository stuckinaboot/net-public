import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFeedMessageCountBatch } from "../hooks/useFeedMessageCountBatch";
import { useReadContract } from "wagmi";
import { BASE_CHAIN_ID } from "./test-utils";

// Mock wagmi
vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useReadContract: vi.fn(),
  };
});

describe("useFeedMessageCountBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call useReadContract with normalized topics", () => {
    (useReadContract as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      refetch: vi.fn(),
    });

    renderHook(() =>
      useFeedMessageCountBatch({
        chainId: BASE_CHAIN_ID,
        feedNames: ["crypto", "gaming"],
      })
    );

    expect(useReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "getMessageCountsForTopics",
        args: [
          "0x0000000000000000000000000000000000000000",
          ["feed-crypto", "feed-gaming"],
        ],
        chainId: BASE_CHAIN_ID,
      })
    );
  });

  it("should return counts map from data", () => {
    (useReadContract as any).mockReturnValue({
      data: [BigInt(10), BigInt(20), BigInt(30)],
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() =>
      useFeedMessageCountBatch({
        chainId: BASE_CHAIN_ID,
        feedNames: ["crypto", "gaming", "music"],
      })
    );

    expect(result.current.counts.get("crypto")).toBe(10);
    expect(result.current.counts.get("gaming")).toBe(20);
    expect(result.current.counts.get("music")).toBe(30);
    expect(result.current.isLoading).toBe(false);
  });

  it("should return empty map when data is undefined", () => {
    (useReadContract as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() =>
      useFeedMessageCountBatch({
        chainId: BASE_CHAIN_ID,
        feedNames: ["crypto"],
      })
    );

    expect(result.current.counts.size).toBe(0);
    expect(result.current.isLoading).toBe(true);
  });

  it("should disable query when feedNames is empty", () => {
    (useReadContract as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    renderHook(() =>
      useFeedMessageCountBatch({
        chainId: BASE_CHAIN_ID,
        feedNames: [],
      })
    );

    expect(useReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          enabled: false,
        }),
      })
    );
  });

  it("should respect enabled flag", () => {
    (useReadContract as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    renderHook(() =>
      useFeedMessageCountBatch({
        chainId: BASE_CHAIN_ID,
        feedNames: ["crypto"],
        enabled: false,
      })
    );

    expect(useReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          enabled: false,
        }),
      })
    );
  });

  it("should handle already prefixed feed names", () => {
    (useReadContract as any).mockReturnValue({
      data: [BigInt(5)],
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    renderHook(() =>
      useFeedMessageCountBatch({
        chainId: BASE_CHAIN_ID,
        feedNames: ["feed-crypto"], // already prefixed
      })
    );

    expect(useReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [
          "0x0000000000000000000000000000000000000000",
          ["feed-crypto"], // should not double-prefix
        ],
      })
    );
  });

  it("should return error from useReadContract", () => {
    const mockError = new Error("RPC error");
    (useReadContract as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() =>
      useFeedMessageCountBatch({
        chainId: BASE_CHAIN_ID,
        feedNames: ["crypto"],
      })
    );

    expect(result.current.error).toBe(mockError);
  });

  it("should return refetch function", () => {
    const mockRefetch = vi.fn();
    (useReadContract as any).mockReturnValue({
      data: [BigInt(5)],
      isLoading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() =>
      useFeedMessageCountBatch({
        chainId: BASE_CHAIN_ID,
        feedNames: ["crypto"],
      })
    );

    expect(result.current.refetch).toBe(mockRefetch);
  });
});
