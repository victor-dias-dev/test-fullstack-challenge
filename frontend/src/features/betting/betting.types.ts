export interface PlaceBetResponse {
  betId: string;
  roundId: string;
}

export interface CashOutResponse {
  betId: string;
  multiplier: number;
  payoutCents: string;
}

export type ToastState = { type: "success" | "error"; msg: string } | null;
