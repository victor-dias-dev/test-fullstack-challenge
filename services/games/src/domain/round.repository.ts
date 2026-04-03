import { Round, Bet } from "./round.entity";

export interface RoundRepository {
  findById(id: string): Promise<Round | null>;
  findCurrent(): Promise<Round | null>;
  findHistory(page: number, limit: number): Promise<{ rounds: Round[]; total: number }>;
  findBetById(betId: string): Promise<Bet | null>;
  findBetsByUserId(userId: string, page: number, limit: number): Promise<{ bets: Bet[]; total: number }>;
  save(round: Round): Promise<Round>;
  createBet(bet: Bet): Promise<void>;
  updateRoundStatus(round: Round): Promise<void>;
  updateBetStatus(
    betId: string,
    data: {
      status: string;
      cashoutMultiplier?: number;
      payoutCents?: bigint;
    },
  ): Promise<void>;
}

export const ROUND_REPOSITORY = Symbol("ROUND_REPOSITORY");
