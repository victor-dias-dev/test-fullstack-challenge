import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import keycloak from "../lib/keycloak";
export function LoginPage() {
    const handleLogin = () => {
        void keycloak.login({ redirectUri: window.location.origin });
    };
    return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-[#0a0a0f]", children: _jsxs("div", { className: "w-full max-w-sm rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-8 text-center space-y-6", children: [_jsxs("div", { children: [_jsx("div", { className: "text-5xl mb-3", children: "\uD83E\uDDA7" }), _jsx("h1", { className: "text-3xl font-black text-white tracking-tight", children: "CRASH" }), _jsx("p", { className: "mt-1 text-sm text-[#4a4a6a]", children: "Jungle Gaming" })] }), _jsx("p", { className: "text-sm text-[#6a6a8a]", children: "Place your bets and cash out before the crash." }), _jsx("button", { onClick: handleLogin, className: "w-full rounded-xl bg-[#6366f1] py-3 font-bold text-white transition-all hover:bg-[#5254d4] active:scale-95", children: "Login with Keycloak" }), _jsxs("p", { className: "text-xs text-[#4a4a6a]", children: ["Test account: ", _jsx("span", { className: "text-[#6366f1]", children: "player / player123" })] })] }) }));
}
