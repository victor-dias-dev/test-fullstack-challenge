import { Round, Bet, BetStatus } from "./round.entity";

export interface LeaderboardEntry {
  userId: string;
  username: string;
  profitCents: bigint;
}

export interface OutboxCommand {
  routingKey: string;
  payload: Record<string, unknown>;
}

export interface RoundRepository {
  findById(id: string): Promise<Round | null>;
  findCurrent(): Promise<Round | null>;
  findHistory(page: number, limit: number): Promise<{ rounds: Round[]; total: number }>;
  findBetById(betId: string): Promise<Bet | null>;
  findBetsByUserId(userId: string, page: number, limit: number): Promise<{ bets: Bet[]; total: number }>;
  findLeaderboardByProfit(since: Date, limit: number): Promise<LeaderboardEntry[]>;
  save(round: Round): Promise<Round>;
  createBetWithOutbox(bet: Bet, outbox: OutboxCommand): Promise<void>;
  cashOutWithOutbox(
    betId: string,
    data: {
      cashoutMultiplierHundredths: bigint;
      payoutCents: bigint;
    },
    outbox: OutboxCommand,
  ): Promise<void>;
  updateRoundStatus(round: Round): Promise<void>;
  updateBetStatus(
    betId: string,
    data: {
      status: BetStatus;
      cashoutMultiplierHundredths?: bigint;
      payoutCents?: bigint;
    },
  ): Promise<void>;
}

export const ROUND_REPOSITORY = Symbol("ROUND_REPOSITORY");
