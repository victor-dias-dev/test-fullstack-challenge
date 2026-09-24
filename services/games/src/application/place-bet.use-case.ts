import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { MAX_BET_CENTS, MIN_BET_CENTS } from "../domain/bet-limits";
import { Bet, DomainError, RoundStatus } from "../domain/round.entity";
import { MESSAGING_ROUTING_KEYS } from "../domain/messaging-routing-keys";
import { ROUND_REPOSITORY } from "../domain/round.repository";
import type { RoundRepository } from "../domain/round.repository";

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

    if (command.amountCents < MIN_BET_CENTS) {
      throw new BadRequestException("Minimum bet is 1.00 (100 cents)");
    }
    if (command.amountCents > MAX_BET_CENTS) {
      throw new BadRequestException("Maximum bet is 1000.00 (100000 cents)");
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

    try {
      await this.roundRepository.createBetWithOutbox(bet, {
        routingKey: MESSAGING_ROUTING_KEYS.WALLET_DEBIT,
        payload: {
          betId,
          userId: command.userId,
          amountCents: command.amountCents.toString(),
          correlationId,
        },
      });
    } catch (err) {
      if (err instanceof DomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    return { betId, roundId: round.id };
  }
}
