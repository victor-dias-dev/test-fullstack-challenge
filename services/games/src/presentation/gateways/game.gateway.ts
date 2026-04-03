import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Server } from "socket.io";
import { RoundLifecycleService } from "../../application/round-lifecycle.service";
import { Round } from "../../domain/round.entity";

@WebSocketGateway({
  cors: { origin: "*" },
  namespace: "/",
})
export class GameGateway implements OnGatewayInit {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(GameGateway.name);

  constructor(private readonly lifecycle: RoundLifecycleService) {}

  afterInit(): void {
    this.lifecycle.setCallbacks({
      onRoundBetting: (round, endsAt) => {
        this.server.emit("round:betting", {
          roundId: round.id,
          serverSeedHash: round.serverSeedHash,
          endsAt: endsAt.toISOString(),
        });
      },
      onRoundStarted: (round) => {
        this.server.emit("round:started", {
          roundId: round.id,
          startedAt: new Date().toISOString(),
        });
      },
      onMultiplierTick: (multiplier, elapsed) => {
        this.server.emit("multiplier:update", {
          roundId: this.lifecycle.getCurrentRoundId(),
          multiplier,
          elapsedMs: elapsed,
        });
      },
      onRoundCrashed: (roundId, crashPoint, round) => {
        this.server.emit("round:crashed", {
          roundId,
          crashPoint,
          serverSeed: round.serverSeed,
          clientSeed: round.clientSeed,
          nonce: round.nonce,
        });
      },
      onBetActivated: (bet) => {
        this.server.emit("bet:placed", {
          roundId: bet.roundId,
          username: bet.username,
          amountCents: bet.amountCents.toString(),
        });
      },
      onBetCancelled: (betId, _userId) => {
        this.server.emit("bet:cancelled", { betId });
      },
    });

    this.logger.log("WebSocket gateway initialized");
  }

  emitCashout(payload: {
    roundId: string;
    username: string;
    multiplier: number;
    payoutCents: string;
  }): void {
    this.server.emit("bet:cashout", payload);
  }
}
