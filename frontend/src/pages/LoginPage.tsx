import keycloak from "../lib/keycloak";

export function LoginPage() {
  const handleLogin = () => {
    void keycloak.login({ redirectUri: window.location.origin });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
      <div className="w-full max-w-sm rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-8 text-center space-y-6">
        <div>
          <div className="text-5xl mb-3">🦧</div>
          <h1 className="text-3xl font-black text-white tracking-tight">CRASH</h1>
          <p className="mt-1 text-sm text-[#4a4a6a]">Jungle Gaming</p>
        </div>

        <p className="text-sm text-[#6a6a8a]">
          Place your bets and cash out before the crash.
        </p>

        <button
          onClick={handleLogin}
          className="w-full rounded-xl bg-[#6366f1] py-3 font-bold text-white transition-all hover:bg-[#5254d4] active:scale-95"
        >
          Login with Keycloak
        </button>

        <p className="text-xs text-[#4a4a6a]">
          Test account: <span className="text-[#6366f1]">player / player123</span>
        </p>
      </div>
    </div>
  );
}
