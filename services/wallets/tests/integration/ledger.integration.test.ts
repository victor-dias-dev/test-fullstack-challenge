import { execSync } from "node:child_process";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DebitWalletUseCase } from "../../src/application/debit-wallet.use-case";
import { CreditWalletUseCase } from "../../src/application/credit-wallet.use-case";
import { PrismaWalletRepository } from "../../src/infrastructure/database/prisma-wallet.repository";
import { PrismaClient } from "../../src/infrastructure/database/generated";
import type { PrismaService } from "../../src/infrastructure/database/prisma.service";
import { debitEvent, creditEvent } from "../../src/infrastructure/messaging/wallet-events.consumer";

const serviceRoot = path.resolve(__dirname, "../..");

describe("wallet ledger", () => {
  let prisma: PrismaClient;
  let debit: DebitWalletUseCase;
  let credit: CreditWalletUseCase;

  beforeAll(async () => {
    const databaseUrl = process.env.WALLETS_DATABASE_URL ?? process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("WALLETS_DATABASE_URL is required for integration tests");
    }
    process.env.DATABASE_URL = databaseUrl;
    execSync("bunx prisma migrate deploy", {
      cwd: serviceRoot,
      stdio: "inherit",
      env: process.env,
    });
    prisma = new PrismaClient();
    await prisma.$connect();
    const repo = new PrismaWalletRepository(prisma as unknown as PrismaService);
    debit = new DebitWalletUseCase(repo);
    credit = new CreditWalletUseCase(repo);
  }, 60_000);

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    await prisma.inboxMessage.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.wallet.deleteMany();
  });

  async function balanceOf(userId: string): Promise<bigint> {
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    return wallet.balanceCents;
  }

  it("does not move money twice and republishes the same debit result", async () => {
    await prisma.wallet.create({
      data: { userId: "user-1", username: "player", balanceCents: 1_000n },
    });
    const message = {
      betId: "bet-1",
      userId: "user-1",
      amountCents: "400",
      correlationId: "debit-1",
    };

    const first = await debit.execute({
      userId: "user-1",
      amountCents: 400n,
      correlationId: "debit-1",
      description: "Bet bet-1",
    });
    const second = await debit.execute({
      userId: "user-1",
      amountCents: 400n,
      correlationId: "debit-1",
      description: "Bet bet-1",
    });

    expect(first.outcome).toBe("APPLIED");
    expect(second.outcome).toBe("APPLIED");
    expect(await balanceOf("user-1")).toBe(600n);
    expect(debitEvent(first, message).routingKey).toBe("wallet.debited");
    expect(debitEvent(second, message).routingKey).toBe("wallet.debited");
    expect(await prisma.transaction.count()).toBe(1);
  });

  it("rejects an overdraft and republishes the failure", async () => {
    await prisma.wallet.create({
      data: { userId: "user-1", username: "player", balanceCents: 100n },
    });
    const message = {
      betId: "bet-2",
      userId: "user-1",
      amountCents: "500",
      correlationId: "debit-2",
    };

    const first = await debit.execute({
      userId: "user-1",
      amountCents: 500n,
      correlationId: "debit-2",
    });
    const second = await debit.execute({
      userId: "user-1",
      amountCents: 500n,
      correlationId: "debit-2",
    });

    expect(first).toMatchObject({ outcome: "REJECTED", reason: "Insufficient funds" });
    expect(second.outcome).toBe("REJECTED");
    expect(await balanceOf("user-1")).toBe(100n);
    expect(debitEvent(first, message).routingKey).toBe("wallet.debit.failed");
    expect(debitEvent(second, message).routingKey).toBe("wallet.debit.failed");
    expect(await prisma.transaction.count()).toBe(0);
  });

  it("credits once and republishes the credit", async () => {
    await prisma.wallet.create({
      data: { userId: "user-1", username: "player", balanceCents: 100n },
    });
    const message = {
      betId: "bet-3",
      userId: "user-1",
      amountCents: "50",
      correlationId: "credit-1",
    };

    const first = await credit.execute({
      userId: "user-1",
      amountCents: 50n,
      correlationId: "credit-1",
    });
    const second = await credit.execute({
      userId: "user-1",
      amountCents: 50n,
      correlationId: "credit-1",
    });

    expect(await balanceOf("user-1")).toBe(150n);
    expect(creditEvent(first, message)?.routingKey).toBe("wallet.credited");
    expect(creditEvent(second, message)?.routingKey).toBe("wallet.credited");
    expect(await prisma.transaction.count()).toBe(1);
  });

  it("lets only one of two racing debits spend the same cents", async () => {
    await prisma.wallet.create({
      data: { userId: "user-1", username: "player", balanceCents: 100n },
    });

    const results = await Promise.all([
      debit.execute({ userId: "user-1", amountCents: 80n, correlationId: "race-a" }),
      debit.execute({ userId: "user-1", amountCents: 80n, correlationId: "race-b" }),
    ]);

    const applied = results.filter((result) => result.outcome === "APPLIED");
    const rejected = results.filter((result) => result.outcome === "REJECTED");
    expect(applied).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(await balanceOf("user-1")).toBe(20n);
  });
});
