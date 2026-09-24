import { describe, it, expect } from "vitest";
import { ProvablyFairService } from "../../src/domain/provably-fair.service";

describe("ProvablyFairService", () => {
  it("returns a 64-char hex server seed and its SHA-256 hash", () => {
    const { serverSeed, serverSeedHash } = ProvablyFairService.generateServerSeed();
    expect(serverSeed).toHaveLength(64);
    expect(serverSeedHash).toHaveLength(64);
  });

  it("exposes the integer crash point from the shared package", () => {
    const point = ProvablyFairService.calculateCrashPointHundredths("abc123seed", "client", 0);
    expect(point).toBe(116n);
  });

  it("rejects a seed that does not match the published hash", () => {
    const { serverSeedHash } = ProvablyFairService.generateServerSeed();
    const result = ProvablyFairService.verify("wrong-seed", serverSeedHash, "client", 0);
    expect(result.valid).toBe(false);
  });
});
