/** Référentiel des rubriques analytiques (source Sage X3 Projets). */
export const RA_CODES = [
  { code: "6A10", libelle: "Gros œuvre — fondations" },
  { code: "6A20", libelle: "Gros œuvre — élévations" },
  { code: "6A30", libelle: "Étanchéité" },
  { code: "6A31", libelle: "Isolation" },
  { code: "6A40", libelle: "Menuiseries extérieures" },
  { code: "6A50", libelle: "Menuiseries intérieures" },
  { code: "6A51", libelle: "Serrurerie" },
  { code: "6A60", libelle: "Plomberie sanitaire" },
  { code: "6A61", libelle: "CVC" },
  { code: "6A62", libelle: "Électricité courants forts" },
  { code: "6A63", libelle: "Structure béton armé" },
  { code: "6A83", libelle: "VRD" },
  { code: "6A84", libelle: "Espaces verts" },
  { code: "6B28", libelle: "Divers et imprévus" },
];

export const RA_LABELS = Object.fromEntries(RA_CODES.map(r => [r.code, r.libelle]));
