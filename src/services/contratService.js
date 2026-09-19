import http from "./http";
import { gql } from "./gql";

const LIST_FIELDS = `
  id code objet type_contrat
  chantier_id soustraitant_id
  montant_initial montant_actuel montant_realise
  date_debut date_fin_prevue
  statut
  chantier { id code designation }
  soustraitant { id raison_sociale statut }
  avenants { id code objet montant statut date_signature }
`;

const FIELDS = `
  id code objet type_contrat
  chantier_id soustraitant_id
  montant_initial montant_actuel
  date_debut date_fin_prevue date_fin_reelle
  statut motif_suspension motif_resiliation
  code_x3 synced_at created_at updated_at
  chantier { id code designation localisation }
  soustraitant { id code raison_sociale ninea telephone statut }
`;

export const contratService = {
  async list({ page = 1, count = 15, code, chantier_id, soustraitant_id, statut } = {}) {
    const data = await gql(
      `query ListContrats($page: Int, $count: Int, $code: String, $chantier_id: Int, $soustraitant_id: Int, $statut: String) {
        contratsPaginated(page: $page, count: $count, code: $code, chantier_id: $chantier_id, soustraitant_id: $soustraitant_id, statut: $statut) {
          data { ${LIST_FIELDS} }
          metadata { total current_page per_page last_page }
        }
      }`,
      { page, count, code: code || null, chantier_id: chantier_id || null, soustraitant_id: soustraitant_id || null, statut: statut || null }
    );
    return data.contratsPaginated;
  },

  async getById(id) {
    const data = await gql(
      `query GetContrat($id: ID) {
        contratsPaginated(id: $id) {
          data { ${FIELDS} }
        }
      }`,
      { id: parseInt(id, 10) }
    );
    return data.contratsPaginated.data[0] ?? null;
  },

  async save(payload) {
    const { data } = await http.post("/contrat", payload);
    return data;
  },

  async setStatut(id, statut, motif) {
    const body = { id, statut };
    if (motif) body.motif = motif;
    const { data } = await http.post("/contrat/statut", body);
    return data;
  },

  async delete(id) {
    const { data } = await http.delete(`/contrat/delete/${id}`);
    return data;
  },
};
