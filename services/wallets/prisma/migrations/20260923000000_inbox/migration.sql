-- Idempotent inbox. Replays read this row and publish the same result again.

CREATE TYPE "InboxKind" AS ENUM ('DEBIT', 'CREDIT');

CREATE TYPE "InboxOutcome" AS ENUM ('APPLIED', 'REJECTED');

CREATE TABLE "inbox_messages" (
    "id" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "kind" "InboxKind" NOT NULL,
    "outcome" "InboxOutcome" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbox_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inbox_messages_correlationId_key" ON "inbox_messages"("correlationId");
