import { useAuthStore } from "../stores/authStore";
import { useWallet, useCreateWallet } from "../hooks/useWallet";
import keycloak from "../lib/keycloak";

export function PlayerInfo() {
  const { username } = useAuthStore();
  const { data: wallet, isLoading } = useWallet();
  const createWallet = useCreateWallet();

  const handleLogout = () => {
    void keycloak.logout({ redirectUri: window.location.origin });
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-[#1e1e2e] bg-[#12121a] p-4">
      <div className="flex-1">
        <div className="text-xs text-[#4a4a6a]">Player</div>
        <div className="font-semibold text-white">{username}</div>
      </div>

      {isLoading ? (
        <div className="h-8 w-24 animate-pulse rounded bg-[#1e1e2e]" />
      ) : wallet ? (
        <div className="text-right">
          <div className="text-xs text-[#4a4a6a]">Balance</div>
          <div className="font-bold text-[#00ff88] text-lg">
            R${wallet.balanceReais}
          </div>
        </div>
      ) : (
        <button
          onClick={() => createWallet.mutate()}
          disabled={createWallet.isPending}
          className="rounded-lg bg-[#6366f1] px-4 py-2 text-sm font-medium text-white hover:bg-[#5254d4] disabled:opacity-50"
        >
          {createWallet.isPending ? "Creating..." : "Create Wallet"}
        </button>
      )}

      <button
        onClick={handleLogout}
        className="rounded-lg border border-[#1e1e2e] px-3 py-2 text-xs text-[#4a4a6a] hover:text-white hover:border-[#6366f1] transition-colors"
      >
        Logout
      </button>
    </div>
  );
}
