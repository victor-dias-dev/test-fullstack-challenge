# Why a wallet debit should not be an HTTP call

A crash-game bet is a distributed write. The game must remember the bet. The wallet must remember that the stake left the balance. Those are two databases. The player is waiting on one click.

## What a timeout means

Suppose the game calls `POST /wallets/debit` and the socket times out. Three states are possible:

1. The wallet never saw the request. The stake is still there. Retrying is safe.
2. The wallet committed and the response was lost. Retrying debits twice unless the wallet remembers the request.
3. The wallet is still inside the transaction. Retrying now races the first attempt.

The game cannot tell these apart from the timeout. If it accepts the bet, the player may be in the round without paying. If it rejects the bet, the player may have paid for a bet the game forgot. Either bug is a balance that does not match the round.

An HTTP client with retries does not remove the ambiguity. It only chooses which of the three bugs you hit more often.

## What this repository does instead

`PlaceBetUseCase` does not publish to RabbitMQ itself. `PrismaRoundRepository.createBetWithOutbox` inserts the `PENDING` bet and an `outbox_messages` row in one transaction. If the bet's unique `(roundId, userId)` fires, both inserts roll back and the player gets "You already have a bet in this round".

`OutboxPublisher` polls `publishedAt IS NULL`. It publishes `wallet.debit` and only then stamps `publishedAt`. Kill the process before the publish and the row is still there on the next boot. Kill it after the publish and the wallet sees a duplicate. That is the trade: at-least-once delivery, paid for by an inbox.

On the wallet, `applyDebit` takes `pg_advisory_xact_lock` on the `correlationId`. If `inbox_messages` already has that id, it returns the stored outcome and does not touch the balance. Otherwise it runs:

```sql
UPDATE wallets
SET "balanceCents" = "balanceCents" - $amount
WHERE "userId" = $userId
  AND "balanceCents" >= $amount
```

Zero rows means the wallet is missing or the stake does not fit. The inbox stores `REJECTED` with the reason. One row means the ledger entry and an `APPLIED` inbox row commit with the balance. The consumer maps that outcome to `wallet.debited` or `wallet.debit.failed` every time, including the replay. The game activates a `PENDING` bet on the first success and ignores a second one. A failure cancels the `PENDING` bet.

Credit uses the same inbox. A replay of a cashout does not pay twice, and it does publish `wallet.credited` again.

## What this still does not solve

The publisher and the consumer can both be down. The bet sits `PENDING` until they come back. That is a visible state, not a silent debit. There is no second region, no poison-message queue, and no human reconciliation tool. Those belong to an operator, not to this reference.

The pattern is the point. Persist the intent, publish after commit, and make the second delivery boring.
