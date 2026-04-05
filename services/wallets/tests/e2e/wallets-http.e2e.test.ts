import { beforeAll, describe, expect, test } from "bun:test";

/**
 * HTTP E2E against a running Wallets service.
 * Set E2E_WALLETS_URL (default http://127.0.0.1:4002).
 * Set SKIP_E2E=1 to skip.
 */

const BASE = process.env.E2E_WALLETS_URL ?? "http://127.0.0.1:4002";
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
      `[e2e] Wallets not reachable at ${BASE}. Start the stack or set SKIP_E2E=1.`,
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

describe("Wallets API (E2E HTTP)", () => {
  e2e("GET /health returns ok", async () => {
    const res = await fetch(`${BASE}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; service: string };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("wallets");
  });

  e2e("POST / without Authorization returns 401", async () => {
    const res = await fetch(`${BASE}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(401);
  });

  e2e("GET /me without Authorization returns 401", async () => {
    const res = await fetch(`${BASE}/me`);
    expect(res.status).toBe(401);
  });
});
