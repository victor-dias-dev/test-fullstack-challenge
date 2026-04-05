import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RabbitMQService, ROUTING_KEYS } from "./rabbitmq.service";
import { DebitWalletUseCase } from "../../application/debit-wallet.use-case";
import { CreditWalletUseCase } from "../../application/credit-wallet.use-case";

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

    if (result.success) {
      await this.rabbitMQ.publish(ROUTING_KEYS.WALLET_DEBITED, {
        betId: msg.betId,
        userId: msg.userId,
        correlationId: msg.correlationId,
      });
    } else {
      await this.rabbitMQ.publish(ROUTING_KEYS.WALLET_DEBIT_FAILED, {
        betId: msg.betId,
        userId: msg.userId,
        correlationId: msg.correlationId,
        reason: result.error,
      });
    }
  }

  private async handleCredit(msg: CreditMessage): Promise<void> {
    this.logger.log(`Processing credit for bet ${msg.betId}`);

    await this.creditWallet.execute({
      userId: msg.userId,
      amountCents: BigInt(String(msg.amountCents)),
      correlationId: msg.correlationId,
      description: `Cashout bet ${msg.betId}`,
    });

    await this.rabbitMQ.publish(ROUTING_KEYS.WALLET_CREDITED, {
      betId: msg.betId,
      userId: msg.userId,
      correlationId: msg.correlationId,
    });
  }
}
