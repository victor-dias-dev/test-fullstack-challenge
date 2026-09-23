# ADR 002 — Integer cents and integer hundredths

Balances, stakes, and payouts are `bigint` cents. The crash point and the cashout multiplier are `bigint` hundredths (`100n` is `1.00x`). Payout is `amountCents * multiplierHundredths / 100n`, truncated toward zero.

A float crash point makes the payout depend on the IEEE remainder. The house edge is explicit: if the first 52 bits of the HMAC are below `2^52 / 100`, the round crashes at `1.00x`. The previous clamp `Math.max(1, point)` never fired, so it was not a 1% edge.

The live curve may still be drawn from a float. That number is `Number(hundredths) / 100` of the integer the server already published. Cashout, history, and verify use the integer.

Cashout hundredths are `BigInt` in Postgres, not a 32-bit int. The tail of the formula exceeds `2^31 - 1`.
