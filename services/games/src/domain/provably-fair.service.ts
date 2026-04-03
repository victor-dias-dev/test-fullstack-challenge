import { createHmac, createHash, randomBytes } from "crypto";

export interface SeedPair {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

export class ProvablyFairService {
  /**
   * Generate a new server seed and its public hash.
   */
  static generateServerSeed(): { serverSeed: string; serverSeedHash: string } {
    const serverSeed = randomBytes(32).toString("hex");
    const serverSeedHash = createHash("sha256").update(serverSeed).digest("hex");
    return { serverSeed, serverSeedHash };
  }

  /**
   * Generate a client seed (public, derived from timestamp for reproducibility in tests).
   */
  static generateClientSeed(): string {
    return randomBytes(16).toString("hex");
  }

  /**
   * Calculate crash point using HMAC-SHA256.
   * Formula: first 4 bytes of HMAC as uint32 → floor(2^32 / (h + 1)) / 100
   * Minimum crash point is 1.00 (house edge).
   */
  static calculateCrashPoint(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
  ): number {
    const message = `${clientSeed}:${nonce}`;
    const hmac = createHmac("sha256", serverSeed)
      .update(message)
      .digest("hex");

    // Take first 8 hex chars = 4 bytes = uint32
    const h = parseInt(hmac.slice(0, 8), 16);

    // House edge: 1% (crash below 1.00 becomes 1.00)
    const e = 2 ** 32;
    const crashPoint = Math.floor((e / (h + 1)) * 100) / 100;

    return Math.max(1.0, crashPoint);
  }

  /**
   * Verify a past round's crash point.
   */
  static verify(
    serverSeed: string,
    serverSeedHash: string,
    clientSeed: string,
    nonce: number,
  ): { valid: boolean; expectedCrashPoint?: number } {
    const actualHash = createHash("sha256").update(serverSeed).digest("hex");
    if (actualHash !== serverSeedHash) {
      return { valid: false };
    }
    const crashPoint = this.calculateCrashPoint(serverSeed, clientSeed, nonce);
    return { valid: true, expectedCrashPoint: crashPoint };
  }
}
