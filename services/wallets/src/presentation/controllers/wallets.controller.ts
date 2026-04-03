import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard, JwtPayload } from "../../infrastructure/auth/jwt.guard";
import { CreateWalletUseCase } from "../../application/create-wallet.use-case";
import { GetWalletUseCase } from "../../application/get-wallet.use-case";
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";

type AuthenticatedRequest = Request & { user: JwtPayload };

@ApiTags("wallets")
@Controller()
export class WalletsController {
  constructor(
    private readonly createWallet: CreateWalletUseCase,
    private readonly getWallet: GetWalletUseCase,
  ) {}

  @Get("health")
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "wallets" };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create wallet for authenticated player" })
  async create(@Req() req: AuthenticatedRequest) {
    const wallet = await this.createWallet.execute(
      req.user.sub,
      req.user.preferred_username,
    );
    return {
      id: wallet.id,
      userId: wallet.userId,
      username: wallet.username,
      balanceCents: wallet.balanceCents.toString(),
      balanceReais: (Number(wallet.balanceCents) / 100).toFixed(2),
    };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get wallet and balance of authenticated player" })
  async getMe(@Req() req: AuthenticatedRequest) {
    const wallet = await this.getWallet.execute(req.user.sub);
    return {
      id: wallet.id,
      userId: wallet.userId,
      username: wallet.username,
      balanceCents: wallet.balanceCents.toString(),
      balanceReais: (Number(wallet.balanceCents) / 100).toFixed(2),
    };
  }
}
