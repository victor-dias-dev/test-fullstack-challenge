/**
 * Bonus: same growth as server roundMultiplier (round-lifecycle.service.ts).
 */
export function CurveFormulaInfo() {
  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#0a0a0f]/80 px-3 py-2 text-[11px] leading-relaxed text-[#6a6a8a]">
      <span className="font-semibold text-[#6366f1]">Curve (transparency): </span>
      multiplier updates every 100ms as{" "}
      <code className="rounded bg-[#1e1e2e] px-1 text-[#a5b4fc]">
        round(e^(0.00006 × t_ms) × 100) / 100
      </code>
      , where <code className="text-[#a5b4fc]">t_ms</code> is elapsed time since the round started.
    </div>
  );
}
