import keycloak from "./keycloak";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
async function request(path, options = {}) {
    const token = keycloak.token;
    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: { ...headers, ...(options.headers ?? {}) },
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message ?? "Request failed");
    }
    return res.json();
}
export const api = {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
};
