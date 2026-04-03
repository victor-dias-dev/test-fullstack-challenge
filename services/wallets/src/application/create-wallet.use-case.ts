import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { Wallet } from "../domain/wallet.entity";
import { WALLET_REPOSITORY } from "../domain/wallet.repository";
import type { WalletRepository } from "../domain/wallet.repository";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class CreateWalletUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(userId: string, username: string): Promise<Wallet> {
    const existing = await this.walletRepository.findByUserId(userId);
    if (existing) {
      throw new ConflictException("Wallet already exists for this user");
    }

    const wallet = new Wallet({
      id: uuidv4(),
      userId,
      username,
      balanceCents: 1000000n, // Starting balance: 10,000.00 (test user)
      createdAt: new Date(),
    });

    return this.walletRepository.save(wallet);
  }
}
