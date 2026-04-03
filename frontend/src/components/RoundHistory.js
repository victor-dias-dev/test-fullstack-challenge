import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
function CrashBadge({ crashPoint }) {
    let color = "bg-[#ff336620] text-[#ff3366] border-[#ff336640]";
    if (crashPoint >= 5)
        color = "bg-[#00ff8820] text-[#00ff88] border-[#00ff8840]";
    else if (crashPoint >= 2)
        color = "bg-[#ffcc0020] text-[#ffcc00] border-[#ffcc0040]";
    return (_jsxs("span", { className: `inline-flex rounded px-2 py-0.5 text-xs font-bold border ${color}`, children: [crashPoint.toFixed(2), "x"] }));
}
export function RoundHistory() {
    const { data } = useQuery({
        queryKey: ["round-history"],
        queryFn: () => api.get("/games/rounds/history?limit=20"),
        refetchInterval: 10000,
    });
    const rounds = data?.data ?? [];
    return (_jsxs("div", { className: "rounded-xl border border-[#1e1e2e] bg-[#12121a] p-4", children: [_jsx("h3", { className: "mb-3 text-xs font-semibold uppercase tracking-wider text-[#4a4a6a]", children: "Round History" }), rounds.length === 0 ? (_jsx("p", { className: "text-xs text-[#4a4a6a]", children: "No rounds yet" })) : (_jsx("div", { className: "flex flex-wrap gap-2", children: rounds.map((r) => (_jsx(CrashBadge, { crashPoint: r.crashPoint }, r.id))) }))] }));
}
