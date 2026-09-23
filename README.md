# Crash Game

A multiplayer crash game built as a take-home. A multiplier climbs from 1.00x and crashes at a predetermined point. Players bet during a betting window and cash out before the crash, or they lose the stake.

## The hard decision

A bet has to feel instant: the player clicks, the wallet debits, the bet is accepted. The game and the wallet are separate services with separate databases, so a direct HTTP call would couple their uptime and make a timeout ambiguous (did the money move?).

I kept them apart and used RabbitMQ. The game publishes a debit request and waits for a correlated result. That adds latency and forces idempotency on the wallet side. It also means a wallet failure rejects the bet instead of leaving money and game state out of sync.

Money is integer cents. There is no float on balances or stakes.

## Shape

| Piece | Role |
| --- | --- |
| `services/games` | Rounds, bets, provably fair crash point, WebSocket |
| `services/wallets` | One wallet per player, debit and credit |
| RabbitMQ | Debit and credit between the two services |
| Kong | HTTP gateway for `/games` and `/wallets` |
| Keycloak | OIDC. The WebSocket connects straight to the game service |
| `frontend` | React, Vite, TanStack Query, Zustand, Socket.IO |

Layers in each service: `domain`, `application`, `infrastructure`, `presentation`.

| Choice | What it buys | What it costs |
| --- | --- | --- |
| NestJS HTTP exceptions inside use cases | Fits pipes, filters, and Swagger | Domain errors are less portable outside Nest |
| Wallet round-trip through the broker | Clear boundary and failure mode | Latency, plus correlation and idempotency |
| WebSocket outside Kong | No gateway upgrade config | The client uses a different socket URL |
| Frontend production image | Same artifact you would deploy | No hot reload; `VITE_*` is fixed at build time |

## Run

Requirements: Docker Compose v2, and [Bun](https://bun.sh) if you want to run tests or services outside Docker.

From the repository root:

```bash
bun run docker:up
```

That builds and starts Postgres, RabbitMQ, Keycloak, Kong, both services, and the frontend. Logs stay in the foreground. For the background:

```bash
bun run docker:up:detached
```

If Postgres was initialized once and failed, reset the volume and start again:

```bash
docker compose down -v
bun run docker:up
```

| Service | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| Kong | http://localhost:8000 |
| Games | http://localhost:4001 |
| Wallets | http://localhost:4002 |
| Keycloak | http://localhost:8080 (realm `crash-game`) |

Test player: `player` / `player123`.

This repo uses Bun (`bun.lock`). CI installs with Bun and runs Vitest.

### Outside Docker

Leave Postgres, RabbitMQ, and Keycloak in Compose, copy the env examples, then start each app with Bun:

```bash
cp services/games/.env.example services/games/.env
cp services/wallets/.env.example services/wallets/.env
cp frontend/.env.example frontend/.env
```

```bash
cd services/games && bun install && bun run dev
cd services/wallets && bun install && bun run dev
cd frontend && bun install && bun run dev
```

### Tests

```bash
cd services/games && bun run test && bun run test:e2e
cd services/wallets && bun run test && bun run test:e2e
cd frontend && bun run test
```

E2E that needs the stack running can be skipped with `SKIP_E2E=1`.

The original assignment is in `documentation-rules.md`.
