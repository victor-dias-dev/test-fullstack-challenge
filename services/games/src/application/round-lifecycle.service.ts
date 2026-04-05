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

const BETTING_PHASE_MS = 10_000;  // 10 seconds
const MULTIPLIER_TICK_MS = 100;   // emit every 100ms

@Injectable()
export class RoundLifecycleService implements OnModuleInit {
  private readonly logger = new Logger(RoundLifecycleService.name);
  private currentMultiplier = 1.0;
  private roundStartTime = 0;
  private currentRoundId: string | null = null;
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  // These will be injected by the WebSocket gateway after init
  private onMultiplierTick?: (multiplier: number, elapsed: number) => void;
  private onRoundCrashed?: (roundId: string, crashPoint: number, round: Round) => void;
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
    // Subscribe to wallet responses
    this.messageBus.subscribe(
      MESSAGING_ROUTING_KEYS.WALLET_DEBITED,
      async (msg) => await this.handleWalletDebited(msg),
    );
    this.messageBus.subscribe(
      MESSAGING_ROUTING_KEYS.WALLET_DEBIT_FAILED,
      async (msg) => await this.handleWalletDebitFailed(msg),
    );

    // Start lifecycle loop
    setTimeout(() => this.startNewRound(), 1000);
  }

  setCallbacks(callbacks: {
    onMultiplierTick?: (multiplier: number, elapsed: number) => void;
    onRoundCrashed?: (roundId: string, crashPoint: number, round: Round) => void;
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

  getCurrentMultiplier(): number {
    return this.currentMultiplier;
  }

  getCurrentRoundId(): string | null {
    return this.currentRoundId;
  }

  private async startNewRound(): Promise<void> {
    try {
      const { serverSeed, serverSeedHash } = ProvablyFairService.generateServerSeed();
      const clientSeed = ProvablyFairService.generateClientSeed();
      const nonce = 0;
      const crashPoint = ProvablyFairService.calculateCrashPoint(serverSeed, clientSeed, nonce);
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
      this.logger.log(`New round ${round.id} — crash at ${crashPoint}x (hidden)`);

      this.onRoundBetting?.(round, bettingEndsAt);

      // Wait for betting phase
      await this.delay(BETTING_PHASE_MS);

      // Transition to RUNNING
      round.start();
      await this.roundRepository.updateRoundStatus(round);
      this.onRoundStarted?.(round);

      this.roundStartTime = Date.now();
      this.currentMultiplier = 1.0;

      // Tick multiplier
      await new Promise<void>((resolve) => {
        this.tickInterval = setInterval(async () => {
          const elapsed = Date.now() - this.roundStartTime;
          this.currentMultiplier = this.computeMultiplier(elapsed);

          this.onMultiplierTick?.(this.currentMultiplier, elapsed);

          if (this.currentMultiplier >= crashPoint) {
            clearInterval(this.tickInterval!);
            this.tickInterval = null;
            await this.handleCrash(round, crashPoint);
            resolve();
          }
        }, MULTIPLIER_TICK_MS);
      });

      // Brief pause before next round
      await this.delay(3000);
      void this.startNewRound();
    } catch (err) {
      this.logger.error("Round lifecycle error", err);
      await this.delay(5000);
      void this.startNewRound();
    }
  }

  private async handleCrash(round: Round, crashPoint: number): Promise<void> {
    const freshRound = await this.roundRepository.findById(round.id);
    if (!freshRound) return;

    const losingBets = freshRound.crash(crashPoint);
    await this.roundRepository.updateRoundStatus(freshRound);

    // Mark losing bets in DB
    for (const bet of losingBets) {
      await this.roundRepository.updateBetStatus(bet.id, { status: BetStatus.LOST });
    }

    this.onRoundCrashed?.(freshRound.id, crashPoint, freshRound);
    this.logger.log(`Round ${freshRound.id} crashed at ${crashPoint}x`);
  }

  private async handleWalletDebited(msg: Record<string, unknown>): Promise<void> {
    const betId = msg.betId as string;
    const bet = await this.roundRepository.findBetById(betId);
    if (!bet) return;

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
    await this.roundRepository.updateBetStatus(betId, { status: BetStatus.CANCELLED });
    this.onBetCancelled?.(betId, userId);
  }

  private computeMultiplier(elapsedMs: number): number {
    // Exponential growth: e^(0.00006 * elapsedMs)
    return Math.round(Math.exp(0.00006 * elapsedMs) * 100) / 100;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
