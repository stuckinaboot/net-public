import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRegisteredFeeds } from "../hooks/useRegisteredFeeds";
import { useNetMessages, useNetMessageCount } from "@net-protocol/core/react";
import { BASE_CHAIN_ID } from "./test-utils";
import { FEED_REGISTRY_CONTRACT } from "../constants";

// Mock the hooks from @net-protocol/core/react
vi.mock("@net-protocol/core/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@net-protocol/core/react")>();
  return {
    ...actual,
    useNetMessages: vi.fn(),
    useNetMessageCount: vi.fn(),
  };
});

describe("useRegisteredFeeds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call useNetMessageCount with correct parameters", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 0,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    renderHook(() =>
      useRegisteredFeeds({
        chainId: BASE_CHAIN_ID,
      })
    );

    expect(useNetMessageCount).toHaveBeenCalledWith({
      chainId: BASE_CHAIN_ID,
      filter: {
        appAddress: FEED_REGISTRY_CONTRACT.address,
      },
      enabled: true,
    });
  });

  it("should call useNetMessages with correct pagination", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 50,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    renderHook(() =>
      useRegisteredFeeds({
        chainId: BASE_CHAIN_ID,
        maxFeeds: 20,
      })
    );

    expect(useNetMessages).toHaveBeenCalledWith({
      chainId: BASE_CHAIN_ID,
      filter: {
        appAddress: FEED_REGISTRY_CONTRACT.address,
      },
      startIndex: 30, // 50 - 20
      endIndex: 50,
      enabled: true,
    });
  });

  it("should use default maxFeeds of 100", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 50,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    renderHook(() =>
      useRegisteredFeeds({
        chainId: BASE_CHAIN_ID,
      })
    );

    expect(useNetMessages).toHaveBeenCalledWith({
      chainId: BASE_CHAIN_ID,
      filter: {
        appAddress: FEED_REGISTRY_CONTRACT.address,
      },
      startIndex: 0, // count < maxFeeds, so start at 0
      endIndex: 50,
      enabled: true,
    });
  });

  it("should parse messages into RegisteredFeed objects", () => {
    const mockMessages = [
      {
        app: FEED_REGISTRY_CONTRACT.address,
        sender: "0x1234567890123456789012345678901234567890",
        timestamp: BigInt(1234567890),
        topic: "feed-crypto", // Topic has "feed-" prefix
        text: "crypto", // Feed name is in text field
        data: "0x",
      },
      {
        app: FEED_REGISTRY_CONTRACT.address,
        sender: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        timestamp: BigInt(1234567900),
        topic: "feed-gaming",
        text: "gaming",
        data: null,
      },
    ];

    (useNetMessageCount as any).mockReturnValue({
      count: 2,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: mockMessages,
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useRegisteredFeeds({
        chainId: BASE_CHAIN_ID,
      })
    );

    expect(result.current.feeds).toHaveLength(2);
    expect(result.current.feeds[0]).toEqual({
      feedName: "crypto",
      registrant: "0x1234567890123456789012345678901234567890",
      timestamp: 1234567890,
    });
    expect(result.current.feeds[1]).toEqual({
      feedName: "gaming",
      registrant: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      timestamp: 1234567900,
    });
  });

  it("should return empty array when no feeds registered", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 0,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useRegisteredFeeds({
        chainId: BASE_CHAIN_ID,
      })
    );

    expect(result.current.feeds).toEqual([]);
  });

  it("should return isLoading true when count is loading", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: undefined,
      isLoading: true,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useRegisteredFeeds({
        chainId: BASE_CHAIN_ID,
      })
    );

    expect(result.current.isLoading).toBe(true);
  });

  it("should return isLoading true when messages are loading", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 10,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: true,
    });

    const { result } = renderHook(() =>
      useRegisteredFeeds({
        chainId: BASE_CHAIN_ID,
      })
    );

    expect(result.current.isLoading).toBe(true);
  });

  it("should expose totalCount from message count", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 42,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useRegisteredFeeds({
        chainId: BASE_CHAIN_ID,
      })
    );

    expect(result.current.totalCount).toBe(42);
  });

  it("should disable queries when enabled is false", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 0,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    renderHook(() =>
      useRegisteredFeeds({
        chainId: BASE_CHAIN_ID,
        enabled: false,
      })
    );

    expect(useNetMessageCount).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
    expect(useNetMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });
});
