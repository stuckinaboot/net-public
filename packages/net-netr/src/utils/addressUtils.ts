import { isHex, pad } from "viem";

export function addressToBytes32(address: string): `0x${string}` {
  const normalized = address.toLowerCase();
  const withPrefix = normalized.startsWith("0x") ? normalized : `0x${normalized}`;

  if (!isHex(withPrefix)) {
    throw new Error(`Invalid address format: ${address}`);
  }

  return pad(withPrefix as `0x${string}`, { size: 32 });
}

export function isValidAddress(address: string): boolean {
  if (!address) return false;

  const normalized = address.toLowerCase();
  const withPrefix = normalized.startsWith("0x") ? normalized : `0x${normalized}`;

  return withPrefix.length === 42 && isHex(withPrefix);
}

export function bytes32ToAddress(bytes32: string): `0x${string}` {
  if (!bytes32 || bytes32.length < 66) {
    throw new Error(`Invalid bytes32 format: ${bytes32}`);
  }

  return `0x${bytes32.slice(-40)}` as `0x${string}`;
}
