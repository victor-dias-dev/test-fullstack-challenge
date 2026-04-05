import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { RabbitMQModule } from "./infrastructure/messaging/rabbitmq.module";
import { RabbitMQService } from "./infrastructure/messaging/rabbitmq.service";
import { GamesController } from "./presentation/controllers/games.controller";
import { GameGateway } from "./presentation/gateways/game.gateway";
import { PlaceBetUseCase } from "./application/place-bet.use-case";
import { CashOutUseCase } from "./application/cashout.use-case";
import { RoundLifecycleService } from "./application/round-lifecycle.service";
import { GetCurrentRoundQuery } from "./application/queries/get-current-round.query";
import { GetLeaderboardQuery } from "./application/queries/get-leaderboard.query";
import { GetRoundHistoryQuery } from "./application/queries/get-round-history.query";
import { VerifyRoundQuery } from "./application/queries/verify-round.query";
import { GetMyBetsQuery } from "./application/queries/get-my-bets.query";
import { GAME_MESSAGE_BUS } from "./application/ports/game-message-bus.port";
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
    { provide: GAME_MESSAGE_BUS, useExisting: RabbitMQService },
    PlaceBetUseCase,
    CashOutUseCase,
    RoundLifecycleService,
    GetCurrentRoundQuery,
    GetLeaderboardQuery,
    GetRoundHistoryQuery,
    VerifyRoundQuery,
    GetMyBetsQuery,
    GameGateway,
  ],
})
export class AppModule {}
