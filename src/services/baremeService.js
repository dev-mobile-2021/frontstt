import http from "./http";
import { gql } from "./gql";

const FIELDS = `
  id code type categorie designation unite prix_unitaire description statut
  created_by updated_by created_at updated_at
`;

export const baremeService = {
  async list({ page = 1, count = 15, type, categorie, statut } = {}) {
    const data = await gql(
      `query ListBaremes($page: Int, $count: Int, $type: String, $categorie: String, $statut: String) {
        baremesPaginated(page: $page, count: $count, type: $type, categorie: $categorie, statut: $statut) {
          data { ${FIELDS} }
          metadata { total current_page per_page last_page }
        }
      }`,
      {
        page,
        count,
        type: type || null,
        categorie: categorie || null,
        statut: statut || null,
      }
    );
    return data.baremesPaginated;
  },

  async getById(id) {
    const data = await gql(
      `query GetBareme($id: ID) {
        baremesPaginated(id: $id) {
          data { ${FIELDS} }
        }
      }`,
      { id: parseInt(id, 10) }
    );
    return data.baremesPaginated.data[0] ?? null;
  },

  async save(payload) {
    const { data } = await http.post("/bareme", payload);
    return data;
  },

  async delete(id) {
    const { data } = await http.delete(`/bareme/delete/${id}`);
    return data;
  },
};
