FROM oven/bun:1-alpine AS builder

ARG VITE_API_URL=http://localhost:8000
ARG VITE_SOCKET_URL=http://localhost:4001
ARG VITE_KEYCLOAK_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL

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
