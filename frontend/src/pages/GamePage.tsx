import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, RoundResponse } from "../lib/api";
import { useGameStore } from "../stores/gameStore";
import { useGameSocket } from "../hooks/useGameSocket";
import { CrashChart } from "../components/CrashChart";
import { CurveFormulaInfo } from "../components/CurveFormulaInfo";
import { BettingControls } from "../components/BettingControls";
import { CountdownTimer } from "../components/CountdownTimer";
import { RoundHistory } from "../components/RoundHistory";
import { LiveBetsTable } from "../components/LiveBetsTable";
import { PlayerInfo } from "../components/PlayerInfo";
import { Leaderboard } from "../components/Leaderboard";

export function GamePage() {
  useGameSocket();

  const store = useGameStore();

  // Bootstrap: load current round state on mount
  const { data } = useQuery({
    queryKey: ["current-round"],
    queryFn: () => api.get<{ round: RoundResponse | null }>("/games/rounds/current"),
    refetchInterval: false,
  });

  useEffect(() => {
    const r = data?.round;
    if (!r) return;

    store.setRound(r.id, r.serverSeedHash, new Date(r.bettingEndsAt));

    if (r.status === "BETTING") store.setPhase("BETTING");
    else if (r.status === "RUNNING") {
      store.setPhase("RUNNING");
      if (r.currentMultiplier) store.setMultiplier(r.currentMultiplier);
    } else if (r.status === "CRASHED") {
      store.setPhase("CRASHED");
    }

    if (r.bets) store.setLiveBets(r.bets);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-white tracking-tight">
              🦧 CRASH
            </span>
            <span className="rounded-full bg-[#6366f1] px-2 py-0.5 text-xs font-semibold text-white">
              LIVE
            </span>
          </div>
          <CountdownTimer />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart — takes 2/3 */}
          <div className="lg:col-span-2 space-y-4">
            <CrashChart />
            <CurveFormulaInfo />
            <BettingControls />
          </div>

          {/* Sidebar — 1/3 */}
          <div className="space-y-4">
            <PlayerInfo />
            <LiveBetsTable />
            <RoundHistory />
            <Leaderboard />
          </div>
        </div>
      </div>
    </div>
  );
}
