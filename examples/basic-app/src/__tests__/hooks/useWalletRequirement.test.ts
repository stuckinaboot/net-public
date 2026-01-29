import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWalletRequirement } from "@/hooks/useWalletRequirement";

// Mock wagmi's useAccount hook
vi.mock("wagmi", () => ({
  useAccount: vi.fn(),
}));

import { useAccount } from "wagmi";

const mockUseAccount = vi.mocked(useAccount);

describe("useWalletRequirement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when wallet is connected", () => {
    const connectedAddress = "0x1234567890123456789012345678901234567890";

    beforeEach(() => {
      mockUseAccount.mockReturnValue({
        address: connectedAddress as `0x${string}`,
        isConnected: true,
        isConnecting: false,
        isDisconnected: false,
        isReconnecting: false,
        status: "connected",
        addresses: [connectedAddress as `0x${string}`],
        chain: undefined,
        chainId: undefined,
        connector: undefined,
      });
    });

    it("returns isConnected as true", () => {
      const { result } = renderHook(() => useWalletRequirement());
      expect(result.current.isConnected).toBe(true);
    });

    it("returns isConnecting as false", () => {
      const { result } = renderHook(() => useWalletRequirement());
      expect(result.current.isConnecting).toBe(false);
    });

    it("returns the correct address", () => {
      const { result } = renderHook(() => useWalletRequirement());
      expect(result.current.address).toBe(connectedAddress);
    });

    it("returns requirementMessage as null", () => {
      const { result } = renderHook(() => useWalletRequirement());
      expect(result.current.requirementMessage).toBeNull();
    });
  });

  describe("when wallet is disconnected", () => {
    beforeEach(() => {
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        isConnecting: false,
        isDisconnected: true,
        isReconnecting: false,
        status: "disconnected",
        addresses: undefined,
        chain: undefined,
        chainId: undefined,
        connector: undefined,
      });
    });

    it("returns isConnected as false", () => {
      const { result } = renderHook(() => useWalletRequirement());
      expect(result.current.isConnected).toBe(false);
    });

    it("returns isConnecting as false", () => {
      const { result } = renderHook(() => useWalletRequirement());
      expect(result.current.isConnecting).toBe(false);
    });

    it("returns address as undefined", () => {
      const { result } = renderHook(() => useWalletRequirement());
      expect(result.current.address).toBeUndefined();
    });

    it("returns correct requirementMessage when disconnected", () => {
      const { result } = renderHook(() => useWalletRequirement());
      expect(result.current.requirementMessage).toBe(
        "Please connect your wallet to use this feature"
      );
    });
  });

  describe("when wallet is connecting", () => {
    beforeEach(() => {
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        isConnecting: true,
        isDisconnected: false,
        isReconnecting: false,
        status: "connecting",
        addresses: undefined,
        chain: undefined,
        chainId: undefined,
        connector: undefined,
      });
    });

    it("returns isConnected as false", () => {
      const { result } = renderHook(() => useWalletRequirement());
      expect(result.current.isConnected).toBe(false);
    });

    it("returns isConnecting as true", () => {
      const { result } = renderHook(() => useWalletRequirement());
      expect(result.current.isConnecting).toBe(true);
    });

    it("returns address as undefined while connecting", () => {
      const { result } = renderHook(() => useWalletRequirement());
      expect(result.current.address).toBeUndefined();
    });

    it("returns requirementMessage while connecting (not yet connected)", () => {
      const { result } = renderHook(() => useWalletRequirement());
      expect(result.current.requirementMessage).toBe(
        "Please connect your wallet to use this feature"
      );
    });
  });

  describe("when wallet is reconnecting", () => {
    const reconnectingAddress = "0xabcdef0123456789abcdef0123456789abcdef01";

    beforeEach(() => {
      mockUseAccount.mockReturnValue({
        address: reconnectingAddress as `0x${string}`,
        isConnected: true,
        isConnecting: false,
        isDisconnected: false,
        isReconnecting: true,
        status: "reconnecting",
        addresses: [reconnectingAddress as `0x${string}`],
        chain: undefined,
        chainId: undefined,
        connector: undefined,
      });
    });

    it("returns isConnected as true during reconnection", () => {
      const { result } = renderHook(() => useWalletRequirement());
      expect(result.current.isConnected).toBe(true);
    });

    it("returns the address during reconnection", () => {
      const { result } = renderHook(() => useWalletRequirement());
      expect(result.current.address).toBe(reconnectingAddress);
    });

    it("returns requirementMessage as null during reconnection (still connected)", () => {
      const { result } = renderHook(() => useWalletRequirement());
      expect(result.current.requirementMessage).toBeNull();
    });
  });
});
