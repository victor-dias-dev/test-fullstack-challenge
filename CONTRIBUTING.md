# Contributing

Issues and pull requests are welcome. Please read [SECURITY.md](SECURITY.md) before reporting a vulnerability.

## Setup

Install [Bun](https://bun.sh). From the repository root:

```bash
bun install
bun run --cwd packages/provably-fair build
bun run test
bun run typecheck
bun run lint
```

`services/games` imports `@crash/provably-fair` from that package's `dist`. Build the package before typecheck or `bun run dev` in the game service.

Integration tests need Postgres (two databases) and RabbitMQ:

```bash
export GAMES_DATABASE_URL=postgresql://admin:admin@localhost:5432/games
export WALLETS_DATABASE_URL=postgresql://admin:admin@localhost:5432/wallets
export RABBITMQ_URL=amqp://guest:guest@localhost:5672
bun run test:integration
```

The two services must not share one database. Their migration histories both contain a folder named `20240101000000_init`, and Prisma records migrations by that name.

## What belongs here

- A bug in the integer payout, the house edge, the outbox, or the inbox.
- A failure mode the ADRs in `docs/adr` do not mention.
- A doc that disagrees with the code.

Leave drive-by reformatting out. Biome lints and does not format the tree.

## Pull requests

Describe the behavior you changed and how you checked it. Money and messaging changes need a unit test or an integration test that fails without the fix.

`@crash/provably-fair` is the public package. Do not publish it from CI. The app packages stay `"private": true`.
