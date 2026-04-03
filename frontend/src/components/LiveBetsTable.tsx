import { useGameStore } from "../stores/gameStore";

export function LiveBetsTable() {
  const { liveBets } = useGameStore();

  if (liveBets.length === 0) {
    return (
      <div className="rounded-xl border border-[#1e1e2e] bg-[#12121a] p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#4a4a6a]">
          Live Bets
        </h3>
        <p className="text-xs text-[#4a4a6a]">No bets yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#12121a] p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#4a4a6a]">
        Live Bets ({liveBets.length})
      </h3>
      <div className="max-h-64 overflow-y-auto space-y-1">
        {liveBets.map((bet) => (
          <div
            key={bet.id}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
              bet.status === "WON"
                ? "bg-[#00ff8810]"
                : bet.status === "LOST"
                ? "bg-[#ff336610]"
                : "bg-[#1e1e2e]"
            }`}
          >
            <span className="font-medium text-white truncate max-w-[120px]">
              {bet.username}
            </span>
            <span className="text-[#4a4a6a] text-xs">
              R${(Number(bet.amountCents) / 100).toFixed(2)}
            </span>
            {bet.status === "WON" && bet.cashoutMultiplier && (
              <span className="text-[#00ff88] font-bold text-xs">
                {bet.cashoutMultiplier.toFixed(2)}x
              </span>
            )}
            {bet.status === "LOST" && (
              <span className="text-[#ff3366] text-xs">Lost</span>
            )}
            {bet.status === "ACTIVE" && (
              <span className="h-2 w-2 rounded-full bg-[#6366f1] animate-pulse" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
