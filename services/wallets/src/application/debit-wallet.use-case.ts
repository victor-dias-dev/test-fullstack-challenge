import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InsufficientFundsError } from "../domain/wallet.entity";
import { WALLET_REPOSITORY } from "../domain/wallet.repository";
import type { WalletRepository } from "../domain/wallet.repository";

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

  async execute(
    command: DebitWalletCommand,
  ): Promise<{ success: boolean; error?: string }> {
    // Idempotency: skip if already processed
    const alreadyProcessed = await this.walletRepository.existsByCorrelationId(
      command.correlationId,
    );
    if (alreadyProcessed) {
      return { success: true };
    }

    const wallet = await this.walletRepository.findByUserId(command.userId);
    if (!wallet) {
      return { success: false, error: "Wallet not found" };
    }

    try {
      wallet.debit(command.amountCents);
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        return { success: false, error: "Insufficient funds" };
      }
      throw err;
    }

    await this.walletRepository.updateBalance(wallet.id, wallet.balanceCents, {
      type: "DEBIT",
      amountCents: command.amountCents,
      correlationId: command.correlationId,
      description: command.description,
    });

    return { success: true };
  }
}
