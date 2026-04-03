FROM oven/bun:1-alpine AS builder

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
