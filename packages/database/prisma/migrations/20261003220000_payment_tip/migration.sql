-- Mance (T7, 3/10/2026): tipo di incasso e messaggio del lettore.
ALTER TABLE "Payment" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'ACCESS',
ADD COLUMN "message" VARCHAR(280);
