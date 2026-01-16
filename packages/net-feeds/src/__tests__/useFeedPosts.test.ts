import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFeedPosts } from "../hooks/useFeedPosts";
import { useNetMessages, useNetMessageCount } from "@net-protocol/core";
import { BASE_CHAIN_ID } from "./test-utils";
import type { NetMessage } from "../types";

// Mock the hooks from @net-protocol/core
vi.mock("@net-protocol/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@net-protocol/core")>();
  return {
    ...actual,
    useNetMessages: vi.fn(),
    useNetMessageCount: vi.fn(),
  };
});

describe("useFeedPosts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should normalize topic correctly", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 0,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    renderHook(() =>
      useFeedPosts({
        chainId: BASE_CHAIN_ID,
        topic: "crypto", // Should be normalized to "feed-crypto"
      })
    );

    expect(useNetMessageCount).toHaveBeenCalledWith({
      chainId: BASE_CHAIN_ID,
      filter: {
        appAddress: "0x0000000000000000000000000000000000000000",
        topic: "feed-crypto",
      },
      enabled: true,
    });
  });

  it("should handle already prefixed topics", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 0,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    renderHook(() =>
      useFeedPosts({
        chainId: BASE_CHAIN_ID,
        topic: "feed-crypto", // Already prefixed
      })
    );

    expect(useNetMessageCount).toHaveBeenCalledWith({
      chainId: BASE_CHAIN_ID,
      filter: {
        appAddress: "0x0000000000000000000000000000000000000000",
        topic: "feed-crypto",
      },
      enabled: true,
    });
  });

  it("should handle case-insensitive topic normalization", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 0,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    renderHook(() =>
      useFeedPosts({
        chainId: BASE_CHAIN_ID,
        topic: "CRYPTO", // Should be normalized to "feed-crypto"
      })
    );

    expect(useNetMessageCount).toHaveBeenCalledWith({
      chainId: BASE_CHAIN_ID,
      filter: {
        appAddress: "0x0000000000000000000000000000000000000000",
        topic: "feed-crypto",
      },
      enabled: true,
    });
  });

  it("should calculate pagination correctly", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 100,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    renderHook(() =>
      useFeedPosts({
        chainId: BASE_CHAIN_ID,
        topic: "crypto",
        maxMessages: 50,
      })
    );

    expect(useNetMessages).toHaveBeenCalledWith({
      chainId: BASE_CHAIN_ID,
      filter: {
        appAddress: "0x0000000000000000000000000000000000000000",
        topic: "feed-crypto",
      },
      startIndex: 50, // 100 - 50 = 50
      endIndex: 100,
      enabled: true,
    });
  });

  it("should handle totalCount = 0 (should not query messages)", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 0,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    renderHook(() =>
      useFeedPosts({
        chainId: BASE_CHAIN_ID,
        topic: "crypto",
        maxMessages: 50,
      })
    );

    expect(useNetMessages).toHaveBeenCalledWith({
      chainId: BASE_CHAIN_ID,
      filter: {
        appAddress: "0x0000000000000000000000000000000000000000",
        topic: "feed-crypto",
      },
      startIndex: 0,
      endIndex: 0,
      enabled: false, // Should be false when count = 0
    });
  });

  it("should handle maxMessages = 0", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 10,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    renderHook(() =>
      useFeedPosts({
        chainId: BASE_CHAIN_ID,
        topic: "crypto",
        maxMessages: 0,
      })
    );

    expect(useNetMessages).toHaveBeenCalledWith({
      chainId: BASE_CHAIN_ID,
      filter: {
        appAddress: "0x0000000000000000000000000000000000000000",
        topic: "feed-crypto",
      },
      startIndex: 10, // totalCount - 0 = 10
      endIndex: 10,
      enabled: true,
    });
  });

  it("should handle maxMessages > totalCount", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 5,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    renderHook(() =>
      useFeedPosts({
        chainId: BASE_CHAIN_ID,
        topic: "crypto",
        maxMessages: 50, // More than count
      })
    );

    expect(useNetMessages).toHaveBeenCalledWith({
      chainId: BASE_CHAIN_ID,
      filter: {
        appAddress: "0x0000000000000000000000000000000000000000",
        topic: "feed-crypto",
      },
      startIndex: 0, // Should be 0 when maxMessages > totalCount
      endIndex: 5,
      enabled: true,
    });
  });

  it("should use default maxMessages = 50", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 100,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    renderHook(() =>
      useFeedPosts({
        chainId: BASE_CHAIN_ID,
        topic: "crypto",
        // maxMessages not provided
      })
    );

    expect(useNetMessages).toHaveBeenCalledWith({
      chainId: BASE_CHAIN_ID,
      filter: {
        appAddress: "0x0000000000000000000000000000000000000000",
        topic: "feed-crypto",
      },
      startIndex: 50, // 100 - 50 = 50
      endIndex: 100,
      enabled: true,
    });
  });

  it("should use default enabled = true", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 0,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    renderHook(() =>
      useFeedPosts({
        chainId: BASE_CHAIN_ID,
        topic: "crypto",
        // enabled not provided
      })
    );

    expect(useNetMessageCount).toHaveBeenCalledWith({
      chainId: BASE_CHAIN_ID,
      filter: {
        appAddress: "0x0000000000000000000000000000000000000000",
        topic: "feed-crypto",
      },
      enabled: true,
    });
  });

  it("should respect enabled flag", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 10,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    renderHook(() =>
      useFeedPosts({
        chainId: BASE_CHAIN_ID,
        topic: "crypto",
        enabled: false,
      })
    );

    expect(useNetMessageCount).toHaveBeenCalledWith({
      chainId: BASE_CHAIN_ID,
      filter: {
        appAddress: "0x0000000000000000000000000000000000000000",
        topic: "feed-crypto",
      },
      enabled: false,
    });
  });

  it("should combine loading states", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 10,
      isLoading: true,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useFeedPosts({
        chainId: BASE_CHAIN_ID,
        topic: "crypto",
      })
    );

    expect(result.current.isLoading).toBe(true);
  });

  it("should return posts and totalCount", () => {
    const mockMessages: NetMessage[] = [
      {
        app: "0x0000000000000000000000000000000000000000",
        sender: "0x1234567890123456789012345678901234567890",
        timestamp: BigInt(1234567890),
        data: "0x",
        text: "Test post",
        topic: "feed-crypto",
      },
    ];

    (useNetMessageCount as any).mockReturnValue({
      count: 10,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: mockMessages,
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useFeedPosts({
        chainId: BASE_CHAIN_ID,
        topic: "crypto",
      })
    );

    expect(result.current.posts).toEqual(mockMessages);
    expect(result.current.totalCount).toBe(10);
    expect(result.current.isLoading).toBe(false);
  });

  it("should NOT return error field", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 10,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useFeedPosts({
        chainId: BASE_CHAIN_ID,
        topic: "crypto",
      })
    );

    // Verify error field is not present
    expect("error" in result.current).toBe(false);
    expect(result.current).not.toHaveProperty("error");
  });

  it("should include maker in filter when sender is provided", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 10,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    const senderAddress = "0x1234567890123456789012345678901234567890" as `0x${string}`;

    renderHook(() =>
      useFeedPosts({
        chainId: BASE_CHAIN_ID,
        topic: "crypto",
        sender: senderAddress,
      })
    );

    expect(useNetMessageCount).toHaveBeenCalledWith({
      chainId: BASE_CHAIN_ID,
      filter: {
        appAddress: "0x0000000000000000000000000000000000000000",
        topic: "feed-crypto",
        maker: senderAddress,
      },
      enabled: true,
    });

    expect(useNetMessages).toHaveBeenCalledWith({
      chainId: BASE_CHAIN_ID,
      filter: {
        appAddress: "0x0000000000000000000000000000000000000000",
        topic: "feed-crypto",
        maker: senderAddress,
      },
      startIndex: 0,
      endIndex: 10,
      enabled: true,
    });
  });

  it("should not include maker in filter when sender is not provided", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 10,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    renderHook(() =>
      useFeedPosts({
        chainId: BASE_CHAIN_ID,
        topic: "crypto",
      })
    );

    expect(useNetMessageCount).toHaveBeenCalledWith({
      chainId: BASE_CHAIN_ID,
      filter: {
        appAddress: "0x0000000000000000000000000000000000000000",
        topic: "feed-crypto",
      },
      enabled: true,
    });

    expect(useNetMessages).toHaveBeenCalledWith({
      chainId: BASE_CHAIN_ID,
      filter: {
        appAddress: "0x0000000000000000000000000000000000000000",
        topic: "feed-crypto",
      },
      startIndex: 0,
      endIndex: 10,
      enabled: true,
    });
  });
});

