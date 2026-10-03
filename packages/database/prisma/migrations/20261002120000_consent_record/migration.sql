-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "consentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "granted" TEXT[],
    "host" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsentRecord_consentId_idx" ON "ConsentRecord"("consentId");

-- CreateIndex
CREATE INDEX "ConsentRecord_createdAt_idx" ON "ConsentRecord"("createdAt");
