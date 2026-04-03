import { Wallet } from "./wallet.entity";

export interface WalletRepository {
  findByUserId(userId: string): Promise<Wallet | null>;
  findById(id: string): Promise<Wallet | null>;
  save(wallet: Wallet): Promise<Wallet>;
  updateBalance(
    walletId: string,
    balanceCents: bigint,
    transaction: {
      type: "CREDIT" | "DEBIT";
      amountCents: bigint;
      correlationId?: string;
      description?: string;
    },
  ): Promise<Wallet>;
  existsByCorrelationId(correlationId: string): Promise<boolean>;
}

export const WALLET_REPOSITORY = Symbol("WALLET_REPOSITORY");
