import { Injectable } from "@nestjs/common";
import type { RoundRepository } from "../../domain/round.repository";
import { Round, Bet, RoundStatus, BetStatus } from "../../domain/round.entity";
import { PrismaService } from "./prisma.service";
import type { Round as PrismaRound, Bet as PrismaBet } from "./generated";

@Injectable()
export class PrismaRoundRepository implements RoundRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Round | null> {
    const record = await this.prisma.round.findUnique({
      where: { id },
      include: { bets: true },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findCurrent(): Promise<Round | null> {
    const record = await this.prisma.round.findFirst({
      where: { status: { in: ["BETTING", "RUNNING"] } },
      orderBy: { createdAt: "desc" },
      include: { bets: true },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findHistory(
    page: number,
    limit: number,
  ): Promise<{ rounds: Round[]; total: number }> {
    const [records, total] = await Promise.all([
      this.prisma.round.findMany({
        where: { status: "CRASHED" },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { bets: true },
      }),
      this.prisma.round.count({ where: { status: "CRASHED" } }),
    ]);
    return {
      rounds: records.map((r) => this.toDomain(r)),
      total,
    };
  }

  async findBetById(betId: string): Promise<Bet | null> {
    const record = await this.prisma.bet.findUnique({ where: { id: betId } });
    if (!record) return null;
    return this.betToDomain(record);
  }

  async findBetsByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ bets: Bet[]; total: number }> {
    const [records, total] = await Promise.all([
      this.prisma.bet.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.bet.count({ where: { userId } }),
    ]);
    return { bets: records.map((b) => this.betToDomain(b)), total };
  }

  async save(round: Round): Promise<Round> {
    const record = await this.prisma.round.create({
      data: {
        id: round.id,
        status: round.status,
        serverSeed: round.serverSeed,
        serverSeedHash: round.serverSeedHash,
        clientSeed: round.clientSeed,
        nonce: round.nonce,
        bettingEndsAt: round.bettingEndsAt,
      },
      include: { bets: true },
    });
    return this.toDomain(record);
  }

  async createBet(bet: Bet): Promise<void> {
    await this.prisma.bet.create({
      data: {
        id: bet.id,
        roundId: bet.roundId,
        userId: bet.userId,
        username: bet.username,
        amountCents: bet.amountCents,
        status: bet.status,
      },
    });
  }

  async updateRoundStatus(round: Round): Promise<void> {
    await this.prisma.round.update({
      where: { id: round.id },
      data: {
        status: round.status,
        crashPoint: round.crashPoint,
        startedAt: round.startedAt,
        crashedAt: round.crashedAt,
      },
    });
  }

  async updateBetStatus(
    betId: string,
    data: { status: string; cashoutMultiplier?: number; payoutCents?: bigint },
  ): Promise<void> {
    await this.prisma.bet.update({
      where: { id: betId },
      data: {
        status: data.status as BetStatus,
        cashoutMultiplier: data.cashoutMultiplier,
        payoutCents: data.payoutCents,
      },
    });
  }

  private toDomain(record: PrismaRound & { bets: PrismaBet[] }): Round {
    const bets = record.bets.map((b) => this.betToDomain(b));
    return new Round({
      id: record.id,
      status: record.status as RoundStatus,
      crashPoint: record.crashPoint ?? null,
      serverSeed: record.serverSeed ?? "",
      serverSeedHash: record.serverSeedHash,
      clientSeed: record.clientSeed,
      nonce: record.nonce,
      bettingEndsAt: record.bettingEndsAt,
      startedAt: record.startedAt ?? null,
      crashedAt: record.crashedAt ?? null,
      createdAt: record.createdAt,
      bets,
    });
  }

  private betToDomain(b: PrismaBet): Bet {
    return new Bet({
      id: b.id,
      roundId: b.roundId,
      userId: b.userId,
      username: b.username,
      amountCents: b.amountCents,
      status: b.status as BetStatus,
      cashoutMultiplier: b.cashoutMultiplier ?? null,
      payoutCents: b.payoutCents ?? null,
      createdAt: b.createdAt,
    });
  }
}
