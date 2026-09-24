import { Inject, Injectable } from "@nestjs/common";
import { WALLET_REPOSITORY } from "../domain/wallet.repository";
import type { LedgerResult, WalletRepository } from "../domain/wallet.repository";

export interface DebitWalletCommand {
  userId: string;
  amountCents: bigint;
  correlationId: string;
  description?: string;
}

@Injectable()
export class DebitWalletUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(command: DebitWalletCommand): Promise<LedgerResult> {
    if (command.amountCents <= 0n) {
      return { outcome: "REJECTED", reason: "Debit amount must be positive" };
    }
    return this.walletRepository.applyDebit(command);
  }
}
