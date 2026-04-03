import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useGameStore } from "../stores/gameStore";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4001";
export function useGameSocket() {
    const socketRef = useRef(null);
    const store = useGameStore();
    useEffect(() => {
        const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
        socketRef.current = socket;
        socket.on("round:betting", (data) => {
            store.reset();
            store.setRound(data.roundId, data.serverSeedHash, new Date(data.endsAt));
            store.setPhase("BETTING");
        });
        socket.on("round:started", (_data) => {
            store.setPhase("RUNNING");
            store.setMultiplier(1.0);
        });
        socket.on("multiplier:update", (data) => {
            store.setMultiplier(data.multiplier);
        });
        socket.on("round:crashed", (data) => {
            store.setCrash(data.crashPoint);
        });
        socket.on("bet:placed", (data) => {
            const fakeBet = {
                id: `${data.username}-${Date.now()}`,
                username: data.username,
                amountCents: data.amountCents,
                status: "ACTIVE",
                cashoutMultiplier: null,
                payoutCents: null,
            };
            store.addLiveBet(fakeBet);
        });
        socket.on("bet:cashout", (data) => {
            store.setLiveBets(useGameStore.getState().liveBets.map((b) => b.username === data.username
                ? { ...b, status: "WON", cashoutMultiplier: data.multiplier, payoutCents: data.payoutCents }
                : b));
        });
        return () => {
            socket.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return socketRef.current;
}
