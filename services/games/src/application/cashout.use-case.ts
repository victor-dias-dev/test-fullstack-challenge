import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { ROUND_REPOSITORY } from "../domain/round.repository";
import type { RoundRepository } from "../domain/round.repository";
import { BetStatus, RoundStatus } from "../domain/round.entity";
import { RabbitMQService, ROUTING_KEYS } from "../infrastructure/messaging/rabbitmq.service";

export interface CashOutCommand {
  userId: string;
}

export interface CashOutResult {
  betId: string;
  multiplier: number;
  payoutCents: bigint;
}

@Injectable()
export class CashOutUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  async execute(
    command: CashOutCommand,
    currentMultiplier: number,
  ): Promise<CashOutResult> {
    const round = await this.roundRepository.findCurrent();

    if (!round || round.status !== RoundStatus.RUNNING) {
      throw new BadRequestException("No active round to cash out from");
    }

    const bet = round.getBetByUserId(command.userId);
    if (!bet) {
      throw new NotFoundException("No bet found in this round for your account");
    }

    if (bet.status !== BetStatus.ACTIVE) {
      throw new BadRequestException(
        "You have already cashed out or your bet is not active",
      );
    }

    const payoutCents = round.cashOutBet(command.userId, currentMultiplier);
    const correlationId = uuidv4();

    await this.roundRepository.updateBetStatus(bet.id, {
      status: BetStatus.WON,
      cashoutMultiplier: currentMultiplier,
      payoutCents,
    });

    await this.rabbitMQ.publish(ROUTING_KEYS.WALLET_CREDIT, {
      betId: bet.id,
      userId: command.userId,
      amountCents: payoutCents.toString(),
      correlationId,
    });

    return { betId: bet.id, multiplier: currentMultiplier, payoutCents };
  }
}
