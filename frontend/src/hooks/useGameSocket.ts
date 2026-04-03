import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useGameStore } from "../stores/gameStore";
import type { BetResponse } from "../lib/api";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4001";

export function useGameSocket() {
  const socketRef = useRef<Socket | null>(null);
  const store = useGameStore();

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("round:betting", (data: { roundId: string; serverSeedHash: string; endsAt: string }) => {
      store.reset();
      store.setRound(data.roundId, data.serverSeedHash, new Date(data.endsAt));
      store.setPhase("BETTING");
    });

    socket.on("round:started", (_data: { roundId: string; startedAt: string }) => {
      store.setPhase("RUNNING");
      store.setMultiplier(1.0);
    });

    socket.on("multiplier:update", (data: { multiplier: number }) => {
      store.setMultiplier(data.multiplier);
    });

    socket.on("round:crashed", (data: { roundId: string; crashPoint: number }) => {
      store.setCrash(data.crashPoint);
    });

    socket.on("bet:placed", (data: { roundId: string; username: string; amountCents: string }) => {
      const fakeBet: BetResponse = {
        id: `${data.username}-${Date.now()}`,
        username: data.username,
        amountCents: data.amountCents,
        status: "ACTIVE",
        cashoutMultiplier: null,
        payoutCents: null,
      };
      store.addLiveBet(fakeBet);
    });

    socket.on(
      "bet:cashout",
      (data: { username: string; multiplier: number; payoutCents: string }) => {
        store.setLiveBets(
          useGameStore.getState().liveBets.map((b) =>
            b.username === data.username
              ? { ...b, status: "WON", cashoutMultiplier: data.multiplier, payoutCents: data.payoutCents }
              : b,
          ),
        );
      },
    );

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return socketRef.current;
}
