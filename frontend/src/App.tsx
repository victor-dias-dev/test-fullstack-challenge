import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import keycloak from "./lib/keycloak";
import { useAuthStore } from "./stores/authStore";
import { GamePage } from "./pages/GamePage";
import { LoginPage } from "./pages/LoginPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5000 } },
});

function AppContent() {
  const { isAuthenticated, setAuth } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    keycloak
      .init({
        onLoad: "check-sso",
        silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
        pkceMethod: "S256",
      })
      .then((authenticated) => {
        if (authenticated && keycloak.token && keycloak.tokenParsed) {
          setAuth(
            keycloak.token,
            (keycloak.tokenParsed as { preferred_username: string }).preferred_username,
            keycloak.subject ?? "",
          );
        }
        setInitialized(true);
      })
      .catch(() => setInitialized(true));

    // Token refresh
    const refreshInterval = setInterval(() => {
      keycloak.updateToken(60).catch(() => {
        keycloak.login();
      });
    }, 30_000);

    return () => clearInterval(refreshInterval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="text-[#6366f1] text-lg font-semibold animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  return isAuthenticated ? <GamePage /> : <LoginPage />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
