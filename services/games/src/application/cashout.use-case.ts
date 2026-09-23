import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { ROUND_REPOSITORY } from "../domain/round.repository";
import type { RoundRepository } from "../domain/round.repository";
import { BetStatus, DomainError, RoundStatus } from "../domain/round.entity";
import { MESSAGING_ROUTING_KEYS } from "../domain/messaging-routing-keys";

export interface CashOutCommand {
  userId: string;
}

export interface CashOutResult {
  betId: string;
  multiplierHundredths: bigint;
  payoutCents: bigint;
}

@Injectable()
export class CashOutUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
  ) {}

  async execute(
    command: CashOutCommand,
    currentMultiplierHundredths: bigint,
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

    const payoutCents = round.cashOutBet(command.userId, currentMultiplierHundredths);
    const correlationId = uuidv4();

    try {
      await this.roundRepository.cashOutWithOutbox(
        bet.id,
        {
          cashoutMultiplierHundredths: currentMultiplierHundredths,
          payoutCents,
        },
        {
          routingKey: MESSAGING_ROUTING_KEYS.WALLET_CREDIT,
          payload: {
            betId: bet.id,
            userId: command.userId,
            amountCents: payoutCents.toString(),
            correlationId,
          },
        },
      );
    } catch (err) {
      if (err instanceof DomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    return {
      betId: bet.id,
      multiplierHundredths: currentMultiplierHundredths,
      payoutCents,
    };
  }
}
