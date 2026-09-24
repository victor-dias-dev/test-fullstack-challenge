# Crash Game

[Português](README.pt-BR.md)

[![CI](https://github.com/victor-dias-dev/test-fullstack-challenge/actions/workflows/ci.yml/badge.svg)](https://github.com/victor-dias-dev/test-fullstack-challenge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A multiplayer crash game: the multiplier climbs from 1.00x and stops at a point chosen before the round. Players bet during a betting window and cash out before the crash, or they lose the stake.

Balances, stakes, and payouts are integer cents. The game and the wallet are separate services. A debit is written to an outbox in the same transaction as the bet, then published to RabbitMQ. This is a local reference, not a casino. Do not connect it to real money.

![Login](docs/screenshots/login.png)
![Game](docs/screenshots/game.png)
![Live round](docs/screenshots/round.png)

## What is in the app

- Keycloak login and one wallet per player
- Live multiplier, betting window, and cash out
- Round history and a profit leaderboard
- Provably fair crash point, verifiable after the round
- Debit and credit between game and wallet through RabbitMQ

## Requirements

- Docker Compose v2
- [Bun](https://bun.sh), to run tests or services outside Docker

## Quick start

```bash
bun run docker:up
```

That builds and starts Postgres, RabbitMQ, Keycloak, Kong, both services, and the frontend. Logs stay in the foreground. In the background: `bun run docker:up:detached`.

If Postgres was initialized once and failed:

```bash
docker compose down -v
bun run docker:up
```

The test player is `player` / `player123`.

| Service | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| Kong | http://localhost:8000 |
| Games | http://localhost:4001 |
| Wallets | http://localhost:4002 |
| Keycloak | http://localhost:8080 (realm `crash-game`) |

Outside Docker, leave Postgres, RabbitMQ, and Keycloak in Compose, copy the env examples, build `@crash/provably-fair`, then start each app:

```bash
cp services/games/.env.example services/games/.env
cp services/wallets/.env.example services/wallets/.env
cp frontend/.env.example frontend/.env
bun run --cwd packages/provably-fair build
```

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres database for that service |
| `RABBITMQ_URL` | Broker URL |
| `KEYCLOAK_JWKS_URI` | Realm certificate endpoint |
| `KEYCLOAK_ISSUER` | Expected token issuer |
| `VITE_API_URL` | Kong base URL for the frontend |
| `VITE_SOCKET_URL` | Game WebSocket. It does not go through Kong |
| `VITE_KEYCLOAK_URL` | Keycloak base URL |

`VITE_*` values are fixed when the frontend image is built.

## Checks

```bash
bun run test
bun run lint
bun run typecheck
```

Integration tests need two databases and RabbitMQ. The services do not share a migration history.

```bash
export GAMES_DATABASE_URL=postgresql://admin:admin@localhost:5432/games
export WALLETS_DATABASE_URL=postgresql://admin:admin@localhost:5432/wallets
export RABBITMQ_URL=amqp://guest:guest@localhost:5672
bun run test:integration
```

HTTP checks against a running stack stay local: `bun run test:e2e` inside `services/games` and `services/wallets`.

## Repository

```text
services/games          Rounds, bets, crash point, WebSocket, outbox
services/wallets        Wallet, atomic debit and credit, inbox
packages/provably-fair  Crash point and integer payout
frontend                React, Vite, TanStack Query, Zustand
```

Why the wallet is not an HTTP call: [docs/why-not-http.md](docs/why-not-http.md). Decisions: [docs/adr](docs/adr). The formula package: [packages/provably-fair](packages/provably-fair). The original exercise brief is archived in [docs/original-brief.md](docs/original-brief.md).

After a round crashes, `GET /games/rounds/:roundId/verify` returns the seeds and the crash point in hundredths (`100` is `1.00x`). Recompute it with `verify` from `@crash/provably-fair`. One percent of draws crash at exactly `1.00x`. Payout is `amountCents * multiplierHundredths / 100`, truncated toward zero. Stake limits are 1.00 to 1,000.00.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports go through [private vulnerability reporting](https://github.com/victor-dias-dev/test-fullstack-challenge/security/advisories/new), described in [SECURITY.md](SECURITY.md).

Licensed under the [MIT License](LICENSE).
