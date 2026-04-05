import { Inject, Injectable } from "@nestjs/common";
import { ROUND_REPOSITORY } from "../../domain/round.repository";
import type { RoundRepository } from "../../domain/round.repository";

export type LeaderboardPeriod = "24h" | "week";

@Injectable()
export class GetLeaderboardQuery {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
  ) {}

  async execute(period: string) {
    const normalized: LeaderboardPeriod = period === "week" ? "week" : "24h";
    const now = Date.now();
    const since =
      normalized === "week"
        ? new Date(now - 7 * 24 * 60 * 60 * 1000)
        : new Date(now - 24 * 60 * 60 * 1000);

    const entries = await this.roundRepository.findLeaderboardByProfit(since, 20);

    return {
      period: normalized,
      since: since.toISOString(),
      entries: entries.map((e, i) => ({
        rank: i + 1,
        userId: e.userId,
        username: e.username,
        profitCents: e.profitCents.toString(),
      })),
    };
  }
}
