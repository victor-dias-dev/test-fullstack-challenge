import type { UseMutationResult } from "@tanstack/react-query";
import type { GamePhase, MyBet } from "../../stores/gameStore";
import type { PlaceBetResponse, CashOutResponse } from "./betting.types";

interface BetPrimaryActionsProps {
  phase: GamePhase;
  myBet: MyBet | null;
  autoBetEnabled: boolean;
  amountReais: string;
  currentMultiplier: number;
  potentialPayout: string | null;
  canBetManual: boolean;
  canCashOut: boolean;
  placeBetMutation: UseMutationResult<PlaceBetResponse, Error, number, unknown>;
  cashOutMutation: UseMutationResult<CashOutResponse, Error, void, unknown>;
  onPlaceBet: () => void;
  onCashOut: () => void;
}

export function BetPrimaryActions({
  phase,
  myBet,
  autoBetEnabled,
  amountReais,
  currentMultiplier,
  potentialPayout,
  canBetManual,
  canCashOut,
  placeBetMutation,
  cashOutMutation,
  onPlaceBet,
  onCashOut,
}: BetPrimaryActionsProps) {
  return (
    <>
      {!myBet && !autoBetEnabled && (
        <button
          type="button"
          onClick={onPlaceBet}
          disabled={!canBetManual}
          aria-busy={placeBetMutation.isPending}
          className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#6366f1] to-[#4f46e5] px-6 py-3.5 text-base font-bold text-white shadow-[0_4px_24px_-4px_rgba(99,102,241,0.55)] transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {placeBetMutation.isPending && (
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-hidden
              />
            )}
            {placeBetMutation.isPending
              ? "Placing bet…"
              : phase === "BETTING"
                ? `Bet R$ ${amountReais}`
                : phase === "RUNNING"
                  ? "Round in progress"
                  : "Wait for next round"}
          </span>
        </button>
      )}

      {myBet?.status === "PENDING" && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-5 py-4 text-center">
          <div
            className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400"
            aria-hidden
          />
          <p className="text-sm font-medium text-amber-200">Confirming bet with wallet…</p>
          <p className="text-xs text-amber-200/70">This usually takes a second.</p>
        </div>
      )}

      {myBet?.status === "ACTIVE" && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={onCashOut}
            disabled={!canCashOut}
            aria-busy={cashOutMutation.isPending}
            className="group w-full rounded-xl bg-gradient-to-r from-[#00ff88] to-[#00dd77] px-6 py-4 text-base font-bold text-[#0a0a0f] shadow-[0_4px_28px_-6px_rgba(0,255,136,0.55)] transition-all hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            <span className="flex flex-col items-center gap-0.5">
              <span className="flex items-center gap-2">
                {cashOutMutation.isPending && (
                  <span
                    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#0a0a0f]/30 border-t-[#0a0a0f]"
                    aria-hidden
                  />
                )}
                {cashOutMutation.isPending ? "Cashing out…" : "Cash out"}
              </span>
              {!cashOutMutation.isPending && (
                <span className="text-sm font-extrabold tabular-nums">
                  {currentMultiplier.toFixed(2)}× → R$ {potentialPayout}
                </span>
              )}
            </span>
          </button>
          {phase === "RUNNING" && (
            <p className="text-center text-[11px] text-[#6a6a8a]">
              Stake R$ {(Number(myBet.amountCents) / 100).toFixed(2)} · live multiplier updates in real
              time
            </p>
          )}
        </div>
      )}

      {myBet?.status === "WON" && (
        <div className="rounded-xl border border-[#00ff88]/40 bg-[#00ff88]/10 px-6 py-4 text-center shadow-[inset_0_1px_0_0_rgba(0,255,136,0.15)]">
          <p className="text-xs font-medium uppercase tracking-wide text-[#00ff88]/90">You won</p>
          <p className="mt-1 text-xl font-black tabular-nums text-[#00ff88]">
            R$ {(Number(myBet.payoutCents ?? 0n) / 100).toFixed(2)}
          </p>
          <p className="text-sm text-[#86ffc0]">Cashed at {myBet.cashoutMultiplier?.toFixed(2)}×</p>
        </div>
      )}

      {myBet?.status === "LOST" && (
        <div className="rounded-xl border border-[#ff3366]/35 bg-[#ff3366]/10 px-6 py-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-[#ff9aab]">Round crashed</p>
          <p className="mt-1 text-sm text-[#ffc8d0]">
            Lost{" "}
            <span className="font-bold text-white">
              R$ {(Number(myBet.amountCents) / 100).toFixed(2)}
            </span>
          </p>
        </div>
      )}
    </>
  );
}
