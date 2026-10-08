-- Fediverso (T6, 3/10/2026): chiavi dell'attore, seguaci remoti, consegne una volta sola.
ALTER TABLE "Publication" ADD COLUMN "apPublicKeyPem" TEXT,
ADD COLUMN "apPrivateKeyPem" TEXT;

ALTER TABLE "Post" ADD COLUMN "apDeliveredAt" TIMESTAMP(3);

ALTER TABLE "Note" ADD COLUMN "apDeliveredAt" TIMESTAMP(3);

-- Quello che è già uscito non si annuncia: si annunciano solo i post e le note da qui in avanti.
UPDATE "Post" SET "apDeliveredAt" = CURRENT_TIMESTAMP WHERE "status" = 'PUBLISHED';
UPDATE "Note" SET "apDeliveredAt" = CURRENT_TIMESTAMP;

CREATE TABLE "ApFollower" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "actorUrl" TEXT NOT NULL,
    "inboxUrl" TEXT NOT NULL,
    "sharedInboxUrl" TEXT,
    "handle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApFollower_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApFollower_publicationId_actorUrl_key" ON "ApFollower"("publicationId", "actorUrl");

ALTER TABLE "ApFollower" ADD CONSTRAINT "ApFollower_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
