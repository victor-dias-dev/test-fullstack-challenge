import { Inject, Injectable } from "@nestjs/common";
import { WALLET_REPOSITORY } from "../domain/wallet.repository";
import type { WalletRepository } from "../domain/wallet.repository";

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

  async execute(command: CreditWalletCommand): Promise<void> {
    // Idempotency: skip if already processed
    const alreadyProcessed = await this.walletRepository.existsByCorrelationId(
      command.correlationId,
    );
    if (alreadyProcessed) return;

    const wallet = await this.walletRepository.findByUserId(command.userId);
    if (!wallet) return; // wallet may not exist for edge cases

    wallet.credit(command.amountCents);

    await this.walletRepository.updateBalance(wallet.id, wallet.balanceCents, {
      type: "CREDIT",
      amountCents: command.amountCents,
      correlationId: command.correlationId,
      description: command.description,
    });
  }
}
