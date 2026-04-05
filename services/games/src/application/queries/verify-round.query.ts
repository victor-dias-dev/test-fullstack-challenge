import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ROUND_REPOSITORY } from "../../domain/round.repository";
import type { RoundRepository } from "../../domain/round.repository";
import { ProvablyFairService } from "../../domain/provably-fair.service";

@Injectable()
export class VerifyRoundQuery {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
  ) {}

  async execute(roundId: string) {
    const round = await this.roundRepository.findById(roundId);
    if (!round) {
      throw new BadRequestException("Round not found");
    }
    if (round.status !== "CRASHED") {
      return {
        roundId,
        status: round.status,
        message: "Round not yet crashed — verification only available after crash",
      };
    }

    const { valid, expectedCrashPoint } = ProvablyFairService.verify(
      round.serverSeed,
      round.serverSeedHash,
      round.clientSeed,
      round.nonce,
    );

    return {
      roundId,
      valid,
      serverSeed: round.serverSeed,
      serverSeedHash: round.serverSeedHash,
      clientSeed: round.clientSeed,
      nonce: round.nonce,
      expectedCrashPoint,
      actualCrashPoint: round.crashPoint,
    };
  }
}
