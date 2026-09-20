import http from "./http";
import { gql } from "./gql";

const FIELDS = `
  id code designation localisation description statut
  date_debut date_fin_prevue chef_projet conducteur_travaux
  budget_personnel budget_materiel budget_fournitures
  budget_sous_traitance budget_divers budget_total
  code_x3 synced_at created_at updated_at
  contrats { id code statut montant_actuel soustraitant { id raison_sociale } }
`;

export const chantierService = {
  async list({ page = 1, count = 50, designation, statut } = {}) {
    const data = await gql(
      `query ListChantiers($page: Int, $count: Int, $designation: String, $statut: String) {
        chantiersPaginated(page: $page, count: $count, designation: $designation, statut: $statut) {
          data { ${FIELDS} }
          metadata { total current_page per_page last_page }
        }
      }`,
      { page, count, designation: designation || null, statut: statut || null }
    );
    return data.chantiersPaginated;
  },

  async getById(id) {
    const data = await gql(
      `query GetChantier($id: ID) {
        chantiersPaginated(id: $id) {
          data { ${FIELDS} }
        }
      }`,
      { id: parseInt(id, 10) }
    );
    return data.chantiersPaginated.data[0] ?? null;
  },

  async save(payload) {
    const { data } = await http.post("/chantier", payload);
    return data;
  },

  async setStatut(id, statut) {
    const { data } = await http.post("/chantier/statut", { id, statut });
    return data;
  },

  async delete(id) {
    const { data } = await http.delete(`/chantier/delete/${id}`);
    return data;
  },
};
