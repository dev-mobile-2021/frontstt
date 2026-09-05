import http from "./http";
import { gql } from "./gql";

const FIELDS = `
  id code contrat_id chantier_id periode_debut periode_fin
  statut montant_final payload created_at updated_at
`;

// Map DB record → the shape the frontend pages expect (camelCase, flat)
function normalize(r) {
  let payload = r.payload;
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload); } catch { payload = {}; }
  }
  payload = payload || {};

  return {
    // Use code as "id" so existing navigate(`/attachements/${att.id}`) works with string keys
    id:           r.code,
    code:         r.code,
    _dbId:        r.id,
    contratId:    r.contrat_id != null ? String(r.contrat_id) : null,
    chantierId:   r.chantier_id != null ? String(r.chantier_id) : null,
    periodeDebut: r.periode_debut,
    periodeFin:   r.periode_fin,
    statut:       r.statut,
    montantFinal: r.montant_final,
    ...payload,
  };
}

// Map frontend object → API payload
function denormalize(att) {
  const { id, code, _dbId, contratId, chantierId, periodeDebut, periodeFin, statut, montantFinal, ...rest } = att;
  const contratIdInt = contratId ? parseInt(contratId, 10) : null;
  const chantierIdInt = chantierId ? parseInt(chantierId, 10) : null;

  return {
    code:          code || id,
    contrat_id:    Number.isFinite(contratIdInt) ? contratIdInt : null,
    chantier_id:   Number.isFinite(chantierIdInt) ? chantierIdInt : null,
    periode_debut: periodeDebut,
    periode_fin:   periodeFin,
    statut:        statut || "Ouvert",
    montant_final: montantFinal,
    ...rest,
  };
}

export const attachementService = {
  async list({ page = 1, count = 500, contrat_id, statut } = {}) {
    const data = await gql(
      `query ListAttachements($page: Int, $count: Int, $contrat_id: Int, $statut: String) {
        attachementsPaginated(page: $page, count: $count, contrat_id: $contrat_id, statut: $statut) {
          data { ${FIELDS} }
          metadata { total }
        }
      }`,
      { page, count, contrat_id: contrat_id || null, statut: statut || null }
    );
    return data.attachementsPaginated.data.map(normalize);
  },

  async save(att) {
    const { data } = await http.post("/attachement", denormalize(att));
    return data;
  },

  async delete(code) {
    const { data } = await http.delete(`/attachement/delete/${code}`);
    return data;
  },
};
