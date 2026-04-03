FROM oven/bun:1-alpine

WORKDIR /app

RUN apk add --no-cache openssl curl

COPY package.json ./
COPY prisma ./prisma/

RUN bun install
RUN bunx prisma generate

COPY . .

EXPOSE 4001

CMD ["sh", "-c", "bunx prisma migrate deploy && bun run src/main.ts"]
