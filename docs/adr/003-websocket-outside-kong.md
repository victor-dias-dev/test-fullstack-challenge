# ADR 003 — WebSocket outside Kong

Kong in this compose file proxies HTTP for `/games` and `/wallets`. It does not terminate the Socket.IO upgrade. The browser connects to the game service directly (`VITE_SOCKET_URL`, default `http://localhost:4001`).

That avoids a gateway upgrade config and a second place to debug disconnects. The cost is a second origin: the HTTP client uses Kong, the socket client does not. Auth on the socket is not the same path as the REST guards. Player actions (bet, cash out) stay on HTTP.
