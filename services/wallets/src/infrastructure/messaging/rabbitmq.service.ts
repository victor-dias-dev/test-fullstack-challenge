import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import * as amqplib from "amqplib";

export const EXCHANGE = "crash-game";

export const ROUTING_KEYS = {
  WALLET_DEBIT: "wallet.debit",
  WALLET_CREDIT: "wallet.credit",
  WALLET_DEBITED: "wallet.debited",
  WALLET_DEBIT_FAILED: "wallet.debit.failed",
  WALLET_CREDITED: "wallet.credited",
} as const;

type SubscribeHandler = (msg: Record<string, unknown>) => Promise<void>;

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqplib.ChannelModel | null = null;
  private channel: amqplib.Channel | null = null;
  private readonly handlers = new Map<string, SubscribeHandler>();

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    try { await this.channel?.close(); } catch { /* ignore */ }
    try { await this.connection?.close(); } catch { /* ignore */ }
  }

  private async connect(): Promise<void> {
    const url =
      process.env.RABBITMQ_URL ?? "amqp://admin:admin@rabbitmq:5672";

    let retries = 10;
    while (retries > 0) {
      try {
        const conn = await amqplib.connect(url);
        const ch = await conn.createChannel();

        await ch.assertExchange(EXCHANGE, "topic", { durable: true });

        // Assert queues for wallet service (receives debit/credit commands)
        const walletQueue = await ch.assertQueue("wallets.commands", {
          durable: true,
        });
        await ch.bindQueue(walletQueue.queue, EXCHANGE, ROUTING_KEYS.WALLET_DEBIT);
        await ch.bindQueue(walletQueue.queue, EXCHANGE, ROUTING_KEYS.WALLET_CREDIT);

        await ch.consume(walletQueue.queue, async (msg) => {
          if (!msg) return;
          try {
            const routingKey = msg.fields.routingKey;
            const content = JSON.parse(msg.content.toString()) as Record<string, unknown>;
            const handler = this.handlers.get(routingKey);
            if (handler) {
              await handler(content);
            }
            ch.ack(msg);
          } catch (err) {
            this.logger.error("Error processing message", err);
            ch.nack(msg, false, false);
          }
        });

        this.connection = conn;
        this.channel = ch;
        this.logger.log("Connected to RabbitMQ");
        return;
      } catch (err) {
        retries--;
        this.logger.warn(`RabbitMQ connection failed, retrying... (${retries} left)`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    throw new Error("Could not connect to RabbitMQ after multiple retries");
  }

  async publish(routingKey: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.channel) throw new Error("RabbitMQ channel not initialized");
    this.channel.publish(
      EXCHANGE,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true },
    );
  }

  subscribe(routingKey: string, handler: SubscribeHandler): void {
    this.handlers.set(routingKey, handler);
  }
}
