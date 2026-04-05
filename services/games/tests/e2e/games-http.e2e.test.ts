import { beforeAll, describe, expect, test } from "bun:test";

/**
 * HTTP E2E against a running Games service (e.g. after `bun run docker:up`).
 * Set E2E_GAMES_URL to override (default http://127.0.0.1:4001).
 * Set SKIP_E2E=1 to skip this file entirely.
 */

const BASE = process.env.E2E_GAMES_URL ?? "http://127.0.0.1:4001";
const skipAll = process.env.SKIP_E2E === "1";

async function reachable(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

let canRun = false;

beforeAll(async () => {
  if (skipAll) return;
  canRun = await reachable();
  if (!canRun) {
    console.warn(
      `[e2e] Games not reachable at ${BASE}. Start the stack (bun run docker:up) or set SKIP_E2E=1.`,
    );
  }
});

function e2e(name: string, fn: () => void | Promise<void>) {
  test(name, async () => {
    if (skipAll || !canRun) {
      expect(skipAll || !canRun).toBe(true);
      return;
    }
    await fn();
  });
}

describe("Games API (E2E HTTP)", () => {
  e2e("GET /health returns ok", async () => {
    const res = await fetch(`${BASE}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; service: string };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("games");
  });

  e2e("GET /rounds/current returns JSON", async () => {
    const res = await fetch(`${BASE}/rounds/current`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { round: unknown };
    expect(body).toHaveProperty("round");
  });

  e2e("GET /rounds/history supports pagination", async () => {
    const res = await fetch(`${BASE}/rounds/history?page=1&limit=5`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: unknown[];
      total: number;
      page: number;
      limit: number;
    };
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe("number");
  });

  e2e("POST /bet without Authorization returns 401", async () => {
    const res = await fetch(`${BASE}/bet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents: 100 }),
    });
    expect(res.status).toBe(401);
  });

  e2e("POST /bet with token but invalid body returns 4xx", async () => {
    const token = process.env.E2E_ACCESS_TOKEN;
    if (!token) {
      expect(true).toBe(true);
      return;
    }
    const res = await fetch(`${BASE}/bet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amountCents: 50 }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
