import { Inject, Injectable } from "@nestjs/common";
import { WALLET_REPOSITORY } from "../domain/wallet.repository";
import type { LedgerResult, WalletRepository } from "../domain/wallet.repository";

export interface CreditWalletCommand {
  userId: string;
  amountCents: bigint;
  correlationId: string;
  description?: string;
}

@Injectable()
export class CreditWalletUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(command: CreditWalletCommand): Promise<LedgerResult> {
    if (command.amountCents <= 0n) {
      return { outcome: "REJECTED", reason: "Credit amount must be positive" };
    }
    return this.walletRepository.applyCredit(command);
  }
}
