/** Routing keys for the crash-game topic exchange — shared by publishers and subscribers. */
export const MESSAGING_ROUTING_KEYS = {
  WALLET_DEBIT: "wallet.debit",
  WALLET_CREDIT: "wallet.credit",
  WALLET_DEBITED: "wallet.debited",
  WALLET_DEBIT_FAILED: "wallet.debit.failed",
  WALLET_CREDITED: "wallet.credited",
} as const;
