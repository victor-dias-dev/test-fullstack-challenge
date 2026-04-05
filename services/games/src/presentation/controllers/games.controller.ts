import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard, JwtPayload } from "../../infrastructure/auth/jwt.guard";
import { PlaceBetUseCase } from "../../application/place-bet.use-case";
import { CashOutUseCase } from "../../application/cashout.use-case";
import { RoundLifecycleService } from "../../application/round-lifecycle.service";
import { GetCurrentRoundQuery } from "../../application/queries/get-current-round.query";
import { GetLeaderboardQuery } from "../../application/queries/get-leaderboard.query";
import { GetRoundHistoryQuery } from "../../application/queries/get-round-history.query";
import { VerifyRoundQuery } from "../../application/queries/verify-round.query";
import { GetMyBetsQuery } from "../../application/queries/get-my-bets.query";
import { PlaceBetDto } from "../dtos/place-bet.dto";
import { GameGateway } from "../gateways/game.gateway";
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";

type AuthRequest = Request & { user: JwtPayload };

@ApiTags("games")
@Controller()
export class GamesController {
  constructor(
    private readonly placeBet: PlaceBetUseCase,
    private readonly cashOut: CashOutUseCase,
    private readonly lifecycle: RoundLifecycleService,
    private readonly gateway: GameGateway,
    private readonly getCurrentRoundQuery: GetCurrentRoundQuery,
    private readonly getLeaderboardQuery: GetLeaderboardQuery,
    private readonly getRoundHistoryQuery: GetRoundHistoryQuery,
    private readonly verifyRoundQuery: VerifyRoundQuery,
    private readonly getMyBetsQuery: GetMyBetsQuery,
  ) {}

  @Get("health")
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "games" };
  }

  @Get("rounds/current")
  @ApiOperation({ summary: "Get current round state with bets" })
  async getCurrentRound() {
    return this.getCurrentRoundQuery.execute();
  }

  @Get("leaderboard")
  @ApiOperation({ summary: "Top players by net profit on settled bets" })
  @ApiQuery({
    name: "period",
    required: false,
    enum: ["24h", "week"],
    description: "24h = last 24 hours, week = last 7 days",
  })
  async getLeaderboard(@Query("period") period: string = "24h") {
    return this.getLeaderboardQuery.execute(period);
  }

  @Get("rounds/history")
  @ApiOperation({ summary: "Paginated history of crashed rounds" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getHistory(
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ) {
    return this.getRoundHistoryQuery.execute(parseInt(page), parseInt(limit));
  }

  @Get("rounds/:roundId/verify")
  @ApiOperation({ summary: "Verify provably fair crash point for a round" })
  async verifyRound(@Param("roundId") roundId: string) {
    return this.verifyRoundQuery.execute(roundId);
  }

  @Get("bets/me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get authenticated player's bet history" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getMyBets(
    @Req() req: AuthRequest,
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ) {
    return this.getMyBetsQuery.execute(
      req.user.sub,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Post("bet")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Place a bet in the current round" })
  async bet(@Req() req: AuthRequest, @Body() body: PlaceBetDto) {
    const result = await this.placeBet.execute({
      userId: req.user.sub,
      username: req.user.preferred_username,
      amountCents: BigInt(body.amountCents),
    });
    return result;
  }

  @Post("bet/cashout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cash out at the current multiplier" })
  async cashout(@Req() req: AuthRequest) {
    const multiplier = this.lifecycle.getCurrentMultiplier();

    const result = await this.cashOut.execute(
      { userId: req.user.sub },
      multiplier,
    );

    const roundId = this.lifecycle.getCurrentRoundId();
    this.gateway.emitCashout({
      roundId: roundId ?? result.betId,
      username: req.user.preferred_username,
      multiplier: result.multiplier,
      payoutCents: result.payoutCents.toString(),
    });

    return {
      betId: result.betId,
      multiplier: result.multiplier,
      payoutCents: result.payoutCents.toString(),
    };
  }
}
