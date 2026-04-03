import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { RabbitMQModule } from "./infrastructure/messaging/rabbitmq.module";
import { WalletsController } from "./presentation/controllers/wallets.controller";
import { CreateWalletUseCase } from "./application/create-wallet.use-case";
import { GetWalletUseCase } from "./application/get-wallet.use-case";
import { DebitWalletUseCase } from "./application/debit-wallet.use-case";
import { CreditWalletUseCase } from "./application/credit-wallet.use-case";
import { PrismaWalletRepository } from "./infrastructure/database/prisma-wallet.repository";
import { WalletEventsConsumer } from "./infrastructure/messaging/wallet-events.consumer";
import { WALLET_REPOSITORY } from "./domain/wallet.repository";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RabbitMQModule,
  ],
  controllers: [WalletsController],
  providers: [
    { provide: WALLET_REPOSITORY, useClass: PrismaWalletRepository },
    CreateWalletUseCase,
    GetWalletUseCase,
    DebitWalletUseCase,
    CreditWalletUseCase,
    WalletEventsConsumer,
  ],
})
export class AppModule {}
