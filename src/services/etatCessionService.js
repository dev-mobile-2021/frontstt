import http from "./http";
import { gql } from "./gql";

const LIST_FIELDS = `
  id code contrat_id periode_debut periode_fin montant_total statut
  motif_rejet created_at updated_at
  contrat { id code objet soustraitant { id raison_sociale } chantier { id code designation } }
  lignes { poste montant }
`;

const DETAIL_FIELDS = `
  id code contrat_id periode_debut periode_fin montant_total statut
  statut_mtx statut_gasoil statut_rh statut_mtl vise_qte_par vise_qte_le vise_prix_par vise_prix_le
  motif_rejet observations created_by updated_by created_at updated_at
  contrat { id code objet soustraitant { id raison_sociale } chantier { id code designation code_x3 } }
  lignes { id etat_cession_id poste bareme_id designation unite quantite prix_unitaire montant ordre bon_transfert }
`;

export const etatCessionService = {
  async list({ page = 1, count = 15, code, contrat_id, statut } = {}) {
    const data = await gql(
      `query ListEtatsCession($page: Int, $count: Int, $code: String, $contrat_id: Int, $statut: String) {
        etatsCessionPaginated(page: $page, count: $count, code: $code, contrat_id: $contrat_id, statut: $statut) {
          data { ${LIST_FIELDS} }
          metadata { total current_page per_page last_page }
        }
      }`,
      { page, count, code: code || null, contrat_id: contrat_id || null, statut: statut || null }
    );
    return data.etatsCessionPaginated;
  },

  async getById(id) {
    const data = await gql(
      `query GetEtatCession($id: ID) {
        etatsCessionPaginated(id: $id) {
          data { ${DETAIL_FIELDS} }
        }
      }`,
      { id: parseInt(id, 10) }
    );
    return data.etatsCessionPaginated.data[0] ?? null;
  },

  async save(payload) {
    const { data } = await http.post("/etatcession", payload);
    return data;
  },

  async saveLigne(payload) {
    const { data } = await http.post("/etatcession/ligne", payload);
    return data;
  },

  async deleteLigne(id) {
    const { data } = await http.delete(`/etatcession/ligne/delete/${id}`);
    return data;
  },

  async setStatut(id, statut) {
    const { data } = await http.post("/etatcession/statut", { id, statut });
    return data;
  },

  async setStatutBloc(id, bloc, statut) {
    const { data } = await http.post("/etatcession/statut-bloc", { id, bloc, statut });
    return data;
  },

  async delete(id) {
    const { data } = await http.delete(`/etatcession/delete/${id}`);
    return data;
  },
};
