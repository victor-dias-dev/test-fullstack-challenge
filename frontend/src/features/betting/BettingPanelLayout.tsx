import type { ReactNode } from "react";
import { PHASE_BADGE } from "./betting.constants";
import type { GamePhase } from "../../stores/gameStore";

interface BettingPanelLayoutProps {
  phase: GamePhase;
  children: ReactNode;
}

export function BettingPanelLayout({ phase, children }: BettingPanelLayoutProps) {
  const badge = PHASE_BADGE[phase];

  return (
    <div className="rounded-2xl border border-[#2a2a3d] bg-gradient-to-b from-[#14141c] to-[#101018] p-5 shadow-[0_0_48px_-16px_rgba(99,102,241,0.25)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8b8ba8]">Bet panel</h2>
          <p className="text-[11px] text-[#5c5c72]">Min R$1 · Max R$1.000</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>
      {children}
    </div>
  );
}
