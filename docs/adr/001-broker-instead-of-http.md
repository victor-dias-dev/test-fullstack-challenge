# ADR 001 — Debit the wallet through the broker

The game and the wallet have separate databases. An HTTP debit couples their uptime. If the caller times out, it cannot tell whether the wallet committed.

The game publishes `wallet.debit` and waits for `wallet.debited` or `wallet.debit.failed`. The bet stays `PENDING` until one of those arrives. A wallet failure cancels the bet. Money and the accepted bet do not diverge because of a timeout.

The cost is latency, correlation ids, and idempotent consumers. See [ADR 004](004-transactional-outbox.md) for how the publish survives a crash.
