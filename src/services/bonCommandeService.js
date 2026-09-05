import http from "./http";
import { gql } from "./gql";

const FIELDS = `
  id code contrat_id objet date_emission date_livraison_prevue date_livraison_reelle
  montant_total statut motif_annulation observations
  created_by updated_by created_at updated_at
  contrat { id code objet soustraitant { id raison_sociale } chantier { id code designation } }
  lignes { id bon_commande_id bareme_id designation unite quantite prix_unitaire montant ordre }
`;

const FIELDS_LIST = `
  id code contrat_id objet date_emission date_livraison_prevue date_livraison_reelle
  montant_total statut motif_annulation observations
  created_by updated_by created_at updated_at
  contrat { id code objet soustraitant { id raison_sociale } chantier { id code designation } }
`;

export const bonCommandeService = {
  async list({ page = 1, count = 15, code, contrat_id, statut } = {}) {
    const data = await gql(
      `query ListBonsCommande($page: Int, $count: Int, $code: String, $contrat_id: Int, $statut: String) {
        bonsCommandePaginated(page: $page, count: $count, code: $code, contrat_id: $contrat_id, statut: $statut) {
          data { ${FIELDS_LIST} }
          metadata { total current_page per_page last_page }
        }
      }`,
      {
        page,
        count,
        code: code || null,
        contrat_id: contrat_id ? parseInt(contrat_id, 10) : null,
        statut: statut || null,
      }
    );
    return data.bonsCommandePaginated;
  },

  async getById(id) {
    const data = await gql(
      `query GetBonCommande($id: ID) {
        bonsCommandePaginated(id: $id) {
          data { ${FIELDS} }
        }
      }`,
      { id: parseInt(id, 10) }
    );
    return data.bonsCommandePaginated.data[0] ?? null;
  },

  async save(payload) {
    const { data } = await http.post("/boncommande", payload);
    return data;
  },

  async saveLigne(payload) {
    const { data } = await http.post("/boncommande/ligne", payload);
    return data;
  },

  async deleteLigne(id) {
    const { data } = await http.delete(`/boncommande/ligne/delete/${id}`);
    return data;
  },

  async setStatut(id, statut, motif) {
    const body = { id, statut };
    if (motif) body.motif_annulation = motif;
    const { data } = await http.post("/boncommande/statut", body);
    return data;
  },

  async delete(id) {
    const { data } = await http.delete(`/boncommande/delete/${id}`);
    return data;
  },
};
