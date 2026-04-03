import { create } from "zustand";

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  username: string | null;
  userId: string | null;
  setAuth: (token: string, username: string, userId: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  token: null,
  username: null,
  userId: null,
  setAuth: (token, username, userId) =>
    set({ isAuthenticated: true, token, username, userId }),
  clearAuth: () =>
    set({ isAuthenticated: false, token: null, username: null, userId: null }),
}));
