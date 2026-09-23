# ADR 004 — Transactional outbox and wallet inbox

`PlaceBetUseCase` and `CashOutUseCase` write the row and the outbound message in one Prisma transaction. `OutboxPublisher` reads `publishedAt IS NULL`, publishes to RabbitMQ, and only then sets `publishedAt`. A crash before the publish leaves the row. A crash after the publish and before the timestamp sends the message again.

The wallet serializes a `correlationId` with `pg_advisory_xact_lock`, then either returns the existing inbox row or applies the balance. Debit is `UPDATE wallets SET balance = balance - amount WHERE balance >= amount`. Credit is the matching addition. The ledger row and the inbox row commit together. A replay returns the stored outcome so the consumer republishes `wallet.debited`, `wallet.debit.failed`, or `wallet.credited`.

A duplicate bet hits `UNIQUE (roundId, userId)` inside that same transaction. The repository turns Prisma `P2002` into "You already have a bet in this round". The outbox row rolls back with the bet.
