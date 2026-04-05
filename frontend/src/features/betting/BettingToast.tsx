import type { ToastState } from "./betting.types";

interface BettingToastProps {
  toast: NonNullable<ToastState>;
}

export function BettingToast({ toast }: BettingToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`mb-4 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg ${
        toast.type === "success"
          ? "bg-[#00ff88]/12 text-[#7dffc4] ring-1 ring-[#00ff88]/35"
          : "bg-[#ff3366]/12 text-[#ff9aab] ring-1 ring-[#ff3366]/35"
      }`}
    >
      {toast.msg}
    </div>
  );
}
