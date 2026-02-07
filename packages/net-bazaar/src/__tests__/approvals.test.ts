import { describe, it, expect, vi } from "vitest";
import { checkErc721Approval, checkErc20Approval } from "../utils/approvals";

// Mock viem/actions
vi.mock("viem/actions", () => ({
  readContract: vi.fn(),
}));

import { readContract } from "viem/actions";

const NFT_ADDRESS = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`;
const TOKEN_ADDRESS = "0xcccccccccccccccccccccccccccccccccccccccc" as `0x${string}`;
const OWNER = "0x1234567890123456789012345678901234567890" as `0x${string}`;
const SPENDER = "0x0000000000000068F116a894984e2DB1123eB395" as `0x${string}`;

const mockClient = {} as any;

describe("checkErc721Approval", () => {
  it("returns null when already approved", async () => {
    vi.mocked(readContract).mockResolvedValueOnce(true);

    const result = await checkErc721Approval(mockClient, NFT_ADDRESS, OWNER, SPENDER);

    expect(result).toBeNull();
    expect(readContract).toHaveBeenCalledWith(mockClient, {
      address: NFT_ADDRESS,
      abi: expect.any(Array),
      functionName: "isApprovedForAll",
      args: [OWNER, SPENDER],
    });
  });

  it("returns setApprovalForAll tx when not approved", async () => {
    vi.mocked(readContract).mockResolvedValueOnce(false);

    const result = await checkErc721Approval(mockClient, NFT_ADDRESS, OWNER, SPENDER);

    expect(result).not.toBeNull();
    expect(result!.to).toBe(NFT_ADDRESS);
    expect(result!.functionName).toBe("setApprovalForAll");
    expect(result!.args).toEqual([SPENDER, true]);
  });
});

describe("checkErc20Approval", () => {
  it("returns null when allowance is sufficient", async () => {
    vi.mocked(readContract).mockResolvedValueOnce(BigInt("1000000000000000000"));

    const result = await checkErc20Approval(
      mockClient,
      TOKEN_ADDRESS,
      OWNER,
      SPENDER,
      BigInt("500000000000000000")
    );

    expect(result).toBeNull();
  });

  it("returns approve tx when allowance is insufficient", async () => {
    vi.mocked(readContract).mockResolvedValueOnce(BigInt("100"));

    const result = await checkErc20Approval(
      mockClient,
      TOKEN_ADDRESS,
      OWNER,
      SPENDER,
      BigInt("500000000000000000")
    );

    expect(result).not.toBeNull();
    expect(result!.to).toBe(TOKEN_ADDRESS);
    expect(result!.functionName).toBe("approve");
    expect(result!.args[0]).toBe(SPENDER);
    // Max uint256
    expect(result!.args[1]).toBe(
      BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")
    );
  });

  it("returns null when allowance exactly equals amount", async () => {
    vi.mocked(readContract).mockResolvedValueOnce(BigInt("500000000000000000"));

    const result = await checkErc20Approval(
      mockClient,
      TOKEN_ADDRESS,
      OWNER,
      SPENDER,
      BigInt("500000000000000000")
    );

    expect(result).toBeNull();
  });
});
