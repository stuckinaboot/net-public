"use client";

import { useState, useEffect } from "react";
import { parseEther } from "viem";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  getNetrContract,
  DEFAULT_TOTAL_SUPPLY,
  DEFAULT_INITIAL_TICK,
  ZERO_ADDRESS,
  getInitialTick,
} from "@net-protocol/netr";

const BASE_CHAIN_ID = 8453;
const MIN_INITIAL_BUY = 0.0001;

interface TokenLaunchFormProps {
  deployerAddress: `0x${string}`;
}

/**
 * TokenLaunchForm component - Form for deploying new tokens
 *
 * User inputs:
 * - Token name
 * - Token symbol
 * - Initial buy amount (ETH)
 *
 * Uses SDK defaults for other parameters:
 * - DEFAULT_TOTAL_SUPPLY (100B tokens)
 * - CHAIN_INITIAL_TICKS for chain-specific initial tick
 * - Empty image/animation (no NFT drop)
 * - 0 for mintPrice/mintEndTimestamp/maxMintSupply (no NFT minting)
 */
export function TokenLaunchForm({ deployerAddress }: TokenLaunchFormProps) {
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [initialBuyAmount, setInitialBuyAmount] = useState("0.001");
  const [deployedAddress, setDeployedAddress] = useState<`0x${string}` | null>(
    null,
  );

  const netrContract = getNetrContract(BASE_CHAIN_ID);

  // Generate salt for deployment
  const {
    data: saltResult,
    isLoading: isSaltLoading,
    refetch: refetchSalt,
  } = useReadContract({
    address: netrContract.address,
    abi: netrContract.abi,
    functionName: "generateSalt",
    args: [
      deployerAddress,
      BigInt(0), // fid
      tokenName,
      tokenSymbol,
      "", // image
      "", // animation
      ZERO_ADDRESS, // metadataAddress
      "", // extraStringData
      DEFAULT_TOTAL_SUPPLY,
    ],
    chainId: BASE_CHAIN_ID,
    query: {
      enabled: tokenName.length > 0 && tokenSymbol.length > 0,
    },
  });

  const salt = (saltResult as [string, string] | undefined)?.[0] as
    | `0x${string}`
    | undefined;
  const predictedAddress = (saltResult as [string, string] | undefined)?.[1] as
    | `0x${string}`
    | undefined;

  // Deploy token transaction
  const {
    writeContract,
    data: txHash,
    isPending: isDeploying,
    error: deployError,
    reset: resetDeploy,
  } = useWriteContract();

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  // Set deployed address when confirmed
  useEffect(() => {
    if (isConfirmed && predictedAddress) {
      setDeployedAddress(predictedAddress);
    }
  }, [isConfirmed, predictedAddress]);

  const handleDeploy = () => {
    if (!salt) return;

    const buyAmountNum = parseFloat(initialBuyAmount);
    if (isNaN(buyAmountNum) || buyAmountNum < MIN_INITIAL_BUY) {
      alert(`Initial buy amount must be at least ${MIN_INITIAL_BUY} ETH`);
      return;
    }

    writeContract({
      address: netrContract.address,
      abi: netrContract.abi,
      functionName: "deployToken",
      args: [
        DEFAULT_TOTAL_SUPPLY, // supply
        getInitialTick(BASE_CHAIN_ID) ?? DEFAULT_INITIAL_TICK, // initialTick
        salt, // from generateSalt
        deployerAddress, // deployer
        BigInt(0), // fid (0 for non-Farcaster)
        BigInt(0), // mintPrice (no NFT)
        BigInt(0), // mintEndTimestamp
        BigInt(0), // maxMintSupply
        tokenName, // user input
        tokenSymbol, // user input
        "", // image (empty)
        "", // animation (empty)
        ZERO_ADDRESS, // metadataAddress
        "", // extraStringData
      ],
      value: parseEther(initialBuyAmount),
      chainId: BASE_CHAIN_ID,
    });
  };

  const handleReset = () => {
    setTokenName("");
    setTokenSymbol("");
    setInitialBuyAmount("0.001");
    setDeployedAddress(null);
    resetDeploy();
  };

  // Validation
  const isFormValid =
    tokenName.trim().length > 0 &&
    tokenSymbol.trim().length > 0 &&
    parseFloat(initialBuyAmount) >= MIN_INITIAL_BUY &&
    salt !== undefined;

  // Success state
  if (deployedAddress) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-6">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-4">
            Token Deployed Successfully!
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Token Address
              </p>
              <p className="font-mono text-sm break-all text-green-800 dark:text-green-200">
                {deployedAddress}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <a
                href={`https://dexscreener.com/base/${deployedAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center"
              >
                View on DEXScreener
              </a>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Launch Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="space-y-4">
        {/* Token Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Token Name
          </label>
          <input
            type="text"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            placeholder="My Token"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isDeploying || isConfirming}
          />
        </div>

        {/* Token Symbol */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Token Symbol
          </label>
          <input
            type="text"
            value={tokenSymbol}
            onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
            placeholder="MTK"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isDeploying || isConfirming}
          />
        </div>

        {/* Initial Buy Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Initial Buy Amount (ETH)
          </label>
          <input
            type="number"
            value={initialBuyAmount}
            onChange={(e) => setInitialBuyAmount(e.target.value)}
            min={MIN_INITIAL_BUY}
            step="0.001"
            placeholder="0.001"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isDeploying || isConfirming}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Minimum: {MIN_INITIAL_BUY} ETH
          </p>
        </div>

        {/* Predicted Address */}
        {predictedAddress && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Predicted Token Address
            </p>
            <p className="font-mono text-xs break-all text-gray-700 dark:text-gray-300">
              {predictedAddress}
            </p>
          </div>
        )}

        {/* Error Display */}
        {deployError && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">
              {deployError.message.includes("User rejected")
                ? "Transaction was rejected"
                : "Failed to deploy token. Please try again."}
            </p>
          </div>
        )}

        {/* Deploy Button */}
        <button
          onClick={handleDeploy}
          disabled={
            !isFormValid || isDeploying || isConfirming || isSaltLoading
          }
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSaltLoading
            ? "Preparing..."
            : isDeploying
              ? "Confirm in Wallet..."
              : isConfirming
                ? "Deploying..."
                : "Deploy Token"}
        </button>

        {/* Info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>* Token will be deployed on Base with 100B total supply</p>
          <p>* Initial market cap: ~$35,000</p>
          <p>* Liquidity is automatically locked</p>
        </div>
      </div>
    </div>
  );
}
