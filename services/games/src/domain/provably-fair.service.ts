export {
  ONE_HUNDREDTHS,
  calculateCrashPointHundredths,
  generateClientSeed,
  generateServerSeed,
  hashServerSeed,
  payoutCents,
  verify,
} from "@crash/provably-fair";

export type { SeedPair, VerifyResult } from "@crash/provably-fair";

import {
  calculateCrashPointHundredths,
  generateClientSeed,
  generateServerSeed,
  verify,
} from "@crash/provably-fair";

/** Nest-facing wrapper around `@crash/provably-fair`. */
export class ProvablyFairService {
  static generateServerSeed() {
    return generateServerSeed();
  }

  static generateClientSeed() {
    return generateClientSeed();
  }

  static calculateCrashPointHundredths(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
  ) {
    return calculateCrashPointHundredths(serverSeed, clientSeed, nonce);
  }

  static verify(
    serverSeed: string,
    serverSeedHash: string,
    clientSeed: string,
    nonce: number,
  ) {
    return verify(serverSeed, serverSeedHash, clientSeed, nonce);
  }
}
