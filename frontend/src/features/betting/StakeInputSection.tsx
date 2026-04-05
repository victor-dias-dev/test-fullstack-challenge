import { STAKE_CHIP_REAIS } from "./betting.constants";

interface StakeInputSectionProps {
  amountReais: string;
  amountCents: number;
  canBetManual: boolean;
  onAmountCentsChange: (cents: number) => void;
}

export function StakeInputSection({
  amountReais,
  amountCents,
  canBetManual,
  onAmountCentsChange,
}: StakeInputSectionProps) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-[#6a6a8a]">
        Stake (R$)
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6a6a8a]">
            R$
          </span>
          <input
            type="number"
            min="1"
            max="1000"
            step="1"
            value={amountReais}
            onChange={(e) => onAmountCentsChange(Math.round(parseFloat(e.target.value) * 100))}
            disabled={!canBetManual}
            className="w-full rounded-xl border border-[#2a2a3d] bg-[#0a0a0f] py-2.5 pl-10 pr-3 text-base font-semibold tabular-nums text-white placeholder:text-[#4a4a60] focus:border-[#6366f1]/60 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 disabled:cursor-not-allowed disabled:opacity-45"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 sm:max-w-[220px] sm:flex-1">
          {STAKE_CHIP_REAIS.map((v) => {
            const active = amountCents === v * 100;
            return (
              <button
                key={v}
                type="button"
                onClick={() => onAmountCentsChange(v * 100)}
                disabled={!canBetManual}
                className={`min-w-[2.75rem] flex-1 rounded-lg px-2 py-2 text-xs font-bold transition-all disabled:opacity-40 ${
                  active
                    ? "bg-[#6366f1] text-white shadow-[0_0_16px_-4px_rgba(99,102,241,0.6)]"
                    : "border border-[#2a2a3d] bg-[#1a1a24] text-[#c4c4e0] hover:border-[#6366f1]/40 hover:bg-[#1e1e2e]"
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
