import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RabbitMQService, ROUTING_KEYS } from "./rabbitmq.service";
import { DebitWalletUseCase } from "../../application/debit-wallet.use-case";
import { CreditWalletUseCase } from "../../application/credit-wallet.use-case";
import type { LedgerResult } from "../../domain/wallet.repository";

interface DebitMessage {
  betId: string;
  userId: string;
  /** Serialized bigint cents (games service publishes string). */
  amountCents: string;
  correlationId: string;
}

interface CreditMessage {
  betId: string;
  userId: string;
  /** Serialized bigint cents (games service publishes string). */
  amountCents: string;
  correlationId: string;
}

export interface WalletEvent {
  routingKey: string;
  payload: Record<string, unknown>;
}

export function debitEvent(result: LedgerResult, msg: DebitMessage): WalletEvent {
  if (result.outcome === "APPLIED") {
    return {
      routingKey: ROUTING_KEYS.WALLET_DEBITED,
      payload: {
        betId: msg.betId,
        userId: msg.userId,
        correlationId: msg.correlationId,
      },
    };
  }
  return {
    routingKey: ROUTING_KEYS.WALLET_DEBIT_FAILED,
    payload: {
      betId: msg.betId,
      userId: msg.userId,
      correlationId: msg.correlationId,
      reason: result.reason,
    },
  };
}

export function creditEvent(result: LedgerResult, msg: CreditMessage): WalletEvent | null {
  if (result.outcome !== "APPLIED") return null;
  return {
    routingKey: ROUTING_KEYS.WALLET_CREDITED,
    payload: {
      betId: msg.betId,
      userId: msg.userId,
      correlationId: msg.correlationId,
    },
  };
}

@Injectable()
export class WalletEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(WalletEventsConsumer.name);

  constructor(
    private readonly rabbitMQ: RabbitMQService,
    private readonly debitWallet: DebitWalletUseCase,
    private readonly creditWallet: CreditWalletUseCase,
  ) {}

  onModuleInit(): void {
    this.rabbitMQ.subscribe(
      ROUTING_KEYS.WALLET_DEBIT,
      async (msg) => await this.handleDebit(msg as unknown as DebitMessage),
    );

    this.rabbitMQ.subscribe(
      ROUTING_KEYS.WALLET_CREDIT,
      async (msg) => await this.handleCredit(msg as unknown as CreditMessage),
    );
  }

  private async handleDebit(msg: DebitMessage): Promise<void> {
    this.logger.log(`Processing debit for bet ${msg.betId}`);

    const result = await this.debitWallet.execute({
      userId: msg.userId,
      amountCents: BigInt(String(msg.amountCents)),
      correlationId: msg.correlationId,
      description: `Bet ${msg.betId}`,
    });

    const event = debitEvent(result, msg);
    await this.rabbitMQ.publish(event.routingKey, event.payload);
  }

  private async handleCredit(msg: CreditMessage): Promise<void> {
    this.logger.log(`Processing credit for bet ${msg.betId}`);

    const result = await this.creditWallet.execute({
      userId: msg.userId,
      amountCents: BigInt(String(msg.amountCents)),
      correlationId: msg.correlationId,
      description: `Cashout bet ${msg.betId}`,
    });

    const event = creditEvent(result, msg);
    if (!event) {
      this.logger.warn(`Credit ${msg.correlationId} rejected: ${result.reason}`);
      return;
    }
    await this.rabbitMQ.publish(event.routingKey, event.payload);
  }
}
