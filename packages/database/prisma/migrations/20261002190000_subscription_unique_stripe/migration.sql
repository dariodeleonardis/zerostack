-- Un abbonamento Stripe = una riga sola (audit A1): con due webhook in contemporanea il
-- controllo "esiste già?" seguito da "crea" poteva produrre doppioni. Il 2/10 in produzione
-- le righe con stripeSubscriptionId erano zero.

-- DropIndex
DROP INDEX "Subscription_stripeSubscriptionId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");
