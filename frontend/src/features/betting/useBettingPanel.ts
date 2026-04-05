import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useGameStore } from "../../stores/gameStore";
import { useAuthStore } from "../../stores/authStore";
import { useWallet } from "../../hooks/useWallet";
import {
  useAutoBetStore,
  MIN_AUTO_STAKE,
  MAX_AUTO_STAKE,
} from "../../stores/autoBetStore";
import { playBetSound, playCashoutSound } from "../../lib/gameSounds";
import type { PlaceBetResponse, CashOutResponse, ToastState } from "./betting.types";

export function useBettingPanel() {
  const [amountCents, setAmountCents] = useState(1000);
  const [toast, setToast] = useState<ToastState>(null);
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
  const potentialPayout = myBet
    ? ((Number(myBet.amountCents) / 100) * currentMultiplier).toFixed(2)
    : null;

  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

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
      void qc.invalidateQueries({ queryKey: ["current-round"] });
      const r = (stakeCents / 100).toFixed(2);
      showToast(
        "success",
        useAutoBetStore.getState().enabled
          ? `Auto bet R$${r} placed`
          : `Bet of R$${r} placed!`,
      );
    },
    onError: (err) => showToast("error", (err as Error).message),
  });

  const cashOutMutation = useMutation({
    mutationFn: () => api.post<CashOutResponse>("/games/bet/cashout"),
    onSuccess: (data) => {
      playCashoutSound();
      const payout = (Number(data.payoutCents) / 100).toFixed(2);
      const st = useGameStore.getState().myBet;
      if (st) {
        setMyBet({
          ...st,
          status: "WON",
          cashoutMultiplier: data.multiplier,
          payoutCents: BigInt(data.payoutCents),
        });
      }
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
  }, [
    myBet?.status,
    myBet?.betId,
    myBet?.amountCents,
    myBet?.payoutCents,
    recordSettledFromActive,
    recordCancelled,
  ]);

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
    phase === "BETTING" && !myBet && !placeBetMutation.isPending && autoBetEnabled;

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
    showToast,
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

  const baseReais = (baseAmountCents / 100).toFixed(2);
  const stopLossReais = (stopLossCents / 100).toFixed(2);
  const nextStakeReais = (nextStakeCents / 100).toFixed(2);

  const onToggleAutoBet = (enabled: boolean) => {
    if (enabled) {
      setBaseAmountCents(amountCents);
      setAutoBetEnabled(true);
    } else {
      setAutoBetEnabled(false);
    }
  };

  return {
    isAuthenticated,
    phase,
    currentMultiplier,
    myBet,
    wallet,
    toast,
    amountCents,
    setAmountCents,
    amountReais,
    potentialPayout,
    autoCashoutEnabled,
    setAutoCashoutEnabled,
    autoCashoutMultiplier,
    setAutoCashoutMultiplier,
    autoBetEnabled,
    autoBetStrategy,
    baseAmountCents,
    nextStakeCents,
    stopLossCents,
    sessionPnLCents,
    baseReais,
    stopLossReais,
    nextStakeReais,
    setAutoBetStrategy,
    setBaseAmountCents,
    setStopLossCents,
    onToggleAutoBet,
    canBetManual,
    placeBetMutation,
    cashOutMutation,
    canCashOut,
    onPlaceBet: () => placeBetMutation.mutate(amountCents),
    onCashOut: () => cashOutMutation.mutate(),
  };
}
