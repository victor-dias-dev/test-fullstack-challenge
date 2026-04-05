export function BettingLoginPrompt() {
  return (
    <div className="rounded-2xl border border-[#1e1e2e] bg-gradient-to-b from-[#16161f] to-[#12121a] p-8 text-center shadow-[0_0_40px_-12px_rgba(99,102,241,0.35)]">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#6366f1]/15 text-xl">
        🔐
      </div>
      <p className="text-sm font-medium text-white">Sign in to play</p>
      <p className="mt-1 text-xs text-[#6a6a8a]">Place bets and cash out before the crash.</p>
    </div>
  );
}
