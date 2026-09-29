-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('READY', 'SENT', 'ERROR');

-- CreateTable
CREATE TABLE "FiscalProfile" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "kind" TEXT NOT NULL DEFAULT 'PERSON',
    "denominazione" TEXT,
    "nome" TEXT,
    "cognome" TEXT,
    "partitaIva" TEXT NOT NULL,
    "codiceFiscale" TEXT NOT NULL,
    "regimeFiscale" TEXT NOT NULL DEFAULT 'RF19',
    "aliquotaIva" INTEGER NOT NULL DEFAULT 22,
    "indirizzo" TEXT NOT NULL,
    "numeroCivico" TEXT,
    "cap" TEXT NOT NULL,
    "comune" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "email" TEXT,
    "numberingYear" INTEGER NOT NULL DEFAULT 0,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "userId" TEXT,
    "stripeObjectId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "paidAt" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "progressivo" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "xml" TEXT NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "buyerName" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'READY',
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FiscalProfile_publicationId_key" ON "FiscalProfile"("publicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeObjectId_key" ON "Payment"("stripeObjectId");

-- CreateIndex
CREATE INDEX "Payment_publicationId_paidAt_idx" ON "Payment"("publicationId", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_subscriptionId_idx" ON "Payment"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_paymentId_key" ON "Invoice"("paymentId");

-- CreateIndex
CREATE INDEX "Invoice_publicationId_createdAt_idx" ON "Invoice"("publicationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_publicationId_year_number_key" ON "Invoice"("publicationId", "year", "number");

-- AddForeignKey
ALTER TABLE "FiscalProfile" ADD CONSTRAINT "FiscalProfile_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

