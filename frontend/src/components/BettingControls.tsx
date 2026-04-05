import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useGameStore } from "../stores/gameStore";
import { useAuthStore } from "../stores/authStore";
import { useWallet } from "../hooks/useWallet";
import {
  useAutoBetStore,
  MIN_AUTO_STAKE,
  MAX_AUTO_STAKE,
} from "../stores/autoBetStore";
import { playBetSound, playCashoutSound } from "../lib/gameSounds";

interface PlaceBetResponse {
  betId: string;
  roundId: string;
}

interface CashOutResponse {
  betId: string;
  multiplier: number;
  payoutCents: string;
}

export function BettingControls() {
  const [amountCents, setAmountCents] = useState(1000);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const [autoCashoutMultiplier, setAutoCashoutMultiplier] = useState("2");
  const autoCashoutFiredRef = useRef(false);
  const prevBetStatusRef = useRef<string | undefined>(undefined);
  const settledOutcomeBetIdRef = useRef<string | null>(null);
  const autoBetAttemptRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { phase, currentMultiplier, myBet, setMyBet } = useGameStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: wallet, refetch: refetchWallet } = useWallet();
  const qc = useQueryClient();

  const autoBetEnabled = useAutoBetStore((s) => s.enabled);
  const autoBetStrategy = useAutoBetStore((s) => s.strategy);
  const baseAmountCents = useAutoBetStore((s) => s.baseAmountCents);
  const nextStakeCents = useAutoBetStore((s) => s.nextStakeCents);
  const stopLossCents = useAutoBetStore((s) => s.stopLossCents);
  const sessionPnLCents = useAutoBetStore((s) => s.sessionPnLCents);
  const setAutoBetEnabled = useAutoBetStore((s) => s.setEnabled);
  const setAutoBetStrategy = useAutoBetStore((s) => s.setStrategy);
  const setBaseAmountCents = useAutoBetStore((s) => s.setBaseAmountCents);
  const setStopLossCents = useAutoBetStore((s) => s.setStopLossCents);
  const recordSettledFromActive = useAutoBetStore((s) => s.recordSettledFromActive);
  const recordCancelled = useAutoBetStore((s) => s.recordCancelled);
  const amountReais = (amountCents / 100).toFixed(2);
  const potentialPayout = myBet ? (Number(myBet.amountCents) / 100 * currentMultiplier).toFixed(2) : null;

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  const placeBetMutation = useMutation({
    mutationFn: (stakeCents: number) =>
      api.post<PlaceBetResponse>("/games/bet", { amountCents: stakeCents }),
    onSuccess: (data, stakeCents) => {
      playBetSound();
      setMyBet({
        betId: data.betId,
        amountCents: BigInt(stakeCents),
        status: "PENDING",
      });
      const r = (stakeCents / 100).toFixed(2);
      showToast(
        "success",
        autoBetEnabled ? `Auto bet R$${r} placed` : `Bet of R$${r} placed!`,
      );
    },
    onError: (err) => showToast("error", (err as Error).message),
  });

  const cashOutMutation = useMutation({
    mutationFn: () => api.post<CashOutResponse>("/games/bet/cashout"),
    onSuccess: (data) => {
      playCashoutSound();
      const payout = (Number(data.payoutCents) / 100).toFixed(2);
      setMyBet({ ...myBet!, status: "WON", cashoutMultiplier: data.multiplier, payoutCents: BigInt(data.payoutCents) });
      showToast("success", `Cashed out at ${data.multiplier.toFixed(2)}x — R$${payout}!`);
      void refetchWallet();
      void qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (err) => {
      autoCashoutFiredRef.current = false;
      showToast("error", (err as Error).message);
    },
  });

  useEffect(() => {
    const prev = prevBetStatusRef.current;
    const cur = myBet?.status;
    const bid = myBet?.betId;

    if (
      bid &&
      prev === "ACTIVE" &&
      (cur === "WON" || cur === "LOST") &&
      settledOutcomeBetIdRef.current !== bid
    ) {
      settledOutcomeBetIdRef.current = bid;
      if (cur === "WON" && myBet.payoutCents !== undefined) {
        recordSettledFromActive("WON", Number(myBet.amountCents), myBet.payoutCents);
      } else if (cur === "LOST") {
        recordSettledFromActive("LOST", Number(myBet.amountCents));
      }
    }
    if (prev === "PENDING" && cur === "CANCELLED") {
      recordCancelled();
    }

    prevBetStatusRef.current = cur;
  }, [myBet?.status, myBet?.betId, myBet?.amountCents, myBet?.payoutCents, recordSettledFromActive, recordCancelled]);

  useEffect(() => {
    if (phase === "BETTING") {
      setMyBet(null);
      autoCashoutFiredRef.current = false;
      settledOutcomeBetIdRef.current = null;
    }
  }, [phase, setMyBet]);

  useEffect(() => {
    autoCashoutFiredRef.current = false;
  }, [myBet?.betId]);

  const canBetManual =
    phase === "BETTING" && !myBet && !placeBetMutation.isPending && !autoBetEnabled;
  const canBetAuto =
    phase === "BETTING" &&
    !myBet &&
    !placeBetMutation.isPending &&
    autoBetEnabled;

  useEffect(() => {
    if (!canBetAuto || !isAuthenticated) {
      if (autoBetAttemptRef.current) {
        clearTimeout(autoBetAttemptRef.current);
        autoBetAttemptRef.current = null;
      }
      return;
    }

    if (useAutoBetStore.getState().shouldStopForLoss()) {
      setAutoBetEnabled(false);
      showToast("error", "Stop-loss reached — auto bet disabled.");
      return;
    }

    const stake = useAutoBetStore.getState().nextStakeCents;
    if (stake < MIN_AUTO_STAKE || stake > MAX_AUTO_STAKE) return;

    if (wallet && BigInt(wallet.balanceCents) < BigInt(stake)) {
      return;
    }

    autoBetAttemptRef.current = setTimeout(() => {
      if (useAutoBetStore.getState().shouldStopForLoss()) {
        setAutoBetEnabled(false);
        return;
      }
      const s = useAutoBetStore.getState().nextStakeCents;
      placeBetMutation.mutate(s);
    }, 450);

    return () => {
      if (autoBetAttemptRef.current) {
        clearTimeout(autoBetAttemptRef.current);
        autoBetAttemptRef.current = null;
      }
    };
  }, [
    canBetAuto,
    isAuthenticated,
    nextStakeCents,
    wallet?.balanceCents,
    placeBetMutation,
    setAutoBetEnabled,
  ]);

  const canCashOut =
    phase === "RUNNING" &&
    myBet?.status === "ACTIVE" &&
    !cashOutMutation.isPending;

  useEffect(() => {
    if (!autoCashoutEnabled || !canCashOut || autoCashoutFiredRef.current) return;
    const target = parseFloat(autoCashoutMultiplier.replace(",", "."));
    if (!Number.isFinite(target) || target < 1.01) return;
    if (currentMultiplier >= target) {
      autoCashoutFiredRef.current = true;
      cashOutMutation.mutate();
    }
  }, [
    autoCashoutEnabled,
    canCashOut,
    currentMultiplier,
    autoCashoutMultiplier,
    cashOutMutation,
  ]);

  if (!isAuthenticated) {
    return (
      <div className="rounded-xl border border-[#1e1e2e] bg-[#12121a] p-6 text-center text-sm text-[#6366f1]">
        Login to place bets
      </div>
    );
  }

  const baseReais = (baseAmountCents / 100).toFixed(2);
  const stopLossReais = (stopLossCents / 100).toFixed(2);
  const nextStakeReais = (nextStakeCents / 100).toFixed(2);

  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#12121a] p-5 space-y-4">
      {toast && (
        <div
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            toast.type === "success"
              ? "bg-[#00ff8820] text-[#00ff88] border border-[#00ff8840]"
              : "bg-[#ff336620] text-[#ff3366] border border-[#ff336640]"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] p-3 space-y-3">
        <label className="flex items-center gap-2 text-xs text-[#6a6a8a] cursor-pointer">
          <input
            type="checkbox"
            checked={autoBetEnabled}
            onChange={(e) => {
              if (e.target.checked) {
                setBaseAmountCents(amountCents);
                setAutoBetEnabled(true);
              } else {
                setAutoBetEnabled(false);
              }
            }}
            className="rounded border-[#1e1e2e]"
          />
          <span className="font-semibold text-[#6366f1]">Auto bet</span>
          <span className="text-[#4a4a6a]">(fixed / Martingale, stop-loss)</span>
        </label>

        {autoBetEnabled && (
          <div className="grid gap-2 sm:grid-cols-2 text-xs">
            <div>
              <label className="text-[#4a4a6a]">Strategy</label>
              <select
                value={autoBetStrategy}
                onChange={(e) =>
                  setAutoBetStrategy(e.target.value as "fixed" | "martingale")
                }
                className="mt-1 w-full rounded bg-[#12121a] border border-[#1e1e2e] px-2 py-1.5 text-white"
              >
                <option value="fixed">Fixed amount</option>
                <option value="martingale">Martingale (double on loss)</option>
              </select>
            </div>
            <div>
              <label className="text-[#4a4a6a]">Base (R$)</label>
              <input
                type="number"
                min={1}
                max={1000}
                step={1}
                value={baseReais}
                onChange={(e) =>
                  setBaseAmountCents(Math.round(parseFloat(e.target.value) * 100) || MIN_AUTO_STAKE)
                }
                className="mt-1 w-full rounded bg-[#12121a] border border-[#1e1e2e] px-2 py-1.5 text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[#4a4a6a]">Stop-loss session (R$, 0 = off)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={stopLossCents === 0 ? "" : stopLossReais}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    setStopLossCents(0);
                    return;
                  }
                  setStopLossCents(Math.round(parseFloat(v) * 100));
                }}
                placeholder="0"
                className="mt-1 w-full rounded bg-[#12121a] border border-[#1e1e2e] px-2 py-1.5 text-white"
              />
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-3 text-[#6a6a8a]">
              <span>
                Next stake: <span className="text-white font-medium">R${nextStakeReais}</span>
              </span>
              <span>
                Session P&amp;L:{" "}
                <span
                  className={
                    sessionPnLCents >= 0 ? "text-[#00ff88]" : "text-[#ff3366]"
                  }
                >
                  {sessionPnLCents >= 0 ? "" : "-"}R$
                  {Math.abs(sessionPnLCents / 100).toFixed(2)}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-xs text-[#6366f1] mb-1">Bet Amount (R$)</label>
          <input
            type="number"
            min="1"
            max="1000"
            step="1"
            value={amountReais}
            onChange={(e) => setAmountCents(Math.round(parseFloat(e.target.value) * 100))}
            disabled={!canBetManual}
            className="w-full rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] px-3 py-2 text-white text-sm focus:border-[#6366f1] focus:outline-none disabled:opacity-50"
          />
        </div>
        <div className="flex gap-2 pt-5">
          {["1", "5", "10", "100"].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmountCents(parseInt(v) * 100)}
              disabled={!canBetManual}
              className="rounded-lg bg-[#1e1e2e] px-2 py-1 text-xs text-white hover:bg-[#2e2e3e] disabled:opacity-40"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] px-3 py-2">
        <label className="flex items-center gap-2 text-xs text-[#6a6a8a] cursor-pointer">
          <input
            type="checkbox"
            checked={autoCashoutEnabled}
            onChange={(e) => setAutoCashoutEnabled(e.target.checked)}
            className="rounded border-[#1e1e2e]"
          />
          <span>Auto cash out at</span>
        </label>
        <input
          type="number"
          min="1.01"
          step="0.01"
          value={autoCashoutMultiplier}
          onChange={(e) => setAutoCashoutMultiplier(e.target.value)}
          disabled={!autoCashoutEnabled}
          className="w-24 rounded bg-[#12121a] border border-[#1e1e2e] px-2 py-1 text-sm text-white disabled:opacity-40"
        />
        <span className="text-xs text-[#4a4a6a]">× (bonus)</span>
      </div>

      {wallet && (
        <div className="text-xs text-[#4a4a6a]">
          Balance: <span className="text-white">R${wallet.balanceReais}</span>
        </div>
      )}

      {autoBetEnabled && phase === "BETTING" && !myBet && (
        <div className="rounded-lg bg-[#1e1e2e] px-4 py-2 text-center text-sm text-[#ffcc00]">
          Auto bet will place R${nextStakeReais} when the round opens…
        </div>
      )}

      {!myBet && !autoBetEnabled && (
        <button
          type="button"
          onClick={() => placeBetMutation.mutate(amountCents)}
          disabled={!canBetManual}
          className="w-full rounded-xl bg-[#6366f1] px-6 py-3 font-bold text-white transition-all hover:bg-[#5254d4] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {placeBetMutation.isPending
            ? "Placing..."
            : phase === "BETTING"
            ? `Bet R$${amountReais}`
            : phase === "RUNNING"
            ? "Round in progress"
            : "Wait for next round"}
        </button>
      )}

      {myBet && myBet.status === "PENDING" && (
        <div className="rounded-xl bg-[#1e1e2e] px-6 py-3 text-center text-sm text-[#ffcc00]">
          Bet pending confirmation...
        </div>
      )}

      {myBet && myBet.status === "ACTIVE" && (
        <button
          type="button"
          onClick={() => cashOutMutation.mutate()}
          disabled={!canCashOut}
          className="w-full rounded-xl bg-[#00ff88] px-6 py-3 font-bold text-black transition-all hover:bg-[#00dd77] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {cashOutMutation.isPending
            ? "Cashing out..."
            : `Cash Out @ ${currentMultiplier.toFixed(2)}x — R$${potentialPayout}`}
        </button>
      )}

      {myBet && myBet.status === "WON" && (
        <div className="rounded-xl bg-[#00ff8820] border border-[#00ff8840] px-6 py-3 text-center font-bold text-[#00ff88]">
          Won R${(Number(myBet.payoutCents ?? 0n) / 100).toFixed(2)} @ {myBet.cashoutMultiplier?.toFixed(2)}x!
        </div>
      )}

      {myBet && myBet.status === "LOST" && (
        <div className="rounded-xl bg-[#ff336620] border border-[#ff336640] px-6 py-3 text-center font-bold text-[#ff3366]">
          Crashed — lost R${(Number(myBet.amountCents) / 100).toFixed(2)}
        </div>
      )}
    </div>
  );
}
