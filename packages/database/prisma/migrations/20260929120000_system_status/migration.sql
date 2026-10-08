-- CreateTable
CREATE TABLE "SystemStatus" (
    "key" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "detail" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemStatus_pkey" PRIMARY KEY ("key")
);

