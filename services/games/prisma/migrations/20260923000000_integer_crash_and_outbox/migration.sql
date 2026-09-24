-- Integer crash points and the transactional outbox.
-- Existing float columns are converted when present, then dropped.

ALTER TABLE "rounds" ADD COLUMN "crashPointHundredths" BIGINT;

UPDATE "rounds"
SET "crashPointHundredths" = ROUND("crashPoint" * 100)::bigint
WHERE "crashPoint" IS NOT NULL;

ALTER TABLE "rounds" DROP COLUMN "crashPoint";

ALTER TABLE "bets" ADD COLUMN "cashoutMultiplierHundredths" BIGINT;

UPDATE "bets"
SET "cashoutMultiplierHundredths" = ROUND("cashoutMultiplier" * 100)::bigint
WHERE "cashoutMultiplier" IS NOT NULL;

ALTER TABLE "bets" DROP COLUMN "cashoutMultiplier";

CREATE TABLE "outbox_messages" (
    "id" TEXT NOT NULL,
    "routingKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "outbox_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outbox_messages_publishedAt_idx" ON "outbox_messages"("publishedAt");
