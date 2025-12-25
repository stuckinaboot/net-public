"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { stringToHex } from "viem";
import { STORAGE_CONTRACT } from "@net-protocol/storage";
import { getStorageKeyBytes } from "@net-protocol/storage";

interface UploadFormProps {
  onSuccess?: () => void;
}

/**
 * UploadForm component for storing data on the blockchain
 * 
 * Demonstrates:
 * - Using Net Storage contract to store key-value data
 * - Converting strings to proper format for storage (bytes32 key, hex value)
 * - Transaction handling with wagmi
 * 
 * Storage.put signature:
 * function put(bytes32 key, string text, bytes value)
 */
export function UploadForm({ onSuccess }: UploadFormProps) {
  const [keyInput, setKeyInput] = useState("");
  const [valueInput, setValueInput] = useState("");
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleUpload = async () => {
    if (!keyInput.trim() || !valueInput.trim()) return;

    try {
      // Convert inputs to proper format for Storage contract
      const storageKey = getStorageKeyBytes(keyInput); // Converts string to bytes32
      const storageValue = stringToHex(valueInput); // Converts string to hex

      writeContract({
        address: STORAGE_CONTRACT.address,
        abi: STORAGE_CONTRACT.abi,
        functionName: "put",
        args: [
          storageKey,    // bytes32 key
          keyInput,      // string text (human-readable description/filename)
          storageValue,  // bytes value (the actual data in hex format)
        ],
      });
    } catch (err) {
      console.error("Failed to upload:", err);
    }
  };

  // Clear form on successful transaction
  if (isSuccess && (keyInput || valueInput)) {
    setKeyInput("");
    setValueInput("");
    onSuccess?.();
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <label htmlFor="key-input" className="block text-sm font-medium mb-2">
          Key / Filename
        </label>
        <input
          id="key-input"
          type="text"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder="my-data"
          disabled={isPending || isConfirming}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          A unique identifier for your data (e.g., "my-notes", "config.json")
        </p>
      </div>

      <div>
        <label htmlFor="value-input" className="block text-sm font-medium mb-2">
          Content / Value
        </label>
        <textarea
          id="value-input"
          value={valueInput}
          onChange={(e) => setValueInput(e.target.value)}
          placeholder="Enter your data here..."
          disabled={isPending || isConfirming}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={6}
        />
        <p className="text-xs text-gray-500 mt-1">
          The data you want to store (text, JSON, etc.)
        </p>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-sm">
          {isPending && <span className="text-yellow-600">Uploading to blockchain...</span>}
          {isConfirming && <span className="text-blue-600">Confirming transaction...</span>}
          {isSuccess && <span className="text-green-600">Successfully stored!</span>}
          {error && <span className="text-red-600">Error: {error.message}</span>}
        </div>

        <button
          onClick={handleUpload}
          disabled={!keyInput.trim() || !valueInput.trim() || isPending || isConfirming}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
        >
          {isPending || isConfirming ? "Storing..." : "Store Data"}
        </button>
      </div>
    </div>
  );
}

