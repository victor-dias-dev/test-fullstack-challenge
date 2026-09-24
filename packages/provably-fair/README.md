# @crash/provably-fair

Integer crash-point generation for a crash game.

The crash point is a `bigint` in hundredths (`100n` is `1.00x`). One percent of the 52-bit HMAC space crashes at exactly `1.00x`. Payouts are `stakeCents * multiplierHundredths / 100n`, truncated toward zero.

```ts
import {
  calculateCrashPointHundredths,
  generateServerSeed,
  payoutCents,
  verify,
} from "@crash/provably-fair";

const { serverSeed, serverSeedHash } = generateServerSeed();
const point = calculateCrashPointHundredths(serverSeed, "client-seed", 0);
const check = verify(serverSeed, serverSeedHash, "client-seed", 0);
const payout = payoutCents(1_000n, point);
```

Publish from this directory with `bun publish` after `bun run build`. This package does not move money and is not a casino.
