import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useGameStore } from "../stores/gameStore";
import { useGameSocket } from "../hooks/useGameSocket";
import { CrashChart } from "../components/CrashChart";
import { BettingControls } from "../components/BettingControls";
import { CountdownTimer } from "../components/CountdownTimer";
import { RoundHistory } from "../components/RoundHistory";
import { LiveBetsTable } from "../components/LiveBetsTable";
import { PlayerInfo } from "../components/PlayerInfo";
export function GamePage() {
    useGameSocket();
    const store = useGameStore();
    // Bootstrap: load current round state on mount
    const { data } = useQuery({
        queryKey: ["current-round"],
        queryFn: () => api.get("/games/rounds/current"),
        refetchInterval: false,
    });
    useEffect(() => {
        const r = data?.round;
        if (!r)
            return;
        store.setRound(r.id, r.serverSeedHash, new Date(r.bettingEndsAt));
        if (r.status === "BETTING")
            store.setPhase("BETTING");
        else if (r.status === "RUNNING") {
            store.setPhase("RUNNING");
            if (r.currentMultiplier)
                store.setMultiplier(r.currentMultiplier);
        }
        else if (r.status === "CRASHED") {
            store.setPhase("CRASHED");
        }
        if (r.bets)
            store.setLiveBets(r.bets);
    }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
    return (_jsx("div", { className: "min-h-screen bg-[#0a0a0f] p-4 md:p-6", children: _jsxs("div", { className: "mx-auto max-w-6xl space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-2xl font-black text-white tracking-tight", children: "\uD83E\uDDA7 CRASH" }), _jsx("span", { className: "rounded-full bg-[#6366f1] px-2 py-0.5 text-xs font-semibold text-white", children: "LIVE" })] }), _jsx(CountdownTimer, {})] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-4", children: [_jsxs("div", { className: "lg:col-span-2 space-y-4", children: [_jsx(CrashChart, {}), _jsx(BettingControls, {})] }), _jsxs("div", { className: "space-y-4", children: [_jsx(PlayerInfo, {}), _jsx(LiveBetsTable, {}), _jsx(RoundHistory, {})] })] })] }) }));
}
