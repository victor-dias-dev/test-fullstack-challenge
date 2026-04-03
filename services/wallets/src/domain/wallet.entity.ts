export class InsufficientFundsError extends Error {
  constructor(balanceCents: bigint, amountCents: bigint) {
    super(
      `Insufficient funds: balance ${balanceCents} cents, requested ${amountCents} cents`,
    );
    this.name = "InsufficientFundsError";
  }
}

export class Wallet {
  readonly id: string;
  readonly userId: string;
  readonly username: string;
  private _balanceCents: bigint;
  readonly createdAt: Date;

  constructor(props: {
    id: string;
    userId: string;
    username: string;
    balanceCents: bigint;
    createdAt: Date;
  }) {
    this.id = props.id;
    this.userId = props.userId;
    this.username = props.username;
    this._balanceCents = props.balanceCents;
    this.createdAt = props.createdAt;
  }

  get balanceCents(): bigint {
    return this._balanceCents;
  }

  credit(amountCents: bigint): void {
    if (amountCents <= 0n) {
      throw new Error("Credit amount must be positive");
    }
    this._balanceCents += amountCents;
  }

  debit(amountCents: bigint): void {
    if (amountCents <= 0n) {
      throw new Error("Debit amount must be positive");
    }
    if (this._balanceCents < amountCents) {
      throw new InsufficientFundsError(this._balanceCents, amountCents);
    }
    this._balanceCents -= amountCents;
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      username: this.username,
      balanceCents: this._balanceCents.toString(),
    };
  }
}
