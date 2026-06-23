import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAgentRegistryContract,
  AGENT_REGISTRY_CONTRACT,
  AGENT_REGISTRY_CHAIN_IDS,
} from "../constants";
import { AgentRegistryClient } from "../client/AgentRegistryClient";
import { NetClient } from "@net-protocol/core";
import { BASE_CHAIN_ID } from "./test-utils";

const BASE_SEPOLIA_CHAIN_ID = 84532;

// Mock NetClient so AgentRegistryClient construction doesn't touch the network
vi.mock("@net-protocol/core", async () => {
  const actual = await vi.importActual("@net-protocol/core");
  return {
    ...actual,
    NetClient: vi.fn(),
  };
});

describe("AgentRegistry chain guard", () => {
  beforeEach(() => {
    (NetClient as any).mockImplementation(() => ({
      getMessageCount: vi.fn(),
      getMessages: vi.fn(),
    }));
  });

  describe("getAgentRegistryContract", () => {
    it("returns the contract on Base mainnet", () => {
      expect(getAgentRegistryContract(BASE_CHAIN_ID)).toBe(
        AGENT_REGISTRY_CONTRACT
      );
    });

    it("throws on Base Sepolia (not deployed there)", () => {
      expect(() => getAgentRegistryContract(BASE_SEPOLIA_CHAIN_ID)).toThrow(
        /AgentRegistry is not deployed on chain 84532/
      );
    });

    it("does not allowlist Base Sepolia", () => {
      expect(AGENT_REGISTRY_CHAIN_IDS).not.toContain(BASE_SEPOLIA_CHAIN_ID);
    });
  });

  describe("AgentRegistryClient", () => {
    it("constructs on Base mainnet", () => {
      expect(
        () => new AgentRegistryClient({ chainId: BASE_CHAIN_ID })
      ).not.toThrow();
    });

    it("throws when constructed for Base Sepolia", () => {
      expect(
        () => new AgentRegistryClient({ chainId: BASE_SEPOLIA_CHAIN_ID })
      ).toThrow(/AgentRegistry is not deployed on chain 84532/);
    });
  });
});
