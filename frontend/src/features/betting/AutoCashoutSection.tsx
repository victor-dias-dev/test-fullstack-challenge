interface AutoCashoutSectionProps {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  multiplier: string;
  onMultiplierChange: (v: string) => void;
}

export function AutoCashoutSection({
  enabled,
  onEnabledChange,
  multiplier,
  onMultiplierChange,
}: AutoCashoutSectionProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#1e1e2e] bg-[#0a0a0f]/50 px-3 py-2.5">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-[#b4b4cc]">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="h-4 w-4 rounded border-[#3f3f55] bg-[#12121a] text-[#00ff88] focus:ring-[#00ff88]/30"
        />
        <span>Auto cash out at</span>
      </label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min="1.01"
          step="0.01"
          value={multiplier}
          onChange={(e) => onMultiplierChange(e.target.value)}
          disabled={!enabled}
          className="w-24 rounded-lg border border-[#2a2a3d] bg-[#12121a] px-2 py-1.5 text-sm font-semibold tabular-nums text-white focus:border-[#00ff88]/40 focus:outline-none focus:ring-1 focus:ring-[#00ff88]/25 disabled:opacity-40"
        />
        <span className="text-sm font-medium text-[#6a6a8a]">×</span>
      </div>
    </div>
  );
}
