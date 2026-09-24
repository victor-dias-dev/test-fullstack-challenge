import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { ROUND_REPOSITORY } from "../domain/round.repository";
import type { RoundRepository } from "../domain/round.repository";
import { Round, BetStatus } from "../domain/round.entity";
import { ProvablyFairService } from "../domain/provably-fair.service";
import { MESSAGING_ROUTING_KEYS } from "../domain/messaging-routing-keys";
import {
  GAME_MESSAGE_BUS,
  type GameMessageBus,
} from "./ports/game-message-bus.port";

const BETTING_PHASE_MS = 10_000;
const MULTIPLIER_TICK_MS = 100;

@Injectable()
export class RoundLifecycleService implements OnModuleInit {
  private readonly logger = new Logger(RoundLifecycleService.name);
  private currentMultiplierHundredths = 100n;
  private roundStartTime = 0;
  private currentRoundId: string | null = null;
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  private onMultiplierTick?: (multiplierHundredths: bigint, elapsed: number) => void;
  private onRoundCrashed?: (roundId: string, crashPointHundredths: bigint, round: Round) => void;
  private onRoundBetting?: (round: Round, endsAt: Date) => void;
  private onRoundStarted?: (round: Round) => void;
  private onBetActivated?: (bet: { id: string; roundId: string; userId: string; username: string; amountCents: bigint }) => void;
  private onBetCancelled?: (betId: string, userId: string) => void;

  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
    @Inject(GAME_MESSAGE_BUS)
    private readonly messageBus: GameMessageBus,
  ) {}

  async onModuleInit(): Promise<void> {
    this.messageBus.subscribe(
      MESSAGING_ROUTING_KEYS.WALLET_DEBITED,
      async (msg) => await this.handleWalletDebited(msg),
    );
    this.messageBus.subscribe(
      MESSAGING_ROUTING_KEYS.WALLET_DEBIT_FAILED,
      async (msg) => await this.handleWalletDebitFailed(msg),
    );

    setTimeout(() => this.startNewRound(), 1000);
  }

  setCallbacks(callbacks: {
    onMultiplierTick?: (multiplierHundredths: bigint, elapsed: number) => void;
    onRoundCrashed?: (roundId: string, crashPointHundredths: bigint, round: Round) => void;
    onRoundBetting?: (round: Round, endsAt: Date) => void;
    onRoundStarted?: (round: Round) => void;
    onBetActivated?: (bet: { id: string; roundId: string; userId: string; username: string; amountCents: bigint }) => void;
    onBetCancelled?: (betId: string, userId: string) => void;
  }): void {
    this.onMultiplierTick = callbacks.onMultiplierTick;
    this.onRoundCrashed = callbacks.onRoundCrashed;
    this.onRoundBetting = callbacks.onRoundBetting;
    this.onRoundStarted = callbacks.onRoundStarted;
    this.onBetActivated = callbacks.onBetActivated;
    this.onBetCancelled = callbacks.onBetCancelled;
  }

  /** Display value derived from the published integer hundredths. */
  getCurrentMultiplier(): number {
    return Number(this.currentMultiplierHundredths) / 100;
  }

  getCurrentMultiplierHundredths(): bigint {
    return this.currentMultiplierHundredths;
  }

  getCurrentRoundId(): string | null {
    return this.currentRoundId;
  }

  private async startNewRound(): Promise<void> {
    try {
      const { serverSeed, serverSeedHash } = ProvablyFairService.generateServerSeed();
      const clientSeed = ProvablyFairService.generateClientSeed();
      const nonce = 0;
      const crashPointHundredths = ProvablyFairService.calculateCrashPointHundredths(
        serverSeed,
        clientSeed,
        nonce,
      );
      const bettingEndsAt = new Date(Date.now() + BETTING_PHASE_MS);

      const round = new Round({
        id: uuidv4(),
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce,
        bettingEndsAt,
        createdAt: new Date(),
      });

      await this.roundRepository.save(round);
      this.currentRoundId = round.id;
      this.logger.log(
        `New round ${round.id} — crash at ${crashPointHundredths} hundredths (hidden)`,
      );

      this.onRoundBetting?.(round, bettingEndsAt);

      await this.delay(BETTING_PHASE_MS);

      round.start();
      await this.roundRepository.updateRoundStatus(round);
      this.onRoundStarted?.(round);

      this.roundStartTime = Date.now();
      this.currentMultiplierHundredths = 100n;

      await new Promise<void>((resolve) => {
        this.tickInterval = setInterval(async () => {
          const elapsed = Date.now() - this.roundStartTime;
          this.currentMultiplierHundredths = this.computeMultiplierHundredths(elapsed);

          this.onMultiplierTick?.(this.currentMultiplierHundredths, elapsed);

          if (this.currentMultiplierHundredths >= crashPointHundredths) {
            clearInterval(this.tickInterval!);
            this.tickInterval = null;
            await this.handleCrash(round, crashPointHundredths);
            resolve();
          }
        }, MULTIPLIER_TICK_MS);
      });

      await this.delay(3000);
      void this.startNewRound();
    } catch (err) {
      this.logger.error("Round lifecycle error", err);
      await this.delay(5000);
      void this.startNewRound();
    }
  }

  private async handleCrash(round: Round, crashPointHundredths: bigint): Promise<void> {
    const freshRound = await this.roundRepository.findById(round.id);
    if (!freshRound) return;

    const losingBets = freshRound.crash(crashPointHundredths);
    await this.roundRepository.updateRoundStatus(freshRound);

    for (const bet of losingBets) {
      await this.roundRepository.updateBetStatus(bet.id, { status: BetStatus.LOST });
    }

    this.onRoundCrashed?.(freshRound.id, crashPointHundredths, freshRound);
    this.logger.log(`Round ${freshRound.id} crashed at ${crashPointHundredths} hundredths`);
  }

  private async handleWalletDebited(msg: Record<string, unknown>): Promise<void> {
    const betId = msg.betId as string;
    const bet = await this.roundRepository.findBetById(betId);
    if (!bet) return;
    if (bet.status !== BetStatus.PENDING) return;

    await this.roundRepository.updateBetStatus(betId, { status: BetStatus.ACTIVE });
    this.onBetActivated?.({
      id: bet.id,
      roundId: bet.roundId,
      userId: bet.userId,
      username: bet.username,
      amountCents: bet.amountCents,
    });
  }

  private async handleWalletDebitFailed(msg: Record<string, unknown>): Promise<void> {
    const betId = msg.betId as string;
    const userId = msg.userId as string;
    const bet = await this.roundRepository.findBetById(betId);
    if (!bet || bet.status !== BetStatus.PENDING) return;

    await this.roundRepository.updateBetStatus(betId, { status: BetStatus.CANCELLED });
    this.onBetCancelled?.(betId, userId);
  }

  private computeMultiplierHundredths(elapsedMs: number): bigint {
    const hundredths = Math.round(Math.exp(0.00006 * elapsedMs) * 100);
    return BigInt(Math.max(100, hundredths));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
