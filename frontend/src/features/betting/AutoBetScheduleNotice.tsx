interface AutoBetScheduleNoticeProps {
  nextStakeReais: string;
}

export function AutoBetScheduleNotice({ nextStakeReais }: AutoBetScheduleNoticeProps) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/95">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" aria-hidden />
      <span>
        Auto bet will place <strong className="text-white">R$ {nextStakeReais}</strong> when betting
        opens.
      </span>
    </div>
  );
}
