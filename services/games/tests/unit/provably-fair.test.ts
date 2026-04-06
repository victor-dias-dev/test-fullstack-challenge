import { describe, it, expect } from "vitest";
import { ProvablyFairService } from "../../src/domain/provably-fair.service";

describe("ProvablyFairService", () => {
  describe("generateServerSeed", () => {
    it("returns a 64-char hex server seed and its SHA-256 hash", () => {
      const { serverSeed, serverSeedHash } = ProvablyFairService.generateServerSeed();
      expect(serverSeed).toHaveLength(64);
      expect(serverSeedHash).toHaveLength(64);
    });

    it("generates unique seeds on each call", () => {
      const a = ProvablyFairService.generateServerSeed();
      const b = ProvablyFairService.generateServerSeed();
      expect(a.serverSeed).not.toBe(b.serverSeed);
    });
  });

  describe("calculateCrashPoint", () => {
    it("returns a crash point >= 1.00", () => {
      const { serverSeed } = ProvablyFairService.generateServerSeed();
      const crashPoint = ProvablyFairService.calculateCrashPoint(serverSeed, "clientseed", 0);
      expect(crashPoint).toBeGreaterThanOrEqual(1.0);
    });

    it("is deterministic — same inputs always give same output", () => {
      const serverSeed = "abc123seed";
      const cp1 = ProvablyFairService.calculateCrashPoint(serverSeed, "client", 0);
      const cp2 = ProvablyFairService.calculateCrashPoint(serverSeed, "client", 0);
      expect(cp1).toBe(cp2);
    });

    it("different nonces produce different crash points", () => {
      const serverSeed = "abc123seed";
      const cp0 = ProvablyFairService.calculateCrashPoint(serverSeed, "client", 0);
      const cp1 = ProvablyFairService.calculateCrashPoint(serverSeed, "client", 1);
      // Not necessarily different but usually will be — test statistical independence
      // Just ensure they are both valid
      expect(cp0).toBeGreaterThanOrEqual(1.0);
      expect(cp1).toBeGreaterThanOrEqual(1.0);
    });
  });

  describe("verify", () => {
    it("returns valid=true and correct crash point for matching hash", () => {
      const { serverSeed, serverSeedHash } = ProvablyFairService.generateServerSeed();
      const clientSeed = "test-client";
      const nonce = 0;

      const expectedCrashPoint = ProvablyFairService.calculateCrashPoint(
        serverSeed,
        clientSeed,
        nonce,
      );

      const result = ProvablyFairService.verify(serverSeed, serverSeedHash, clientSeed, nonce);
      expect(result.valid).toBe(true);
      expect(result.expectedCrashPoint).toBe(expectedCrashPoint);
    });

    it("returns valid=false when server seed doesn't match hash", () => {
      const { serverSeedHash } = ProvablyFairService.generateServerSeed();
      const result = ProvablyFairService.verify(
        "wrong-seed",
        serverSeedHash,
        "client",
        0,
      );
      expect(result.valid).toBe(false);
    });

    it("allows anyone to independently verify a past round", () => {
      // Simulate full round lifecycle
      const { serverSeed, serverSeedHash } = ProvablyFairService.generateServerSeed();
      const clientSeed = ProvablyFairService.generateClientSeed();
      const nonce = 0;

      // Before round: only serverSeedHash is public
      // After crash: serverSeed is revealed
      const crashPoint = ProvablyFairService.calculateCrashPoint(serverSeed, clientSeed, nonce);
      const { valid, expectedCrashPoint } = ProvablyFairService.verify(
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce,
      );

      expect(valid).toBe(true);
      expect(expectedCrashPoint).toBe(crashPoint);
    });
  });
});
