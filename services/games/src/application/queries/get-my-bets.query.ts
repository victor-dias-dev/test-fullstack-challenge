import { Inject, Injectable } from "@nestjs/common";
import { ROUND_REPOSITORY } from "../../domain/round.repository";
import type { RoundRepository } from "../../domain/round.repository";

@Injectable()
export class GetMyBetsQuery {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
  ) {}

  async execute(userId: string, page: number, limit: number) {
    const { bets, total } = await this.roundRepository.findBetsByUserId(
      userId,
      page,
      limit,
    );

    return {
      data: bets.map((b) => ({
        id: b.id,
        roundId: b.roundId,
        amountCents: b.amountCents.toString(),
        status: b.status,
        cashoutMultiplier: b.cashoutMultiplier,
        payoutCents: b.payoutCents?.toString() ?? null,
        createdAt: b.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }
}
