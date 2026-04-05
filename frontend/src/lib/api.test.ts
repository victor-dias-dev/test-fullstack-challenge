import { describe, it, expect } from "vitest";
import type { BetResponse, RoundResponse } from "./api";

describe("api types", () => {
  it("RoundResponse accepts a minimal round", () => {
    const round: RoundResponse = {
      id: "r1",
      status: "BETTING",
      serverSeedHash: "hash",
      bettingEndsAt: new Date().toISOString(),
      startedAt: null,
      currentMultiplier: null,
      bets: [],
    };
    expect(round.bets).toHaveLength(0);
  });

  it("BetResponse supports WON status", () => {
    const bet: BetResponse = {
      id: "b1",
      username: "player",
      amountCents: "100",
      status: "WON",
      cashoutMultiplier: 2.5,
      payoutCents: "250",
    };
    expect(bet.status).toBe("WON");
  });
});
