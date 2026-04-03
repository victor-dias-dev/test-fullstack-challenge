import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Wallet } from "../domain/wallet.entity";
import { WALLET_REPOSITORY } from "../domain/wallet.repository";
import type { WalletRepository } from "../domain/wallet.repository";

@Injectable()
export class GetWalletUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(userId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException("Wallet not found");
    }
    return wallet;
  }
}
