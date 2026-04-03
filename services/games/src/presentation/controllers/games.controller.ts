import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  Inject,
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
import { ProvablyFairService } from "../../domain/provably-fair.service";
import { ROUND_REPOSITORY } from "../../domain/round.repository";
import type { RoundRepository } from "../../domain/round.repository";
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
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
  ) {}

  @Get("health")
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "games" };
  }

  @Get("rounds/current")
  @ApiOperation({ summary: "Get current round state with bets" })
  async getCurrentRound() {
    const round = await this.roundRepository.findCurrent();
    if (!round) return { round: null };

    return {
      round: {
        id: round.id,
        status: round.status,
        serverSeedHash: round.serverSeedHash,
        bettingEndsAt: round.bettingEndsAt.toISOString(),
        startedAt: round.startedAt?.toISOString() ?? null,
        currentMultiplier:
          round.status === "RUNNING"
            ? this.lifecycle.getCurrentMultiplier()
            : null,
        bets: round.bets.map((b) => ({
          id: b.id,
          username: b.username,
          amountCents: b.amountCents.toString(),
          status: b.status,
          cashoutMultiplier: b.cashoutMultiplier,
          payoutCents: b.payoutCents?.toString() ?? null,
        })),
      },
    };
  }

  @Get("rounds/history")
  @ApiOperation({ summary: "Paginated history of crashed rounds" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getHistory(
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ) {
    const { rounds, total } = await this.roundRepository.findHistory(
      parseInt(page),
      parseInt(limit),
    );

    return {
      data: rounds.map((r) => ({
        id: r.id,
        crashPoint: r.crashPoint,
        crashedAt: r.crashedAt?.toISOString() ?? null,
        serverSeedHash: r.serverSeedHash,
      })),
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    };
  }

  @Get("rounds/:roundId/verify")
  @ApiOperation({ summary: "Verify provably fair crash point for a round" })
  async verifyRound(@Param("roundId") roundId: string) {
    const round = await this.roundRepository.findById(roundId);
    if (!round) {
      throw new BadRequestException("Round not found");
    }
    if (round.status !== "CRASHED") {
      return {
        roundId,
        status: round.status,
        message: "Round not yet crashed — verification only available after crash",
      };
    }

    const { valid, expectedCrashPoint } = ProvablyFairService.verify(
      round.serverSeed,
      round.serverSeedHash,
      round.clientSeed,
      round.nonce,
    );

    return {
      roundId,
      valid,
      serverSeed: round.serverSeed,
      serverSeedHash: round.serverSeedHash,
      clientSeed: round.clientSeed,
      nonce: round.nonce,
      expectedCrashPoint,
      actualCrashPoint: round.crashPoint,
    };
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
    const { bets, total } = await this.roundRepository.findBetsByUserId(
      req.user.sub,
      parseInt(page),
      parseInt(limit),
    );

    return {
      data: bets.map((b) => ({
        id: b.id,
        roundId: b.roundId,
        amountCents: b.amountCents.toString(),
        status: b.status,
        cashoutMultiplier: b.cashoutMultiplier,
        payoutCents: b.payoutCents?.toString() ?? null,
        createdAt: b.createdAt.toISOString(),
      })),
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    };
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

    this.gateway.emitCashout({
      roundId: result.betId,
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
