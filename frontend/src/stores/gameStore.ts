import { create } from "zustand";
import type { BetResponse } from "../lib/api";

export type GamePhase = "BETTING" | "RUNNING" | "CRASHED" | "WAITING";

interface MyBet {
  betId: string;
  amountCents: bigint;
  status: "PENDING" | "ACTIVE" | "WON" | "LOST" | "CANCELLED";
  cashoutMultiplier?: number;
  payoutCents?: bigint;
}

interface GameState {
  phase: GamePhase;
  currentMultiplier: number;
  roundId: string | null;
  serverSeedHash: string | null;
  bettingEndsAt: Date | null;
  liveBets: BetResponse[];
  myBet: MyBet | null;
  lastCrashPoint: number | null;

  setPhase: (phase: GamePhase) => void;
  setMultiplier: (m: number) => void;
  setRound: (roundId: string, serverSeedHash: string, bettingEndsAt: Date) => void;
  setLiveBets: (bets: BetResponse[]) => void;
  addLiveBet: (bet: BetResponse) => void;
  updateLiveBet: (betId: string, updates: Partial<BetResponse>) => void;
  setMyBet: (bet: MyBet | null) => void;
  updateMyBet: (updates: Partial<MyBet>) => void;
  setCrash: (crashPoint: number) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  phase: "WAITING",
  currentMultiplier: 1.0,
  roundId: null,
  serverSeedHash: null,
  bettingEndsAt: null,
  liveBets: [],
  myBet: null,
  lastCrashPoint: null,

  setPhase: (phase) => set({ phase }),
  setMultiplier: (currentMultiplier) => set({ currentMultiplier }),
  setRound: (roundId, serverSeedHash, bettingEndsAt) =>
    set({ roundId, serverSeedHash, bettingEndsAt }),
  setLiveBets: (liveBets) => set({ liveBets }),
  addLiveBet: (bet) =>
    set((s) => ({ liveBets: [...s.liveBets.filter((b) => b.id !== bet.id), bet] })),
  updateLiveBet: (betId, updates) =>
    set((s) => ({
      liveBets: s.liveBets.map((b) =>
        b.id === betId ? { ...b, ...updates } : b,
      ),
    })),
  setMyBet: (myBet) => set({ myBet }),
  updateMyBet: (updates) =>
    set((s) => ({ myBet: s.myBet ? { ...s.myBet, ...updates } : null })),
  setCrash: (lastCrashPoint) =>
    set({ lastCrashPoint, phase: "CRASHED", currentMultiplier: lastCrashPoint }),
  reset: () =>
    set({
      phase: "WAITING",
      currentMultiplier: 1.0,
      roundId: null,
      serverSeedHash: null,
      bettingEndsAt: null,
      liveBets: [],
      myBet: null,
    }),
}));
