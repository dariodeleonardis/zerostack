-- Un mi piace per utente e oggetto (audit A9). Il 3/10 in produzione la tabella era vuota.

-- DropIndex
DROP INDEX "Like_userId_postId_noteId_commentId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_postId_key" ON "Like"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_noteId_key" ON "Like"("userId", "noteId");

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_commentId_key" ON "Like"("userId", "commentId");
