import {
  BadRequestException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { ROUND_REPOSITORY } from "../domain/round.repository";
import type { RoundRepository } from "../domain/round.repository";
import { Bet, RoundStatus } from "../domain/round.entity";
import { MESSAGING_ROUTING_KEYS } from "../domain/messaging-routing-keys";
import {
  GAME_MESSAGE_BUS,
  type GameMessageBus,
} from "./ports/game-message-bus.port";

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
    @Inject(GAME_MESSAGE_BUS)
    private readonly messageBus: GameMessageBus,
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
    if (command.amountCents > 1_000_000n) {
      throw new BadRequestException("Maximum bet is 10000.00 (1,000,000 cents)");
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
    await this.messageBus.publish(MESSAGING_ROUTING_KEYS.WALLET_DEBIT, {
      betId,
      userId: command.userId,
      amountCents: command.amountCents.toString(),
      correlationId,
    });

    return { betId, roundId: round.id };
  }
}
