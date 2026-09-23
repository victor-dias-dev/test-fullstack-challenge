import { Injectable } from "@nestjs/common";
import { Wallet } from "../../domain/wallet.entity";
import type { LedgerCommand, LedgerResult, WalletRepository } from "../../domain/wallet.repository";
import { PrismaService } from "./prisma.service";

@Injectable()
export class PrismaWalletRepository implements WalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<Wallet | null> {
    const record = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findById(id: string): Promise<Wallet | null> {
    const record = await this.prisma.wallet.findUnique({ where: { id } });
    if (!record) return null;
    return this.toDomain(record);
  }

  async save(wallet: Wallet): Promise<Wallet> {
    const record = await this.prisma.wallet.create({
      data: {
        id: wallet.id,
        userId: wallet.userId,
        username: wallet.username,
        balanceCents: wallet.balanceCents,
      },
    });
    return this.toDomain(record);
  }

  async applyDebit(command: LedgerCommand): Promise<LedgerResult> {
    return this.apply(command, "DEBIT");
  }

  async applyCredit(command: LedgerCommand): Promise<LedgerResult> {
    return this.apply(command, "CREDIT");
  }

  private async apply(
    command: LedgerCommand,
    kind: "DEBIT" | "CREDIT",
  ): Promise<LedgerResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${command.correlationId})::bigint)`;

      const existing = await tx.inboxMessage.findUnique({
        where: { correlationId: command.correlationId },
      });
      if (existing) {
        return {
          outcome: existing.outcome,
          reason: existing.reason ?? undefined,
        };
      }

      const rows =
        kind === "DEBIT"
          ? await tx.$queryRaw<Array<{ id: string; balanceCents: bigint }>>`
              UPDATE "wallets"
              SET "balanceCents" = "balanceCents" - ${command.amountCents},
                  "updatedAt" = NOW()
              WHERE "userId" = ${command.userId}
                AND "balanceCents" >= ${command.amountCents}
              RETURNING "id", "balanceCents"
            `
          : await tx.$queryRaw<Array<{ id: string; balanceCents: bigint }>>`
              UPDATE "wallets"
              SET "balanceCents" = "balanceCents" + ${command.amountCents},
                  "updatedAt" = NOW()
              WHERE "userId" = ${command.userId}
              RETURNING "id", "balanceCents"
            `;

      if (rows.length === 0) {
        const wallet = await tx.wallet.findUnique({ where: { userId: command.userId } });
        const reason = wallet ? "Insufficient funds" : "Wallet not found";
        await tx.inboxMessage.create({
          data: {
            correlationId: command.correlationId,
            kind,
            outcome: "REJECTED",
            reason,
          },
        });
        return { outcome: "REJECTED", reason };
      }

      await tx.transaction.create({
        data: {
          walletId: rows[0].id,
          type: kind,
          amountCents: command.amountCents,
          correlationId: command.correlationId,
          description: command.description,
        },
      });
      await tx.inboxMessage.create({
        data: {
          correlationId: command.correlationId,
          kind,
          outcome: "APPLIED",
        },
      });
      return { outcome: "APPLIED" };
    });
  }

  private toDomain(record: {
    id: string;
    userId: string;
    username: string;
    balanceCents: bigint;
    createdAt: Date;
  }): Wallet {
    return new Wallet({
      id: record.id,
      userId: record.userId,
      username: record.username,
      balanceCents: record.balanceCents,
      createdAt: record.createdAt,
    });
  }
}
