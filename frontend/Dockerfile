FROM oven/bun:1-alpine AS builder

# Must match `frontend/.env.example` / compose `build.args` (browser talks to host ports).
ARG VITE_API_URL=http://localhost:8000
ARG VITE_GAMES_URL=http://localhost:4001
ARG VITE_WALLETS_URL=http://localhost:4002
ARG VITE_SOCKET_URL=http://localhost:4001
ARG VITE_KEYCLOAK_URL=http://localhost:8080
ARG VITE_KEYCLOAK_REALM=crash-game
ARG VITE_KEYCLOAK_CLIENT_ID=crash-game-client

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GAMES_URL=$VITE_GAMES_URL
ENV VITE_WALLETS_URL=$VITE_WALLETS_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL
ENV VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM
ENV VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID

WORKDIR /app

COPY package.json ./
RUN bun install

COPY . .
RUN bun run build

FROM oven/bun:1-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["bun", "run", "preview"]
