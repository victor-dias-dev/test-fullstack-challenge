import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { RabbitMQModule } from "./infrastructure/messaging/rabbitmq.module";
import { GamesController } from "./presentation/controllers/games.controller";
import { GameGateway } from "./presentation/gateways/game.gateway";
import { PlaceBetUseCase } from "./application/place-bet.use-case";
import { CashOutUseCase } from "./application/cashout.use-case";
import { RoundLifecycleService } from "./application/round-lifecycle.service";
import { PrismaRoundRepository } from "./infrastructure/database/prisma-round.repository";
import { ROUND_REPOSITORY } from "./domain/round.repository";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RabbitMQModule,
  ],
  controllers: [GamesController],
  providers: [
    { provide: ROUND_REPOSITORY, useClass: PrismaRoundRepository },
    PlaceBetUseCase,
    CashOutUseCase,
    RoundLifecycleService,
    GameGateway,
  ],
})
export class AppModule {}
