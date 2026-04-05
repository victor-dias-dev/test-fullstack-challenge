import keycloak from "./keycloak";

/**
 * Com Kong: só `VITE_API_URL` (ex.: http://localhost:8000) e paths `/games/*`, `/wallets/*`.
 * Sem Kong: defina `VITE_GAMES_URL` e `VITE_WALLETS_URL` (ex.: :4001 e :4002) — o cliente remove o prefixo.
 */
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const GAMES_DIRECT = import.meta.env.VITE_GAMES_URL;
const WALLETS_DIRECT = import.meta.env.VITE_WALLETS_URL;

function resolveRequestUrl(path: string): string {
  if (GAMES_DIRECT && path.startsWith("/games")) {
    return `${GAMES_DIRECT}${path.slice("/games".length)}`;
  }
  if (WALLETS_DIRECT && path.startsWith("/wallets")) {
    return `${WALLETS_DIRECT}${path.slice("/wallets".length)}`;
  }
  return `${API_URL}${path}`;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = keycloak.token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(resolveRequestUrl(path), {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> ?? {}) },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((error as { message?: string }).message ?? "Request failed");
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
};

export interface WalletResponse {
  id: string;
  userId: string;
  username: string;
  balanceCents: string;
  balanceReais: string;
}

export interface RoundResponse {
  id: string;
  status: "BETTING" | "RUNNING" | "CRASHED";
  serverSeedHash: string;
  bettingEndsAt: string;
  startedAt: string | null;
  currentMultiplier: number | null;
  bets: BetResponse[];
}

export interface BetResponse {
  id: string;
  username: string;
  amountCents: string;
  status: "PENDING" | "ACTIVE" | "WON" | "LOST" | "CANCELLED";
  cashoutMultiplier: number | null;
  payoutCents: string | null;
}

export interface HistoryRound {
  id: string;
  crashPoint: number;
  crashedAt: string;
  serverSeedHash: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  profitCents: string;
}

export interface LeaderboardResponse {
  period: string;
  since: string;
  entries: LeaderboardEntry[];
}
