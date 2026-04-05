import { Inject, Injectable } from "@nestjs/common";
import { ROUND_REPOSITORY } from "../../domain/round.repository";
import type { RoundRepository } from "../../domain/round.repository";
import { RoundLifecycleService } from "../round-lifecycle.service";

@Injectable()
export class GetCurrentRoundQuery {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
    private readonly lifecycle: RoundLifecycleService,
  ) {}

  async execute() {
    const round = await this.roundRepository.findCurrent();
    if (!round) return { round: null };

    return {
      round: {
        id: round.id,
        status: round.status,
        serverSeedHash: round.serverSeedHash,
        bettingEndsAt: round.bettingEndsAt.toISOString(),
        startedAt: round.startedAt?.toISOString() ?? null,
        currentMultiplier:
          round.status === "RUNNING"
            ? this.lifecycle.getCurrentMultiplier()
            : null,
        bets: round.bets.map((b) => ({
          id: b.id,
          username: b.username,
          amountCents: b.amountCents.toString(),
          status: b.status,
          cashoutMultiplier: b.cashoutMultiplier,
          payoutCents: b.payoutCents?.toString() ?? null,
        })),
      },
    };
  }
}
