import {
  BadRequestException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { ROUND_REPOSITORY } from "../domain/round.repository";
import type { RoundRepository } from "../domain/round.repository";
import { Bet, RoundStatus } from "../domain/round.entity";
import { RabbitMQService, ROUTING_KEYS } from "../infrastructure/messaging/rabbitmq.service";

export interface PlaceBetCommand {
  userId: string;
  username: string;
  amountCents: bigint;
}

@Injectable()
export class PlaceBetUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  async execute(command: PlaceBetCommand): Promise<{ betId: string; roundId: string }> {
    const round = await this.roundRepository.findCurrent();

    if (!round || round.status !== RoundStatus.BETTING) {
      throw new BadRequestException(
        "No active betting phase. Wait for the next round.",
      );
    }

    if (round.getBetByUserId(command.userId)) {
      throw new BadRequestException("You already have a bet in this round");
    }

    if (command.amountCents < 100n) {
      throw new BadRequestException("Minimum bet is 1.00 (100 cents)");
    }
    if (command.amountCents > 100000n) {
      throw new BadRequestException("Maximum bet is 1000.00 (100,000 cents)");
    }

    const betId = uuidv4();
    const correlationId = uuidv4();

    const bet = new Bet({
      id: betId,
      roundId: round.id,
      userId: command.userId,
      username: command.username,
      amountCents: command.amountCents,
      createdAt: new Date(),
    });

    await this.roundRepository.createBet(bet);

    // Publish debit request — wallet service responds via wallet.debited / wallet.debit.failed
    await this.rabbitMQ.publish(ROUTING_KEYS.WALLET_DEBIT, {
      betId,
      userId: command.userId,
      amountCents: command.amountCents.toString(),
      correlationId,
    });

    return { betId, roundId: round.id };
  }
}
