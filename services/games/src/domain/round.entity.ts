export enum RoundStatus {
  BETTING = "BETTING",
  RUNNING = "RUNNING",
  CRASHED = "CRASHED",
}

export enum BetStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  WON = "WON",
  LOST = "LOST",
  CANCELLED = "CANCELLED",
}

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export class Bet {
  readonly id: string;
  readonly roundId: string;
  readonly userId: string;
  readonly username: string;
  readonly amountCents: bigint;
  private _status: BetStatus;
  private _cashoutMultiplier: number | null;
  private _payoutCents: bigint | null;
  readonly createdAt: Date;

  constructor(props: {
    id: string;
    roundId: string;
    userId: string;
    username: string;
    amountCents: bigint;
    status?: BetStatus;
    cashoutMultiplier?: number | null;
    payoutCents?: bigint | null;
    createdAt: Date;
  }) {
    this.id = props.id;
    this.roundId = props.roundId;
    this.userId = props.userId;
    this.username = props.username;
    this.amountCents = props.amountCents;
    this._status = props.status ?? BetStatus.PENDING;
    this._cashoutMultiplier = props.cashoutMultiplier ?? null;
    this._payoutCents = props.payoutCents ?? null;
    this.createdAt = props.createdAt;
  }

  get status(): BetStatus {
    return this._status;
  }

  get cashoutMultiplier(): number | null {
    return this._cashoutMultiplier;
  }

  get payoutCents(): bigint | null {
    return this._payoutCents;
  }

  activate(): void {
    if (this._status !== BetStatus.PENDING) {
      throw new DomainError("Only PENDING bets can be activated");
    }
    this._status = BetStatus.ACTIVE;
  }

  cancel(): void {
    if (this._status !== BetStatus.PENDING) {
      throw new DomainError("Only PENDING bets can be cancelled");
    }
    this._status = BetStatus.CANCELLED;
  }

  cashout(multiplier: number): bigint {
    if (this._status !== BetStatus.ACTIVE) {
      throw new DomainError("Only ACTIVE bets can be cashed out");
    }
    if (multiplier < 1.0) {
      throw new DomainError("Cashout multiplier must be at least 1.00");
    }

    // Use BigInt arithmetic to avoid float imprecision: floor(amount * multiplier * 100) / 100
    const payoutCents = BigInt(Math.floor(Number(this.amountCents) * multiplier));
    this._cashoutMultiplier = multiplier;
    this._payoutCents = payoutCents;
    this._status = BetStatus.WON;
    return payoutCents;
  }

  lose(): void {
    if (this._status !== BetStatus.ACTIVE) return;
    this._status = BetStatus.LOST;
  }
}

export class Round {
  readonly id: string;
  private _status: RoundStatus;
  private _crashPoint: number | null;
  readonly serverSeed: string;
  readonly serverSeedHash: string;
  readonly clientSeed: string;
  readonly nonce: number;
  readonly bettingEndsAt: Date;
  private _startedAt: Date | null;
  private _crashedAt: Date | null;
  readonly createdAt: Date;
  private readonly _bets: Map<string, Bet>;

  constructor(props: {
    id: string;
    status?: RoundStatus;
    crashPoint?: number | null;
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    bettingEndsAt: Date;
    startedAt?: Date | null;
    crashedAt?: Date | null;
    createdAt: Date;
    bets?: Bet[];
  }) {
    this.id = props.id;
    this._status = props.status ?? RoundStatus.BETTING;
    this._crashPoint = props.crashPoint ?? null;
    this.serverSeed = props.serverSeed;
    this.serverSeedHash = props.serverSeedHash;
    this.clientSeed = props.clientSeed;
    this.nonce = props.nonce;
    this.bettingEndsAt = props.bettingEndsAt;
    this._startedAt = props.startedAt ?? null;
    this._crashedAt = props.crashedAt ?? null;
    this.createdAt = props.createdAt;
    this._bets = new Map(props.bets?.map((b) => [b.userId, b]) ?? []);
  }

  get status(): RoundStatus {
    return this._status;
  }

  get crashPoint(): number | null {
    return this._crashPoint;
  }

  get startedAt(): Date | null {
    return this._startedAt;
  }

  get crashedAt(): Date | null {
    return this._crashedAt;
  }

  get bets(): Bet[] {
    return Array.from(this._bets.values());
  }

  getBetByUserId(userId: string): Bet | undefined {
    return this._bets.get(userId);
  }

  start(): void {
    if (this._status !== RoundStatus.BETTING) {
      throw new DomainError("Round can only start from BETTING phase");
    }
    this._status = RoundStatus.RUNNING;
    this._startedAt = new Date();
  }

  placeBet(bet: Bet): void {
    if (this._status !== RoundStatus.BETTING) {
      throw new DomainError("Bets can only be placed during the BETTING phase");
    }
    if (this._bets.has(bet.userId)) {
      throw new DomainError("Player already has a bet in this round");
    }
    if (bet.amountCents < 100n) {
      throw new DomainError("Minimum bet is 1.00 (100 cents)");
    }
    if (bet.amountCents > 1_000_000n) {
      throw new DomainError("Maximum bet is 10000.00 (1000000 cents)");
    }
    this._bets.set(bet.userId, bet);
  }

  activateBet(userId: string): void {
    const bet = this._bets.get(userId);
    if (!bet) throw new DomainError("Bet not found");
    bet.activate();
  }

  cancelBet(userId: string): void {
    const bet = this._bets.get(userId);
    if (!bet) throw new DomainError("Bet not found");
    bet.cancel();
    this._bets.delete(userId);
  }

  cashOutBet(userId: string, multiplier: number): bigint {
    if (this._status !== RoundStatus.RUNNING) {
      throw new DomainError("Cash out only allowed during RUNNING phase");
    }
    const bet = this._bets.get(userId);
    if (!bet) throw new DomainError("No active bet found for player");
    return bet.cashout(multiplier);
  }

  crash(crashPoint: number): Bet[] {
    if (this._status !== RoundStatus.RUNNING) {
      throw new DomainError("Round can only crash from RUNNING state");
    }
    this._status = RoundStatus.CRASHED;
    this._crashPoint = crashPoint;
    this._crashedAt = new Date();

    const losingBets: Bet[] = [];
    for (const bet of this._bets.values()) {
      if (bet.status === BetStatus.ACTIVE) {
        bet.lose();
        losingBets.push(bet);
      }
    }
    return losingBets;
  }
}
