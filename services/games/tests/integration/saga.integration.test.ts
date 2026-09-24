import { execSync } from "node:child_process";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import amqplib from "amqplib";
import { DomainError, Bet, BetStatus } from "../../src/domain/round.entity";
import { PrismaRoundRepository } from "../../src/infrastructure/database/prisma-round.repository";
import { OutboxPublisher } from "../../src/infrastructure/messaging/outbox.publisher";
import { PrismaClient } from "../../src/infrastructure/database/generated";
import type { PrismaService } from "../../src/infrastructure/database/prisma.service";
import type { GameMessageBus } from "../../src/application/ports/game-message-bus.port";

const serviceRoot = path.resolve(__dirname, "../..");

describe("games saga", () => {
  let prisma: PrismaClient;
  let repo: PrismaRoundRepository;

  beforeAll(async () => {
    const databaseUrl = process.env.GAMES_DATABASE_URL ?? process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("GAMES_DATABASE_URL is required for integration tests");
    }
    process.env.DATABASE_URL = databaseUrl;
    execSync("bunx prisma migrate deploy", {
      cwd: serviceRoot,
      stdio: "inherit",
      env: process.env,
    });
    prisma = new PrismaClient();
    await prisma.$connect();
    repo = new PrismaRoundRepository(prisma as unknown as PrismaService);
  }, 60_000);

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    await prisma.outboxMessage.deleteMany();
    await prisma.bet.deleteMany();
    await prisma.round.deleteMany();
  });

  async function seedRound() {
    return prisma.round.create({
      data: {
        status: "BETTING",
        serverSeedHash: "hash",
        serverSeed: "seed",
        clientSeed: "client",
        nonce: 0,
        bettingEndsAt: new Date(Date.now() + 10_000),
      },
    });
  }

  function betFor(roundId: string, userId = "user-1", amountCents = 100n): Bet {
    return new Bet({
      id: crypto.randomUUID(),
      roundId,
      userId,
      username: userId,
      amountCents,
      createdAt: new Date(),
    });
  }

  it("keeps the debit unpublished until the broker accepts it", async () => {
    const round = await seedRound();
    const bet = betFor(round.id);
    await repo.createBetWithOutbox(bet, {
      routingKey: "wallet.debit",
      payload: {
        betId: bet.id,
        userId: bet.userId,
        amountCents: bet.amountCents.toString(),
        correlationId: "corr-1",
      },
    });

    const pending = await prisma.outboxMessage.findMany({ where: { publishedAt: null } });
    expect(pending).toHaveLength(1);

    const failing: GameMessageBus = {
      async publish() {
        throw new Error("broker down");
      },
      subscribe() {},
    };
    const broken = new OutboxPublisher(prisma as unknown as PrismaService, failing);
    await expect(broken.publishPending()).rejects.toThrow("broker down");
    expect(await prisma.outboxMessage.count({ where: { publishedAt: null } })).toBe(1);

    if (!process.env.RABBITMQ_URL) {
      throw new Error("RABBITMQ_URL is required for integration tests");
    }
    const conn = await amqplib.connect(process.env.RABBITMQ_URL);
    const channel = await conn.createChannel();
    await channel.assertExchange("crash-game", "topic", { durable: true });
    const queue = await channel.assertQueue("", { exclusive: true });
    await channel.bindQueue(queue.queue, "crash-game", "wallet.debit");

    const bus: GameMessageBus = {
      async publish(routingKey, payload) {
        channel.publish("crash-game", routingKey, Buffer.from(JSON.stringify(payload)), {
          persistent: true,
        });
      },
      subscribe() {},
    };
    const publisher = new OutboxPublisher(prisma as unknown as PrismaService, bus);
    expect(await publisher.publishPending()).toBe(1);

    const body = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("debit was not published")), 3000);
      void channel.consume(queue.queue, (msg) => {
        if (!msg) return;
        clearTimeout(timer);
        channel.ack(msg);
        resolve(JSON.parse(msg.content.toString()) as Record<string, unknown>);
      });
    });

    expect(body.betId).toBe(bet.id);
    expect(body.amountCents).toBe("100");
    expect(await prisma.outboxMessage.count({ where: { publishedAt: null } })).toBe(0);
    await channel.close();
    await conn.close();
  });

  it("rolls the outbox back when the bet insert fails", async () => {
    const bet = betFor(crypto.randomUUID());
    await expect(
      repo.createBetWithOutbox(bet, {
        routingKey: "wallet.debit",
        payload: { betId: bet.id },
      }),
    ).rejects.toThrow();
    expect(await prisma.outboxMessage.count()).toBe(0);
    expect(await prisma.bet.count()).toBe(0);
  });

  it("turns a duplicate bet into a domain error", async () => {
    const round = await seedRound();
    const first = betFor(round.id);
    await repo.createBetWithOutbox(first, {
      routingKey: "wallet.debit",
      payload: { betId: first.id, correlationId: "a" },
    });
    const second = betFor(round.id);
    await expect(
      repo.createBetWithOutbox(second, {
        routingKey: "wallet.debit",
        payload: { betId: second.id, correlationId: "b" },
      }),
    ).rejects.toThrow(DomainError);
    expect(await prisma.bet.count()).toBe(1);
    expect(await prisma.outboxMessage.count()).toBe(1);
  });

  it("stores an integer payout beside the credit message", async () => {
    const round = await seedRound();
    await prisma.round.update({ where: { id: round.id }, data: { status: "RUNNING" } });
    const stored = await prisma.bet.create({
      data: {
        roundId: round.id,
        userId: "user-1",
        username: "user-1",
        amountCents: 3n,
        status: "ACTIVE",
      },
    });
    const bet = new Bet({
      id: stored.id,
      roundId: round.id,
      userId: "user-1",
      username: "user-1",
      amountCents: 3n,
      status: BetStatus.ACTIVE,
      createdAt: stored.createdAt,
    });
    const payout = bet.cashout(150n);
    expect(payout).toBe(4n);

    await repo.cashOutWithOutbox(
      stored.id,
      { cashoutMultiplierHundredths: 150n, payoutCents: payout },
      {
        routingKey: "wallet.credit",
        payload: {
          betId: stored.id,
          userId: "user-1",
          amountCents: payout.toString(),
          correlationId: "cashout-1",
        },
      },
    );

    const row = await prisma.bet.findUniqueOrThrow({ where: { id: stored.id } });
    expect(row.payoutCents).toBe(4n);
    expect(row.cashoutMultiplierHundredths).toBe(150n);
    const message = await prisma.outboxMessage.findFirstOrThrow();
    expect(message.publishedAt).toBeNull();
    expect(message.payload).toMatchObject({ amountCents: "4" });
  });
});
