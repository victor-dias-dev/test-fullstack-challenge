# Crash Game

An educational reference for a multiplayer crash game: a multiplier climbs from 1.00x and stops at a point chosen before the round. Players bet during a betting window and cash out before the crash, or they lose the stake.

This is not a casino and it does not move real money. Balances are integer cents in a local Postgres. Do not point it at a real payment system.

Portuguese: [README.pt.md](README.pt.md).

## Why the wallet is not an HTTP call

A bet has to feel instant: the player clicks, the wallet debits, the bet is accepted. The game and the wallet are separate services with separate databases. A direct HTTP call would couple their uptime and make a timeout ambiguous (did the money move?).

The game writes the bet and a debit message in one database transaction. A publisher sends that message to RabbitMQ only after the commit. The wallet applies the balance with a conditional `UPDATE` and records the result in an inbox keyed by `correlationId`. A duplicate delivery republishes the same result and does not move the money again.

```mermaid
sequenceDiagram
  participant Game
  participant Outbox
  participant Broker
  participant Wallet
  participant Inbox
  Game->>Outbox: same transaction as the bet
  Outbox->>Broker: publisher sends only committed rows
  Broker->>Wallet: wallet.debit
  Wallet->>Inbox: balance and result in one transaction
  Wallet->>Broker: republish when the correlationId already exists
```

The longer version is [docs/why-not-http.md](docs/why-not-http.md).

## Money and provably fair

Stakes, balances, and payouts are integer cents. The crash point and the cashout multiplier are integer hundredths (`100` is `1.00x`). Payout is `amountCents * multiplierHundredths / 100`, truncated toward zero. There is no float on a balance or a payout.

One percent of the 52-bit HMAC space crashes at exactly `1.00x`. The formula, the known test vector, and `verify` live in [`packages/provably-fair`](packages/provably-fair) (`@crash/provably-fair`). Publish that package with `bun publish` from its directory after `bun run build`. The apps in this repo stay private.

Bet limits are `100` cents minimum and `100_000` cents maximum (1.00 to 1,000.00).

## Shape

| Piece | Role |
| --- | --- |
| `services/games` | Rounds, bets, provably fair crash point, WebSocket, outbox |
| `services/wallets` | One wallet per player, atomic debit and credit, inbox |
| `packages/provably-fair` | Crash point and integer payout |
| RabbitMQ | Debit and credit between the two services |
| Kong | HTTP gateway for `/games` and `/wallets` |
| Keycloak | OIDC. The WebSocket connects straight to the game service |
| `frontend` | React, Vite, TanStack Query, Zustand, Socket.IO |

Layers in each service: `domain`, `application`, `infrastructure`, `presentation`.

| Choice | What it buys | What it costs |
| --- | --- | --- |
| NestJS HTTP exceptions inside use cases | Fits pipes, filters, and Swagger | Domain errors are less portable outside Nest |
| Transactional outbox through the broker | A crash between the bet and the publish cannot drop the debit | Latency, plus a publisher and idempotent consumers |
| WebSocket outside Kong | No gateway upgrade config | The client uses a different socket URL |
| Frontend production image | Same artifact you would deploy | No hot reload; `VITE_*` is fixed at build time |

Decisions are written up in [docs/adr](docs/adr).

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

This repo uses Bun (`bun.lock`). CI installs with `bun install --frozen-lockfile`, typechecks, lints with Biome, runs unit tests, and runs integration tests against Postgres and RabbitMQ.

### Outside Docker

Leave Postgres, RabbitMQ, and Keycloak in Compose, copy the env examples, build the fair package, then start each app with Bun:

```bash
cp services/games/.env.example services/games/.env
cp services/wallets/.env.example services/wallets/.env
cp frontend/.env.example frontend/.env
bun run --cwd packages/provably-fair build
```

```bash
cd services/games && bun install && bun run dev
cd services/wallets && bun install && bun run dev
cd frontend && bun install && bun run dev
```

### Verify a round

After a round crashes, `GET /games/rounds/:roundId/verify` returns the server seed, the client seed, the nonce, and the crash point in hundredths. Recompute it with `verify` from `@crash/provably-fair`. The hash of the server seed was public before the round started. A different seed will not match that hash.

### Tests

```bash
bun run test
bun run typecheck
bun run lint
```

Integration tests need two databases (the services do not share a migration history) and RabbitMQ:

```bash
export GAMES_DATABASE_URL=postgresql://admin:admin@localhost:5432/games
export WALLETS_DATABASE_URL=postgresql://admin:admin@localhost:5432/wallets
export RABBITMQ_URL=amqp://guest:guest@localhost:5672
bun run test:integration
```

HTTP checks against a running stack stay local:

```bash
cd services/games && bun run test:e2e
cd services/wallets && bun run test:e2e
```

The original exercise brief is archived in [docs/original-brief.md](docs/original-brief.md).
