import storageAbi from "./abis/storage.json";
import chunkedStorageAbi from "./abis/chunked-storage.json";
import chunkedStorageReaderAbi from "./abis/chunked-storage-reader.json";
import storageRouterAbi from "./abis/storage-router.json";
import safeStorageReaderAbi from "./abis/safe-storage-reader.json";
import type { Abi } from "viem";

export const STORAGE_CONTRACT = {
  abi: storageAbi as Abi,
  address: "0x00000000db40fcb9f4466330982372e27fd7bbf5" as `0x${string}`,
};

export const CHUNKED_STORAGE_CONTRACT = {
  abi: chunkedStorageAbi as Abi,
  address: "0x000000A822F09aF21b1951B65223F54ea392E6C6" as `0x${string}`,
};

export const CHUNKED_STORAGE_READER_CONTRACT = {
  abi: chunkedStorageReaderAbi as Abi,
  address: "0x00000005210a7532787419658f6162f771be62f8" as `0x${string}`,
};

export const STORAGE_ROUTER_CONTRACT = {
  abi: storageRouterAbi as Abi,
  address: "0x000000C0bbc2Ca04B85E77D18053e7c38bB97939" as `0x${string}`,
};

export const SAFE_STORAGE_READER_CONTRACT = {
  abi: safeStorageReaderAbi as Abi,
  address: "0x0000000d03bad401fae4935dc9cbbf8084347214" as `0x${string}`,
};
