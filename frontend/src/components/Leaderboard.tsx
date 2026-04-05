import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, LeaderboardResponse } from "../lib/api";

type Period = "24h" | "week";

export function Leaderboard() {
  const [period, setPeriod] = useState<Period>("24h");

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () =>
      api.get<LeaderboardResponse>(`/games/leaderboard?period=${period}`),
    refetchInterval: 60_000,
  });

  const entries = data?.entries ?? [];

  function formatProfit(cents: string): string {
    const n = BigInt(cents);
    const sign = n < 0n ? "-" : "";
    const abs = n < 0n ? -n : n;
    const reais = Number(abs) / 100;
    return `${sign}R$${reais.toFixed(2)}`;
  }

  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#12121a] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#4a4a6a]">
          Leaderboard
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setPeriod("24h")}
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              period === "24h"
                ? "bg-[#6366f1] text-white"
                : "bg-[#1e1e2e] text-[#6a6a8a] hover:text-white"
            }`}
          >
            24h
          </button>
          <button
            type="button"
            onClick={() => setPeriod("week")}
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              period === "week"
                ? "bg-[#6366f1] text-white"
                : "bg-[#1e1e2e] text-[#6a6a8a] hover:text-white"
            }`}
          >
            7 dias
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-8 animate-pulse rounded bg-[#1e1e2e]"
            />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-xs text-[#4a4a6a]">Sem apostas liquidadas no período.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => {
            const profit = BigInt(e.profitCents);
            const positive = profit >= 0n;
            return (
              <li
                key={e.userId}
                className="flex items-center justify-between rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#6366f1]">#{e.rank}</span>
                  <span className="font-medium text-white truncate max-w-[120px]">
                    {e.username}
                  </span>
                </span>
                <span
                  className={`font-semibold tabular-nums ${
                    positive ? "text-[#00ff88]" : "text-[#ff3366]"
                  }`}
                >
                  {formatProfit(e.profitCents)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
