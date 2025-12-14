import { Abi } from "viem";
import netAbi from "./abis/net.json";

// Base Net contract ABI (same across all chains)
export const NET_CONTRACT_ABI = netAbi as Abi;

// Note: Contract address is chain-specific and retrieved via getNetContract(chainId)
// This constant is kept for backward compatibility but should use getNetContract() instead
export const NET_CONTRACT_ADDRESS = "0x00000000B24D62781dB359b07880a105cD0b64e6" as const;

