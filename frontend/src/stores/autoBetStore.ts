import { create } from "zustand";

export const MIN_AUTO_STAKE = 100;
export const MAX_AUTO_STAKE = 100_000;

export type AutoBetStrategy = "fixed" | "martingale";

function clampStake(n: number): number {
  return Math.min(Math.max(Math.round(n), MIN_AUTO_STAKE), MAX_AUTO_STAKE);
}

interface AutoBetState {
  enabled: boolean;
  strategy: AutoBetStrategy;
  baseAmountCents: number;
  nextStakeCents: number;
  stopLossCents: number;
  sessionPnLCents: number;

  setEnabled: (v: boolean) => void;
  setStrategy: (s: AutoBetStrategy) => void;
  setBaseAmountCents: (n: number) => void;
  setStopLossCents: (n: number) => void;
  recordSettledFromActive: (
    outcome: "WON" | "LOST",
    stakeCents: number,
    payoutCents?: bigint,
  ) => void;
  recordCancelled: () => void;
  shouldStopForLoss: () => boolean;
}

export const useAutoBetStore = create<AutoBetState>((set, get) => ({
  enabled: false,
  strategy: "fixed",
  baseAmountCents: 1000,
  nextStakeCents: 1000,
  stopLossCents: 0,
  sessionPnLCents: 0,

  setEnabled: (v) => {
    if (v) {
      const base = clampStake(get().baseAmountCents);
      set({
        enabled: true,
        baseAmountCents: base,
        nextStakeCents: base,
        sessionPnLCents: 0,
      });
    } else {
      set({ enabled: false });
    }
  },

  setStrategy: (s) => {
    const base = clampStake(get().baseAmountCents);
    set({ strategy: s, nextStakeCents: base });
  },

  setBaseAmountCents: (n) => {
    const base = clampStake(n);
    set({ baseAmountCents: base });
    if (get().strategy === "fixed") {
      set({ nextStakeCents: base });
    }
  },

  setStopLossCents: (n) => set({ stopLossCents: Math.max(0, Math.round(n)) }),

  recordSettledFromActive: (outcome, stakeCents, payoutCents) => {
    const { strategy, baseAmountCents } = get();
    let pnlDelta = 0;
    if (outcome === "WON" && payoutCents !== undefined) {
      pnlDelta = Number(payoutCents) - stakeCents;
    } else if (outcome === "LOST") {
      pnlDelta = -stakeCents;
    }
    set((state) => ({
      sessionPnLCents: state.sessionPnLCents + pnlDelta,
    }));

    if (strategy === "fixed") {
      set({ nextStakeCents: clampStake(baseAmountCents) });
    } else {
      if (outcome === "WON") {
        set({ nextStakeCents: clampStake(baseAmountCents) });
      } else {
        const doubled = clampStake(stakeCents * 2);
        set({ nextStakeCents: doubled });
      }
    }
  },

  recordCancelled: () => {
    const base = clampStake(get().baseAmountCents);
    set({ nextStakeCents: base });
  },

  shouldStopForLoss: () => {
    const { stopLossCents, sessionPnLCents } = get();
    return stopLossCents > 0 && sessionPnLCents <= -stopLossCents;
  },
}));
