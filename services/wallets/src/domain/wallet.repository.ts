import { Wallet } from "./wallet.entity";

export type LedgerOutcome = "APPLIED" | "REJECTED";

export interface LedgerCommand {
  userId: string;
  amountCents: bigint;
  correlationId: string;
  description?: string;
}

export interface LedgerResult {
  outcome: LedgerOutcome;
  reason?: string;
}

export interface WalletRepository {
  findByUserId(userId: string): Promise<Wallet | null>;
  findById(id: string): Promise<Wallet | null>;
  save(wallet: Wallet): Promise<Wallet>;
  applyDebit(command: LedgerCommand): Promise<LedgerResult>;
  applyCredit(command: LedgerCommand): Promise<LedgerResult>;
}

export const WALLET_REPOSITORY = Symbol("WALLET_REPOSITORY");
