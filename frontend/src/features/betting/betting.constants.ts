import type { GamePhase } from "../../stores/gameStore";

/** Stake limits in cents — must match games service (`MIN_BET_CENTS` / `MAX_BET_CENTS`). */
export const MIN_STAKE_CENTS = 100;
/** R$ 1,000.00 */
export const MAX_STAKE_CENTS = 100000;
export const MIN_STAKE_REAIS = 1;
export const MAX_STAKE_REAIS = 1000;

export const STAKE_CHIP_REAIS = [1, 5, 10, 100] as const;

export const PHASE_BADGE: Record<
  GamePhase,
  { label: string; className: string }
> = {
  BETTING: {
    label: "Betting open",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  },
  RUNNING: {
    label: "Round live",
    className: "bg-[#6366f1]/15 text-[#a5b4fc] border-[#6366f1]/30",
  },
  CRASHED: {
    label: "Crashed",
    className: "bg-rose-500/15 text-rose-400 border-rose-500/25",
  },
  WAITING: {
    label: "Starting…",
    className: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  },
};
