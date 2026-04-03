-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('BETTING', 'RUNNING', 'CRASHED');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('PENDING', 'ACTIVE', 'WON', 'LOST', 'CANCELLED');

-- CreateTable
CREATE TABLE "rounds" (
    "id" TEXT NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'BETTING',
    "crashPoint" DOUBLE PRECISION,
    "serverSeed" TEXT,
    "serverSeedHash" TEXT NOT NULL,
    "clientSeed" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL DEFAULT 0,
    "bettingEndsAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "crashedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bets" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "cashoutMultiplier" DOUBLE PRECISION,
    "payoutCents" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bets_roundId_userId_key" ON "bets"("roundId", "userId");

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
