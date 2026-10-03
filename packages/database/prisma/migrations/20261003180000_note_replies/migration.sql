-- Note (T5, 3/10/2026): risposte collegate alla nota (cancellazione a cascata) e indici per i feed.
CREATE INDEX "Note_publicationId_createdAt_idx" ON "Note"("publicationId", "createdAt");

CREATE INDEX "Note_replyToNoteId_createdAt_idx" ON "Note"("replyToNoteId", "createdAt");

-- Una risposta rimasta senza nota (non dovrebbe esistere: finora nessuno scriveva note) diventa nota a sé.
UPDATE "Note" SET "replyToNoteId" = NULL WHERE "replyToNoteId" IS NOT NULL AND "replyToNoteId" NOT IN (SELECT "id" FROM "Note");

ALTER TABLE "Note" ADD CONSTRAINT "Note_replyToNoteId_fkey" FOREIGN KEY ("replyToNoteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
