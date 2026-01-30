import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFeedRegistry, useIsFeedRegistered } from "../hooks/useFeedRegistry";
import { useReadContract } from "wagmi";
import { BASE_CHAIN_ID } from "./test-utils";
import { FEED_REGISTRY_CONTRACT, MAX_FEED_NAME_LENGTH } from "../constants";

// Mock wagmi
vi.mock("wagmi", async () => {
  const actual = await vi.importActual("wagmi");
  return {
    ...actual,
    useReadContract: vi.fn(),
  };
});

describe("useFeedRegistry", () => {
  describe("validateFeedName", () => {
    it("should return valid for a normal feed name", () => {
      const { result } = renderHook(() =>
        useFeedRegistry({ chainId: BASE_CHAIN_ID })
      );

      const validation = result.current.validateFeedName("crypto");
      expect(validation.isValid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it("should return invalid for empty feed name", () => {
      const { result } = renderHook(() =>
        useFeedRegistry({ chainId: BASE_CHAIN_ID })
      );

      const validation = result.current.validateFeedName("");
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("Feed name cannot be empty");
    });

    it("should return invalid for feed name exceeding max length", () => {
      const { result } = renderHook(() =>
        useFeedRegistry({ chainId: BASE_CHAIN_ID })
      );

      const longName = "a".repeat(MAX_FEED_NAME_LENGTH + 1);
      const validation = result.current.validateFeedName(longName);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe(
        `Feed name cannot exceed ${MAX_FEED_NAME_LENGTH} characters`
      );
    });

    it("should return valid for max length feed name", () => {
      const { result } = renderHook(() =>
        useFeedRegistry({ chainId: BASE_CHAIN_ID })
      );

      const maxLengthName = "a".repeat(MAX_FEED_NAME_LENGTH);
      const validation = result.current.validateFeedName(maxLengthName);
      expect(validation.isValid).toBe(true);
    });
  });

  describe("prepareRegisterFeed", () => {
    it("should prepare registration transaction config", () => {
      const { result } = renderHook(() =>
        useFeedRegistry({ chainId: BASE_CHAIN_ID })
      );

      const config = result.current.prepareRegisterFeed({
        feedName: "crypto",
        description: "A feed about cryptocurrency",
      });

      expect(config.to).toBe(FEED_REGISTRY_CONTRACT.address);
      expect(config.functionName).toBe("registerFeed");
      expect(config.args).toEqual(["crypto", "A feed about cryptocurrency"]);
    });

    it("should use empty string for missing description", () => {
      const { result } = renderHook(() =>
        useFeedRegistry({ chainId: BASE_CHAIN_ID })
      );

      const config = result.current.prepareRegisterFeed({
        feedName: "crypto",
      });

      expect(config.args).toEqual(["crypto", ""]);
    });

    it("should throw error for invalid feed name", () => {
      const { result } = renderHook(() =>
        useFeedRegistry({ chainId: BASE_CHAIN_ID })
      );

      expect(() => result.current.prepareRegisterFeed({ feedName: "" })).toThrow(
        "Feed name cannot be empty"
      );
    });
  });

  describe("contractAddress", () => {
    it("should return the contract address", () => {
      const { result } = renderHook(() =>
        useFeedRegistry({ chainId: BASE_CHAIN_ID })
      );

      expect(result.current.contractAddress).toBe(FEED_REGISTRY_CONTRACT.address);
    });
  });

  describe("maxFeedNameLength", () => {
    it("should return the max feed name length", () => {
      const { result } = renderHook(() =>
        useFeedRegistry({ chainId: BASE_CHAIN_ID })
      );

      expect(result.current.maxFeedNameLength).toBe(MAX_FEED_NAME_LENGTH);
    });
  });
});

describe("useIsFeedRegistered", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call useReadContract with correct parameters", () => {
    (useReadContract as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      refetch: vi.fn(),
    });

    renderHook(() =>
      useIsFeedRegistered({
        chainId: BASE_CHAIN_ID,
        feedName: "crypto",
      })
    );

    expect(useReadContract).toHaveBeenCalledWith({
      address: FEED_REGISTRY_CONTRACT.address,
      abi: FEED_REGISTRY_CONTRACT.abi,
      functionName: "isFeedRegistered",
      args: ["crypto"],
      chainId: BASE_CHAIN_ID,
      query: {
        enabled: true,
      },
    });
  });

  it("should return isRegistered as true when data is true", () => {
    (useReadContract as any).mockReturnValue({
      data: true,
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() =>
      useIsFeedRegistered({
        chainId: BASE_CHAIN_ID,
        feedName: "crypto",
      })
    );

    expect(result.current.isRegistered).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("should return isRegistered as false when data is false", () => {
    (useReadContract as any).mockReturnValue({
      data: false,
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() =>
      useIsFeedRegistered({
        chainId: BASE_CHAIN_ID,
        feedName: "unregistered",
      })
    );

    expect(result.current.isRegistered).toBe(false);
  });

  it("should disable query when feedName is empty", () => {
    (useReadContract as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    renderHook(() =>
      useIsFeedRegistered({
        chainId: BASE_CHAIN_ID,
        feedName: "",
      })
    );

    expect(useReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          enabled: false,
        },
      })
    );
  });

  it("should disable query when enabled is false", () => {
    (useReadContract as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    renderHook(() =>
      useIsFeedRegistered({
        chainId: BASE_CHAIN_ID,
        feedName: "crypto",
        enabled: false,
      })
    );

    expect(useReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          enabled: false,
        },
      })
    );
  });

  it("should expose refetch function", () => {
    const mockRefetch = vi.fn();
    (useReadContract as any).mockReturnValue({
      data: true,
      isLoading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() =>
      useIsFeedRegistered({
        chainId: BASE_CHAIN_ID,
        feedName: "crypto",
      })
    );

    expect(result.current.refetch).toBe(mockRefetch);
  });

  it("should expose error when present", () => {
    const mockError = new Error("Contract call failed");
    (useReadContract as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() =>
      useIsFeedRegistered({
        chainId: BASE_CHAIN_ID,
        feedName: "crypto",
      })
    );

    expect(result.current.error).toBe(mockError);
  });
});
