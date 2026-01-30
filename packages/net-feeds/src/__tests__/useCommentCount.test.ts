import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCommentCount } from "../hooks/useCommentCount";
import { useNetMessageCount } from "@net-protocol/core/react";
import { BASE_CHAIN_ID } from "./test-utils";
import type { NetMessage } from "../types";

// Mock the hooks from @net-protocol/core/react
vi.mock("@net-protocol/core/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@net-protocol/core/react")>();
  return {
    ...actual,
    useNetMessageCount: vi.fn(),
  };
});

const createMockPost = (overrides: Partial<NetMessage> = {}): NetMessage => ({
  app: "0x0000000000000000000000000000000000000000",
  sender: "0x1234567890123456789012345678901234567890",
  timestamp: BigInt(1234567890),
  data: "0x",
  text: "Test post",
  topic: "feed-crypto",
  ...overrides,
});

describe("useCommentCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call useNetMessageCount with comment topic", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 5,
      isLoading: false,
    });

    const post = createMockPost();
    renderHook(() =>
      useCommentCount({
        chainId: BASE_CHAIN_ID,
        post,
      })
    );

    expect(useNetMessageCount).toHaveBeenCalledWith({
      chainId: BASE_CHAIN_ID,
      filter: {
        appAddress: "0x0000000000000000000000000000000000000000",
        topic: expect.stringMatching(/^feed-crypto:comments:0x[a-fA-F0-9]{64}$/),
      },
      enabled: true,
    });
  });

  it("should return count and isLoading", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 10,
      isLoading: false,
    });

    const post = createMockPost();
    const { result } = renderHook(() =>
      useCommentCount({
        chainId: BASE_CHAIN_ID,
        post,
      })
    );

    expect(result.current.count).toBe(10);
    expect(result.current.isLoading).toBe(false);
  });

  it("should respect enabled flag", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 0,
      isLoading: false,
    });

    const post = createMockPost();
    renderHook(() =>
      useCommentCount({
        chainId: BASE_CHAIN_ID,
        post,
        enabled: false,
      })
    );

    expect(useNetMessageCount).toHaveBeenCalledWith({
      chainId: BASE_CHAIN_ID,
      filter: expect.any(Object),
      enabled: false,
    });
  });

  it("should generate same topic for same post", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 0,
      isLoading: false,
    });

    const post = createMockPost();

    renderHook(() =>
      useCommentCount({
        chainId: BASE_CHAIN_ID,
        post,
      })
    );

    const firstCall = (useNetMessageCount as any).mock.calls[0][0].filter.topic;

    vi.clearAllMocks();

    renderHook(() =>
      useCommentCount({
        chainId: BASE_CHAIN_ID,
        post,
      })
    );

    const secondCall = (useNetMessageCount as any).mock.calls[0][0].filter.topic;

    expect(firstCall).toBe(secondCall);
  });

  it("should generate different topics for different posts", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 0,
      isLoading: false,
    });

    const post1 = createMockPost({ text: "Post 1" });
    const post2 = createMockPost({ text: "Post 2" });

    renderHook(() =>
      useCommentCount({
        chainId: BASE_CHAIN_ID,
        post: post1,
      })
    );

    const topic1 = (useNetMessageCount as any).mock.calls[0][0].filter.topic;

    vi.clearAllMocks();

    renderHook(() =>
      useCommentCount({
        chainId: BASE_CHAIN_ID,
        post: post2,
      })
    );

    const topic2 = (useNetMessageCount as any).mock.calls[0][0].filter.topic;

    expect(topic1).not.toBe(topic2);
  });
});
