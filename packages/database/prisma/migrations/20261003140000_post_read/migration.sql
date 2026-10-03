-- CreateTable
CREATE TABLE "PostRead" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostRead_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateIndex
CREATE INDEX "PostRead_postId_idx" ON "PostRead"("postId");

-- AddForeignKey
ALTER TABLE "PostRead" ADD CONSTRAINT "PostRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostRead" ADD CONSTRAINT "PostRead_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
