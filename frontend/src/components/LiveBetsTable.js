import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useGameStore } from "../stores/gameStore";
export function LiveBetsTable() {
    const { liveBets } = useGameStore();
    if (liveBets.length === 0) {
        return (_jsxs("div", { className: "rounded-xl border border-[#1e1e2e] bg-[#12121a] p-4", children: [_jsx("h3", { className: "mb-3 text-xs font-semibold uppercase tracking-wider text-[#4a4a6a]", children: "Live Bets" }), _jsx("p", { className: "text-xs text-[#4a4a6a]", children: "No bets yet" })] }));
    }
    return (_jsxs("div", { className: "rounded-xl border border-[#1e1e2e] bg-[#12121a] p-4", children: [_jsxs("h3", { className: "mb-3 text-xs font-semibold uppercase tracking-wider text-[#4a4a6a]", children: ["Live Bets (", liveBets.length, ")"] }), _jsx("div", { className: "max-h-64 overflow-y-auto space-y-1", children: liveBets.map((bet) => (_jsxs("div", { className: `flex items-center justify-between rounded-lg px-3 py-2 text-sm ${bet.status === "WON"
                        ? "bg-[#00ff8810]"
                        : bet.status === "LOST"
                            ? "bg-[#ff336610]"
                            : "bg-[#1e1e2e]"}`, children: [_jsx("span", { className: "font-medium text-white truncate max-w-[120px]", children: bet.username }), _jsxs("span", { className: "text-[#4a4a6a] text-xs", children: ["R$", (Number(bet.amountCents) / 100).toFixed(2)] }), bet.status === "WON" && bet.cashoutMultiplier && (_jsxs("span", { className: "text-[#00ff88] font-bold text-xs", children: [bet.cashoutMultiplier.toFixed(2), "x"] })), bet.status === "LOST" && (_jsx("span", { className: "text-[#ff3366] text-xs", children: "Lost" })), bet.status === "ACTIVE" && (_jsx("span", { className: "h-2 w-2 rounded-full bg-[#6366f1] animate-pulse" }))] }, bet.id))) })] }));
}
