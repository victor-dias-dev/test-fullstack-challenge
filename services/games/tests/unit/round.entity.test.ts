import { describe, it, expect } from "bun:test";
import { Round, Bet, RoundStatus, BetStatus, DomainError } from "../../src/domain/round.entity";

function makeBet(userId = "user-1", amountCents = 5000n): Bet {
  return new Bet({
    id: `bet-${userId}`,
    roundId: "round-1",
    userId,
    username: userId,
    amountCents,
    createdAt: new Date(),
  });
}

function makeBettingRound(bets: Bet[] = []): Round {
  return new Round({
    id: "round-1",
    serverSeed: "secret",
    serverSeedHash: "hash",
    clientSeed: "client",
    nonce: 0,
    bettingEndsAt: new Date(Date.now() + 10000),
    createdAt: new Date(),
    bets,
  });
}

describe("Round entity", () => {
  describe("placeBet", () => {
    it("accepts a valid bet during BETTING phase", () => {
      const round = makeBettingRound();
      const bet = makeBet();
      round.placeBet(bet);
      expect(round.bets).toHaveLength(1);
    });

    it("rejects a duplicate bet from the same user", () => {
      const round = makeBettingRound();
      round.placeBet(makeBet("user-1"));
      expect(() => round.placeBet(makeBet("user-1"))).toThrow(DomainError);
    });

    it("rejects bet below minimum (100 cents)", () => {
      const round = makeBettingRound();
      expect(() => round.placeBet(makeBet("user-1", 99n))).toThrow(DomainError);
    });

    it("rejects bet above maximum (1,000,000 cents)", () => {
      const round = makeBettingRound();
      expect(() => round.placeBet(makeBet("user-1", 1_000_001n))).toThrow(DomainError);
    });

    it("rejects bet when round is not in BETTING status", () => {
      const round = makeBettingRound();
      round.start();
      expect(() => round.placeBet(makeBet())).toThrow(DomainError);
    });
  });

  describe("start", () => {
    it("transitions BETTING → RUNNING", () => {
      const round = makeBettingRound();
      round.start();
      expect(round.status).toBe(RoundStatus.RUNNING);
      expect(round.startedAt).toBeInstanceOf(Date);
    });

    it("cannot start a RUNNING round", () => {
      const round = makeBettingRound();
      round.start();
      expect(() => round.start()).toThrow(DomainError);
    });
  });

  describe("cashOutBet", () => {
    it("marks bet as WON and returns correct payout", () => {
      const round = makeBettingRound();
      const bet = makeBet("user-1", 10000n);
      round.placeBet(bet);
      round.activateBet("user-1");
      round.start();

      const payout = round.cashOutBet("user-1", 2.5);
      expect(payout).toBe(25000n); // 10000 * 2.5 = 25000
      expect(round.getBetByUserId("user-1")?.status).toBe(BetStatus.WON);
    });

    it("prevents cashout during BETTING phase", () => {
      const round = makeBettingRound();
      round.placeBet(makeBet("user-1", 10000n));
      round.activateBet("user-1");
      expect(() => round.cashOutBet("user-1", 2.0)).toThrow(DomainError);
    });
  });

  describe("crash", () => {
    it("transitions RUNNING → CRASHED and marks active bets as LOST", () => {
      const round = makeBettingRound();
      const bet = makeBet("user-1", 5000n);
      round.placeBet(bet);
      round.activateBet("user-1");
      round.start();

      const losingBets = round.crash(1.5);
      expect(round.status).toBe(RoundStatus.CRASHED);
      expect(round.crashPoint).toBe(1.5);
      expect(losingBets).toHaveLength(1);
      expect(losingBets[0].status).toBe(BetStatus.LOST);
    });

    it("does not include cashed-out bets as losing bets", () => {
      const round = makeBettingRound();
      round.placeBet(makeBet("user-1", 5000n));
      round.activateBet("user-1");
      round.start();
      round.cashOutBet("user-1", 1.5);

      const losingBets = round.crash(2.0);
      expect(losingBets).toHaveLength(0);
    });
  });
});
