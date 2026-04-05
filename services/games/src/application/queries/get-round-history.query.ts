import { Inject, Injectable } from "@nestjs/common";
import { ROUND_REPOSITORY } from "../../domain/round.repository";
import type { RoundRepository } from "../../domain/round.repository";

@Injectable()
export class GetRoundHistoryQuery {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
  ) {}

  async execute(page: number, limit: number) {
    const { rounds, total } = await this.roundRepository.findHistory(page, limit);

    return {
      data: rounds.map((r) => ({
        id: r.id,
        crashPoint: r.crashPoint,
        crashedAt: r.crashedAt?.toISOString() ?? null,
        serverSeedHash: r.serverSeedHash,
      })),
      total,
      page,
      limit,
    };
  }
}
