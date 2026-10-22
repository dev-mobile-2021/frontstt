import http from "./http";
import { gql } from "./gql";

const FIELDS = `
  id code raison_sociale forme_juridique ninea registre_commerce
  adresse ville telephone email site_web
  contact_nom contact_telephone contact_email
  specialites statut motif_blacklist
  code_x3 abrege devise ninea_x3 synced_at created_at updated_at
  nb_contrats nb_contrats_en_cours total_ht_contrats total_ht_avenants total_contrats_avenants
  total_decomptes_payes total_decomptes_en_attente total_decomptes_en_cours
  montant_realise montant_a_realiser nets_a_payer payes restant_a_payer
`;

export const soustraitantService = {
  async listDropdown({ count = 2000 } = {}) {
    const data = await gql(
      `query ListSTTDropdown($count: Int) {
        soustraitantsPaginated(page: 1, count: $count, order: "raison_sociale", direction: "asc") {
          data { id code raison_sociale statut }
        }
      }`,
      { count }
    );
    return data.soustraitantsPaginated.data ?? [];
  },

  async list({ page = 1, count = 15, raison_sociale, statut, chantier_id } = {}) {
    const data = await gql(
      `query ListSTT($page: Int, $count: Int, $raison_sociale: String, $statut: String, $chantier_id: Int) {
        soustraitantsPaginated(page: $page, count: $count, raison_sociale: $raison_sociale, statut: $statut, chantier_id: $chantier_id) {
          data { ${FIELDS} }
          metadata { total current_page per_page last_page }
        }
      }`,
      { page, count, raison_sociale: raison_sociale || null, statut: statut || null, chantier_id: chantier_id ? parseInt(chantier_id, 10) : null }
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
