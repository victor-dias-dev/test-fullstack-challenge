import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useGameStore } from "../stores/gameStore";
import type { BetResponse } from "../lib/api";
import { hundredthsToNumber } from "../lib/money";
import { playCrashSound } from "../lib/gameSounds";

/** Socket.IO on games service (Kong in this project does not proxy WS) */
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

    socket.on("multiplier:update", (data: { multiplierHundredths: string }) => {
      store.setMultiplier(hundredthsToNumber(data.multiplierHundredths));
    });

    socket.on("round:crashed", (data: { roundId: string; crashPointHundredths: string }) => {
      playCrashSound();
      const st = useGameStore.getState();
      if (st.myBet?.status === "ACTIVE") {
        st.updateMyBet({ status: "LOST" });
      }
      store.setCrash(hundredthsToNumber(data.crashPointHundredths));
    });

    socket.on(
      "bet:placed",
      (data: {
        betId: string;
        roundId: string;
        username: string;
        amountCents: string;
      }) => {
        const liveBet: BetResponse = {
          id: data.betId,
          username: data.username,
          amountCents: data.amountCents,
          status: "ACTIVE",
          cashoutMultiplierHundredths: null,
          payoutCents: null,
        };
        store.addLiveBet(liveBet);

        const st = useGameStore.getState();
        const pending = st.myBet;
        if (
          pending?.betId === data.betId &&
          pending.status === "PENDING"
        ) {
          st.updateMyBet({ status: "ACTIVE" });
        }
      },
    );

    socket.on("bet:cancelled", (data: { betId: string }) => {
      const st = useGameStore.getState();
      if (st.myBet?.betId === data.betId) {
        st.updateMyBet({ status: "CANCELLED" });
      }
    });

    socket.on(
      "bet:cashout",
      (data: {
        roundId?: string;
        username: string;
        multiplierHundredths: string;
        payoutCents: string;
      }) => {
        store.setLiveBets(
          useGameStore.getState().liveBets.map((b) =>
            b.username === data.username
              ? {
                  ...b,
                  status: "WON",
                  cashoutMultiplierHundredths: data.multiplierHundredths,
                  payoutCents: data.payoutCents,
                }
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
