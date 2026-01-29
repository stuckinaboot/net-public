import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { SendMessage } from "@/components/chat/SendMessage";
import { renderWithProviders } from "../test-utils";
import { NET_CONTRACT_ADDRESS } from "@/lib/constants";
import { NET_CONTRACT_ABI } from "@net-protocol/core";

// Mock wagmi hooks
vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useWriteContract: vi.fn(),
    useWaitForTransactionReceipt: vi.fn(),
  };
});

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";

const mockUseWriteContract = vi.mocked(useWriteContract);
const mockUseWaitForTransactionReceipt = vi.mocked(useWaitForTransactionReceipt);

describe("SendMessage", () => {
  const mockWriteContract = vi.fn();
  const defaultTopic = "general";

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseWriteContract.mockReturnValue({
      writeContract: mockWriteContract,
      writeContractAsync: vi.fn(),
      data: undefined,
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
      reset: vi.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      isPaused: false,
      status: "idle",
      submittedAt: 0,
      variables: undefined,
    });

    mockUseWaitForTransactionReceipt.mockReturnValue({
      data: undefined,
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      status: "pending",
      fetchStatus: "idle",
      isFetched: false,
      isFetching: false,
      isLoadingError: false,
      isPaused: false,
      isPending: true,
      isRefetchError: false,
      isRefetching: false,
      isStale: false,
      refetch: vi.fn(),
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      isPlaceholderData: false,
      queryKey: ["waitForTransactionReceipt"],
      promise: Promise.resolve(undefined as any),
    });
  });

  describe("message input", () => {
    it("renders the message textarea", () => {
      renderWithProviders(<SendMessage topic={defaultTopic} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      expect(textarea).toBeInTheDocument();
    });

    it("updates state when user types a message", () => {
      renderWithProviders(<SendMessage topic={defaultTopic} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      fireEvent.change(textarea, { target: { value: "Hello, blockchain!" } });

      expect(textarea).toHaveValue("Hello, blockchain!");
    });

    it("allows clearing the message", () => {
      renderWithProviders(<SendMessage topic={defaultTopic} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      fireEvent.change(textarea, { target: { value: "Test message" } });
      fireEvent.change(textarea, { target: { value: "" } });

      expect(textarea).toHaveValue("");
    });
  });

  describe("send button", () => {
    it("renders the send button", () => {
      renderWithProviders(<SendMessage topic={defaultTopic} />);

      const button = screen.getByRole("button", { name: /send/i });
      expect(button).toBeInTheDocument();
    });

    it("is disabled when message is empty", () => {
      renderWithProviders(<SendMessage topic={defaultTopic} />);

      const button = screen.getByRole("button", { name: /send/i });
      expect(button).toBeDisabled();
    });

    it("is disabled when message contains only whitespace", () => {
      renderWithProviders(<SendMessage topic={defaultTopic} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      fireEvent.change(textarea, { target: { value: "   " } });

      const button = screen.getByRole("button", { name: /send/i });
      expect(button).toBeDisabled();
    });

    it("is enabled when message has content", () => {
      renderWithProviders(<SendMessage topic={defaultTopic} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      fireEvent.change(textarea, { target: { value: "Valid message" } });

      const button = screen.getByRole("button", { name: /send/i });
      expect(button).toBeEnabled();
    });

    it("is disabled when transaction is pending", () => {
      mockUseWriteContract.mockReturnValue({
        writeContract: mockWriteContract,
        writeContractAsync: vi.fn(),
        data: undefined,
        isPending: true,
        isSuccess: false,
        isError: false,
        error: null,
        reset: vi.fn(),
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isIdle: false,
        isPaused: false,
        status: "pending",
        submittedAt: Date.now(),
        variables: undefined,
      });

      renderWithProviders(<SendMessage topic={defaultTopic} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      fireEvent.change(textarea, { target: { value: "Test message" } });

      const button = screen.getByRole("button", { name: /sending/i });
      expect(button).toBeDisabled();
    });

    it("is disabled when waiting for confirmation", () => {
      mockUseWriteContract.mockReturnValue({
        writeContract: mockWriteContract,
        writeContractAsync: vi.fn(),
        data: "0x123" as `0x${string}`,
        isPending: false,
        isSuccess: false,
        isError: false,
        error: null,
        reset: vi.fn(),
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isIdle: false,
        isPaused: false,
        status: "success",
        submittedAt: Date.now(),
        variables: undefined,
      });

      mockUseWaitForTransactionReceipt.mockReturnValue({
        data: undefined,
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
        status: "pending",
        fetchStatus: "fetching",
        isFetched: false,
        isFetching: true,
        isLoadingError: false,
        isPaused: false,
        isPending: false,
        isRefetchError: false,
        isRefetching: false,
        isStale: false,
        refetch: vi.fn(),
        failureCount: 0,
        failureReason: null,
        errorUpdateCount: 0,
        dataUpdatedAt: 0,
        errorUpdatedAt: 0,
        isPlaceholderData: false,
        queryKey: ["waitForTransactionReceipt"],
        promise: Promise.resolve(undefined as any),
      });

      renderWithProviders(<SendMessage topic={defaultTopic} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      fireEvent.change(textarea, { target: { value: "Test message" } });

      const button = screen.getByRole("button", { name: /sending/i });
      expect(button).toBeDisabled();
    });
  });

  describe("sending messages", () => {
    it("calls writeContract with correct arguments when send is clicked", () => {
      renderWithProviders(<SendMessage topic={defaultTopic} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      fireEvent.change(textarea, { target: { value: "Hello, World!" } });

      const button = screen.getByRole("button", { name: /send/i });
      fireEvent.click(button);

      expect(mockWriteContract).toHaveBeenCalledWith({
        address: NET_CONTRACT_ADDRESS,
        abi: NET_CONTRACT_ABI,
        functionName: "sendMessage",
        args: ["Hello, World!", "general", "0x"],
      });
    });

    it("passes the correct topic to writeContract", () => {
      renderWithProviders(<SendMessage topic="announcements" />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      fireEvent.change(textarea, { target: { value: "Important announcement" } });

      const button = screen.getByRole("button", { name: /send/i });
      fireEvent.click(button);

      expect(mockWriteContract).toHaveBeenCalledWith({
        address: NET_CONTRACT_ADDRESS,
        abi: NET_CONTRACT_ABI,
        functionName: "sendMessage",
        args: ["Important announcement", "announcements", "0x"],
      });
    });

    it("does not call writeContract when message is empty", () => {
      renderWithProviders(<SendMessage topic={defaultTopic} />);

      const button = screen.getByRole("button", { name: /send/i });

      // Force click even though button is disabled
      fireEvent.click(button);

      expect(mockWriteContract).not.toHaveBeenCalled();
    });
  });

  describe("transaction status messages", () => {
    it("shows 'Sending transaction...' when isPending is true", () => {
      mockUseWriteContract.mockReturnValue({
        writeContract: mockWriteContract,
        writeContractAsync: vi.fn(),
        data: undefined,
        isPending: true,
        isSuccess: false,
        isError: false,
        error: null,
        reset: vi.fn(),
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isIdle: false,
        isPaused: false,
        status: "pending",
        submittedAt: Date.now(),
        variables: undefined,
      });

      renderWithProviders(<SendMessage topic={defaultTopic} />);

      expect(screen.getByText("Sending transaction...")).toBeInTheDocument();
    });

    it("shows 'Waiting for confirmation...' when isLoading (confirming) is true", () => {
      mockUseWriteContract.mockReturnValue({
        writeContract: mockWriteContract,
        writeContractAsync: vi.fn(),
        data: "0x123" as `0x${string}`,
        isPending: false,
        isSuccess: false,
        isError: false,
        error: null,
        reset: vi.fn(),
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isIdle: false,
        isPaused: false,
        status: "success",
        submittedAt: Date.now(),
        variables: undefined,
      });

      mockUseWaitForTransactionReceipt.mockReturnValue({
        data: undefined,
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
        status: "pending",
        fetchStatus: "fetching",
        isFetched: false,
        isFetching: true,
        isLoadingError: false,
        isPaused: false,
        isPending: false,
        isRefetchError: false,
        isRefetching: false,
        isStale: false,
        refetch: vi.fn(),
        failureCount: 0,
        failureReason: null,
        errorUpdateCount: 0,
        dataUpdatedAt: 0,
        errorUpdatedAt: 0,
        isPlaceholderData: false,
        queryKey: ["waitForTransactionReceipt"],
        promise: Promise.resolve(undefined as any),
      });

      renderWithProviders(<SendMessage topic={defaultTopic} />);

      expect(screen.getByText("Waiting for confirmation...")).toBeInTheDocument();
    });

    it("shows 'Message sent!' when transaction is successful", () => {
      mockUseWaitForTransactionReceipt.mockReturnValue({
        data: {} as any,
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
        status: "success",
        fetchStatus: "idle",
        isFetched: true,
        isFetching: false,
        isLoadingError: false,
        isPaused: false,
        isPending: false,
        isRefetchError: false,
        isRefetching: false,
        isStale: false,
        refetch: vi.fn(),
        failureCount: 0,
        failureReason: null,
        errorUpdateCount: 0,
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        isPlaceholderData: false,
        queryKey: ["waitForTransactionReceipt"],
        promise: Promise.resolve(undefined as any),
      });

      renderWithProviders(<SendMessage topic={defaultTopic} />);

      expect(screen.getByText("Message sent!")).toBeInTheDocument();
    });

    it("shows error message when transaction fails", () => {
      const errorMessage = "User rejected the request";
      mockUseWriteContract.mockReturnValue({
        writeContract: mockWriteContract,
        writeContractAsync: vi.fn(),
        data: undefined,
        isPending: false,
        isSuccess: false,
        isError: true,
        error: new Error(errorMessage),
        reset: vi.fn(),
        context: undefined,
        failureCount: 1,
        failureReason: new Error(errorMessage),
        isIdle: false,
        isPaused: false,
        status: "error",
        submittedAt: Date.now(),
        variables: undefined,
      });

      renderWithProviders(<SendMessage topic={defaultTopic} />);

      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  describe("message clearing on success", () => {
    it("clears the message input after successful transaction", async () => {
      // First render with idle state so user can type
      const { rerender } = renderWithProviders(<SendMessage topic={defaultTopic} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      fireEvent.change(textarea, { target: { value: "Test message to clear" } });

      expect(textarea).toHaveValue("Test message to clear");

      // Now simulate successful transaction
      mockUseWaitForTransactionReceipt.mockReturnValue({
        data: {} as any,
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
        status: "success",
        fetchStatus: "idle",
        isFetched: true,
        isFetching: false,
        isLoadingError: false,
        isPaused: false,
        isPending: false,
        isRefetchError: false,
        isRefetching: false,
        isStale: false,
        refetch: vi.fn(),
        failureCount: 0,
        failureReason: null,
        errorUpdateCount: 0,
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        isPlaceholderData: false,
        queryKey: ["waitForTransactionReceipt"],
        promise: Promise.resolve(undefined as any),
      });

      // Rerender to trigger the success effect
      rerender(<SendMessage topic={defaultTopic} />);

      // The message should be cleared after successful transaction
      await waitFor(() => {
        expect(textarea).toHaveValue("");
      });
    });
  });

  describe("textarea disabled states", () => {
    it("disables textarea when transaction is pending", () => {
      mockUseWriteContract.mockReturnValue({
        writeContract: mockWriteContract,
        writeContractAsync: vi.fn(),
        data: undefined,
        isPending: true,
        isSuccess: false,
        isError: false,
        error: null,
        reset: vi.fn(),
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isIdle: false,
        isPaused: false,
        status: "pending",
        submittedAt: Date.now(),
        variables: undefined,
      });

      renderWithProviders(<SendMessage topic={defaultTopic} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      expect(textarea).toBeDisabled();
    });

    it("disables textarea when waiting for confirmation", () => {
      mockUseWriteContract.mockReturnValue({
        writeContract: mockWriteContract,
        writeContractAsync: vi.fn(),
        data: "0x123" as `0x${string}`,
        isPending: false,
        isSuccess: false,
        isError: false,
        error: null,
        reset: vi.fn(),
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isIdle: false,
        isPaused: false,
        status: "success",
        submittedAt: Date.now(),
        variables: undefined,
      });

      mockUseWaitForTransactionReceipt.mockReturnValue({
        data: undefined,
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
        status: "pending",
        fetchStatus: "fetching",
        isFetched: false,
        isFetching: true,
        isLoadingError: false,
        isPaused: false,
        isPending: false,
        isRefetchError: false,
        isRefetching: false,
        isStale: false,
        refetch: vi.fn(),
        failureCount: 0,
        failureReason: null,
        errorUpdateCount: 0,
        dataUpdatedAt: 0,
        errorUpdatedAt: 0,
        isPlaceholderData: false,
        queryKey: ["waitForTransactionReceipt"],
        promise: Promise.resolve(undefined as any),
      });

      renderWithProviders(<SendMessage topic={defaultTopic} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      expect(textarea).toBeDisabled();
    });

    it("enables textarea in idle state", () => {
      renderWithProviders(<SendMessage topic={defaultTopic} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      expect(textarea).toBeEnabled();
    });
  });
});
