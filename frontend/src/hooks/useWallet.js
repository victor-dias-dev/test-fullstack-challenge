import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
export function useWallet() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    return useQuery({
        queryKey: ["wallet"],
        queryFn: () => api.get("/wallets/me"),
        enabled: isAuthenticated,
        refetchInterval: 5000,
    });
}
export function useCreateWallet() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => api.post("/wallets"),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["wallet"] }),
    });
}
