import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useComments } from "../hooks/useComments";
import { useNetMessages, useNetMessageCount } from "@net-protocol/core/react";
import { encodeCommentData } from "../utils/commentUtils";
import { BASE_CHAIN_ID } from "./test-utils";
import type { NetMessage, CommentData } from "../types";

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

const createMockPost = (overrides: Partial<NetMessage> = {}): NetMessage => ({
  app: "0x0000000000000000000000000000000000000000",
  sender: "0x1234567890123456789012345678901234567890",
  timestamp: BigInt(1234567890),
  data: "0x",
  text: "Test post",
  topic: "feed-crypto",
  ...overrides,
});

const createMockComment = (
  text: string,
  sender: `0x${string}`,
  timestamp: bigint,
  replyTo?: { sender: `0x${string}`; timestamp: number }
): NetMessage => {
  const commentData: CommentData = {
    parentTopic: "feed-crypto",
    parentSender: "0x1234567890123456789012345678901234567890",
    parentTimestamp: 1234567890,
    replyTo,
  };

  return {
    app: "0x0000000000000000000000000000000000000000",
    sender,
    timestamp,
    data: encodeCommentData(commentData),
    text,
    topic: "feed-crypto:comments:0x1234",
  };
};

describe("useComments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call hooks with comment topic", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 5,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    const post = createMockPost();
    renderHook(() =>
      useComments({
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

  it("should return comments, totalCount, and isLoading", () => {
    const mockComments = [
      createMockComment(
        "Comment 1",
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        BigInt(1000)
      ),
    ];

    (useNetMessageCount as any).mockReturnValue({
      count: 1,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: mockComments,
      isLoading: false,
    });

    const post = createMockPost();
    const { result } = renderHook(() =>
      useComments({
        chainId: BASE_CHAIN_ID,
        post,
      })
    );

    expect(result.current.comments.length).toBe(1);
    expect(result.current.comments[0].text).toBe("Comment 1");
    expect(result.current.totalCount).toBe(1);
    expect(result.current.isLoading).toBe(false);
  });

  it("should build tree structure with nested replies", () => {
    const topComment = createMockComment(
      "Top comment",
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      BigInt(1000)
    );

    const reply = createMockComment(
      "Reply to top",
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      BigInt(2000),
      {
        sender: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        timestamp: 1000,
      }
    );

    (useNetMessageCount as any).mockReturnValue({
      count: 2,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [topComment, reply],
      isLoading: false,
    });

    const post = createMockPost();
    const { result } = renderHook(() =>
      useComments({
        chainId: BASE_CHAIN_ID,
        post,
      })
    );

    // Should have 1 top-level comment
    expect(result.current.comments.length).toBe(1);
    // With 1 reply
    expect(result.current.comments[0].replies.length).toBe(1);
    expect(result.current.comments[0].replies[0].text).toBe("Reply to top");
  });

  it("should set correct depth for nested comments", () => {
    const level0 = createMockComment(
      "Level 0",
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      BigInt(1000)
    );

    const level1 = createMockComment(
      "Level 1",
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      BigInt(2000),
      {
        sender: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        timestamp: 1000,
      }
    );

    const level2 = createMockComment(
      "Level 2",
      "0xcccccccccccccccccccccccccccccccccccccccc",
      BigInt(3000),
      {
        sender: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        timestamp: 2000,
      }
    );

    (useNetMessageCount as any).mockReturnValue({
      count: 3,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [level0, level1, level2],
      isLoading: false,
    });

    const post = createMockPost();
    const { result } = renderHook(() =>
      useComments({
        chainId: BASE_CHAIN_ID,
        post,
      })
    );

    expect(result.current.comments[0].depth).toBe(0);
    expect(result.current.comments[0].replies[0].depth).toBe(1);
    expect(result.current.comments[0].replies[0].replies[0].depth).toBe(2);
  });

  it("should cap depth at MAX_COMMENT_NESTING_DEPTH - 1", () => {
    const level0 = createMockComment(
      "Level 0",
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      BigInt(1000)
    );

    const level1 = createMockComment(
      "Level 1",
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      BigInt(2000),
      {
        sender: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        timestamp: 1000,
      }
    );

    const level2 = createMockComment(
      "Level 2",
      "0xcccccccccccccccccccccccccccccccccccccccc",
      BigInt(3000),
      {
        sender: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        timestamp: 2000,
      }
    );

    // This should be capped at depth 2 (MAX_COMMENT_NESTING_DEPTH - 1)
    const level3 = createMockComment(
      "Level 3 (should be capped)",
      "0xdddddddddddddddddddddddddddddddddddddddd",
      BigInt(4000),
      {
        sender: "0xcccccccccccccccccccccccccccccccccccccccc",
        timestamp: 3000,
      }
    );

    (useNetMessageCount as any).mockReturnValue({
      count: 4,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [level0, level1, level2, level3],
      isLoading: false,
    });

    const post = createMockPost();
    const { result } = renderHook(() =>
      useComments({
        chainId: BASE_CHAIN_ID,
        post,
      })
    );

    // Navigate to the deepest reply
    const deepestReply =
      result.current.comments[0].replies[0].replies[0].replies[0];
    // Should be capped at 2 (0, 1, 2 = 3 levels max)
    expect(deepestReply.depth).toBe(2);
  });

  it("should sort comments by timestamp (oldest first)", () => {
    const newer = createMockComment(
      "Newer",
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      BigInt(2000)
    );

    const older = createMockComment(
      "Older",
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      BigInt(1000)
    );

    (useNetMessageCount as any).mockReturnValue({
      count: 2,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [newer, older], // Out of order
      isLoading: false,
    });

    const post = createMockPost();
    const { result } = renderHook(() =>
      useComments({
        chainId: BASE_CHAIN_ID,
        post,
      })
    );

    expect(result.current.comments[0].text).toBe("Older");
    expect(result.current.comments[1].text).toBe("Newer");
  });

  it("should treat comments with missing parent as top-level", () => {
    const orphan = createMockComment(
      "Orphan reply",
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      BigInt(1000),
      {
        sender: "0x9999999999999999999999999999999999999999", // Non-existent parent
        timestamp: 999,
      }
    );

    (useNetMessageCount as any).mockReturnValue({
      count: 1,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [orphan],
      isLoading: false,
    });

    const post = createMockPost();
    const { result } = renderHook(() =>
      useComments({
        chainId: BASE_CHAIN_ID,
        post,
      })
    );

    // Should be treated as top-level
    expect(result.current.comments.length).toBe(1);
    expect(result.current.comments[0].depth).toBe(0);
  });

  it("should respect enabled flag", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 0,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    const post = createMockPost();
    renderHook(() =>
      useComments({
        chainId: BASE_CHAIN_ID,
        post,
        enabled: false,
      })
    );

    expect(useNetMessageCount).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it("should combine loading states", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 1,
      isLoading: true,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    const post = createMockPost();
    const { result } = renderHook(() =>
      useComments({
        chainId: BASE_CHAIN_ID,
        post,
      })
    );

    expect(result.current.isLoading).toBe(true);
  });

  it("should use default maxComments = 50", () => {
    (useNetMessageCount as any).mockReturnValue({
      count: 100,
      isLoading: false,
    });
    (useNetMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
    });

    const post = createMockPost();
    renderHook(() =>
      useComments({
        chainId: BASE_CHAIN_ID,
        post,
        // maxComments not provided
      })
    );

    expect(useNetMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        startIndex: 50, // 100 - 50
        endIndex: 100,
      })
    );
  });
});
