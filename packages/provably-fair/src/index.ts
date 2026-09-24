import { createHash, createHmac, randomBytes } from "crypto";

/** 1.00x, stored as integer hundredths. */
export const ONE_HUNDREDTHS = 100n;

/** 52-bit space used by the HMAC draw. */
const E = 1n << 52n;

/**
 * 1% of the 52-bit space crashes at exactly 1.00x.
 * `E / 100n` is the count of draws that belong to the house.
 */
const HOUSE_EDGE_CUTOFF = E / 100n;

export interface SeedPair {
  serverSeed: string;
  serverSeedHash: string;
}

export interface VerifyResult {
  valid: boolean;
  expectedCrashPointHundredths?: bigint;
}

export function generateServerSeed(): SeedPair {
  const serverSeed = randomBytes(32).toString("hex");
  const serverSeedHash = hashServerSeed(serverSeed);
  return { serverSeed, serverSeedHash };
}

export function generateClientSeed(): string {
  return randomBytes(16).toString("hex");
}

export function hashServerSeed(serverSeed: string): string {
  return createHash("sha256").update(serverSeed).digest("hex");
}

/**
 * Crash point in hundredths (100n = 1.00x).
 *
 * HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}`). The first 13 hex
 * characters are a 52-bit integer `h`.
 *
 * If `h < 2^52 / 100`, the round crashes at 1.00x (1% house edge).
 * Otherwise the point is `(100 * 2^52 - h) / (2^52 - h)`, integer division.
 */
export function calculateCrashPointHundredths(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): bigint {
  const hmac = createHmac("sha256", serverSeed)
    .update(`${clientSeed}:${nonce}`)
    .digest("hex");
  const h = BigInt(`0x${hmac.slice(0, 13)}`);

  if (h < HOUSE_EDGE_CUTOFF) return ONE_HUNDREDTHS;

  const hundredths = (100n * E - h) / (E - h);
  return hundredths < ONE_HUNDREDTHS ? ONE_HUNDREDTHS : hundredths;
}

export function verify(
  serverSeed: string,
  serverSeedHash: string,
  clientSeed: string,
  nonce: number,
): VerifyResult {
  if (hashServerSeed(serverSeed) !== serverSeedHash) {
    return { valid: false };
  }
  return {
    valid: true,
    expectedCrashPointHundredths: calculateCrashPointHundredths(
      serverSeed,
      clientSeed,
      nonce,
    ),
  };
}

/**
 * Stake in cents times a multiplier in hundredths, truncated toward zero.
 * `payoutCents(1000n, 250n)` is a 2.50x cashout of R$10.00 → 2500 cents.
 */
export function payoutCents(
  amountCents: bigint,
  multiplierHundredths: bigint,
): bigint {
  if (amountCents <= 0n) {
    throw new Error("Stake must be positive");
  }
  if (multiplierHundredths < ONE_HUNDREDTHS) {
    throw new Error("Multiplier must be at least 1.00");
  }
  return (amountCents * multiplierHundredths) / 100n;
}
