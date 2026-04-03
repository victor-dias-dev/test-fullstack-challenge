import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useGameStore } from "../stores/gameStore";
import { useAuthStore } from "../stores/authStore";
import { useWallet } from "../hooks/useWallet";

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
  const { phase, currentMultiplier, myBet, setMyBet } = useGameStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: wallet, refetch: refetchWallet } = useWallet();
  const qc = useQueryClient();

  const amountReais = (amountCents / 100).toFixed(2);
  const potentialPayout = myBet ? (Number(myBet.amountCents) / 100 * currentMultiplier).toFixed(2) : null;

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  const placeBetMutation = useMutation({
    mutationFn: () => api.post<PlaceBetResponse>("/games/bet", { amountCents }),
    onSuccess: (data) => {
      setMyBet({
        betId: data.betId,
        amountCents: BigInt(amountCents),
        status: "PENDING",
      });
      showToast("success", `Bet of R$${amountReais} placed!`);
    },
    onError: (err) => showToast("error", (err as Error).message),
  });

  const cashOutMutation = useMutation({
    mutationFn: () => api.post<CashOutResponse>("/games/bet/cashout"),
    onSuccess: (data) => {
      const payout = (Number(data.payoutCents) / 100).toFixed(2);
      setMyBet({ ...myBet!, status: "WON", cashoutMultiplier: data.multiplier, payoutCents: BigInt(data.payoutCents) });
      showToast("success", `Cashed out at ${data.multiplier.toFixed(2)}x — R$${payout}!`);
      void refetchWallet();
      void qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (err) => showToast("error", (err as Error).message),
  });

  useEffect(() => {
    if (phase === "BETTING") {
      setMyBet(null);
    }
  }, [phase, setMyBet]);

  if (!isAuthenticated) {
    return (
      <div className="rounded-xl border border-[#1e1e2e] bg-[#12121a] p-6 text-center text-sm text-[#6366f1]">
        Login to place bets
      </div>
    );
  }

  const canBet = phase === "BETTING" && !myBet && !placeBetMutation.isPending;
  const canCashOut =
    phase === "RUNNING" &&
    myBet?.status === "ACTIVE" &&
    !cashOutMutation.isPending;

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
            disabled={!canBet}
            className="w-full rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] px-3 py-2 text-white text-sm focus:border-[#6366f1] focus:outline-none disabled:opacity-50"
          />
        </div>
        <div className="flex gap-2 pt-5">
          {["1", "5", "10", "100"].map((v) => (
            <button
              key={v}
              onClick={() => setAmountCents(parseInt(v) * 100)}
              disabled={!canBet}
              className="rounded-lg bg-[#1e1e2e] px-2 py-1 text-xs text-white hover:bg-[#2e2e3e] disabled:opacity-40"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {wallet && (
        <div className="text-xs text-[#4a4a6a]">
          Balance: <span className="text-white">R${wallet.balanceReais}</span>
        </div>
      )}

      {!myBet && (
        <button
          onClick={() => placeBetMutation.mutate()}
          disabled={!canBet}
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
