/** Ruoli della squadra con i nomi da mostrare (anche nei componenti client: niente database qui). */
export type TeamRole = "OWNER" | "EDITOR" | "CONTRIBUTOR";

export const ROLE_LABEL: Record<TeamRole, string> = {
  OWNER: "Proprietario",
  EDITOR: "Editor",
  CONTRIBUTOR: "Collaboratore"
};

export const ROLE_HINT: Record<TeamRole, string> = {
  OWNER: "tutto, compresi pagamenti, fatture e squadra",
  EDITOR: "scrive, pubblica e modera i commenti",
  CONTRIBUTOR: "scrive bozze, la pubblicazione spetta alla redazione"
};

/** I ruoli che si possono dare con un invito: il proprietario resta uno solo. */
export function invitableRole(value: unknown): "EDITOR" | "CONTRIBUTOR" | null {
  return value === "EDITOR" || value === "CONTRIBUTOR" ? value : null;
}
