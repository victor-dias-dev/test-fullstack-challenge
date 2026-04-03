import { create } from "zustand";
export const useAuthStore = create((set) => ({
    isAuthenticated: false,
    token: null,
    username: null,
    userId: null,
    setAuth: (token, username, userId) => set({ isAuthenticated: true, token, username, userId }),
    clearAuth: () => set({ isAuthenticated: false, token: null, username: null, userId: null }),
}));
