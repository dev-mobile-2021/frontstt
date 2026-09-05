import http from "./http";
import { gql } from "./gql";

const FIELDS = `
  id code raison_sociale forme_juridique ninea registre_commerce
  adresse ville telephone email site_web
  contact_nom contact_telephone contact_email
  specialites statut motif_blacklist
  code_x3 synced_at created_at updated_at
`;

export const soustraitantService = {
  async list({ page = 1, count = 15, raison_sociale, statut } = {}) {
    const data = await gql(
      `query ListSTT($page: Int, $count: Int, $raison_sociale: String, $statut: String) {
        soustraitantsPaginated(page: $page, count: $count, raison_sociale: $raison_sociale, statut: $statut) {
          data { ${FIELDS} }
          metadata { total current_page per_page last_page }
        }
      }`,
      { page, count, raison_sociale: raison_sociale || null, statut: statut || null }
    );
    return data.soustraitantsPaginated;
  },

  async getById(id) {
    const data = await gql(
      `query GetSTT($id: ID) {
        soustraitantsPaginated(id: $id) {
          data { ${FIELDS} }
        }
      }`,
      { id: parseInt(id, 10) }
    );
    return data.soustraitantsPaginated.data[0] ?? null;
  },

  async save(payload) {
    const { data } = await http.post("/soustraitant", payload);
    return data;
  },

  async setStatut(id, statut, motif) {
    const { data } = await http.post("/soustraitant/statut", { id, statut, motif_blacklist: motif });
    return data;
  },

  async delete(id) {
    const { data } = await http.delete(`/soustraitant/delete/${id}`);
    return data;
  },
};
