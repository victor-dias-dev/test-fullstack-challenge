FROM oven/bun:1-alpine

WORKDIR /app

RUN apk add --no-cache openssl curl

COPY package.json bun.lock ./
COPY packages/provably-fair/package.json packages/provably-fair/package.json
COPY services/games/package.json services/games/package.json
COPY services/wallets/package.json services/wallets/package.json
COPY frontend/package.json frontend/package.json

RUN bun install --frozen-lockfile

COPY packages/provably-fair packages/provably-fair
COPY services/games services/games

RUN bun run --cwd packages/provably-fair build

WORKDIR /app/services/games

RUN bunx prisma generate

EXPOSE 4001

CMD ["sh", "-c", "bunx prisma migrate deploy && bun run src/main.ts"]
