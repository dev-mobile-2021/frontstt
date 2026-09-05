import http from "./http";
import { gql } from "./gql";

const FIELDS = `
  id code contrat_id decompte_id statut
  date_generation date_envoi date_retour
  motif_contestation ligne_contestee observations
  created_at updated_at
  contrat { id code objet soustraitant { id raison_sociale } chantier { id code designation } }
  decompte { id code }
`;

export const releveService = {
  async list({ page = 1, count = 15, code, contrat_id, statut } = {}) {
    const data = await gql(
      `query ListReleves($page: Int, $count: Int, $code: String, $contrat_id: Int, $statut: String) {
        relevesPaginated(page: $page, count: $count, code: $code, contrat_id: $contrat_id, statut: $statut) {
          data { ${FIELDS} }
          metadata { total current_page per_page last_page }
        }
      }`,
      { page, count, code: code || null, contrat_id: contrat_id || null, statut: statut || null }
    );
    return data.relevesPaginated;
  },

  async getById(id) {
    const data = await gql(
      `query GetReleve($id: ID) {
        relevesPaginated(id: $id) {
          data { ${FIELDS} }
        }
      }`,
      { id: parseInt(id, 10) }
    );
    return data.relevesPaginated.data[0] ?? null;
  },

  async save(payload) {
    const { data } = await http.post("/releve", payload);
    return data;
  },

  async changerStatut(id, statut, extras = {}) {
    const { data } = await http.post("/releve/statut", { id, statut, ...extras });
    return data;
  },

  async delete(id) {
    const { data } = await http.delete(`/releve/delete/${id}`);
    return data;
  },
};
