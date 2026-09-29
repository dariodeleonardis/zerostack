/**
 * Dati del gestore della piattaforma per le pagine legali. Vanno impostati in produzione;
 * finché mancano le pagine mostrano "[da completare]" invece di dati inventati.
 * I testi delle pagine sono una base di partenza: vanno fatti rivedere da un legale.
 */
export function legalEntity() {
  const missing = "[da completare]";
  return {
    name: process.env.LEGAL_ENTITY_NAME || missing,
    vat: process.env.LEGAL_VAT_NUMBER || missing,
    address: process.env.LEGAL_ADDRESS || missing,
    email: process.env.LEGAL_CONTACT_EMAIL || missing,
    updatedAt: process.env.LEGAL_UPDATED_AT || "29 settembre 2026"
  };
}
