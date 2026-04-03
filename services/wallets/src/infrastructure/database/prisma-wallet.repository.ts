import { Injectable } from "@nestjs/common";
import { Wallet } from "../../domain/wallet.entity";
import type { WalletRepository } from "../../domain/wallet.repository";
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

  async updateBalance(
    walletId: string,
    balanceCents: bigint,
    transaction: {
      type: "CREDIT" | "DEBIT";
      amountCents: bigint;
      correlationId?: string;
      description?: string;
    },
  ): Promise<Wallet> {
    const [, wallet] = await this.prisma.$transaction([
      this.prisma.transaction.create({
        data: {
          walletId,
          type: transaction.type,
          amountCents: transaction.amountCents,
          correlationId: transaction.correlationId,
          description: transaction.description,
        },
      }),
      this.prisma.wallet.update({
        where: { id: walletId },
        data: { balanceCents },
      }),
    ]);
    return this.toDomain(wallet);
  }

  async existsByCorrelationId(correlationId: string): Promise<boolean> {
    const count = await this.prisma.transaction.count({
      where: { correlationId },
    });
    return count > 0;
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
