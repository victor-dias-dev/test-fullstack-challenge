import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useGameStore } from "../stores/gameStore";
export function CountdownTimer() {
    const { phase, bettingEndsAt } = useGameStore();
    const [remaining, setRemaining] = useState(0);
    useEffect(() => {
        if (phase !== "BETTING" || !bettingEndsAt) {
            setRemaining(0);
            return;
        }
        const update = () => {
            const diff = Math.max(0, bettingEndsAt.getTime() - Date.now());
            setRemaining(diff);
        };
        update();
        const id = setInterval(update, 100);
        return () => clearInterval(id);
    }, [phase, bettingEndsAt]);
    if (phase !== "BETTING")
        return null;
    const secs = (remaining / 1000).toFixed(1);
    return (_jsxs("div", { className: "flex items-center gap-2 rounded-lg bg-[#1e1e2e] px-4 py-2", children: [_jsx("span", { className: "text-xs text-[#4a4a6a]", children: "Betting closes in" }), _jsxs("span", { className: "font-bold text-[#ffcc00] tabular-nums", children: [secs, "s"] })] }));
}
