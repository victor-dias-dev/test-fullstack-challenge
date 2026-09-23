import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { GAME_MESSAGE_BUS, type GameMessageBus } from "../../application/ports/game-message-bus.port";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class OutboxPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisher.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(GAME_MESSAGE_BUS)
    private readonly messageBus: GameMessageBus,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.publishPending();
    this.timer = setInterval(() => {
      void this.publishPending().catch((err) => {
        this.logger.error("Outbox publish failed", err);
      });
    }, 200);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async publishPending(): Promise<number> {
    const rows = await this.prisma.outboxMessage.findMany({
      where: { publishedAt: null },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    let published = 0;
    for (const row of rows) {
      const payload = row.payload;
      if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
        this.logger.error(`Outbox ${row.id} has a payload that is not an object`);
        continue;
      }
      await this.messageBus.publish(row.routingKey, payload as Record<string, unknown>);
      await this.prisma.outboxMessage.update({
        where: { id: row.id },
        data: { publishedAt: new Date() },
      });
      published++;
    }
    return published;
  }
}
