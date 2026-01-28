import type { NetrStorageData } from "../types";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function decodeBangerStorageData(storageValue: string | undefined): NetrStorageData | null {
  if (!storageValue || storageValue.length < 66) return null;

  try {
    const messageIndex = BigInt(storageValue.substring(0, 66));

    let dropIndex: bigint | undefined;
    let dropAddress: `0x${string}` | undefined;

    if (storageValue.length >= 130) {
      const rawDropIndex = BigInt("0x" + storageValue.substring(66, 130));
      dropIndex = rawDropIndex > 0n ? rawDropIndex : undefined;
    }

    if (storageValue.length >= 170 && dropIndex !== undefined) {
      const rawAddress = ("0x" + storageValue.substring(154, 194)) as `0x${string}`;
      dropAddress = rawAddress !== ZERO_ADDRESS ? rawAddress : undefined;
    }

    return {
      messageIndex,
      dropIndex,
      dropAddress,
      poolAddress: undefined,
      lockerAddress: undefined,
    };
  } catch {
    return null;
  }
}

export function extractAddressesFromMessageData(messageData: string | undefined): {
  poolAddress: `0x${string}` | undefined;
  lockerAddress: `0x${string}` | undefined;
} {
  if (!messageData || messageData.length < 130) {
    return { poolAddress: undefined, lockerAddress: undefined };
  }

  try {
    const poolAddress = ("0x" + messageData.substring(90, 130)) as `0x${string}`;
    const lockerAddress =
      messageData.length >= 170
        ? (("0x" + messageData.substring(130, 170)) as `0x${string}`)
        : undefined;

    return {
      poolAddress: poolAddress !== ZERO_ADDRESS ? poolAddress : undefined,
      lockerAddress: lockerAddress && lockerAddress !== ZERO_ADDRESS ? lockerAddress : undefined,
    };
  } catch {
    return { poolAddress: undefined, lockerAddress: undefined };
  }
}

export function completeStorageData(
  storageData: NetrStorageData | null,
  messageData: string | undefined
): NetrStorageData | null {
  if (!storageData) return null;

  const { poolAddress, lockerAddress } = extractAddressesFromMessageData(messageData);
  return { ...storageData, poolAddress, lockerAddress };
}
