-- Inviti alla squadra di una pubblicazione (T4, 3/10/2026).
CREATE TABLE "PublicationInvite" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "PublicationMemberRole" NOT NULL DEFAULT 'CONTRIBUTOR',
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicationInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicationInvite_tokenHash_key" ON "PublicationInvite"("tokenHash");

CREATE UNIQUE INDEX "PublicationInvite_publicationId_email_key" ON "PublicationInvite"("publicationId", "email");

ALTER TABLE "PublicationInvite" ADD CONSTRAINT "PublicationInvite_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublicationInvite" ADD CONSTRAINT "PublicationInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
