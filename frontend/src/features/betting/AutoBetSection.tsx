import { MIN_AUTO_STAKE } from "../../stores/autoBetStore";

interface AutoBetSectionProps {
  autoBetEnabled: boolean;
  onToggleAutoBet: (enabled: boolean) => void;
  autoBetStrategy: "fixed" | "martingale";
  onStrategyChange: (v: "fixed" | "martingale") => void;
  baseReais: string;
  onBaseReaisChange: (cents: number) => void;
  stopLossCents: number;
  stopLossReais: string;
  onStopLossChange: (cents: number) => void;
  nextStakeReais: string;
  sessionPnLCents: number;
}

export function AutoBetSection({
  autoBetEnabled,
  onToggleAutoBet,
  autoBetStrategy,
  onStrategyChange,
  baseReais,
  onBaseReaisChange,
  stopLossCents,
  stopLossReais,
  onStopLossChange,
  nextStakeReais,
  sessionPnLCents,
}: AutoBetSectionProps) {
  return (
    <div className="mb-4 rounded-xl border border-[#1e1e2e] bg-[#0a0a0f]/60 p-3">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={autoBetEnabled}
          onChange={(e) => onToggleAutoBet(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#3f3f55] bg-[#12121a] text-[#6366f1] focus:ring-[#6366f1]/40"
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[#c4c4e0]">Auto bet</span>
          <span className="text-xs text-[#5c5c72]">
            Fixed or Martingale · optional session stop-loss
          </span>
        </span>
      </label>

      {autoBetEnabled && (
        <div className="mt-3 grid gap-3 border-t border-[#1e1e2e]/80 pt-3 text-xs sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#6a6a8a]">
              Strategy
            </label>
            <select
              value={autoBetStrategy}
              onChange={(e) => onStrategyChange(e.target.value as "fixed" | "martingale")}
              className="w-full rounded-lg border border-[#2a2a3d] bg-[#12121a] px-3 py-2 text-sm text-white focus:border-[#6366f1]/50 focus:outline-none focus:ring-1 focus:ring-[#6366f1]/30"
            >
              <option value="fixed">Fixed amount</option>
              <option value="martingale">Martingale (double on loss)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#6a6a8a]">
              Base (R$)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step={0.01}
              value={baseReais}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "" || raw === ".") return;
                const reais = Number.parseFloat(raw.replace(",", "."));
                if (!Number.isFinite(reais)) return;
                const cents = Math.round(reais * 100);
                onBaseReaisChange(cents > 0 ? cents : MIN_AUTO_STAKE);
              }}
              className="w-full rounded-lg border border-[#2a2a3d] bg-[#12121a] px-3 py-2 text-sm text-white tabular-nums focus:border-[#6366f1]/50 focus:outline-none focus:ring-1 focus:ring-[#6366f1]/30"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#6a6a8a]">
              Stop-loss (R$) · 0 = off
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={stopLossCents === 0 ? "" : stopLossReais}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  onStopLossChange(0);
                  return;
                }
                onStopLossChange(Math.round(parseFloat(v) * 100));
              }}
              placeholder="0"
              className="w-full rounded-lg border border-[#2a2a3d] bg-[#12121a] px-3 py-2 text-sm text-white tabular-nums focus:border-[#6366f1]/50 focus:outline-none focus:ring-1 focus:ring-[#6366f1]/30"
            />
          </div>
          <div className="sm:col-span-2 flex flex-wrap gap-x-6 gap-y-2 text-[#8b8ba8]">
            <span>
              Next stake <span className="font-semibold text-white">R$ {nextStakeReais}</span>
            </span>
            <span>
              Session P&amp;L{" "}
              <span
                className={
                  sessionPnLCents >= 0 ? "font-semibold text-[#00ff88]" : "font-semibold text-[#ff6b8a]"
                }
              >
                {sessionPnLCents >= 0 ? "" : "−"}R$ {Math.abs(sessionPnLCents / 100).toFixed(2)}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
