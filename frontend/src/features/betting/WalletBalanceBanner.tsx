import type { WalletResponse } from "../../lib/api";

interface WalletBalanceBannerProps {
  wallet: WalletResponse;
}

export function WalletBalanceBanner({ wallet }: WalletBalanceBannerProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#1e1e2e] bg-[#0a0a0f]/80 px-4 py-3">
      <span className="text-xs text-[#6a6a8a]">Balance</span>
      <span className="text-lg font-bold tabular-nums tracking-tight text-white">
        R$ {wallet.balanceReais}
      </span>
    </div>
  );
}
