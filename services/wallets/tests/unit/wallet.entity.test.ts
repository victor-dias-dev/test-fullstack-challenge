import { describe, it, expect } from "vitest";
import { Wallet, InsufficientFundsError } from "../../src/domain/wallet.entity";

function makeWallet(balanceCents: bigint = 100000n): Wallet {
  return new Wallet({
    id: "wallet-1",
    userId: "user-1",
    username: "player",
    balanceCents,
    createdAt: new Date(),
  });
}

describe("Wallet domain", () => {
  describe("credit", () => {
    it("increases balance by the credited amount", () => {
      const wallet = makeWallet(10000n);
      wallet.credit(5000n);
      expect(wallet.balanceCents).toBe(15000n);
    });

    it("handles large credits without floating point errors", () => {
      const wallet = makeWallet(0n);
      wallet.credit(100000000n); // 1,000,000.00
      expect(wallet.balanceCents).toBe(100000000n);
    });

    it("throws when credit amount is zero", () => {
      const wallet = makeWallet(10000n);
      expect(() => wallet.credit(0n)).toThrow("Credit amount must be positive");
    });

    it("throws when credit amount is negative", () => {
      const wallet = makeWallet(10000n);
      expect(() => wallet.credit(-100n)).toThrow("Credit amount must be positive");
    });
  });

  describe("debit", () => {
    it("decreases balance by the debited amount", () => {
      const wallet = makeWallet(10000n);
      wallet.debit(3000n);
      expect(wallet.balanceCents).toBe(7000n);
    });

    it("allows debiting full balance", () => {
      const wallet = makeWallet(10000n);
      wallet.debit(10000n);
      expect(wallet.balanceCents).toBe(0n);
    });

    it("throws InsufficientFundsError when balance is too low", () => {
      const wallet = makeWallet(5000n);
      expect(() => wallet.debit(5001n)).toThrow(InsufficientFundsError);
    });

    it("throws when debit amount is zero", () => {
      const wallet = makeWallet(10000n);
      expect(() => wallet.debit(0n)).toThrow("Debit amount must be positive");
    });

    it("never allows negative balance", () => {
      const wallet = makeWallet(100n);
      expect(() => wallet.debit(101n)).toThrow(InsufficientFundsError);
      expect(wallet.balanceCents).toBe(100n); // unchanged
    });
  });

  describe("monetary precision", () => {
    it("handles BigInt arithmetic without floating point drift", () => {
      const wallet = makeWallet(0n);
      // Simulate 100 bets of 1.00 each = 100.00 total
      for (let i = 0; i < 100; i++) {
        wallet.credit(100n);
      }
      expect(wallet.balanceCents).toBe(10000n);
    });

    it("sequential credit and debit maintains exact balance", () => {
      const wallet = makeWallet(0n);
      wallet.credit(99999n);
      wallet.debit(12345n);
      wallet.credit(1n);
      expect(wallet.balanceCents).toBe(87655n);
    });
  });
});
