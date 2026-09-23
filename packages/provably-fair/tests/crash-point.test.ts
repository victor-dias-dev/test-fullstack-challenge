import { describe, expect, it } from "vitest";
import {
  calculateCrashPointHundredths,
  generateClientSeed,
  generateServerSeed,
  payoutCents,
  verify,
} from "../src/index";

describe("calculateCrashPointHundredths", () => {
  it("locks a known vector", () => {
    expect(calculateCrashPointHundredths("abc123seed", "client", 0)).toBe(116n);
  });

  it("is deterministic", () => {
    const first = calculateCrashPointHundredths("abc123seed", "client", 4);
    const second = calculateCrashPointHundredths("abc123seed", "client", 4);
    expect(first).toBe(second);
  });

  it("changes the point when the nonce changes", () => {
    const nonce0 = calculateCrashPointHundredths("abc123seed", "client", 0);
    const nonce1 = calculateCrashPointHundredths("abc123seed", "client", 1);
    expect(nonce0).not.toBe(nonce1);
    expect(nonce0).toBeGreaterThanOrEqual(100n);
    expect(nonce1).toBeGreaterThanOrEqual(100n);
  });

  it("never returns a point below 1.00x", () => {
    const { serverSeed } = generateServerSeed();
    const point = calculateCrashPointHundredths(serverSeed, "clientseed", 0);
    expect(point).toBeGreaterThanOrEqual(100n);
  });

  it("hits 1.00x on about 1% of draws", () => {
    const samples = 100_000;
    let instant = 0;
    for (let nonce = 0; nonce < samples; nonce++) {
      const point = calculateCrashPointHundredths("house-edge", "monte-carlo", nonce);
      if (point === 100n) instant++;
    }
    const rate = instant / samples;
    expect(rate).toBeGreaterThan(0.008);
    expect(rate).toBeLessThan(0.012);
  });
});

describe("verify", () => {
  it("accepts a seed that matches its published hash", () => {
    const { serverSeed, serverSeedHash } = generateServerSeed();
    const clientSeed = "test-client";
    const expected = calculateCrashPointHundredths(serverSeed, clientSeed, 0);
    const result = verify(serverSeed, serverSeedHash, clientSeed, 0);
    expect(result.valid).toBe(true);
    expect(result.expectedCrashPointHundredths).toBe(expected);
  });

  it("rejects a seed that does not match the published hash", () => {
    const { serverSeedHash } = generateServerSeed();
    const result = verify("wrong-seed", serverSeedHash, "client", 0);
    expect(result.valid).toBe(false);
    expect(result.expectedCrashPointHundredths).toBeUndefined();
  });

  it("lets anyone recompute a revealed round", () => {
    const { serverSeed, serverSeedHash } = generateServerSeed();
    const clientSeed = generateClientSeed();
    const crashPoint = calculateCrashPointHundredths(serverSeed, clientSeed, 0);
    const result = verify(serverSeed, serverSeedHash, clientSeed, 0);
    expect(result.valid).toBe(true);
    expect(result.expectedCrashPointHundredths).toBe(crashPoint);
  });
});

describe("payoutCents", () => {
  it("multiplies stake by hundredths and truncates", () => {
    expect(payoutCents(10_000n, 250n)).toBe(25_000n);
    expect(payoutCents(3n, 150n)).toBe(4n);
  });

  it("keeps exact cents past the float mantissa", () => {
    const stake = 10_000_000_000_000n;
    expect(payoutCents(stake, 150n)).toBe(15_000_000_000_000n);
  });

  it("rejects a multiplier below 1.00x", () => {
    expect(() => payoutCents(100n, 99n)).toThrow(/at least 1.00/);
  });
});
